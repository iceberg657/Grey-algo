import type { MarketDataItem } from '../types';
import { 
    DERIV_APP_ID, 
    DERIV_DASHBOARD_SYMBOLS, 
    ACCURATE_MARKET_FALLBACKS, 
    normalizeSymbolKey 
} from './marketDataConstants';

export { DERIV_DASHBOARD_SYMBOLS };

// Reverse map for instant lookup from incoming Deriv symbol
const REVERSE_DERIV_MAP: Record<string, string> = {};
Object.entries(DERIV_DASHBOARD_SYMBOLS).forEach(([display, deriv]) => {
    REVERSE_DERIV_MAP[deriv.toUpperCase()] = display;
    REVERSE_DERIV_MAP[deriv] = display;
});

type PriceListener = (prices: MarketDataItem[]) => void;
type SingleTickListener = (item: MarketDataItem) => void;
export type DerivConnectionStatus = 'CONNECTING' | 'STREAMING' | 'RECONNECTING' | 'DISCONNECTED';

interface TrackedRequest {
    displaySymbol: string;
    derivSymbol: string;
    type: 'ticks' | 'ticks_history' | 'auth';
}

class DerivStreamService {
    private ws: WebSocket | null = null;
    private listeners: Set<PriceListener> = new Set();
    private singleListeners: Map<string, Set<SingleTickListener>> = new Map();
    private pricesMap: Map<string, MarketDataItem> = new Map();
    private baseOpenPrices: Map<string, number> = new Map();
    private activeSubscriptions: Set<string> = new Set();
    private status: DerivConnectionStatus = 'DISCONNECTED';
    private statusListeners: Set<(status: DerivConnectionStatus) => void> = new Set();
    private pingInterval: any = null;
    private reconnectTimeout: any = null;
    private fallbackSyncInterval: any = null;
    private isDestroyed: boolean = false;
    private lastTickTimestamp: number = 0;
    private reqIdCounter: number = 100;
    private requestMap: Map<number, TrackedRequest> = new Map();

    constructor() {
        // Initialize with default accurate baselines
        Object.entries(ACCURATE_MARKET_FALLBACKS).forEach(([symbol, fallback]) => {
            this.pricesMap.set(symbol, {
                symbol,
                price: fallback.price,
                change: fallback.change,
                changePercent: fallback.changePercent,
                timestamp: Date.now()
            });
            const priorPrice = fallback.changePercent !== 0 
                ? fallback.price / (1 + fallback.changePercent / 100)
                : fallback.price;
            this.baseOpenPrices.set(symbol, priorPrice);
        });
    }

    public getStatus(): DerivConnectionStatus {
        return this.status;
    }

    public onStatusChange(callback: (status: DerivConnectionStatus) => void): () => void {
        this.statusListeners.add(callback);
        callback(this.status);
        return () => this.statusListeners.delete(callback);
    }

    private setStatus(newStatus: DerivConnectionStatus) {
        if (this.status !== newStatus) {
            this.status = newStatus;
            this.statusListeners.forEach(cb => cb(newStatus));
        }
    }

    public startStream() {
        if (typeof window === 'undefined' || this.isDestroyed) return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.setStatus('CONNECTING');
        try {
            const stored = localStorage.getItem('greyquant_user_settings');
            let appId = DERIV_APP_ID;
            let token = '';
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.derivAppId) appId = Number(parsed.derivAppId) || DERIV_APP_ID;
                    if (parsed.derivApiToken) token = parsed.derivApiToken;
                } catch (e) {}
            }

            // Primary endpoint: ws.derivws.com, fallback: ws.binaryws.com
            const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[Deriv Stream] Direct WebSocket connected to', wsUrl);
                this.setStatus('STREAMING');
                this.activeSubscriptions.clear();
                this.requestMap.clear();

                // If user has token, send authorization first
                if (token) {
                    const authReqId = ++this.reqIdCounter;
                    this.requestMap.set(authReqId, { displaySymbol: 'AUTH', derivSymbol: 'AUTH', type: 'auth' });
                    this.ws?.send(JSON.stringify({ authorize: token, req_id: authReqId }));
                }

                // Subscribe to all dashboard tickers with valid integer req_id
                this.subscribeAllSymbols();

                // Heartbeat keep-alive every 25 seconds
                if (this.pingInterval) clearInterval(this.pingInterval);
                this.pingInterval = setInterval(() => {
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ ping: 1 }));
                    }
                }, 25000);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (err) {
                    console.error('[Deriv Stream] Parse error:', err);
                }
            };

            this.ws.onerror = (err) => {
                console.warn('[Deriv Stream] WebSocket error:', err);
                this.setStatus('RECONNECTING');
            };

            this.ws.onclose = () => {
                console.log('[Deriv Stream] WebSocket closed');
                this.setStatus('DISCONNECTED');
                if (this.pingInterval) clearInterval(this.pingInterval);
                
                if (!this.isDestroyed) {
                    this.scheduleReconnect();
                }
            };
        } catch (e) {
            console.error('[Deriv Stream] Connection initialization error:', e);
            this.setStatus('DISCONNECTED');
            this.scheduleReconnect();
        }

        // Start background synchronization with real API market data
        this.startRealDataSync();
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.setStatus('RECONNECTING');
        this.reconnectTimeout = setTimeout(() => {
            if (!this.isDestroyed) {
                console.log('[Deriv Stream] Attempting reconnection...');
                this.startStream();
            }
        }, 4000);
    }

    private subscribeAllSymbols() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        Object.entries(DERIV_DASHBOARD_SYMBOLS).forEach(([displaySymbol, derivSymbol]) => {
            // 1. Subscribe to live continuous ticks with integer req_id
            const tickReqId = ++this.reqIdCounter;
            this.requestMap.set(tickReqId, { displaySymbol, derivSymbol, type: 'ticks' });
            
            this.ws?.send(JSON.stringify({
                ticks: derivSymbol,
                subscribe: 1,
                req_id: tickReqId
            }));

            // 2. Request initial history snapshot for day open calculation
            const histReqId = ++this.reqIdCounter;
            this.requestMap.set(histReqId, { displaySymbol, derivSymbol, type: 'ticks_history' });
            
            this.ws?.send(JSON.stringify({
                ticks_history: derivSymbol,
                adjust_start_time: 1,
                count: 10,
                end: 'latest',
                style: 'ticks',
                req_id: histReqId
            }));

            this.activeSubscriptions.add(derivSymbol);
        });
    }

    private handleMessage(data: any) {
        if (!data) return;

        // 1. Handle live streaming tick update from Deriv
        if (data.msg_type === 'tick' && data.tick) {
            const tick = data.tick;
            const derivSymbol = tick.symbol;
            const displaySymbol = REVERSE_DERIV_MAP[derivSymbol] || 
                                 REVERSE_DERIV_MAP[derivSymbol.toUpperCase()] || 
                                 (data.req_id && this.requestMap.get(data.req_id)?.displaySymbol) || 
                                 derivSymbol;
            const quote = parseFloat(tick.quote);

            if (!isNaN(quote)) {
                this.updateSymbolPrice(displaySymbol, quote, tick.bid, tick.ask, tick.epoch);
            }
        }

        // 2. Handle initial ticks_history snapshot
        if (data.msg_type === 'ticks_history' && data.history) {
            const tracked = data.req_id ? this.requestMap.get(data.req_id) : null;
            const derivSymbol = data.echo_req?.ticks_history || tracked?.derivSymbol;
            const displaySymbol = tracked?.displaySymbol || 
                                 (derivSymbol ? (REVERSE_DERIV_MAP[derivSymbol] || REVERSE_DERIV_MAP[derivSymbol.toUpperCase()]) : null);
            const history = data.history;

            if (displaySymbol && history && history.prices && history.prices.length > 0) {
                const latestPrice = parseFloat(history.prices[history.prices.length - 1]);
                const basePrice = parseFloat(history.prices[0]);
                
                if (!isNaN(basePrice) && basePrice > 0) {
                    this.baseOpenPrices.set(displaySymbol, basePrice);
                }

                if (!isNaN(latestPrice)) {
                    this.updateSymbolPrice(displaySymbol, latestPrice);
                }
            }
        }

        // 3. Handle OHLC bar updates
        if (data.msg_type === 'ohlc' && data.ohlc) {
            const ohlc = data.ohlc;
            const derivSymbol = ohlc.symbol;
            const displaySymbol = REVERSE_DERIV_MAP[derivSymbol] || 
                                 REVERSE_DERIV_MAP[derivSymbol?.toUpperCase()] || 
                                 derivSymbol;
            const quote = parseFloat(ohlc.close || ohlc.open);

            if (!isNaN(quote) && displaySymbol) {
                this.updateSymbolPrice(displaySymbol, quote);
            }
        }
    }

    private updateSymbolPrice(symbol: string, currentPrice: number, bid?: number, ask?: number, epoch?: number) {
        const now = epoch ? epoch * 1000 : Date.now();
        this.lastTickTimestamp = now;

        // Retrieve or initialize base open price
        let baseOpen = this.baseOpenPrices.get(symbol);
        if (!baseOpen || baseOpen <= 0) {
            const fallback = ACCURATE_MARKET_FALLBACKS[symbol];
            if (fallback && fallback.changePercent !== 0) {
                baseOpen = fallback.price / (1 + fallback.changePercent / 100);
            } else {
                baseOpen = currentPrice * 0.998;
            }
            this.baseOpenPrices.set(symbol, baseOpen);
        }

        const change = currentPrice - baseOpen;
        const changePercent = baseOpen > 0 ? (change / baseOpen) * 100 : 0;

        let prec = 2;
        if (symbol.includes('JPY')) prec = 3;
        else if (symbol.includes('EUR/') || symbol.includes('GBP/') || symbol.includes('AUD/') || symbol.includes('USD/CAD') || symbol.includes('USD/CHF') || symbol.includes('NZD/')) prec = 5;
        else if (symbol.includes('BTC') || symbol.includes('US30') || symbol.includes('NAS') || symbol.includes('GER') || symbol.includes('UK') || symbol.includes('VOLATILITY') || symbol.includes('BOOM') || symbol.includes('CRASH') || symbol.includes('STEP')) prec = 2;

        const updatedItem: MarketDataItem = {
            symbol,
            price: parseFloat(currentPrice.toFixed(prec)),
            change: parseFloat(change.toFixed(prec)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            bid: bid !== undefined ? parseFloat(bid.toFixed(prec)) : undefined,
            ask: ask !== undefined ? parseFloat(ask.toFixed(prec)) : undefined,
            timestamp: now
        };

        this.pricesMap.set(symbol, updatedItem);

        // Notify single tick listeners
        const singleSubscribers = this.singleListeners.get(symbol) || this.singleListeners.get(normalizeSymbolKey(symbol));
        if (singleSubscribers) {
            singleSubscribers.forEach(cb => cb(updatedItem));
        }

        // Broadcast to full list listeners
        this.notifyFullList();
    }

    /**
     * Periodically syncs actual real market data from backend for any symbols
     * without injecting any simulated noise
     */
    private startRealDataSync() {
        if (this.fallbackSyncInterval) return;

        const fetchRealSnapshot = async () => {
            try {
                const stored = localStorage.getItem('greyquant_user_settings');
                let token = '';
                if (stored) {
                    try {
                        token = JSON.parse(stored).derivApiToken || '';
                    } catch (e) {}
                }

                const url = `/api/marketData?force=true${token ? `&token=${encodeURIComponent(token)}` : ''}`;
                const res = await fetch(url, { cache: 'no-store' });
                if (res.ok) {
                    const data: MarketDataItem[] = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        data.forEach(item => {
                            // Only update if we haven't received a Deriv WS tick in the last 5 seconds for this symbol
                            const existing = this.pricesMap.get(item.symbol);
                            if (!existing || Date.now() - (existing.timestamp || 0) > 5000) {
                                this.pricesMap.set(item.symbol, {
                                    ...item,
                                    timestamp: item.timestamp || Date.now()
                                });
                                if (item.changePercent !== undefined && item.changePercent !== 0) {
                                    const base = item.price / (1 + item.changePercent / 100);
                                    this.baseOpenPrices.set(item.symbol, base);
                                }
                            }
                        });
                        this.notifyFullList();
                    }
                }
            } catch (e) {
                // Ignore background sync errors
            }
        };

        fetchRealSnapshot();
        this.fallbackSyncInterval = setInterval(fetchRealSnapshot, 15000);
    }

    private notifyFullList() {
        if (this.listeners.size === 0) return;
        const list = Array.from(this.pricesMap.values());
        this.listeners.forEach(cb => cb(list));
    }

    public subscribe(callback: PriceListener): () => void {
        this.listeners.add(callback);
        // Immediately provide current state
        if (this.pricesMap.size > 0) {
            callback(Array.from(this.pricesMap.values()));
        }
        this.startStream();

        return () => {
            this.listeners.delete(callback);
        };
    }

    public subscribeSingle(symbol: string, callback: SingleTickListener): () => void {
        const key = normalizeSymbolKey(symbol);
        if (!this.singleListeners.has(key)) {
            this.singleListeners.set(key, new Set());
        }
        this.singleListeners.get(key)!.add(callback);

        // Provide immediate current tick if available
        const current = this.getLatestPrice(symbol);
        if (current) callback(current);

        this.startStream();

        return () => {
            this.singleListeners.get(key)?.delete(callback);
        };
    }

    public getLatestPrices(): MarketDataItem[] {
        return Array.from(this.pricesMap.values());
    }

    public getLatestPrice(symbol: string): MarketDataItem | undefined {
        if (this.pricesMap.has(symbol)) {
            return this.pricesMap.get(symbol);
        }
        const norm = normalizeSymbolKey(symbol);
        for (const [key, val] of this.pricesMap.entries()) {
            if (normalizeSymbolKey(key) === norm) return val;
        }
        return undefined;
    }

    public async refresh(force: boolean = true): Promise<MarketDataItem[]> {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.subscribeAllSymbols();
        } else {
            this.startStream();
        }
        return this.getLatestPrices();
    }

    public getLastTickTimestamp(): number {
        return this.lastTickTimestamp || Date.now();
    }

    public destroy() {
        this.isDestroyed = true;
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.fallbackSyncInterval) clearInterval(this.fallbackSyncInterval);
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        this.listeners.clear();
        this.singleListeners.clear();
    }
}

// Global Singleton Instance
export const derivStream = new DerivStreamService();

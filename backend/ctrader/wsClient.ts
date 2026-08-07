import { WebSocket } from 'ws';

export interface CTraderWSOptions {
    host?: string;
    port?: number;
    timeoutMs?: number;
}

export class CTraderWSClient {
    private host: string;
    private port: number;
    private timeoutMs: number;
    private ws: WebSocket | null = null;
    private msgIdCounter = 1;
    private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();
    private eventListeners: Array<(msg: any) => void> = [];

    constructor(options: CTraderWSOptions = {}) {
        this.host = options.host || 'live.ctraderapi.com';
        this.port = options.port || 5036; // Port 5036 is standard JSON WebSocket
        this.timeoutMs = options.timeoutMs || 15000;
    }

    public onMessage(listener: (msg: any) => void): () => void {
        this.eventListeners.push(listener);
        return () => {
            this.eventListeners = this.eventListeners.filter(l => l !== listener);
        };
    }

    public async connect(): Promise<void> {
        console.log(`[STAGE 1] Starting connection to wss://${this.host}:${this.port}...`);
        console.log(`[STAGE 2] Creating WebSocket instance...`);

        return new Promise((resolve, reject) => {
            const url = `wss://${this.host}:${this.port}`;
            try {
                this.ws = new WebSocket(url);

                const connectTimeout = setTimeout(() => {
                    console.error(`[STAGE ERROR] WebSocket connection timed out after ${this.timeoutMs}ms`);
                    if (this.ws) {
                        try { this.ws.close(); } catch (_) {}
                    }
                    reject(new Error(`cTrader WebSocket connection timeout (${url})`));
                }, this.timeoutMs);

                this.ws.on('open', () => {
                    clearTimeout(connectTimeout);
                    console.log(`[STAGE 3] WebSocket opened successfully on ${url}!`);
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleIncomingMessage(data);
                });

                this.ws.on('close', (code, reason) => {
                    clearTimeout(connectTimeout);
                    console.log(`[STAGE 11] Connection closed. Code: ${code}, Reason: ${reason.toString() || 'None'}`);
                });

                this.ws.on('error', (err) => {
                    clearTimeout(connectTimeout);
                    console.error(`[STAGE ERROR] WebSocket error caught. Full stack trace:`, err.stack || err);
                    reject(err);
                });
            } catch (e: any) {
                console.error(`[STAGE ERROR] Failed to instantiate WebSocket. Full stack trace:`, e.stack || e);
                reject(e);
            }
        });
    }

    private handleIncomingMessage(data: any): void {
        try {
            const str = data.toString();
            const msg = JSON.parse(str);

            const { clientMsgId, payloadType, payload } = msg;

            if (clientMsgId && this.pendingRequests.has(clientMsgId)) {
                const req = this.pendingRequests.get(clientMsgId)!;
                this.pendingRequests.delete(clientMsgId);
                clearTimeout(req.timer);

                if (payloadType === 2142 || payloadType === 50) { // OA_ERROR_RES / ERROR_RES
                    const errMsg = payload?.description || payload?.errorCode || 'cTrader API Error';
                    const err = new Error(`cTrader Error [${payload?.errorCode || 'UNKNOWN'}]: ${errMsg}`);
                    console.error(`[STAGE ERROR] cTrader error response received:`, err.message);
                    req.reject(err);
                } else {
                    req.resolve(payload || msg);
                }
            }

            // Notify event listeners for streaming events (spots, depth, execution events, etc.)
            for (const listener of this.eventListeners) {
                try {
                    listener(msg);
                } catch (e: any) {
                    console.error(`[STAGE ERROR] Error executing WebSocket event listener:`, e.stack || e);
                }
            }
        } catch (e: any) {
            console.error(`[STAGE ERROR] Error parsing incoming WebSocket frame:`, e.stack || e);
        }
    }

    public sendRequest(payloadType: number, payload: any): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            const err = new Error('WebSocket is not connected (readyState !== OPEN)');
            console.error(`[STAGE ERROR] Cannot send request:`, err.stack || err);
            return Promise.reject(err);
        }

        const clientMsgId = `req_${Date.now()}_${this.msgIdCounter++}`;
        const frame = {
            clientMsgId,
            payloadType,
            payload
        };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(clientMsgId);
                const timeoutErr = new Error(`cTrader request payloadType=${payloadType} timed out after ${this.timeoutMs}ms`);
                console.error(`[STAGE ERROR] Request timeout:`, timeoutErr.stack || timeoutErr);
                reject(timeoutErr);
            }, this.timeoutMs);

            this.pendingRequests.set(clientMsgId, { resolve, reject, timer });

            try {
                this.ws!.send(JSON.stringify(frame));
            } catch (e: any) {
                clearTimeout(timer);
                this.pendingRequests.delete(clientMsgId);
                console.error(`[STAGE ERROR] Error transmitting frame over WebSocket:`, e.stack || e);
                reject(e);
            }
        });
    }

    public async authenticateApp(clientId: string, clientSecret: string): Promise<any> {
        console.log(`[STAGE 4] Sending application authentication (APP_AUTH_REQ / payloadType=2100)...`);
        try {
            const res = await this.sendRequest(2100, { clientId, clientSecret });
            console.log(`[STAGE 5] Application authentication response received! Payload:`, JSON.stringify(res));
            return res;
        } catch (err: any) {
            console.error(`[STAGE 5 ERROR] App Auth failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async authenticateAccount(cTraderAccountId: number, accessToken: string): Promise<any> {
        console.log(`[STAGE 6] Sending account authentication (ACCOUNT_AUTH_REQ / payloadType=2102) for Account ID ${cTraderAccountId}...`);
        try {
            const res = await this.sendRequest(2102, { ctidTraderAccountId: cTraderAccountId, accessToken });
            console.log(`[STAGE 7] Account authentication response received! Payload:`, JSON.stringify(res));
            return res;
        } catch (err: any) {
            console.error(`[STAGE 7 ERROR] Account Auth failed for Account ID ${cTraderAccountId}. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async getAccountsByToken(accessToken: string): Promise<any[]> {
        console.log(`[STAGE 8] Requesting accounts list by token (GET_ACCOUNTS_BY_TOKEN_REQ / payloadType=2149)...`);
        try {
            const res = await this.sendRequest(2149, { accessToken });
            console.log(`[STAGE 9] Accounts list response received!`);
            return res.ctidTraderAccount || res.accounts || [];
        } catch (err: any) {
            console.error(`[STAGE 9 ERROR] Accounts lookup failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async getSymbols(cTraderAccountId: number): Promise<any[]> {
        console.log(`[STAGE 8] Requesting symbols list (SYMBOLS_LIST_REQ / payloadType=2114) for Account ID ${cTraderAccountId}...`);
        try {
            const res = await this.sendRequest(2114, { ctidTraderAccountId: cTraderAccountId });
            console.log(`[STAGE 9] Symbols list received (${(res.symbol || []).length} symbols)!`);
            return res.symbol || [];
        } catch (err: any) {
            console.error(`[STAGE 9 ERROR] Symbols fetch failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async subscribeSpots(cTraderAccountId: number, symbolIds: number[]): Promise<any> {
        console.log(`[STAGE 8] Subscribing to spots (SUBSCRIBE_SPOTS_REQ / payloadType=2127) for symbols [${symbolIds.join(', ')}] on Account ${cTraderAccountId}...`);
        try {
            const res = await this.sendRequest(2127, {
                ctidTraderAccountId: cTraderAccountId,
                symbolId: symbolIds,
                subscribeToSpotTimestamp: true
            });
            console.log(`[STAGE 9] Spots subscription confirmed!`);
            return res;
        } catch (err: any) {
            console.error(`[STAGE 9 ERROR] Spots subscription failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async subscribeDepth(cTraderAccountId: number, symbolIds: number[]): Promise<any> {
        console.log(`[STAGE 8] Subscribing to depth (SUBSCRIBE_DEPTH_REQ / payloadType=2156) for symbols [${symbolIds.join(', ')}] on Account ${cTraderAccountId}...`);
        try {
            const res = await this.sendRequest(2156, {
                ctidTraderAccountId: cTraderAccountId,
                symbolId: symbolIds
            });
            console.log(`[STAGE 9] Depth subscription confirmed!`);
            return res;
        } catch (err: any) {
            console.error(`[STAGE 9 ERROR] Depth subscription failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async getTrendbars(cTraderAccountId: number, symbolId: number, period: number, count: number = 100): Promise<any> {
        console.log(`[STAGE 8] Requesting market data trendbars (GET_TRENDBARS_REQ / payloadType=2137) for Symbol ID ${symbolId}, Period ${period}...`);
        try {
            const res = await this.sendRequest(2137, {
                ctidTraderAccountId: cTraderAccountId,
                symbolId,
                period,
                count
            });
            console.log(`[STAGE 9] Market data trendbars received (${(res.trendbar || []).length} bars)!`);
            return res;
        } catch (err: any) {
            console.error(`[STAGE 9 ERROR] Trendbars fetch failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async getTickData(cTraderAccountId: number, symbolId: number, type: number, fromTimestamp?: number, toTimestamp?: number): Promise<any> {
        console.log(`[STAGE 8] Requesting market tick data (GET_TICK_DATA_REQ / payloadType=2145) for Symbol ID ${symbolId}...`);
        try {
            const payload: any = { ctidTraderAccountId: cTraderAccountId, symbolId, type };
            if (fromTimestamp) payload.fromTimestamp = fromTimestamp;
            if (toTimestamp) payload.toTimestamp = toTimestamp;

            const res = await this.sendRequest(2145, payload);
            console.log(`[STAGE 9] Market tick data received (${(res.tickData || []).length} ticks)!`);
            return res;
        } catch (err: any) {
            console.error(`[STAGE 9 ERROR] Tick data fetch failed. Full stack trace:`, err.stack || err);
            throw err;
        }
    }

    public async close(): Promise<void> {
        console.log(`[STAGE 10] Closing WebSocket connection...`);
        for (const [id, req] of this.pendingRequests.entries()) {
            clearTimeout(req.timer);
            req.reject(new Error('WebSocket connection closed'));
        }
        this.pendingRequests.clear();

        if (this.ws) {
            try {
                this.ws.removeAllListeners();
                this.ws.close();
                if (typeof this.ws.terminate === 'function') {
                    this.ws.terminate();
                }
            } catch (e: any) {
                console.error(`[STAGE ERROR] Error closing WebSocket:`, e.stack || e);
            }
            this.ws = null;
        }
    }
}

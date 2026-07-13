import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, Database, Lock, Eye, BarChart3 } from 'lucide-react';
import { useAuthContext } from './contexts/AuthContext';

interface Props {
    symbol: string;
}

export const CTraderAdvancedData: React.FC<Props> = ({ symbol }) => {
    const { userMetadata } = useAuthContext();
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
    const [spot, setSpot] = useState<{ bid?: number, ask?: number } | null>(null);
    const [depth, setDepth] = useState<{ bids: [number, number][], asks: [number, number][] } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const eventSourceRef = useRef<EventSource | null>(null);

    const isGranted = userMetadata?.access?.advancedStreaming === 'granted' || userMetadata?.role === 'admin';

    useEffect(() => {
        if (!isGranted || !symbol) return;

        const connectStream = () => {
            const token = localStorage.getItem('ctrader_access_token');
            const accountId = localStorage.getItem('ctrader_account_id');
            const environment = localStorage.getItem('ctrader_environment') || 'demo';

            if (!token || !accountId) {
                setStatus('error');
                setErrorMsg('cTrader not connected. Please connect in settings.');
                return;
            }

            const cleanSymbol = (raw: string) => {
                let clean = raw.toUpperCase().replace('/', '').replace('-', '');
                if (clean.startsWith('FRX')) {
                    clean = clean.substring(3);
                }
                if (clean === 'GOLD') return 'XAUUSD';
                if (clean === 'SILVER') return 'XAGUSD';
                if (clean === 'PLATINUM') return 'XPTUSD';
                if (clean === 'PALLADIUM') return 'XPDUSD';
                return clean;
            };
            const activeSymbol = cleanSymbol(symbol);

            setStatus('connecting');
            const url = `/api/ctrader/stream?token=${encodeURIComponent(token)}&accountId=${accountId}&environment=${environment}&symbols=${activeSymbol}`;
            
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'connected') {
                        setStatus('connected');
                    } else if (data.type === 'spot' && data.data) {
                        setSpot({ bid: data.data.bid, ask: data.data.ask });
                    } else if (data.type === 'depth' && data.data) {
                        // Depth format is usually something like bids: [[price, volume], ...], asks: [[price, volume], ...]
                        // Ensure we safely set it
                        setDepth({
                            bids: data.data.bids || [],
                            asks: data.data.asks || []
                        });
                    } else if (data.type === 'error') {
                        setStatus('error');
                        setErrorMsg(data.error || 'Stream error');
                    }
                } catch (e) {
                    console.error("Parse error from stream:", e);
                }
            };

            es.onerror = () => {
                setStatus('error');
                setErrorMsg('Connection lost. Reconnecting...');
                es.close();
                setTimeout(connectStream, 5000); // Reconnect
            };
        };

        connectStream();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [symbol, isGranted]);

    if (!isGranted) {
        return (
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col items-center justify-center text-center opacity-70">
                <Lock className="text-slate-400 mb-3" size={24} />
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-white mb-2">Advanced Streaming Locked</h4>
                <p className="text-xs font-medium text-slate-500 max-w-sm">
                    Access to cTrader Level 2 Orderbook, live ticks, and advanced spot tracking is disabled. Contact administrator for permissions.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="text-blue-500" size={18} /> cTrader Adv. Streaming
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {status === 'connected' ? 'LIVE L2' : status}
                    </span>
                </div>
            </div>

            {errorMsg && status === 'error' && (
                <div className="bg-red-500/10 text-red-500 text-xs p-3 rounded-xl border border-red-500/20">
                    {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bid (Spot)</span>
                    <span className="text-lg font-black text-green-500">{spot?.bid ? spot.bid.toFixed(5) : '---'}</span>
                </div>
                <div className="flex flex-col gap-1 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ask (Spot)</span>
                    <span className="text-lg font-black text-red-500">{spot?.ask ? spot.ask.toFixed(5) : '---'}</span>
                </div>
            </div>

            {depth && (
                <div className="flex flex-col gap-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
                        <BarChart3 size={12} /> Level 2 Orderbook
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Bids */}
                        <div>
                            <div className="text-[10px] font-bold text-green-500 mb-2 border-b border-green-500/20 pb-1">BIDS</div>
                            <div className="space-y-1">
                                {depth.bids.slice(0, 5).map((bid, i) => (
                                    <div key={i} className="flex justify-between text-xs font-mono">
                                        <span className="text-slate-400">{bid[1]}</span>
                                        <span className="text-green-500 font-bold">{bid[0].toFixed(5)}</span>
                                    </div>
                                ))}
                                {(!depth.bids || depth.bids.length === 0) && <span className="text-xs text-slate-500 italic">No bid depth</span>}
                            </div>
                        </div>
                        {/* Asks */}
                        <div>
                            <div className="text-[10px] font-bold text-red-500 mb-2 border-b border-red-500/20 pb-1">ASKS</div>
                            <div className="space-y-1">
                                {depth.asks.slice(0, 5).map((ask, i) => (
                                    <div key={i} className="flex justify-between text-xs font-mono">
                                        <span className="text-red-500 font-bold">{ask[0].toFixed(5)}</span>
                                        <span className="text-slate-400">{ask[1]}</span>
                                    </div>
                                ))}
                                {(!depth.asks || depth.asks.length === 0) && <span className="text-xs text-slate-500 italic">No ask depth</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { Trade } from '../types';
import { getTradeHistory, updateTradeOutcome } from '../services/tradeLogger';

export const TradeHistory: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const history = await getTradeHistory();
                setTrades(history);
            } catch (error) {
                console.error('Failed to fetch trade history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrades();
    }, []);

    const [notes, setNotes] = useState<{ [key: string]: string }>({});

    const handleOutcomeUpdate = async (tradeId: string, outcome: Trade['outcome']) => {
        try {
            const tradeNotes = notes[tradeId] || '';
            await updateTradeOutcome(tradeId, outcome, tradeNotes);
            setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, outcome, notes: tradeNotes } : t));
        } catch (error) {
            console.error('Failed to update outcome:', error);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {trades.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-gray-400">No trading history found.</p>
                    </div>
                ) : trades.map(trade => (
                    <div key={trade.id} className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${
                                    trade.signal === 'BUY' ? 'bg-green-500/20 text-green-500' : 
                                    trade.signal === 'SELL' ? 'bg-red-500/20 text-red-500' : 
                                    'bg-yellow-500/20 text-yellow-500'
                                }`}>
                                    {trade.signal[0]}
                                </div>
                                <div>
                                    <p className="font-black text-xl tracking-tight">{trade.asset}</p>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                                        {new Date(trade.timestamp).toLocaleString()} • {trade.signalData?.timeframe || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {(['Win', 'Loss', 'No Trade'] as Trade['outcome'][]).map(outcome => (
                                    <button
                                        key={outcome}
                                        onClick={() => handleOutcomeUpdate(trade.id!, outcome)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            trade.outcome === outcome 
                                                ? outcome === 'Win' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' :
                                                  outcome === 'Loss' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                                                  'bg-slate-500 text-white shadow-lg shadow-slate-500/30'
                                                : 'bg-gray-100 dark:bg-slate-800/60 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {outcome}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                                Post-Mortem Analysis (Why did this happen?)
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder={trade.notes || "e.g., Liquidity sweep failed, news spike, perfect FVG retest..."}
                                    value={notes[trade.id!] !== undefined ? notes[trade.id!] : (trade.notes || '')}
                                    onChange={(e) => setNotes(prev => ({ ...prev, [trade.id!]: e.target.value }))}
                                    className="flex-grow bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <button 
                                    onClick={() => handleOutcomeUpdate(trade.id!, trade.outcome)}
                                    className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-blue-500/20"
                                >
                                    Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

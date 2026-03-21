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

    const handleOutcomeUpdate = async (tradeId: string, outcome: Trade['outcome']) => {
        try {
            await updateTradeOutcome(tradeId, outcome);
            setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, outcome } : t));
        } catch (error) {
            console.error('Failed to update outcome:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="space-y-4">
                {trades.map(trade => (
                    <div key={trade.id} className="p-4 bg-white/60 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-white/10 flex justify-between items-center">
                        <div>
                            <p className="font-black text-lg">{trade.asset} - {trade.signal}</p>
                            <p className="text-xs text-gray-500">{new Date(trade.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                            {(['Win', 'Loss', 'No Trade'] as Trade['outcome'][]).map(outcome => (
                                <button
                                    key={outcome}
                                    onClick={() => handleOutcomeUpdate(trade.id!, outcome)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${trade.outcome === outcome ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
                                >
                                    {outcome}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

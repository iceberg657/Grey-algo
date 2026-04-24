import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { getTradeHistory, updateTradeOutcome } from '../services/tradeLogger';
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { GlobalStrategy, UserMetadata } from '../types';
import { useAuth } from '../hooks/useAuth';


export const TradeJournal = () => {
    const { userMetadata } = useAuth();
    const [recentStrategies, setRecentStrategies] = useState<GlobalStrategy[]>([]);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch Learned Strategies
        const rulesRef = collection(db, 'learned_rules');
        const defaultQ = query(rulesRef, orderBy('timestamp', 'desc'), limit(50));
        
        const unsubscribeStrategies = onSnapshot(defaultQ, (snapshot) => {
            const rules: GlobalStrategy[] = [];
            snapshot.forEach(doc => {
                rules.push({ id: doc.id, ...doc.data() } as GlobalStrategy);
            });
            setRecentStrategies(rules);
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'learned_rules');
        });

        return () => {
            unsubscribeStrategies();
        };
    }, []);

    const handleDeleteStrategy = async (id: string) => {
        const path = `learned_rules/${id}`;
        try {
            await deleteDoc(doc(db, 'learned_rules', id));
            setDeleteConfirmId(null);
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
        }
    };

    return (
  <div className="p-6 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl h-full flex flex-col">
    <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Neural Lessons
    </h2>
    
    <div className="flex-grow overflow-hidden flex flex-col">
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
            {recentStrategies.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 h-full flex items-center justify-center">
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">
                        No lessons learned yet.
                    </p>
                </div>
            ) : (
                recentStrategies.map((strat) => (
                    <div key={strat.id} className="p-5 bg-white shadow-sm dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col justify-between group hover:border-green-500/30 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-500 text-[10px] font-black uppercase tracking-widest rounded-md">
                                        Confidence: {strat.confidence}%
                                    </span>
                                </div>
                                <span className="text-[10px] opacity-60 dark:opacity-40 font-mono text-gray-500 dark:text-zinc-400">
                                    {new Date(strat.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed italic opacity-90 mb-4 text-gray-800 dark:text-zinc-300">
                                "{strat.rule}"
                            </p>
                        </div>
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {deleteConfirmId === strat.id ? (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => strat.id && handleDeleteStrategy(strat.id)} 
                                        className="px-3 py-1.5 bg-red-600/20 text-red-600 dark:text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse border border-red-500/20"
                                    >
                                        Confirm Purge
                                    </button>
                                    <button 
                                        onClick={() => setDeleteConfirmId(null)} 
                                        className="px-3 py-1.5 bg-gray-200 dark:bg-zinc-700/50 text-gray-800 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-300 dark:border-white/5"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setDeleteConfirmId(strat.id || null)}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Purge
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  </div>
);
}

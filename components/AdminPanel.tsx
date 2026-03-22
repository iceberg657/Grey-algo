
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trade, GlobalStrategy } from '../types';
import { Loader } from './Loader';

interface AdminPanelProps {
    onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [stats, setStats] = useState<{ totalTrades: number; totalUsers: number } | null>(null);
    const [recentStrategies, setRecentStrategies] = useState<GlobalStrategy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                // Fetch stats (This is a simplified version, in a real app you'd use a cloud function or a dedicated stats doc)
                const tradesSnapshot = await getDocs(collection(db, 'global_strategies')); // Just as a placeholder for now
                const strategiesSnapshot = await getDocs(query(collection(db, 'global_strategies'), orderBy('timestamp', 'desc'), limit(5)));
                
                setRecentStrategies(strategiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalStrategy)));
                
                // For demo purposes, let's just set some dummy stats if we can't count everything easily
                setStats({
                    totalTrades: 1250, // Placeholder
                    totalUsers: 45 // Placeholder
                });
            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    const handleSendBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setIsSending(true);
        try {
            await addDoc(collection(db, 'admin_settings'), {
                type: 'broadcast',
                message: broadcastMsg,
                timestamp: Date.now(),
                author: auth.currentUser?.email
            });
            setBroadcastMsg('');
            alert('Broadcast sent successfully!');
        } catch (error) {
            console.error("Error sending broadcast:", error);
            alert('Failed to send broadcast.');
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-green-600 dark:text-green-400">
                            Admin Control Center
                        </h1>
                        <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
                            Authorized Personnel Only // {auth.currentUser?.email}
                        </p>
                    </div>
                    <button 
                        onClick={onBack}
                        className="px-6 py-2 bg-slate-200 dark:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/10 transition-all"
                    >
                        Exit Panel
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl"
                    >
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-2">Total Trades Logged</h3>
                        <p className="text-4xl font-black text-green-500">{stats?.totalTrades}</p>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl"
                    >
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-2">Active Neural Links</h3>
                        <p className="text-4xl font-black text-blue-500">{stats?.totalUsers}</p>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl"
                    >
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-2">System Status</h3>
                        <p className="text-4xl font-black text-emerald-500">OPTIMAL</p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Broadcast Section */}
                    <section className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                        <h2 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Emergency Broadcast
                        </h2>
                        <textarea 
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Enter message for all active terminals..."
                            className="w-full h-32 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 mb-4 resize-none"
                        />
                        <button 
                            onClick={handleSendBroadcast}
                            disabled={isSending || !broadcastMsg.trim()}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-green-500/30"
                        >
                            {isSending ? 'Transmitting...' : 'Initiate Broadcast'}
                        </button>
                    </section>

                    {/* Recent Strategies Section */}
                    <section className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                        <h2 className="text-xl font-black uppercase tracking-widest mb-6">Recent Neural Strategies</h2>
                        <div className="space-y-4">
                            {recentStrategies.map((strat, idx) => (
                                <div key={strat.id || idx} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                                            Confidence: {strat.confidence}%
                                        </span>
                                        <span className="text-[10px] opacity-50">
                                            {new Date(strat.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed italic">"{strat.rule}"</p>
                                </div>
                            ))}
                            {recentStrategies.length === 0 && (
                                <p className="text-center py-8 opacity-50 text-sm italic">No strategies recorded yet.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

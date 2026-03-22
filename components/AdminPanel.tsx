
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, query, orderBy, limit, addDoc, updateDoc, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { Trade, GlobalStrategy, UserMetadata, Broadcast } from '../types';
import { Loader } from './Loader';

interface AdminPanelProps {
    onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [stats, setStats] = useState<{ totalTrades: number; totalUsers: number }>({ totalTrades: 0, totalUsers: 0 });
    const [recentStrategies, setRecentStrategies] = useState<GlobalStrategy[]>([]);
    const [users, setUsers] = useState<UserMetadata[]>([]);
    const [systemSettings, setSystemSettings] = useState<{ maintenanceMode: boolean; chatLocked: boolean }>({ maintenanceMode: false, chatLocked: false });
    const [isLoading, setIsLoading] = useState(true);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'strategies'>('overview');
    const [error, setError] = useState<Error | null>(null);

    if (error) throw error;

    useEffect(() => {
        // Real-time users listener
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserMetadata));
            setUsers(usersData);
            setStats(prev => ({ ...prev, totalUsers: usersData.length }));
        }, (err) => {
            setIsLoading(false);
            try {
                handleFirestoreError(err, OperationType.LIST, 'users');
            } catch (e) {
                setError(e as Error);
            }
        });

        // Real-time strategies listener
        const unsubscribeStrategies = onSnapshot(query(collection(db, 'global_strategies'), orderBy('timestamp', 'desc'), limit(10)), (snapshot) => {
            setRecentStrategies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalStrategy)));
        }, (err) => {
            try {
                handleFirestoreError(err, OperationType.LIST, 'global_strategies');
            } catch (e) {
                setError(e as Error);
            }
        });

        // Real-time system settings listener
        const unsubscribeSettings = onSnapshot(doc(db, 'admin_settings', 'system'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setSystemSettings({
                    maintenanceMode: data.maintenanceMode || false,
                    chatLocked: data.chatLocked || false
                });
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'admin_settings/system');
        });

        // Fetch total trades (anonymized collection group would be better but let's count strategies for now as a proxy or just use a fixed number for demo)
        const fetchStats = async () => {
            try {
                const strategiesSnapshot = await getDocs(collection(db, 'global_strategies'));
                setStats(prev => ({ ...prev, totalTrades: strategiesSnapshot.size * 15 })); // Proxy multiplier
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        // Broadcast cleanup listener for Admin Panel
        const qBroadcasts = query(collection(db, 'broadcasts'), where('active', '==', true));
        const unsubscribeBroadcasts = onSnapshot(qBroadcasts, (snapshot) => {
            const now = Date.now();
            snapshot.docs.forEach(async (docSnap) => {
                const data = docSnap.data();
                if (now - data.timestamp > 60000) {
                    try {
                        await deleteDoc(doc(db, 'broadcasts', docSnap.id));
                    } catch (err) {
                        console.error("Admin auto-delete failed:", err);
                    }
                }
            });
        });

        // Periodic cleanup timer for Admin Panel
        const cleanupInterval = setInterval(async () => {
            const now = Date.now();
            try {
                const q = query(collection(db, 'broadcasts'), where('active', '==', true));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(async (docSnap) => {
                    const data = docSnap.data();
                    if (now - data.timestamp > 60000) {
                        await deleteDoc(doc(db, 'broadcasts', docSnap.id));
                    }
                });
            } catch (err) {
                console.error("Admin periodic cleanup failed:", err);
            }
        }, 10000); // Check every 10 seconds

        return () => {
            unsubscribeUsers();
            unsubscribeStrategies();
            unsubscribeSettings();
            unsubscribeBroadcasts();
            clearInterval(cleanupInterval);
        };
    }, []);

    const handleUpdateSystemSetting = async (setting: 'maintenanceMode' | 'chatLocked', value: boolean) => {
        const path = 'admin_settings/system';
        try {
            const settingsRef = doc(db, 'admin_settings', 'system');
            await setDoc(settingsRef, {
                [setting]: value,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setIsSending(true);
        const path = 'broadcasts';
        try {
            await addDoc(collection(db, 'broadcasts'), {
                message: broadcastMsg,
                timestamp: Date.now(),
                active: true,
                author: auth.currentUser?.email
            });
            setBroadcastMsg('');
            alert('Broadcast transmitted to all terminals.');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateUserAccess = async (userId: string, feature: 'autoTrade' | 'products', status: 'locked' | 'pending' | 'granted') => {
        const path = `users/${userId}`;
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                [`access.${feature}`]: status
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
        }
    };

    const handleRevokeUser = async (userId: string, isRevoked: boolean) => {
        const path = `users/${userId}`;
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { isRevoked });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-950"><Loader /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic text-green-600 dark:text-green-400">
                            Command Center
                        </h1>
                        <p className="text-xs font-bold opacity-50 uppercase tracking-[0.3em] mt-1">
                            Neural Network Oversight // {auth.currentUser?.email}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex bg-slate-200 dark:bg-white/5 p-1 rounded-xl">
                            {(['overview', 'users', 'strategies'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab 
                                            ? 'bg-white dark:bg-green-500 text-slate-900 dark:text-white shadow-lg' 
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={onBack}
                            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            Exit
                        </button>
                    </div>
                </header>

                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl">
                                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Total Analysis Engine Cycles</h3>
                                <p className="text-5xl font-black text-green-500 tracking-tighter">{stats?.totalTrades}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl">
                                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Active Neural Links</h3>
                                <p className="text-5xl font-black text-blue-500 tracking-tighter">{stats?.totalUsers}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl">
                                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Network Integrity</h3>
                                <p className="text-5xl font-black text-emerald-500 tracking-tighter">99.9%</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <section className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                                <h2 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                    Global Broadcast
                                </h2>
                                <textarea 
                                    value={broadcastMsg}
                                    onChange={(e) => setBroadcastMsg(e.target.value)}
                                    placeholder="Enter system-wide message..."
                                    className="w-full h-40 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-6 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 mb-6 resize-none"
                                />
                                <button 
                                    onClick={handleSendBroadcast}
                                    disabled={isSending || !broadcastMsg.trim()}
                                    className="w-full py-5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-green-500/30"
                                >
                                    {isSending ? 'Transmitting...' : 'Initiate Neural Broadcast'}
                                </button>
                            </section>

                            <section className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                                <h2 className="text-xl font-black uppercase tracking-widest mb-8">System Control</h2>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-widest">Maintenance Mode</h4>
                                            <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1">Lock entire application</p>
                                        </div>
                                        <button 
                                            onClick={() => handleUpdateSystemSetting('maintenanceMode', !systemSettings.maintenanceMode)}
                                            className={`w-14 h-8 rounded-full transition-all relative ${systemSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-300 dark:bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${systemSettings.maintenanceMode ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-widest">Neural Chat Lock</h4>
                                            <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1">Disable AI Chat interface</p>
                                        </div>
                                        <button 
                                            onClick={() => handleUpdateSystemSetting('chatLocked', !systemSettings.chatLocked)}
                                            className={`w-14 h-8 rounded-full transition-all relative ${systemSettings.chatLocked ? 'bg-orange-500' : 'bg-slate-300 dark:bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${systemSettings.chatLocked ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                                <h2 className="text-xl font-black uppercase tracking-widest mb-8">Recent Strategies</h2>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {recentStrategies.map((strat, idx) => (
                                        <div key={strat.id || idx} className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 group hover:border-green-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest rounded-md">
                                                    Confidence: {strat.confidence}%
                                                </span>
                                                <span className="text-[10px] opacity-40 font-mono">
                                                    {new Date(strat.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed italic opacity-80">"{strat.rule}"</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-white/5">
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-50">User Entity</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-50">Analysis Count</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-50">Auto Trade</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-50">Products</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-50">Status</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {users.map(user => (
                                        <tr key={user.uid} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{user.email}</span>
                                                    <span className="text-[10px] opacity-40 font-mono">{user.uid}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="text-sm font-black text-green-500">{user.analysisCount || 0}</span>
                                            </td>
                                            <td className="p-6">
                                                <select 
                                                    value={user.access?.autoTrade || 'locked'}
                                                    onChange={(e) => handleUpdateUserAccess(user.uid, 'autoTrade', e.target.value as any)}
                                                    className="bg-slate-100 dark:bg-white/5 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-2 focus:ring-green-500/50"
                                                >
                                                    <option value="locked">LOCKED</option>
                                                    <option value="pending">PENDING</option>
                                                    <option value="granted">GRANTED</option>
                                                </select>
                                            </td>
                                            <td className="p-6">
                                                <select 
                                                    value={user.access?.products || 'locked'}
                                                    onChange={(e) => handleUpdateUserAccess(user.uid, 'products', e.target.value as any)}
                                                    className="bg-slate-100 dark:bg-white/5 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-2 focus:ring-green-500/50"
                                                >
                                                    <option value="locked">LOCKED</option>
                                                    <option value="pending">PENDING</option>
                                                    <option value="granted">GRANTED</option>
                                                </select>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    user.isRevoked 
                                                        ? 'bg-red-500/10 text-red-500' 
                                                        : 'bg-green-500/10 text-green-500'
                                                }`}>
                                                    {user.isRevoked ? 'REVOKED' : 'ACTIVE'}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <button 
                                                    onClick={() => handleRevokeUser(user.uid, !user.isRevoked)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        user.isRevoked 
                                                            ? 'bg-green-500 text-white hover:bg-green-400' 
                                                            : 'bg-red-500 text-white hover:bg-red-400'
                                                    }`}
                                                >
                                                    {user.isRevoked ? 'Restore' : 'Revoke'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

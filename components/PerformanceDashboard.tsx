import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trade } from '../types';

interface PerformanceDashboardProps {
    trades: Trade[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ trades }) => {
    const stats = useMemo(() => {
        const completed = trades.filter(t => t.outcome === 'Win' || t.outcome === 'Loss');
        const wins = completed.filter(t => t.outcome === 'Win').length;
        const losses = completed.filter(t => t.outcome === 'Loss').length;
        const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
        
        let cumulative = 0;
        const pnlData = completed.reverse().map((t, index) => {
            cumulative += (t.outcome === 'Win' ? 1 : -1);
            return {
                name: `Trade ${index + 1}`,
                pnl: cumulative,
                outcome: t.outcome
            };
        });

        return {
            wins,
            losses,
            winRate,
            pnlData,
            pieData: [
                { name: 'Wins', value: wins, color: '#22c55e' }, // green-500
                { name: 'Losses', value: losses, color: '#ef4444' } // red-500
            ]
        };
    }, [trades]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* KPI Cards */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Win Rate</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.winRate.toFixed(1)}%</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Total Trades</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.wins + stats.losses}</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Total Wins</p>
                    <p className="text-2xl font-black text-green-500">{stats.wins}</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Net PnL (Units)</p>
                    <p className={`text-2xl font-black ${stats.pnlData.length && stats.pnlData[stats.pnlData.length-1].pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.pnlData.length ? (stats.pnlData[stats.pnlData.length-1].pnl > 0 ? '+' : '') + stats.pnlData[stats.pnlData.length-1].pnl : 0}
                    </p>
                </div>
            </div>

            {/* Win/Loss Pie Chart */}
            <div className="col-span-1 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg h-64 flex flex-col">
                <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-4">Win/Loss Distribution</p>
                <div className="flex-grow flex items-center justify-center">
                    {stats.wins + stats.losses === 0 ? (
                        <p className="text-gray-400 text-sm">No completed trades yet</p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* PnL Line Chart */}
            <div className="col-span-1 md:col-span-2 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg h-64 flex flex-col">
                <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-4">Cumulative Performance</p>
                <div className="flex-grow flex items-center justify-center">
                    {stats.pnlData.length === 0 ? (
                        <p className="text-gray-400 text-sm">No completed trades yet</p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.pnlData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="pnl" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

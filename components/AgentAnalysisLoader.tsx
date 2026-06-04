
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Agent {
    id: string;
    name: string;
    role: string;
    status: 'pending' | 'active' | 'completed';
    task: string;
}

const INITIAL_AGENTS: Agent[] = [
    { id: 'structure', name: 'Structure Architect', role: 'SMC Specialist', status: 'pending', task: 'Mapping Market Hierarchy & BOS/CHoCH' },
    { id: 'liquidity', name: 'Liquidity Scout', role: 'Volume Quant', status: 'pending', task: 'Hunting BSL/SSL & Sweeps' },
    { id: 'risk', name: 'Risk Mitigation', role: 'Security Unit', status: 'pending', task: 'Analyzing FVGs & Order Flow Imbalance' },
    { id: 'execution', name: 'Execution Quant', role: 'Final Decision', status: 'pending', task: 'Synthesizing Institutional Confluence' },
];

const LOG_MESSAGES = [
    "[SYSTEM] Initializing Neural Network...",
    "[STRUCTURE] Scanning H1 Frame for Major Swing Points...",
    "[STRUCTURE] Break of Structure identified at local high.",
    "[LIQUIDITY] Tracking retail stop-loss clusters...",
    "[LIQUIDITY] Inducement sweep confirmed.",
    "[RISK] Measuring Inefficiency depth (FVG).",
    "[RISK] ATR Volatility calculated: Standard.",
    "[EXECUTION] Correlating DXY & Global Sentiment...",
    "[EXECUTION] Finalizing Institutional Bias report.",
];

export const AgentAnalysisLoader: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isDeepThinking, setIsDeepThinking] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('greyquant_user_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.deepThinking) {
                    setIsDeepThinking(true);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        const agentInterval = setInterval(() => {
            setCurrentStep(prev => {
                const next = prev + 1;
                
                // Update agent statuses based on step
                setAgents(currentAgents => currentAgents.map((agent, idx) => {
                    if (next >= (idx + 1) * 2) return { ...agent, status: 'completed' };
                    if (next >= idx * 2 + 1) return { ...agent, status: 'active' };
                    return agent;
                }));

                // Add random log messages
                if (next < LOG_MESSAGES.length) {
                    setLogs(prevLogs => [...prevLogs.slice(-4), LOG_MESSAGES[next]]);
                }

                return next;
            });
        }, 2000);

        return () => clearInterval(agentInterval);
    }, []);

    return (
        <div className={`${inline ? 'relative w-full rounded-3xl bg-white/50 dark:bg-[#020617]/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50' : 'fixed inset-0 z-[200] bg-slate-50 dark:bg-[#020617]'} flex flex-col items-center justify-center p-6 sm:p-10 overflow-hidden transition-colors duration-300`}>
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-slate-50 dark:from-[#020617] dark:via-transparent dark:to-[#020617] transition-colors duration-300"></div>
            </div>

            <div className="relative z-10 w-full max-w-2xl">
                <header className="text-center mb-12">
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-[10px] font-black uppercase tracking-[0.4em] text-green-500"
                        >
                            Neural Command Center Active
                        </motion.div>
                        {isDeepThinking && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] font-black uppercase tracking-[0.4em] text-violet-500 animate-pulse flex items-center gap-1.5"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                                <span>🧠 Deep Thinking Active</span>
                            </motion.div>
                        )}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white flex items-center justify-center gap-4">
                        <span className="opacity-40">Phase:</span> 
                        <span className="text-green-500">Autonomous Analysis</span>
                    </h2>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    <AnimatePresence>
                        {agents.map((agent, idx) => (
                            <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-4 rounded-2xl border-2 transition-all duration-500 ${
                                    agent.status === 'active' 
                                        ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                                        : agent.status === 'completed'
                                        ? 'bg-slate-50 dark:bg-slate-900 border-green-500/20'
                                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-white/5 opacity-60 dark:opacity-40'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${agent.status === 'completed' ? 'text-green-500' : 'text-slate-500'}`}>
                                        {agent.role}
                                    </div>
                                    {agent.status === 'completed' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M2.166 11.388a.75.75 0 011.096-.033l3.357 3.412 7.075-8.83a.75.75 0 111.173.935l-7.703 9.614a.75.75 0 01-1.12.046l-3.879-3.942a.75.75 0 01-.033-1.096c.01-.01.02-.02.03-.03z" clipRule="evenodd" />
                                            </svg>
                                        </motion.div>
                                    )}
                                    {agent.status === 'active' && (
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{agent.name}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono italic">
                                    {agent.status === 'active' ? `> ${agent.task}...` : agent.status === 'completed' ? `Analysis Verified.` : 'Standing by...'}
                                </p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="bg-slate-100/80 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 font-mono">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-widest">Neural Logs</span>
                    </div>
                    <div className="space-y-1.5 min-h-[80px]">
                        {logs.map((log, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-[11px] text-green-600/80 dark:text-green-400/80"
                            >
                                <span className="opacity-40 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                {log}
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center">
                    <div className="w-full max-w-xs h-1.5 bg-gray-200 dark:bg-slate-900 rounded-full overflow-hidden border border-gray-300 dark:border-white/5">
                        <motion.div 
                            className="h-full bg-green-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 18, ease: "linear" }}
                        />
                    </div>
                    <p className="mt-4 text-[9px] font-black uppercase tracking-[0.6em] text-slate-500 animate-pulse">
                        Synchronizing Collaborative Brain-Tree
                    </p>
                </div>
            </div>

            {/* Floating Binary Decals */}
            <div className="absolute bottom-10 right-10 opacity-10 dark:opacity-5 font-mono text-xs hidden md:block select-none text-slate-800 dark:text-white">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>{Math.random().toString(2).substring(2, 20)}</div>
                ))}
            </div>
        </div>
    );
};

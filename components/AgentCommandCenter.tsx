
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Activity, 
  Shield, 
  Zap, 
  Target, 
  Globe, 
  Cpu, 
  Database, 
  Lock, 
  Unlock,
  ChevronRight,
  AlertTriangle,
  Layers,
  Search,
  Eye,
  RefreshCcw,
  BarChart3
} from 'lucide-react';
import { ANALYSIS_MODELS, getAnalysisPool } from '../services/retryUtils';

interface AgentStatus {
    id: string;
    name: string;
    description: string;
    status: 'idle' | 'thinking' | 'active' | 'error';
    model: string;
    icon: React.ReactNode;
}

interface Thought {
    id: string;
    agentId: string;
    message: string;
    timestamp: number;
    type: 'info' | 'success' | 'warning' | 'error';
}

interface AgentCommandCenterProps {
    onBack: () => void;
    userMetadata?: any;
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({ onBack, userMetadata }) => {
    const [agents, setAgents] = useState<AgentStatus[]>([
        { 
            id: 'market-intel', 
            name: 'Market Intelligence', 
            description: 'Global sentiment & macro data scout',
            status: 'active', 
            model: 'gemini-3.1-pro-preview',
            icon: <Globe className="w-5 h-5" /> 
        },
        { 
            id: 'sniper', 
            name: 'Technical Sniper', 
            description: 'Hyper-precision chart execution',
            status: 'idle', 
            model: 'gemini-2.0-flash',
            icon: <Target className="w-5 h-5" /> 
        },
        { 
            id: 'risk-guard', 
            name: 'Risk Oversight', 
            description: 'Mathematical capital preservation',
            status: 'active', 
            model: 'Calculated Logic',
            icon: <Shield className="w-5 h-5" /> 
        },
        { 
            id: 'neural-memory', 
            name: 'Memory/Learning', 
            description: 'Semantic strategy retrieval',
            status: 'active', 
            model: 'gemini-embedding-2-preview',
            icon: <Database className="w-5 h-5" /> 
        }
    ]);

    const [thoughts, setThoughts] = useState<Thought[]>([
        { id: '1', agentId: 'market-intel', message: 'Scanning XAU/USD sentiment across major outlets...', timestamp: Date.now() - 5000, type: 'info' },
        { id: '2', agentId: 'risk-guard', message: 'Account health optimized. Daily drawdown limit set at 4%.', timestamp: Date.now() - 4000, type: 'success' },
        { id: '3', agentId: 'neural-memory', message: 'Loading historical patterns for EUR/USD London Open...', timestamp: Date.now() - 2000, type: 'info' }
    ]);

    const [vitals, setVitals] = useState({
        accountStatus: 'SECURE',
        activeKeys: 0,
        winRate: 74.2,
        throughput: '1.2s'
    });

    const thoughtRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (thoughtRef.current) {
            thoughtRef.current.scrollTop = thoughtRef.current.scrollHeight;
        }
    }, [thoughts]);

    useEffect(() => {
        const pool = getAnalysisPool();
        setVitals(v => ({ ...v, activeKeys: pool.length }));
    }, []);

    // Simulate agent activity
    useEffect(() => {
        const interval = setInterval(() => {
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            const messages = [
                "Re-calculating OTE levels...",
                "Searching for institutional sweeps...",
                "Waiting for London session volume...",
                "Monitoring DXY correlation...",
                "Checking current ATR against 14-day average...",
                "Readying Sniper Lane 4...",
                "Memory retrieval: Gold similarity index 0.89"
            ];
            const message = messages[Math.floor(Math.random() * messages.length)];
            
            const newThought: Thought = {
                id: Math.random().toString(36),
                agentId: randomAgent.id,
                message,
                timestamp: Date.now(),
                type: 'info'
            };

            setThoughts(prev => [...prev.slice(-49), newThought]);

            // Randomly set an agent to "thinking"
            setAgents(prev => prev.map(a => 
                a.id === randomAgent.id ? { ...a, status: Math.random() > 0.7 ? 'thinking' : 'active' } : a
            ));

            setTimeout(() => {
                setAgents(prev => prev.map(a => a.id === randomAgent.id ? { ...a, status: 'active' } : a));
            }, 2000);

        }, 4000);

        return () => clearInterval(interval);
    }, [agents]);

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 font-mono p-4 md:p-8 flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-6">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-600/10 border border-red-600/50 rounded-lg">
                        <Terminal className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-white flex items-center">
                            Agentic Command Center
                            <span className="ml-3 px-2 py-0.5 bg-red-600 text-[10px] rounded text-white animate-pulse">Live</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">GreyAlpha Quantum Core v5.1 // System Administrator: {userMetadata?.displayName || 'User'}</p>
                    </div>
                </div>
                <button 
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center space-x-2"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Exit Terminal</span>
                </button>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <VitalCard label="Logic Status" value={vitals.accountStatus} icon={<Shield className="w-4 h-4" />} color="text-green-400" />
                <VitalCard label="Neural Lanes" value={vitals.activeKeys} icon={<Layers className="w-4 h-4" />} color="text-red-500" />
                <VitalCard label="Avg. Precision" value={`${vitals.winRate}%`} icon={<BarChart3 className="w-4 h-4" />} color="text-blue-400" />
                <VitalCard label="Response Time" value={vitals.throughput} icon={<Zap className="w-4 h-4" />} color="text-orange-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                {/* Agents List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center">
                        <Cpu className="w-3 h-3 mr-2" />
                        Autonomous Agents
                    </h2>
                    <div className="space-y-3">
                        {agents.map(agent => (
                            <AgentCard key={agent.id} agent={agent} />
                        ))}
                    </div>

                    {/* Model Inventory */}
                    <div className="p-5 bg-slate-900/50 border border-white/5 rounded-2xl">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Approved Model Inventory</h3>
                        <div className="space-y-2">
                            {ANALYSIS_MODELS.map(m => (
                                <div key={m} className="flex justify-between items-center text-[10px] p-2 bg-black/30 rounded border border-white/5">
                                    <span className="text-slate-400">{m}</span>
                                    <span className="text-green-500/50 uppercase">Verified</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Thought Stream */}
                <div className="lg:col-span-2 flex flex-col space-y-4">
                    <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center">
                        <Activity className="w-3 h-3 mr-2" />
                        Neural Thought Stream
                    </h2>
                    <div 
                        ref={thoughtRef}
                        className="flex-grow bg-slate-900/30 border border-white/5 rounded-2xl p-4 overflow-y-auto space-y-3 font-mono text-xs custom-scrollbar max-h-[600px]"
                    >
                        {thoughts.map((thought) => (
                            <div key={thought.id} className="flex items-start space-x-3 group border-l-2 border-slate-800 hover:border-red-500/50 pl-4 py-1 transition-all">
                                <span className="text-[10px] text-slate-600 mt-0.5">[{new Date(thought.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                                <span className="text-red-500 uppercase font-black text-[10px] min-w-[100px]">{thought.agentId}:</span>
                                <span className="text-slate-300 group-hover:text-white transition-colors">{thought.message}</span>
                            </div>
                        ))}
                    </div>

                    {/* Action Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ActionButton 
                            label="Force Market Intelligence Scan" 
                            description="Deep search scan of global sentiment"
                            icon={<Search className="w-5 h-5" />}
                        />
                        <ActionButton 
                            label="Flush Neural Memory Cache" 
                            description="Clear short-term learned strategies"
                            icon={<RefreshCcw className="w-5 h-5" />}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const VitalCard = ({ label, value, icon, color }: { label: string, value: any, icon: any, color: string }) => (
    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
            {icon}
        </div>
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
        <div className="mt-2 h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full bg-slate-700`}
            />
        </div>
    </div>
);

const AgentCard = ({ agent }: { agent: AgentStatus }) => {
    const isThinking = agent.status === 'thinking';
    
    return (
        <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center space-x-4 relative overflow-hidden group">
            <div className={`p-3 rounded-xl border transition-all ${
                isThinking ? 'bg-orange-500/10 border-orange-500 animate-pulse' : 'bg-slate-800 border-white/5 group-hover:border-white/10'
            }`}>
                {isThinking ? <RefreshCcw className="w-5 h-5 text-orange-500 animate-spin" /> : agent.icon}
            </div>
            <div className="flex-grow">
                <div className="flex justify-between items-center mb-0.5">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">{agent.name}</h3>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        isThinking ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                        {agent.status}
                    </span>
                </div>
                <p className="text-[10px] text-slate-500">{agent.description}</p>
                <div className="mt-2 text-[9px] text-slate-400 font-mono flex items-center">
                    <span className="opacity-40 mr-2">CORE:</span>
                    {agent.model}
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ label, description, icon }: { label: string, description: string, icon: any }) => (
    <button className="text-left bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/20 p-4 rounded-2xl flex items-center space-x-4 transition-all group">
        <div className="p-3 bg-slate-800 rounded-xl group-hover:bg-red-600/20 group-hover:text-red-500 transition-all">
            {icon}
        </div>
        <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{label}</h4>
            <p className="text-[10px] text-slate-500">{description}</p>
        </div>
    </button>
);

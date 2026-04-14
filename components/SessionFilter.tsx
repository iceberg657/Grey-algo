import React, { useState, useEffect } from 'react';
import { fetchSessionAnalysis } from '../services/sessionService';
import { 
  Sun, 
  Moon, 
  CloudSun, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Activity, 
  DollarSign, 
  Briefcase 
} from 'lucide-react';

const SESSIONS = [
  { name: 'Asian', icon: Sun },
  { name: 'London', icon: CloudSun },
  { name: 'New York', icon: Moon }
];

const getAutoSession = () => {
  const hour = new Date().getUTCHours();
  if (hour >= 23 || hour < 8) return 'Asian';
  if (hour >= 8 && hour < 16) return 'London';
  return 'New York';
};

export const SessionFilter: React.FC = () => {
  const [session, setSession] = useState(getAutoSession());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (targetSession: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSessionAnalysis(targetSession);
      setData(result);
    } catch (err) {
      setError('Failed to fetch analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(session);
    const interval = setInterval(() => fetchData(session), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <div className="p-6 bg-zinc-900/60 dark:bg-zinc-900/40 backdrop-blur-xl text-zinc-100 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-zinc-700/50 dark:border-zinc-800/50">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Activity className="text-emerald-500" /> Session Market Analysis
      </h2>
      
      <div className="flex gap-3 mb-8">
        {SESSIONS.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.name}
              onClick={() => setSession(s.name)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all backdrop-blur-md border ${
                session === s.name 
                  ? 'bg-emerald-600/80 border-emerald-500/50 text-white shadow-lg shadow-emerald-900/20' 
                  : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700/50'
              }`}
            >
              <Icon size={18} /> {s.name}
            </button>
          );
        })}
      </div>

      {loading && <div className="text-zinc-500 animate-pulse">Analyzing market data...</div>}
      {error && <div className="text-red-400 flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}
      
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Economic Events */}
            <div className="bg-zinc-800/40 backdrop-blur-md p-5 rounded-xl border border-zinc-700/50 shadow-inner">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                <Briefcase size={20} /> Economic Events
              </h3>
              <ul className="space-y-3">
                {data.economic_events?.map((e: any, i: number) => (
                  <li key={i} className="text-sm border-b border-zinc-700 pb-2 last:border-0">
                    <span className="font-medium text-white">{e.event}</span>
                    <p className="text-zinc-400 text-xs mt-1">{e.significance} ({e.impact})</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sentiment */}
            <div className="bg-zinc-800/40 backdrop-blur-md p-5 rounded-xl border border-zinc-700/50 shadow-inner">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                <Activity size={20} /> Market Sentiment
              </h3>
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><TrendingUp size={14} className="text-emerald-500" /> Bullish</p>
                  <ul className="text-sm text-zinc-300">{data.market_sentiment?.bullish?.map((p: string) => <li key={p}>{p}</li>)}</ul>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><TrendingDown size={14} className="text-rose-500" /> Bearish</p>
                  <ul className="text-sm text-zinc-300">{data.market_sentiment?.bearish?.map((p: string) => <li key={p}>{p}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Assets */}
          <div className="bg-zinc-800/40 backdrop-blur-md p-5 rounded-xl border border-zinc-700/50 shadow-inner">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
              <DollarSign size={20} /> Suggested Assets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.suggested_trading_assets?.map((a: any, i: number) => (
                <div key={i} className="bg-zinc-900/50 backdrop-blur-sm p-4 rounded-lg border border-zinc-700/50">
                  <p className="font-bold text-white">{a.asset}</p>
                  <p className="text-zinc-400 text-xs mt-1">{a.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

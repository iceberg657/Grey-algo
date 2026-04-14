
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Send, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Shield, 
  BarChart3,
  Copy,
  CheckCircle2,
  AlertCircle,
  Activity,
  Lock,
  Clock
} from 'lucide-react';
import { generateSniperLiveSignal } from '../services/geminiService';
import { TradingStyle, SignalData, UserMetadata } from '../types';
import { Loader } from './Loader';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface SniperLiveTradeProps {
  onBack: () => void;
  userMetadata: UserMetadata | null;
}

export const SniperLiveTrade: React.FC<SniperLiveTradeProps> = ({ onBack, userMetadata }) => {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState<TradingStyle>('scalping(1 to 15mins)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<any>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const accessStatus = 'granted'; // Temporary free access for testing

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [signal, isAnalyzing]);

  const handleRequestAccess = async () => {
    if (!userMetadata?.uid) return;
    const path = `users/${userMetadata.uid}`;
    try {
      const userRef = doc(db, 'users', userMetadata.uid);
      await updateDoc(userRef, {
        'access.sniperLiveTrade': 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const fetchLivePrice = async (asset: string) => {
    setIsFetchingPrice(true);
    try {
      // Map common names to Deriv symbols
      const normalized = asset.toUpperCase().replace('/', '').replace(' ', '');
      let symbol = normalized;
      
      if (normalized === 'GOLD' || normalized === 'XAUUSD') symbol = 'frxXAUUSD';
      else if (normalized === 'EURUSD') symbol = 'frxEURUSD';
      else if (normalized === 'GBPUSD') symbol = 'frxGBPUSD';
      else if (normalized === 'USDJPY') symbol = 'frxUSDJPY';
      else if (normalized === 'AUDUSD') symbol = 'frxAUDUSD';
      else if (normalized === 'USDCAD') symbol = 'frxUSDCAD';
      else if (normalized === 'USDCHF') symbol = 'frxUSDCHF';
      else if (normalized === 'NZDUSD') symbol = 'frxNZDUSD';
      else if (normalized.length === 6 && !normalized.startsWith('FRX')) symbol = 'frx' + normalized;
      else if (normalized.startsWith('FRX')) symbol = 'frx' + normalized.substring(3);
      
      // Grab token from user settings first, then fallback to Vite env to bypass Vercel serverless env issues
      let clientToken = '';
      try {
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed.derivApiToken) clientToken = parsed.derivApiToken;
        }
      } catch (e) {
        console.warn('Could not read user settings for Deriv token');
      }
      
      if (!clientToken) {
        clientToken = import.meta.env.VITE_DERIV_API_TOKEN || import.meta.env.VITE_DERIV_TOKEN || '';
      }

      const url = `/api/deriv/quote?symbol=${symbol}${clientToken ? `&token=${clientToken}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setLivePrice(data);
      return data;
    } catch (err: any) {
      console.error('Deriv Price Fetch Error:', err);
      return null;
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setSignal(null);

    try {
      // 1. Extract asset from query (simple heuristic)
      const assetMatch = query.match(/(gold|eurusd|gbpusd|usdjpy|btc|eth|xauusd)/i);
      const asset = assetMatch ? assetMatch[0] : 'EURUSD';

      // 2. Fetch live price from Deriv
      const derivData = await fetchLivePrice(asset);

      // 3. Generate signal using Gemini 3.1 Flash Lite
      const result = await generateSniperLiveSignal(query, style, derivData || { symbol: asset, note: 'Live data unavailable' });
      setSignal(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate setup. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const tradingStyles: { id: TradingStyle; label: string }[] = [
    { id: 'scalping(1 to 15mins)', label: 'Scalp' },
    { id: 'day trading(1 to 2hrs)', label: 'Day' },
    { id: 'swing trading', label: 'Swing' }
  ];

  const renderLocked = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
        <Lock className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter italic">Sniper Access Restricted</h2>
      <p className="text-slate-400 max-w-md mb-10 text-sm leading-relaxed">
        The Sniper Live Trade engine requires high-level clearance. 
        Request authorization to access institutional-grade setups powered by Gemini 3.1 Flash Lite.
      </p>
      <button 
        onClick={handleRequestAccess}
        className="px-12 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
      >
        Request Clearance
      </button>
    </div>
  );

  const renderPending = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-24 h-24 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center text-amber-500 mb-8 border border-amber-500/20 animate-pulse">
        <Clock className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter italic">Clearance Pending</h2>
      <p className="text-slate-400 max-w-md mb-10 text-sm leading-relaxed">
        Your request for Sniper access is currently being processed by the Neural Oversight team. 
        Neural links will be established once verification is complete.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Target className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Sniper Live Trade
              </h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">Live Market Feed</span>
              </div>
            </div>
          </div>

          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {accessStatus === 'locked' ? renderLocked() : accessStatus === 'pending' ? renderPending() : (
          <>
            {/* Style Selector */}
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block ml-1">
                Execution Style
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50">
                {tradingStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      style === s.id 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Area */}
            <div className="space-y-6 min-h-[400px]">
              <AnimatePresence mode="wait">
                {!signal && !isAnalyzing && !error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
                      <Activity className="w-10 h-10 text-slate-700" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-400 mb-2">Ready for Analysis</h2>
                    <p className="text-slate-500 text-sm max-w-xs">
                      Enter an asset name or trade query below to receive a high-precision institutional setup.
                    </p>
                  </motion.div>
                )}

                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <Loader />
                    <p className="mt-6 text-sm font-medium text-emerald-500 animate-pulse">
                      {isFetchingPrice ? 'Fetching Live Deriv Quotes...' : 'Neural Network Processing...'}
                    </p>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-start gap-4"
                  >
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-red-400">System Anomaly</h3>
                      <p className="text-sm text-red-400/70 mt-1">{error}</p>
                    </div>
                  </motion.div>
                )}

                {signal && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Signal Card */}
                    <div className={`relative overflow-hidden rounded-[2.5rem] border p-8 backdrop-blur-xl ${
                      signal.signal === 'BUY' 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : signal.signal === 'SELL' 
                        ? 'bg-rose-500/5 border-rose-500/20' 
                        : 'bg-slate-500/5 border-slate-500/20'
                    }`}>
                      {/* Background Glow */}
                      <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 ${
                        signal.signal === 'BUY' ? 'bg-emerald-500' : signal.signal === 'SELL' ? 'bg-rose-500' : 'bg-slate-500'
                      }`} />

                      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-2xl ${
                            signal.signal === 'BUY' 
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' 
                              : signal.signal === 'SELL' 
                              ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' 
                              : 'bg-slate-500/20 border-slate-500/30 text-slate-500'
                          }`}>
                            {signal.signal === 'BUY' ? <TrendingUp className="w-8 h-8" /> : signal.signal === 'SELL' ? <TrendingDown className="w-8 h-8" /> : <Activity className="w-8 h-8" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                                signal.signal === 'BUY' ? 'text-emerald-500' : signal.signal === 'SELL' ? 'text-rose-500' : 'text-slate-500'
                              }`}>
                                {signal.signal} SIGNAL
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{style.split('(')[0]}</span>
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter italic uppercase">{signal.asset}</h2>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Confidence</span>
                          <div className="flex items-center gap-3">
                            <div className="text-3xl font-black italic tracking-tighter text-white">{signal.confidence}%</div>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${signal.confidence}%` }}
                                className={`h-full rounded-full ${signal.signal === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price Levels Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Entry */}
                        <div className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-3xl group hover:border-emerald-500/30 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Market Entry</span>
                            <button onClick={() => copyToClipboard(signal.entryPoints[0].toString(), 'Entry')} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                              {copied === 'Entry' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            </button>
                          </div>
                          <div className="text-2xl font-black tracking-tighter text-white">{signal.entryPoints[0]}</div>
                        </div>

                        {/* Stop Loss */}
                        <div className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-3xl group hover:border-rose-500/30 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Stop Loss</span>
                            <button onClick={() => copyToClipboard(signal.stopLoss.toString(), 'SL')} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                              {copied === 'SL' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            </button>
                          </div>
                          <div className="text-2xl font-black tracking-tighter text-rose-400">{signal.stopLoss}</div>
                        </div>

                        {/* Take Profit 1 */}
                        <div className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-3xl group hover:border-emerald-500/30 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Take Profit 1</span>
                            <button onClick={() => copyToClipboard(signal.takeProfits[0].toString(), 'TP1')} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                              {copied === 'TP1' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            </button>
                          </div>
                          <div className="text-2xl font-black tracking-tighter text-emerald-400">{signal.takeProfits[0]}</div>
                        </div>

                        {/* Take Profit 2 */}
                        <div className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-3xl group hover:border-emerald-500/30 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Take Profit 2</span>
                            <button onClick={() => copyToClipboard(signal.takeProfits[1].toString(), 'TP2')} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                              {copied === 'TP2' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            </button>
                          </div>
                          <div className="text-2xl font-black tracking-tighter text-emerald-400">{signal.takeProfits[1]}</div>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neural Reasoning</h3>
                        <div className="space-y-2">
                          {signal.reasoning.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-2xl border border-slate-800/30">
                              <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Zap className="w-3 h-3 text-emerald-500" />
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">{r}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-[2rem] p-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Institutional Checklist
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {signal.checklist?.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs text-slate-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div ref={scrollRef} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      {/* Input Area */}
      {accessStatus === 'granted' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleAnalyze}
              className="relative group"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter asset (e.g. 'Setup for Gold' or 'EURUSD analysis')"
                className="w-full bg-slate-900/80 border border-slate-800/50 rounded-2xl py-4 pl-6 pr-16 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600 backdrop-blur-xl"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={!query.trim() || isAnalyzing}
                className="absolute right-2 top-2 bottom-2 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-600 mt-3 font-medium uppercase tracking-widest">
              Powered by Gemini 3.1 Flash Lite & Deriv Live Feed
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Clock,
  Moon,
  Sun,
  Trash2,
  User,
  Bot
} from 'lucide-react';
import { generateSniperLiveSignal } from '../services/geminiService';
import { TradingStyle, SignalData, UserMetadata } from '../types';
import { Loader } from './Loader';
import { fetchMarketData } from '../services/twelveDataService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  query as firestoreQuery, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { ThemeToggleButton } from './ThemeToggleButton';

interface SniperMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  signal?: SignalData;
  timestamp: number;
}

interface SniperLiveTradeProps {
  onBack: () => void;
  userMetadata: UserMetadata | null;
  isLocked?: boolean;
}

export const SniperLiveTrade: React.FC<SniperLiveTradeProps> = ({ onBack, userMetadata, isLocked }) => {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState<TradingStyle>('scalping(1 to 15mins)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<SniperMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<any>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const accessStatus = isLocked ? 'locked' : (userMetadata?.access?.sniperLiveTrade || 'locked');

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAnalyzing]);

  useEffect(() => {
    if (!userMetadata?.uid) return;

    const path = `users/${userMetadata.uid}/sniper_messages`;
    const msgRef = collection(db, 'users', userMetadata.uid, 'sniper_messages');
    const q = firestoreQuery(msgRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SniperMessage[];
      setMessages(msgs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [userMetadata?.uid]);

  const handleClearChat = async () => {
    if (userMetadata?.uid) {
      const path = `users/${userMetadata.uid}/sniper_messages`;
      try {
        const msgRef = collection(db, 'users', userMetadata.uid, 'sniper_messages');
        const snapshot = await getDocs(msgRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        setShowDeleteConfirm(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setMessages([]);
      setShowDeleteConfirm(false);
    }
  };

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

  const getDerivSymbol = (asset: string) => {
    const normalized = asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Forex
    if (normalized.includes('GOLD') || normalized.includes('XAUUSD')) return 'frxXAUUSD';
    if (normalized.includes('EURUSD')) return 'frxEURUSD';
    if (normalized.includes('GBPUSD')) return 'frxGBPUSD';
    if (normalized.includes('USDJPY')) return 'frxUSDJPY';
    if (normalized.includes('AUDUSD')) return 'frxAUDUSD';
    if (normalized.includes('USDCAD')) return 'frxUSDCAD';
    if (normalized.includes('USDCHF')) return 'frxUSDCHF';
    if (normalized.includes('NZDUSD')) return 'frxNZDUSD';
    
    // Volatility Indices
    if (normalized === 'V10' || normalized === 'VOLATILITY10') return 'R_10';
    if (normalized === 'V25' || normalized === 'VOLATILITY25') return 'R_25';
    if (normalized === 'V50' || normalized === 'VOLATILITY50') return 'R_50';
    if (normalized === 'V75' || normalized === 'VOLATILITY75') return 'R_75';
    if (normalized === 'V100' || normalized === 'VOLATILITY100') return 'R_100';
    if (normalized === 'V101S') return '1HZ10V';
    if (normalized === 'V251S') return '1HZ25V';
    if (normalized === 'V501S') return '1HZ50V';
    if (normalized === 'V751S') return '1HZ75V';
    if (normalized === 'V1001S') return '1HZ100V';
    
    // Boom/Crash
    if (normalized === 'BOOM1000') return 'BOOM1000';
    if (normalized === 'BOOM500') return 'BOOM500';
    if (normalized === 'BOOM300') return 'BOOM300';
    if (normalized === 'CRASH1000') return 'CRASH1000';
    if (normalized === 'CRASH500') return 'CRASH500';
    if (normalized === 'CRASH300') return 'CRASH300';
    
    // Step
    if (normalized === 'STEP' || normalized === 'STEPINDEX') return 'STP';
    
    // Jump
    if (normalized.startsWith('JUMP')) {
      const num = normalized.replace('JUMP', '');
      return `JDM${num}`;
    }

    // Range Break
    if (normalized === 'RANGE100') return 'RB_100';
    if (normalized === 'RANGE200') return 'RB_200';

    // Forex fallback
    if (normalized.length === 6) return 'frx' + normalized;
    
    return normalized;
  };

  const fetchLivePrice = async (asset: string) => {
    setIsFetchingPrice(true);
    try {
      const symbol = getDerivSymbol(asset);
      
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

      const url = `/api/derivData?symbol=${symbol}${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setLivePrice(data);
      return data;
    } catch (err: any) {
      console.error('Deriv Price Fetch Error:', err);
      throw new Error(`Deriv API Error: ${err.message}`);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentQuery = query.trim();
    if (!currentQuery || isAnalyzing) return;

    setQuery('');
    setIsAnalyzing(true);
    setError(null);

    // Add user message
    const userMsgId = Date.now().toString();
    const userMsg: SniperMessage = {
      id: userMsgId,
      type: 'user',
      content: currentQuery,
      timestamp: Date.now()
    };
    
    if (userMetadata?.uid) {
      const path = `users/${userMetadata.uid}/sniper_messages/${userMsgId}`;
      try {
        const msgRef = doc(db, 'users', userMetadata.uid, 'sniper_messages', userMsgId);
        await setDoc(msgRef, userMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setMessages(prev => [...prev, userMsg]);
    }

    try {
      // 1. Extract asset from query
      const assetMatch = currentQuery.match(/(gold|eurusd|gbpusd|usdjpy|btc|eth|xauusd|v75|v100|boom|crash|step|jump|range|usdchf|audusd|usdcad|nzdusd)/i);
      const asset = assetMatch ? assetMatch[0].toUpperCase() : 'EURUSD';

      // 2. Determine required timeframes based on style
      const getTimeframesForStyle = (s: TradingStyle) => {
        if (s.includes('scalping')) return ['1min', '5min', '15min'];
        if (s.includes('day trading')) return ['15min', '30min', '1h', '4h'];
        if (s.includes('swing')) return ['4h', '1day', '1week'];
        return ['15min'];
      };

      const tfs = getTimeframesForStyle(style);

      // 3. Fetch live price and multi-timeframe data in parallel
      const twelveDataPromises = tfs.map(tf => fetchMarketData(asset, tf).catch(e => {
        console.warn(`Twelve Data fetch failed for ${tf}:`, e);
        return null;
      }));

      const [derivData, ...twelveDataResults] = await Promise.all([
        fetchLivePrice(asset),
        ...twelveDataPromises
      ]);
      
      if (!derivData) {
        throw new Error('Failed to fetch live market data. Please ensure your Deriv API Token is correct in Settings.');
      }

      const twelveDataMap = tfs.reduce((acc, tf, i) => {
        if (twelveDataResults[i]) acc[tf] = twelveDataResults[i];
        return acc;
      }, {} as Record<string, any>);

      // 4. Generate signal using Gemini 3.1 Flash Lite with full multi-timeframe confluence
      const result = await generateSniperLiveSignal(currentQuery, style, derivData, [], twelveDataMap);
      
      // Add AI message
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: SniperMessage = {
        id: aiMsgId,
        type: 'ai',
        content: `Neural analysis complete for ${result.asset}.`,
        signal: result,
        timestamp: Date.now()
      };
      
      if (userMetadata?.uid) {
        const path = `users/${userMetadata.uid}/sniper_messages/${aiMsgId}`;
        try {
          const msgRef = doc(db, 'users', userMetadata.uid, 'sniper_messages', aiMsgId);
          await setDoc(msgRef, aiMsg);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      } else {
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate setup. Please try again.');
      // Add error message to chat
      const errorMsgId = (Date.now() + 1).toString();
      const errorMsg: SniperMessage = {
        id: errorMsgId,
        type: 'ai',
        content: `System Anomaly: ${err.message || 'Neural link failed.'}`,
        timestamp: Date.now()
      };
      
      if (userMetadata?.uid) {
        const path = `users/${userMetadata.uid}/sniper_messages/${errorMsgId}`;
        try {
          const msgRef = doc(db, 'users', userMetadata.uid, 'sniper_messages', errorMsgId);
          await setDoc(msgRef, errorMsg);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      } else {
        setMessages(prev => [...prev, errorMsg]);
      }
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

  const SUPPORTED_ASSETS = [
    { category: 'Forex', items: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'XAUUSD (Gold)'] },
    { category: 'Volatility Indices', items: ['V10', 'V25', 'V50', 'V75', 'V100', 'V10 (1s)', 'V25 (1s)', 'V50 (1s)', 'V75 (1s)', 'V100 (1s)'] },
    { category: 'Boom/Crash', items: ['Boom 1000', 'Boom 500', 'Boom 300', 'Crash 1000', 'Crash 500', 'Crash 300'] },
    { category: 'Other', items: ['Step Index', 'Jump Indices (10-100)', 'Range Break 100/200'] }
  ];

  const renderLocked = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
        <Lock className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter italic">Sniper Access Restricted</h2>
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
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter italic">Clearance Pending</h2>
      <p className="text-slate-400 max-w-md mb-10 text-sm leading-relaxed">
        Your request for Sniper access is currently being processed by the Neural Oversight team. 
        Neural links will be established once verification is complete.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-slate-200 font-sans selection:bg-emerald-500/30 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 px-4 py-4 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Target className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Sniper Live Trade
              </h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500/70">Live Market Feed</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <div className="relative">
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 10 }}
                      className="absolute right-full mr-2 top-0 bottom-0 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 shadow-xl z-10 whitespace-nowrap"
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clear History?</span>
                      <button 
                        onClick={handleClearChat}
                        className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className={`p-2 rounded-xl transition-colors group ${showDeleteConfirm ? 'bg-rose-100 dark:bg-rose-500/20' : 'hover:bg-rose-100 dark:hover:bg-rose-500/10'}`}
                  title="Clear Neural History"
                >
                  <Trash2 className={`w-5 h-5 transition-colors ${showDeleteConfirm ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-rose-500'}`} />
                </button>
              </div>
            )}
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {accessStatus === 'locked' ? renderLocked() : accessStatus === 'pending' ? renderPending() : (
          <>
            {/* Style Selector */}
            <div className="mb-8 sticky top-20 z-40 bg-slate-50/80 dark:bg-[#020617]/80 backdrop-blur-md py-2 transition-colors duration-300">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Execution Style
                </label>
                <button 
                  onClick={() => setShowAssets(!showAssets)}
                  className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <Activity className="w-3 h-3" />
                  {showAssets ? 'Hide Assets' : 'Supported Assets'}
                </button>
              </div>
              
              <AnimatePresence>
                {showAssets && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {SUPPORTED_ASSETS.map((cat) => (
                        <div key={cat.category}>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{cat.category}</h4>
                          <ul className="space-y-1">
                            {cat.items.map((item) => (
                              <li key={item} className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-sm">
                {tradingStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      style === s.id 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Area */}
            <div className="space-y-8 min-h-[400px]">
              {messages.length === 0 && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
                    <Activity className="w-10 h-10 text-slate-700" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-400 mb-2">Neural Link Ready</h2>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Establish a neural connection by entering an asset name or trade query below.
                  </p>
                </motion.div>
              )}

              <div className="space-y-10">
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.type === 'user' ? (
                      <div className="flex items-start gap-3 max-w-[85%]">
                        <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl rounded-tr-none shadow-lg shadow-emerald-500/10 text-sm font-medium">
                          {msg.content}
                        </div>
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
                          <User className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-4 w-full">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 flex-shrink-0">
                            <Bot className="w-4 h-4 text-emerald-500" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Response</span>
                        </div>
                        
                        {msg.signal ? (
                          <div className="w-full">
                            {/* Signal Card */}
                            <div className={`relative overflow-hidden rounded-[2.5rem] border p-8 backdrop-blur-xl ${
                              msg.signal.signal === 'BUY' 
                                ? 'bg-emerald-500/5 border-emerald-500/20' 
                                : msg.signal.signal === 'SELL' 
                                ? 'bg-rose-500/5 border-rose-500/20' 
                                : 'bg-slate-500/5 border-slate-500/20'
                            }`}>
                              {/* Background Glow */}
                              <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 ${
                                msg.signal.signal === 'BUY' ? 'bg-emerald-500' : msg.signal.signal === 'SELL' ? 'bg-rose-500' : 'bg-slate-500'
                              }`} />

                              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-2xl ${
                                    msg.signal.signal === 'BUY' 
                                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' 
                                      : msg.signal.signal === 'SELL' 
                                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' 
                                      : 'bg-slate-500/20 border-slate-500/30 text-slate-500'
                                  }`}>
                                    {msg.signal.signal === 'BUY' ? <TrendingUp className="w-8 h-8" /> : msg.signal.signal === 'SELL' ? <TrendingDown className="w-8 h-8" /> : <Activity className="w-8 h-8" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                                        msg.signal.signal === 'BUY' ? 'text-emerald-500' : msg.signal.signal === 'SELL' ? 'text-rose-500' : 'text-slate-500'
                                      }`}>
                                        {msg.signal.signal} SIGNAL
                                      </span>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{msg.signal.timeframe || 'M5'}</span>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tighter italic uppercase">{msg.signal.asset}</h2>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Confidence</span>
                                  <div className="flex items-center gap-3">
                                    <div className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">{msg.signal.confidence}%</div>
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${msg.signal.confidence}%` }}
                                        className={`h-full rounded-full ${msg.signal.signal === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Price Levels Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {/* Entry */}
                                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 rounded-3xl group hover:border-emerald-500/30 transition-colors relative overflow-hidden">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sniper Entry</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.entryPoints[0].toString(), `Entry-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `Entry-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">{msg.signal.entryPoints[0]}</div>
                                  {msg.signal.triggerConditions && (
                                    <div className="mt-2 text-[9px] font-bold text-emerald-500/70 uppercase tracking-tighter flex items-center gap-1">
                                      <Zap className="w-2.5 h-2.5" />
                                      {msg.signal.triggerConditions.entryTriggerCandle || 'Neural Trigger Active'}
                                    </div>
                                  )}
                                </div>

                                {/* Stop Loss */}
                                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 rounded-3xl group hover:border-rose-500/30 transition-colors">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Stop Loss</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.stopLoss.toString(), `SL-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `SL-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className="text-2xl font-black tracking-tighter text-rose-500 dark:text-rose-400">{msg.signal.stopLoss}</div>
                                </div>

                                {/* Take Profit 1 */}
                                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 rounded-3xl group hover:border-emerald-500/30 transition-colors">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Take Profit 1</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.takeProfits[0].toString(), `TP1-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `TP1-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className="text-2xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">{msg.signal.takeProfits[0]}</div>
                                </div>

                                {/* Take Profit 2 */}
                                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 rounded-3xl group hover:border-emerald-500/30 transition-colors">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Take Profit 2</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.takeProfits[1].toString(), `TP2-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `TP2-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className="text-2xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">{msg.signal.takeProfits[1]}</div>
                                </div>
                              </div>

                              {/* Reasoning */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neural Reasoning</h3>
                                  {msg.signal.triggerConditions?.retestLogic && (
                                    <div className="flex gap-2">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {msg.signal.triggerConditions.retestLogic}
                                      </span>
                                      <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
                                        STDDEV Active
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {msg.signal.reasoning.map((r, i) => (
                                    <div key={i} className="flex items-start gap-3 bg-white/30 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
                                      <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Zap className="w-3 h-3 text-emerald-500" />
                                      </div>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{r}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Checklist */}
                            <div className="mt-4 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[2rem] p-6">
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Institutional Checklist
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {msg.signal.checklist?.map((item, i) => (
                                  <div key={i} className="flex items-center gap-3 text-xs text-slate-500">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 px-6 py-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-start gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 flex-shrink-0">
                      <Bot className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Network Active</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 px-8 py-6 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-4">
                    <Loader />
                    <span className="text-xs font-medium text-emerald-500 animate-pulse">
                      {isFetchingPrice ? 'Fetching Live Deriv Quotes...' : 'Neural Network Processing...'}
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </main>

      {/* Input Area */}
      {accessStatus === 'granted' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#020617] dark:via-[#020617] to-transparent pt-10 pb-6 px-4 transition-colors duration-300">
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
                className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 rounded-2xl py-4 pl-6 pr-16 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 backdrop-blur-xl shadow-xl dark:shadow-none text-slate-900 dark:text-slate-100"
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

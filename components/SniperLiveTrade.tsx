
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
  Bot,
  ChevronDown
} from 'lucide-react';
import { QuantEnginePipeline, MarketSeries, MarketBar } from '../utils/advancedExecutionEngines';
import { generateSniperLiveSignal, generateAntigravityResearch, generateMacroContext } from '../services/geminiService';
import { TradingStyle, SignalData, UserMetadata, UserSettings } from '../types';
import { Loader } from './Loader';
import { TimingCalibrationWidget } from './TimingCalibrationWidget';
import { CTraderAdvancedData } from './CTraderAdvancedData';
import { saveAnalysis } from '../services/historyService';
import { generateLessonFromTradeLog, getLearnedStrategies } from '../services/learningService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { analyzeSMC } from '../utils/quantEngine';
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
import { AgentAnalysisLoader } from './AgentAnalysisLoader';
import { ThemeToggleButton } from './ThemeToggleButton';
import { getDailyMarketRegime, DailyRegime } from '../services/pilotService';
import { LiquidityHeatmapChart } from './LiquidityHeatmapChart';

const AntigravityVerdictDisplay: React.FC<{ insight: string }> = ({ insight }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let summary = '';
  let fullContext = '';
  
  const summaryHeaderIndex = insight.indexOf('### EXECUTIVE SUMMARY');
  const dividerIndex = insight.indexOf('---');
  
  if (dividerIndex !== -1) {
    if (summaryHeaderIndex !== -1) {
      summary = insight.substring(summaryHeaderIndex + '### EXECUTIVE SUMMARY'.length, dividerIndex).trim();
    } else {
      summary = insight.substring(0, dividerIndex).trim();
    }
    fullContext = insight.substring(dividerIndex + 3).trim();
  } else {
    if (summaryHeaderIndex !== -1) {
      const parsed = insight.substring(summaryHeaderIndex + '### EXECUTIVE SUMMARY'.length).trim();
      const nextSectionIndex = parsed.indexOf('###');
      if (nextSectionIndex !== -1) {
        summary = parsed.substring(0, nextSectionIndex).trim();
        fullContext = parsed.substring(nextSectionIndex).trim();
      } else {
        summary = parsed;
      }
    } else {
      summary = insight;
    }
  }

  return (
    <div className="mt-4 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 rounded-[2rem] p-6">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-2">
        <Bot className="w-3.5 h-3.5" /> Antigravity QuantConnect Verdict
      </h3>
      
      {/* Dynamic Summary Panel */}
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap bg-violet-500/10 dark:bg-violet-500/20 p-4 rounded-2xl border border-violet-500/10">
        {summary}
      </div>

      {fullContext && (
        <div className="mt-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:opacity-80 transition cursor-pointer"
          >
            {isExpanded ? 'Hide Full Quantitative Rationale' : 'View Full Quantitative Rationale'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-violet-500/10 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed space-y-2">
                  {fullContext}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

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
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | undefined>(undefined);
  const [dailyRegime, setDailyRegime] = useState<DailyRegime | null>(null);
  
  // Get last analyzed asset
  const lastAnalyzedAsset = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].signal?.asset) {
            return messages[i].signal.asset.replace('/', '').replace('-', '');
        }
    }
    return null;
  }, [messages]);

    useEffect(() => {
        // Initialize Daily Market Regime Tracking (AI Pilot)
        const initRegime = async () => {
            try {
                const regime = await getDailyMarketRegime();
                setDailyRegime(regime);
            } catch (e) {
                console.warn("[SniperLiveTrade] Failed to establish AI Pilot link.");
            }
        };
        initRegime();

        const stored = localStorage.getItem('greyquant_user_settings');
        if (stored) {
            try {
                setUserSettings(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user settings", e);
            }
        }
    }, []);

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
    
    // 0. Crypto
    if (normalized === 'BTC' || normalized === 'BTCUSD' || normalized === 'CRYBTCUSD') return 'cryBTCUSD';
    if (normalized === 'ETH' || normalized === 'ETHUSD' || normalized === 'CRYETHUSD') return 'cryETHUSD';
    if (normalized === 'LTC' || normalized === 'LTCUSD' || normalized === 'CRYLTCUSD') return 'cryLTCUSD';

    // 1. Global Indices
    if (normalized === 'US30' || normalized === 'DOWJONES' || normalized === 'OTCUS30' || normalized === 'OTCDJI') return 'OTC_DJI';
    if (normalized === 'US100' || normalized === 'NASDAQ' || normalized === 'NDX' || normalized === 'OTCNDX') return 'OTC_NDX';
    if (normalized === 'US500' || normalized === 'SP500' || normalized === 'SPC' || normalized === 'OTCSPC') return 'OTC_SPC';
    if (normalized === 'UK100' || normalized === 'FTSE' || normalized === 'OTCFTSE') return 'OTC_FTSE';
    if (normalized === 'GERMANY40' || normalized === 'DAX' || normalized === 'OTCDAX' || normalized === 'OTCGDAXI') return 'OTC_GDAXI';
    if (normalized === 'FRANCE40' || normalized === 'CAC' || normalized === 'OTCCAC' || normalized === 'OTCFCHI') return 'OTC_FCHI';
    if (normalized === 'JAPAN225' || normalized === 'NIKKEI' || normalized === 'N225' || normalized === 'OTCN225') return 'OTC_N225';
    if (normalized === 'AUSTRALIA200' || normalized === 'AS51' || normalized === 'OTCAS51') return 'OTC_AS51';

    // 2. Forex
    if (normalized.includes('GOLD') || normalized.includes('XAUUSD')) return 'frxXAUUSD';
    if (normalized.includes('SILVER') || normalized.includes('XAGUSD')) return 'frxXAGUSD';
    if (normalized.includes('PLATINUM') || normalized.includes('XPTUSD')) return 'frxXPTUSD';
    if (normalized.includes('PALLADIUM') || normalized.includes('XPDUSD')) return 'frxXPDUSD';
    if (normalized.includes('BRENT') || normalized.includes('XBRUSD')) return 'frxXBRUSD';
    if (normalized.includes('WTI') || normalized.includes('XTIUSD')) return 'frxXTIUSD';
    if (normalized.includes('EURUSD')) return 'frxEURUSD';
    if (normalized.includes('GBPUSD')) return 'frxGBPUSD';
    if (normalized.includes('GBPJPY')) return 'frxGBPJPY';
    if (normalized.includes('EURGBP')) return 'frxEURGBP';
    if (normalized.includes('EURJPY')) return 'frxEURJPY';
    if (normalized.includes('GBPCHF')) return 'frxGBPCHF';
    if (normalized.includes('EURCHF')) return 'frxEURCHF';
    if (normalized.includes('AUDJPY')) return 'frxAUDJPY';
    if (normalized.includes('USDJPY')) return 'frxUSDJPY';
    if (normalized.includes('AUDUSD')) return 'frxAUDUSD';
    if (normalized.includes('USDCAD')) return 'frxUSDCAD';
    if (normalized.includes('USDCHF')) return 'frxUSDCHF';
    if (normalized.includes('NZDUSD')) return 'frxNZDUSD';
    
    // Volatility Indices (Robust Mapping)
    if (normalized.match(/V(?:OLATILITY)?101S/)) return '1HZ10V';
    if (normalized.match(/V(?:OLATILITY)?251S/)) return '1HZ25V';
    if (normalized.match(/V(?:OLATILITY)?501S/)) return '1HZ50V';
    if (normalized.match(/V(?:OLATILITY)?751S/)) return '1HZ75V';
    if (normalized.match(/V(?:OLATILITY)?1001S/)) return '1HZ100V';
    
    if (normalized === 'V10' || normalized === 'VOLATILITY10') return 'R_10';
    if (normalized === 'V25' || normalized === 'VOLATILITY25') return 'R_25';
    if (normalized === 'V50' || normalized === 'VOLATILITY50') return 'R_50';
    if (normalized === 'V75' || normalized === 'VOLATILITY75') return 'R_75';
    if (normalized === 'V100' || normalized === 'VOLATILITY100') return 'R_100';
    
    // Boom/Crash Robust Mapping
    if (normalized.includes('BOOM')) {
      const match = normalized.match(/BOOM(\d+)/);
      if (match) {
        const num = match[1];
        if (num === '150' || num === '300') return `BOOM${num}N`;
        return `BOOM${num}`;
      }
      return 'BOOM1000';
    }
    if (normalized.includes('CRASH')) {
      const match = normalized.match(/CRASH(\d+)/);
      if (match) {
        const num = match[1];
        if (num === '150' || num === '300') return `CRASH${num}N`;
        return `CRASH${num}`;
      }
      return 'CRASH1000';
    }
    
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
    if (normalized.length === 6) {
      return 'frx' + normalized;
    }
    
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

      // Define 3 timeframes based on trading style
      const getTimeframes = (style: string) => {
        if (style.includes('scalping')) {
            return { entry: 300, confirm: 900, htf: 3600 }; // 5m, 15m, 1h
        } else if (style.includes('swing')) {
            return { entry: 14400, confirm: 86400, htf: 604800 }; // 4h, 1d, 1w
        } else {
            return { entry: 900, confirm: 3600, htf: 14400 }; // Day: 15m, 1h, 4h
        }
      };

      const timeframes = getTimeframes(style);

      console.log(`[SniperLiveTrade] Fetching 3 timeframes for ${symbol} (1000 candles each)...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), 35000); // Increased timeout for larger fetches

      // Fetch all 3 timeframes simultaneously (1000 candles each as requested)
      const [entryRes, confirmRes, htfRes] = await Promise.all([
          fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.entry}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' }),
          fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.confirm}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' }),
          fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.htf}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' })
      ]);
      
      clearTimeout(timeoutId);

      const [entryData, confirmData, htfData] = await Promise.all([
          entryRes.json(),
          confirmRes.json(),
          htfRes.json()
      ]);

      if (entryData.error) throw new Error(entryData.error);
      
      console.log(`[SniperLiveTrade] Successfully fetched market data for ${symbol}`);
      // Parse out live price from the last candle
      const lastCandle = entryData.candles && entryData.candles.length > 0 ? entryData.candles[entryData.candles.length - 1] : null;
      
      if (!lastCandle) {
          throw new Error("No market data received from Deriv API.");
      }

      // Staleness Detection (Max 1 hour for indices, 15m for others)
      const nowSeconds = Math.floor(Date.now() / 1000);
      const candleAge = nowSeconds - lastCandle.epoch;
      const isMajorAsset = ['OTC_DJI', 'OTC_NDX', 'OTC_SPC', 'OTC_FTSE', 'frxXAUUSD', 'frxEURUSD', 'frxGBPUSD', 'cryBTCUSD', 'cryETHUSD'].includes(symbol);
      const maxAge = isMajorAsset ? 3600 : 900; 

      if (candleAge > maxAge) {
          const ageMinutes = Math.floor(candleAge / 60);
          console.warn(`[SniperLiveTrade] STALE DATA DETECTED: Price is ${ageMinutes}m old.`);
          // IMPORTANT: Do not throw an error here. Markets (especially indices) close for weekends and holidays.
          // We still want the AI to be able to analyze the last 300 candles.
          entryData.isMarketClosed = true;
      }

      if (lastCandle) {
          entryData.price = lastCandle.close;
          entryData.bid = lastCandle.close;
          entryData.ask = lastCandle.close;
      }
      
      // Attach all 3 timeframes to the data
      let ctraderTicks = null;
      try {
          const ctToken = localStorage.getItem('ctrader_access_token');
          const ctAccount = localStorage.getItem('ctrader_account_id');
          if (ctToken && ctAccount) {
              const ctAsset = asset.replace('/', '').replace('-', '');
              console.log(`[SniperLiveTrade] Fetching cTrader high-density ticks for ${ctAsset}...`);
              // Fetch last 1 hour of ticks
              const ctRes = await fetch(`/api/ctrader/ticks?symbol=${ctAsset}&type=BID&accountId=${ctAccount}&environment=live`, {
                  headers: { 'Authorization': `Bearer ${ctToken}` }
              });
              if (ctRes.ok) {
                  const ctData = await ctRes.json();
                  ctraderTicks = ctData.ticks;
                  console.log(`[SniperLiveTrade] Successfully pulled ${ctraderTicks?.length || 0} ticks from cTrader`);
              }
          }
      } catch (e) {
          console.warn('[SniperLiveTrade] Could not fetch cTrader tick data:', e);
      }

      const combinedData = {
          ...entryData,
          ctraderTicks,
          multiTimeframe: {
              entry: {
                  granularity: timeframes.entry,
                  candles: entryData.candles || []
              },
              confirm: {
                  granularity: timeframes.confirm,
                  candles: confirmData.candles || []
              },
              htf: {
                  granularity: timeframes.htf,
                  candles: htfData.candles || []
              }
          }
      };

      setLivePrice(combinedData);
      return combinedData;
    } catch (err: any) {
      console.error('Deriv Price Fetch Error:', err);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted');
      throw new Error(isTimeout ? `Deriv API Timeout: Failed to fetch live data for ${asset} within 25s.` : `Deriv API Error: ${err.message}`);
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
      const assetMatch = currentQuery.match(/(otc_dji|otc_ndx|otc_spc|otc_ftse|otc_gdaxi|otc_fchi|otc_n225|otc_as51|us30|dow\s?jones|wall\s?street|us100|nasdaq|ndx|us500|s&p500|sp500|spc|uk100|ftse|germany40|dax|france40|cac|japan225|nikkei|n225|australia200|as51|gold|silver|platinum|palladium|brent|wti|eurusd|gbpusd|gbpjpy|usdjpy|eurgbp|eurjpy|gbpchf|eurchf|audjpy|nzdjpy|cadjpy|chfjpy|btc(?:usd)?|eth(?:usd)?|ltc(?:usd)?|xauusd|xagusd|xptusd|xpdusd|xbrusd|xtiusd|v(?:olatility)?\s?\d{1,3}(?:\s?1[sS])?|boom\s?\d{1,4}|crash\s?\d{1,4}|step|jump\s?\d{1,3}|range|usdchf|audusd|usdcad|nzdusd)/i);
      const asset = assetMatch ? assetMatch[0].toUpperCase().replace(/\s+/g, '') : null;

      if (!asset) {
        const aiMsgId = (Date.now() + 1).toString();
        const aiMsg: SniperMessage = {
          id: aiMsgId,
          type: 'ai',
          content: `Asset not available, coming soon.`,
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
        setIsAnalyzing(false);
        return;
      }

      // 2. Fetch live price from Deriv API and perform analysis with minimum delay
      const [derivData] = await Promise.all([
        fetchLivePrice(asset),
        new Promise(resolve => setTimeout(resolve, 12000)) // Minimum 12s "thinking" time
      ]);
      
      if (!derivData) {
        throw new Error(`Failed to fetch live market data for ${asset}. Ensure your Deriv API Token is correct.`);
      }

      // 3. Generate signal using Gemini 3.1 Flash Lite with Institutional SMC logic
      const quantData = derivData.candles
        ? analyzeSMC(
            derivData.candles,
            derivData.multiTimeframe?.confirm?.candles,
            derivData.multiTimeframe?.htf?.candles,
            asset
          )
        : null;
        
      if (quantData && derivData.ctraderTicks) {
          quantData.ctraderTicks = derivData.ctraderTicks;
      }
      console.log(`[SniperLiveTrade] SMC Quant Engine Results:`, quantData);

      let advancedQuantSignal = null;
      try {
          if (derivData.candles && Array.isArray(derivData.candles)) {
              const pipeline = new QuantEnginePipeline();
              const mSeries: MarketSeries = {
                  symbol: asset,
                  bars: derivData.candles.map((c: any) => ({
                      open: c.open, high: c.high, low: c.low, close: c.close, volume: 1, timestamp: new Date(c.epoch * 1000)
                  }))
              };
              
              const isForex = !['US30', 'NAS100', 'SPX500', 'CRASH', 'BOOM', 'OTC_'].some(s => asset.toUpperCase().includes(s));
              const assetClass = isForex ? 'FOREX' : 'INDICES';
              const granularity = derivData.multiTimeframe?.entry?.granularity || 900;
              
              // We are operating in a single asset context, so we must use regime/momentum models
              // rather than passing the same asset multiple times to spread/arbitrage models.
              const strategies: ('SINGLE_ASSET_REGIME' | 'SINGLE_ASSET_MOMENTUM')[] = ['SINGLE_ASSET_REGIME', 'SINGLE_ASSET_MOMENTUM'];
                  
              const signals = [];
              for (const strategy of strategies) {
                  try {
                      // Process using single asset strategies
                      const sig = pipeline.processLiveExecution(
                          strategy as any, mSeries, mSeries, mSeries,
                          granularity / 60, // period parameter if applicable
                          userSettings?.autotrade?.maxRiskPerTrade || 10000
                      );
                      if (sig && sig.signal !== 'NEUTRAL') {
                          signals.push({ strategy, ...sig });
                      }
                  } catch (e) {
                      console.warn(`Quant execution failed for ${strategy}:`, e);
                  }
              }

              // Pick the signal with the highest score
              if (signals.length > 0) {
                  signals.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
                  advancedQuantSignal = signals[0];
                  console.log(`[SniperLiveTrade] Selected Advanced Signal from ${advancedQuantSignal.strategy}:`, advancedQuantSignal);
              }
          }
      } catch (e) {
          console.error("Advanced Quant Engine Error:", e);
      }

      // RPD Optimization & Sniper Mode Filter (ALGORITHMIC VETO): Intercept and reject highly probable fakeouts locally before AI API call
      let result: SignalData | null = null;
      
      const isSniperMode = userSettings?.tradeMode === 'Sniper';
      let isVetoed = false;
      let vetoReason = '';

      if (quantData) {
          if (isSniperMode) {
              // Strict filters for Sniper Mode
              if (quantData.weightedScore.totalScore < 79) {
                  isVetoed = true;
                  vetoReason = `Sniper Mode Active: Confidence Score (${quantData.weightedScore.totalScore}) is below the strict 79 threshold for A+ setups.`;
              } else if (quantData.quantMath?.fakeoutProbability > 0.45) {
                  isVetoed = true;
                  vetoReason = `Sniper Mode Active: Fakeout Probability (${(quantData.quantMath.fakeoutProbability * 100).toFixed(0)}%) exceeds the maximum 45% risk tolerance.`;
              }
          } else {
              // Standard aggressive filter
              if (quantData.weightedScore.totalScore < 35 && quantData.quantMath?.fakeoutProbability > 0.8) {
                  isVetoed = true;
                  vetoReason = "System detected over 80% statistical probability of a trap/fakeout with extremely weak confidence.";
              }
          }
      } else if (isSniperMode) {
          isVetoed = true;
          vetoReason = "Sniper Mode Active: Quant Engine structural data was unavailable for verification.";
      }

      // MULTI-MODEL NEURAL SEQUENCE: Macro Context -> Flash Lite
      setMessages(prev => {
          const filtered = prev.filter(m => m.signal?.id !== 'loading');
          return [...filtered, {
              id: Date.now().toString() + '-ag-start',
              type: 'ai',
              content: `Fetching Learned Lessons & Running Long-Term Context Agent for ${asset}...`,
              signal: { id: 'loading', asset: asset, timeframe: 'M15', signal: 'NEUTRAL', entryPoints: [0], entryType: 'Market Execution', stopLoss: 0, takeProfits: [0, 0], confidence: 0, analysisBreakdown: [], formattedLotSize: '0.00', reasoning: [], checklist: [], candlestickPatterns: [], insight: '', grade: 'NO TRADE', timestamp: Date.now() } as SignalData
          }];
      });

      // 1. Fetch Learned Lessons & Macro Context Summary (Passing all 3 timeframes for combined analysis)
      const activeLearnedStrategies = await getLearnedStrategies();
      const macroContextSummary = await generateMacroContext(asset, derivData?.multiTimeframe || {});

      setMessages(prev => {
        const filtered = prev.filter(m => m.signal?.id !== 'loading');
        return [...filtered, {
            id: Date.now().toString() + '-ag-macro',
            type: 'ai',
            content: `Macro Context Analyzed.\n\n${macroContextSummary}\n\nInitiating structural engine...`,
            signal: { id: 'loading', asset: asset, timeframe: 'M15', signal: 'NEUTRAL', entryPoints: [0], entryType: 'Market Execution', stopLoss: 0, takeProfits: [0, 0], confidence: 0, analysisBreakdown: [], formattedLotSize: '0.00', reasoning: [], checklist: [], candlestickPatterns: [], insight: '', grade: 'NO TRADE', timestamp: Date.now() } as SignalData
        }];
      });

      // 2. Dispatch Antigravity Agent to pull QuantConnect strategies & run deep analysis
      setMessages(prev => {
          const filtered = prev.filter(m => m.signal?.id !== 'loading');
          return [...filtered, {
              id: Date.now().toString() + '-ag-deep-search',
              type: 'ai',
              content: `Dispatching Antigravity Agent to query QuantConnect algorithmic database & dynamically select strategy rules...`,
              signal: { id: 'loading', asset: asset, timeframe: 'M15', signal: 'NEUTRAL', entryPoints: [0], entryType: 'Market Execution', stopLoss: 0, takeProfits: [0, 0], confidence: 0, analysisBreakdown: [], formattedLotSize: '0.00', reasoning: [], checklist: [], candlestickPatterns: [], insight: '', grade: 'NO TRADE', timestamp: Date.now() } as SignalData
          }];
      });

      const antigravityVerdict = await generateAntigravityResearch(currentQuery, asset, quantData, undefined, macroContextSummary);

      setMessages(prev => {
          const filtered = prev.filter(m => m.signal?.id !== 'loading');
          return [...filtered, {
              id: Date.now().toString() + '-ag-compile',
              type: 'ai',
              content: `QuantConnect strategy pulled successfully!\n\nRunning high-speed compiler model (Gemini 3.5 Flash Lite) with temperature 1.0 to calibrate dynamic lot sizes, entries, and risk-to-reward boundaries...`,
              signal: { id: 'loading', asset: asset, timeframe: 'M15', signal: 'NEUTRAL', entryPoints: [0], entryType: 'Market Execution', stopLoss: 0, takeProfits: [0, 0], confidence: 0, analysisBreakdown: [], formattedLotSize: '0.00', reasoning: [], checklist: [], candlestickPatterns: [], insight: '', grade: 'NO TRADE', timestamp: Date.now() } as SignalData
          }];
      });

      // 3. Compile high-speed Sniper live signal (temperature = 1.0) incorporating the Antigravity QuantConnect research
      const finalSignal = await generateSniperLiveSignal(
        currentQuery, 
        style, 
        derivData, 
        activeLearnedStrategies, // Learned strategies
        quantData,
        advancedQuantSignal,
        userSettings,
        dailyRegime?.regime,
        antigravityVerdict // Pass real QuantConnect-aligned Antigravity research
      );

      result = {
          ...finalSignal,
          insight: antigravityVerdict // Display the full QuantConnect strategy details inside the UI
      };

      // 4. NEURAL ADVERSARIAL OVERRIDE (Hard Logic Veto) - SUSPENDED
      // const advVeto = quantData?.adversarialVeto;
      // if (advVeto?.vetoTriggered && advVeto?.adversarialConfidence > 60 && result.signal !== 'NEUTRAL') {
      //     console.log(`[SniperLiveTrade] NEURAL ADVERSARIAL VETO TRIGGERED: ${advVeto.vetoReasons.join(', ')}`);
      //     result = {
      //         ...result,
      //         signal: 'NEUTRAL',
      //         grade: 'TRAP/VETO',
      //         confidence: Math.min(result.confidence, 30),
      //         reasoning: [
      //             ...result.reasoning,
      //             "🛡️ NEURAL ADVERSARIAL OVERRIDE: Setup failed Permutation/Alpha stability tests.",
      //             ...advVeto.vetoReasons
      //         ],
      //         insight: `ADVERSARIAL VETO ENGAGED: The Quant Engine detected a "statistical ghost" or "information homogeneity" risk.\n\nREASONS: ${advVeto.vetoReasons.join(' | ')}\n\nAntigravity Researcher Note: ${antigravityVerdict.substring(0, 300)}...`
      //     };
      // }

      // 5. Apply Veto Logic to Final Signal (Original Veto) - SUSPENDED
      // if (isVetoed) {
      //     console.log(`[SniperLiveTrade] ALGORITHMIC VETO TRIGGERED: ${vetoReason}`);
      //     result = {
      //         ...result,
      //         signal: 'NEUTRAL',
      //         grade: 'NO TRADE',
      //         reasoning: [
      //             ...result.reasoning,
      //             "⚠️ ALGORITHMIC VETO: Quant Engine blocked execution.",
      //             vetoReason
      //         ],
      //         insight: `QUANT VETO: ${vetoReason}\n\nANTIGRAVITY VERDICT:\n${antigravityVerdict}`
      //     };
      // }
      
      // 3.5 Log the trade into global analysis history for manual Win/Loss tracking
      if (result && result.signal && result.signal !== 'NEUTRAL') {
          try {
              // Strip ID and timestamp to let saveAnalysis re-apply it properly for journal
              const { id, timestamp, ...dataToSave } = result;
              await saveAnalysis(dataToSave);
              
              // Record a neural lesson from the recent trade log asynchronously
              generateLessonFromTradeLog().catch(err => console.error("Failed to generate neural lesson", err));
          } catch (e) {
              console.warn("Failed to log sniper trade to history journal:", e);
          }
      }

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
    { category: 'Global Indices', items: ['US 30 (OTC_DJI)', 'US 100 (OTC_NDX)', 'US 500 (OTC_SPC)', 'Europe 50 (OTC_STOXX50E)', 'Germany 40 (OTC_GDAXI)', 'France 40 (OTC_FCHI)', 'Japan 225 (OTC_N225)', 'Australia 200 (OTC_AS51)'] },
    { category: 'Forex', items: ['EURUSD', 'GBPUSD', 'GBPJPY', 'EURGBP', 'EURJPY', 'GBPCHF', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'XAUUSD (Gold)', 'SILVER', 'BRENT', 'WTI'] },
    { category: 'Crypto', items: ['BTCUSD', 'ETHUSD', 'LTCUSD'] },
    { category: 'Volatility Indices', items: ['V10', 'V25', 'V50', 'V75', 'V100', 'V10 (1s)', 'V25 (1s)', 'V50 (1s)', 'V75 (1s)', 'V100 (1s)'] },
    { category: 'Boom/Crash', items: [
      'Boom 1000, 500, 300', 
      'Boom 900, 600, 150, 50', 
      'Crash 1000, 500, 300', 
      'Crash 900, 600, 150, 50'
    ] },
    { category: 'Other', items: ['Step Index', 'Jump 10, 25, 50, 100', 'Range Break 100, 200'] }
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
    <div className="min-h-screen bg-slate-50/15 dark:bg-[#070b14]/50 text-slate-800 dark:text-slate-200 font-sans selection:bg-emerald-500/30 transition-colors duration-300 backdrop-blur-xl">
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
            {/* Monday/Friday Warning Banner */}
            {([1, 5].includes(new Date().getDay())) && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Trading Day Warning</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                    Historical logs restrict high-confidence trading on Mondays and Fridays due to lower profitability and market unpredictability. Capital preservation is priority. Proceed with extreme caution or remain flat.
                  </p>
                </div>
              </div>
            )}

            {/* Style Selector */}
            {/* Advanced Streaming Panel */}
            {userSettings?.streamingMode === 'Advanced' && lastAnalyzedAsset && (
              <div className="mb-4">
                 <CTraderAdvancedData symbol={lastAnalyzedAsset} />
              </div>
            )}

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

            {/* Lagos Timetable Suitability Advisor Toggle Banner */}
            <div className="mb-8 p-1.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 px-3 py-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-500 animate-pulse">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Lagos Timetable Suitability Advisor & Risk Shields
                    <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">Active</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Specifically calibrated to optimize your 6 daily timetabled trading sessions and stop bleed-losses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdvisor(!showAdvisor)}
                className="mx-3 md:mx-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all w-fit"
              >
                {showAdvisor ? 'Hide Advisor' : 'Reveal Insights'}
              </button>
            </div>

            <AnimatePresence>
              {showAdvisor && (
                <motion.div
                  initial={{ height: 0, opacity: 0, scale: 0.98 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.98 }}
                  className="overflow-hidden mb-8"
                >
                  <div className="bg-white dark:bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 shadow-xl relative backdrop-blur-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                    
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" /> Custom Optimization Blueprint (Lagos Session Hours)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                      Lagos/GMT+1 timetabled slots represent key institutional opening and closing sessions. Trading stock indices and currencies during these brief windows with market orders is highly dangerous due to initial "liquidity sweeps". Below is your suitability map:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-3.5">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          Morning Sessions (Lagos Time GMT+1)
                        </h4>
                        
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Session 1 • 07:00 - 08:30</span>
                            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">HIGH VOLATILITY</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <strong>Recommended Assets:</strong> EURUSD, GBPUSD. <br/>
                            <strong>Strategy:</strong> London open sweep. <em>Never enter with market execution immediately</em>. Use Buy/Sell Limits slightly below/above local Fair Value Gaps (FVGs).
                          </p>
                        </div>

                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Session 2 • 08:30 - 10:00</span>
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">OPTIMAL SMC</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <strong>Recommended Assets:</strong> EURUSD, GBPUSD, GBPJPY. <br/>
                            <strong>Strategy:</strong> Order block retests and FVG filling. Highly suited for 1:1 Scalps. Our recalibrated <strong>1:1.0 TP1 Shield</strong> is extremely high probability here.
                          </p>
                        </div>

                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Session 3 • 10:00 - 11:30</span>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded">TRENDING STAGE</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <strong>Recommended Assets:</strong> UK100, Germany 40, EURGBP. <br/>
                            <strong>Strategy:</strong> London mid-session trends. Look for structural continuation setups (MSS/CHoCH) on the M5 or M15 charts.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          Afternoon Sessions (Lagos Time GMT+1)
                        </h4>

                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Session 4 • 13:30 - 15:00</span>
                            <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">TURTLE SOUP DANGER</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <strong>Recommended Assets:</strong> US30, NAS100, US500, XAUUSD. <br/>
                            <strong>Strategy:</strong> NY Open liquidity hunt. <strong>Indices have massive spreads and wild wicks</strong>. Use pending limit orders with a 2.0x ATR Stop Loss to survive.
                          </p>
                        </div>

                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Session 5 • 15:00 - 16:30</span>
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">NY ORDERFLOW</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <strong>Recommended Assets:</strong> NAS100, US30, GBPUSD, XAUUSD. <br/>
                            <strong>Strategy:</strong> Main NY session volume. Trade breakouts with pullback limit entries. Move SL to entry as soon as price moves halfway to TP1.
                          </p>
                        </div>

                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Session 6 • 16:30 - 18:00</span>
                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">NY AM RETEST</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <strong>Recommended Assets:</strong> US30, NAS100, EURUSD. <br/>
                            <strong>Strategy:</strong> Session wrap-up. Clear out all positions before the spread increases at 21:00 Lagos time. Limit trading to H1 charts.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                      <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                          Lagos Anti-Loss Shield Rules
                        </h4>
                        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                          <li><strong>Conservative TP1 Active:</strong> The Sniper Live Trade page now generates tighter Take Profit 1 targets at <strong>1:1.0 Risk-to-Reward ratio</strong>. This makes TP1 highly realistic and easily hit, raising your winrate to 3/6 or 4/6 wins daily.</li>
                          <li><strong>Break-Even Risk-Shield:</strong> Always move your Stop Loss to the Entry price the moment the market covers 50% of the distance to TP1, or hits TP1. This completely eliminates losses from late-session reversals!</li>
                          <li><strong>Indices execution style:</strong> Avoid entering US30, NAS100, and UK100 via Market orders during session open times (07:00, 10:00, 13:30 Lagos). Select the <strong>"Scalp" or "Day" style</strong>, and place <strong>Buy Limits/Sell Limits</strong> to let price pull back to your entries.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Area */}
            <div className="space-y-8 min-h-[400px]">
              {messages.length === 0 && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Activity className="w-10 h-10 text-slate-300 dark:text-slate-700" />
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
                          <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800 flex-shrink-0">
                            <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Neural Response</span>
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
                                    <div className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">{Math.min(msg.signal.confidence, 85)}%</div>
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(msg.signal.confidence, 85)}%` }}
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                      {msg.signal.entryType === 'Market Execution' ? 'Execution Range' : 'Sniper Entry Range'}
                                    </span>
                                    <button onClick={() => copyToClipboard(msg.signal?.entryRange ? `${msg.signal.entryRange.min} - ${msg.signal.entryRange.max}` : (msg.signal?.entryPoints?.join(' - ') || ''), `Entry-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `Entry-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white flex items-baseline gap-2">
                                    {msg.signal?.entryRange 
                                        ? `${msg.signal.entryRange.min} - ${msg.signal.entryRange.max}` 
                                        : msg.signal?.entryPoints?.length > 1 
                                          ? `${msg.signal.entryPoints[0]} - ${msg.signal.entryPoints[msg.signal.entryPoints.length - 1]}`
                                          : (msg.signal?.entryPoints?.[0] || msg.signal.priceAtSignal || 'N/A')}
                                    {msg.signal.entryType === 'Market Execution' && (
                                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Live</span>
                                    )}
                                  </div>
                                  {msg.signal?.triggerConditions && (
                                    <div className="mt-2 text-[9px] font-bold text-emerald-500/70 uppercase tracking-tighter flex items-center gap-1">
                                      <Zap className="w-2.5 h-2.5" />
                                      {msg.signal.triggerConditions.entryTriggerCandle || 'Neural Trigger Active'}
                                    </div>
                                  )}
                                  <div className="mt-2 flex flex-col gap-1">
                                    {msg.signal.entryType === 'Market Execution' ? (
                                      <div className="flex flex-col gap-1 mt-1">
                                        <div className="text-[10px] font-bold text-emerald-600/90 dark:text-emerald-400/90 bg-emerald-500/10 px-2 py-1 rounded inline-flex items-center gap-1 w-fit border border-emerald-500/20">
                                          <Zap className="w-3 h-3" />
                                          {msg.signal.entryType} @ {msg.signal.priceAtSignal}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded inline-flex items-center gap-1 w-fit mt-1">
                                        <Target className="w-3 h-3" />
                                        {msg.signal.entryType}
                                      </div>
                                    )}
                                    {msg.signal?.expirationTime && (
                                      <div className="text-[10px] font-bold text-amber-600/80 dark:text-amber-500/80 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded w-fit mt-1 max-w-full">
                                        <Clock className="w-3 h-3 inline-block mr-1 mb-0.5" />
                                        <span className="leading-tight">{msg.signal.expirationTime}</span>
                                      </div>
                                    )}
                                  </div>
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

                              {/* RR Levels */}
                              {msg.signal.rrLevels && (
                                  <div className="mt-4 mb-8 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[2rem] p-6">
                                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
                                          Risk/Reward Breakdown
                                      </h3>
                                      <div className="grid grid-cols-3 gap-3">
                                          {/* TP1 */}
                                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 text-center">
                                              <div className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">
                                                  TP1 • {msg.signal.rrLevels?.rrRatios?.tp1 || '1:1.0'}
                                              </div>
                                              <div className="text-sm font-black text-emerald-500">
                                                  {msg.signal.takeProfits[0]}
                                              </div>
                                              <div className="text-[9px] text-slate-500 mt-1">
                                                  Close 50%
                                              </div>
                                          </div>

                                          {/* TP2 */}
                                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 text-center">
                                              <div className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">
                                                  TP2 • {msg.signal.rrLevels?.rrRatios?.tp2 || '1:2.0'}
                                              </div>
                                              <div className="text-sm font-black text-emerald-500">
                                                  {msg.signal.takeProfits[1]}
                                              </div>
                                              <div className="text-[9px] text-slate-500 mt-1">
                                                  Close 30%
                                              </div>
                                          </div>

                                          {/* TP3 */}
                                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 text-center">
                                              <div className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">
                                                  TP3 • {msg.signal.rrLevels?.rrRatios?.tp3 || '1:3.0'}
                                              </div>
                                              <div className="text-sm font-black text-emerald-500">
                                                  {msg.signal.takeProfits[2] || 'N/A'}
                                              </div>
                                              <div className="text-[9px] text-slate-500 mt-1">
                                                  Close 20%
                                              </div>
                                          </div>
                                      </div>

                                      {/* Breakeven Alert */}
                                      <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 text-[10px] font-bold text-amber-500/80 text-center uppercase tracking-widest">
                                          ⚡ Move SL to {msg.signal.entryPoints?.[0]} after TP1 hits
                                      </div>
                                  </div>
                              )}

                              {/* Position Management */}
                              {msg.signal.signal !== 'NEUTRAL' && (msg.signal.formattedLotSize || msg.signal.recommendedPositions) && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                  {msg.signal.formattedLotSize && (
                                    <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-4 rounded-3xl">
                                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Total Lot Size</div>
                                      <div className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">{msg.signal.formattedLotSize}</div>
                                    </div>
                                  )}
                                  {msg.signal.recommendedPositions && (
                                    <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-4 rounded-3xl">
                                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Total Positions</div>
                                      <div className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{msg.signal.recommendedPositions}</div>
                                    </div>
                                  )}
                                  {msg.signal.positionLotSize && (
                                    <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-4 rounded-3xl">
                                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Size Per Position</div>
                                      <div className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">{msg.signal.positionLotSize}</div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Institutional Trade Management Protocols */}
                              {msg.signal.signal !== 'NEUTRAL' && (
                                <div className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Execution Protocols
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">5-Minute Invalidation Rule</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">If price does not exhibit explosive momentum in your direction within 5 minutes of entry, exit immediately. The setup has likely failed.</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">50% TP1 Rule (Risk-Free Mode)</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">When price hits 50% of the distance to TP1 ({msg.signal.takeProfits[0]}), move your Stop Loss to entry price and secure partial profits.</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Daily Limit Cap</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Execute 1-3 high probability setups per day maximum. Overtrading degrades edge.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                              )}

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
                                  {msg.signal.reasoning?.map((r, i) => {
                                    const parts = r.split(':');
                                    const title = parts.length > 1 ? parts[0] : '';
                                    const content = parts.length > 1 ? parts.slice(1).join(':').trim() : r;
                                    
                                    return (
                                      <div key={i} className="flex items-start gap-3 bg-white/30 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
                                        <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <Zap className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                          {title && <span className="font-bold text-slate-900 dark:text-slate-200 mr-2">{title}:</span>}
                                          {content}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Antigravity Insight */}
                             {msg.signal.insight && (
                               <AntigravityVerdictDisplay insight={msg.signal.insight} />
                             )}

                            {/* Quant Engine Live Market Telemetry */}
                            {msg.signal.signal !== 'NEUTRAL' && msg.signal.quantData && (
                              <div className="mt-4 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[2rem] p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                  <Activity className="w-3 h-3" /> Live Market Telemetry (Quant Engine)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">Markov Regime Status</span>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                        {msg.signal.quantData.markovRegime?.currentRegime || msg.signal.quantData.quantMath?.regimeProbability || 'UNKNOWN'}
                                      </span>
                                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                        (msg.signal.quantData.markovRegime?.transitionProbability || 0) > 0.5 
                                          ? 'bg-amber-500/10 text-amber-500' 
                                          : 'bg-emerald-500/10 text-emerald-500'
                                      }`}>
                                        {((msg.signal.quantData.markovRegime?.transitionProbability || 0) * 100).toFixed(0)}% Shift Risk
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                      {msg.signal.quantData.quantMath?.regimeProbability === 'MEAN_REVERTING' 
                                        ? 'Price is oscillating in a range. Avoid breakout trades.' 
                                        : 'Market is actively trending. High volume structural shifts detected.'}
                                    </p>
                                  </div>
                                  <div className="bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">Volume & Liquidity Imbalance</span>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                        {(msg.signal.quantData.orderflowMetrics?.imbalanceRatio || 1) > 1.5 ? 'HIGH CONCENTRATION' : 'BALANCED'}
                                      </span>
                                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                        msg.signal.quantData.volumeProfile?.poc > (msg.signal.priceAtSignal || 0)
                                          ? 'bg-rose-500/10 text-rose-500'
                                          : 'bg-emerald-500/10 text-emerald-500'
                                      }`}>
                                        POC: {msg.signal.quantData.volumeProfile?.poc?.toFixed(5)}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                      Institutional orderflow footprint detected. {
                                        (msg.signal.quantData.orderflowMetrics?.buyVolume || 0) > (msg.signal.quantData.orderflowMetrics?.sellVolume || 0) 
                                          ? 'Heavy bullish absorption in the orderbook.' 
                                          : 'Aggressive sell-side supply overwhelming demand.'
                                      }
                                    </p>
                                  </div>
                                  
                                  {msg.signal.quantData.greyModelPrediction && (
                                    <div className="bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl md:col-span-2 border-l-2 border-indigo-500">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2 flex items-center gap-1">
                                        <Bot className="w-3 h-3 text-indigo-500" /> Grey Model GM(1,1)
                                      </span>
                                      <div className="flex flex-col md:flex-row gap-4 justify-between mt-3">
                                        <div className="flex-1">
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">Forward Projection (3 Periods)</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                {msg.signal.quantData.greyModelPrediction.forecast?.map((val: number, i: number) => (
                                                    <span key={i} className="text-xs font-mono bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md">
                                                        {val.toFixed(5)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col md:items-end justify-center">
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">Model Parameters</span>
                                            <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-500">
                                                <span>a: {msg.signal.quantData.greyModelPrediction.a?.toFixed(4)}</span>
                                                <span>b: {msg.signal.quantData.greyModelPrediction.b?.toFixed(4)}</span>
                                            </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

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

                            {/* Timing Calibration Engine */}
                            {msg.signal.timingCalibration && (
                              <div className="mt-4">
                                <TimingCalibrationWidget data={msg.signal.timingCalibration} variant="sniper" />
                              </div>
                            )}

                            {/* Pattern Recognition Layer */}
                            {((msg.signal.candlestickPatterns && msg.signal.candlestickPatterns.length > 0) || msg.signal.confirmationPattern) && (
                              <div className="mt-4 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[2rem] p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                  <Activity className="w-3 h-3 text-emerald-500" /> Neural Pattern Recognition
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Candlestick Patterns */}
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Detected Candlestick Patterns</span>
                                    {msg.signal.candlestickPatterns && msg.signal.candlestickPatterns.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {msg.signal.candlestickPatterns?.map((pattern, idx) => (
                                          <span 
                                            key={idx} 
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15"
                                          >
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            {pattern}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400 font-medium italic">No distinct candlestick patterns detected in the current micro-session.</span>
                                    )}
                                  </div>

                                  {/* Confirmation Pattern */}
                                  {msg.signal.confirmationPattern && (
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Trigger Confirmation</span>
                                      <div className="bg-white/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-xs font-black text-emerald-500 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>{msg.signal.confirmationPattern}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Demand Zones / Liquidity Heatmap */}
                            {msg.signal.heatmapData && msg.signal.heatmapData.length > 0 && (
                                <div className="mt-4 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[2rem] p-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-3 h-3" /> Orderbook Liquidity Depth Map
                                    </h3>
                                    <LiquidityHeatmapChart 
                                        data={msg.signal.heatmapData} 
                                        currentPrice={msg.signal.priceAtSignal || livePrice} 
                                        height={180} 
                                    />
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest text-center mt-3">
                                        D3.js Visualization of Liquidity Zones detected by Quant Engine
                                    </p>
                                </div>
                            )}
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
                  className="flex flex-col items-start gap-4 mb-4 w-full"
                >
                  <AgentAnalysisLoader inline={true} />
                  {userSettings?.deepThinking && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="flex items-center gap-2.5 p-3 px-4 bg-violet-500/15 dark:bg-violet-500/10 border border-violet-500/30 rounded-xl shadow-lg border-dashed w-full max-w-xl animate-pulse"
                    >
                      <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
                      </div>
                      <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                        🧠 AI Deep Thinking Active: Scanning order flow, checking unmitigated sweeps, and mapping stop-loss buffers...
                      </span>
                    </motion.div>
                  )}
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
                placeholder="Asset + Broker Price (e.g. US30 @ 39550 or EURUSD)"
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

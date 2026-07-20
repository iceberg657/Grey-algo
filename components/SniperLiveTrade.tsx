
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
  ChevronDown,
  Bell,
  BellOff
} from 'lucide-react';
import { QuantEnginePipeline, MarketSeries, MarketBar } from '../utils/advancedExecutionEngines';
import { generateSniperLiveSignal, generateAntigravityResearch, generateMacroContext, generateRegularRetailSignal } from '../services/geminiService';
import { TradingStyle, SignalData, UserMetadata, UserSettings, AntigravityVerdict } from '../types';
import { Loader } from './Loader';
import { TimingCalibrationWidget } from './TimingCalibrationWidget';
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

export interface GroundedStrategyMatch {
  strategyId: string;
  name: string;
  description: string;
  score: number;
  rationale: string;
}

export function getStrategySuitability(
  strategyId: string,
  asset: string,
  quantData: any,
  style: string
): GroundedStrategyMatch {
  let score = 50; // base baseline score
  let rationale = "Standard single-asset application.";
  let name = strategyId;
  let description = "";

  const isIndex = ['US30', 'NAS100', 'SPX500', 'UK100', 'FTSE', 'DAX', 'GDAXI', 'CAC', 'N225', 'AS51', 'DJI', 'NDX', 'SPC'].some(s => asset.toUpperCase().includes(s));
  const isSynthetic = ['VOLATILITY', 'BOOM', 'CRASH', 'STEP', 'JUMP', 'RANGE', 'R_', 'RB_', 'STP'].some(s => asset.toUpperCase().includes(s));
  const isForex = !isIndex && !isSynthetic && ['EUR', 'GBP', 'USD', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD'].some(cur => asset.toUpperCase().includes(cur));
  const isCrypto = ['BTC', 'ETH', 'LTC', 'SOL'].some(s => asset.toUpperCase().includes(s));

  const trend = quantData?.trend || 'RANGING';
  const noise = quantData?.quantMath?.statisticalNoiseRatio || 0.5;
  const hurst = quantData?.quantMath?.hurstExponentApproximation || 0.5;
  const tickCount = quantData?.ctraderTicks?.length || 0;

  switch (strategyId) {
    case 'INDEX_SMT':
      name = "Index Smart Money Theory (I-SMT)";
      description = "Divergence analysis between major correlated equity indices (DJI vs NDX vs SPX).";
      if (isIndex) {
        score += 40;
        rationale = "High suitability: Asset is a major index. Correlated flows provide institutional SMT footprints.";
      } else {
        score -= 40;
        rationale = "Low suitability: Only applicable to global equity indices.";
      }
      break;

    case 'INDEX_STAT_ARB':
      name = "Index Statistical Spread Arbitrage";
      description = "Mean-reversion trading of statistical price spreads across correlated global index pairs.";
      if (isIndex) {
        score += 35;
        if (trend === 'RANGING') {
          score += 15;
          rationale = "High suitability: Index in ranging state is highly optimal for spread-reversion statistical arbitrage.";
        } else {
          rationale = "Moderate-high suitability: Index-specific spread model, adjusted for active trend.";
        }
      } else {
        score -= 45;
        rationale = "Low suitability: Requires highly cointegrated equity indices.";
      }
      break;

    case 'INDEX_LEAD_LAG':
      name = "Index Predictive Lead-Lag Engine";
      description = "Identifies leadership momentum and lagged execution timing across indices (NDX leading SPX).";
      if (isIndex) {
        score += 35;
        if (trend !== 'RANGING') {
          score += 15;
          rationale = "High suitability: Trending equity indices exhibit highly predictable lead-lag momentum cascades.";
        } else {
          rationale = "Moderate suitability: Ranging indices exhibit reduced lead-lag efficacy.";
        }
      } else {
        score -= 45;
        rationale = "Low suitability: Requires lead-lag index mapping.";
      }
      break;

    case 'SMT':
      name = "Smart Money Divergence Correlation";
      description = "Institutional correlation matrix (e.g., Gold vs Silver, EURUSD vs GBPUSD vs DXY) detecting retail trap sweeps.";
      if (isForex || isCrypto || asset.toUpperCase().includes('GOLD')) {
        score += 30;
        rationale = "High suitability: Forex, Crypto, or Gold exhibits strong correlation with major basket proxies.";
      } else {
        score -= 20;
        rationale = "Low suitability: Prefer specialized index engines for equities.";
      }
      break;

    case 'STAT_ARB':
      name = "Statistical Pairs Arbitrage";
      description = "Examines structural cointegration spreads between correlated assets and fades standard deviations.";
      if (isForex || isCrypto) {
        score += 25;
        if (trend === 'RANGING') {
          score += 15;
          rationale = "High suitability: Ranging forex/crypto pairs are optimal for statistical mean-reversion arbitrage.";
        } else {
          rationale = "Moderate suitability: Pair spread trading adjusted for trend continuation.";
        }
      } else {
        score -= 15;
        rationale = "Low suitability: High-trend or index assets are better matched with momentum or index models.";
      }
      break;

    case 'VELOCITY':
      name = "High-Frequency Velocity & Lag Engine";
      description = "Measures tick density, orderbook sweep velocity, and micro-impulse volume expansion.";
      if (isSynthetic || tickCount > 100) {
        score += 40;
        rationale = "High suitability: Synthetic indices and high-density tick environments require millisecond momentum tracking.";
      } else if (trend !== 'RANGING') {
        score += 15;
        rationale = "Moderate suitability: High-volatility trend continuation.";
      } else {
        score -= 10;
        rationale = "Low-moderate suitability: Low-volatility ranging states are prone to velocity fakeouts.";
      }
      break;

    case 'SINGLE_ASSET_MOMENTUM':
      name = "Single Asset Micro-Momentum Expansion";
      description = "ATR-volatility breakouts, MACD divergence, and RSI strength follow-through.";
      if (trend !== 'RANGING') {
        score += 30;
        if (hurst > 0.6) {
          score += 15;
          rationale = "High suitability: Strong directional persistence (Hurst > 0.60) confirms trend expansion.";
        } else {
          rationale = "Moderate-high suitability: Supported by active trend structure.";
        }
      } else {
        score -= 25;
        rationale = "Low suitability: Ranging environments trigger frequent breakout false-signals.";
      }
      break;

    case 'SINGLE_ASSET_REGIME':
      name = "Single Asset Markov Regime-Switching Reversion";
      description = "Identifies shifts between low-volatility accumulation and high-volatility distribution, optimizing buy-low/sell-high zones.";
      if (trend === 'RANGING') {
        score += 35;
        if (hurst < 0.45) {
          score += 15;
          rationale = "High suitability: Mean-reverting regime (Hurst < 0.45) is optimal for buying low and selling high.";
        } else {
          rationale = "Moderate-high suitability: Perfect for ranging zones.";
        }
      } else {
        score -= 15;
        rationale = "Moderate-low suitability: Trending markets may experience runaway expansion against range boundaries.";
      }
      break;
  }

  return {
    strategyId,
    name,
    description,
    score: Math.min(100, Math.max(0, score)),
    rationale
  };
}

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
  const [style, setStyle] = useState<TradingStyle>('day trading(1 to 2hrs)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<SniperMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<any>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | undefined>(undefined);
  const [selectedStreamingMode, setSelectedStreamingMode] = useState<'Standard' | 'Advanced'>('Standard');
  const [dailyRegime, setDailyRegime] = useState<DailyRegime | null>(null);
  const [ctraderConnectionError, setCTraderConnectionError] = useState<string | null>(null);
  const ctraderDepthRef = React.useRef<{ bids: [number, number][], asks: [number, number][] } | null>(null);
  
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert("This browser does not support push notifications.");
      return;
    }
    
    if (Notification.permission === 'denied') {
      alert("Notifications are blocked by your browser. Please clear or reset your notification permissions in your browser's site settings to activate signal alerts.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      try {
        new Notification("Sniper Live Alerts Active", {
          body: "You will receive push notifications for all live trade setups.",
          icon: "/signal_buy_icon.png"
        });
      } catch (e) {
        console.error("Failed to show permission notification", e);
      }
    }
  };

  const showPushNotification = (msg: SniperMessage) => {
    if (!msg.signal) return;
    const s = msg.signal;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const isBuy = s.signal === 'BUY';
    const isSell = s.signal === 'SELL';
    if (!isBuy && !isSell) return;

    const emoji = isBuy ? '🟢 [BUY]' : '🔴 [SELL]';
    const title = `${emoji} Sniper Signal: ${s.asset}`;

    const directionWord = isBuy ? 'BUY SETUP' : 'SELL SETUP';
    const entryMin = s.entryRange?.min || s.priceAtSignal || 'Market';
    const entryMax = s.entryRange?.max ? ` - ${s.entryRange.max}` : '';
    const stopLossValue = s.stopLoss || 'None';
    const takeProfitsList = s.takeProfits && s.takeProfits.length > 0 ? s.takeProfits.join(', ') : 'None';

    const options: NotificationOptions = {
      body: `🎯 Direction: ${directionWord}\n💵 Entry zone: ${entryMin}${entryMax}\n🛡️ Stop loss: ${stopLossValue}\n💰 Take Profit(s): ${takeProfitsList}\n🔥 Confidence: ${s.confidence || 0}%`,
      tag: `sniper-${msg.id}`,
      requireInteraction: true
    };

    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error("Failed to show web Notification:", err);
    }
  };
  
  const isAdvancedStreamingGranted = userMetadata ? (userMetadata.role === 'admin' || userMetadata.access?.advancedStreaming === 'granted') : false;

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
    // Clear L2 depth cache when switching focus assets
    ctraderDepthRef.current = null;
  }, [lastAnalyzedAsset]);

  // Silent background Level 2 cTrader stream manager
  useEffect(() => {
    if (selectedStreamingMode !== 'Advanced' || !isAdvancedStreamingGranted || !lastAnalyzedAsset) {
      ctraderDepthRef.current = null;
      return;
    }

    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectStream = () => {
      try {
        const token = localStorage.getItem('ctrader_access_token');
        const accountId = localStorage.getItem('ctrader_account_id');
        const environment = localStorage.getItem('ctrader_environment') || 'demo';

        if (!token || !accountId) {
          console.warn("[SniperLiveTrade background L2] cTrader credentials missing.");
          return;
        }

        const cleanSymbol = (raw: string) => {
          let clean = raw.toUpperCase().replace('/', '').replace('-', '');
          if (clean.startsWith('FRX')) {
            clean = clean.substring(3);
          }
          if (clean === 'GOLD') return 'XAUUSD';
          if (clean === 'SILVER') return 'XAGUSD';
          if (clean === 'PLATINUM') return 'XPTUSD';
          if (clean === 'PALLADIUM') return 'XPDUSD';
          return clean;
        };

        const activeSymbol = cleanSymbol(lastAnalyzedAsset);
        const url = `/api/ctrader/stream?token=${encodeURIComponent(token)}&accountId=${accountId}&environment=${environment}&symbols=${activeSymbol}`;

        es = new EventSource(url);

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'depth' && data.data) {
              const parsedDepth = {
                bids: data.data.bids || [],
                asks: data.data.asks || []
              };
              ctraderDepthRef.current = parsedDepth;
            }
          } catch (e) {
            console.error("[SniperLiveTrade background L2] Parse error:", e);
          }
        };

        es.onerror = () => {
          console.warn("[SniperLiveTrade background L2] Connection lost. Reconnecting in 5s...");
          if (es) {
            es.close();
          }
          reconnectTimeout = setTimeout(connectStream, 5000);
        };
      } catch (err) {
        console.error("[SniperLiveTrade background L2] Error establishing stream:", err);
      }
    };

    connectStream();

    return () => {
      if (es) {
        es.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      ctraderDepthRef.current = null;
    };
  }, [lastAnalyzedAsset, selectedStreamingMode, isAdvancedStreamingGranted]);

  useEffect(() => {
    // Force downgrade to Standard streaming if not granted and metadata is loaded
    if (userMetadata && !isAdvancedStreamingGranted && selectedStreamingMode === 'Advanced') {
      setSelectedStreamingMode('Standard');
      try {
        const stored = localStorage.getItem('greyquant_user_settings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.streamingMode = 'Standard';
        localStorage.setItem('greyquant_user_settings', JSON.stringify(parsed));
        setUserSettings(parsed);
      } catch (e) {
        console.error("Failed to force downgrade streaming mode", e);
      }
    }
  }, [userMetadata, isAdvancedStreamingGranted, selectedStreamingMode]);

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
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('greyquant_user_settings');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            setUserSettings(parsed);
            if (parsed.streamingMode) {
                const actualMode = (parsed.streamingMode === 'Advanced' && isAdvancedStreamingGranted) ? 'Advanced' : 'Standard';
                setSelectedStreamingMode(actualMode);
            }
        } catch (e) {
            console.error("Failed to parse user settings", e);
        }
    }
  }, [isAdvancedStreamingGranted]);

  const handleStreamingModeChange = (mode: 'Standard' | 'Advanced') => {
    if (mode === 'Advanced' && !isAdvancedStreamingGranted) {
      return; // Reject setting to Advanced if not granted
    }
    setSelectedStreamingMode(mode);
    try {
      const stored = localStorage.getItem('greyquant_user_settings');
      const parsed = stored ? JSON.parse(stored) : {};
      parsed.streamingMode = mode;
      localStorage.setItem('greyquant_user_settings', JSON.stringify(parsed));
      setUserSettings(parsed);
    } catch (e) {
      console.error("Failed to persist streaming mode", e);
    }
  };

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
      
      // Push Notification trigger system for real-time live trading signals
      msgs.forEach((msg) => {
        if (msg.type === 'ai' && msg.signal && (msg.signal.signal === 'BUY' || msg.signal.signal === 'SELL')) {
          const isRecent = Date.now() - (msg.timestamp || 0) < 60000;
          if (isRecent && !notifiedMsgIdsRef.current.has(msg.id)) {
            notifiedMsgIdsRef.current.add(msg.id);
            showPushNotification(msg);
          } else {
            notifiedMsgIdsRef.current.add(msg.id);
          }
        }
      });

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
      // Use on-page selected streaming mode
      let isAdvancedStreaming = selectedStreamingMode === 'Advanced';
      let ctToken = '';
      let ctAccount = '';
      let ctEnvironment = 'demo';
      
      try {
        ctToken = localStorage.getItem('ctrader_access_token') || '';
        ctAccount = localStorage.getItem('ctrader_account_id') || '';
        ctEnvironment = localStorage.getItem('ctrader_environment') || 'demo';
      } catch (e) {}

      // If Advanced Streaming but cTrader is not connected, fallback to Deriv
      if (isAdvancedStreaming && (!ctToken || !ctAccount)) {
         console.warn(`[SniperLiveTrade] Advanced Streaming selected but cTrader not connected (Token: ${ctToken ? 'present' : 'missing'}, Account: ${ctAccount ? 'present' : 'missing'}). Falling back to Deriv.`);
         isAdvancedStreaming = false;
      }

      // Define 3 timeframes based on trading style
      const getTimeframes = (style: string) => {
        if (style.includes('scalping')) {
            return { entry: 300, confirm: 900, htf: 3600, ctEntry: 'M5', ctConfirm: 'M15', ctHtf: 'H1' }; // 5m, 15m, 1h
        } else if (style.includes('swing')) {
            return { entry: 14400, confirm: 86400, htf: 604800, ctEntry: 'H4', ctConfirm: 'D1', ctHtf: 'W1' }; // 4h, 1d, 1w
        } else {
            return { entry: 900, confirm: 3600, htf: 14400, ctEntry: 'M15', ctConfirm: 'H1', ctHtf: 'H4' }; // Day: 15m, 1h, 4h
        }
      };
      
      const timeframes = getTimeframes(style);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), 35000); 

      let entryData, confirmData, htfData;
      let ctraderTicks = null;
      let usedBroker = 'Deriv';

      const getCTraderSymbol = (rawAsset: string) => {
          let clean = rawAsset.toUpperCase().replace('/', '').replace('-', '');
          if (clean.startsWith('FRX')) {
              clean = clean.substring(3);
          }
          if (clean === 'GOLD') return 'XAUUSD';
          if (clean === 'SILVER') return 'XAGUSD';
          if (clean === 'PLATINUM') return 'XPTUSD';
          if (clean === 'PALLADIUM') return 'XPDUSD';
          return clean;
      };

      setCTraderConnectionError(null);

      if (isAdvancedStreaming) {
          usedBroker = 'cTrader';
          const ctAsset = getCTraderSymbol(asset);
          console.log(`[SniperLiveTrade] Fetching Advanced Data from cTrader for ${ctAsset} (raw: ${asset})...`);
          
          try {
              // Fetch from cTrader API
              const [entryRes, confirmRes, htfRes, tickRes] = await Promise.all([
                  fetch(`/api/ctrader/trendbars?symbol=${ctAsset}&period=${timeframes.ctEntry}&accountId=${ctAccount}&environment=${ctEnvironment}&count=1000`, { headers: { 'Authorization': `Bearer ${ctToken}` }, signal: controller.signal }),
                  fetch(`/api/ctrader/trendbars?symbol=${ctAsset}&period=${timeframes.ctConfirm}&accountId=${ctAccount}&environment=${ctEnvironment}&count=1000`, { headers: { 'Authorization': `Bearer ${ctToken}` }, signal: controller.signal }),
                  fetch(`/api/ctrader/trendbars?symbol=${ctAsset}&period=${timeframes.ctHtf}&accountId=${ctAccount}&environment=${ctEnvironment}&count=1000`, { headers: { 'Authorization': `Bearer ${ctToken}` }, signal: controller.signal }),
                  fetch(`/api/ctrader/ticks?symbol=${ctAsset}&type=BID&accountId=${ctAccount}&environment=${ctEnvironment}`, { headers: { 'Authorization': `Bearer ${ctToken}` }, signal: controller.signal })
              ]);
              
              clearTimeout(timeoutId);
              
              const [eData, cData, hData, tData] = await Promise.all([
                  entryRes.json(), confirmRes.json(), htfRes.json(), tickRes.json()
              ]);
              
              if (eData.error || cData.error || hData.error) {
                  const errMsg = eData.error || cData.error || hData.error;
                  throw new Error(`cTrader Error: ${errMsg}`);
              }
              
              entryData = eData;
              confirmData = cData;
              htfData = hData;
              if (tData && tData.ticks) {
                 ctraderTicks = tData.ticks;
              }
          } catch (ctError: any) {
              console.warn(`[SniperLiveTrade] cTrader feed failed (${ctError.message || ctError}). Falling back to Deriv feed to ensure continuity.`, ctError);
              
              let friendlyError = ctError.message || String(ctError);
              if (friendlyError.includes('ECONNRESET') || friendlyError.includes('TLS')) {
                  friendlyError = "TLS connection failed (ECONNRESET) on port 5035. This usually indicates outbound custom TCP socket connections are restricted by sandbox runtime or firewalls.";
              }
              
              setCTraderConnectionError(friendlyError);
              usedBroker = 'Deriv (cTrader Fallback)';
              
              const symbol = getDerivSymbol(asset);
              let clientToken = '';
              try {
                const storedSettings = localStorage.getItem('greyquant_user_settings');
                if (storedSettings) {
                  const parsed = JSON.parse(storedSettings);
                  if (parsed.derivApiToken) clientToken = parsed.derivApiToken;
                }
              } catch (e) {}
                    
              if (!clientToken) {
                // @ts-ignore
                clientToken = import.meta.env.VITE_DERIV_API_TOKEN || import.meta.env.VITE_DERIV_TOKEN || import.meta.env.DERIV_API_TOKEN || import.meta.env.DERIV_TOKEN || '';
              }

              console.log(`[SniperLiveTrade Fallback] Fetching Standard Data from Deriv for ${symbol}...`);
              const [entryRes, confirmRes, htfRes] = await Promise.all([
                  fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.entry}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' }),
                  fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.confirm}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' }),
                  fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.htf}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' })
              ]);
              
              clearTimeout(timeoutId);
              
              const [eData, cData, hData] = await Promise.all([
                  entryRes.json(), confirmRes.json(), htfRes.json()
              ]);
              
              if (eData.error) throw new Error(eData.error);
              entryData = eData;
              confirmData = cData;
              htfData = hData;
          }
      } else {
          // Fallback / Standard Deriv Fetch
          usedBroker = 'Deriv';
          const symbol = getDerivSymbol(asset);
          let clientToken = '';
          try {
            const storedSettings = localStorage.getItem('greyquant_user_settings');
            if (storedSettings) {
              const parsed = JSON.parse(storedSettings);
              if (parsed.derivApiToken) clientToken = parsed.derivApiToken;
            }
          } catch (e) {}
                
          if (!clientToken) {
            // @ts-ignore
            clientToken = import.meta.env.VITE_DERIV_API_TOKEN || import.meta.env.VITE_DERIV_TOKEN || import.meta.env.DERIV_API_TOKEN || import.meta.env.DERIV_TOKEN || '';
          }

          console.log(`[SniperLiveTrade] Fetching Standard Data from Deriv for ${symbol}...`);
          const [entryRes, confirmRes, htfRes] = await Promise.all([
              fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.entry}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' }),
              fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.confirm}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' }),
              fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${timeframes.htf}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { signal: controller.signal, cache: 'no-store' })
          ]);
          
          clearTimeout(timeoutId);
          
          const [eData, cData, hData] = await Promise.all([
              entryRes.json(), confirmRes.json(), htfRes.json()
          ]);
          
          if (eData.error) throw new Error(eData.error);
          entryData = eData;
          confirmData = cData;
          htfData = hData;
      }
      
      // Parse out live price from the last candle
      const lastCandle = entryData.candles && entryData.candles.length > 0 ? entryData.candles[entryData.candles.length - 1] : null;
      
      if (!lastCandle) {
          throw new Error(`No market data received from ${usedBroker} API.`);
      }

      // Staleness Detection (Max 1 hour for indices, 15m for others)
      const nowSeconds = Math.floor(Date.now() / 1000);
      const candleAge = nowSeconds - lastCandle.epoch;
      const isMajorAsset = ['OTC_DJI', 'OTC_NDX', 'OTC_SPC', 'OTC_FTSE', 'frxXAUUSD', 'frxEURUSD', 'frxGBPUSD', 'cryBTCUSD', 'cryETHUSD'].includes(asset) || asset.includes('US30') || asset.includes('NAS100');
      const maxAge = isMajorAsset ? 3600 : 900; 

      if (candleAge > maxAge) {
          const ageMinutes = Math.floor(candleAge / 60);
          console.warn(`[SniperLiveTrade] STALE DATA DETECTED: Price is ${ageMinutes}m old.`);
          entryData.isMarketClosed = true;
      }

      if (lastCandle) {
          entryData.price = lastCandle.close;
          entryData.bid = lastCandle.close;
          entryData.ask = lastCandle.close;
      }
      
      const combinedData = {
          ...entryData,
          ctraderTicks,
          usedBroker,
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
      console.error('Price Fetch Error:', err);
      throw err;
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const currentQuery = directQuery ? directQuery.trim() : query.trim();
    if (!currentQuery || isAnalyzing) return;

    if (!directQuery) {
      setQuery('');
    }
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
            asset,
            derivData.usedBroker || 'Deriv',
            ctraderDepthRef.current
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
              
              // GROUNDED STRATEGY AUTO-SELECTION SYSTEM
              const allStrategies = [
                  'SMT',
                  'STAT_ARB',
                  'VELOCITY',
                  'INDEX_SMT',
                  'INDEX_STAT_ARB',
                  'INDEX_LEAD_LAG',
                  'SINGLE_ASSET_REGIME',
                  'SINGLE_ASSET_MOMENTUM'
              ];

              const evaluatedStrategies = allStrategies.map(stratId => {
                  return getStrategySuitability(stratId, asset, quantData, style);
              });

              // Sort by suitability score descending
              evaluatedStrategies.sort((a, b) => b.score - a.score);
              const bestMatch = evaluatedStrategies[0];
              console.log(`[SniperLiveTrade] Grounded Strategy Auto-Selector matched:`, bestMatch);

              try {
                  const sig = pipeline.processLiveExecution(
                      bestMatch.strategyId as any, mSeries, mSeries, mSeries,
                      granularity / 60, // period parameter if applicable
                      userSettings?.autotrade?.maxRiskPerTrade || 10000,
                      ctraderDepthRef.current
                  );
                  if (sig) {
                      advancedQuantSignal = {
                          ...sig,
                          strategy: bestMatch.strategyId,
                          strategyName: bestMatch.name,
                          suitabilityScore: bestMatch.score,
                          suitabilityRationale: bestMatch.rationale,
                          strategyDescription: bestMatch.description
                      };
                      console.log(`[SniperLiveTrade] Auto-Selected Strategy Executed:`, advancedQuantSignal);
                  }
              } catch (e) {
                  console.warn(`Quant execution failed for auto-selected strategy ${bestMatch.strategyId}:`, e);
                  
                  // Fallback: Try SINGLE_ASSET_REGIME or SINGLE_ASSET_MOMENTUM if the complex strategy execution fails
                  const fallbackStrat = quantData?.trend === 'RANGING' ? 'SINGLE_ASSET_REGIME' : 'SINGLE_ASSET_MOMENTUM';
                  try {
                      const sig = pipeline.processLiveExecution(
                          fallbackStrat as any, mSeries, mSeries, mSeries,
                          granularity / 60,
                          userSettings?.autotrade?.maxRiskPerTrade || 10000,
                          ctraderDepthRef.current
                      );
                      if (sig) {
                          const suitability = getStrategySuitability(fallbackStrat, asset, quantData, style);
                          advancedQuantSignal = {
                              ...sig,
                              strategy: fallbackStrat,
                              strategyName: suitability.name,
                              suitabilityScore: suitability.score,
                              suitabilityRationale: `Fallback execution: ${suitability.rationale}`,
                              strategyDescription: suitability.description
                          };
                      }
                  } catch (fallbackErr) {
                      console.error("Fallback strategy execution failed:", fallbackErr);
                  }
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
            content: `Macro Context Analyzed.\n\n${macroContextSummary}\n\nRunning high-speed Regular Technical Model (300-candle analysis window) to simulate standard trader bias...`,
            signal: { id: 'loading', asset: asset, timeframe: 'M15', signal: 'NEUTRAL', entryPoints: [0], entryType: 'Market Execution', stopLoss: 0, takeProfits: [0, 0], confidence: 0, analysisBreakdown: [], formattedLotSize: '0.00', reasoning: [], checklist: [], candlestickPatterns: [], insight: '', grade: 'NO TRADE', timestamp: Date.now() } as SignalData
        }];
      });

      // 1.5 Generate the regular/retail preliminary signal using the 300-candle model
      const retailSignal = await generateRegularRetailSignal(
        currentQuery,
        style,
        derivData,
        userSettings
      );

      // 2. Dispatch Antigravity Agent to act as Devil's Advocate (auditing the retail setup with 1,000 candles)
      setMessages(prev => {
          const filtered = prev.filter(m => m.signal?.id !== 'loading');
          return [...filtered, {
              id: Date.now().toString() + '-ag-deep-search',
              type: 'ai',
              content: `Regular setup detected: ${retailSignal.signal} (${retailSignal.confidence}% confidence).\n\nNow dispatching the Antigravity Devil's Advocate (using 1,000-candle institutional database & Level 2 orderbook depth) to audit this setup, locate intraday traps, and find structural reasons to invalidate it...`,
              signal: { id: 'loading', asset: asset, timeframe: 'M15', signal: 'NEUTRAL', entryPoints: [0], entryType: 'Market Execution', stopLoss: 0, takeProfits: [0, 0], confidence: 0, analysisBreakdown: [], formattedLotSize: '0.00', reasoning: [], checklist: [], candlestickPatterns: [], insight: '', grade: 'NO TRADE', timestamp: Date.now() } as SignalData
          }];
      });

      const antigravityVerdict = await generateAntigravityResearch(currentQuery, asset, quantData, retailSignal, macroContextSummary);

      // 2.5 Conflict Resolution & Override Decision Matrix
      let overrideNote = '';
      if (antigravityVerdict.verdict === 'VETO') {
          overrideNote = `🚨 VETO ACTIVE: The Antigravity Devil's Advocate discovered critical structural/orderbook traps. The setup has been completely invalidated.`;
      } else if (
          (retailSignal.signal === 'BUY' && antigravityVerdict.verdict === 'PROCEED_SELL') ||
          (retailSignal.signal === 'SELL' && antigravityVerdict.verdict === 'PROCEED_BUY')
      ) {
          if (antigravityVerdict.confidence > retailSignal.confidence) {
              const alternativeDirection = antigravityVerdict.verdict === 'PROCEED_SELL' ? 'SELL' : 'BUY';
              overrideNote = `🔄 ADVERSARIAL OVERRIDE: Antigravity has detected a trap and overridden the regular signal!\n- Regular Bias: ${retailSignal.signal} (Confidence: ${retailSignal.confidence}%)\n- Antigravity Skeptic: ${alternativeDirection} (Confidence: ${antigravityVerdict.confidence}%)\nWe prioritize the deep institutional reverse-play!`;
          } else {
              overrideNote = `⚖️ DISCREPANCY DETECTED: Regular analysis saw ${retailSignal.signal} but Antigravity institutional research suggested counter-trend play (${antigravityVerdict.verdict}). Antigravity skepticism did not have enough confidence to force an override. Standard signal remains active.`;
          }
      } else if (
          (retailSignal.signal === 'BUY' && antigravityVerdict.verdict === 'PROCEED_BUY') ||
          (retailSignal.signal === 'SELL' && antigravityVerdict.verdict === 'PROCEED_SELL')
      ) {
          overrideNote = `✅ CONVERGENT CONFLICT RESOLUTION: Both the 300-candle regular model and the 1,000-candle Antigravity Devil's Advocate agree on ${retailSignal.signal}! Setup is highly validated.`;
      } else {
          overrideNote = `ℹ️ RESOLVED HYBRID BIAS: Regular signal is ${retailSignal.signal}, Antigravity institutional research suggests ${antigravityVerdict.verdict} (${antigravityVerdict.confidence}% confidence).`;
      }

      setMessages(prev => {
          const filtered = prev.filter(m => m.signal?.id !== 'loading');
          return [...filtered, {
              id: Date.now().toString() + '-ag-compile',
              type: 'ai',
              content: `Antigravity audit complete!\nVerdict: ${antigravityVerdict.verdict} (${antigravityVerdict.confidence}% confidence)\n\n${overrideNote}\n\nRunning compiler model to structure entry zones, ATR-calibrated stop loss, and dynamic Kelly/Fractional-Kelly position sizing multipliers...`,
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

      // Create rich Markdown details for the UI representation
      const richInsightMarkdown = `# 🛡️ ANTIGRAVITY DEVIL'S ADVOCATE SYSTEM REPORT

### 🧬 GROUNDED ALGORITHMIC AUTO-SELECTION
- **Selected Quant Engine Strategy**: ${advancedQuantSignal?.strategyName || 'None'}
- **Suitability Match Score**: ${advancedQuantSignal?.suitabilityScore || 100}%
- **Suitability Matching Rationale**: ${advancedQuantSignal?.suitabilityRationale || 'N/A'}
- **Strategy Mathematical Profile**: ${advancedQuantSignal?.strategyDescription || 'N/A'}

---

### 📊 REGULAR TECHNICAL SIGNAL (300-CANDLE MODEL)
- **Bias**: ${retailSignal.signal}
- **Confidence**: ${retailSignal.confidence}%
- **Entry Range**: ${retailSignal.entryRange?.min} - ${retailSignal.entryRange?.max}
- **Stop Loss**: ${retailSignal.stopLoss}
- **Take Profits**: ${retailSignal.takeProfits?.join(', ') || 'N/A'}
- **Regular Trend Reasoning**: ${retailSignal.reasoning?.join(' ') || 'None'}

---

### 🧐 ANTIGRAVITY INSTITUTIONAL AUDIT (1,000-CANDLE DEEP RESEARCH)
- **Skeptic Verdict**: ${antigravityVerdict.verdict}
- **Skeptic Confidence**: ${antigravityVerdict.confidence}%
- **Matched QuantConnect Strategy ID**: \`${antigravityVerdict.quantConnectStrategyId}\`
- **Skeptic Executive Summary**: ${antigravityVerdict.executiveSummary}

#### 🛑 IDENTIFIED STRUCTURAL & ORDERFLOW FLAWS:
${antigravityVerdict.flawsFound?.map(f => `  * ${f}`).join('\n') || '  * None'}

---

### ⚖️ DECISION MATRIX & OVERRIDE STATUS
**${overrideNote}**

---

### 💻 ASSIGNED ALGORITHMIC PARADIGM
- **Dynamic Kelly Lot Multiplier**: \`${antigravityVerdict.dynamicLotMultiplier}\`
- **Dynamic R:R Boundaries**: \`${antigravityVerdict.dynamicRiskReward}\`

---

## 🔬 DEEP ANTIMARKET ANALYSIS METHODOLOGY
${antigravityVerdict.deepAnalysisMarkdown}`;

      result = {
          ...finalSignal,
          usedBroker: derivData?.usedBroker || 'Deriv',
          insight: richInsightMarkdown // Display the full structured report inside the UI
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
      const isGeminiError = err.message?.toLowerCase().includes('gemini') || err.message?.toLowerCase().includes('api key');
      setError(err.message || 'Failed to generate setup. Please try again.');
      // Add error message to chat
      const errorMsgId = (Date.now() + 1).toString();
      const errorMsg: SniperMessage = {
        id: errorMsgId,
        type: 'ai',
        content: `System Anomaly: ${isGeminiError ? 'Gemini AI Key is missing or invalid. Please check your Settings.' : (err.message || 'Neural link failed.')}`,
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
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 px-4 py-3 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            </button>
            <div className="flex items-center gap-2 sm:hidden">
              {typeof window !== 'undefined' && 'Notification' in window && (
                <button
                  onClick={handleToggleNotifications}
                  className={`p-2 rounded-xl transition-all group ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : notificationPermission === 'denied'
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-60'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
                  }`}
                  title={
                    notificationPermission === 'granted'
                      ? "Notifications Active"
                      : notificationPermission === 'denied'
                      ? "Notifications Blocked"
                      : "Subscribe to Trade Alerts"
                  }
                >
                  {notificationPermission === 'granted' ? (
                    <Bell className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </button>
              )}
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
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Sniper Live Trade
              </h1>
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500/70">Live Market Feed</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {typeof window !== 'undefined' && 'Notification' in window && (
              <button
                onClick={handleToggleNotifications}
                className={`p-2 rounded-xl transition-all group ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-60'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
                }`}
                title={
                  notificationPermission === 'granted'
                    ? "Trade Alerts Enabled (Active)"
                    : notificationPermission === 'denied'
                    ? "Trade Alerts Blocked"
                    : "Subscribe to Trade Alerts"
                }
              >
                {notificationPermission === 'granted' ? (
                  <Bell className="w-5 h-5 text-emerald-500" />
                ) : (
                  <BellOff className="w-5 h-5" />
                )}
              </button>
            )}
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

            {/* cTrader TLS Connection Fallback Alert */}
            {ctraderConnectionError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 relative overflow-hidden">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">
                    ⚡ cTrader Connection Anomaly
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300/80 leading-relaxed">
                    The system experienced a TLS Connection reset (ECONNRESET) on port 5035 while accessing cTrader's Open API. 
                    This is typical in sandboxed runtimes with restricted outbound ports. 
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-300/80 leading-relaxed mt-1 font-semibold">
                    🛡️ Autopilot Fallback Engaged: The Quant Engine has automatically routed this stream through the backup high-fidelity Deriv feed. All institutional SMC indicators, retail bias simulators, and Antigravity Devil's Advocate models are fully functional and secure.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedStreamingMode('Standard');
                        setCTraderConnectionError(null);
                      }}
                      className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Switch back to Standard (Deriv)
                    </button>
                    <button
                      onClick={() => {
                        setCTraderConnectionError(null);
                      }}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
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
                                <div className={`border p-5 rounded-3xl group transition-all duration-300 relative overflow-hidden ${
                                  msg.signal.signal === 'BUY' 
                                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40' 
                                    : msg.signal.signal === 'SELL' 
                                    ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40' 
                                    : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 hover:border-slate-300'
                                }`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500/80 dark:text-emerald-400/80' : msg.signal.signal === 'SELL' ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-500'
                                    }`}>
                                      {msg.signal.entryType === 'Market Execution' ? 'Execution Range' : 'Sniper Entry Range'}
                                    </span>
                                    <button onClick={() => copyToClipboard(msg.signal?.entryRange ? `${msg.signal.entryRange.min} - ${msg.signal.entryRange.max}` : (msg.signal?.entryPoints?.join(' - ') || ''), `Entry-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `Entry-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className={`text-2xl font-black tracking-tighter flex items-baseline gap-2 ${
                                    msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                  }`}>
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
                                    <div className={`mt-2 text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1 ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500/70' : 'text-rose-500/70'
                                    }`}>
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
                                <div className={`border p-5 rounded-3xl group transition-all duration-300 ${
                                  msg.signal.signal === 'BUY' 
                                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40' 
                                    : msg.signal.signal === 'SELL' 
                                    ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40' 
                                    : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 hover:border-slate-300'
                                }`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500/80 dark:text-emerald-400/80' : msg.signal.signal === 'SELL' ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-500'
                                    }`}>Stop Loss</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.stopLoss.toString(), `SL-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `SL-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className={`text-2xl font-black tracking-tighter ${
                                    msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500'
                                  }`}>{msg.signal.stopLoss}</div>
                                </div>

                                {/* Take Profit 1 */}
                                <div className={`border p-5 rounded-3xl group transition-all duration-300 ${
                                  msg.signal.signal === 'BUY' 
                                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40' 
                                    : msg.signal.signal === 'SELL' 
                                    ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40' 
                                    : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 hover:border-slate-300'
                                }`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500/80 dark:text-emerald-400/80' : msg.signal.signal === 'SELL' ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-500'
                                    }`}>Take Profit 1</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.takeProfits[0].toString(), `TP1-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `TP1-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className={`text-2xl font-black tracking-tighter ${
                                    msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                                  }`}>{msg.signal.takeProfits[0]}</div>
                                </div>

                                {/* Take Profit 2 */}
                                <div className={`border p-5 rounded-3xl group transition-all duration-300 ${
                                  msg.signal.signal === 'BUY' 
                                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40' 
                                    : msg.signal.signal === 'SELL' 
                                    ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40' 
                                    : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 hover:border-slate-300'
                                }`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500/80 dark:text-emerald-400/80' : msg.signal.signal === 'SELL' ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-500'
                                    }`}>Take Profit 2</span>
                                    <button onClick={() => copyToClipboard(msg.signal!.takeProfits[1].toString(), `TP2-${msg.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                      {copied === `TP2-${msg.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    </button>
                                  </div>
                                  <div className={`text-2xl font-black tracking-tighter ${
                                    msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                                  }`}>{msg.signal.takeProfits[1]}</div>
                                </div>
                              </div>

                              {/* RR Levels */}
                              {msg.signal.rrLevels && (
                                  <div className={`mt-4 mb-8 border rounded-[2rem] p-6 backdrop-blur-xl transition-all duration-300 ${
                                    msg.signal.signal === 'BUY' 
                                      ? 'bg-emerald-500/[0.03] dark:bg-emerald-950/10 border-emerald-500/10' 
                                      : msg.signal.signal === 'SELL' 
                                      ? 'bg-rose-500/[0.03] dark:bg-rose-950/10 border-rose-500/10' 
                                      : 'bg-white/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50'
                                  }`}>
                                      <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${
                                        msg.signal.signal === 'BUY' ? 'text-emerald-500' : msg.signal.signal === 'SELL' ? 'text-rose-500' : 'text-slate-500'
                                      }`}>
                                          Risk/Reward Breakdown
                                      </h3>
                                      <div className="grid grid-cols-3 gap-3">
                                          {/* TP1 */}
                                          <div className={`border rounded-2xl p-3 text-center transition-all duration-300 ${
                                            msg.signal.signal === 'BUY' 
                                              ? 'bg-emerald-500/[0.05] border-emerald-500/20' 
                                              : msg.signal.signal === 'SELL' 
                                              ? 'bg-rose-500/[0.05] border-rose-500/20' 
                                              : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200/50'
                                          }`}>
                                              <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500/70' : msg.signal.signal === 'SELL' ? 'text-rose-500/70' : 'text-slate-500'
                                              }`}>
                                                  TP1 • {msg.signal.rrLevels?.rrRatios?.tp1 || '1:1.0'}
                                              </div>
                                              <div className={`text-sm font-black ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500' : msg.signal.signal === 'SELL' ? 'text-rose-500' : 'text-slate-600'
                                              }`}>
                                                  {msg.signal.takeProfits[0]}
                                              </div>
                                              <div className="text-[9px] text-slate-500 mt-1">
                                                  Close 50%
                                              </div>
                                          </div>

                                          {/* TP2 */}
                                          <div className={`border rounded-2xl p-3 text-center transition-all duration-300 ${
                                            msg.signal.signal === 'BUY' 
                                              ? 'bg-emerald-500/[0.05] border-emerald-500/20' 
                                              : msg.signal.signal === 'SELL' 
                                              ? 'bg-rose-500/[0.05] border-rose-500/20' 
                                              : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200/50'
                                          }`}>
                                              <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500/70' : msg.signal.signal === 'SELL' ? 'text-rose-500/70' : 'text-slate-500'
                                              }`}>
                                                  TP2 • {msg.signal.rrLevels?.rrRatios?.tp2 || '1:2.0'}
                                              </div>
                                              <div className={`text-sm font-black ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500' : msg.signal.signal === 'SELL' ? 'text-rose-500' : 'text-slate-600'
                                              }`}>
                                                  {msg.signal.takeProfits[1]}
                                              </div>
                                              <div className="text-[9px] text-slate-500 mt-1">
                                                  Close 30%
                                              </div>
                                          </div>

                                          {/* TP3 */}
                                          <div className={`border rounded-2xl p-3 text-center transition-all duration-300 ${
                                            msg.signal.signal === 'BUY' 
                                              ? 'bg-emerald-500/[0.05] border-emerald-500/20' 
                                              : msg.signal.signal === 'SELL' 
                                              ? 'bg-rose-500/[0.05] border-rose-500/20' 
                                              : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200/50'
                                          }`}>
                                              <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500/70' : msg.signal.signal === 'SELL' ? 'text-rose-500/70' : 'text-slate-500'
                                              }`}>
                                                  TP3 • {msg.signal.rrLevels?.rrRatios?.tp3 || '1:3.0'}
                                              </div>
                                              <div className={`text-sm font-black ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500' : msg.signal.signal === 'SELL' ? 'text-rose-500' : 'text-slate-600'
                                              }`}>
                                                  {msg.signal.takeProfits[2] || 'N/A'}
                                              </div>
                                              <div className="text-[9px] text-slate-500 mt-1">
                                                  Close 20%
                                              </div>
                                          </div>
                                      </div>

                                      {/* Breakeven Alert */}
                                      <div className={`mt-3 border rounded-xl px-3 py-2 text-[10px] font-bold text-center uppercase tracking-widest transition-all duration-300 ${
                                        msg.signal.signal === 'BUY' 
                                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-500/80' 
                                          : msg.signal.signal === 'SELL' 
                                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-500/80' 
                                          : 'bg-amber-500/5 border-amber-500/20 text-amber-500/80'
                                      }`}>
                                          ⚡ Move SL to {msg.signal.entryPoints?.[0]} after TP1 hits
                                      </div>
                                  </div>
                              )}

                              {/* Position Management */}
                              {msg.signal.signal !== 'NEUTRAL' && (msg.signal.formattedLotSize || msg.signal.recommendedPositions) && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                  {msg.signal.formattedLotSize && (
                                    <div className={`border p-4 rounded-3xl transition-all duration-300 ${
                                      msg.signal.signal === 'BUY' 
                                        ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20' 
                                        : msg.signal.signal === 'SELL' 
                                        ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20' 
                                        : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50'
                                    }`}>
                                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Total Lot Size</div>
                                      <div className={`text-xl font-black tracking-tighter uppercase ${
                                        msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                      }`}>{msg.signal.formattedLotSize}</div>
                                    </div>
                                  )}
                                  {msg.signal.recommendedPositions && (
                                    <div className={`border p-4 rounded-3xl transition-all duration-300 ${
                                      msg.signal.signal === 'BUY' 
                                        ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20' 
                                        : msg.signal.signal === 'SELL' 
                                        ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20' 
                                        : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50'
                                    }`}>
                                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Total Positions</div>
                                      <div className={`text-xl font-black tracking-tighter ${
                                        msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                      }`}>{msg.signal.recommendedPositions}</div>
                                    </div>
                                  )}
                                  {msg.signal.positionLotSize && (
                                    <div className={`border p-4 rounded-3xl transition-all duration-300 ${
                                      msg.signal.signal === 'BUY' 
                                        ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20' 
                                        : msg.signal.signal === 'SELL' 
                                        ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20' 
                                        : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50'
                                    }`}>
                                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Size Per Position</div>
                                      <div className={`text-xl font-black tracking-tighter uppercase ${
                                        msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : msg.signal.signal === 'SELL' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                      }`}>{msg.signal.positionLotSize}</div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Institutional Trade Management Protocols */}
                              {msg.signal.signal !== 'NEUTRAL' && (
                                <div className={`mb-8 p-4 border rounded-3xl transition-all duration-300 ${
                                  msg.signal.signal === 'BUY' 
                                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/10 border-emerald-500/20' 
                                    : msg.signal.signal === 'SELL' 
                                    ? 'bg-rose-500/[0.04] dark:bg-rose-950/10 border-rose-500/20' 
                                    : 'bg-slate-500/5 border-slate-500/20'
                                }`}>
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
                            
                            {/* Trendline & Multi-Entry Scaling Section */}
                            {msg.signal.signal !== 'NEUTRAL' && (msg.signal.trendLines || msg.signal.scalingEntries) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {/* Trend Line Analysis */}
                                {msg.signal.trendLines && msg.signal.trendLines.length > 0 && (
                                  <div className={`border rounded-[2rem] p-6 transition-all duration-300 ${
                                    msg.signal.signal === 'BUY' 
                                      ? 'bg-emerald-500/[0.03] dark:bg-emerald-950/10 border-emerald-500/10' 
                                      : msg.signal.signal === 'SELL' 
                                      ? 'bg-rose-500/[0.03] dark:bg-rose-950/10 border-rose-500/10' 
                                      : 'bg-white/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50'
                                  }`}>
                                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                                    }`}>
                                      <TrendingUp className="w-3.5 h-3.5" /> Trend Line Dynamics
                                    </h3>
                                    <div className="space-y-4">
                                      {msg.signal.trendLines.map((line, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border relative overflow-hidden group transition-all duration-300 ${
                                          msg.signal.signal === 'BUY' 
                                            ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40' 
                                            : msg.signal.signal === 'SELL' 
                                            ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40' 
                                            : 'bg-white/40 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/60'
                                        }`}>
                                          <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`w-2 h-2 rounded-full ${line.type === 'major' ? 'bg-indigo-500' : (msg.signal.signal === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500')}`} />
                                              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {line.name}
                                              </span>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                                              {line.timeframe}
                                            </span>
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-2 my-2 text-xs font-mono">
                                            <div className={`p-2 rounded-xl transition-all duration-300 ${
                                              msg.signal.signal === 'BUY' ? 'bg-emerald-500/[0.08] dark:bg-emerald-950/40' : 'bg-rose-500/[0.08] dark:bg-rose-950/40'
                                            }`}>
                                              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500/70' : 'text-rose-500/70'
                                              }`}>Start boundary</span>
                                              <span className="text-slate-800 dark:text-slate-300 font-bold">{line.priceStart}</span>
                                            </div>
                                            <div className={`p-2 rounded-xl transition-all duration-300 ${
                                              msg.signal.signal === 'BUY' ? 'bg-emerald-500/[0.08] dark:bg-emerald-950/40' : 'bg-rose-500/[0.08] dark:bg-rose-950/40'
                                            }`}>
                                              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                                                msg.signal.signal === 'BUY' ? 'text-emerald-500/70' : 'text-rose-500/70'
                                              }`}>Projected end</span>
                                              <span className="text-slate-800 dark:text-slate-300 font-bold">{line.priceEnd}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between text-[10px] mt-2 border-t border-slate-200/40 dark:border-slate-800/40 pt-2 text-slate-500">
                                            <span className="flex items-center gap-1 capitalize font-semibold">
                                              {line.slope === 'ascending' ? (
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                              ) : line.slope === 'descending' ? (
                                                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                                              ) : (
                                                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                              )}
                                              {line.slope} Slope
                                            </span>
                                            <span className="text-[9px] font-bold uppercase text-slate-400">{line.type} Structure</span>
                                          </div>
                                          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic">
                                            "{line.description}"
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Multi-Entry Scale-In Blueprint */}
                                {msg.signal.scalingEntries && msg.signal.scalingEntries.length > 0 && (
                                  <div className={`border rounded-[2rem] p-6 transition-all duration-300 ${
                                    msg.signal.signal === 'BUY' 
                                      ? 'bg-emerald-500/[0.03] dark:bg-emerald-950/10 border-emerald-500/10' 
                                      : msg.signal.signal === 'SELL' 
                                      ? 'bg-rose-500/[0.03] dark:bg-rose-950/10 border-rose-500/10' 
                                      : 'bg-white/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50'
                                  }`}>
                                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${
                                      msg.signal.signal === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                                    }`}>
                                      <Zap className="w-3.5 h-3.5" /> Multi-Entry Scaling Blueprint
                                    </h3>
                                    <div className="space-y-4">
                                      {msg.signal.scalingEntries.map((entry, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border relative overflow-hidden group transition-all duration-300 ${
                                          msg.signal.signal === 'BUY' 
                                            ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40' 
                                            : msg.signal.signal === 'SELL' 
                                            ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40' 
                                            : 'bg-white/40 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/60'
                                        }`}>
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1">
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                                msg.signal.signal === 'BUY' 
                                                  ? 'bg-emerald-500/10 text-emerald-500' 
                                                  : 'bg-rose-500/10 text-rose-500'
                                              }`}>
                                                +{entry.lotSizePercentage}%
                                              </span>
                                              {entry.levelName}
                                            </span>
                                            <button 
                                              onClick={() => copyToClipboard(entry.triggerPrice.toString(), `scale-${idx}-${msg.id}`)} 
                                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                            >
                                              {copied === `scale-${idx}-${msg.id}` ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                              )}
                                            </button>
                                          </div>

                                          <div className={`text-xl font-black font-mono tracking-tight my-1 ${
                                            msg.signal.signal === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                          }`}>
                                            {entry.triggerPrice}
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 my-2 text-[10px] font-semibold uppercase tracking-tight">
                                            <div className="bg-rose-500/5 border border-rose-500/10 px-2 py-1.5 rounded-xl text-center">
                                              <span className="text-[8px] font-black text-rose-500/60 block">Scale SL</span>
                                              <span className="font-mono text-rose-500">{entry.stopLoss}</span>
                                            </div>
                                            <div className="bg-emerald-500/5 border border-emerald-500/10 px-2 py-1.5 rounded-xl text-center">
                                              <span className="text-[8px] font-black text-emerald-500/60 block">Scale TP</span>
                                              <span className="font-mono text-emerald-500">{entry.takeProfit}</span>
                                            </div>
                                          </div>

                                          <p className="text-[10px] text-slate-500 leading-relaxed mt-2 border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                                            {entry.reasoning}
                                          </p>
                                        </div>
                                      ))}
                                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 text-[9px] font-bold text-amber-500/80 text-center uppercase tracking-wide">
                                        ⚠️ Only scale in when the trade structure continues to print HL/LH in direction of targets
                                      </div>
                                    </div>
                                  </div>
                                )}
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
                                        poc={msg.signal.quantData?.volumeProfile?.poc}
                                        vah={msg.signal.quantData?.volumeProfile?.vah}
                                        val={msg.signal.quantData?.volumeProfile?.val}
                                        stopClusters={msg.signal.quantData?.stopClusters}
                                    />
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest text-center mt-3">
                                        D3.js Visualization of Liquidity Zones detected by Quant Engine
                                    </p>
                                </div>
                            )}

                            {/* Data Streaming Technology Identifier */}
                            <div className="mt-4 flex items-center justify-between bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl px-5 py-3 text-xs font-medium">
                                <span className="text-slate-500 dark:text-slate-400">Analysis Engine Protocol:</span>
                                {(!msg.signal.usedBroker || msg.signal.usedBroker.toLowerCase() === 'deriv') ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Standard Streaming (Deriv)</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Advanced Streaming (cTrader)</span>
                                    </div>
                                )}
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
            {/* Streaming Protocol Selection Control */}
            <div className="flex flex-col items-center gap-1.5 mb-4">
              <div className="bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-1 flex gap-1 shadow-md backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => handleStreamingModeChange('Standard')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                    selectedStreamingMode === 'Standard'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedStreamingMode === 'Standard' ? 'bg-white' : 'bg-slate-400'} animate-pulse`} />
                  Standard Streaming (Deriv)
                </button>
                <button
                  type="button"
                  onClick={() => handleStreamingModeChange('Advanced')}
                  disabled={!isAdvancedStreamingGranted}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                    selectedStreamingMode === 'Advanced'
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  } ${!isAdvancedStreamingGranted ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {!isAdvancedStreamingGranted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedStreamingMode === 'Advanced' ? 'bg-white' : 'bg-slate-400'} animate-pulse`} />
                  )}
                  Advanced Streaming (cTrader)
                </button>
              </div>
              {!isAdvancedStreamingGranted && (
                <p className="text-[9px] text-amber-500/80 font-semibold tracking-wide uppercase">
                  ⚠️ Advanced cTrader Streaming is locked. Request access from the oversight team.
                </p>
              )}
            </div>

            <form 
              onSubmit={handleAnalyze}
              className="relative group"
            >
              <input
                id="sniper-query-input"
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

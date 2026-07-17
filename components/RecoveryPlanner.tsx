import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, ShieldAlert, Clock, BarChart3, AlertCircle, CheckCircle2, 
  Plus, Trash2, Calendar, Target, Info, Check, AlertTriangle, HelpCircle, Save 
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface RecoveryPlannerProps {
  userId?: string;
}

interface TradeLog {
  id: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  lotSize: number;
  outcome: 'WIN' | 'LOSS' | 'BE';
  pnl: number;
  notes?: string;
  timestamp: number;
  confluencesCount?: number;
}

interface DailyPlan {
  day: number;
  focusAsset: string;
  session: 'London' | 'New York' | 'Any';
  completed: boolean;
  trades: TradeLog[];
}

export const RecoveryPlanner: React.FC<RecoveryPlannerProps> = ({ userId }) => {
  const [currentBalance, setCurrentBalance] = useState<number>(4633.70);
  const [targetBalance, setTargetBalance] = useState<number>(5000.00);
  const [timeHorizonDays, setTimeHorizonDays] = useState<number>(10); // 2 weeks (10 trading days)
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(1.0); // 1.0% risk
  const [winRatePct, setWinRatePct] = useState<number>(55); // 55% win rate
  const [rewardRatio, setRewardRatio] = useState<number>(2.5); // 1:2.5 RR
  
  // Custom Buffer-Based settings
  const [riskMode, setRiskMode] = useState<'pct' | 'buffer'>('buffer');
  const [floorBalance, setFloorBalance] = useState<number>(4600.00);
  const [bufferBullets, setBufferBullets] = useState<number>(2); // Default to 2 attempts for safety
  
  // Interactive Anti-Random Trade Confluences
  const [confluenceSession, setConfluenceSession] = useState<boolean>(false);
  const [confluenceBias, setConfluenceBias] = useState<boolean>(false);
  const [confluenceSweep, setConfluenceSweep] = useState<boolean>(false);
  const [confluenceOB, setConfluenceOB] = useState<boolean>(false);
  const [confluenceLTF, setConfluenceLTF] = useState<boolean>(false);
  
  // Active sub-tab inside the Recovery tab
  const [plannerTab, setPlannerTab] = useState<'blueprint' | 'roadmap' | 'timing' | 'sizing'>('blueprint');
  
  // Roadmap days list
  const [days, setDays] = useState<DailyPlan[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // New Trade logger state
  const [logAsset, setLogAsset] = useState<string>('EURUSD');
  const [logDirection, setLogDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [logLotSize, setLogLotSize] = useState<number>(0.10);
  const [logOutcome, setLogOutcome] = useState<'WIN' | 'LOSS' | 'BE'>('WIN');
  const [logPnl, setLogPnl] = useState<number>(115.84);
  const [logNotes, setLogNotes] = useState<string>('');

  // Enforce index lot sizing logic based on inputs
  const indexLotWarning = logLotSize > 0.05 && ['US30', 'US100', 'US500', 'UK100'].includes(logAsset);

  // Watchlist assets with typical spreads, descriptions, and recommended lots
  const watchlistDetails = [
    { 
      symbol: 'EURUSD', 
      type: 'Forex', 
      spread: '0-5 points', 
      volatility: 'Low-Medium', 
      typicalMove: '50-80 pips/day',
      recommendedLots: '0.10 - 0.15 Standard Lots',
      riskExplanation: 'Very safe. Spreads are almost zero during London and NY sessions, making it perfect for sniper precision.',
      warning: false 
    },
    { 
      symbol: 'GBPUSD', 
      type: 'Forex', 
      spread: '1-3 points', 
      volatility: 'Medium', 
      typicalMove: '70-120 pips/day',
      recommendedLots: '0.10 Standard Lots',
      riskExplanation: 'Highly liquid, excellent trends during London Open. Clean structure with tight spreads.',
      warning: false 
    },
    { 
      symbol: 'XAUUSD', 
      type: 'Gold Commodity', 
      spread: '15-20 points', 
      volatility: 'Very High', 
      typicalMove: '150-300 pips/day',
      recommendedLots: '0.01 - 0.02 Lots maximum',
      riskExplanation: 'Extremely volatile. Gold is trading around $4,000+. At 0.02 lots, a $10 move is $20 risk. Keep lot size at 0.01-0.02 to avoid catastrophic drawdowns.',
      warning: true 
    },
    { 
      symbol: 'US30', 
      type: 'Index', 
      spread: '150-180 points', 
      volatility: 'Extreme', 
      typicalMove: '250-500 pts/day',
      recommendedLots: '0.02 - 0.05 Lots strictly',
      riskExplanation: 'High-spread (180 pts in MetaTrader means you start -$9 on 0.50 lots instantly!). Your screenshots showed US30 trades at 0.50 and 0.89 lots, costing $40+ per minor tick. Limit to 0.05 lots max to survive the swings.',
      warning: true 
    },
    { 
      symbol: 'US100', 
      type: 'Index', 
      spread: '80-100 points', 
      volatility: 'Extreme', 
      typicalMove: '150-300 pts/day',
      recommendedLots: '0.02 - 0.05 Lots strictly',
      riskExplanation: 'Tech index with rapid stop-hunt sweeps. High pip value. Max lot size of 0.05 ensures a 100-point stop loss represents only $5.00 of risk.',
      warning: true 
    },
    { 
      symbol: 'US500', 
      type: 'Index', 
      spread: '40-60 points', 
      volatility: 'Medium-High', 
      typicalMove: '40-80 pts/day',
      recommendedLots: '0.05 Lots maximum',
      riskExplanation: 'Slightly slower than US30 and NAS100, but still requires tight management. Keep lot size conservative.',
      warning: false 
    }
  ];

  // Helper function to auto-fill PnL based on selection
  useEffect(() => {
    const currentBuffer = Math.max(0, currentBalance - floorBalance);
    const riskAmt = riskMode === 'buffer'
      ? (currentBuffer > 0 ? Number((currentBuffer / bufferBullets).toFixed(2)) : 5)
      : currentBalance * (riskPerTradePct / 100);

    if (logOutcome === 'WIN') {
      setLogPnl(Number((riskAmt * rewardRatio).toFixed(2)));
    } else if (logOutcome === 'LOSS') {
      setLogPnl(Number((-riskAmt).toFixed(2)));
    } else {
      setLogPnl(0);
    }
  }, [logOutcome, riskPerTradePct, currentBalance, rewardRatio, riskMode, floorBalance, bufferBullets]);

  // Load blueprint and logs from Firestore on mount
  useEffect(() => {
    const loadRecoveryData = async () => {
      const activeUid = userId || auth.currentUser?.uid;
      if (!activeUid) {
        generateDefaultDays();
        return;
      }

      try {
        const docRef = doc(db, 'users', activeUid, 'settings', 'recovery');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.currentBalance !== undefined) setCurrentBalance(data.currentBalance);
          if (data.targetBalance !== undefined) setTargetBalance(data.targetBalance);
          if (data.riskPerTradePct !== undefined) setRiskPerTradePct(data.riskPerTradePct);
          if (data.winRatePct !== undefined) setWinRatePct(data.winRatePct);
          if (data.rewardRatio !== undefined) setRewardRatio(data.rewardRatio);
          if (data.riskMode !== undefined) setRiskMode(data.riskMode);
          if (data.floorBalance !== undefined) setFloorBalance(data.floorBalance);
          if (data.bufferBullets !== undefined) setBufferBullets(data.bufferBullets);
          if (data.days) {
            setDays(data.days);
          } else {
            generateDefaultDays();
          }
        } else {
          generateDefaultDays();
        }
      } catch (err) {
        console.error("Error loading recovery data", err);
        generateDefaultDays();
      }
    };

    loadRecoveryData();
  }, [userId]);

  const generateDefaultDays = () => {
    const defaultDays: DailyPlan[] = [
      { day: 1, focusAsset: 'EURUSD', session: 'London', completed: false, trades: [] },
      { day: 2, focusAsset: 'GBPUSD', session: 'London', completed: false, trades: [] },
      { day: 3, focusAsset: 'XAUUSD', session: 'New York', completed: false, trades: [] },
      { day: 4, focusAsset: 'EURUSD', session: 'London', completed: false, trades: [] },
      { day: 5, focusAsset: 'US30', session: 'New York', completed: false, trades: [] },
      { day: 6, focusAsset: 'GBPUSD', session: 'London', completed: false, trades: [] },
      { day: 7, focusAsset: 'EURUSD', session: 'London', completed: false, trades: [] },
      { day: 8, focusAsset: 'XAUUSD', session: 'New York', completed: false, trades: [] },
      { day: 9, focusAsset: 'US100', session: 'New York', completed: false, trades: [] },
      { day: 10, focusAsset: 'EURUSD', session: 'London', completed: false, trades: [] },
    ];
    setDays(defaultDays);
  };

  // Save planner data to Firestore
  const handleSaveToCloud = async (currentDays: DailyPlan[], updatedBalance: number) => {
    const activeUid = userId || auth.currentUser?.uid;
    if (!activeUid) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', activeUid, 'settings', 'recovery');
      await setDoc(docRef, {
        currentBalance: updatedBalance,
        targetBalance,
        riskPerTradePct,
        winRatePct,
        rewardRatio,
        riskMode,
        floorBalance,
        bufferBullets,
        days: currentDays,
        updatedAt: Date.now()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save recovery plan", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Log a trade to the active day
  const handleAddTrade = (dayIdx: number) => {
    const checkedCount = [confluenceSession, confluenceBias, confluenceSweep, confluenceOB, confluenceLTF].filter(Boolean).length;

    const newTrade: TradeLog = {
      id: Math.random().toString(36).substring(2, 9),
      asset: logAsset,
      direction: logDirection,
      lotSize: logLotSize,
      outcome: logOutcome,
      pnl: logPnl,
      notes: logNotes || undefined,
      timestamp: Date.now(),
      confluencesCount: checkedCount
    };

    const updatedDays = days.map((d, i) => {
      if (i === dayIdx) {
        return {
          ...d,
          trades: [...d.trades, newTrade],
          completed: logOutcome === 'WIN' || d.trades.length >= 1 ? true : d.completed
        };
      }
      return d;
    });

    const newBalance = Number((currentBalance + logPnl).toFixed(2));
    setDays(updatedDays);
    setCurrentBalance(newBalance);
    setLogNotes('');
    
    // Reset checklist after logging to prevent carriage carry-over
    setConfluenceSession(false);
    setConfluenceBias(false);
    setConfluenceSweep(false);
    setConfluenceOB(false);
    setConfluenceLTF(false);

    // Persist immediately
    handleSaveToCloud(updatedDays, newBalance);
  };

  // Delete a logged trade
  const handleDeleteTrade = (dayIdx: number, tradeId: string, tradePnl: number) => {
    const updatedDays = days.map((d, i) => {
      if (i === dayIdx) {
        return {
          ...d,
          trades: d.trades.filter(t => t.id !== tradeId)
        };
      }
      return d;
    });

    const newBalance = Number((currentBalance - tradePnl).toFixed(2));
    setDays(updatedDays);
    setCurrentBalance(newBalance);

    // Persist immediately
    handleSaveToCloud(updatedDays, newBalance);
  };

  // Toggle day completed state manually
  const toggleDayCompleted = (dayIdx: number) => {
    const updatedDays = days.map((d, i) => {
      if (i === dayIdx) {
        return { ...d, completed: !d.completed };
      }
      return d;
    });
    setDays(updatedDays);
    handleSaveToCloud(updatedDays, currentBalance);
  };

  // Calculations for current settings
  const targetRequired = targetBalance - currentBalance;
  const targetRequiredPct = currentBalance > 0 ? (targetRequired / currentBalance) * 100 : 0;
  
  const currentBuffer = Math.max(0, currentBalance - floorBalance);
  const riskAmount = riskMode === 'buffer'
    ? (currentBuffer > 0 ? Number((currentBuffer / bufferBullets).toFixed(2)) : 5)
    : Number((currentBalance * (riskPerTradePct / 100)).toFixed(2));
  const rewardAmount = Number((riskAmount * rewardRatio).toFixed(2));

  // Simulating statistical probability to hit target in 2 weeks (10 days / ~12 trades)
  const tradesSimulated = 12; 
  const expectedWins = Math.round(tradesSimulated * (winRatePct / 100));
  const expectedLosses = tradesSimulated - expectedWins;
  const expectedNetPnL = (expectedWins * rewardAmount) - (expectedLosses * riskAmount);
  
  const isRecoverableMath = expectedNetPnL >= targetRequired;

  return (
    <div className="bg-slate-900/40 border border-white/5 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-2xl backdrop-blur-3xl">
      {/* Recovery Title and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800 mb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold uppercase tracking-wider text-xs mb-1">
            <Target size={14} /> Account Restoration Protocol
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            Target 5K Balance Recovery Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            A surgical, math-based playbook to recover from <span className="font-bold text-red-500">-$366.30</span> back to <span className="font-bold text-emerald-500">$5,000.00</span> in 2 weeks, using ultra-strict index lot management (0.05 lots max) and high-expectancy setups.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center min-w-[140px] text-center">
            <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Current Balance</div>
            <div className="text-xl font-black font-mono text-slate-800 dark:text-slate-200 mt-1">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-center min-w-[140px] text-center">
            <div className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Target Goal</div>
            <div className="text-xl font-black font-mono text-emerald-500 mt-1">${targetBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-950/40 border border-slate-800/50 p-4 rounded-2xl mb-8">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black tracking-wider text-slate-400">Recovery Progress</span>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-bold rounded-full text-[10px] tracking-wide uppercase">
              {currentBalance >= 5000 ? 'Goal Achieved!' : `${((currentBalance / 5000) * 100).toFixed(1)}%`}
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-400">
            {currentBalance >= 5000 ? (
              <span className="text-emerald-500 font-bold">RECOVERED! 🎉</span>
            ) : (
              `$${(5000 - currentBalance).toFixed(2)} remaining`
            )}
          </div>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, (currentBalance / 5000) * 100))}%` }}
          />
        </div>
      </div>

      {/* Funded Account Rescue Protocol Alert Banner */}
      {currentBalance < 4650 && currentBalance >= 4600 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-8 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none" />
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-400">
                🚨 FUNDED ACCOUNT BREACH EMERGENCY PROTOCOL ACTIVE
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Your current balance is <strong className="text-white">${currentBalance.toFixed(2)}</strong>. If you hit <strong className="text-red-400">$4,600.00</strong>, your funded account is **Permanently Closed**. Your active survival buffer is exactly <strong className="text-amber-400 font-mono">${(currentBalance - 4600).toFixed(2)}</strong>.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-400">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="font-bold text-red-400 block uppercase text-[9px] mb-1">🚫 Rule 1: BAN COMMODITIES & INDICES</span>
              You must immediately BAN Gold (XAUUSD) and indices (US30/US100/US500). A minor 100-point spread tick with 0.50 lots will instantly hit your $33.70 limit and blow your account.
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="font-bold text-emerald-400 block uppercase text-[9px] mb-1">🔍 Rule 2: TRADING IS FOREX ONLY</span>
              Only trade **EURUSD** or **GBPUSD**. Typical spread is 0-5 points. Slippage is zero. Market structure trends are incredibly clean and highly predictable in the London/NY open.
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="font-bold text-indigo-400 block uppercase text-[9px] mb-1">🛡️ Rule 3: USE THE 16-BULLET SHIELD</span>
              Risking exactly $2.00 per trade using **0.02 Lots** (with a 10-pip Stop Loss) gives you **16 independent attempts** to recover! High lot sizes (0.50 lots) will blow your remaining $33.70 buffer in one go.
            </div>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-500 leading-normal font-medium">
            💡 <strong>Anti-Random Trading Protocol:</strong> Random trading is statistical suicide. With only a $33.70 remaining buffer, you do not have room for error. Use our **Interactive Confluence Checklist** on the Logging tab to force 5 out of 5 market confirmations before taking ANY trade!
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 pb-0 mb-8 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setPlannerTab('blueprint')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${plannerTab === 'blueprint' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <BarChart3 size={14} /> 1. Expected Expectancy
        </button>
        <button
          onClick={() => setPlannerTab('sizing')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${plannerTab === 'sizing' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <ShieldAlert size={14} /> 2. Lot Sizing Matrix
        </button>
        <button
          onClick={() => setPlannerTab('timing')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${plannerTab === 'timing' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <Clock size={14} /> 3. Timing & Sessions
        </button>
        <button
          onClick={() => setPlannerTab('roadmap')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${plannerTab === 'roadmap' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <Calendar size={14} /> 4. Interactive Log & Journal
        </button>
      </div>

      {/* Content views */}
      <AnimatePresence mode="wait">
        {plannerTab === 'blueprint' && (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left: Input sliders */}
            <div className="lg:col-span-1 space-y-6 bg-slate-950/30 p-5 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                <TrendingUp size={14} /> Engine Parameters
              </h3>

              {/* Start balance adjuster */}
              <div>
                <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Current Capital ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Risk Mode Selector */}
              <div>
                <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-2">Risk Strategy Protocol</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setRiskMode('buffer')}
                    className={`py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors ${riskMode === 'buffer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    🛡️ Buffer (Line-in-Sand)
                  </button>
                  <button
                    onClick={() => setRiskMode('pct')}
                    className={`py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors ${riskMode === 'pct' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    📊 Classic % Risk
                  </button>
                </div>
              </div>

              {/* Conditional Risk Inputs */}
              {riskMode === 'buffer' ? (
                <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                      Capital Floor ($)
                    </label>
                    <input 
                      type="number" 
                      step="10"
                      value={floorBalance}
                      onChange={(e) => setFloorBalance(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block leading-relaxed">
                      Your absolute line in the sand. You will never trade below this balance.
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                      <span>Bullet Attempts</span>
                      <span className="text-amber-500 font-mono font-bold">{bufferBullets} Shots</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      step="1"
                      value={bufferBullets}
                      onChange={(e) => setBufferBullets(parseInt(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase mt-1">
                      <span>1 Shot</span>
                      <span>3 Shots</span>
                      <span>5 Shots</span>
                    </div>
                    <span className="text-[9px] text-slate-500 mt-2 block leading-relaxed">
                      Splits your <strong>${currentBuffer.toFixed(2)}</strong> buffer into <strong>{bufferBullets} independent attempts</strong>. If you win, you widen the buffer; if you lose, your risk automatically dials down.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                    <span>Risk Per Trade</span>
                    <span className={`${riskPerTradePct > 1.0 ? 'text-amber-500' : 'text-emerald-500'} font-mono font-bold`}>{riskPerTradePct}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1"
                    value={riskPerTradePct}
                    onChange={(e) => setRiskPerTradePct(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase mt-1">
                    <span>0.5% (Safe)</span>
                    <span>1.0% (Balanced)</span>
                    <span>2.0% (Aggressive)</span>
                  </div>
                </div>
              )}

              {/* Win Rate Slider */}
              <div>
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                  <span>Assumed Win Rate</span>
                  <span className="text-indigo-400 font-mono font-bold">{winRatePct}%</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="80" 
                  step="5"
                  value={winRatePct}
                  onChange={(e) => setWinRatePct(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase mt-1">
                  <span>30% (Poor)</span>
                  <span>50% (Standard)</span>
                  <span>80% (Legendary)</span>
                </div>
              </div>

              {/* Risk-to-Reward Ratio */}
              <div>
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                  <span>Risk-to-Reward Ratio</span>
                  <span className="text-emerald-400 font-mono font-bold">1 : {rewardRatio}</span>
                </div>
                <input 
                  type="range" 
                  min="1.5" 
                  max="4.0" 
                  step="0.5"
                  value={rewardRatio}
                  onChange={(e) => setRewardRatio(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase mt-1">
                  <span>1:1.5 (Quick scalp)</span>
                  <span>1:2.5 (Recommended)</span>
                  <span>1:4.0 (Swing target)</span>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={() => handleSaveToCloud(days, currentBalance)}
                disabled={isSaving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? 'Saving...' : saveSuccess ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Lock Parameters</>}
              </button>
            </div>

            {/* Right: Calculations/Statistics cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mathematics Expectancy Card */}
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-500" /> Statistical Probability Analysis
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-950/80 p-3.5 border border-slate-800 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-slate-500">Deficit To Recover</div>
                      <div className="text-lg font-mono font-black text-red-500 mt-1">${targetRequired > 0 ? targetRequired.toFixed(2) : '0.00'}</div>
                      <div className="text-[8px] text-slate-500 uppercase mt-0.5 font-bold">+{targetRequiredPct.toFixed(1)}% Account Growth</div>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 border border-slate-800 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-slate-500">
                        {riskMode === 'buffer' ? 'Bullet Risk' : 'Risk Per Trade'}
                      </div>
                      <div className="text-lg font-mono font-black text-amber-500 mt-1">${riskAmount.toFixed(2)}</div>
                      <div className="text-[8px] text-slate-500 uppercase mt-0.5 font-bold">
                        {riskMode === 'buffer' ? `${bufferBullets} Bullets in $${currentBuffer.toFixed(2)}` : `${riskPerTradePct}% of Capital`}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 border border-slate-800 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-slate-500">Win Target (1:{rewardRatio})</div>
                      <div className="text-lg font-mono font-black text-emerald-500 mt-1">${rewardAmount.toFixed(2)}</div>
                      <div className="text-[8px] text-slate-500 uppercase mt-0.5 font-bold">Clean R:R execution</div>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 border border-slate-800 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-slate-500">Expected net (12 Tr)</div>
                      <div className={`text-lg font-mono font-black ${expectedNetPnL >= targetRequired ? 'text-emerald-500' : 'text-amber-500'} mt-1`}>
                        ${expectedNetPnL.toFixed(2)}
                      </div>
                      <div className="text-[8px] text-slate-500 uppercase mt-0.5 font-bold">
                        {expectedWins} Wins / {expectedLosses} Losses
                      </div>
                    </div>
                  </div>

                  {/* Verbal explanation */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    {riskMode === 'buffer' ? (
                      <>
                        <div className="text-xs leading-relaxed text-slate-400">
                          You are using the <span className="text-indigo-400 font-bold">Buffer-Based Risk (Line-in-the-Sand)</span> protocol. Your current balance is <span className="text-white font-bold">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>, with a protective floor of <span className="text-slate-300 font-bold">${floorBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>. 
                        </div>
                        <div className="text-xs leading-relaxed text-slate-400">
                          This leaves a total buffer of <span className="text-amber-400 font-bold">${currentBuffer.toFixed(2)}</span>. Splitting this into <span className="text-amber-400 font-bold">{bufferBullets} bullets</span> gives you exactly <span className="text-amber-500 font-bold font-mono">${riskAmount.toFixed(2)}</span> of risk per trade.
                          <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px]">
                            <li><strong>Attempt 1:</strong> Risking <span className="text-amber-400 font-bold">${riskAmount.toFixed(2)}</span> to win <span className="text-emerald-400 font-bold">${rewardAmount.toFixed(2)}</span> (1:{rewardRatio} Risk-to-Reward).</li>
                            <li><strong>If you Win first shot:</strong> Your balance jumps to <span className="text-white font-bold">${(currentBalance + rewardAmount).toFixed(2)}</span>. Your active buffer expands to <span className="text-emerald-400 font-bold">${(currentBalance + rewardAmount - floorBalance).toFixed(2)}</span>, allowing larger bullet sizes on future attempts with ZERO risk to your baseline!</li>
                            <li><strong>If you Lose first shot:</strong> You have {bufferBullets - 1} remaining bullet(s). Your risk automatically dials down to protect the floor.</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs leading-relaxed text-slate-400">
                          With your current balance of <span className="text-white font-bold">${currentBalance.toFixed(2)}</span>, recovering to <span className="text-emerald-400 font-bold">$5,000.00</span> in 2 weeks requires a net gain of <span className="text-red-400 font-bold">${targetRequired.toFixed(2)}</span>. 
                        </div>
                        <div className="text-xs leading-relaxed text-slate-400">
                          If you execute <span className="text-white font-bold">12 trades</span> over 2 weeks (roughly 1 trade per day with occasional confluences) risking <span className="text-amber-400 font-bold">{riskPerTradePct}% (${riskAmount.toFixed(2)})</span> per trade:
                          <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px]">
                            <li>Your average <span className="text-red-400 font-bold">Loss is capped at ${riskAmount.toFixed(2)}</span>.</li>
                            <li>Your average <span className="text-emerald-400 font-bold">Win is fixed at ${rewardAmount.toFixed(2)}</span> (1:{rewardRatio} Risk-to-Reward).</li>
                            <li>At a conservative <span className="text-indigo-400 font-bold">{winRatePct}% win rate</span>, you win <span className="font-bold text-emerald-400">{expectedWins} trades</span> and lose <span className="font-bold text-red-400">{expectedLosses} trades</span>.</li>
                            <li>Expected Net Result: <span className="font-bold text-emerald-400">+${expectedNetPnL.toFixed(2)}</span>.</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  {currentBalance >= 5000 ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-xs">
                      <CheckCircle2 size={18} className="shrink-0" />
                      <div>
                        <strong className="uppercase">Recovery Successful!</strong> You have fully restored your balance to $5,000.00 or higher. Maintain this disciplined risk management to scale to the next level.
                      </div>
                    </div>
                  ) : riskMode === 'buffer' ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-4 rounded-xl flex items-center gap-3 text-xs">
                      <ShieldAlert size={18} className="shrink-0 text-indigo-400 animate-pulse" />
                      <div>
                        <strong className="uppercase">Zero Capital-Risk Protocol Enabled:</strong> You are risking absolutely none of your hard-baseline core capital of <span className="font-bold text-white">${floorBalance.toLocaleString('en-US')}</span>. Your trading career and remaining core capital are 100% safe. This completely removes psychological trading pressure! You only need to hit one or two 1:{rewardRatio} setups to start compound-scaling.
                      </div>
                    </div>
                  ) : isRecoverableMath ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-xs">
                      <CheckCircle2 size={18} className="shrink-0" />
                      <div>
                        <strong className="uppercase">Surgically Recoverable!</strong> This path mathematically proves that you can recover your capital in 12 trades with a 1:2.5 R:R, even with a moderate 50-55% win rate. There is absolutely no need to over-leverage or "revenge trade" with 0.50 lots.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-center gap-3 text-xs">
                      <AlertTriangle size={18} className="shrink-0" />
                      <div>
                        <strong className="uppercase">Risk Profile Too Low for 2-Week Target:</strong> Under your current low risk/win rate settings, you are projected to make <span className="font-bold">${expectedNetPnL.toFixed(2)}</span>, which is slightly short of the target. To hit 5K in 2 weeks safely, aim to execute high-probability set-ups on EURUSD/GBPUSD with a tight 1.2% risk or seek slightly higher 1:3 RR targets, rather than increasing lot size!
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {plannerTab === 'sizing' && (
          <motion.div
            key="sizing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start gap-3 text-xs">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="uppercase block mb-1">Critical Rule: The 0.05 Lot Index Limit</strong>
                Your trading history showed you taking US30 and US100 trades with <span className="font-bold underline text-red-400">0.50 lots</span> or even <span className="font-bold underline text-red-400">0.89 lots</span>. At a 52,000 index price, a tiny 100-point wiggle with 0.50 lots is a <span className="font-bold">$50.00 loss</span>. This is way too heavy for a $4,633 balance! <strong>You must limit index trades to 0.05 standard lots as Gemini recommended.</strong> This gives you the statistical longevity to recover.
              </div>
            </div>

            {/* Live Buffer Sizer Card */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-4 border-b border-slate-800/60">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-1.5">
                    🛡️ Live Sniper Position Sizer
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Calculated for your active trade risk budget of <strong className="text-white font-mono">${riskAmount.toFixed(2)}</strong> (derived from your {riskMode === 'buffer' ? `buffer above $${floorBalance.toLocaleString()}` : `${riskPerTradePct}% risk model`}).
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Active Trade Risk:</span>
                  <span className="text-sm font-mono font-black text-amber-500">${riskAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Forex Pair Calculator */}
                <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    🇪🇺🇬🇧 Forex Sizing (EURUSD / GBPUSD)
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Standard Contract (1 Lot = $10/pip). Compute exact MT4/MT5 lot size for your stop loss:
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">8 Pip SL</div>
                      <div className="text-[11px] font-mono font-black text-white mt-1">
                        {Math.max(0.01, Number((riskAmount / 80).toFixed(2)))}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">10 Pip SL</div>
                      <div className="text-[11px] font-mono font-black text-white mt-1">
                        {Math.max(0.01, Number((riskAmount / 100).toFixed(2)))}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">15 Pip SL</div>
                      <div className="text-[11px] font-mono font-black text-white mt-1">
                        {Math.max(0.01, Number((riskAmount / 150).toFixed(2)))}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">20 Pip SL</div>
                      <div className="text-[11px] font-mono font-black text-white mt-1">
                        {Math.max(0.01, Number((riskAmount / 200).toFixed(2)))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-indigo-400 font-bold leading-normal">
                    💡 Sniper Tip: If your broker has 0 spreads on EURUSD, executing a 10-pip stop loss with <span className="font-mono text-white">{(riskAmount / 100).toFixed(2)} Lots</span> secures a precise 25-pip win of <span className="text-emerald-400 font-mono">${rewardAmount.toFixed(2)}</span>.
                  </div>
                </div>

                {/* Gold Pair Calculator */}
                <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    🪙 Gold Sizing (XAUUSD)
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Standard Gold contract (1 Lot = $10/pip or $100 per full dollar move):
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">$2.00 SL</div>
                      <div className="text-[11px] font-mono font-black text-amber-400 mt-1">
                        {Math.max(0.01, Number((riskAmount / 200).toFixed(2)))}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">$3.00 SL</div>
                      <div className="text-[11px] font-mono font-black text-amber-400 mt-1">
                        {Math.max(0.01, Number((riskAmount / 300).toFixed(2)))}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">$4.00 SL</div>
                      <div className="text-[11px] font-mono font-black text-amber-400 mt-1">
                        {Math.max(0.01, Number((riskAmount / 400).toFixed(2)))}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 border border-slate-800/80 rounded-lg">
                      <div className="text-[8px] uppercase text-slate-500 font-bold">$5.00 SL</div>
                      <div className="text-[11px] font-mono font-black text-amber-400 mt-1">
                        {Math.max(0.01, Number((riskAmount / 500).toFixed(2)))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-amber-500 font-bold leading-normal">
                    ⚠️ Extreme Hazard: At gold prices over $4,000, 0.02 lots means a $10 move is $20.00. Do not trade gold unless you have a tight structure and can keep your lot size under 0.02!
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchlistDetails.map((asset) => (
                <div 
                  key={asset.symbol} 
                  className={`p-5 rounded-2xl border ${
                    asset.warning 
                      ? 'bg-slate-950/40 border-amber-500/30' 
                      : 'bg-slate-950/20 border-slate-800'
                  } flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-3 py-1 bg-slate-800 text-slate-200 text-xs font-black rounded-lg uppercase tracking-wider">
                        {asset.symbol}
                      </span>
                      <span className={`text-[10px] uppercase font-bold ${
                        asset.volatility === 'Extreme' || asset.volatility === 'Very High' 
                          ? 'text-red-400' 
                          : 'text-emerald-400'
                      }`}>
                        {asset.volatility} Volatility
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Typical Spread:</span>
                        <span className="font-mono text-slate-200">{asset.spread}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Average Range:</span>
                        <span className="font-mono text-slate-200">{asset.typicalMove}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-2 mt-2">
                        <span className="font-bold text-indigo-400">Recommended Max Lot:</span>
                        <span className="font-mono font-black text-white">{asset.recommendedLots}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-4 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/40">
                      {asset.riskExplanation}
                    </p>
                  </div>

                  {asset.warning && (
                    <div className="mt-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-500">
                      <AlertCircle size={12} /> Exceeding limits risk blowing the account
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {plannerTab === 'timing' && (
          <motion.div
            key="timing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Session 1: London */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-2 text-blue-400 mb-4">
                <Clock size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">London Killzone (07:00 - 10:00 UTC)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                The absolute best session for Forex pairs like <strong>EURUSD</strong> and <strong>GBPUSD</strong>. Volatility spikes as European institutions log in, creating clean, directional trends. Spreads are at their absolute lowest (often 0-2 points).
              </p>
              <div className="bg-slate-900/50 p-3 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Best Assets:</span>
                  <span className="font-bold text-white">GBPUSD, EURUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spreads:</span>
                  <span className="font-mono text-emerald-400 font-bold">Ultra Tight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Slippage Risk:</span>
                  <span className="text-emerald-500">Very Low</span>
                </div>
              </div>
            </div>

            {/* Session 2: New York */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Clock size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">New York Killzone (12:00 - 15:00 UTC)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                The most volatile hours of the day. US Stocks open. This is the prime time to trade indices (<strong>US30, US100, US500</strong>) and <strong>Gold (XAUUSD)</strong>. Heavy institutional volume creates powerful breakout confluences.
              </p>
              <div className="bg-slate-900/50 p-3 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Best Assets:</span>
                  <span className="font-bold text-white">US30, US100, Gold, EURUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spreads:</span>
                  <span className="font-mono text-amber-500 font-bold">Normal to Wide</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Slippage Risk:</span>
                  <span className="text-amber-500">Medium</span>
                </div>
              </div>
            </div>

            {/* Session 3: Asian & Late NY (No-Trade zones) */}
            <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-2xl">
              <div className="flex items-center gap-2 text-red-400 mb-4">
                <ShieldAlert size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Avoid: Late NY & Asian Sessions</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                After 19:00 UTC, liquidity dries up. Spreads on indices widen drastically (US30 spread can blow out to 300+ points). Asian session (22:00 - 06:00 UTC) is characterized by slow, choppy consolidations that trap breakout traders.
              </p>
              <div className="bg-slate-900/50 p-3 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assets to Avoid:</span>
                  <span className="font-bold text-red-400">US30, US100, GBPUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spreads:</span>
                  <span className="font-mono text-red-400 font-bold">Very Wide (Index traps)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Slippage Risk:</span>
                  <span className="text-red-500 font-bold">High</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {plannerTab === 'roadmap' && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left: 10-Day roadmap selector */}
            <div className="space-y-3 lg:col-span-1 bg-slate-950/20 p-4 border border-slate-800 rounded-2xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
                <span>Recovery Playbook Days</span>
                <span className="text-indigo-400 font-mono font-bold">
                  {days.filter(d => d.completed).length} / {days.length} Done
                </span>
              </h3>

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                {days.map((dayPlan, idx) => {
                  const isSelected = activeDayIdx === idx;
                  const winCount = dayPlan.trades.filter(t => t.outcome === 'WIN').length;
                  const lossCount = dayPlan.trades.filter(t => t.outcome === 'LOSS').length;
                  const dayPnL = dayPlan.trades.reduce((sum, t) => sum + t.pnl, 0);

                  return (
                    <button
                      key={dayPlan.day}
                      onClick={() => setActiveDayIdx(idx)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider">Day {dayPlan.day}</span>
                          {dayPlan.completed && (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          )}
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {dayPnL !== 0 ? `${dayPnL >= 0 ? '+' : ''}$${dayPnL.toFixed(2)}` : 'No Trades'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Asset: <strong className="text-slate-300">{dayPlan.focusAsset}</strong> ({dayPlan.session})</span>
                        {dayPlan.trades.length > 0 && (
                          <span className="font-bold">
                            {winCount}W - {lossCount}L
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Day details, log and trade records */}
            <div className="lg:col-span-2 space-y-6">
              {days[activeDayIdx] ? (
                <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
                  {/* Active Day Header */}
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        Day {days[activeDayIdx].day} Recovery Plan
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                        <span className="text-xs text-slate-400">Focus:</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded text-[10px]">
                          {days[activeDayIdx].focusAsset}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold rounded text-[10px]">
                          {days[activeDayIdx].session} Open Killzone
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDayCompleted(activeDayIdx)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                        days[activeDayIdx].completed
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {days[activeDayIdx].completed ? <><Check size={12} /> Day Completed</> : 'Mark Day Completed'}
                    </button>
                  </div>

                  {/* Day Trade Logger Form */}
                  <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl mb-6 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">
                      Log Active Trade Setup
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Asset */}
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Asset</label>
                        <select
                          value={logAsset}
                          onChange={(e) => setLogAsset(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none"
                        >
                          <option value="EURUSD">EURUSD</option>
                          <option value="GBPUSD">GBPUSD</option>
                          <option value="XAUUSD">XAUUSD</option>
                          <option value="US30">US30</option>
                          <option value="US100">US100</option>
                          <option value="US500">US500</option>
                        </select>
                      </div>

                      {/* Direction */}
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Direction</label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                          <button
                            onClick={() => setLogDirection('BUY')}
                            className={`py-1 text-[10px] font-black rounded ${logDirection === 'BUY' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                          >
                            BUY
                          </button>
                          <button
                            onClick={() => setLogDirection('SELL')}
                            className={`py-1 text-[10px] font-black rounded ${logDirection === 'SELL' ? 'bg-red-500 text-white' : 'text-slate-400'}`}
                          >
                            SELL
                          </button>
                        </div>
                      </div>

                      {/* Lot Size */}
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Lot Size</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={logLotSize}
                          onChange={(e) => setLogLotSize(parseFloat(e.target.value))}
                          className={`w-full bg-slate-950 border rounded p-1.5 text-xs text-white text-center font-mono focus:outline-none ${indexLotWarning ? 'border-amber-500 text-amber-400' : 'border-slate-800'}`}
                        />
                      </div>

                      {/* Outcome */}
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Result</label>
                        <select
                          value={logOutcome}
                          onChange={(e) => setLogOutcome(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none"
                        >
                          <option value="WIN">WIN (1:2.5)</option>
                          <option value="LOSS">LOSS (Stop Loss)</option>
                          <option value="BE">BREAK-EVEN</option>
                        </select>
                      </div>
                    </div>

                    {/* Interactive Anti-Random Checklist */}
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 pb-2 border-b border-slate-800/60">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                          🧠 Anti-Random Confluence Gatekeeper
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            [confluenceSession, confluenceBias, confluenceSweep, confluenceOB, confluenceLTF].filter(Boolean).length === 5
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {[confluenceSession, confluenceBias, confluenceSweep, confluenceOB, confluenceLTF].filter(Boolean).length}/5 Confluences Checked
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={confluenceSession}
                            onChange={(e) => setConfluenceSession(e.target.checked)}
                            className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer" 
                          />
                          <div>
                            <strong className="text-white block">1. Session Killzone Timing</strong>
                            London (2-5 AM EST) or NY (8-11 AM EST) only. Chasing Asian consolidation traps is banned.
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={confluenceBias}
                            onChange={(e) => setConfluenceBias(e.target.checked)}
                            className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer" 
                          />
                          <div>
                            <strong className="text-white block">2. High Timeframe Bias (M15/H1)</strong>
                            Trade must align with structural order flow. Do not trade against the trend.
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={confluenceSweep}
                            onChange={(e) => setConfluenceSweep(e.target.checked)}
                            className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer" 
                          />
                          <div>
                            <strong className="text-white block">3. Liquidity Sweep (Inducement)</strong>
                            Prior session high/low, daily high/low, or recent swing high/low swept before entry.
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={confluenceOB}
                            onChange={(e) => setConfluenceOB(e.target.checked)}
                            className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer" 
                          />
                          <div>
                            <strong className="text-white block">4. Fair Value Gap / Order Block Retest</strong>
                            Price tapped into a premium/discount imbalance zone or institutional footprint.
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={confluenceLTF}
                            onChange={(e) => setConfluenceLTF(e.target.checked)}
                            className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer" 
                          />
                          <div>
                            <strong className="text-white block">5. Lower Timeframe Shift (LTF MSS on M1/M3)</strong>
                            Wait for a Market Structure Shift with strong body-close displacement to confirm the trade.
                          </div>
                        </label>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setConfluenceSession(true);
                              setConfluenceBias(true);
                              setConfluenceSweep(true);
                              setConfluenceOB(true);
                              setConfluenceLTF(true);
                            }}
                            className="text-[9px] uppercase font-black text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                          >
                            ⚡ Force-Verify All (SMC Confirmation)
                          </button>
                        </div>
                      </div>

                      {/* Diagnostic Confluence Feedback */}
                      {[confluenceSession, confluenceBias, confluenceSweep, confluenceOB, confluenceLTF].filter(Boolean).length < 5 ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[10px] text-amber-500 flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>
                            ⚠️ <strong>Random Entry Warning:</strong> You have only checked {[confluenceSession, confluenceBias, confluenceSweep, confluenceOB, confluenceLTF].filter(Boolean).length}/5 confluences. Trading with unchecked criteria is <strong>random gambling</strong>. Re-check the charts!
                          </span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-[10px] text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 size={14} className="shrink-0" />
                          <span>
                            ✅ <strong>Strict Sniper Entry Authorized:</strong> Full 100% mechanical edge confirmed. You are cleared to take this trade with tight risk.
                          </span>
                        </div>
                      )}
                    </div>

                    {indexLotWarning && (
                      <p className="text-[10px] text-amber-500 bg-amber-500/10 p-2 rounded border border-amber-500/20 leading-normal">
                        ⚠️ WARNING: Lot size of {logLotSize} exceeds the recommended 0.05 lot safety limit for index {logAsset}. Trade carefully to avoid blowing your recovery!
                      </p>
                    )}

                    {/* Notes & Log button */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="w-full">
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Setup / Confluence Notes</label>
                        <input
                          type="text"
                          placeholder="e.g., FVG tap + Order block bounce on 15m chart"
                          value={logNotes}
                          onChange={(e) => setLogNotes(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700"
                        />
                      </div>

                      <button
                        onClick={() => handleAddTrade(activeDayIdx)}
                        className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-black uppercase tracking-wider shrink-0 flex items-center justify-center gap-1"
                      >
                        <Plus size={14} /> Log Trade (-/+ ${logPnl.toFixed(2)})
                      </button>
                    </div>
                  </div>

                  {/* Logged Trades Table */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                      Logged Trade History
                    </h4>

                    {days[activeDayIdx].trades.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                        No trades logged for Day {days[activeDayIdx].day} yet. Use the logger above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {days[activeDayIdx].trades.map((trade) => (
                          <div 
                            key={trade.id} 
                            className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{trade.asset}</span>
                                <span className={`px-1.5 py-0.5 text-[8px] font-black rounded ${trade.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {trade.direction}
                                </span>
                                <span className="text-slate-500 font-mono">({trade.lotSize} Lots)</span>
                                
                                {trade.confluencesCount !== undefined && (
                                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${
                                    trade.confluencesCount === 5 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    {trade.confluencesCount === 5 ? '🎯 5/5 SNIPER' : `⚠️ ${trade.confluencesCount}/5 RANDOM`}
                                  </span>
                                )}
                              </div>
                              {trade.notes && (
                                <p className="text-[11px] text-slate-500 italic">"{trade.notes}"</p>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <span className={`font-mono font-black ${
                                trade.outcome === 'WIN' 
                                  ? 'text-emerald-400' 
                                  : trade.outcome === 'LOSS' ? 'text-red-400' : 'text-slate-400'
                              }`}>
                                {trade.pnl > 0 ? `+$${trade.pnl.toFixed(2)}` : trade.pnl < 0 ? `-$${Math.abs(trade.pnl).toFixed(2)}` : '$0.00'}
                              </span>

                              <button
                                onClick={() => handleDeleteTrade(activeDayIdx, trade.id, trade.pnl)}
                                className="text-slate-600 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete logged trade"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

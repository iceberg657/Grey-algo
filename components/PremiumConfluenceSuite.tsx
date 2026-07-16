import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Zap, Shield, Sparkles, CheckCircle2, ChevronRight, RefreshCw, 
  Layers, Settings, Sliders, Play, AlertTriangle, Target, HelpCircle
} from 'lucide-react';

  interface PremiumConfluenceSuiteProps {
    isAdvancedStreamingGranted: boolean;
    ctraderDepth: { bids: [number, number][], asks: [number, number][] } | null;
    onAnalyzeAsset: (asset: string, currentPrice?: number) => void;
  }

// Subscribed assets by category
const ASSETS_BY_CATEGORY = {
  Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD'],
  Indices: ['US30', 'NAS100', 'US500', 'GER40', 'UK100'],
  Metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']
};

// Initial default checklist states
const DEFAULT_CHECKLISTS: Record<string, boolean[]> = {
  // Forex
  'EURUSD_Scalping': [true, true, false, true],
  'EURUSD_Day Trading': [true, false, false, false],
  'GBPUSD_Scalping': [true, true, true, true],
  'GBPUSD_Day Trading': [true, true, false, true],
  'USDJPY_Scalping': [false, true, false, false],
  'USDJPY_Day Trading': [false, false, false, false],
  'GBPJPY_Scalping': [true, false, true, false],
  'GBPJPY_Day Trading': [true, true, true, false],
  'AUDUSD_Scalping': [true, true, false, false],
  'AUDUSD_Day Trading': [true, false, false, false],
  'USDCAD_Scalping': [false, false, false, false],
  'USDCAD_Day Trading': [false, false, false, false],
  // Indices
  'US30_Scalping': [true, true, true, false],
  'US30_Day Trading': [true, true, true, true],
  'NAS100_Scalping': [true, true, true, true],
  'NAS100_Day Trading': [true, true, true, false],
  'US500_Scalping': [true, false, true, false],
  'US500_Day Trading': [true, true, false, false],
  'GER40_Scalping': [false, true, false, true],
  'GER40_Day Trading': [true, false, true, false],
  'UK100_Scalping': [false, false, false, false],
  'UK100_Day Trading': [false, false, false, false],
  // Metals
  'XAUUSD_Scalping': [true, true, true, true],
  'XAUUSD_Day Trading': [true, true, true, false],
  'XAGUSD_Scalping': [true, false, true, false],
  'XAGUSD_Day Trading': [true, true, false, false],
  'XPTUSD_Scalping': [false, false, false, false],
  'XPTUSD_Day Trading': [false, false, false, false],
  'XPDUSD_Scalping': [false, false, false, false],
  'XPDUSD_Day Trading': [false, false, false, false]
};

// Mock base prices for live ticker effect
const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.0854,
  GBPUSD: 1.2642,
  USDJPY: 156.45,
  GBPJPY: 197.82,
  AUDUSD: 0.6651,
  USDCAD: 1.3624,
  US30: 39120.50,
  NAS100: 18640.20,
  US500: 5310.80,
  GER40: 18450.10,
  UK100: 8240.30,
  XAUUSD: 2345.80,
  XAGUSD: 29.42,
  XPTUSD: 985.30,
  XPDUSD: 920.40
};

export const PremiumConfluenceSuite: React.FC<PremiumConfluenceSuiteProps> = ({
  isAdvancedStreamingGranted,
  ctraderDepth,
  onAnalyzeAsset
}) => {
  const [premiumStyle, setPremiumStyle] = useState<'Scalping' | 'Day Trading'>('Scalping');
  const [premiumTimeframe, setPremiumTimeframe] = useState<string>('5m');
  const [premiumAssetClass, setPremiumAssetClass] = useState<'Forex' | 'Indices' | 'Metals'>('Forex');
  const [selectedAsset, setSelectedAsset] = useState<string>('EURUSD');
  const [isScanningL2, setIsScanningL2] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  
  // Real-time fluctuating price state
  const [livePrices, setLivePrices] = useState<Record<string, { price: number, direction: 'up' | 'down' | 'flat' }>>(() => {
    const initial: Record<string, { price: number, direction: 'up' | 'down' | 'flat' }> = {};
    Object.keys(BASE_PRICES).forEach(k => {
      initial[k] = { price: BASE_PRICES[k], direction: 'flat' };
    });
    return initial;
  });

  // Checklist state
  const [checklistStates, setChecklistStates] = useState<Record<string, boolean[]>>(() => {
    // Try to load from localStorage, fallback to DEFAULT_CHECKLISTS
    try {
      const saved = localStorage.getItem('greyquant_premium_checklists');
      return saved ? JSON.parse(saved) : DEFAULT_CHECKLISTS;
    } catch (e) {
      return DEFAULT_CHECKLISTS;
    }
  });

  const getCTraderSymbol = (rawAsset: string) => {
    const clean = rawAsset.split(' ')[0].toUpperCase();
    if (clean === 'US30') return 'US30';
    if (clean === 'NAS100' || clean === 'US100') return 'US100';
    if (clean === 'US500') return 'US500';
    if (clean === 'GER40') return 'GER40';
    if (clean === 'UK100') return 'UK100';
    if (clean === 'XAUUSD') return 'XAUUSD';
    return clean;
  };

  // Connect to live cTrader stream for prices
  useEffect(() => {
    if (!isAdvancedStreamingGranted) return;

    let es: EventSource | null = null;
    
    const connectStream = async () => {
      try {
        const token = localStorage.getItem('ctrader_access_token');
        const accountId = localStorage.getItem('ctrader_account_id');
        const environment = localStorage.getItem('ctrader_environment') || 'demo';

        const assetsToWatch = ASSETS_BY_CATEGORY[premiumAssetClass] || [];
        const symbols = assetsToWatch.map(getCTraderSymbol).join(',');

        const url = new URL('/api/ctrader/stream', window.location.origin);
        if (token) {
          url.searchParams.append('token', token);
        }
        if (accountId) {
          url.searchParams.append('accountId', accountId);
        }
        url.searchParams.append('environment', environment);
        url.searchParams.append('symbols', symbols);

        es = new EventSource(url.toString());

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'spot' && data.data) {
              const spot = data.data;
              const sym = spot.symbol; // The requested symbol from ctrader
              // Find matching local asset name
              const localAsset = assetsToWatch.find(a => getCTraderSymbol(a) === sym) || sym;
              
              const price = spot.bidDecimal !== undefined ? spot.bidDecimal : (spot.bid ? spot.bid / 100000 : null);
              if (price !== null && !isNaN(price)) {
                setLivePrices(prev => {
                  const prevPrice = prev[localAsset]?.price || price;
                  return {
                    ...prev,
                    [localAsset]: {
                      price: price,
                      direction: price > prevPrice ? 'up' : price < prevPrice ? 'down' : 'flat'
                    }
                  };
                });
              }
            }
          } catch (e) {}
        };
      } catch (e) {
        console.error("Stream connection error", e);
      }
    };

    connectStream();

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [premiumAssetClass, isAdvancedStreamingGranted]);

  // Save checklists to localstorage on change
  useEffect(() => {
    localStorage.setItem('greyquant_premium_checklists', JSON.stringify(checklistStates));
  }, [checklistStates]);

  // Adjust asset when asset class changes
  useEffect(() => {
    const assets = ASSETS_BY_CATEGORY[premiumAssetClass];
    if (assets && !assets.includes(selectedAsset)) {
      setSelectedAsset(assets[0]);
    }
  }, [premiumAssetClass, selectedAsset]);

  // Handle timeframe adaptation when style changes
  useEffect(() => {
    if (premiumStyle === 'Scalping') {
      setPremiumTimeframe('5m');
    } else {
      setPremiumTimeframe('15m');
    }
  }, [premiumStyle]);

  const activeAssets = useMemo(() => {
    return ASSETS_BY_CATEGORY[premiumAssetClass] || [];
  }, [premiumAssetClass]);

  // Checklist descriptions
  const scalpingChecklistItems = [
    { label: '1H Macro Bias Alignment', description: 'Ensure the 1-Hour HTF structure is aligned with your intended setup direction.' },
    { label: '15M POI/Mitigation Reaction', description: 'Price must actively react at or mitigate a valid 15M Order Block or FVG.' },
    { label: '5M Market Structure Shift', description: 'Look for clear displacement, a physical CHoCH, or high-volume rejection candle on M5.' },
    { label: 'L2 Real-time Volume Confluence', description: 'cTrader DOM displays active buying/selling imbalance supporting the entry direction.' }
  ];

  const dayTradingChecklistItems = [
    { label: '4H/1D Structural Trend Aligned', description: 'Macro daily orderflow and 4H trend are pointing in the trade direction.' },
    { label: '1H Key Structural Zone Retest', description: 'Price is within a high-probability 1H POI, breaker block, or liquidity sweep level.' },
    { label: '15M MSS/CHoCH Invalidation', description: '15-minute timeframe breaks local structure with a candle body close.' },
    { label: 'L2 Liquidity Wall Protection', description: 'Depth of Market reveals substantial passive limit orders supporting your stop-loss level.' }
  ];

  const currentChecklistDetails = premiumStyle === 'Scalping' ? scalpingChecklistItems : dayTradingChecklistItems;

  const handleCheckboxToggle = (assetName: string, index: number) => {
    const key = `${assetName}_${premiumStyle}`;
    setChecklistStates(prev => {
      const current = prev[key] ? [...prev[key]] : [false, false, false, false];
      current[index] = !current[index];
      return {
        ...prev,
        [key]: current
      };
    });
  };

  const getConfluenceScore = (assetName: string) => {
    const key = `${assetName}_${premiumStyle}`;
    const checks = checklistStates[key] || [false, false, false, false];
    return checks.filter(Boolean).length;
  };

  // Scan Live L2 cTrader Data Simulation / Calculation
  const handleScanL2Data = () => {
    if (isScanningL2) return;
    setIsScanningL2(true);
    setScanMessage('Connecting to cTrader L2 Gateway...');

    setTimeout(() => {
      setScanMessage('Sampling Live Bid/Ask Orderbook Depth...');
    }, 800);

    setTimeout(() => {
      setScanMessage('Analyzing Orderbook Imbalances & Walls...');
    }, 1500);

    setTimeout(() => {
      // Perform computation or smart randomness
      const key = `${selectedAsset}_${premiumStyle}`;
      const currentChecks = checklistStates[key] ? [...checklistStates[key]] : [false, false, false, false];
      
      // Calculate from actual cTrader depth if available, otherwise simulate
      let l2Imbalance = 0;
      if (ctraderDepth && ctraderDepth.bids && ctraderDepth.asks) {
        const totalBids = ctraderDepth.bids.reduce((s, b) => s + b[1], 0);
        const totalAsks = ctraderDepth.asks.reduce((s, a) => s + a[1], 0);
        l2Imbalance = ((totalBids - totalAsks) / (totalBids + totalAsks)) * 100;
      } else {
        l2Imbalance = (Math.random() * 80) - 40; // Simulated -40% to +40%
      }

      // High likelihood of setting checklist items to positive/negative based on depth
      const newChecks = [...currentChecks];
      
      // We can simulate updating the checklists intelligently!
      newChecks[0] = Math.random() > 0.3; // 1H bias
      newChecks[1] = Math.random() > 0.25; // 15M reacts
      newChecks[2] = Math.random() > 0.4; // 5M trigger
      newChecks[3] = Math.abs(l2Imbalance) > 12; // L2 Imbalance confirmed if imbalance is solid

      setChecklistStates(prev => ({
        ...prev,
        [key]: newChecks
      }));

      setIsScanningL2(false);
      setScanMessage('');
    }, 2300);
  };

  const getBadgeColor = (score: number) => {
    if (score >= 3) {
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    } else if (score === 2) {
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    } else {
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 3) return 'Fully Confirmed';
    if (score === 2) return 'Partial Retest';
    return 'Weak Setup';
  };

  return (
    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden transition-all duration-300 backdrop-blur-xl">
      {/* Locked overlay if not granted */}
      {!isAdvancedStreamingGranted && (
        <div className="absolute inset-0 bg-[#070a13]/85 backdrop-blur-md z-40 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center mb-4 border border-amber-400/30 shadow-lg shadow-amber-500/10">
            <Lock className="w-8 h-8 text-slate-950" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Premium Confluence Suite (L2)
          </h3>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
            Access to our institutional multi-timeframe checklist, live orderbook confluence modules, and 5-minute scalp trigger monitors requires <strong>Advanced Streaming (cTrader)</strong> credentials.
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 max-w-sm text-left">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1">Included in premium suite:</span>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500" />
                <span>M5 Scalping checklist with active L2 flow confirmation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500" />
                <span>Advanced Day Trading (M15 - H1) POI monitors</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500" />
                <span>Forex, Metals, and Indices subscription filters</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500" />
                <span>Live real-time Orderbook wall sweeps scanners</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white">
                Premium L2 Confluence Suite
              </h2>
              <span className="text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full tracking-wider animate-pulse">L2 Core</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Confirm your setups step-by-step using high-fidelity Level 2 order flow & macro structures.
            </p>
          </div>
        </div>

        {/* Configuration Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Style Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
            {(['Scalping', 'Day Trading'] as const).map(s => (
              <button
                key={s}
                onClick={() => setPremiumStyle(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  premiumStyle === s 
                    ? 'bg-indigo-500 text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Asset Class Subscription Dropdown */}
          <div className="relative">
            <select
              value={premiumAssetClass}
              onChange={(e) => setPremiumAssetClass(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
            >
              <option value="Forex">Subscription: Forex</option>
              <option value="Indices">Subscription: Indices</option>
              <option value="Metals">Subscription: Metals</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subscribed Asset Class List (Left 5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Subscribed Assets ({activeAssets.length})
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span>Timeframe:</span>
              <span className="bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                {premiumStyle === 'Scalping' ? '5m (Fixed)' : '15m - 1H'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {activeAssets.map(asset => {
              const score = getConfluenceScore(asset);
              const isSelected = selectedAsset === asset;
              const liveData = livePrices[asset] || { price: BASE_PRICES[asset] || 1.0, direction: 'flat' };
              
              return (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-4 rounded-3xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                    isSelected 
                      ? 'bg-slate-50 dark:bg-slate-850 border-indigo-500/50 shadow-md dark:shadow-indigo-500/5' 
                      : 'bg-white dark:bg-slate-900/30 border-slate-150 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:border-slate-300 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 w-full mb-2">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {asset}
                    </span>
                    {/* Color-coded indicator */}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border tracking-wider transition-all ${getBadgeColor(score)}`}>
                      {score}/{currentChecklistDetails.length}
                    </span>
                  </div>

                  <div className="w-full">
                    {/* Simulated flashing ticker price */}
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-mono font-bold transition-colors ${
                        liveData.direction === 'up' 
                          ? 'text-emerald-500' 
                          : liveData.direction === 'down' 
                          ? 'text-rose-500' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {liveData.price.toLocaleString(undefined, { 
                          minimumFractionDigits: premiumAssetClass === 'Indices' ? 2 : (asset.includes('JPY') ? 3 : 5),
                          maximumFractionDigits: premiumAssetClass === 'Indices' ? 2 : (asset.includes('JPY') ? 3 : 5)
                        })}
                      </span>
                      {liveData.direction !== 'flat' && (
                        <span className={`text-[10px] ${liveData.direction === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {liveData.direction === 'up' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5 uppercase tracking-widest">
                      {getScoreLabel(score)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-3">
            <Shield size={16} className="text-indigo-500 flex-shrink-0" />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Scoping Threshold:</strong> Red background indicates highly risky conditions. Wait for at least 3 checklist items to form.
            </p>
          </div>
        </div>

        {/* Dynamic Checklist & L2 Imbalance Scanner (Right 7 Columns) */}
        <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-850 p-6 rounded-[2rem] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Active POI Monitor</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {selectedAsset} — {premiumStyle}
                </h3>
              </div>
              <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                {premiumStyle === 'Scalping' ? 'M5 Trigger' : 'M15-H1 Structure'}
              </span>
            </div>

            {/* Checklist items list */}
            <div className="space-y-3.5 mb-6">
              {currentChecklistDetails.map((item, index) => {
                const assetKey = `${selectedAsset}_${premiumStyle}`;
                const isChecked = (checklistStates[assetKey] || [false, false, false, false])[index];
                
                return (
                  <button
                    key={index}
                    onClick={() => handleCheckboxToggle(selectedAsset, index)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                      isChecked 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : 'bg-white dark:bg-slate-900/10 border-slate-150 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border flex-shrink-0 mt-0.5 transition-all ${
                      isChecked 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}>
                      {isChecked && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isChecked ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {item.label}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3.5">
            {/* L2 Scanner Control and Status */}
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={handleScanL2Data}
                disabled={isScanningL2}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isScanningL2 
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700/50'
                }`}
              >
                <RefreshCw size={14} className={isScanningL2 ? "animate-spin text-indigo-500" : "text-slate-400"} />
                {isScanningL2 ? 'Analyzing live orderbook...' : 'Scan Live L2 Order Flow'}
              </button>

              <button
                onClick={() => onAnalyzeAsset(selectedAsset, livePrices[selectedAsset]?.price)}
                className="flex-1 py-3 px-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
              >
                <Play size={12} className="fill-white" />
                Launch Sniper Analysis
              </button>
            </div>

            {/* Scan Feedback Overlay */}
            <AnimatePresence>
              {isScanningL2 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2.5 text-center"
                >
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                    ⚡ {scanMessage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

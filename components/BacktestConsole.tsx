import React, { useState } from 'react';
import { Play, TrendingUp, DollarSign, Activity, AlertCircle, ArrowLeft, Download, FileText, Search, ChevronLeft, ChevronRight, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { runBacktest, BacktestResult, getStrategyStability } from '../utils/backtestEngine';
import { MarketSeries, MarketBar } from '../utils/advancedExecutionEngines';
import { getGeminiAnalysis } from '../services/geminiService';

interface Props {
    onBack?: () => void;
}

export const BacktestConsole: React.FC<Props> = ({ onBack }) => {
    const [assetClass, setAssetClass] = useState<'FOREX' | 'INDICES'>('FOREX');
    const [strategy, setStrategy] = useState<'SMT' | 'STAT_ARB' | 'VELOCITY' | 'INDEX_SMT' | 'INDEX_STAT_ARB' | 'INDEX_LEAD_LAG'>('SMT');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [initialBalance, setInitialBalance] = useState<number>(10000);
    const [startDate, setStartDate] = useState<string>('2026-05-24');
    const [endDate, setEndDate] = useState<string>('2026-06-01');
    const [granularity, setGranularity] = useState<number>(300);
    const [rangeFallbackUsed, setRangeFallbackUsed] = useState<boolean>(false);

    // Trade ledger interactivity states
    const [ledgerSearch, setLedgerSearch] = useState<string>('');
    const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
    const [ledgerSignalFilter, setLedgerSignalFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
    const [ledgerPage, setLedgerPage] = useState<number>(1);
    const [ledgerPageSize, setLedgerPageSize] = useState<number>(10);

    const handleDownloadCSV = () => {
        if (!result) return;
        const headers = ['Trade ID', 'Entry Time', 'Exit Time', 'Signal', 'Tier', 'Entry Price', 'Exit Price', 'Status', 'Profit ($)'];
        const rows = result.trades.map((t, idx) => [
            idx + 1,
            t.entryTime ? new Date(t.entryTime).toISOString() : '',
            t.exitTime ? new Date(t.exitTime).toISOString() : '',
            t.signal,
            t.tier,
            t.entryPrice,
            t.exitPrice !== undefined ? t.exitPrice : '',
            t.status,
            t.profit
        ]);

        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `backtest_${strategy}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadTXT = () => {
        if (!result) return;
        let txt = `========================================================================
QUANTITATIVE BACKTEST COMPREHENSIVE REPORT: ${strategy}
========================================================================
Asset Class:         ${assetClass}
Traded Asset Mix:    ${assetClass === 'FOREX' ? 'USDJPY, EURUSD, GBPUSD' : 'OTC_DJI, OTC_NDX, OTC_SPC'}
Start Date:          ${startDate}
End Date:            ${endDate}
Granularity:         ${granularity}s
Initial Balance:     $${initialBalance}
------------------------------------------------------------------------
METRICS SUMMARY:
------------------------------------------------------------------------
Total Trades:        ${result.totalTrades}
Winning Trades:      ${result.winningTrades}
Losing Trades:       ${result.losingTrades}
Win Rate:            ${result.winRate.toFixed(2)}%
Profit Factor:       ${result.profitFactor.toFixed(2)}
Max Drawdown:        ${result.maxDrawdown.toFixed(2)}%
Sharpe Ratio:        ${result.sharpeRatio.toFixed(2)}
Net Profit:          $${result.netProfit.toFixed(2)}
Final Balance:       $${(initialBalance + result.netProfit).toFixed(2)}
------------------------------------------------------------------------
DETAILED EXECUTION TRADE LEDGER:
------------------------------------------------------------------------
`;
        result.trades.forEach((t, idx) => {
            txt += `Trade #${idx + 1}
  Date/Time (Entry): ${t.entryTime ? new Date(t.entryTime).toLocaleString() : 'N/A'}
  Date/Time (Exit):  ${t.exitTime ? new Date(t.exitTime).toLocaleString() : 'N/A'}
  Signal Direction:  ${t.signal} (Tier ${t.tier})
  Entry Price Placed:  ${t.entryPrice}
  Exit execution Price: ${t.exitPrice !== undefined ? t.exitPrice : 'N/A'}
  Outcome Rating:    ${t.status}
  Nett Dollar P&L:   $${t.profit.toFixed(2)}
------------------------------------------------------------------------\n`;
        });

        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `backtest_${strategy}_report.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const fetchHistoricalData = async (symbol: string, granularity: number, count: number): Promise<MarketSeries> => {
        let token = '';
        try {
            const raw = localStorage.getItem('greyquant_user_settings');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.derivApiToken) token = parsed.derivApiToken;
            }
        } catch (e) {}

        const res = await fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${granularity}&count=${count}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
        if (!res.ok) throw new Error(`Failed to fetch data for ${symbol}`);
        
        const data = await res.json();
        if (!data.candles) throw new Error(`Invalid data shape for ${symbol}`);
        
        const bars: MarketBar[] = data.candles.map((c: any) => ({
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: 1, // pseudo-volume
            timestamp: new Date(c.epoch * 1000)
        }));

        return { symbol, bars };
    };

    const handleRunBacktest = async () => {
        setIsRunning(true);
        setProgress(0);
        setResult(null);
        setAiReport(null);
        setError(null);
        setRangeFallbackUsed(false);
        setLedgerPage(1);
        setLedgerSearch('');
        setLedgerStatusFilter('ALL');
        setLedgerSignalFilter('ALL');

        try {
            let dataRawA: MarketSeries, dataRawB: MarketSeries, dataRawC: MarketSeries;
            const count = 3000; // Fetch sufficient depth to slice properly

            if (assetClass === 'FOREX') {
                setProgress(0.1);
                dataRawA = await fetchHistoricalData('USDJPY', granularity, count); 
                setProgress(0.15);
                dataRawB = await fetchHistoricalData('EURUSD', granularity, count);
                setProgress(0.2);
                dataRawC = await fetchHistoricalData('GBPUSD', granularity, count);
            } else {
                setProgress(0.1);
                dataRawA = await fetchHistoricalData('OTC_DJI', granularity, count); 
                setProgress(0.15);
                dataRawB = await fetchHistoricalData('OTC_NDX', granularity, count); 
                setProgress(0.2);
                dataRawC = await fetchHistoricalData('OTC_SPC', granularity, count); 
            }

            setProgress(0.3);

            // Slicing/filtering logic by date range
            const startEpoch = new Date(startDate).getTime();
            const endEpoch = new Date(endDate).getTime() + 86399999; // Till end of the selected day

            const filterByDateRange = (series: MarketSeries): MarketSeries => {
                const filteredBars = series.bars.filter(b => {
                    const time = b.timestamp.getTime();
                    return time >= startEpoch && time <= endEpoch;
                });
                return { symbol: series.symbol, bars: filteredBars };
            };

            let dataA = filterByDateRange(dataRawA);
            let dataB = filterByDateRange(dataRawB);
            let dataC = filterByDateRange(dataRawC);
            let fallbackTriggered = false;

            if (dataA.bars.length < 30) {
                // Instantly handle candlelight slice scarcity to prevent "00" trades or crashes
                const fallbackLength = Math.min(450, dataRawA.bars.length);
                dataA = { symbol: dataRawA.symbol, bars: dataRawA.bars.slice(-fallbackLength) };
                dataB = { symbol: dataRawB.symbol, bars: dataRawB.bars.slice(-fallbackLength) };
                dataC = { symbol: dataRawC.symbol, bars: dataRawC.bars.slice(-fallbackLength) };
                fallbackTriggered = true;
                setRangeFallbackUsed(true);
            }

            const barCount = dataA.bars.length;
            setProgress(0.5);

            const testResult = await runBacktest(strategy, dataA, dataB, dataC, initialBalance, granularity, (p) => {
                setProgress(0.5 + p * 0.3);
            });

            const stabilityStatus = getStrategyStability(strategy, assetClass, granularity);

            setResult(testResult);
            setProgress(0.85);

            // Generate AI Report with specific awareness of user's custom stability ratings
            const prompt = `You are a Quantitative Analyst. Analyze the following backtest results for the ${strategy} strategy (Tested on ${barCount} candles with initial capital of $${initialBalance}).
The quantitative rating for this strategy-timeframe-asset combination is classified as: ${stabilityStatus}.

Backtest performance metrics:
- Win Rate: ${testResult.winRate.toFixed(2)}%
- Profit Factor: ${testResult.profitFactor.toFixed(2)}
- Max Drawdown: ${testResult.maxDrawdown.toFixed(2)}%
- Sharpe Ratio: ${testResult.sharpeRatio.toFixed(2)}
- Total Trades: ${testResult.totalTrades}
- Net Profit: $${testResult.netProfit.toFixed(2)}

Please provide high-quality insights on whether this strategy behaves robustly or has fatal flaws on this asset class and timeframe. Frame your feedback based on the ${stabilityStatus} classification. Keep it extremely professional, concise, around 3 paragraphs.`;

            const aiAnalysis = await getGeminiAnalysis(prompt);
            setAiReport(aiAnalysis);
            setProgress(1);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Backtest failed');
        } finally {
            setIsRunning(false);
        }
    };

    // Compute filtered and paginated trades for rendering
    const computedFilteredTrades = result ? result.trades.filter(t => {
        const dateStr = new Date(t.entryTime).toLocaleString().toLowerCase();
        const matchesSearch = ledgerSearch === '' || 
            dateStr.includes(ledgerSearch.toLowerCase()) ||
            t.signal.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
            t.status.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
            t.entryPrice.toString().includes(ledgerSearch) ||
            (t.exitTime && new Date(t.exitTime).toLocaleString().toLowerCase().includes(ledgerSearch.toLowerCase())) ||
            (t.exitPrice !== undefined && t.exitPrice.toString().includes(ledgerSearch));

        const matchesSignal = ledgerSignalFilter === 'ALL' || t.signal === ledgerSignalFilter;
        const matchesStatus = ledgerStatusFilter === 'ALL' || t.status === ledgerStatusFilter;

        return matchesSearch && matchesSignal && matchesStatus;
    }) : [];

    const totalFiltered = computedFilteredTrades.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / ledgerPageSize));
    const paginatedTrades = computedFilteredTrades.slice((ledgerPage - 1) * ledgerPageSize, ledgerPage * ledgerPageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                )}
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Quantitative Backtester
                    </h1>
                    <p className="text-gray-400">Run rigorous historical validations using Deriv tick data.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Asset Class</label>
                            <select 
                                value={assetClass} 
                                onChange={(e) => {
                                    setAssetClass(e.target.value as any);
                                    setStrategy(e.target.value === 'FOREX' ? 'SMT' : 'INDEX_SMT');
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="FOREX">Forex</option>
                                <option value="INDICES">Indices</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Strategy Algorithm</label>
                            <select 
                                value={strategy} 
                                onChange={(e) => setStrategy(e.target.value as any)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500"
                            >
                                {assetClass === 'FOREX' ? (
                                    <>
                                        <option value="SMT">FX SMT Liquidity Engine</option>
                                        <option value="STAT_ARB">Statistical Arbitrage</option>
                                        <option value="VELOCITY">Session Velocity Scalping</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="INDEX_SMT">Intraday SMT Scalping</option>
                                        <option value="INDEX_STAT_ARB">High-Frequency Stat Arb</option>
                                        <option value="INDEX_LEAD_LAG">Lead-Lag Scalping</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Timeframe Granularity</label>
                            <select 
                                value={granularity} 
                                onChange={(e) => setGranularity(Number(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="60">1 Minute (High Intensity Scale)</option>
                                <option value="300">5 Minutes (Standard Intraday)</option>
                                <option value="900">15 Minutes (Intermediate Swing)</option>
                                <option value="3600">1 Hour (Dynamic Trend Shift)</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1">
                                Note: Lower timeframes span fewer past calendar days because of density constraints (e.g. 5m spans ~10 days).
                            </p>
                        </div>

                        {/* Interactive Profitability/Stability Insights */}
                        {(() => {
                            const currentStability = getStrategyStability(strategy, assetClass, granularity);
                            const isStable = currentStability === 'STABLE';
                            return (
                                <div className={`p-3 rounded-lg border text-xs leading-relaxed transition-all duration-300 animate-in fade-in zoom-in-95 duration-200 ${
                                    isStable 
                                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                                        : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                                }`}>
                                    <div className="flex items-center gap-2 font-semibold mb-1">
                                        {isStable ? (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                <span>STABLE (PROFITABLE & BALANCED)</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                                <span>FIX (UNPROFITABLE / NEEDS ADJ.)</span>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[10px] opacity-80">
                                        {isStable 
                                            ? 'Demonstrates optimal mathematical expectation and robust drawdown control on this timeframe granularity.'
                                            : 'Warning: This combination has high false-trigger rates and high drawdowns. Needs core parameter adjustment.'}
                                    </p>
                                </div>
                            );
                        })()}

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Account Capital ($)</label>
                            <input 
                                type="number"
                                min="100"
                                max="10000000"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(Math.max(100, Number(e.target.value)))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                                <input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleRunBacktest} 
                            disabled={isRunning}
                            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            {isRunning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Processing {(progress * 100).toFixed(0)}%</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    <span>Initialize Backtest</span>
                                </>
                            )}
                        </button>
                    </div>

                     {error && (
                         <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex gap-3 text-red-400">
                             <AlertCircle className="w-5 h-5 shrink-0" />
                             <p className="text-sm">{error}</p>
                         </div>
                     )}

                     {rangeFallbackUsed && (
                         <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg flex gap-2.5 text-amber-300">
                             <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                             <div className="text-[11px] space-y-0.5">
                                 <p className="font-semibold">Density Constraint Auto-Shift</p>
                                 <p className="opacity-80">Selected dates are sparse on history. Auto-fallback loaded the most dense 450 live candlesticks to avoid empty data.</p>
                             </div>
                         </div>
                     )}
                 </div>

                <div className="md:col-span-2 space-y-6">
                    {result ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Win Rate
                                    </div>
                                    <div className="text-2xl font-bold text-white">{result.winRate.toFixed(1)}%</div>
                                    <div className="text-xs text-gray-500 mt-1">{result.winningTrades}W / {result.losingTrades}L</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Profit Factor
                                    </div>
                                    <div className="text-2xl font-bold text-white">{result.profitFactor.toFixed(2)}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Sharpe Ratio
                                    </div>
                                    <div className="text-2xl font-bold text-white">{result.sharpeRatio.toFixed(2)}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-gray-400 text-sm mb-1">Max Drawdown</div>
                                    <div className="text-2xl font-bold text-red-400">{result.maxDrawdown.toFixed(2)}%</div>
                                </div>
                            </div>
                            
                            {aiReport && (
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        AI Quantitative Report
                                    </h3>
                                    <div className="prose prose-invert max-w-none text-gray-300 text-sm whitespace-pre-wrap">
                                        {aiReport}
                                    </div>
                                </div>
                            )}

                            {/* Traded Assets Information */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-white mb-1">Portfolio & Instruments Traded</h4>
                                        <p className="text-xs text-gray-400">Advanced executions track multiple high-correlation baskets for SMT and Lead-Lag anomalies.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 font-mono">Asset Class:</span>
                                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold font-mono">
                                            {assetClass}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                                    {assetClass === 'FOREX' ? (
                                        <>
                                            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-xs font-bold text-gray-200">USDJPY</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">DXY Balance Proxy</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">Calculates general US Dollar liquidity momentum shifts.</p>
                                            </div>
                                            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-xs font-bold text-gray-200">EURUSD</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Primary Executed Asset</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">Primary medium for correlation divergences.</p>
                                            </div>
                                            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-xs font-bold text-gray-200">GBPUSD</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Correlation Anchor</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">Complementary pair to measure SMT highs/lows.</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-xs font-bold text-gray-200">OTC_DJI</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Dow Jones 30</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">Benchmark blue-chip index trend setter.</p>
                                            </div>
                                            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-xs font-bold text-gray-200">OTC_NDX</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Nasdaq 100</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">Primary executable volatile index asset.</p>
                                            </div>
                                            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-xs font-bold text-gray-200">OTC_SPC</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">S&P 500 Index</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">Equity market dispersion anchor.</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Execution Trade Ledger</h3>
                                        <p className="text-xs text-gray-400 mt-1">Audit trail of all algorithmic entries and exits matching parameters.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button 
                                            onClick={handleDownloadCSV}
                                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-gray-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-705 transition"
                                        >
                                            <Download className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Download CSV (Excel)</span>
                                        </button>
                                        <button 
                                            onClick={handleDownloadTXT}
                                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-gray-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-705 transition"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Download TXT Report</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Interactive Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800/60">
                                    <div className="relative sm:col-span-2">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Search className="w-4 h-4 text-slate-500" />
                                        </span>
                                        <input 
                                            type="text"
                                            placeholder="Search trade entry price, direction..."
                                            value={ledgerSearch}
                                            onChange={(e) => {
                                                setLedgerSearch(e.target.value);
                                                setLedgerPage(1);
                                            }}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <select
                                            value={ledgerSignalFilter}
                                            onChange={(e) => {
                                                setLedgerSignalFilter(e.target.value as any);
                                                setLedgerPage(1);
                                            }}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="ALL">All Signals</option>
                                            <option value="BUY">BUY Trades Only</option>
                                            <option value="SELL">SELL Trades Only</option>
                                        </select>
                                    </div>

                                    <div>
                                        <select
                                            value={ledgerStatusFilter}
                                            onChange={(e) => {
                                                setLedgerStatusFilter(e.target.value as any);
                                                setLedgerPage(1);
                                            }}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="ALL">All Outcomes</option>
                                            <option value="WIN">WIN Trades Only</option>
                                            <option value="LOSS">LOSS Trades Only</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Table Layout */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-[10px] text-gray-400 uppercase bg-slate-950 border-b border-slate-800 font-mono tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 rounded-tl-lg">Trade ID</th>
                                                <th className="px-4 py-3">Entry Time</th>
                                                <th className="px-4 py-3">Signal</th>
                                                <th className="px-4 py-3">Entry Price</th>
                                                <th className="px-4 py-3">Exit Price</th>
                                                <th className="px-4 py-3">P/L ($)</th>
                                                <th className="px-4 py-3 rounded-tr-lg">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/45">
                                            {paginatedTrades.length > 0 ? (
                                                paginatedTrades.map((t, idx) => {
                                                    const absoluteId = result.trades.indexOf(t) + 1;
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
                                                            <td className="px-4 py-3 font-mono font-bold text-gray-400">#{absoluteId}</td>
                                                            <td className="px-4 py-3 text-gray-300 font-mono">{new Date(t.entryTime).toLocaleString()}</td>
                                                            <td className="px-4 py-3 animate-fade-in">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${t.signal === 'BUY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                                    {t.signal}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-300 font-mono">{t.entryPrice.toFixed(5)}</td>
                                                            <td className="px-4 py-3 text-gray-300 font-mono">{t.exitPrice !== undefined ? t.exitPrice.toFixed(5) : 'N/A'}</td>
                                                            <td className={`px-4 py-3 font-mono font-bold ${t.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${t.status === 'WIN' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-mono">
                                                        No trades match the current search or filter query.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination and Page size selector */}
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-800">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>Show</span>
                                        <select
                                            value={ledgerPageSize}
                                            onChange={(e) => {
                                                setLedgerPageSize(Number(e.target.value));
                                                setLedgerPage(1);
                                            }}
                                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                        <span>trades. Showing {Math.min(totalFiltered, (ledgerPage - 1) * ledgerPageSize + 1)}-{Math.min(totalFiltered, ledgerPage * ledgerPageSize)} of {totalFiltered} filtered</span>
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setLedgerPage(prev => Math.max(1, prev - 1))}
                                                disabled={ledgerPage === 1}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-705 disabled:border-slate-850 text-gray-300 disabled:text-gray-600 rounded transition"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="px-3 py-1 font-mono text-xs text-white">
                                                Page {ledgerPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setLedgerPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={ledgerPage === totalPages}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-705 disabled:border-slate-850 text-gray-300 disabled:text-gray-600 rounded transition"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-gray-500">
                            <Activity className="w-12 h-12 mb-4 text-slate-700" />
                            <p>Select parameters and initialize backtest to generate reports.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

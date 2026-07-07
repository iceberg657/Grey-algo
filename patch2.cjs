const fs = require('fs');
const file = '/app/applet/components/TrendScannerPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `
                            {/* Structural Trap Analysis */}
                            <div className="flex flex-col gap-3 mt-2">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                                        Institutional Liquidity & Structure
                                    </h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liquidity Pools</span>
                                        <span className={\`font-mono text-sm font-bold \${
                                            activeAnalysis.liquidityPool === 'EQUAL_HIGHS' ? 'text-amber-500' :
                                            activeAnalysis.liquidityPool === 'EQUAL_LOWS' ? 'text-indigo-400' : 'text-slate-500'
                                        }\`}>
                                            {activeAnalysis.liquidityPool === 'EQUAL_HIGHS' ? '🚨 EQUAL HIGHS (Buy Stops)' : 
                                             activeAnalysis.liquidityPool === 'EQUAL_LOWS' ? '🚨 EQUAL LOWS (Sell Stops)' : 'None Detected'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imbalances (FVG)</span>
                                        <span className={\`font-mono text-sm font-bold \${
                                            activeAnalysis.fvg === 'BULLISH' ? 'text-emerald-500' :
                                            activeAnalysis.fvg === 'BEARISH' ? 'text-rose-500' : 'text-slate-500'
                                        }\`}>
                                            {activeAnalysis.fvg === 'BULLISH' ? '📈 BULLISH FVG' : 
                                             activeAnalysis.fvg === 'BEARISH' ? '📉 BEARISH FVG' : 'None Detected'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">LTF Confirmation</span>
                                        <span className="font-mono text-sm font-bold text-slate-400">
                                            {activeAnalysis.fvg !== 'NONE' || activeAnalysis.liquidityPool !== 'NONE' ? '⏳ WAIT FOR CHoCH' : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
`;

content = content.replace('                            {/* Chart Overlay */}', injection + '\\n                            {/* Chart Overlay */}');

fs.writeFileSync(file, content);

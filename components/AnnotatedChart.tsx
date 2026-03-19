import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { SignalData } from '../types';

interface AnnotatedChartProps {
    imageSrc: string;
    data: SignalData;
}

export const AnnotatedChart: React.FC<AnnotatedChartProps> = ({ imageSrc, data }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!chartRef.current) return;
        setIsGenerating(true);
        try {
            console.log("Starting html-to-image...");
            const dataUrl = await toPng(chartRef.current, {
                backgroundColor: '#000000',
                pixelRatio: 2 // High resolution
            });
            console.log("Data URL generated. Creating link...");
            const link = document.createElement('a');
            link.download = `${data.asset}_${data.timeframe}_Analysis.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate image", error);
            alert(`Failed to download chart. Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const entry = data.entryPoints[1] || data.entryPoints[0] || 0;
    const tp1 = data.takeProfits[0] || 0;
    const offset = (data.asset.includes('JPY') ? 0.2 : 0.0020); // rough 20 pips

    const isBuy = data.signal === 'BUY' || (data.signal === 'NEUTRAL' && tp1 > entry);
    const isSell = data.signal === 'SELL' || (data.signal === 'NEUTRAL' && tp1 < entry);

    // Calculate dynamic Y percentages based on visiblePriceRange
    let high = data.visiblePriceRange?.high;
    let low = data.visiblePriceRange?.low;

    if (!high || !low || high <= low) {
        // Estimate range based on entry, TP, SL
        const allPrices = [
            entry, 
            data.stopLoss, 
            ...data.takeProfits, 
            entry + offset * 5, 
            entry - offset * 5
        ].filter(p => p > 0);
        
        high = Math.max(...allPrices);
        low = Math.min(...allPrices);
        
        // Add some padding
        const padding = (high - low) * 0.1;
        high += padding;
        low -= padding;
    }

    const getYPercent = (price: number) => {
        const percent = ((high! - price) / (high! - low!)) * 100;
        return Math.max(0, Math.min(100, percent));
    };

    const entryY = getYPercent(entry);
    const slY = getYPercent(data.stopLoss || (isBuy ? entry - offset : entry + offset));
    const tp1Y = getYPercent(data.takeProfits[0] || (isBuy ? entry + offset * 2 : entry - offset * 2));
    const tp2Y = getYPercent(data.takeProfits[1] || (isBuy ? entry + offset * 3 : entry - offset * 3));

    return (
        <div className="mt-8 flex flex-col items-center w-full animate-fade-in">
            <div className="flex justify-between items-center w-full mb-4">
                <h3 className="text-lg font-black uppercase text-gray-800 dark:text-white tracking-widest">Tactical View Annotation</h3>
                <button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isGenerating ? 'Generating...' : 'Download Chart'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
            </div>

            <div 
                ref={chartRef} 
                className="relative w-full bg-black overflow-hidden rounded-xl border border-gray-800 shadow-2xl text-[8px] sm:text-[10px]"
                style={{ fontFamily: 'monospace' }}
            >
                {/* Background Image (Auto Height) */}
                <img 
                    src={imageSrc} 
                    alt="Original Chart" 
                    className="w-full h-auto block opacity-60"
                />

                {/* Overlays Container */}
                <div className="absolute inset-0">
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                    {/* Supply Zone Bar */}
                    <div 
                        className="absolute left-0 w-full bg-red-500/20 border-y border-red-500/40 flex items-center justify-center pointer-events-none z-0"
                        style={{ 
                            top: `${getYPercent(entry + offset * 2)}%`, 
                            height: `${Math.abs(getYPercent(entry + offset * 1.5) - getYPercent(entry + offset * 2))}%` 
                        }}
                    >
                        <span className="text-red-400/70 text-[8px] font-bold uppercase tracking-widest">Supply Zone</span>
                    </div>

                    {/* Demand Zone Bar */}
                    <div 
                        className="absolute left-0 w-full bg-green-500/20 border-y border-green-500/40 flex items-center justify-center pointer-events-none z-0"
                        style={{ 
                            top: `${getYPercent(entry - offset * 1.5)}%`, 
                            height: `${Math.abs(getYPercent(entry - offset * 2) - getYPercent(entry - offset * 1.5))}%` 
                        }}
                    >
                        <span className="text-green-400/70 text-[8px] font-bold uppercase tracking-widest">Demand Zone</span>
                    </div>

                    {/* Price Axis (Right Edge) */}
                    <div className="absolute top-0 right-0 w-12 sm:w-16 h-full bg-black/40 border-l border-gray-800/80 flex flex-col justify-between py-2 z-0">
                        {[...Array(15)].map((_, i) => {
                            const tickPrice = high! - (i / 14) * (high! - low!);
                            return (
                                <div key={i} className="text-gray-500 text-[5px] sm:text-[7px] text-right pr-1 border-b border-gray-800/30">
                                    {tickPrice.toFixed(5)}
                                </div>
                            );
                        })}
                    </div>

                    {/* Top Left Title */}
                    <div className="absolute top-2 left-2 z-10">
                        <div className="bg-black/80 border border-yellow-500/50 rounded p-1 sm:p-1.5 backdrop-blur-sm shadow-lg flex items-center gap-1.5">
                            <div className="text-yellow-400 font-bold text-[8px] sm:text-[10px]">{data.asset} - {data.timeframe}</div>
                            <div className="text-white font-bold text-[6px] sm:text-[8px] border-l border-gray-600 pl-1.5">Analysis & Trade Setups</div>
                        </div>
                    </div>

                    {/* EMA Legend */}
                    <div className="absolute top-8 sm:top-10 left-2 z-10 hidden sm:block">
                        <div className="bg-black/80 border border-gray-600/50 rounded p-0.5 backdrop-blur-sm shadow-lg space-y-0.5">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-0.5 bg-blue-500 rounded-full"></div>
                                <span className="text-white text-[6px] font-semibold">20 EMA</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-0.5 bg-purple-500 rounded-full"></div>
                                <span className="text-white text-[6px] font-semibold">50 EMA</span>
                            </div>
                        </div>
                    </div>

                    {/* Candlestick Patterns */}
                    {data.candlestickPatterns && data.candlestickPatterns.length > 0 && (
                        <div className="absolute top-14 sm:top-16 left-2 z-10">
                            <div className="bg-black/80 border border-blue-500/50 rounded p-0.5 backdrop-blur-sm shadow-lg">
                                <div className="text-blue-400 font-bold text-[6px] mb-0.5">Patterns</div>
                                <div className="text-white text-[6px] font-semibold">
                                    {data.candlestickPatterns.join(', ')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OTE Zone */}
                    {data.oteLevels && (
                        <div 
                            className="absolute right-16 sm:right-20 z-10 w-16"
                            style={{ top: `${getYPercent((data.oteLevels.upper + data.oteLevels.lower) / 2)}%`, transform: 'translateY(-50%)' }}
                        >
                            <div className="text-white text-[6px] font-semibold mb-0.5 text-center">OTE Zone</div>
                            <div className="bg-black/80 border border-yellow-500/50 rounded p-0.5 backdrop-blur-sm shadow-lg text-center">
                                <div className="text-yellow-400 text-[6px] font-bold">
                                    {data.oteLevels.lower.toFixed(5)} - {data.oteLevels.upper.toFixed(5)}
                                </div>
                            </div>
                        </div>
                    )}



                    {/* Current Price Label (Left Side) */}
                    <div 
                        className="absolute left-[15%] sm:left-[20%] z-10"
                        style={{ top: `${entryY}%`, transform: 'translateY(-50%)' }}
                    >
                        <div className="bg-black/80 border border-yellow-500/50 rounded px-1 py-0.5 text-yellow-400 text-[6px] sm:text-[8px] font-bold flex items-center gap-1 shadow-lg">
                            <span>Current Price</span>
                        </div>
                        {/* Curved Line pointing to center */}
                        <svg className="absolute top-1/2 left-full w-8 sm:w-12 h-6 -translate-y-full overflow-visible">
                            <path d="M0 12 Q 10 0 30 12" stroke="#eab308" strokeWidth="1" fill="none" markerEnd="url(#arrowhead-yellow)" />
                        </svg>
                    </div>

                    {/* SELL Setup Box (Top Center) */}
                    {isSell && (
                        <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-10 w-40 sm:w-48">
                            <div className="bg-black/90 border border-red-500/50 rounded p-1.5 backdrop-blur-sm shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                <div className="text-red-500 font-bold text-[8px] sm:text-[10px] mb-0.5 border-b border-red-500/30 pb-0.5">
                                    SELL Setup (If {data.timeframe} Bias Turns Bearish)
                                </div>
                                <div className="text-gray-300 text-[6px] sm:text-[8px] space-y-0.5">
                                    <div className="font-semibold text-gray-400 underline decoration-gray-600 underline-offset-2">Conditions:</div>
                                    <div className="flex items-center gap-1">
                                        <span>1. Break Below</span>
                                        <span className="text-red-400 font-bold">{(entry - offset).toFixed(5)}</span>
                                    </div>
                                    <div>2. Retest + Bearish FVG/OB</div>
                                    <div className="flex items-center gap-1">
                                        <span>3. Sell Entry &rarr;</span>
                                        <span className="text-yellow-400 font-bold">{entry}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BUY Setup Box (Bottom Center) */}
                    {isBuy && (
                        <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-40 sm:w-48">
                            <div className="bg-black/90 border border-green-500/50 rounded p-1.5 backdrop-blur-sm shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                <div className="text-green-500 font-bold text-[8px] sm:text-[10px] mb-0.5 border-b border-green-500/30 pb-0.5">
                                    BUY Setup (If {data.timeframe} Bias Turns Bullish)
                                </div>
                                <div className="text-gray-300 text-[6px] sm:text-[8px] space-y-0.5">
                                    <div className="font-semibold text-gray-400 underline decoration-gray-600 underline-offset-2">Conditions:</div>
                                    <div className="flex items-center gap-1">
                                        <span>1. Break Above</span>
                                        <span className="text-green-400 font-bold">{(entry + offset).toFixed(5)}</span>
                                    </div>
                                    <div>2. Retest + Bullish FVG/OB</div>
                                    <div className="flex items-center gap-1">
                                        <span>3. Buy Entry &rarr;</span>
                                        <span className="text-yellow-400 font-bold">{entry}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Center Elements (FVGs, Retest, Break) */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Horizontal Yellow Line for Entry */}
                        <div 
                            className="absolute left-0 w-full h-[1px] bg-yellow-500/50"
                            style={{ top: `${entryY}%` }}
                        ></div>

                        {isSell && (
                            <>
                                <div 
                                    className="absolute left-[45%] bg-black/80 border border-yellow-500/50 rounded p-0.5 backdrop-blur-sm shadow-lg text-center"
                                    style={{ top: `${getYPercent(entry + offset * 0.5)}%`, transform: 'translateY(-50%)' }}
                                >
                                    <div className="text-yellow-400 text-[6px] sm:text-[8px] font-bold">Bearish FVG</div>
                                    <div className="text-white text-[5px] sm:text-[6px]">(if Forms)</div>
                                </div>
                                <div 
                                    className="absolute left-[45%] bg-black/80 border border-red-500/50 rounded px-1 py-0.5 text-red-400 text-[6px] sm:text-[8px] font-bold"
                                    style={{ top: `${getYPercent(entry - offset)}%`, transform: 'translateY(-50%)' }}
                                >
                                    Break Below {(entry - offset).toFixed(5)}
                                </div>
                                <div 
                                    className="absolute left-[60%] bg-black/80 border border-gray-500/50 rounded px-1 py-0.5 text-white text-[6px] sm:text-[8px] font-bold"
                                    style={{ top: `${getYPercent(entry - offset * 0.2)}%`, transform: 'translateY(-50%)' }}
                                >
                                    Retest
                                </div>
                            </>
                        )}

                        {isBuy && (
                            <>
                                <div 
                                    className="absolute left-[45%] bg-black/80 border border-green-500/50 rounded p-0.5 backdrop-blur-sm shadow-lg text-center"
                                    style={{ top: `${getYPercent(entry - offset * 0.5)}%`, transform: 'translateY(-50%)' }}
                                >
                                    <div className="text-green-400 text-[6px] sm:text-[8px] font-bold">Bullish FVG</div>
                                    <div className="text-white text-[5px] sm:text-[6px]">(If Forms)</div>
                                </div>
                                <div 
                                    className="absolute left-[45%] bg-black/80 border border-green-500/50 rounded px-1 py-0.5 text-green-400 text-[6px] sm:text-[8px] font-bold"
                                    style={{ top: `${getYPercent(entry + offset)}%`, transform: 'translateY(-50%)' }}
                                >
                                    Break Above {(entry + offset).toFixed(5)}
                                </div>
                                <div 
                                    className="absolute left-[60%] bg-black/80 border border-gray-500/50 rounded px-1 py-0.5 text-white text-[6px] sm:text-[8px] font-bold"
                                    style={{ top: `${getYPercent(entry + offset * 0.2)}%`, transform: 'translateY(-50%)' }}
                                >
                                    Retest
                                </div>
                            </>
                        )}

                        {/* SVG Arrows */}
                        <svg className="absolute inset-0 w-full h-full" overflow="visible">
                            <defs>
                                <marker id="arrowhead-green" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="#22c55e" />
                                </marker>
                                <marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
                                </marker>
                                <marker id="arrowhead-yellow" markerWidth="4" markerHeight="3" refX="3" refY="1.5" orient="auto">
                                    <polygon points="0 0, 4 1.5, 0 3" fill="#eab308" />
                                </marker>
                            </defs>

                            {/* Entry Point Circle */}
                            <circle cx="65%" cy={`${entryY}%`} r="2" fill="#eab308" />
                            <circle cx="65%" cy={`${entryY}%`} r="6" stroke="#eab308" strokeWidth="1" strokeDasharray="2 2" fill="none" />

                            {isBuy && (
                                <>
                                    {/* Path to TP1 */}
                                    <path d={`M 65% ${entryY}% Q 75% ${(entryY + tp1Y) / 2}% 90% ${tp1Y}%`} stroke="#22c55e" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-green)" />
                                    {/* Path to TP2 */}
                                    <path d={`M 65% ${entryY}% Q 75% ${(entryY + tp2Y) / 2}% 90% ${tp2Y}%`} stroke="#22c55e" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-green)" />
                                    {/* Path to SL */}
                                    <path d={`M 65% ${entryY}% Q 75% ${(entryY + slY) / 2}% 90% ${slY}%`} stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" fill="none" markerEnd="url(#arrowhead-red)" />
                                </>
                            )}

                            {isSell && (
                                <>
                                    {/* Path to TP1 */}
                                    <path d={`M 65% ${entryY}% Q 75% ${(entryY + tp1Y) / 2}% 90% ${tp1Y}%`} stroke="#ef4444" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-red)" />
                                    {/* Path to TP2 */}
                                    <path d={`M 65% ${entryY}% Q 75% ${(entryY + tp2Y) / 2}% 90% ${tp2Y}%`} stroke="#ef4444" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead-red)" />
                                    {/* Path to SL */}
                                    <path d={`M 65% ${entryY}% Q 75% ${(entryY + slY) / 2}% 90% ${slY}%`} stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" fill="none" markerEnd="url(#arrowhead-red)" />
                                </>
                            )}
                        </svg>
                    </div>

                    {/* TradingView Style Price Tags (Right Axis) */}
                    <div className="absolute top-0 right-0 w-12 sm:w-16 h-full z-20 pointer-events-none">
                        {/* Current Price Tag */}
                        <div 
                            className="absolute right-0 bg-[#eab308] text-black px-1 py-0.5 rounded-l flex items-center shadow-lg"
                            style={{ top: `${entryY}%`, transform: 'translateY(-50%)' }}
                        >
                            <span className="text-black text-[6px] sm:text-[8px] font-bold">Current Price: {entry.toFixed(5)}</span>
                        </div>
                        
                        {isBuy && (
                            <>
                                <div 
                                    className="absolute right-0 bg-[#0a1f10] border border-[#22c55e] px-1 py-0.5 rounded-l flex items-center gap-1 shadow-lg"
                                    style={{ top: `${tp2Y}%`, transform: 'translateY(-50%)' }}
                                >
                                    <span className="text-white text-[5px] sm:text-[7px] font-bold">TP2</span>
                                    <span className="text-[#22c55e] text-[5px] sm:text-[7px] font-bold">{((data.signal === 'BUY' ? data.takeProfits[1] : undefined) || (entry + offset * 3)).toFixed(5)}</span>
                                </div>
                                <div 
                                    className="absolute right-0 bg-[#0a1f10] border border-[#22c55e] px-1 py-0.5 rounded-l flex items-center gap-1 shadow-lg"
                                    style={{ top: `${tp1Y}%`, transform: 'translateY(-50%)' }}
                                >
                                    <span className="text-white text-[5px] sm:text-[7px] font-bold">TP1</span>
                                    <span className="text-[#22c55e] text-[5px] sm:text-[7px] font-bold">{((data.signal === 'BUY' ? data.takeProfits[0] : undefined) || (entry + offset * 2)).toFixed(5)}</span>
                                </div>
                                <div 
                                    className="absolute right-0 bg-[#2a0a0a] border border-[#ef4444] px-1 py-0.5 rounded-l flex items-center gap-1 shadow-lg"
                                    style={{ top: `${slY}%`, transform: 'translateY(-50%)' }}
                                >
                                    <span className="text-white text-[5px] sm:text-[7px] font-bold">SL</span>
                                    <span className="text-[#ef4444] text-[5px] sm:text-[7px] font-bold">{((data.signal === 'BUY' ? data.stopLoss : undefined) || (entry - offset)).toFixed(5)}</span>
                                </div>
                            </>
                        )}

                        {isSell && (
                            <>
                                <div 
                                    className="absolute right-0 bg-[#0a1f10] border border-[#22c55e] px-1 py-0.5 rounded-l flex items-center gap-1 shadow-lg"
                                    style={{ top: `${tp2Y}%`, transform: 'translateY(-50%)' }}
                                >
                                    <span className="text-white text-[5px] sm:text-[7px] font-bold">TP2</span>
                                    <span className="text-[#22c55e] text-[5px] sm:text-[7px] font-bold">{((data.signal === 'SELL' ? data.takeProfits[1] : undefined) || (entry - offset * 3)).toFixed(5)}</span>
                                </div>
                                <div 
                                    className="absolute right-0 bg-[#0a1f10] border border-[#22c55e] px-1 py-0.5 rounded-l flex items-center gap-1 shadow-lg"
                                    style={{ top: `${tp1Y}%`, transform: 'translateY(-50%)' }}
                                >
                                    <span className="text-white text-[5px] sm:text-[7px] font-bold">TP1</span>
                                    <span className="text-[#22c55e] text-[5px] sm:text-[7px] font-bold">{((data.signal === 'SELL' ? data.takeProfits[0] : undefined) || (entry - offset * 2)).toFixed(5)}</span>
                                </div>
                                <div 
                                    className="absolute right-0 bg-[#2a0a0a] border border-[#ef4444] px-1 py-0.5 rounded-l flex items-center gap-1 shadow-lg"
                                    style={{ top: `${slY}%`, transform: 'translateY(-50%)' }}
                                >
                                    <span className="text-white text-[5px] sm:text-[7px] font-bold">SL</span>
                                    <span className="text-[#ef4444] text-[5px] sm:text-[7px] font-bold">{((data.signal === 'SELL' ? data.stopLoss : undefined) || (entry + offset)).toFixed(5)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};



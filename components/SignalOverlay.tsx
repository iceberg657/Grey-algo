
import React, { useState, useEffect, useRef } from 'react';
import { getHistory } from '../services/historyService';
import type { SignalData } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

interface SignalOverlayProps {
    onAnalyzeClick?: (imageData: string) => void;
    onBack?: () => void;
}

// --- Types for Annotations ---
type AnnotationType = 'bullish-ob' | 'bearish-ob' | 'fvg' | 'liquidity' | 'support' | 'resistance';

interface Annotation {
    id: string;
    type: AnnotationType;
    x: number;
    y: number;
    width?: number; // Optional for lines
    height?: number; // Optional for lines
    label?: string;
}

export const SignalOverlay: React.FC<SignalOverlayProps> = ({ onAnalyzeClick, onBack }) => {
    const [latestAnalysis, setLatestAnalysis] = useState<SignalData | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    
    // Annotation State
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const history = getHistory();
        if (history && history.length > 0) {
            setLatestAnalysis(history[0]);
        }
    }, []);

    const handleCopy = (text: string | number, label: string) => {
        navigator.clipboard.writeText(String(text));
        setCopiedId(label);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // --- Annotation Logic ---

    const addAnnotation = (type: AnnotationType) => {
        const id = Date.now().toString();
        // Spawn in center-ish of screen (randomized slightly)
        const startX = window.innerWidth / 2 - 100 + (Math.random() * 50);
        const startY = window.innerHeight / 2 - 50 + (Math.random() * 50);

        const newAnnotation: Annotation = {
            id,
            type,
            x: startX,
            y: startY,
            width: type.includes('ob') || type === 'fvg' ? 150 : 200,
            height: type.includes('ob') || type === 'fvg' ? 60 : 2,
        };
        setAnnotations(prev => [...prev, newAnnotation]);
    };

    const removeAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
    };

    const handleMouseDown = (e: React.MouseEvent, id: string, x: number, y: number) => {
        e.stopPropagation(); // Prevent event bubbling
        setDraggingId(id);
        setDragOffset({
            x: e.clientX - x,
            y: e.clientY - y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId) {
            e.preventDefault();
            setAnnotations(prev => prev.map(ann => {
                if (ann.id === draggingId) {
                    return {
                        ...ann,
                        x: e.clientX - dragOffset.x,
                        y: e.clientY - dragOffset.y
                    };
                }
                return ann;
            }));
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    // Global mouse up/move listeners to handle dragging outside element bounds
    useEffect(() => {
        const onUp = () => setDraggingId(null);
        const onMove = (e: MouseEvent) => {
            if (draggingId) {
                setAnnotations(prev => prev.map(ann => {
                    if (ann.id === draggingId) {
                        return {
                            ...ann,
                            x: e.clientX - dragOffset.x,
                            y: e.clientY - dragOffset.y
                        };
                    }
                    return ann;
                }));
            }
        };

        if (draggingId) {
            window.addEventListener('mouseup', onUp);
            window.addEventListener('mousemove', onMove);
        }
        return () => {
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mousemove', onMove);
        };
    }, [draggingId, dragOffset]);


    // --- Render Helpers ---

    const isBuy = latestAnalysis?.signal === 'BUY';
    const signalColor = isBuy ? 'text-green-400' : latestAnalysis?.signal === 'SELL' ? 'text-red-400' : 'text-blue-400';
    const signalBg = isBuy ? 'bg-green-500/20' : latestAnalysis?.signal === 'SELL' ? 'bg-red-500/20' : 'bg-blue-500/20';

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 pointer-events-none overflow-hidden"
        >
            {/* --- 1. Annotation Canvas Layer --- */}
            {annotations.map(ann => (
                <div
                    key={ann.id}
                    onMouseDown={(e) => handleMouseDown(e, ann.id, ann.x, ann.y)}
                    onDoubleClick={() => removeAnnotation(ann.id)}
                    style={{
                        left: ann.x,
                        top: ann.y,
                        width: ann.width,
                        height: ann.height,
                    }}
                    className={`absolute pointer-events-auto cursor-move group transition-transform active:scale-105 ${
                        ann.type === 'bullish-ob' ? 'bg-green-500/20 border border-green-500/50 backdrop-blur-sm' :
                        ann.type === 'bearish-ob' ? 'bg-red-500/20 border border-red-500/50 backdrop-blur-sm' :
                        ann.type === 'fvg' ? 'bg-yellow-500/10 border-2 border-yellow-500/40 border-dashed backdrop-blur-sm' :
                        ann.type === 'liquidity' ? 'h-0.5 border-t-2 border-blue-500 border-dashed flex items-start' :
                        ann.type === 'support' ? 'h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' :
                        'h-0.5 bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]'
                    }`}
                >
                    {/* Label / Delete Hint */}
                    <div className="absolute -top-5 left-0 text-[10px] font-bold uppercase tracking-wider text-white/70 bg-black/40 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {ann.type.replace('-', ' ')} (Dbl Click Delete)
                    </div>
                    
                    {/* Specific visuals for Liquidity */}
                    {ann.type === 'liquidity' && (
                        <div className="absolute -top-3 right-0 text-[10px] text-blue-400 font-mono">$$$</div>
                    )}
                </div>
            ))}


            {/* --- 2. SMC Toolbar (Right Side) --- */}
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-auto flex flex-col gap-2 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl">
                <div className="text-[9px] text-center text-gray-400 font-bold mb-1">TOOLS</div>
                
                <ToolButton onClick={() => addAnnotation('bullish-ob')} color="bg-green-500/20 text-green-400 border-green-500/50" label="Bull OB" icon="🟩" />
                <ToolButton onClick={() => addAnnotation('bearish-ob')} color="bg-red-500/20 text-red-400 border-red-500/50" label="Bear OB" icon="🟥" />
                <ToolButton onClick={() => addAnnotation('fvg')} color="bg-yellow-500/20 text-yellow-400 border-yellow-500/50" label="FVG Gap" icon="🟨" />
                <div className="h-px bg-white/10 my-1"></div>
                <ToolButton onClick={() => addAnnotation('liquidity')} color="bg-blue-500/20 text-blue-400 border-blue-500/50" label="Liq $$$" icon="〰️" />
                <ToolButton onClick={() => addAnnotation('support')} color="bg-green-500/20 text-green-400 border-green-500/50" label="Supp Lvl" icon="⬆️" />
                <ToolButton onClick={() => addAnnotation('resistance')} color="bg-red-500/20 text-red-400 border-red-500/50" label="Res Lvl" icon="⬇️" />
                
                <div className="h-px bg-white/10 my-1"></div>
                
                {/* Clear All Button */}
                <button 
                    onClick={() => setAnnotations([])}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                    title="Clear All Annotations"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

                {/* EXIT Button */}
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs transition-colors mt-1 border border-red-500/20"
                        title="Exit Charting"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                )}
            </div>


            {/* --- 3. HUD (Top Left) --- */}
            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 max-w-[90vw] md:max-w-fit pointer-events-auto">
                {!isExpanded ? (
                    <div className="flex flex-col gap-2 pointer-events-auto">
                        {onBack && (
                            <button 
                                onClick={onBack}
                                className="bg-red-500/20 backdrop-blur-md border border-red-500/30 p-2 rounded-full shadow-lg hover:bg-red-500/30 transition-all group"
                                title="Exit to Home"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 group-hover:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                        )}
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 p-2 rounded-full shadow-lg hover:bg-white/20 transition-all"
                            title="Expand HUD"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-3 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all duration-300">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between w-full md:w-auto gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">ACTIVE SIGNAL</span>
                                    {latestAnalysis ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-black text-gray-800 dark:text-white">{latestAnalysis.asset}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${signalBg} ${signalColor}`}>
                                                {latestAnalysis.signal}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-400">No Active Analysis</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="hidden md:block w-px h-8 bg-gray-300 dark:bg-white/10"></div>

                        {/* Data Points */}
                        {latestAnalysis && (
                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start overflow-x-auto">
                                <DataPoint 
                                    label="ENTRY" 
                                    value={latestAnalysis.entryPoints[0]} 
                                    color="text-blue-600 dark:text-blue-400" 
                                    onCopy={() => handleCopy(latestAnalysis.entryPoints[0], 'ENTRY')}
                                    isCopied={copiedId === 'ENTRY'}
                                />
                                <DataPoint 
                                    label="STOP" 
                                    value={latestAnalysis.stopLoss} 
                                    color="text-red-600 dark:text-red-400"
                                    onCopy={() => handleCopy(latestAnalysis.stopLoss, 'STOP')}
                                    isCopied={copiedId === 'STOP'}
                                />
                                <DataPoint 
                                    label="TARGET" 
                                    value={latestAnalysis.takeProfits[0]} 
                                    color="text-green-600 dark:text-green-400"
                                    onCopy={() => handleCopy(latestAnalysis.takeProfits[0], 'TARGET')}
                                    isCopied={copiedId === 'TARGET'}
                                />
                            </div>
                        )}

                        {/* Tools (Visible on Mobile & Desktop) */}
                        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-gray-300 dark:border-white/10 pt-2 md:pt-0 md:pl-4 w-full md:w-auto justify-end">
                            {onBack && (
                                <button 
                                    onClick={onBack}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors flex items-center gap-1 group"
                                    title="Exit to Home"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span className="text-xs font-bold md:hidden group-hover:inline ml-1 transition-all">EXIT</span>
                                </button>
                            )}
                            <ThemeToggleButton />
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                                title="Minimize HUD"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DataPoint: React.FC<{ label: string; value: number | string; color: string; onCopy: () => void; isCopied: boolean }> = ({ label, value, color, onCopy, isCopied }) => (
    <div 
        onClick={onCopy}
        className="flex flex-col cursor-pointer group relative min-w-[60px]"
    >
        <span className="text-[9px] text-gray-400 font-mono tracking-wider mb-0.5 uppercase">{label}</span>
        <div className="flex items-center bg-gray-100 dark:bg-black/20 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
            {isCopied && (
                <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm animate-fade-in">
                    Copied
                </span>
            )}
        </div>
    </div>
);

const ToolButton: React.FC<{ onClick: () => void; color: string; label: string; icon: string }> = ({ onClick, color, label, icon }) => (
    <button
        onClick={onClick}
        className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg border backdrop-blur-sm transition-all hover:scale-105 active:scale-95 ${color}`}
        title={label}
    >
        <span className="text-sm">{icon}</span>
        <span className="text-[7px] font-bold uppercase mt-0.5 opacity-80">{label.split(' ')[0]}</span>
    </button>
);

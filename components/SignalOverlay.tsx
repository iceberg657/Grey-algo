
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onAnalyzeClick) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onAnalyzeClick(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addAnnotation = (type: AnnotationType) => {
        const id = Date.now().toString();
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
        e.stopPropagation();
        setDraggingId(id);
        setDragOffset({
            x: e.clientX - x,
            y: e.clientY - y
        });
    };

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

    const isBuy = latestAnalysis?.signal === 'BUY';
    const signalColor = isBuy ? 'text-green-400' : latestAnalysis?.signal === 'SELL' ? 'text-red-400' : 'text-blue-400';
    const signalBg = isBuy ? 'bg-green-500/20' : latestAnalysis?.signal === 'SELL' ? 'bg-red-500/20' : 'bg-blue-500/20';

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 z-[60] pointer-events-none overflow-hidden"
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />

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
                    <div className="absolute -top-5 left-0 text-[10px] font-bold uppercase tracking-wider text-white/70 bg-black/40 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {ann.type.replace('-', ' ')} (Dbl Click Delete)
                    </div>
                    {ann.type === 'liquidity' && (
                        <div className="absolute -top-3 right-0 text-[10px] text-blue-400 font-mono">$$$</div>
                    )}
                </div>
            ))}


            {/* --- 2. SMC Toolbar (Right Side) --- */}
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-auto flex flex-col gap-2 bg-black/80 backdrop-blur-xl p-2 rounded-xl border border-white/20 shadow-2xl z-[70]">
                <div className="text-[9px] text-center text-gray-400 font-bold mb-1">TOOLS</div>
                <ToolButton onClick={() => addAnnotation('bullish-ob')} color="bg-green-500/20 text-green-400 border-green-500/50" label="Bull OB" icon="🟩" />
                <ToolButton onClick={() => addAnnotation('bearish-ob')} color="bg-red-500/20 text-red-400 border-red-500/50" label="Bear OB" icon="🟥" />
                <ToolButton onClick={() => addAnnotation('fvg')} color="bg-yellow-500/20 text-yellow-400 border-yellow-500/50" label="FVG Gap" icon="🟨" />
                <div className="h-px bg-white/10 my-1"></div>
                <ToolButton onClick={() => addAnnotation('liquidity')} color="bg-blue-500/20 text-blue-400 border-blue-500/50" label="Liq $$$" icon="〰️" />
                <ToolButton onClick={() => addAnnotation('support')} color="bg-green-500/20 text-green-400 border-green-500/50" label="Supp Lvl" icon="⬆️" />
                <ToolButton onClick={() => addAnnotation('resistance')} color="bg-red-500/20 text-red-400 border-red-500/50" label="Res Lvl" icon="⬇️" />
                <div className="h-px bg-white/10 my-1"></div>
                <button 
                    onClick={() => setAnnotations([])}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                    title="Clear All Annotations"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>


            {/* --- 3. Navigation & Actions (Top Bar) --- */}
            <div className="absolute top-4 left-4 right-4 z-[70] flex justify-between items-start pointer-events-none">
                
                {/* Back Button Container */}
                <div className="flex flex-col md:flex-row gap-3 pointer-events-auto items-start">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="bg-black/90 backdrop-blur-xl border-2 border-white/30 px-5 py-2.5 rounded-2xl text-white font-black text-sm shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex items-center gap-2 hover:bg-white/10 hover:border-green-400/50 transition-all active:scale-95 group ring-1 ring-black/50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            BACK TO DASHBOARD
                        </button>
                    )}

                    {/* HUD Widget */}
                    <div className="flex flex-col gap-2">
                        {!isExpanded ? (
                            <button 
                                onClick={() => setIsExpanded(true)}
                                className="bg-black/90 backdrop-blur-xl border-2 border-white/20 p-2 rounded-2xl shadow-2xl hover:bg-white/10 transition-all flex items-center justify-center w-12 h-12 pointer-events-auto"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        ) : (
                            <div className="bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.4)] p-3 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all duration-300 pointer-events-auto">
                                <div className="flex items-center justify-between w-full md:w-auto gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Signal Hub</span>
                                            {latestAnalysis ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-white">{latestAnalysis.asset}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${signalBg} ${signalColor} ring-1 ring-white/10`}>
                                                        {latestAnalysis.signal}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-500 italic">No Active Signal</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {latestAnalysis && (
                                    <>
                                        <div className="hidden md:block w-px h-8 bg-white/10"></div>
                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start overflow-x-auto">
                                            <DataPoint label="ENTRY" value={latestAnalysis.entryPoints[0]} color="text-blue-400" onCopy={() => handleCopy(latestAnalysis.entryPoints[0], 'ENTRY')} isCopied={copiedId === 'ENTRY'} />
                                            <div className="w-px h-4 bg-white/5 md:hidden"></div>
                                            <DataPoint label="STOP" value={latestAnalysis.stopLoss} color="text-red-400" onCopy={() => handleCopy(latestAnalysis.stopLoss, 'STOP')} isCopied={copiedId === 'STOP'} />
                                            <div className="w-px h-4 bg-white/5 md:hidden"></div>
                                            <DataPoint label="TARGET" value={latestAnalysis.takeProfits[0]} color="text-green-400" onCopy={() => handleCopy(latestAnalysis.takeProfits[0], 'TARGET')} isCopied={copiedId === 'TARGET'} />
                                        </div>
                                    </>
                                )}

                                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4 w-full md:w-auto justify-end">
                                    <ThemeToggleButton />
                                    <button onClick={() => setIsExpanded(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors" title="Minimize HUD">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Analyze Trigger (Top Right) */}
                <div className="pointer-events-auto">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-600 border-2 border-green-400 px-6 py-3 rounded-2xl text-white font-black text-sm shadow-[0_15px_30px_rgba(22,163,74,0.4)] flex items-center gap-3 hover:bg-green-500 hover:scale-105 active:scale-95 transition-all group ring-1 ring-black/20"
                    >
                        <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="tracking-tight">ANALYZE SCREENSHOT</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const DataPoint: React.FC<{ label: string; value: number | string; color: string; onCopy: () => void; isCopied: boolean }> = ({ label, value, color, onCopy, isCopied }) => (
    <div 
        onClick={onCopy}
        className="flex flex-col cursor-pointer group relative min-w-[65px]"
    >
        <span className="text-[9px] text-gray-500 font-black tracking-widest mb-0.5 uppercase">{label}</span>
        <div className="flex items-center bg-white/5 border border-white/10 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-all hover:border-white/20">
            <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
            {isCopied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl animate-bounce">
                    Copied!
                </span>
            )}
        </div>
    </div>
);

const ToolButton: React.FC<{ onClick: () => void; color: string; label: string; icon: string }> = ({ onClick, color, label, icon }) => (
    <button
        onClick={onClick}
        className={`w-12 h-12 flex flex-col items-center justify-center rounded-xl border-2 backdrop-blur-xl transition-all hover:scale-110 active:scale-90 shadow-lg ${color} ring-1 ring-black/20`}
        title={label}
    >
        <span className="text-lg">{icon}</span>
        <span className="text-[7px] font-black uppercase mt-1 opacity-80 tracking-tighter">{label.split(' ')[0]}</span>
    </button>
);

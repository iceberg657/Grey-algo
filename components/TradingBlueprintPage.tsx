import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Compass, Calculator, BookOpen, Clock, Globe, RefreshCcw, Download } from 'lucide-react';
import { RiskCalculator } from './RiskCalculator';
import { CheatSheet } from './CheatSheet';
import { generateTradingBlueprint } from '../services/geminiService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import ReactMarkdown from 'react-markdown';
import { Loader } from './Loader';

interface TradingBlueprintPageProps {
    onBack: () => void;
}

interface BlueprintSession {
  name: string;
  timeWindow: string;
  assets: string[];
  notes: string;
}

interface BlueprintDay {
  day: string;
  focus: string;
  sessions: BlueprintSession[];
}

interface BlueprintData {
  schedule: BlueprintDay[];
}

const SessionCell = ({ session }: { session?: BlueprintSession }) => {
    if (!session || !session.assets || session.assets.length === 0) return <div className="text-slate-400 dark:text-slate-600 text-xs italic py-2">Off / No Trade</div>;
    return (
        <div className="flex flex-col gap-2">
             <div className="flex flex-wrap gap-1">
                 {session.assets.map(a => <span key={a} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-xs">{a}</span>)}
             </div>
             <div className="flex items-center gap-1 text-xs text-blue-500 font-bold tracking-wide">
                 <Clock size={12} /> {session.timeWindow}
             </div>
             {session.notes && <div className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{session.notes}</div>}
        </div>
    );
};

const SessionColumn = ({ sessions }: { sessions: BlueprintSession[] }) => {
    const validSessions = sessions.filter(s => s.assets && s.assets.length > 0);
    if (!validSessions || validSessions.length === 0) {
        return <div className="text-slate-400 dark:text-slate-600 text-xs italic py-2">Off / No Trade</div>;
    }
    return (
        <div className="flex flex-col gap-5">
            {validSessions.map((session, idx) => (
                <SessionCell key={idx} session={session} />
            ))}
        </div>
    );
};

const AVAILABLE_ASSETS = [
    'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDJPY', 'USDCHF', 
    'XAUUSD', 'US30', 'NAS100', 'SPX500', 'UK100', 'BTCUSD', 'ETHUSD'
];

export const TradingBlueprintPage: React.FC<TradingBlueprintPageProps> = ({ onBack }) => {
    const [showRiskCalc, setShowRiskCalc] = useState(false);
    const [showCheatSheet, setShowCheatSheet] = useState(false);
    
    const [asianAssets, setAsianAssets] = useState<string[]>([]);
    const [londonAssets, setLondonAssets] = useState<string[]>([]);
    const [nyAssets, setNyAssets] = useState<string[]>([]);
    const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [tradesPerDay, setTradesPerDay] = useState<number>(3);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [blueprintStr, setBlueprintStr] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const downloadBlueprintAsMarkdown = () => {
        if (!blueprintStr) return;
        const blob = new Blob([blueprintStr], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `greyquant_trading_blueprint_${timezone.replace(/\//g, '_')}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadBlueprintAsJSON = () => {
        if (!parsedBlueprint) return;
        const blob = new Blob([JSON.stringify(parsedBlueprint, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `greyquant_trading_blueprint_${timezone.replace(/\//g, '_')}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadBlueprintAsCSV = () => {
        if (!parsedBlueprint) return;
        let csvContent = "\ufeffDay,Focus,Asian Assets,Asian Hours,Asian Notes,London Assets,London Hours,London Notes,New York Assets,New York Hours,New York Notes\n";
        parsedBlueprint.schedule.forEach(dayPlan => {
            const asian = dayPlan.sessions.find(s => s.name.toLowerCase().includes('asian'));
            const london = dayPlan.sessions.find(s => s.name.toLowerCase().includes('london'));
            const ny = dayPlan.sessions.find(s => s.name.toLowerCase().includes('new york') || s.name.toLowerCase().includes('ny'));
            
            const day = `"${dayPlan.day.replace(/"/g, '""')}"`;
            const focus = `"${dayPlan.focus.replace(/"/g, '""')}"`;
            
            const asianAssetsStr = asian && asian.assets ? `"${asian.assets.join(', ').replace(/"/g, '""')}"` : '""';
            const asianHoursStr = asian ? `"${asian.timeWindow.replace(/"/g, '""')}"` : '""';
            const asianNotesStr = asian && asian.notes ? `"${asian.notes.replace(/"/g, '""')}"` : '""';
            
            const londonAssetsStr = london && london.assets ? `"${london.assets.join(', ').replace(/"/g, '""')}"` : '""';
            const londonHoursStr = london ? `"${london.timeWindow.replace(/"/g, '""')}"` : '""';
            const londonNotesStr = london && london.notes ? `"${london.notes.replace(/"/g, '""')}"` : '""';
            
            const nyAssetsStr = ny && ny.assets ? `"${ny.assets.join(', ').replace(/"/g, '""')}"` : '""';
            const nyHoursStr = ny ? `"${ny.timeWindow.replace(/"/g, '""')}"` : '""';
            const nyNotesStr = ny && ny.notes ? `"${ny.notes.replace(/"/g, '""')}"` : '""';
            
            csvContent += `${day},${focus},${asianAssetsStr},${asianHoursStr},${asianNotesStr},${londonAssetsStr},${londonHoursStr},${londonNotesStr},${nyAssetsStr},${nyHoursStr},${nyNotesStr}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `greyquant_trading_timetable_${timezone.replace(/\//g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    const parsedBlueprint = useMemo<BlueprintData | null>(() => {
        if (!blueprintStr) return null;
        try {
            // Extract json array or object specifically
            let rawStr = blueprintStr;
            const jsonMatch = rawStr.match(/```json\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
                rawStr = jsonMatch[1];
            } else {
                const parseMatch = rawStr.match(/(\{[\s\S]*\})/);
                if (parseMatch) {
                    rawStr = parseMatch[1];
                }
            }
            const parsed = JSON.parse(rawStr);
            if (parsed && Array.isArray(parsed.schedule)) {
                return parsed as BlueprintData;
            }
            return null;
        } catch (e) {
            console.error("Failed to parse blueprint JSON", e);
            return null;
        }
    }, [blueprintStr]);

    useEffect(() => {
        const fetchBlueprint = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const docRef = doc(db, 'users', user.uid, 'settings', 'blueprint');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setBlueprintStr(docSnap.data().plan);
                    if (docSnap.data().asianAssets) setAsianAssets(docSnap.data().asianAssets);
                    if (docSnap.data().londonAssets) setLondonAssets(docSnap.data().londonAssets);
                    if (docSnap.data().nyAssets) setNyAssets(docSnap.data().nyAssets);
                    if (docSnap.data().timezone) setTimezone(docSnap.data().timezone);
                    if (docSnap.data().tradesPerDay) setTradesPerDay(docSnap.data().tradesPerDay);
                }
            } catch (err) {
                console.error("Failed to load blueprint", err);
            }
        };
        fetchBlueprint();
    }, []);

    const toggleAsset = (session: 'Asian' | 'London' | 'New York', asset: string) => {
        if (session === 'Asian') {
            setAsianAssets(prev => prev.includes(asset) ? prev.filter(a => a !== asset) : (prev.length < 3 ? [...prev, asset] : prev));
        } else if (session === 'London') {
            setLondonAssets(prev => prev.includes(asset) ? prev.filter(a => a !== asset) : (prev.length < 3 ? [...prev, asset] : prev));
        } else if (session === 'New York') {
            setNyAssets(prev => prev.includes(asset) ? prev.filter(a => a !== asset) : (prev.length < 3 ? [...prev, asset] : prev));
        }
    };

    const handleGenerate = async () => {
        if (asianAssets.length === 0 && londonAssets.length === 0 && nyAssets.length === 0) {
            setError("Please select at least one asset for any session.");
            return;
        }
        setError(null);
        setIsGenerating(true);
        try {
            const sessions = [
                { name: 'Asian', assets: asianAssets },
                { name: 'London', assets: londonAssets },
                { name: 'New York', assets: nyAssets }
            ];
            
            // Fetch language preference from local storage
            let userSettings;
            try {
                const stored = localStorage.getItem('greyquant_user_settings');
                if (stored) {
                    userSettings = JSON.parse(stored);
                }
            } catch (e) {
                console.error("Failed to parse user settings", e);
            }
            
            const result = await generateTradingBlueprint(sessions, userSettings, timezone, tradesPerDay);
            setBlueprintStr(result);
            
            const user = auth.currentUser;
            if (user) {
                await setDoc(doc(db, 'users', user.uid, 'settings', 'blueprint'), {
                    plan: result,
                    asianAssets,
                    londonAssets,
                    nyAssets,
                    timezone,
                    tradesPerDay,
                    updatedAt: Date.now()
                });
            }
        } catch (err) {
            setError("Failed to generate blueprint. Please try again.");
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/10 dark:bg-slate-950/10 text-slate-800 dark:text-slate-200 p-6 flex flex-col relative backdrop-blur-3xl">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white">
                            <Compass className="text-blue-500" /> Trading Blueprint
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Your Everyday Structural Trading Plan.</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={() => setShowRiskCalc(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors border border-indigo-200 dark:border-indigo-500/30">
                        <Calculator size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Risk Calculator</span>
                    </button>
                    <button onClick={() => setShowCheatSheet(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors border border-emerald-200 dark:border-emerald-500/30">
                        <BookOpen size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Tactical Academy</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Configuration Sidebar */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <div className="bg-white/40 dark:bg-slate-900/45 border border-white/50 dark:border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-3xl">
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Globe className="text-blue-500" size={18} /> Configure Sessions
                        </h2>
                        
                        <p className="text-xs text-slate-500 mb-6">Select 2-3 assets per active session to generate your personalized weekly trading schedule.</p>
                        
                        {/* Session: Asian */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                                <Clock size={14} /> Asian Session
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_ASSETS.map(asset => {
                                    const isSelected = asianAssets.includes(asset);
                                    const isDisabled = !isSelected && asianAssets.length >= 3;
                                    return (
                                        <button
                                            key={`asian-${asset}`}
                                            disabled={isDisabled}
                                            onClick={() => toggleAsset('Asian', asset)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                isSelected 
                                                ? 'bg-amber-500 text-white' 
                                                : isDisabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {asset}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Session: London */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-2">
                                <Clock size={14} /> London Session
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_ASSETS.map(asset => {
                                    const isSelected = londonAssets.includes(asset);
                                    const isDisabled = !isSelected && londonAssets.length >= 3;
                                    return (
                                        <button
                                            key={`london-${asset}`}
                                            disabled={isDisabled}
                                            onClick={() => toggleAsset('London', asset)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                isSelected 
                                                ? 'bg-blue-500 text-white' 
                                                : isDisabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {asset}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Session: New York */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
                                <Clock size={14} /> New York Session
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_ASSETS.map(asset => {
                                    const isSelected = nyAssets.includes(asset);
                                    const isDisabled = !isSelected && nyAssets.length >= 3;
                                    return (
                                        <button
                                            key={`ny-${asset}`}
                                            disabled={isDisabled}
                                            onClick={() => toggleAsset('New York', asset)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                isSelected 
                                                ? 'bg-emerald-500 text-white' 
                                                : isDisabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {asset}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Trades Per Day Selection */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-2">
                                <RefreshCcw size={14} /> Daily Trade Frequency
                            </h3>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="3" 
                                    max="10" 
                                    value={tradesPerDay} 
                                    onChange={(e) => setTradesPerDay(parseInt(e.target.value))}
                                    className="w-full accent-indigo-500"
                                />
                                <span className="text-sm font-bold w-12 text-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 py-1 rounded">
                                    {tradesPerDay}
                                </span>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-2">Target Trades Per Day (Min 3, Max 10)</p>
                        </div>

                        {/* Timezone Selection */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                                <Globe size={14} /> Local Timezone
                            </h3>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                {Intl.supportedValuesOf('timeZone').map(tz => (
                                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 font-bold mb-4">{error}</p>
                        )}

                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader /> : <><RefreshCcw size={18} /> Generate Blueprint</>}
                        </button>
                    </div>
                </div>

                {/* Blueprint Display */}
                <div className="w-full lg:w-2/3">
                    <div className="bg-white/40 dark:bg-slate-900/45 border border-white/50 dark:border-white/5 rounded-3xl p-8 min-h-[600px] shadow-xl backdrop-blur-3xl flex flex-col">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center h-[500px] text-slate-500">
                                <Loader />
                                <p className="mt-4 font-bold uppercase tracking-widest text-xs">Synthesizing Everyday Plan...</p>
                            </div>
                        ) : parsedBlueprint || blueprintStr ? (
                            <div className="flex flex-col gap-6">
                                {/* Download Timetable Header Section */}
                                <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Active Blueprint</h3>
                                        <p className="text-xs text-slate-500">Formulated in {timezone.replace(/_/g, ' ')}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {parsedBlueprint && (
                                            <>
                                                <button 
                                                    onClick={downloadBlueprintAsCSV}
                                                    title="Download schedule as Excel/CSV table"
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all border border-sky-200 dark:border-sky-500/30 text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                                >
                                                    <Download size={12} /> export csv
                                                </button>
                                                <button 
                                                    onClick={downloadBlueprintAsJSON}
                                                    title="Download structured JSON blueprint file"
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                                >
                                                    <Download size={12} /> export json
                                                </button>
                                            </>
                                        )}
                                        {blueprintStr && (
                                            <button 
                                                onClick={downloadBlueprintAsMarkdown}
                                                title="Download human-readable Markdown blueprint report"
                                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                            >
                                                <Download size={12} /> export markdown
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {parsedBlueprint ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-slate-500 w-1/4">Day</th>
                                                    <th className="p-4 border-b border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-amber-500 w-1/4">Asian Session</th>
                                                    <th className="p-4 border-b border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-blue-500 w-1/4">London Session</th>
                                                    <th className="p-4 border-b border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-emerald-500 w-1/4">New York Session</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                              {parsedBlueprint.schedule.map((dayPlan, i) => (
                                                 <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                     <td className="p-4 align-top">
                                                         <div className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-widest">{dayPlan.day}</div>
                                                         <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2">{dayPlan.focus}</div>
                                                     </td>
                                                     <td className="p-4 align-top">
                                                          <SessionColumn sessions={dayPlan.sessions.filter(s => s.name.toLowerCase().includes('asian'))} />
                                                     </td>
                                                     <td className="p-4 align-top border-l border-slate-100 dark:border-slate-800/50">
                                                          <SessionColumn sessions={dayPlan.sessions.filter(s => s.name.toLowerCase().includes('london'))} />
                                                     </td>
                                                     <td className="p-4 align-top border-l border-slate-100 dark:border-slate-800/50">
                                                          <SessionColumn sessions={dayPlan.sessions.filter(s => s.name.toLowerCase().includes('new york') || s.name.toLowerCase().includes('ny'))} />
                                                     </td>
                                                 </tr>
                                              ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="prose prose-slate dark:prose-invert max-w-none">
                                        <div className="markdown-body">
                                            <ReactMarkdown>{blueprintStr}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[500px] text-center text-slate-400">
                                <Compass size={48} className="mb-4 opacity-50" />
                                <h3 className="text-xl font-black uppercase tracking-widest text-slate-500">No Blueprint Active</h3>
                                <p className="text-sm max-w-sm mt-3">Select your sessions and assets on the left, then generate your daily trading strategy.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showRiskCalc && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[110]"
                    >
                        <RiskCalculator onClose={() => setShowRiskCalc(false)} />
                    </motion.div>
                )}
                {showCheatSheet && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[110]"
                    >
                        <CheatSheet onClose={() => setShowCheatSheet(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

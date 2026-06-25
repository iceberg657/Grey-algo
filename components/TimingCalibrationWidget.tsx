import React from 'react';
import { motion } from 'motion/react';
import { Clock, Radio, ShieldCheck, Zap, Volume2, Calendar, Gauge } from 'lucide-react';

interface TimingCalibrationData {
    optimalSession: string;
    timeBasedEntryScore: number;
    interestWindow: string;
    hftActivityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    institutionalVolumeExpected: boolean;
    setupValidityDuration: string;
    triggerHourUtc: string;
}

interface TimingCalibrationWidgetProps {
    data?: TimingCalibrationData;
    variant?: 'default' | 'sniper';
}

export const TimingCalibrationWidget: React.FC<TimingCalibrationWidgetProps> = ({ data, variant = 'default' }) => {
    if (!data) {
        return (
            <div className={`backdrop-blur-xl rounded-2xl border p-6 flex flex-col items-center justify-center text-center ${variant === 'sniper' ? 'bg-white/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50 rounded-[2rem]' : 'bg-white/40 dark:bg-slate-900/40 border-gray-200 dark:border-white/10'}`}>
                <Clock className="w-8 h-8 text-slate-400 animate-pulse mb-2" />
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Timing Calibration Inactive</span>
                <p className="text-xs text-slate-400 mt-1">Request a real-time signal setup to initiate timing calculations.</p>
            </div>
        );
    }

    const {
        optimalSession,
        timeBasedEntryScore,
        interestWindow,
        hftActivityLevel,
        institutionalVolumeExpected,
        setupValidityDuration,
        triggerHourUtc
    } = data;

    // Determine the color theme of the score
    const getScoreColor = (score: number) => {
        if (score >= 90) return { text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20' };
        if (score >= 75) return { text: 'text-sky-500 dark:text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-500/10', glow: 'shadow-sky-500/20' };
        if (score >= 50) return { text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/20' };
        return { text: 'text-rose-500 dark:text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10', glow: 'shadow-rose-500/20' };
    };

    const colors = getScoreColor(timeBasedEntryScore);
    const strokeDashoffset = 251.2 - (251.2 * timeBasedEntryScore) / 100;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            id="timing-calibration-widget"
            className={`relative overflow-hidden ${
                variant === 'sniper' 
                ? 'bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[2rem] p-6' 
                : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-xl'
            }`}
        >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-500/10 dark:bg-sky-500/20 rounded-xl">
                        <Gauge className="w-5 h-5 text-sky-500 dark:text-sky-400 animate-spin-slow" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-wider uppercase text-slate-800 dark:text-white">Timing Calibration Engine</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono">Institutional Liquidity Clock</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black tracking-widest uppercase font-mono text-slate-500 dark:text-slate-400">
                    <Radio className="w-3 h-3 text-red-500 animate-pulse" /> Live Calibration
                </div>
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Score Circle (Column span 4) */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Outer Track */}
                            <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                className="stroke-slate-100 dark:stroke-slate-800" 
                                strokeWidth="8" 
                                fill="transparent" 
                            />
                            {/* Inner Active Ring */}
                            <motion.circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                className={`stroke-current ${colors.text}`}
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray="251.2"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">
                                {timeBasedEntryScore}%
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Calibration
                            </span>
                        </div>
                    </div>
                    <div className="mt-2 text-center">
                        <span className={`text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {timeBasedEntryScore >= 90 ? 'Perfect Alignment' : timeBasedEntryScore >= 75 ? 'Optimal Timing' : timeBasedEntryScore >= 50 ? 'Moderate Risk' : 'High Noise Warning'}
                        </span>
                    </div>
                </div>

                {/* Metrics list (Column span 8) */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Optimal Session */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-white/5 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Optimal Session</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white mt-0.5 block">{optimalSession}</span>
                        </div>
                    </div>

                    {/* Interest Window */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-white/5 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Interest Window</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white mt-0.5 block">{interestWindow}</span>
                        </div>
                    </div>

                    {/* HFT Activity Level */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-white/5 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HFT Activity Level</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-black uppercase tracking-widest ${
                                    hftActivityLevel === 'HIGH' ? 'text-red-500 dark:text-red-400' :
                                    hftActivityLevel === 'MEDIUM' ? 'text-amber-500 dark:text-amber-400' :
                                    'text-emerald-500 dark:text-emerald-400'
                                }`}>
                                    {hftActivityLevel}
                                </span>
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                    <div 
                                        className={`h-full rounded-full ${
                                            hftActivityLevel === 'HIGH' ? 'bg-red-500' :
                                            hftActivityLevel === 'MEDIUM' ? 'bg-amber-500' :
                                            'bg-emerald-500'
                                        }`}
                                        style={{ width: hftActivityLevel === 'HIGH' ? '100%' : hftActivityLevel === 'MEDIUM' ? '60%' : '30%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Institutional Volume */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-white/5 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <Volume2 className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Smart Money Volume</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-black text-slate-800 dark:text-white">
                                    {institutionalVolumeExpected ? 'EXPECTED ✅' : 'LOW DENSITY ⚠️'}
                                </span>
                                {institutionalVolumeExpected && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Invalidation/Validity Footer banner */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Trigger Clock (UTC): <strong className="font-mono text-slate-800 dark:text-white">{triggerHourUtc}</strong></span>
                </div>
                <div className="text-xs px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-300 font-medium">
                    {setupValidityDuration}
                </div>
            </div>
        </motion.div>
    );
};

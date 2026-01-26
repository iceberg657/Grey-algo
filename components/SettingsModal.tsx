
import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import type { UserSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useSettings();
    const [formData, setFormData] = useState<UserSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            updateSettings(formData);
            setIsSaving(false);
            onClose();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border-2 border-gray-200 dark:border-green-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gray-100 dark:bg-slate-800/80 p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-2xl text-green-600 dark:text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">System Configuration</h3>
                            <p className="text-xs text-gray-500 dark:text-green-400/70 font-bold uppercase tracking-widest">Personalize AI Risk Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Philosophical Mission */}
                    <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-xl">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium leading-relaxed">
                                <span className="font-bold">Safe Trading Protocol:</span> GreyAlpha enforces responsible trading habits. These parameters help AI detect setups that align with capital preservation and funded account discipline.
                            </p>
                        </div>
                    </div>

                    {/* Account Type Selector */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-3">Target Account Profile</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['Real', 'Funded'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFormData(prev => ({ ...prev, accountType: type }))}
                                    className={`px-4 py-3 text-sm font-black rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                                        formData.accountType === type 
                                        ? 'bg-green-600 text-white border-green-400 shadow-lg shadow-green-600/30 scale-105' 
                                        : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-green-500/50'
                                    }`}
                                >
                                    {type === 'Funded' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                                    {type} ACCOUNT
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Account Balance */}
                        <div className="col-span-full">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2">Starting Balance</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                <input 
                                    type="number" 
                                    value={formData.balance}
                                    onChange={(e) => setFormData(prev => ({ ...prev, balance: Number(e.target.value) }))}
                                    className="w-full bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl p-4 pl-10 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg font-bold"
                                />
                            </div>
                        </div>

                        {/* Daily Drawdown */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2">Daily Drawdown %</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={formData.dailyDrawdownLimit}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dailyDrawdownLimit: Number(e.target.value) }))}
                                    className="w-full bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl p-4 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg font-bold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                            </div>
                        </div>

                        {/* Max Drawdown */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2">Max Drawdown %</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={formData.maxDrawdownLimit}
                                    onChange={(e) => setFormData(prev => ({ ...prev, maxDrawdownLimit: Number(e.target.value) }))}
                                    className="w-full bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl p-4 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg font-bold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                            </div>
                        </div>

                        {/* Optional Time Limit */}
                        <div className="col-span-full">
                            <label className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Target Deadline (Optional)</span>
                                <span className="text-[9px] font-bold text-blue-400 uppercase">Challenge Mode</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    placeholder="Enter days to hit target..."
                                    value={formData.timeLimitDays || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, timeLimitDays: e.target.value ? Number(e.target.value) : undefined }))}
                                    className="w-full bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl p-4 focus:ring-2 focus:ring-green-500 outline-none font-medium placeholder:text-gray-600"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">DAYS</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white font-black py-5 rounded-2xl transition-all transform active:scale-95 disabled:opacity-50 shadow-xl shadow-green-900/20 flex items-center justify-center gap-3 mt-4"
                    >
                        {isSaving ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                SYNCING NEURAL RISK PARAMETERS...
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                APPLY RISK PROTOCOLS
                            </>
                        )}
                    </button>
                    
                    <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-2 px-8">
                        *Settings are used to tailor AI signals for capital preservation and high-precision execution.
                    </p>
                </div>
            </div>
        </div>
    );
};

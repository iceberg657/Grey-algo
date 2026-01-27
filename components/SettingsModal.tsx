
import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../types';

interface SettingsModalProps {
    onClose: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
    accountType: 'Funded',
    accountBalance: 100000,
    targetPercentage: 10,
    dailyDrawdown: 5,
    maxDrawdown: 10,
    timeLimit: 30
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('greyquant_user_settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    }, []);

    const handleChange = (field: keyof UserSettings, value: string | number) => {
        setSettings(prev => ({
            ...prev,
            [field]: typeof prev[field] === 'number' ? Number(value) : value
        }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('greyquant_user_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 800);
    };

    // Calculate actual monetary values for preview
    const targetAmount = settings.accountBalance * (settings.targetPercentage / 100);
    const dailyLossLimit = settings.accountBalance * (settings.dailyDrawdown / 100);
    const maxLossLimit = settings.accountBalance * (settings.maxDrawdown / 100);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-gray-200 dark:border-blue-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gray-100 dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Account Settings</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Configure your trading objectives</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSave} className="space-y-6">
                        
                        {/* Account Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleChange('accountType', 'Funded')}
                                    className={`py-2 px-4 rounded-lg border font-semibold transition-all ${
                                        settings.accountType === 'Funded'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    Funded Challenge
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('accountType', 'Real')}
                                    className={`py-2 px-4 rounded-lg border font-semibold transition-all ${
                                        settings.accountType === 'Real'
                                        ? 'bg-green-600 text-white border-green-600 shadow-md'
                                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    Real Account
                                </button>
                            </div>
                        </div>

                        {/* Account Balance */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Balance</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                <input
                                    type="number"
                                    value={settings.accountBalance}
                                    onChange={(e) => handleChange('accountBalance', e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    placeholder="100000"
                                    required
                                />
                            </div>
                        </div>

                        {/* Targets & Time Limit */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings.targetPercentage}
                                        onChange={(e) => handleChange('targetPercentage', e.target.value)}
                                        className="w-full pr-8 pl-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        required
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                                </div>
                                <p className="text-[10px] text-green-500 mt-1 font-mono">+${targetAmount.toLocaleString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Limit</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={settings.timeLimit}
                                        onChange={(e) => handleChange('timeLimit', e.target.value)}
                                        className="w-full pr-12 pl-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white disabled:opacity-50"
                                        disabled={settings.accountType === 'Real'}
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500 text-xs mt-0.5">Days</span>
                                </div>
                                {settings.accountType === 'Real' && <p className="text-[10px] text-gray-400 mt-1">N/A for Real Acc</p>}
                            </div>
                        </div>

                        {/* Drawdown Limits */}
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Risk Constraints
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-red-200/80 mb-1">Daily Drawdown (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.dailyDrawdown}
                                            onChange={(e) => handleChange('dailyDrawdown', e.target.value)}
                                            className="w-full pr-8 pl-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-red-500/30 rounded focus:ring-1 focus:ring-red-500 outline-none text-gray-900 dark:text-white text-sm"
                                        />
                                        <span className="absolute right-2 top-1.5 text-gray-400 text-xs">%</span>
                                    </div>
                                    <p className="text-[10px] text-red-400 mt-1 font-mono">-${dailyLossLimit.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-red-200/80 mb-1">Max Drawdown (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.maxDrawdown}
                                            onChange={(e) => handleChange('maxDrawdown', e.target.value)}
                                            className="w-full pr-8 pl-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-red-500/30 rounded focus:ring-1 focus:ring-red-500 outline-none text-gray-900 dark:text-white text-sm"
                                        />
                                        <span className="absolute right-2 top-1.5 text-gray-400 text-xs">%</span>
                                    </div>
                                    <p className="text-[10px] text-red-400 mt-1 font-mono">-${maxLossLimit.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center ${saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-500 active:scale-95'}`}
                            >
                                {saved ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Saved!
                                    </>
                                ) : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

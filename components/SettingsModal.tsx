
import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../types';
import { CTraderConnectionManager } from './CTraderConnectionManager';
import { useAuthContext } from './contexts/AuthContext';

interface SettingsModalProps {
    onClose: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
    accountType: 'Funded',
    accountBalance: 100000,
    riskPerTrade: 1.0,
    targetPercentage: 10,
    dailyDrawdown: 5,
    maxDrawdown: 10,
    timeLimit: 30,
    twelveDataApiKey: '',
    deepThinking: true,
    showDashboardSignals: true,
    playSoundOnNotification: true
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);
    const { userMetadata } = useAuthContext();

    useEffect(() => {
        const stored = localStorage.getItem('greyquant_user_settings');
        if (stored) {
            try {
                // Merge stored settings with defaults to ensure new fields like riskPerTrade exist
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
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
        
        let oldLang = 'English';
        try {
            const stored = localStorage.getItem('greyquant_user_settings');
            if (stored) {
                oldLang = JSON.parse(stored).language || 'English';
            }
        } catch (err) {}
        
        localStorage.setItem('greyquant_user_settings', JSON.stringify(settings));
        
        const newLang = settings.language || 'English';
        if (oldLang !== newLang) {
            const langMap: Record<string, string> = {
                'English': 'en',
                'French': 'fr',
                'Arabic': 'ar',
                'Spanish': 'es',
                'Persian': 'fa'
            };
            const langCode = langMap[newLang] || 'en';
            document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}; SameSite=None; Secure`;
            document.cookie = `googtrans=/en/${langCode}; path=/; SameSite=None; Secure`;
            window.location.reload();
            return;
        }

        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 800);
    };

    // Calculate actual monetary values for preview
    const targetAmount = settings.accountBalance * (settings.targetPercentage / 100);
    const riskAmount = settings.accountBalance * (settings.riskPerTrade / 100);
    const dailyLossLimit = settings.accountBalance * (settings.dailyDrawdown / 100);
    const maxLossLimit = settings.accountBalance * (settings.maxDrawdown / 100);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-lg rounded-2xl border border-gray-200/50 dark:border-blue-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trade Mode (Filtering)</label>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    type="button"
                                    onClick={() => handleChange('tradeMode', 'Aggressive')}
                                    className={`py-2 px-4 rounded-lg border font-semibold transition-all flex flex-col items-center justify-center backdrop-blur-sm ${
                                        settings.tradeMode === 'Aggressive' || !settings.tradeMode
                                        ? 'bg-orange-600/90 text-white border-orange-600 shadow-md'
                                        : 'bg-white/50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <span>🔥 Aggressive</span>
                                    <span className="text-[10px] font-normal opacity-80">Take all valid trades</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('tradeMode', 'Sniper')}
                                    className={`py-2 px-4 rounded-lg border font-semibold transition-all flex flex-col items-center justify-center backdrop-blur-sm ${
                                        settings.tradeMode === 'Sniper'
                                        ? 'bg-emerald-600/90 text-white border-emerald-600 shadow-md'
                                        : 'bg-white/50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <span>🎯 Sniper</span>
                                    <span className="text-[10px] font-normal opacity-80">Strict Confluence Only</span>
                                </button>
                            </div>

                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4 flex items-center justify-between">
                                Institutional Execution Algorithm
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded ml-2 uppercase tracking-wider">Premium Quant</span>
                            </label>
                            <select 
                                value={settings.executionAlgorithm || 'Standard'}
                                onChange={(e) => handleChange('executionAlgorithm', e.target.value)}
                                className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                            >
                                <option value="Standard">Standard Routing</option>
                                <option value="TWAP">Time-Weighted Average Price (TWAP)</option>
                                <option value="VWAP">Volume-Weighted Average Price (VWAP)</option>
                                <option value="Smart Order Router (SOR)">Smart Order Router (SOR)</option>
                                <option value="Implementation Shortfall">Implementation Shortfall</option>
                            </select>

                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleChange('accountType', 'Funded')}
                                    className={`py-2 px-4 rounded-lg border font-semibold transition-all backdrop-blur-sm ${
                                        settings.accountType === 'Funded'
                                        ? 'bg-blue-600/90 text-white border-blue-600 shadow-md'
                                        : 'bg-white/50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    Funded Challenge
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('accountType', 'Real')}
                                    className={`py-2 px-4 rounded-lg border font-semibold transition-all backdrop-blur-sm ${
                                        settings.accountType === 'Real'
                                        ? 'bg-green-600/90 text-white border-green-600 shadow-md'
                                        : 'bg-white/50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    Real Account
                                </button>
                            </div>
                        </div>

                        {/* Account Balance */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Balance</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={settings.accountBalance}
                                        onChange={(e) => handleChange('accountBalance', e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        placeholder="100000"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Risk Per Trade & Target */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Per Trade (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings.riskPerTrade}
                                        onChange={(e) => handleChange('riskPerTrade', e.target.value)}
                                        className="w-full pr-8 pl-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        required
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                                </div>
                                <p className="text-[10px] text-blue-400 mt-1 font-mono">Risking: ${riskAmount.toLocaleString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profit Target (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings.targetPercentage}
                                        onChange={(e) => handleChange('targetPercentage', e.target.value)}
                                        className="w-full pr-8 pl-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        required
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                                </div>
                                <p className="text-[10px] text-green-500 mt-1 font-mono">Goal: +${targetAmount.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Language / Localization */}
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                                <select
                                    value={settings.language || 'English'}
                                    onChange={(e) => handleChange('language', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                >
                                    <option value="English">English</option>
                                    <option value="French">French</option>
                                    <option value="Arabic">Arabic</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="Persian">Persian (Farsi)</option>
                                                                </select>
                            </div>
                        </div>

                        {/* Streaming Mode */}
                        <div className="grid grid-cols-1 gap-4 mt-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Streaming Mode</label>
                                <select
                                    value={settings.streamingMode || 'Standard'}
                                    onChange={(e) => handleChange('streamingMode', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                >
                                    <option value="Standard">Standard Streaming (Deriv 60s)</option>
                                    <option value="Advanced">Advanced Streaming (cTrader Level 2 / Tick)</option>
                                </select>
                                {userMetadata?.access?.advancedStreaming !== 'granted' && (
                                    <p className="text-[10px] text-amber-500 mt-1">Requires Admin permission to enable Advanced Streaming.</p>
                                )}
                            </div>
                        </div>

                        {/* Drawdown Limits */}
                        <div className="bg-red-50/50 dark:bg-red-900/10 backdrop-blur-sm p-4 rounded-xl border border-red-200 dark:border-red-500/20">
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
                                            className="w-full pr-8 pl-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-red-500/30 rounded focus:ring-1 focus:ring-red-500 outline-none text-gray-900 dark:text-white text-sm"
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
                                            className="w-full pr-8 pl-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-red-500/30 rounded focus:ring-1 focus:ring-red-500 outline-none text-gray-900 dark:text-white text-sm"
                                        />
                                        <span className="absolute right-2 top-1.5 text-gray-400 text-xs">%</span>
                                    </div>
                                    <p className="text-[10px] text-red-400 mt-1 font-mono">-${maxLossLimit.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* API Keys Section */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-sm p-4 rounded-xl border border-blue-200 dark:border-blue-500/20">
                            <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                External API Integrations
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200/80 mb-1">Twelve Data API Key (Market Data)</label>
                                    <input
                                        type="password"
                                        value={settings.twelveDataApiKey || ''}
                                        onChange={(e) => handleChange('twelveDataApiKey', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-blue-500/30 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                                        placeholder="Enter your Twelve Data API Key"
                                    />
                                    <p className="text-[10px] text-blue-400 mt-1">If set, this key will be used for market data confluence.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200/80 mb-1">Deriv API Token (Sniper Live Trade - Legacy)</label>
                                    <input
                                        type="password"
                                        value={settings.derivApiToken || ''}
                                        onChange={(e) => handleChange('derivApiToken', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-blue-500/30 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                                        placeholder="Enter your Deriv Legacy API Token"
                                    />
                                    <p className="text-[10px] text-blue-400 mt-1">Required for fetching live Forex/Gold prices in Sniper Live Trade.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200/80 mb-1">Deriv API Token (Trade Notification - New)</label>
                                    <input
                                        type="password"
                                        value={settings.tradeNotificationDerivToken || ''}
                                        onChange={(e) => handleChange('tradeNotificationDerivToken', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-blue-500/30 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                                        placeholder="Enter your Deriv API Token"
                                    />
                                    <p className="text-[10px] text-blue-400 mt-1">Required for fetching price history in Trade Notification Page.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200/80 mb-1">Custom Gemini API Key (Neural Lane Override)</label>
                                    <input
                                        type="password"
                                        value={settings.geminiApiKey || ''}
                                        onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-blue-500/30 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                                        placeholder="Enter your Gemini Pro API Key"
                                    />
                                    <p className="text-[10px] text-blue-400 mt-1">If set, this key will be prioritized for AI analysis and Intelligence.</p>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-violet-500/10 dark:bg-violet-500/5 rounded-lg border border-violet-500/30">
                                    <div>
                                        <label className="block text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                                            <span>🧠 AI Deep Thinking Analysis</span>
                                            <span className="px-1.5 py-0.5 bg-violet-600/20 text-violet-600 dark:text-violet-400 text-[8px] uppercase tracking-wider rounded font-bold">Pro Reasoning</span>
                                        </label>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400">Runs high-level reasoning models to filter raw charts, identify traps, and prevent false market entry.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSettings(prev => ({ ...prev, deepThinking: !prev.deepThinking }))}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${settings.deepThinking ? 'bg-violet-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.deepThinking ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-blue-500/20">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-blue-200">Strict Key Mode</label>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400">Ignore neural pools and only use the key above.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleChange('useStrictKeyMode', settings.useStrictKeyMode ? 0 : 1)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${settings.useStrictKeyMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.useStrictKeyMode ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-sm p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.07 6.07 0 00-1-3.5M9 17v1a3 3 0 006 0v-1m-6 0H9m1.405-1.405A2.032 2.032 0 0110 14.158V11a6.07 6.07 0 00-1-3.5m-1 1a3 3 0 100 6M4 17h5" />
                                </svg>
                                Notification Alerts
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-emerald-500/20">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-emerald-400">Live Dashboard Signals</label>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400">Display active signals and high-probability SMC setups on your dashboard.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={async () => {
                                            const nextVal = settings.showDashboardSignals === false;
                                            setSettings(prev => ({ ...prev, showDashboardSignals: nextVal }));
                                            if (nextVal && 'Notification' in window && Notification.permission !== 'granted') {
                                                await Notification.requestPermission();
                                            }
                                        }}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${settings.showDashboardSignals !== false ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showDashboardSignals !== false ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-emerald-500/20">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-emerald-400">Chime Audio Alerts</label>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400">Play a double-tone institutional chime when a live trading signal is identified.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSettings(prev => ({ ...prev, playSoundOnNotification: prev.playSoundOnNotification === false }))}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${settings.playSoundOnNotification !== false ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.playSoundOnNotification !== false ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                                                {settings.streamingMode === 'Advanced' && (
                            <div className="pt-2">
                                {userMetadata?.access?.advancedStreaming !== 'granted' ? (
                                    <div className="relative group">
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px] rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg mb-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-widest text-center px-4">
                                                Advanced Streaming Locked
                                            </p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 text-center px-4 max-w-xs">
                                                Requires Admin permission. You cannot connect your cTrader account until access is granted.
                                            </p>
                                        </div>
                                        <div className="opacity-40 pointer-events-none select-none blur-[1px]">
                                            <CTraderConnectionManager />
                                        </div>
                                    </div>
                                ) : (
                                    <CTraderConnectionManager />
                                )}
                            </div>
                        )}

                        <div className="pt-2 space-y-3">
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
                            
                            <button
                                type="button"
                                onClick={() => {
                                    const keys = Object.keys(localStorage);
                                    keys.forEach(key => {
                                        if (key.startsWith('greyalpha_onboarding_')) {
                                            localStorage.removeItem(key);
                                        }
                                    });
                                    window.location.reload();
                                }}
                                className="w-full py-3 rounded-xl font-bold text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Re-run Welcome Tutorial
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


import React, { useState, useEffect } from 'react';

interface RiskCalculatorProps {
    onClose: () => void;
}

const ASSET_TYPES = {
    'Forex': { pipValue: 10, label: 'Pips' },
    'Indices (US30/NAS)': { pipValue: 1, label: 'Points' },
    'Gold (XAU)': { pipValue: 1, label: 'Points ($)' },
    'Crypto (BTC)': { pipValue: 1, label: 'Points ($)' }
};

export const RiskCalculator: React.FC<RiskCalculatorProps> = ({ onClose }) => {
    const [accountBalance, setAccountBalance] = useState<number>(100000);
    const [riskPercentage, setRiskPercentage] = useState<number>(1.0);
    const [stopLoss, setStopLoss] = useState<number>(15);
    const [assetType, setAssetType] = useState<keyof typeof ASSET_TYPES>('Forex');
    const [lotSize, setLotSize] = useState<string>('0.00');
    const [riskAmount, setRiskAmount] = useState<number>(0);

    useEffect(() => {
        // Calculation Logic
        const amountAtRisk = accountBalance * (riskPercentage / 100);
        setRiskAmount(amountAtRisk);

        if (stopLoss <= 0) {
            setLotSize('0.00');
            return;
        }

        // Standard Lot Calculation Formula:
        // Lots = Risk Amount / (Stop Loss * Pip Value)
        // Note: This is a simplified approximation for major pairs/indices
        const config = ASSET_TYPES[assetType];
        const rawLots = amountAtRisk / (stopLoss * config.pipValue);
        
        // Crypto usually calculated in Units, Forex in Standard Lots (100k)
        let formattedLots = rawLots.toFixed(2);
        
        if (assetType === 'Crypto (BTC)') {
            formattedLots = rawLots.toFixed(3); // BTC needs more precision
        }

        setLotSize(formattedLots);

    }, [accountBalance, riskPercentage, stopLoss, assetType]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-gray-200 dark:border-green-500/30 shadow-2xl overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gray-100 dark:bg-slate-800/50 p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-white">Position Size Calculator</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    
                    {/* Asset Type Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Asset Class</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(ASSET_TYPES).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setAssetType(type as keyof typeof ASSET_TYPES)}
                                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                                        assetType === type 
                                        ? 'bg-green-500 text-white border-green-600' 
                                        : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-green-500/50'
                                    }`}
                                >
                                    {type.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Account Balance */}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Account Balance ($)</label>
                            <input 
                                type="number" 
                                value={accountBalance}
                                onChange={(e) => setAccountBalance(Number(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none font-mono"
                            />
                        </div>

                        {/* Risk Percentage */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Risk (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={riskPercentage}
                                    onChange={(e) => setRiskPercentage(Number(e.target.value))}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none font-mono"
                                />
                                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                            </div>
                        </div>

                        {/* Stop Loss */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{ASSET_TYPES[assetType].label}</label>
                            <input 
                                type="number" 
                                value={stopLoss}
                                onChange={(e) => setStopLoss(Number(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none font-mono"
                            />
                        </div>
                    </div>

                    {/* Result Display */}
                    <div className="mt-6 bg-gradient-to-r from-gray-900 to-slate-800 p-4 rounded-xl shadow-inner border border-gray-700">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-gray-400 text-sm">Suggested Lot Size</span>
                            <span className="text-green-400 font-mono text-3xl font-bold tracking-tight">{lotSize}</span>
                        </div>
                        <div className="w-full h-px bg-gray-700 my-2"></div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">Amount at Risk</span>
                            <span className="text-red-400 font-mono font-medium">-${riskAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-center text-gray-400 mt-2">
                        *Calculations are estimates. Verify contract sizes with your broker.
                    </p>
                </div>
            </div>
        </div>
    );
};

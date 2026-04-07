
import React from 'react';

interface ErrorMessageProps {
    message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    const isQuotaError = message.toLowerCase().includes('quota') || message.toLowerCase().includes('429');
    
    return (
        <div className="text-center p-8 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
            
            <div className="relative z-10">
                <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-red-500/20 group-hover:scale-110 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-widest text-gray-800 dark:text-red-400 mb-2">
                    System Anomaly Detected
                </h3>
                
                <div className="bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
                    <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
                        {message}
                    </p>
                </div>

                {isQuotaError && (
                    <div className="text-left bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Neural Lane Congestion (Quota Exceeded)
                        </h4>
                        <ul className="text-[10px] text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-4">
                            <li>Your Gemini API key has reached its free tier limit.</li>
                            <li>Wait 60 seconds for the quota to reset.</li>
                            <li>Add more API keys in the Settings to enable Neural Lane Rotation.</li>
                            <li>Switch to 'Sniper Mode' to reduce API calls.</li>
                        </ul>
                    </div>
                )}

                <button 
                    onClick={() => window.location.reload()}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                >
                    Reboot Neural Interface
                </button>
            </div>
        </div>
    );
};

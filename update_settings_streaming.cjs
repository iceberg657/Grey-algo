const fs = require('fs');
let content = fs.readFileSync('components/SettingsModal.tsx', 'utf8');

// 1. Update the select element
const search1 = `<select
                                    value={settings.streamingMode || 'Standard'}
                                    onChange={(e) => handleChange('streamingMode', e.target.value)}
                                    disabled={userMetadata?.access?.advancedStreaming !== 'granted'}
                                    className={\`w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white \${userMetadata?.access?.advancedStreaming !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}\`}
                                >`;

const replace1 = `<select
                                    value={settings.streamingMode || 'Standard'}
                                    onChange={(e) => handleChange('streamingMode', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                >`;

content = content.replace(search1, replace1);

// 2. Wrap the CTraderConnectionManager
const search2 = `<div className="pt-2">
                            <CTraderConnectionManager />
                        </div>`;

const replace2 = `                        {settings.streamingMode === 'Advanced' && (
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
                        )}`;

content = content.replace(search2, replace2);

fs.writeFileSync('components/SettingsModal.tsx', content);

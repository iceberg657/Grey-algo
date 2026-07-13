const fs = require('fs');
let content = fs.readFileSync('components/SettingsModal.tsx', 'utf8');

const replacement = `                                </select>
                            </div>
                        </div>

                        {/* Streaming Mode */}
                        <div className="grid grid-cols-1 gap-4 mt-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Streaming Mode</label>
                                <select
                                    value={settings.streamingMode || 'Standard'}
                                    onChange={(e) => handleChange('streamingMode', e.target.value)}
                                    disabled={userMetadata?.access?.advancedStreaming !== 'granted'}
                                    className={\`w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white \${userMetadata?.access?.advancedStreaming !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}\`}
                                >
                                    <option value="Standard">Standard Streaming (Deriv 60s)</option>
                                    <option value="Advanced">Advanced Streaming (cTrader Level 2 / Tick)</option>
                                </select>
                                {userMetadata?.access?.advancedStreaming !== 'granted' && (
                                    <p className="text-[10px] text-amber-500 mt-1">Requires Admin permission to enable Advanced Streaming.</p>
                                )}
                            </div>
                        </div>`;

content = content.replace(/<\/select>\s*<\/div>\s*<\/div>/g, (match, offset, str) => {
    // We want the last occurrence or just replace the specific one.
    if(str.substring(offset - 100, offset).includes('Persian (Farsi)')) {
        return replacement;
    }
    return match;
});
fs.writeFileSync('components/SettingsModal.tsx', content);

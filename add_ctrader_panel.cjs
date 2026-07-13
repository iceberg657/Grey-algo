const fs = require('fs');
let content = fs.readFileSync('components/SniperLiveTrade.tsx', 'utf8');

const targetStr = `            <div className="mb-8 sticky top-20 z-40 bg-slate-50/80 dark:bg-[#020617]/80 backdrop-blur-md py-2 transition-colors duration-300">`;

const replacement = `            {/* Advanced Streaming Panel */}
            {userSettings?.streamingMode === 'Advanced' && lastAnalyzedAsset && (
              <div className="mb-4">
                 <CTraderAdvancedData symbol={lastAnalyzedAsset} />
              </div>
            )}

            {/* Style Selector */}
            <div className="mb-8 sticky top-20 z-40 bg-slate-50/80 dark:bg-[#020617]/80 backdrop-blur-md py-2 transition-colors duration-300">`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('components/SniperLiveTrade.tsx', content);

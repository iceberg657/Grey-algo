const fs = require('fs');
let content = fs.readFileSync('components/SniperLiveTrade.tsx', 'utf8');

const targetStart = `const fetchLivePrice = async (asset: string) => {`;
const targetEndString = `setIsFetchingPrice(false);
    }
  };`;

const startIdx = content.indexOf(targetStart);
if (startIdx !== -1) {
    const endIdx = content.indexOf(targetEndString, startIdx);
    if (endIdx !== -1) {
        const fullEndIdx = endIdx + targetEndString.length;
        
        const replacement = `const fetchLivePrice = async (asset: string) => {
    setIsFetchingPrice(true);
    try {
      // Check user settings for streaming mode
      let isAdvancedStreaming = false;
      let ctToken = '';
      let ctAccount = '';
      let ctEnvironment = 'demo';
      
      try {
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          isAdvancedStreaming = parsed.streamingMode === 'Advanced';
        }
        ctToken = localStorage.getItem('ctrader_access_token') || '';
        ctAccount = localStorage.getItem('ctrader_account_id') || '';
        ctEnvironment = localStorage.getItem('ctrader_environment') || 'demo';
      } catch (e) {}

      // If Advanced Streaming but cTrader is not connected, fallback to Deriv
      if (isAdvancedStreaming && (!ctToken || !ctAccount)) {
         console.warn("[SniperLiveTrade] Advanced Streaming selected but cTrader not connected. Falling back to Deriv.");
         isAdvancedStreaming = false;
      }

      // Define 3 timeframes based on trading style
      const getTimeframes = (style: string) => {
        if (style.includes('scalping')) {
            return { entry: 300, confirm: 900, htf: 3600, ctEntry: 'M5', ctConfirm: 'M15', ctHtf: 'H1' }; // 5m, 15m, 1h
        } else if (style.includes('swing')) {
            return { entry: 14400, confirm: 86400, htf: 604800, ctEntry: 'H4', ctConfirm: 'D1', ctHtf: 'W1' }; // 4h, 1d, 1w
        } else {
            return { entry: 900, confirm: 3600, htf: 14400, ctEntry: 'M15', ctConfirm: 'H1', ctHtf: 'H4' }; // Day: 15m, 1h, 4h
        }
      };
      
      const timeframes = getTimeframes(style);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), 35000); 

      let entryData, confirmData, htfData;
      let ctraderTicks = null;
      let usedBroker = 'Deriv';

      if (isAdvancedStreaming) {
          usedBroker = 'cTrader';
          const ctAsset = asset.replace('/', '').replace('-', '');
          console.log(\`[SniperLiveTrade] Fetching Advanced Data from cTrader for \${ctAsset}...\`);
          
          // Fetch from cTrader API
          const [entryRes, confirmRes, htfRes, tickRes] = await Promise.all([
              fetch(\`/api/ctrader/trendbars?symbol=\${ctAsset}&period=\${timeframes.ctEntry}&accountId=\${ctAccount}&environment=\${ctEnvironment}&count=1000\`, { headers: { 'Authorization': \`Bearer \${ctToken}\` }, signal: controller.signal }),
              fetch(\`/api/ctrader/trendbars?symbol=\${ctAsset}&period=\${timeframes.ctConfirm}&accountId=\${ctAccount}&environment=\${ctEnvironment}&count=1000\`, { headers: { 'Authorization': \`Bearer \${ctToken}\` }, signal: controller.signal }),
              fetch(\`/api/ctrader/trendbars?symbol=\${ctAsset}&period=\${timeframes.ctHtf}&accountId=\${ctAccount}&environment=\${ctEnvironment}&count=1000\`, { headers: { 'Authorization': \`Bearer \${ctToken}\` }, signal: controller.signal }),
              fetch(\`/api/ctrader/ticks?symbol=\${ctAsset}&type=BID&accountId=\${ctAccount}&environment=\${ctEnvironment}\`, { headers: { 'Authorization': \`Bearer \${ctToken}\` }, signal: controller.signal })
          ]);
          
          clearTimeout(timeoutId);
          
          const [eData, cData, hData, tData] = await Promise.all([
              entryRes.json(), confirmRes.json(), htfRes.json(), tickRes.json()
          ]);
          
          if (eData.error) throw new Error(\`cTrader Error: \${eData.error}\`);
          
          entryData = eData;
          confirmData = cData;
          htfData = hData;
          if (tData && tData.ticks) {
             ctraderTicks = tData.ticks;
          }
      } else {
          // Fallback / Standard Deriv Fetch
          usedBroker = 'Deriv';
          const symbol = getDerivSymbol(asset);
          let clientToken = '';
          try {
            const storedSettings = localStorage.getItem('greyquant_user_settings');
            if (storedSettings) {
              const parsed = JSON.parse(storedSettings);
              if (parsed.derivApiToken) clientToken = parsed.derivApiToken;
            }
          } catch (e) {}
                
          if (!clientToken) {
            clientToken = import.meta.env.VITE_DERIV_API_TOKEN || import.meta.env.VITE_DERIV_TOKEN || '';
          }

          console.log(\`[SniperLiveTrade] Fetching Standard Data from Deriv for \${symbol}...\`);
          const [entryRes, confirmRes, htfRes] = await Promise.all([
              fetch(\`/api/derivData?symbol=\${symbol}&history=true&granularity=\${timeframes.entry}&count=1000\${clientToken ? \`&token=\${encodeURIComponent(clientToken)}\` : ''}\`, { signal: controller.signal, cache: 'no-store' }),
              fetch(\`/api/derivData?symbol=\${symbol}&history=true&granularity=\${timeframes.confirm}&count=1000\${clientToken ? \`&token=\${encodeURIComponent(clientToken)}\` : ''}\`, { signal: controller.signal, cache: 'no-store' }),
              fetch(\`/api/derivData?symbol=\${symbol}&history=true&granularity=\${timeframes.htf}&count=1000\${clientToken ? \`&token=\${encodeURIComponent(clientToken)}\` : ''}\`, { signal: controller.signal, cache: 'no-store' })
          ]);
          
          clearTimeout(timeoutId);
          
          const [eData, cData, hData] = await Promise.all([
              entryRes.json(), confirmRes.json(), htfRes.json()
          ]);
          
          if (eData.error) throw new Error(eData.error);
          entryData = eData;
          confirmData = cData;
          htfData = hData;
      }
      
      // Parse out live price from the last candle
      const lastCandle = entryData.candles && entryData.candles.length > 0 ? entryData.candles[entryData.candles.length - 1] : null;
      
      if (!lastCandle) {
          throw new Error(\`No market data received from \${usedBroker} API.\`);
      }

      // Staleness Detection (Max 1 hour for indices, 15m for others)
      const nowSeconds = Math.floor(Date.now() / 1000);
      const candleAge = nowSeconds - lastCandle.epoch;
      const isMajorAsset = ['OTC_DJI', 'OTC_NDX', 'OTC_SPC', 'OTC_FTSE', 'frxXAUUSD', 'frxEURUSD', 'frxGBPUSD', 'cryBTCUSD', 'cryETHUSD'].includes(asset) || asset.includes('US30') || asset.includes('NAS100');
      const maxAge = isMajorAsset ? 3600 : 900; 

      if (candleAge > maxAge) {
          const ageMinutes = Math.floor(candleAge / 60);
          console.warn(\`[SniperLiveTrade] STALE DATA DETECTED: Price is \${ageMinutes}m old.\`);
          entryData.isMarketClosed = true;
      }

      if (lastCandle) {
          entryData.price = lastCandle.close;
          entryData.bid = lastCandle.close;
          entryData.ask = lastCandle.close;
      }
      
      const combinedData = {
          ...entryData,
          ctraderTicks,
          usedBroker,
          multiTimeframe: {
              entry: {
                  granularity: timeframes.entry,
                  candles: entryData.candles || []
              },
              confirm: {
                  granularity: timeframes.confirm,
                  candles: confirmData.candles || []
              },
              htf: {
                  granularity: timeframes.htf,
                  candles: htfData.candles || []
              }
          }
      };

      setLivePrice(combinedData);
      return combinedData;
    } catch (err: any) {
      console.error('Price Fetch Error:', err);
      throw err;
    } finally {
      setIsFetchingPrice(false);
    }
  };`;
        
        const newContent = content.substring(0, startIdx) + replacement + content.substring(fullEndIdx);
        fs.writeFileSync('components/SniperLiveTrade.tsx', newContent);
        console.log("Replaced successfully!");
    } else {
        console.log("End not found");
    }
} else {
    console.log("Start not found");
}

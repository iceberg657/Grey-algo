
import { fetchDerivQuote } from './derivData.js';

let twelveDataKeyCache = null;
const CACHE_DURATION = 15 * 60 * 1000;

/**
 * Handles health/status checks for the market data API
 */
export async function statusHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    
    const apiKey = process.env.TWELVE_DATA_API_KEY || 
                   process.env.VITE_TWELVE_DATA_API_KEY || 
                   process.env.TWELVEDATA_API_KEY || 
                   process.env.VITE_TWELVEDATA_API_KEY;

    const derivToken = process.env.DERIV_API_TOKEN || 
                       process.env.VITE_DERIV_API_TOKEN || 
                       process.env.DERIV_TOKEN || 
                       process.env.VITE_DERIV_TOKEN;
                   
    if (apiKey && twelveDataKeyCache && twelveDataKeyCache.key === apiKey && (Date.now() - twelveDataKeyCache.timestamp < CACHE_DURATION)) {
        return res.json({ 
            configured: true,
            valid: twelveDataKeyCache.valid,
            usage: twelveDataKeyCache.usage,
            derivConfigured: !!derivToken
        });
    }

    let isValid = false;
    let usageInfo = null;
    if (apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const testRes = await fetch(`https://api.twelvedata.com/api_usage?apikey=${apiKey}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (testRes.ok) {
                const testData = await testRes.json();
                isValid = testData.status !== 'error';
                usageInfo = testData;
                
                twelveDataKeyCache = {
                    key: apiKey,
                    valid: isValid,
                    usage: usageInfo,
                    timestamp: Date.now()
                };
            }
        } catch (e) {
            console.error('[MarketDataProxy] Error validating Twelve Data API key:', e.message);
        }
    }
    
    res.json({ 
        configured: !!apiKey,
        valid: isValid,
        usage: usageInfo,
        derivConfigured: !!derivToken
    });
}

/**
 * Handles individual or batch quote requests
 */
export async function quoteHandler(req, res) {
    const { symbol, interval = '15min', apikey, token } = req.query;
    if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol' });
    }

    const apiKey = apikey || process.env.TWELVE_DATA_API_KEY || 
                   process.env.VITE_TWELVE_DATA_API_KEY || 
                   process.env.TWELVEDATA_API_KEY || 
                   process.env.VITE_TWELVEDATA_API_KEY;

    const derivToken = token || process.env.DERIV_API_TOKEN || 
                       process.env.VITE_DERIV_API_TOKEN || 
                       process.env.DERIV_TOKEN || 
                       process.env.VITE_DERIV_TOKEN;

    // Mapping for symbols
    const mapping = (s) => {
        let m = s.toUpperCase().trim();
        if (m.includes(':')) m = m.split(':')[1];
        if (m === 'GOLD' || m === 'XAUUSD') return 'XAU/USD';
        if (m.length === 6 && !m.includes('/')) return `${m.slice(0, 3)}/${m.slice(3)}`;
        return m;
    };

    const symbols = symbol.split(',').map(mapping).join(',');

    // PRE-FLIGHT: If we have multiple symbols, we must use Twelve Data batch API if available, else fallback to Deriv individual fetches
    if (symbol.includes(',')) {
        const symbolList = symbol.split(',');
        const mappedList = symbolList.map(mapping).join(',');
        
        if (apiKey) {
            try {
                console.log(`[MarketDataProxy] Batch fetching Twelve Data for: ${mappedList}`);
                const batchRes = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(mappedList)}&apikey=${apiKey}`);
                const batchData = await batchRes.json();
                if (batchData && batchData.status !== 'error') return res.json(batchData);
            } catch (e) {
                console.warn(`[MarketDataProxy] Batch Twelve Data failed:`, e.message);
            }
        }

        // BATCH FALLBACK TO DERIV
        if (derivToken) {
            try {
                console.log(`[MarketDataProxy] Batch fetching from Deriv for: ${symbolList.length} assets`);
                const results = {};
                await Promise.all(symbolList.map(async (s) => {
                    try {
                        const d = await fetchDerivQuote(s, derivToken);
                        if (d) {
                            results[s.toUpperCase().trim()] = {
                                symbol: s,
                                price: d.price.toString(),
                                close: d.price.toString(),
                                percent_change: '0.00',
                                dataSource: 'Deriv'
                            };
                        }
                    } catch (err) {}
                }));
                if (Object.keys(results).length > 0) return res.json(results);
            } catch (e) {
                console.error(`[MarketDataProxy] Batch Deriv failed:`, e.message);
            }
        }
        
        return res.status(503).json({ error: 'Market data source synchronization failed for batch request' });
    }

    // SINGLE SYMBOL LOGIC - Prioritize Deriv if Twelve Data keeps failing or if we want faster rates
    let derivResult = null;
    if (derivToken) {
        try {
            console.log(`[MarketDataProxy] Attempting Deriv sync for ${symbol}`);
            derivResult = await fetchDerivQuote(symbol, derivToken);
        } catch (e) {
            console.warn(`[MarketDataProxy] Deriv sync failed for ${symbol}:`, e.message);
        }
    }

    if (apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const encodedSymbol = encodeURIComponent(mapping(symbol));
            console.log(`[MarketDataProxy] Fetching Twelve Data Metrics for ${encodedSymbol}`);
            
            const endpoints = [
                `https://api.twelvedata.com/quote?symbol=${encodedSymbol}&apikey=${apiKey}`,
                `https://api.twelvedata.com/rsi?symbol=${encodedSymbol}&interval=${interval}&time_period=14&apikey=${apiKey}`,
                `https://api.twelvedata.com/sma?symbol=${encodedSymbol}&interval=${interval}&time_period=20&apikey=${apiKey}`,
                `https://api.twelvedata.com/stddev?symbol=${encodedSymbol}&interval=${interval}&time_period=20&apikey=${apiKey}`,
                `https://api.twelvedata.com/atr?symbol=${encodedSymbol}&interval=${interval}&time_period=14&apikey=${apiKey}`
            ];

            const responses = await Promise.all(endpoints.map(url => fetch(url, { signal: controller.signal }).catch(() => null)));
            clearTimeout(timeoutId);

            const [quoteRes, rsiRes, smaRes, stddevRes, atrRes] = responses;
            
            const safeJson = async (r) => {
                if (!r || !r.ok) return null;
                try { return await r.json(); } catch (e) { return null; }
            };

            const quoteData = await safeJson(quoteRes);
            
            if (quoteData && quoteData.status !== 'error') {
                const rsiData = await safeJson(rsiRes);
                const smaData = await safeJson(smaRes);
                const stddevData = await safeJson(stddevRes);
                const atrData = await safeJson(atrRes);

                // Merge Deriv's live price into Twelve Data's complex metrics if Deriv is faster
                const currentPrice = derivResult ? derivResult.price.toString() : quoteData.close;

                return res.json({
                    ...quoteData,
                    close: currentPrice, // Prioritize Deriv price for accuracy
                    price: currentPrice,
                    rsi: rsiData?.values?.[0]?.rsi || 'N/A',
                    sma: smaData?.values?.[0]?.sma || 'N/A',
                    stddev: stddevData?.values?.[0]?.stddev || 'N/A',
                    atr: atrData?.values?.[0]?.atr || 'N/A',
                    interval,
                    dataSource: derivResult ? 'Hybrid (Deriv + Twelve)' : 'Twelve Data'
                });
            }
        } catch (error) {
            console.warn('[MarketDataProxy] Twelve Data detailed fetch failed:', error.message);
        }
    }

    // FINAL FALLBACK: If Twelve Data failed but we have Deriv
    if (derivResult) {
        return res.json({
            symbol: symbol,
            name: symbol,
            close: derivResult.price.toString(),
            percent_change: '0.00',
            rsi: 'N/A',
            sma: 'N/A',
            dataSource: 'Deriv (Neural)',
            is_market_open: true
        });
    }

    res.status(503).json({ error: 'Market data source synchronization failed' });
}

export default async function handler(req, res) {
    const { action } = req.query;
    if (action === 'status') {
        return statusHandler(req, res);
    } else {
        return quoteHandler(req, res);
    }
}

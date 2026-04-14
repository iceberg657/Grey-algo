
let twelveDataKeyCache = null;
const CACHE_DURATION = 15 * 60 * 1000;

export async function statusHandler(req, res) {
    console.log('[TwelveData] Status check requested');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    
    const apiKey = process.env.TWELVE_DATA_API_KEY || 
                   process.env.VITE_TWELVE_DATA_API_KEY || 
                   process.env.TWELVEDATA_API_KEY || 
                   process.env.VITE_TWELVEDATA_API_KEY;
                   
    if (apiKey && twelveDataKeyCache && twelveDataKeyCache.key === apiKey && (Date.now() - twelveDataKeyCache.timestamp < CACHE_DURATION)) {
        return res.json({ 
            configured: true,
            valid: twelveDataKeyCache.valid,
            keyName: 'Cached',
            maskedKey: `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
            usage: twelveDataKeyCache.usage
        });
    }

    const relatedKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('twelve'));
    
    let isValid = false;
    let usageInfo = null;
    if (apiKey) {
        try {
            const testRes = await fetch(`https://api.twelvedata.com/api_usage?apikey=${apiKey}`);
            const testData = await testRes.json();
            isValid = testData.status !== 'error';
            usageInfo = testData;
            
            twelveDataKeyCache = {
                key: apiKey,
                valid: isValid,
                usage: usageInfo,
                timestamp: Date.now()
            };
        } catch (e) {
            console.error('[TwelveData] Error validating API key:', e);
        }
    }
    
    res.json({ 
        configured: !!apiKey,
        valid: isValid,
        keyName: relatedKeys[0] || 'None',
        maskedKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
        usage: usageInfo
    });
}

export async function quoteHandler(req, res) {
    const { symbol, interval = '15min', apikey } = req.query;
    if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: 'Missing symbol' });
    }

    const apiKey = apikey || process.env.TWELVE_DATA_API_KEY || 
                   process.env.VITE_TWELVE_DATA_API_KEY || 
                   process.env.TWELVEDATA_API_KEY || 
                   process.env.VITE_TWELVEDATA_API_KEY;
                   
    if (!apiKey) {
        return res.status(500).json({ error: 'Twelve Data API key not configured' });
    }

    let mappedSymbol = symbol.toUpperCase();
    if (mappedSymbol === 'GOLD' || mappedSymbol === 'XAUUSD') mappedSymbol = 'XAU/USD';
    else if (mappedSymbol === 'US30' || mappedSymbol === 'DJI') mappedSymbol = 'DJI';
    else if (mappedSymbol === 'NAS100' || mappedSymbol === 'NDX') mappedSymbol = 'NDX';
    else if (mappedSymbol === 'SPX500' || mappedSymbol === 'SPX') mappedSymbol = 'SPX';
    else if (mappedSymbol === 'UK100' || mappedSymbol === 'FTSE') mappedSymbol = 'FTSE';
    else if (mappedSymbol === 'GER40' || mappedSymbol === 'DAX') mappedSymbol = 'DAX';
    else if (mappedSymbol === 'USOIL' || mappedSymbol === 'WTI') mappedSymbol = 'WTI';
    else if (mappedSymbol === 'UKOIL' || mappedSymbol === 'BRENT') mappedSymbol = 'BRENT';
    else if (mappedSymbol.length === 6 && !mappedSymbol.includes('/')) {
        mappedSymbol = `${mappedSymbol.slice(0, 3)}/${mappedSymbol.slice(3)}`;
    }

    try {
        const encodedSymbol = encodeURIComponent(mappedSymbol);
        const [quoteRes, rsiRes, smaRes, stddevRes, atrRes, adxRes] = await Promise.all([
            fetch(`https://api.twelvedata.com/quote?symbol=${encodedSymbol}&apikey=${apiKey}`),
            fetch(`https://api.twelvedata.com/rsi?symbol=${encodedSymbol}&interval=${interval}&time_period=14&apikey=${apiKey}`),
            fetch(`https://api.twelvedata.com/sma?symbol=${encodedSymbol}&interval=${interval}&time_period=20&apikey=${apiKey}`),
            fetch(`https://api.twelvedata.com/stddev?symbol=${encodedSymbol}&interval=${interval}&time_period=20&apikey=${apiKey}`),
            fetch(`https://api.twelvedata.com/atr?symbol=${encodedSymbol}&interval=${interval}&time_period=14&apikey=${apiKey}`),
            fetch(`https://api.twelvedata.com/adx?symbol=${encodedSymbol}&interval=${interval}&time_period=14&apikey=${apiKey}`)
        ]);

        const quoteData = await quoteRes.json();
        const rsiData = await rsiRes.json();
        const smaData = await smaRes.json();
        const stddevData = await stddevRes.json();
        const atrData = await atrRes.json();
        const adxData = await adxRes.json();

        if (quoteData.status === 'error') {
            return res.status(400).json(quoteData);
        }

        res.json({
            ...quoteData,
            rsi: rsiData?.values?.[0]?.rsi || 'N/A',
            sma: smaData?.values?.[0]?.sma || 'N/A',
            stddev: stddevData?.values?.[0]?.stddev || 'N/A',
            atr: atrData?.values?.[0]?.atr || 'N/A',
            adx: adxData?.values?.[0]?.adx || 'N/A',
            interval
        });
    } catch (error) {
        console.error('Twelve Data Proxy Error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Twelve Data' });
    }
}

export default async function handler(req, res) {
    const { action } = req.query;
    if (action === 'status') {
        return statusHandler(req, res);
    } else {
        return quoteHandler(req, res);
    }
}

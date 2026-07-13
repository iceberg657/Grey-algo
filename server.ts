import 'dotenv/config';
import express from 'express';

// Bypass self-signed certificate errors for MetaAPI
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from "@google/genai";
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { encrypt } from './src/services/encryptionService';
import marketDataHandler from './src/api-handlers/marketData';
import configHandler from './src/api-handlers/config';
import analyzeHandler from './src/api-handlers/gemini/analyze';
import antigravityHandler from './src/api-handlers/gemini/antigravity';
import derivHandler from './src/api-handlers/derivData';
import derivTradeNotificationHandler from './src/api-handlers/derivTradeNotification';
import twelveDataHandler from './src/api-handlers/twelveData';
import ctraderAccountsHandler from './src/api-handlers/ctrader/accounts';
import { ctraderTickHistoryHandler, ctraderStreamHandler, ctraderTrendbarsHandler } from './src/api-handlers/ctrader/marketData';
import { fetchAssetSuggestions } from './services/suggestionService';
// import { MetaApiService } from './src/services/metaApiService.js';

export const app = express();
export const PORT = 3000;
export const server = !process.env.VERCEL ? createServer(app) : null;
export const wss = (!process.env.VERCEL && server) ? new WebSocketServer({ server }) : null;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log('[Server] Initializing API routes...');

  // Twelve Data Routes
  app.get('/api/twelveData', twelveDataHandler);

  // cTrader API Routes
  app.get('/api/ctrader/auth-url', (req, res) => {
    const clientId = process.env.CTRADER_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'CTRADER_CLIENT_ID not configured in server' });
    }
    // Hardcoded REDIRECT_URI to spotware's default, so users can just paste the resulting URL
    const REDIRECT_URI = "https://openapi.ctrader.com";
    const url = new URL("https://id.ctrader.com/my/settings/openapi/grantingaccess/");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", "trading");
    url.searchParams.set("product", "web");
    res.json({ authUrl: url.toString() });
  });

  app.post('/api/ctrader/exchange', async (req, res) => {
    const clientId = process.env.CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'cTrader credentials not configured in server' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    try {
      const OAUTH_TOKEN_URL = "https://openapi.ctrader.com/apps/token";
      const REDIRECT_URI = "https://openapi.ctrader.com";

      const url = new URL(OAUTH_TOKEN_URL);
      url.searchParams.set("grant_type", "authorization_code");
      url.searchParams.set("code", code);
      url.searchParams.set("redirect_uri", REDIRECT_URI);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("client_secret", clientSecret);

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from token endpoint`);
      }

      const body = await response.json();
      if (body.errorCode) {
        throw new Error(`${body.errorCode}: ${body.description}`);
      }

      if (!body.accessToken) {
        throw new Error(`Invalid response: ${JSON.stringify(body)}`);
      }

      res.json({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        tokenType: body.tokenType,
        expiresIn: body.expiresIn
      });
    } catch (e: any) {
      console.error('Error exchanging cTrader token:', e);
      res.status(500).json({ error: e.message || 'Failed to exchange token' });
    }
  });

  app.get('/api/ctrader/accounts', ctraderAccountsHandler);
  app.get('/api/ctrader/ticks', ctraderTickHistoryHandler);
  app.get('/api/ctrader/stream', ctraderStreamHandler);
  app.get('/api/ctrader/trendbars', ctraderTrendbarsHandler);

  // MetaApiService initialization removed for testing
  // function getMetaApiService(): MetaApiService {
  //   if (!metaApiService) {
  //     if (process.env.METAAPI_TOKEN) {
  //       metaApiService = new MetaApiService(process.env.METAAPI_TOKEN);
  //     } else {
  //       throw new Error('METAAPI_TOKEN not set');
  //     }
  //   }
  //   return metaApiService;
  // }

  // Initialize Firebase Admin
  let firestoreDatabaseId = '(default)';
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const configData = readFileSync(configPath, 'utf-8');
    const firebaseConfig = JSON.parse(configData);
    firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  } catch (error) {
    console.warn('Could not read firebase-applet-config.json, using default database ID');
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with custom service account');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
    }
  } else {
    try {
      admin.initializeApp();
      console.log('Firebase Admin initialized with default credentials');
    } catch (error) {
      console.error('Error initializing Firebase Admin with default credentials:', error);
    }
  }

  function getDb() {
    return firestoreDatabaseId && firestoreDatabaseId !== '(default)' 
      ? getFirestore(firestoreDatabaseId) 
      : getFirestore();
  }

  async function runAutoML() {
    console.log('Running Auto ML Strategy Learning...');
    try {
      const db = getDb();
      const marketData = await fetchAssetSuggestions();
      
      // Use API_KEY_5 (Chat Key) as requested for the main time, with AUTOML_API_KEY as override
      const automlKey = process.env.AUTOML_API_KEY || process.env.API_KEY_5 || process.env.GEMINI_API_KEY || '';
      const automlAi = new GoogleGenAI({ apiKey: automlKey });

      const prompt = `As an elite Quantitative and Institutional Trading AI, analyze current market trends and generate a new, high-probability trading strategy.
      Your goal is to discover "Alpha" by identifying institutional footprints and statistical anomalies.
      
      Market Data Context: ${JSON.stringify(marketData.slice(0, 10))}
      
      Focus on:
      1. **Institutional Liquidity:** POI mitigation, Liquidity Sweeps, and Order Flow.
      2. **Statistical Arbitrage:** Mean reversion from standard deviation extremes.
      3. **Confluence:** Merging SMC/ICT logic with mathematical indicators (RSI, SMA, ADX).
      
      Return the strategy in JSON format:
      {
        "name": "Strategy Name",
        "description": "Brief explanation of the institutional/quantitative logic",
        "rules": "Specific entry/exit rules, POI identification, and statistical filters",
        "performance": 0.85
      }`;

      const response = await automlAi.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const strategy = JSON.parse(response.text);
      const strategyId = `automl_${Date.now()}`;
      
      await db.collection('auto_ml_strategies').doc(strategyId).set({
        ...strategy,
        id: strategyId,
        timestamp: Date.now(),
        isActive: false
      });

      console.log(`Auto ML Strategy learned and logged: ${strategy.name}`);
      
      // Broadcast to admins via WS
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'AUTO_ML_UPDATE', strategy }));
          }
        });
      }
    } catch (error) {
      console.error('Error in Auto ML process:', error);
    }
  }

  // Random Scheduler: 5 times a day
  function scheduleAutoML() {
    const timesPerDay = 5;
    const msInDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < timesPerDay; i++) {
      const randomDelay = Math.random() * msInDay;
      setTimeout(() => {
        runAutoML();
        // Reschedule for the next day
        setInterval(runAutoML, msInDay);
      }, randomDelay);
    }
  }

  if (!process.env.VERCEL) {
    scheduleAutoML();
  }

  // Helper to call MetaAPI REST API
  async function metaApiFetch(endpoint: string, method: string = 'GET', body: any = null) {
    const token = process.env.METAAPI_TOKEN;
    if (!token) throw new Error('METAAPI_TOKEN not set');

    const response = await fetch(`https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai${endpoint}`, {
      method,
      headers: {
        'auth-token': token,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `MetaAPI request failed (${response.status})`;
      try {
        const error = JSON.parse(text);
        errorMsg = error.message || errorMsg;
      } catch (e) {
        errorMsg = `${errorMsg}: ${text}`;
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // Helper to call MetaAPI Provisioning API
  async function metaApiProvisionFetch(endpoint: string, method: string = 'GET', body: any = null) {
    const token = process.env.METAAPI_TOKEN;
    if (!token) throw new Error('METAAPI_TOKEN not set');

    const response = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai${endpoint}`, {
      method,
      headers: {
        'auth-token': token,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `MetaAPI Provisioning request failed (${response.status})`;
      try {
        const error = JSON.parse(text);
        errorMsg = error.message || errorMsg;
      } catch (e) {
        errorMsg = `${errorMsg}: ${text}`;
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // API routes
  app.all('/api/config', configHandler);

  app.all('/api/marketData', marketDataHandler);

  app.post('/api/admin/activate-strategy', async (req, res) => {
    const { strategyId } = req.body;
    if (!strategyId) return res.status(400).json({ error: 'Missing strategyId' });

    try {
      const db = getDb();
      const batch = db.batch();
      
      // Deactivate all
      const strategies = await db.collection('auto_ml_strategies').get();
      strategies.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
      });
      
      // Activate selected
      batch.update(db.collection('auto_ml_strategies').doc(strategyId), { isActive: true });
      
      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error('Error activating strategy:', error);
      res.status(500).json({ error: 'Failed to activate strategy' });
    }
  });

  app.post('/api/account-sync', async (req, res) => {
    const { uid, balance, equity, profit, drawdown } = req.body;
    if (!uid || balance === undefined || equity === undefined) {
      return res.status(400).json({ error: 'Missing sync data' });
    }

    try {
      const db = getDb();
      const syncData = {
        balance,
        equity,
        profit: profit || 0,
        drawdown: drawdown || 0,
        timestamp: Date.now()
      };

      await db.collection('users').doc(uid).collection('sync').doc('account').set(syncData);
      
      // Broadcast to connected clients via WebSocket
      const message = JSON.stringify({ type: 'ACCOUNT_SYNC', uid, data: syncData });
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(message);
          }
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing account data:', error);
      res.status(500).json({ error: 'Failed to sync account data' });
    }
  });

  app.post('/api/metaapi/connect', async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ error: 'Missing accountId' });
      }
      // Using Provisioning API to deploy/connect the account
      await metaApiProvisionFetch(`/users/current/accounts/${accountId}/deploy`, 'POST');
      res.json({ success: true });
    } catch (error) {
      console.error('Error connecting to MetaAPI:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to connect to MetaAPI' });
    }
  });

  app.get('/api/metaapi/positions', async (req, res) => {
    try {
      const { accountId } = req.query;
      if (!accountId) {
        return res.status(400).json({ error: 'Missing accountId' });
      }
      const positions = await metaApiFetch(`/users/current/accounts/${accountId}/positions`);
      res.json(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch positions' });
    }
  });

  app.post('/api/metaapi/trade', async (req, res) => {
    try {
      const { accountId, tradeData } = req.body;
      if (!accountId || !tradeData) {
        return res.status(400).json({ error: 'Missing accountId or tradeData' });
      }
      const result = await metaApiFetch(`/users/current/accounts/${accountId}/trade`, 'POST', tradeData);
      res.json(result);
    } catch (error) {
      console.error('Error executing trade:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to execute trade' });
    }
  });

  app.post('/api/connect-mt5', async (req, res) => {
    const { server, login, password, uid } = req.body;
    if (!server || !login || !password || !uid) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const encryptedPassword = encrypt(password);
    
    try {
      let accountId = null;
      
      // Try to provision account if token exists
      if (process.env.METAAPI_TOKEN) {
        try {
          const accounts = await metaApiProvisionFetch('/users/current/accounts');
          let account = accounts.find((a: any) => a.login === login && a.server === server);
          
          if (!account) {
            account = await metaApiProvisionFetch('/users/current/accounts', 'POST', {
              name: `AI Studio - ${login}`,
              login: login,
              password: password,
              server: server,
              platform: server.toLowerCase().includes('mt4') ? 'mt4' : 'mt5',
              magic: 1000,
              type: 'cloud-g1',
              reliability: 'regular'
            });
          }
          
          accountId = account._id;
          
          if (account.state !== 'DEPLOYED') {
            await metaApiProvisionFetch(`/users/current/accounts/${accountId}/deploy`, 'POST');
          }
        } catch (metaApiError: any) {
          console.error('MetaAPI Provisioning Error:', metaApiError);
          let errorMessage = metaApiError.message || 'Failed to provision account';
          if (errorMessage.toLowerCase().includes('top up your account')) {
            errorMessage = 'MetaAPI Billing Required: Your MetaAPI account has insufficient balance. Please top up your account at https://app.metaapi.cloud to enable cloud trading.';
          }
          return res.status(400).json({ error: errorMessage });
        }
      } else {
        return res.status(400).json({ error: 'METAAPI_TOKEN environment variable is missing on the server.' });
      }

      const db = getDb();
      await db.collection('users').doc(uid).set({
        mt5Credentials: {
          server,
          login,
          password: encryptedPassword,
          ...(accountId ? { accountId } : {})
        }
      }, { merge: true });
      res.json({ success: true, accountId });
    } catch (error) {
      console.error('Error saving MT5 credentials:', error);
      res.status(500).json({ error: 'Failed to save credentials' });
    }
  });

  app.get('/api/mt5/data', async (req, res) => {
    const { accountId } = req.query;
    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Missing accountId' });
    }

    try {
      // Fetch account info
      const info = await metaApiFetch(`/users/current/accounts/${accountId}/account-information`).catch(() => null);
      
      // Fetch positions
      const positions = await metaApiFetch(`/users/current/accounts/${accountId}/positions`).catch(() => []);
      
      // Fetch history (last 30 days)
      const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      const history = await metaApiFetch(`/users/current/accounts/${accountId}/history-deals/time/${startTime}/${endTime}`).catch(() => []);

      res.json({ info, positions, history });
    } catch (error) {
      console.error('Error fetching MT5 data:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch MT5 data' });
    }
  });

  // Gemini Proxy Route to bypass regional blocks (VPN-free execution)
  app.post('/api/gemini/analyze', analyzeHandler);
  app.post('/api/gemini/antigravity', antigravityHandler);

  // Deriv API Route
  app.get('/api/derivData', derivHandler);
  app.get('/api/derivTradeNotification', derivTradeNotificationHandler);

  // Push Notification Route
  app.post('/api/notifications/broadcast', async (req, res) => {
    const { title, body, targetUserId } = req.body;
    
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    try {
      const db = getDb();
      let tokens: string[] = [];

      try {
        if (targetUserId) {
          const userDoc = await db.collection('users').doc(targetUserId).get();
          if (userDoc.exists && userDoc.data()?.fcmToken) {
            tokens = [userDoc.data()?.fcmToken];
          }
        } else {
          const usersSnapshot = await db.collection('users').get();
          tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);
        }
      } catch (dbError) {
        console.error('Firestore query error:', dbError);
        return res.status(500).json({ 
          error: 'Failed to fetch tokens from database', 
          details: dbError instanceof Error ? dbError.message : String(dbError),
          databaseId 
        });
      }

      if (tokens.length === 0) {
        return res.json({ success: true, message: 'No tokens found' });
      }

      const message = {
        notification: { title, body },
        tokens: tokens
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('FCM Broadcast response:', JSON.stringify(response));
        res.json({ success: true, response });
      } catch (fcmError) {
        console.error('FCM send error:', fcmError);
        res.status(500).json({ 
          error: 'FCM delivery failed', 
          details: fcmError instanceof Error ? fcmError.message : String(fcmError) 
        });
      }
    } catch (error) {
      console.error('General notification route error:', error);
      res.status(500).json({ 
        error: 'Internal server error in notification route', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Trading Engine State
  const engineState = {
    isRunning: false,
    accountId: null,
    lastRun: null,
    mode: 'manual',
    accountInfo: {
      balance: 0,
      equity: 0
    }
  };

  // WebSocket handling
  if (wss) {
    wss.on('connection', (ws) => {
      console.log('Client connected');
      
      // Send initial state
      ws.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState }));

      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'TOGGLE_ENGINE') {
          engineState.isRunning = data.isRunning;
          engineState.accountId = data.accountId;
          if (wss) {
            wss.clients.forEach(client => client.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState })));
          }
        }
        
        if (data.type === 'SET_MODE') {
          engineState.mode = data.mode;
          if (wss) {
            wss.clients.forEach(client => client.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState })));
          }
        }
      });

      ws.on('close', () => console.log('Client disconnected'));
    });
  }

  // Trading Engine Monitor
  const monitorAccount = async () => {
    if (!engineState.isRunning || !engineState.accountId) return;
    try {
      const accountInfo = await metaApiFetch(`/users/current/accounts/${engineState.accountId}/account-information`);
      const { balance, equity } = accountInfo;
      
      // Calculate drawdown percentage
      const drawdown = ((balance - equity) / balance) * 100;
      
      if (drawdown > 3.5) {
        console.log(`Drawdown threshold exceeded (${drawdown.toFixed(2)}%), closing trades...`);
        // Close all positions
        await metaApiFetch(`/users/current/accounts/${engineState.accountId}/trade`, 'POST', { action: 'closeAll' });
        
        // Stop engine for safety
        engineState.isRunning = false;
        if (wss) {
          wss.clients.forEach(client => client.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState })));
        }
      }
    } catch (error) {
      console.error('Error monitoring account:', error);
    }
  };

  // Hourly market data update
  const broadcastMarketData = async () => {
    try {
      const data = await fetchAssetSuggestions();
      const message = JSON.stringify({ type: 'MARKET_DATA_UPDATE', data });
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // OPEN
            client.send(message);
          }
        });
      }
    } catch (error) {
      console.error('Error broadcasting market data:', error);
    }
  };

  if (!process.env.VERCEL) {
    // Check every 5 seconds
    setInterval(monitorAccount, 5000);

    // Hourly market data update
    setInterval(broadcastMarketData, 60 * 60 * 1000); // 1 hour
  }

  // MarketAux News Proxy Route
  app.get('/api/news', async (req, res) => {
    const apiKey = process.env.MARKETAUX_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        isConfigured: false,
        message: 'MARKETAUX_API_KEY is not configured on the server. Please add it to your environment variables to enable live news streaming.',
        data: []
      });
    }

    try {
      const { search, symbols, countries } = req.query;
      let url = `https://api.marketaux.com/v1/news/all?api_token=${apiKey}&language=en`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search as string)}`;
      }
      if (symbols) {
        url += `&symbols=${encodeURIComponent(symbols as string)}`;
      }
      if (countries) {
        url += `&countries=${encodeURIComponent(countries as string)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MarketAux responded with status ${response.status}`);
      }
      const data = await response.json();
      res.json({
        isConfigured: true,
        data: data.data || []
      });
    } catch (error) {
      console.error('Error fetching MarketAux news:', error);
      res.status(500).json({
        isConfigured: true,
        error: error instanceof Error ? error.message : 'Failed to fetch news from MarketAux'
      });
    }
  });

  // Live Economic Calendar endpoint using Gemini Google Search Grounding
  app.get('/api/economic-calendar', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        isLive: false,
        message: 'GEMINI_API_KEY is not configured on the server. Displaying offline calendar.',
        data: []
      });
    }

    try {
      const { clientDate } = req.query;
      const baseDate = clientDate ? new Date(clientDate as string) : new Date();
      
      const dates = [];
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      for (let i = 0; i < 4; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        dates.push({
          offset: i,
          formatted: `${daysOfWeek[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
        });
      }

      const datePrompts = dates.map(d => `Day ${d.offset}: ${d.formatted}`).join('\n');

      const prompt = `You are a professional financial data parser. Your task is to fetch the ACTUAL, real-time live economic calendar releases (such as CPI, Unemployment, Interest Rate Decisions, NFP, GDP, etc.) for major currencies (USD, EUR, GBP, JPY, CAD, AUD) for the following exact dates:
${datePrompts}

Use Google Search grounding to find the actual figures, times, and consensus forecasts from trusted economic calendars (like Investing.com, Myfxbook, or ForexFactory).

You MUST respond strictly with a JSON array matching the following TypeScript schema:
interface EconomicEvent {
    id: string; // Unique string starting with "evt-"
    dayOffset: number; // 0 for Today, 1 for Tomorrow, 2 for Day 2, 3 for Day 3
    time: string; // Event release time in 24-hour UTC format (e.g. "13:30" or "08:00")
    currency: string; // e.g. "USD", "EUR", "GBP", "JPY", "CAD", "AUD"
    event: string; // Name of the release (e.g. "Core CPI (MoM)")
    importance: 'HIGH' | 'MEDIUM' | 'LOW'; // The actual importance / volatility classification
    previous: string; // The previous release value (e.g. "0.3%", "228K", or "-")
    forecast: string; // The forecasted/consensus value (e.g. "0.2%", "225K", or "-")
    actual: string; // The actual released value if available (e.g. "0.1%"), or "Pending" if the event has not occurred yet
    notes: string; // A high-quality explanation of what the event measures and how it dynamically affects the currency's trend.
}

Return ONLY the raw JSON array. Do not include any markdown backticks, explanations, or text outside of the JSON. If a date has no major events, omit events for that date, but try to find at least 4-8 significant events across these dates. Do not invent mock data; use the actual real calendar events retrieved from your search.`;

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        },
      });

      const responseText = response.text || "[]";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim());
      } catch (parseErr) {
        console.error("Failed to parse Gemini response as JSON. Response was:", responseText);
        // Stripping markdown wrapper if any
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      res.json({
        isLive: true,
        data: parsedData
      });
    } catch (error) {
      console.error('Error fetching live economic calendar via Gemini search grounding:', error);
      res.status(500).json({
        isLive: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve live calendar data'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    (async () => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    })();
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (server && !process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

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
import { encrypt } from './src/services/encryptionService';
import marketDataHandler from './api/marketData.js';
import fetchDataHandler from './api/fetchData.js';
import { fetchAssetSuggestions } from './services/suggestionService.js';
// import { MetaApiService } from './src/services/metaApiService.js';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

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
    const configData = await fs.readFile(configPath, 'utf-8');
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

      const prompt = `As an expert quantitative trader, analyze current market trends and generate a new, high-probability trading strategy.
      Market Data Context: ${JSON.stringify(marketData.slice(0, 10))}
      
      Return the strategy in JSON format:
      {
        "name": "Strategy Name",
        "description": "Brief explanation of the logic",
        "rules": "Specific entry/exit rules and indicators used",
        "performance": 0.85
      }`;

      const response = await automlAi.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
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
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'AUTO_ML_UPDATE', strategy }));
        }
      });
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

  scheduleAutoML();

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
  app.get('/api/config', (req, res) => {
    res.json({ 
      apiKey: process.env.API_KEY || process.env.API_KEY_1,
      keys: {
        k1: process.env.API_KEY_1,
        k2: process.env.API_KEY_2,
        k3: process.env.API_KEY_3,
        k4: process.env.API_KEY_4,
        k5: process.env.API_KEY_5,
        k6: process.env.API_KEY_6,
        k7: process.env.API_KEY_7,
      }
    });
  });

  app.all('/api/marketData', marketDataHandler);
  app.all('/api/fetchData', fetchDataHandler);

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
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(message);
        }
      });

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
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Send initial state
    ws.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState }));

    ws.on('message', (message) => {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'TOGGLE_ENGINE') {
        engineState.isRunning = data.isRunning;
        engineState.accountId = data.accountId;
        wss.clients.forEach(client => client.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState })));
      }
      
      if (data.type === 'SET_MODE') {
        engineState.mode = data.mode;
        wss.clients.forEach(client => client.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState })));
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });

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
        wss.clients.forEach(client => client.send(JSON.stringify({ type: 'ENGINE_STATE', state: engineState })));
      }
    } catch (error) {
      console.error('Error monitoring account:', error);
    }
  };

  // Check every 5 seconds
  setInterval(monitorAccount, 5000);

  // Hourly market data update
  const broadcastMarketData = async () => {
    try {
      const data = await fetchAssetSuggestions();
      const message = JSON.stringify({ type: 'MARKET_DATA_UPDATE', data });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send(message);
        }
      });
    } catch (error) {
      console.error('Error broadcasting market data:', error);
    }
  };

  setInterval(broadcastMarketData, 60 * 60 * 1000); // 1 hour

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

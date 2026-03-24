import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs/promises';
import marketDataHandler from './api/marketData.js';
import fetchDataHandler from './api/fetchData.js';
import { fetchAssetSuggestions } from './services/suggestionService.js';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // Initialize Firebase Admin
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
    }
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

  // Push Notification Route
  app.post('/api/notifications/broadcast', async (req, res) => {
    const { title, body, targetUserId } = req.body;
    
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    try {
      // Try to get database ID from config
      let databaseId = '(default)';
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const firebaseConfig = JSON.parse(configData);
        databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      } catch (configError) {
        console.warn('Could not read firebase-applet-config.json, falling back to default database:', configError);
      }

      const db = getFirestore(databaseId);
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

  // WebSocket handling
  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

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

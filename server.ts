import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import admin from 'firebase-admin';
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
      const db = admin.firestore();
      let tokens: string[] = [];

      if (targetUserId) {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (userDoc.exists && userDoc.data()?.fcmToken) {
          tokens = [userDoc.data()?.fcmToken];
        }
        console.log(`Found ${tokens.length} tokens for target user ${targetUserId}`);
      } else {
        const usersSnapshot = await db.collection('users').get();
        tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);
        console.log(`Found ${tokens.length} tokens for broadcast`);
      }

      if (tokens.length === 0) {
        console.log('No tokens found, skipping push notification');
        return res.json({ success: true, message: 'No tokens found' });
      }

      const message = {
        notification: { title, body },
        tokens: tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      res.json({ success: true, response });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
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

import 'dotenv/config';
import express from 'express';

// Bypass self-signed certificate errors for MetaAPI
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createServer } from 'node:http';
import marketDataHandler from './api/marketData.js';
import configHandler from './api/config.js';
import analyzeHandler from './api/gemini/analyze.js';
import derivHandler from './api/derivData.js';
import twelveDataHandler from './api/twelveData.js';
import accountSyncHandler from './api/account-sync.ts';
import metaApiConnectHandler from './api/metaapi/connect.ts';
import metaApiPositionsHandler from './api/metaapi/positions.ts';
import metaApiTradeHandler from './api/metaapi/trade.ts';
import connectMt5Handler from './api/connect-mt5.ts';
import mt5DataHandler from './api/mt5/data.ts';
import activateStrategyHandler from './api/admin/activate-strategy.ts';
import broadcastHandler from './api/notifications/broadcast.ts';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  console.log('[Server] Initializing API routes...');

  // Twelve Data Routes
  app.get('/api/twelveData', twelveDataHandler);

  // API routes
  app.all('/api/config', configHandler);

  app.all('/api/marketData', marketDataHandler);

  app.post('/api/admin/activate-strategy', activateStrategyHandler);
  app.post('/api/account-sync', accountSyncHandler);
  app.post('/api/metaapi/connect', metaApiConnectHandler);
  app.get('/api/metaapi/positions', metaApiPositionsHandler);
  app.post('/api/metaapi/trade', metaApiTradeHandler);
  app.post('/api/connect-mt5', connectMt5Handler);
  app.get('/api/mt5/data', mt5DataHandler);

  // Gemini Proxy Route to bypass regional blocks (VPN-free execution)
  app.post('/api/gemini/analyze', analyzeHandler);

  // Deriv API Route
  app.get('/api/derivData', derivHandler);

  // Push Notification Route
  app.post('/api/notifications/broadcast', broadcastHandler);

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

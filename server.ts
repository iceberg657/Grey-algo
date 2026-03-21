import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import marketDataHandler from './api/marketData.js';
import fetchDataHandler from './api/fetchData.js';
import { fetchAssetSuggestions } from './services/suggestionService.js';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

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

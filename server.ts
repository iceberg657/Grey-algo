import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

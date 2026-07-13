import { createViteApp } from '../server.js';

console.log('[Vercel] Handler loading...');

let appPromise: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      console.log('[Vercel] Initializing app...');
      appPromise = createViteApp();
    }
    const app = await appPromise;
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel Entry] Fatal Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { uid, balance, equity, profit, drawdown } = req.body;
  if (!uid || balance === undefined || equity === undefined) {
    return res.status(400).json({ error: 'Missing sync data' });
  }

  try {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
        } catch (error) {
          console.error('Error initializing Firebase Admin:', error);
          return res.status(500).json({ error: 'Failed to initialize Firebase Admin' });
        }
      } else {
        return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT environment variable is missing' });
      }
    }

    let databaseId = '(default)';
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const firebaseConfig = JSON.parse(configData);
      databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    } catch (error) {
      console.warn('Could not read firebase-applet-config.json, using default database ID');
    }

    const db = getFirestore(databaseId);
    const syncData = {
      balance,
      equity,
      profit: profit || 0,
      drawdown: drawdown || 0,
      timestamp: Date.now()
    };

    await db.collection('users').doc(uid).collection('sync').doc('account').set(syncData);
    
    // Note: WebSocket broadcast removed for Vercel compatibility. 
    // Clients should use Firestore onSnapshot to listen for changes to this document.

    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing account data:', error);
    res.status(500).json({ error: 'Failed to sync account data' });
  }
}

import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { strategyId } = req.body;
  if (!strategyId) return res.status(400).json({ error: 'Missing strategyId' });

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
}

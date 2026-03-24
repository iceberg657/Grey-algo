import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, body, targetUserId } = req.body;

  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized in serverless function');
      } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        return res.status(500).json({ 
          error: 'Failed to initialize Firebase Admin',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT environment variable is missing' });
    }
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
    let tokens = [];

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
      return res.status(200).json({ success: true, message: 'No tokens found' });
    }

    const message = {
      notification: { title, body },
      tokens: tokens
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('FCM Broadcast response:', JSON.stringify(response));
      return res.status(200).json({ success: true, response });
    } catch (fcmError) {
      console.error('FCM send error:', fcmError);
      return res.status(500).json({ 
        error: 'FCM delivery failed', 
        details: fcmError instanceof Error ? fcmError.message : String(fcmError) 
      });
    }
  } catch (error) {
    console.error('General notification route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error in notification route', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}

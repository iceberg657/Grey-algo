import admin from 'firebase-admin';

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
        return res.status(500).json({ error: 'Failed to initialize Firebase Admin' });
      }
    } else {
      return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT environment variable is missing' });
    }
  }

  try {
    const db = admin.firestore();
    let tokens = [];

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
      return res.status(200).json({ success: true, message: 'No tokens found' });
    }

    const message = {
      notification: { title, body },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}

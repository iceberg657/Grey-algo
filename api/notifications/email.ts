import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { subject, message, accessToken, targetUserId } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Missing Gmail access token' });
  }

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
    let userEmails: string[] = [];

    try {
      if (targetUserId) {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (userDoc.exists && userDoc.data()?.email) {
          userEmails = [userDoc.data()?.email];
        }
      } else {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.docs.forEach(doc => {
          const email = doc.data().email;
          if (email && email.includes('@')) {
            userEmails.push(email);
          }
        });
      }
    } catch (dbError) {
      console.error('Firestore query error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to fetch user emails from database', 
        details: dbError instanceof Error ? dbError.message : String(dbError)
      });
    }

    if (userEmails.length === 0) {
      return res.status(200).json({ success: true, message: 'No valid user emails found' });
    }

    // Initialize Gmail API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    let successCount = 0;
    let failureCount = 0;
    const errors: any[] = [];

    // Send emails in a loop. For a large number, batching would be better, but this works for our scale.
    for (const email of userEmails) {
      try {
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject || 'GreyAlpha Update').toString('base64')}?=`;
        const messageParts = [
          `To: ${email}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          message.replace(/\n/g, '<br>')
        ];
        
        const rawMessage = Buffer.from(messageParts.join('\n'))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: rawMessage
          }
        });
        successCount++;
      } catch (error: any) {
        failureCount++;
        errors.push(error?.message || String(error));
      }
    }

    return res.status(200).json({ 
      success: true, 
      successCount,
      failureCount,
      errors: errors.slice(0, 5) // Send up to 5 error messages back
    });

  } catch (error) {
    console.error('General email route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error in email route', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}

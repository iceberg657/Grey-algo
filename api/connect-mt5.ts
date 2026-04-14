import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// Helper to call MetaAPI Provisioning API
async function metaApiProvisionFetch(endpoint: string, method: string = 'GET', body: any = null) {
  const token = process.env.METAAPI_TOKEN;
  if (!token) throw new Error('METAAPI_TOKEN not set');

  const response = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai${endpoint}`, {
    method,
    headers: {
      'auth-token': token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `MetaAPI Provisioning request failed (${response.status})`;
    try {
      const error = JSON.parse(text);
      errorMsg = error.message || errorMsg;
    } catch (e) {
      errorMsg = `${errorMsg}: ${text}`;
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  return response.json();
}

function encrypt(text: string) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { server, login, password, uid } = req.body;
  if (!server || !login || !password || !uid) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const encryptedPassword = encrypt(password);
  
  try {
    let accountId = null;
    
    // Try to provision account if token exists
    if (process.env.METAAPI_TOKEN) {
      try {
        const accounts = await metaApiProvisionFetch('/users/current/accounts');
        let account = accounts.find((a: any) => a.login === login && a.server === server);
        
        if (!account) {
          account = await metaApiProvisionFetch('/users/current/accounts', 'POST', {
            name: `AI Studio - ${login}`,
            login: login,
            password: password,
            server: server,
            platform: server.toLowerCase().includes('mt4') ? 'mt4' : 'mt5',
            magic: 1000,
            type: 'cloud-g1',
            reliability: 'regular'
          });
        }
        
        accountId = account._id;
        
        if (account.state !== 'DEPLOYED') {
          await metaApiProvisionFetch(`/users/current/accounts/${accountId}/deploy`, 'POST');
        }
      } catch (metaApiError: any) {
        console.error('MetaAPI Provisioning Error:', metaApiError);
        let errorMessage = metaApiError.message || 'Failed to provision account';
        if (errorMessage.toLowerCase().includes('top up your account')) {
          errorMessage = 'MetaAPI Billing Required: Your MetaAPI account has insufficient balance. Please top up your account at https://app.metaapi.cloud to enable cloud trading.';
        }
        return res.status(400).json({ error: errorMessage });
      }
    } else {
      return res.status(400).json({ error: 'METAAPI_TOKEN environment variable is missing on the server.' });
    }

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
    await db.collection('users').doc(uid).set({
      mt5Credentials: {
        server,
        login,
        password: encryptedPassword,
        ...(accountId ? { accountId } : {})
      }
    }, { merge: true });
    res.json({ success: true, accountId });
  } catch (error) {
    console.error('Error saving MT5 credentials:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
}

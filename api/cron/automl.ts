import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { GoogleGenAI } from "@google/genai";
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function handler(req: any, res: any) {
  // Optional: Verify cron secret if configured
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
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

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY_1;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const automlAi = new GoogleGenAI({ apiKey });

    const prompt = `You are an elite quantitative analyst and AI trading system.
    Analyze current global macroeconomic conditions, recent price action across major FX pairs and indices, and generate a new, highly optimized trading strategy.
    
    Focus on:
    1. **Institutional Liquidity:** POI mitigation, Liquidity Sweeps, and Order Flow.
    2. **Statistical Arbitrage:** Mean reversion from standard deviation extremes.
    3. **Confluence:** Merging SMC/ICT logic with mathematical indicators (RSI, SMA, ADX).
    
    Return the strategy in JSON format:
    {
      "name": "Strategy Name",
      "description": "Brief explanation of the institutional/quantitative logic",
      "rules": "Specific entry/exit rules, POI identification, and statistical filters",
      "performance": 0.85
    }`;

    const response = await automlAi.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const strategy = JSON.parse(response.text);
    const strategyId = `automl_${Date.now()}`;
    
    await db.collection('auto_ml_strategies').doc(strategyId).set({
      ...strategy,
      id: strategyId,
      timestamp: Date.now(),
      isActive: false
    });

    console.log(`Auto ML Strategy learned and logged: ${strategy.name}`);
    
    res.json({ success: true, strategy });
  } catch (error) {
    console.error('Error in Auto ML process:', error);
    res.status(500).json({ error: 'Failed to run AutoML' });
  }
}

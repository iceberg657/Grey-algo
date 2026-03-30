
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback } from './retryUtils';
import { db, auth } from '../firebase';
import { collectionGroup, getDocs, query, orderBy, limit, addDoc, collection } from 'firebase/firestore';

const STORAGE_KEY = 'greyalpha_automl_stats';
const STRATEGIES_KEY = 'greyalpha_learned_strategies';
const MAX_SESSIONS_PER_DAY = 3; // Increased for global learning

interface DailyStats {
    date: string;
    count: number;
    maxForDay: number;
}

export const getDailyStats = (): DailyStats => {
    try {
        const str = localStorage.getItem(STORAGE_KEY);
        const now = new Date();
        const today = now.toDateString();
        
        if (str) {
            const data = JSON.parse(str);
            if (data.date === today) {
                return { ...data, maxForDay: MAX_SESSIONS_PER_DAY };
            }
        }
        // Reset or Initialize for new day
        const newStats = { date: today, count: 0, maxForDay: MAX_SESSIONS_PER_DAY };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        return newStats;
    } catch {
        return { date: new Date().toDateString(), count: 0, maxForDay: MAX_SESSIONS_PER_DAY };
    }
};

export const incrementDailyCount = () => {
    const stats = getDailyStats();
    stats.count += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const canLearnMoreToday = () => {
    const stats = getDailyStats();
    return stats.count < stats.maxForDay;
};

export const getLearnedStrategies = async (): Promise<string[]> => {
    try {
        // First get local strategies
        const stored = localStorage.getItem(STRATEGIES_KEY);
        const local = stored ? JSON.parse(stored) : [];

        // Then get latest global strategies from Firestore
        const globalRef = collection(db, 'global_strategies');
        const q = query(globalRef, orderBy('timestamp', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const global = snapshot.docs.map(doc => doc.data().rule);

        // Get active Auto ML strategy
        const autoMLRef = collection(db, 'auto_ml_strategies');
        const qAutoML = query(autoMLRef, where('isActive', '==', true), limit(1));
        const autoMLSnapshot = await getDocs(qAutoML);
        const autoML = autoMLSnapshot.docs.map(doc => doc.data().rules);

        // Combine and keep unique
        return Array.from(new Set([...global, ...local, ...autoML])).slice(0, 20);
    } catch (e) {
        console.error("Failed to fetch strategies:", e);
        const stored = localStorage.getItem(STRATEGIES_KEY);
        return stored ? JSON.parse(stored) : [];
    }
};

const saveStrategy = (strategy: string) => {
    const stored = localStorage.getItem(STRATEGIES_KEY);
    const current = stored ? JSON.parse(stored) : [];
    if (!current.includes(strategy)) {
        const updated = [strategy, ...current].slice(0, 20);
        localStorage.setItem(STRATEGIES_KEY, JSON.stringify(updated));
    }
};

export const performAutoLearning = async (): Promise<string | null> => {
    if (!canLearnMoreToday()) return null;

    try {
        // 1. Fetch anonymized trade data from ALL users (Global Learning)
        const tradesRef = collectionGroup(db, 'trades');
        const q = query(tradesRef, orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        const trades = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                asset: data.asset,
                signal: data.signal,
                outcome: data.outcome,
                confidence: data.signalData?.confidence,
                timeframe: data.signalData?.timeframe,
                reasoning: data.signalData?.reasoning?.slice(0, 2) // Keep it concise
            };
        });

        return await executeLaneCall<string>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            let prompt = "Discover a new actionable SMC/ICT trading rule or insight based on recent market behavior. Output strictly the rule in one concise sentence.";
            
            if (trades.length > 10) {
                prompt = `Analyze these ${trades.length} recent trades from multiple users: ${JSON.stringify(trades)}. 
                Identify patterns in 'Win' vs 'Loss' trades. 
                What specific market conditions or signal parameters lead to higher probability? 
                What should we filter out? 
                Provide ONE new concise, actionable trading rule to increase probability and filter out bad trades. 
                Output strictly the rule in one sentence.`;
            }

            const response = await runWithModelFallback<GenerateContentResponse>(CHAT_MODELS, (modelId) => 
                ai.models.generateContent({
                    model: modelId,
                    contents: prompt,
                    config: { tools: [{ googleSearch: {} }], temperature: 0.7 },
                })
            );
            
            const strategy = response.text?.trim() || null;
            if (strategy) {
                saveStrategy(strategy);
                
                // Save to global strategies if it was a data-driven insight
                if (trades.length > 10) {
                    try {
                        await addDoc(collection(db, 'global_strategies'), {
                            rule: strategy,
                            timestamp: Date.now(),
                            sourceCount: trades.length,
                            confidence: 85
                        });
                    } catch (e) {
                        console.error("Failed to save global strategy:", e);
                    }
                }
            }
            return strategy;
        }, getChatPool());
    } catch (e) { 
        console.error("Global Learning Error:", e);
        return null; 
    }
};

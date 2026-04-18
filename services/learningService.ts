
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback, initializeApiKey } from './retryUtils';
import { db, auth } from '../firebase';
import { collectionGroup, getDocs, query, orderBy, limit, addDoc, collection, where } from 'firebase/firestore';
import { Trade, SignalData } from '../types';

const STORAGE_KEY = 'greyalpha_automl_stats';
const STRATEGIES_KEY = 'greyalpha_learned_strategies';
const PROTOCOL_KEY = 'greyalpha_neural_protocol';
const MAX_SESSIONS_PER_DAY = 5; // Increased for global learning

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

export const getRecentLessons = async (): Promise<string[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        const tradesRef = collection(db, 'users', user.uid, 'trades');
        // Fetch last 20 trades to find those with outcomes
        const q = query(tradesRef, orderBy('timestamp', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Trade))
            .filter(t => t.outcome === 'Win' || t.outcome === 'Loss')
            .map(data => {
                const outcomeEmoji = data.outcome === 'Win' ? '✅' : '❌';
                const reason = data.notes ? `Reason: ${data.notes}` : 'No specific notes provided.';
                return `${outcomeEmoji} ${data.asset} ${data.signal} - ${data.outcome}. ${reason}`;
            })
            .slice(0, 5); // Just the most recent 5 lessons
    } catch (e) {
        console.error("Failed to fetch lessons:", e);
        return [];
    }
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

        // Get recent personal lessons
        const lessons = await getRecentLessons();

        // Combine and keep unique
        return Array.from(new Set([...global, ...local, ...autoML, ...lessons])).slice(0, 25);
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

export const getNeuralProtocol = (): string | null => {
    return localStorage.getItem(PROTOCOL_KEY);
};

export const performAutoLearning = async (deep: boolean = false): Promise<string | null> => {
    if (!canLearnMoreToday()) {
        console.warn("Learning quota reached for today.");
        // If deep is requested, we might allow it once more or just use the cached result
        if (!deep) return null;
    }

    try {
        // 1. Fetch anonymized trade data
        const tradesRef = collectionGroup(db, 'trades');
        const fetchLimit = deep ? 200 : 50;
        const q = query(tradesRef, orderBy('timestamp', 'desc'), limit(fetchLimit));
        const snapshot = await getDocs(q);
        
        const trades = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                asset: data.asset,
                signal: data.signal,
                outcome: data.outcome, // Win, Loss, Pending, No Trade
                confidence: data.signalData?.confidence,
                timeframe: data.signalData?.timeframe,
                rr: data.signalData?.riskRewardRatio,
                reasoning: data.signalData?.reasoning?.slice(0, 3) 
            };
        });

        const winTrades = trades.filter(t => t.outcome === 'Win');
        const lossTrades = trades.filter(t => t.outcome === 'Loss');
        const winRate = trades.length > 0 ? (winTrades.length / (winTrades.length + lossTrades.length)) * 100 : 0;

        await initializeApiKey();

        return await executeLaneCall<string>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            let systemP = `Analyze these ${trades.length} trades (Win Rate: ${winRate.toFixed(1)}%). 
            Your goal is to reach a 65% win rate and 75% profitability. 
            Identify the core commonality in 'Loss' trades (e.g., specific assets, timeframes, or low ATR). 
            Identify the 'Golden Setup' from the 'Win' trades.`;

            if (deep) {
                systemP += `\nCreate a NEW 'Master Sniper Protocol' (3-5 concise rules) that acts as a mandatory filter. 
                Focus on Liquidity Sweeps, FVG Retests, and Session Timing. 
                Output strictly the rules as a bulleted list.`;
            } else {
                systemP += `\nProvide ONE new concise, actionable 'Neural Filter' rule to increase probability. 
                Output strictly the rule in one sentence.`;
            }

            const prompt = `${systemP}\n\nDATASET: ${JSON.stringify(trades)}`;

            const response = await runWithModelFallback<GenerateContentResponse>(CHAT_MODELS, (modelId) => 
                ai.models.generateContent({
                    model: modelId,
                    contents: prompt,
                    config: { tools: [{ googleSearch: {} }], temperature: 0.3 }, // Lower temp for more deterministic logic
                })
            );
            
            const strategy = response.text?.trim() || null;
            if (strategy) {
                if (deep) {
                    localStorage.setItem(PROTOCOL_KEY, strategy);
                } else {
                    saveStrategy(strategy);
                }
                
                incrementDailyCount();

                // Save to global strategies
                if (trades.length > 10) {
                    try {
                        await addDoc(collection(db, 'global_strategies'), {
                            rule: strategy,
                            timestamp: Date.now(),
                            isProtocol: deep,
                            winRateAtTime: winRate,
                            sourceCount: trades.length
                        });
                    } catch (e) {
                        console.error("Failed to save global strategy:", e);
                    }
                }
            }
            return strategy;
        }, getChatPool);
    } catch (e) { 
        console.error("Neural Learning Error:", e);
        return null; 
    }
};

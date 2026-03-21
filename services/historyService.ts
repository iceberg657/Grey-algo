
import type { SignalData, Trade } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const HISTORY_KEY = 'analysisHistory';

/**
 * Retrieves the analysis history.
 * Now fetches from Firestore if user is logged in, otherwise localStorage.
 */
export const getHistory = async (): Promise<SignalData[]> => {
    // If logged in, fetch from Firestore trades
    if (auth.currentUser) {
        try {
            const tradesRef = collection(db, 'users', auth.currentUser.uid, 'trades');
            const q = query(tradesRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                ...doc.data().signalData,
                id: doc.id,
                timestamp: doc.data().timestamp
            }));
        } catch (e) {
            console.error("Firestore history fetch failed:", e);
        }
    }

    // Fallback to localStorage
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        if (!historyJson) return [];
        const history = JSON.parse(historyJson);
        if (!Array.isArray(history)) return [];
        return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
        return [];
    }
};

/**
 * Saves a new analysis result.
 * Saves to Firestore if logged in.
 */
export const saveAnalysis = async (data: Omit<SignalData, 'id' | 'timestamp'>): Promise<SignalData> => {
    const now = Date.now();
    const newEntry: SignalData = {
        ...data,
        id: now.toString(),
        timestamp: now,
    };

    if (auth.currentUser) {
        try {
            const tradesRef = collection(db, 'users', auth.currentUser.uid, 'trades');
            const docRef = await addDoc(tradesRef, {
                uid: auth.currentUser.uid,
                asset: data.asset,
                signal: data.signal,
                timestamp: now,
                outcome: 'Pending',
                signalData: data
            });
            newEntry.id = docRef.id;
        } catch (e) {
            console.error("Firestore save failed:", e);
        }
    }

    // Also save to localStorage for offline/guest access
    const history = await getHistory();
    history.unshift(newEntry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));

    return newEntry;
};

/**
 * Updates a trade outcome in Firestore.
 */
export const updateTradeOutcome = async (tradeId: string, outcome: 'Win' | 'Loss' | 'No Trade'): Promise<void> => {
    if (!auth.currentUser) return;
    try {
        const tradeRef = doc(db, 'users', auth.currentUser.uid, 'trades', tradeId);
        await updateDoc(tradeRef, { outcome });
    } catch (e) {
        console.error("Failed to update outcome:", e);
    }
};

/**
 * Clears all analysis history.
 */
export const clearHistory = (): void => {
    localStorage.removeItem(HISTORY_KEY);
};

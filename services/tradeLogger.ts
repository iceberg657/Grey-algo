import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Trade, SignalData } from '../types';
import { auth } from '../firebase';

export const logTrade = async (signalData: SignalData, outcome: Trade['outcome'] = 'Pending', notes: string = ''): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
        console.warn('User not authenticated, skipping trade log.');
        return null;
    }

    const trade: Omit<Trade, 'id'> = {
        uid: user.uid,
        asset: signalData.asset,
        signal: signalData.signal,
        timestamp: Date.now(),
        outcome,
        notes,
        signalData
    };

    const tradesRef = collection(db, 'users', user.uid, 'trades');
    const docRef = await addDoc(tradesRef, trade);
    return docRef.id;
};

export const updateTradeOutcome = async (tradeId: string, outcome: Trade['outcome'], notes: string = ''): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
        console.warn('User not authenticated, skipping trade update.');
        return;
    }

    const tradeRef = doc(db, 'users', user.uid, 'trades', tradeId);
    await updateDoc(tradeRef, { outcome, notes });
};

export const getTradeHistory = async (): Promise<Trade[]> => {
    const user = auth.currentUser;
    if (!user) {
        console.warn('User not authenticated, returning empty trade history.');
        return [];
    }

    const tradesRef = collection(db, 'users', user.uid, 'trades');
    const q = query(tradesRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Trade));
};

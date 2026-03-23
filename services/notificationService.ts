
import { messaging, db, auth, handleFirestoreError, OperationType } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async () => {
    if (!messaging) return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY
            });
            
            if (token && auth.currentUser) {
                // Store token in Firestore for this user
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, { fcmToken: token });
                console.log('FCM Token generated and saved:', token);
            }
            return token;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
    return null;
};

export const onMessageListener = () => {
    if (!messaging) return;
    
    return onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        // You can customize how to show foreground notifications here
        // For example, using a toast or a custom UI element
        if (payload.notification) {
            new Notification(payload.notification.title || 'GreyAlpha Update', {
                body: payload.notification.body,
                icon: '/logo192.png' // Adjust icon path as needed
            });
        }
    });
};

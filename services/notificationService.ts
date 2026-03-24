
import { messaging, db, auth, handleFirestoreError, OperationType } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BNqHZGcnPS3pGkPVQOgk5l3H2aI-SWAtsxV4fDysT0L2zGfjlUvfZtHQ60EfXLQr23dDYRujbcwMpv5JwE9QP7c';

export const requestNotificationPermission = async (registration?: ServiceWorkerRegistration) => {
    if (!messaging) {
        console.warn('Messaging not initialized');
        return null;
    }

    if (!VAPID_KEY) {
        console.error('VITE_FIREBASE_VAPID_KEY is missing from environment variables. Push notifications will not work.');
        return null;
    }

    try {
        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('Notification permission status:', permission);
        
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });
            
            if (token && auth.currentUser) {
                // Store token in Firestore for this user
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, { fcmToken: token });
                console.log('FCM Token generated and saved to Firestore:', token);
            } else if (!token) {
                console.warn('No registration token available. Request permission to generate one.');
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

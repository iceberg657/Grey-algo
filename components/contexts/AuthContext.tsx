import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    User, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { UserMetadata } from '../../types';

interface AuthContextType {
    isLoggedIn: boolean;
    loading: boolean;
    user: User | null;
    userMetadata: UserMetadata | null;
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    globalError: string | null;
    setGlobalError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);

    if (error) throw error;

    useEffect(() => {
        let unsubscribeMeta: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setIsLoggedIn(!!currentUser);
            
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid);
                
                unsubscribeMeta = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserMetadata;
                        
                        if (data.isRevoked) {
                            await signOut(auth);
                            setGlobalError("Your terminal access has been revoked by central command.");
                            return;
                        }

                        // Ensure admin role is set if email matches
                        if (currentUser.email === 'ma8138498@gmail.com' && data.role !== 'admin') {
                            await updateDoc(userRef, { role: 'admin' });
                        }
                        
                        setUserMetadata(data);
                    } else {
                        const initialMeta: UserMetadata = {
                            uid: currentUser.uid,
                            email: currentUser.email || '',
                            role: currentUser.email === 'ma8138498@gmail.com' ? 'admin' : 'user',
                            analysisCount: 0,
                            access: {
                                autoTrade: 'locked',
                                products: 'locked',
                                sniperLiveTrade: 'locked'
                            },
                            createdAt: Date.now()
                        };
                        await setDoc(userRef, initialMeta);
                        setUserMetadata(initialMeta);
                    }
                    setLoading(false);
                }, (err) => {
                    setLoading(false);
                    try {
                        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
                    } catch (e) {
                        setError(e as Error);
                    }
                });
            } else {
                setUserMetadata(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeMeta) unsubscribeMeta();
        };
    }, []);

    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            // Force account selection to ensure the popup works correctly
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error('Detailed Google login error:', error);
            // Check for common errors
            if (error.code === 'auth/popup-blocked') {
                setGlobalError('The sign-in popup was blocked by your browser. Please allow popups for this site.');
            } else if (error.code === 'auth/cancelled-popup-request') {
                // User closed the popup, no need to alert
            } else if (error.code === 'auth/operation-not-allowed') {
                setGlobalError('Google Sign-In is not enabled in your Firebase project. Please enable it in the Firebase Console under Authentication > Sign-in method.');
            } else if (error.code === 'auth/unauthorized-domain') {
                setGlobalError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the "Authorized domains" list in the Firebase Console under Authentication > Settings.`);
            } else {
                setGlobalError(`Google login failed: ${error.message || 'Unknown error'}`);
            }
            throw error;
        }
    };

    const loginWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Email login error:', error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Email sign up error:', error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ 
            isLoggedIn, 
            loading, 
            user, 
            userMetadata, 
            loginWithGoogle, 
            loginWithEmail, 
            signUpWithEmail, 
            resetPassword, 
            logout,
            globalError,
            setGlobalError
        }}>
            {children}
            {globalError && (
                <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:w-96">
                    <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl border border-red-400/30 flex justify-between items-start animate-fade-in">
                        <div className="flex gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-xs font-bold leading-relaxed">{globalError}</p>
                        </div>
                        <button onClick={() => setGlobalError(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">✕</button>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};


import React, { useState, useCallback, useEffect, type ErrorInfo, type ReactNode, Component } from 'react';
import { TradeHistory } from './components/TradeHistory';
import { TradeJournal } from './components/TradeJournal';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { HomePage } from './components/HomePage';
import { AnalysisPage } from './components/AnalysisPage';
import { HistoryPage } from './components/HistoryPage';
import { ChatPage } from './components/ChatPage';
import { ProductsPage } from './components/ProductsPage';
import { AdminPanel } from './components/AdminPanel';
import { AutoTradePage } from './components/AutoTradePage';
import { SniperLiveTrade } from './components/SniperLiveTrade';
import { useAuth } from './hooks/useAuth';
import { saveAnalysis } from './services/historyService';
import type { SignalData, ChatMessage, AnalysisRequest } from './types';
import { LandingPage } from './components/LandingPage';
import { TransitionLoader } from './components/TransitionLoader';
import { resetChat as resetChatService } from './services/chatService';
import { AutoLearningManager } from './components/AutoLearningManager';
import { generateTradingSignal } from './services/geminiService';
import { Loader } from './components/Loader'; 
import { NeuralBackground } from './components/NeuralBackground';
import { initializeApiKey } from './services/retryUtils';
import { AnimatePresence, motion } from 'motion/react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query as firestoreQuery, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { AdminSettings } from './types';
import { requestNotificationPermission, onMessageListener } from './services/notificationService';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingFlow } from './components/OnboardingFlow';

type AuthPage = 'login' | 'signup';
type AppView = 'landing' | 'auth' | 'home' | 'analysis' | 'history' | 'chat' | 'products' | 'session' | 'journal' | 'admin' | 'autotrade' | 'sniper';

// Storage keys
const CHAT_STORAGE_KEY = 'greyquant_chat';

interface ErrorBoundaryProps {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// Error Boundary Component to prevent White Screen of Death
// Fix: Use explicit property declarations to resolve TypeScript errors in specific environments
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declaring state and props to help TypeScript inference
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-6 text-center z-[99999] relative">
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl max-w-md w-full shadow-2xl backdrop-blur-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h1 className="text-2xl font-bold text-red-400 mb-2">System Critical Error</h1>
              <p className="text-gray-300 mb-4 text-sm">
                The application encountered an unexpected issue and could not render.
              </p>
              <div className="bg-black/30 p-3 rounded-lg text-left mb-6 overflow-auto max-h-32 border border-white/10">
                <p className="font-mono text-xs text-red-300 break-all">
                    {this.state.error?.toString() || "Unknown Error"}
                </p>
              </div>
              <button 
                onClick={() => {
                    localStorage.clear(); 
                    window.location.href = '/';
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/30"
              >
                Clear Cache & Reload
              </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

const App: React.FC = () => {
    const { isLoggedIn, loading, logout, userMetadata } = useAuth();
    const [authPage, setAuthPage] = useState<AuthPage>('login');
    const [appView, setAppView] = useState<AppView>('landing');
    const [analysisData, setAnalysisData] = useState<{ data: SignalData, image: string | null } | null>(null);
    const [previousView, setPreviousView] = useState<AppView>('home');
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
    const [systemSettings, setSystemSettings] = useState<AdminSettings | null>(null);
    const [showSplash, setShowSplash] = useState<boolean>(true);
    const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

    useEffect(() => {
        if (!loading && isLoggedIn) {
            const hasSeenOnboarding = localStorage.getItem(`greyalpha_onboarding_${userMetadata?.uid || 'guest'}`);
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        }
    }, [isLoggedIn, loading, userMetadata?.uid]);

    const handleOnboardingComplete = () => {
        localStorage.setItem(`greyalpha_onboarding_${userMetadata?.uid || 'guest'}`, 'true');
        setShowOnboarding(false);
    };

    useEffect(() => {
        const path = 'admin_settings/system';
        const unsubscribe = onSnapshot(doc(db, 'admin_settings', 'system'), (snapshot) => {
            if (snapshot.exists()) {
                setSystemSettings(snapshot.data() as AdminSettings);
            }
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.warn("System settings access denied (likely unauthenticated).");
            } else {
                handleFirestoreError(error, OperationType.GET, path);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading) {
            setAppView(isLoggedIn ? 'home' : 'landing');
            
            if (isLoggedIn) {
                // Register service worker for background notifications
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/firebase-messaging-sw.js')
                        .then((registration) => {
                            console.log('Service Worker registered with scope:', registration.scope);
                            // Request notification permission and set up listener with registration
                            requestNotificationPermission(registration);
                        })
                        .catch((error) => {
                            console.error('Service Worker registration failed:', error);
                            // Fallback to request without registration
                            requestNotificationPermission();
                        });
                } else {
                    // Fallback for browsers without service worker support
                    requestNotificationPermission();
                }

                const unsubscribe = onMessageListener();
                
                return () => {
                    if (unsubscribe) unsubscribe();
                };
            }
        }
    }, [isLoggedIn, loading]);
    
    const [isApiKeyInitialized, setIsApiKeyInitialized] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
    
    // Connectivity listener
    useEffect(() => {
        const checkConnectivity = async () => {
            try {
                // Try to fetch a small doc from Firestore to check connectivity
                const { getDoc, doc } = await import('firebase/firestore');
                const timeoutPromise = new Error('timeout');
                const checkPromise = getDoc(doc(db, 'admin_settings', 'system'));
                
                const result = await Promise.race([
                    checkPromise,
                    new Promise((_, reject) => setTimeout(() => reject(timeoutPromise), 5000))
                ]);
                
                setIsFirebaseConnected(true);
            } catch (e) {
                console.warn("Firebase connectivity check failed. VPN might be required.", e);
                setIsFirebaseConnected(false);
            }
        };

        checkConnectivity();
        const interval = setInterval(checkConnectivity, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    // State to handle redirects to chat with a prompt
    const [pendingChatQuery, setPendingChatQuery] = useState<string | null>(null);

    // State for ChatPage with Firestore sync
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!isLoggedIn || !userMetadata?.uid) return;

        const path = `users/${userMetadata.uid}/chat_messages`;
        const chatRef = collection(db, 'users', userMetadata.uid, 'chat_messages');
        const q = firestoreQuery(chatRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as ChatMessage[];
            
            if (messages.length > 0) {
                setChatMessages(messages);
            }
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, path);
        });

        return () => unsubscribe();
    }, [isLoggedIn, userMetadata?.uid]);

    useEffect(() => {
        const init = async () => {
            try {
                await initializeApiKey();
                setIsApiKeyInitialized(true);
            } catch (e: any) {
                setError(e.message);
            }
        };
        init();
    }, []);

    const navigateTo = useCallback((view: AppView) => {
        setAppView(view);
    }, []);

    useEffect(() => {
        // Safe redirect: Only redirect if on analysis page and data is missing
        if (isLoggedIn && appView === 'analysis' && !analysisData) {
            console.warn("Redirecting from analysis to home due to missing data.");
            setAppView('home'); 
        }
    }, [isLoggedIn, appView, analysisData]);
    
    const handleNewChat = async () => {
        if (userMetadata?.uid) {
            const path = `users/${userMetadata.uid}/chat_messages`;
            try {
                const chatRef = collection(db, 'users', userMetadata.uid, 'chat_messages');
                const snapshot = await getDocs(chatRef);
                const batch = writeBatch(db);
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, path);
            }
        }
        setChatMessages([]);
        resetChatService();
    };

    const handleLogin = () => {
        // Navigation is handled by the useEffect watching isLoggedIn
    };
    
    const handleSignUp = () => {
        // Navigation is handled by the useEffect watching isLoggedIn
    };

    const handleLogout = async () => {
        await logout();
        setAppView('landing'); 
        setAuthPage('login');
    };

    const handleNavigateToAnalysis = (data: SignalData, from: AppView, image: string | null = null) => {
        setAnalysisData({ data, image });
        setPreviousView(from);
        navigateTo('analysis');
    };
    
    const handleNewAnalysis = async (data: Omit<SignalData, 'id' | 'timestamp'>, image: string) => {
        const savedData = await saveAnalysis(data);
        
        handleNavigateToAnalysis(savedData, 'home', image);
    };

    const handleNavigateToHome = () => {
        setAnalysisData(null);
        navigateTo('home');
    };

    const handleNavigateToHistory = () => {
        navigateTo('history');
    };

    const handleNavigateToChat = () => {
        navigateTo('chat');
    };

    const handleNavigateToJournal = () => {
        navigateTo('journal');
    };

    const handleNavigateToProducts = () => {
        navigateTo('products');
    };

    const handleNavigateToAdmin = () => {
        navigateTo('admin');
    };

    const handleNavigateToAutoTrade = () => {
        navigateTo('autotrade');
    };

    const handleNavigateToSniper = () => {
        navigateTo('sniper');
    };

    const handleBackFromAnalysis = () => {
        setAnalysisData(null);
        navigateTo(previousView); 
    };

    const handleEnterApp = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            if (isLoggedIn) {
                navigateTo('home');
            } else {
                setAppView('auth'); 
            }
            setIsTransitioning(false);
        }, 2000); 
    };

    const handleAssetSelect = (asset: string) => {
        setPendingChatQuery(`Tell me the current update on ${asset}`);
        navigateTo('chat');
    };
    
    // --- Render Logic ---

    // 1. API Key Initialization Check
    if ((!isApiKeyInitialized || loading) && !error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen text-lg text-red-500 bg-[#0f172a]">
                <div className="text-center p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <h2 className="text-2xl font-bold mb-4">Initialization Error</h2>
                    <p>{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // 2. Transition Loader
    if (isTransitioning) {
        return <TransitionLoader />;
    }

    // 2.5 Maintenance Mode
    if (systemSettings?.maintenanceMode && userMetadata?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
                <div className="bg-slate-900/50 border border-white/10 p-10 rounded-3xl max-w-md w-full shadow-2xl backdrop-blur-xl">
                    <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">Neural Maintenance</h1>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                        The GreyAlpha core is currently undergoing a scheduled neural recalibration. 
                        Access will be restored shortly.
                    </p>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="h-full w-1/3 bg-green-500"
                        />
                    </div>
                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
                        System Status: Recalibrating
                    </p>
                </div>
            </div>
        );
    }

    // 3. Landing Page
    if (appView === 'landing') {
        // Prevent glimpse of landing page if user is already logged in
        if (isLoggedIn) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
                    <Loader />
                </div>
            );
        }
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                <LandingPage onEnterApp={handleEnterApp} />
            </motion.div>
        );
    }

    // 4. Auth Pages
    if (!isLoggedIn) {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={authPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-screen"
                >
                    {authPage === 'signup' ? (
                        <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={() => setAuthPage('login')} />
                    ) : (
                        <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setAuthPage('signup')} />
                    )}
                </motion.div>
            </AnimatePresence>
        );
    }

    // 4. Main App Logic
    let content: React.ReactNode = null;

    switch (appView) {
        case 'home':
            content = (
                <HomePage 
                    onLogout={handleLogout} 
                    onAnalysisComplete={handleNewAnalysis} 
                    onNavigateToHistory={handleNavigateToHistory}
                    onNavigateToChat={handleNavigateToChat}
                    onNavigateToProducts={handleNavigateToProducts}
                    onNavigateToJournal={handleNavigateToJournal}
                    onNavigateToAdmin={handleNavigateToAdmin}
                    onNavigateToAutoTrade={handleNavigateToAutoTrade}
                    onNavigateToSniper={handleNavigateToSniper}
                    onAssetSelect={handleAssetSelect}
                    userMetadata={userMetadata}
                    systemSettings={systemSettings}
                />
            );
            break;
        case 'chat':
            content = (
                <ChatPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                    onNewChat={handleNewChat}
                    initialInput={pendingChatQuery}
                    onClearInitialInput={() => setPendingChatQuery(null)}
                    isLocked={systemSettings?.chatLocked && userMetadata?.role !== 'admin'}
                    userMetadata={userMetadata}
                />
            );
            break;
        case 'history':
            content = (
                <HistoryPage 
                    onSelectAnalysis={(data) => handleNavigateToAnalysis(data, 'history')}
                    onBack={handleNavigateToHome}
                    onLogout={handleLogout}
                />
            );
            break;
        case 'products':
            content = (
                <ProductsPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    userMetadata={userMetadata}
                />
            );
            break;
        case 'journal':
            content = (
                <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
                    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                        <header className="relative mb-6 flex justify-between items-center">
                            <button onClick={handleNavigateToHome} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-green-400">
                                Trade Journal & Neural Lessons
                            </h1>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium"
                                    aria-label="Logout"
                                >
                                    Logout
                                </button>
                            </div>
                        </header>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <TradeHistory />
                            </div>
                            <div className="lg:col-span-1">
                                <TradeJournal />
                            </div>
                        </div>
                    </div>
                </div>
            );
            break;
        case 'analysis':
            if (analysisData) {
                content = (
                    <AnalysisPage 
                        data={analysisData.data} 
                        image={analysisData.image}
                        onBack={handleBackFromAnalysis} 
                        onLogout={handleLogout}
                        userMetadata={userMetadata}
                    />
                );
            }
            break;
        case 'admin':
            content = (
                <AdminPanel onBack={handleNavigateToHome} />
            );
            break;
        case 'autotrade':
            content = (
                <AutoTradePage 
                    onBack={handleNavigateToHome} 
                    userMetadata={userMetadata}
                    isLocked={systemSettings?.autoTradeLocked && userMetadata?.role !== 'admin'}
                />
            );
            break;
        case 'sniper':
            content = (
                <SniperLiveTrade 
                    onBack={handleNavigateToHome} 
                    userMetadata={userMetadata}
                    isLocked={systemSettings?.sniperLocked && userMetadata?.role !== 'admin'}
                />
            );
            break;
        default:
            // Fallback for unknown view
            content = (
                <div className="flex items-center justify-center h-screen">
                    <p className="text-gray-500">Page Not Found. Redirecting...</p>
                </div>
            );
    }

    return (
        <ErrorBoundary>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            
            <AnimatePresence>
                {showOnboarding && isLoggedIn && (
                    <OnboardingFlow 
                        onComplete={handleOnboardingComplete} 
                        userName={userMetadata?.displayName || userMetadata?.email?.split('@')[0]}
                    />
                )}
            </AnimatePresence>

            {/* Connectivity Banner */}
            <AnimatePresence>
                {!isFirebaseConnected && (
                    <motion.div 
                        initial={{ y: -100 }}
                        animate={{ y: 0 }}
                        exit={{ y: -100 }}
                        className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Neural Link Interrupted: Firebase is blocked. VPN Required for Admin Panel & Data Sync.</span>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
                        >
                            Retry Link
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {userMetadata?.role === 'admin' && <AutoLearningManager />}
            <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={appView}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {content}
                    </motion.div>
                </AnimatePresence>
            </div>
        </ErrorBoundary>
    );
};

export default App;

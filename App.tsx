
import React, { useState, useCallback, useEffect, type ErrorInfo, type ReactNode, Component } from 'react';
import { TradeHistory } from './components/TradeHistory';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { HomePage } from './components/HomePage';
import { AnalysisPage } from './components/AnalysisPage';
import { HistoryPage } from './components/HistoryPage';
import { ChatPage } from './components/ChatPage';
import { ProductsPage } from './components/ProductsPage';
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

type AuthPage = 'login' | 'signup';
type AppView = 'landing' | 'auth' | 'home' | 'analysis' | 'history' | 'chat' | 'products' | 'session' | 'journal';

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
    const { isLoggedIn, loading, logout } = useAuth();
    const [authPage, setAuthPage] = useState<AuthPage>('login');
    const [appView, setAppView] = useState<AppView>('landing');
    const [analysisData, setAnalysisData] = useState<{ data: SignalData, image: string | null } | null>(null);
    const [previousView, setPreviousView] = useState<AppView>('home');
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

    useEffect(() => {
        if (!loading) {
            setAppView(isLoggedIn ? 'home' : 'landing');
        }
    }, [isLoggedIn, loading]);
    
    const [isApiKeyInitialized, setIsApiKeyInitialized] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // State to handle redirects to chat with a prompt
    const [pendingChatQuery, setPendingChatQuery] = useState<string | null>(null);

    // State for ChatPage with localStorage persistence
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
        try {
            const storedMessages = window.localStorage.getItem(CHAT_STORAGE_KEY);
            return storedMessages ? JSON.parse(storedMessages) : [];
        } catch (error) {
            return [];
        }
    });

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
    
    const handleNewChat = () => {
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
    
    const handleNewAnalysis = (data: Omit<SignalData, 'id' | 'timestamp'>, image: string) => {
        const savedData = saveAnalysis(data);
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
        return <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
            <Loader />
        </div>;
    }

    if (error) {
        return <div className="flex items-center justify-center min-h-screen text-lg text-red-500">Error: {error}</div>;
    }

    // 2. Transition Loader
    if (isTransitioning) {
        return <TransitionLoader />;
    }

    // 3. Landing Page
    if (appView === 'landing') {
        return <LandingPage onEnterApp={handleEnterApp} />;
    }

    // 4. Auth Pages
    if (!isLoggedIn) {
        if (authPage === 'signup') {
            return <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={() => setAuthPage('login')} />;
        }
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setAuthPage('signup')} />;
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
                    onAssetSelect={handleAssetSelect}
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
                                Trade Journal
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
                        <TradeHistory />
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
                    />
                );
            }
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
            <AutoLearningManager />
            <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
                {content}
            </div>
        </ErrorBoundary>
    );
};

export default App;

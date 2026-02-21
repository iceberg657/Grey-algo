
import React, { useState, useCallback, useEffect, type ErrorInfo, type ReactNode, Component } from 'react';
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
import { TradingViewWidget } from './components/TradingViewWidget';
import { SignalOverlay } from './components/SignalOverlay';
import { generateTradingSignal } from './services/geminiService';
import { Loader } from './components/Loader'; 
import { NeuralBackground } from './components/NeuralBackground';
import { initializeApiKey } from './services/retryUtils';


type AuthPage = 'login' | 'signup';
type AppView = 'landing' | 'auth' | 'home' | 'analysis' | 'history' | 'chat' | 'charting' | 'products';

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
    const { isLoggedIn, login, logout } = useAuth();
    const [authPage, setAuthPage] = useState<AuthPage>('login');
    const [appView, setAppView] = useState<AppView>(isLoggedIn ? 'home' : 'landing');
    const [analysisData, setAnalysisData] = useState<{ data: SignalData, image: string | null } | null>(null);
    const [previousView, setPreviousView] = useState<AppView>('home');
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
    
    // State for chart analysis from the charting view
    const [isAnalyzingChart, setIsAnalyzingChart] = useState(false);
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
        login();
        navigateTo('home');
    };
    
    const handleSignUp = () => {
        login();
        navigateTo('home');
    };

    const handleLogout = () => {
        logout();
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
    
    const handleNavigateToCharting = () => {
        navigateTo('charting');
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

    const handleChartAnalysis = useCallback(async (imageData: string) => {
        setIsAnalyzingChart(true);
        try {
            const base64Data = imageData.split(',')[1];
            const request: AnalysisRequest = {
                images: {
                    primary: {
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                },
                riskRewardRatio: '1:3',
                tradingStyle: 'Day Trading',
                isMultiDimensional: false,

            };

            const data = await generateTradingSignal(request);
            const savedData = saveAnalysis(data);
            
            setIsAnalyzingChart(false);
            handleNavigateToAnalysis(savedData, 'charting', imageData); 
        } catch (error) {
            console.error("Chart Analysis Failed:", error);
            setIsAnalyzingChart(false);
            alert("Analysis failed. Please try again.");
        }
    }, []);
    
    // --- Render Logic ---

    // 1. API Key Initialization Check
    if (!isApiKeyInitialized && !error) {
        return <div className="flex items-center justify-center min-h-screen text-lg text-gray-400">Initializing API Key...</div>;
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
                    onNavigateToCharting={handleNavigateToCharting}
                    onNavigateToProducts={handleNavigateToProducts}
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
        case 'charting':
            break;
        default:
            // Fallback for unknown view
            content = (
                <div className="flex items-center justify-center h-screen">
                    <p className="text-gray-500">Page Not Found. Redirecting...</p>
                </div>
            );
    }

    const isCharting = appView === 'charting';
    
    // Chart Layer needs to be outside the switch to preserve iframe state
    const chartLayer = (
        <div 
            className="fixed inset-0 z-[50] bg-[#f4f7f9] dark:bg-[#0f172a] transition-opacity duration-300"
            style={{ 
                visibility: isCharting ? 'visible' : 'hidden', 
                opacity: isCharting ? 1 : 0,
                pointerEvents: isCharting ? 'auto' : 'none',
            }}
        >
            <NeuralBackground />
            <div className="absolute inset-0 z-0">
                <TradingViewWidget />
            </div>

            {/* Changed from top-0 left-0 right-0 to inset-0 to ensure full coverage */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="pointer-events-auto h-full">
                    <SignalOverlay 
                        onAnalyzeClick={handleChartAnalysis} 
                        onBack={handleNavigateToHome}
                    />
                </div>
            </div>

            {isAnalyzingChart && (
                <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader />
                    <p className="mt-4 text-green-400 font-bold animate-pulse">Analyzing Live Chart Data...</p>
                </div>
            )}
        </div>
    );

    return (
        <ErrorBoundary>
            <AutoLearningManager />
            {chartLayer}
            <div style={{ display: isCharting ? 'none' : 'block', minHeight: '100vh' }}>
                {content}
            </div>
        </ErrorBoundary>
    );
};

export default App;

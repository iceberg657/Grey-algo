import React, { useState, useCallback, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { HomePage } from './components/HomePage';
import { AnalysisPage } from './components/AnalysisPage';
import { HistoryPage } from './components/HistoryPage';
import { NewsPage } from './components/NewsPage';
import { ChatPage } from './components/ChatPage';
import { PredictorPage } from './components/PredictorPage';
import { MarketStatisticsPage } from './components/MarketStatisticsPage';
import { useAuth } from './hooks/useAuth';
import { saveAnalysis } from './services/historyService';
import type { SignalData, NewsArticle, PredictedEvent, ChatMessage, AnalysisRequest } from './types';
import { LandingPage } from './components/LandingPage';
import { TransitionLoader } from './components/TransitionLoader';
import { getForexNews } from './services/newsService';
import { getPredictedEvents } from './services/predictorService';
import { resetChat as resetChatService } from './services/chatService';
import { AutoLearningManager } from './components/AutoLearningManager';
import { TradingViewWidget } from './components/TradingViewWidget';
import { SignalOverlay } from './components/SignalOverlay';
import { generateTradingSignal } from './services/geminiService';
import { Loader } from './components/Loader'; 
import { NeuralBackground } from './components/NeuralBackground';


type AuthPage = 'login' | 'signup';
type AppView = 'landing' | 'auth' | 'home' | 'analysis' | 'history' | 'news' | 'chat' | 'predictor' | 'statistics' | 'charting';

// Storage keys
const NEWS_STORAGE_KEY = 'greyquant_news';
const PREDICTOR_STORAGE_KEY = 'greyquant_predictor';
const CHAT_STORAGE_KEY = 'greyquant_chat';

const App: React.FC = () => {
    const { isLoggedIn, login, logout } = useAuth();
    const [authPage, setAuthPage] = useState<AuthPage>('login');
    const [appView, setAppView] = useState<AppView>(isLoggedIn ? 'home' : 'landing');
    const [analysisData, setAnalysisData] = useState<SignalData | null>(null);
    const [previousView, setPreviousView] = useState<AppView>('home');
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
    
    // State for chart analysis from the charting view
    const [isAnalyzingChart, setIsAnalyzingChart] = useState(false);
    
    // State to handle redirects to chat with a prompt
    const [pendingChatQuery, setPendingChatQuery] = useState<string | null>(null);

    // State for NewsPage with localStorage persistence
    const [news, setNews] = useState<NewsArticle[]>(() => {
        try {
            const storedNews = window.localStorage.getItem(NEWS_STORAGE_KEY);
            return storedNews ? JSON.parse(storedNews) : [];
        } catch (error) {
            console.warn(`Could not read news from localStorage: ${error}`);
            return [];
        }
    });
    const [isNewsLoading, setIsNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState<string | null>(null);

    // State for PredictorPage with localStorage persistence
    const [predictedEvents, setPredictedEvents] = useState<PredictedEvent[]>(() => {
        try {
            const storedEvents = window.localStorage.getItem(PREDICTOR_STORAGE_KEY);
            return storedEvents ? JSON.parse(storedEvents) : [];
        } catch (error) {
            console.warn(`Could not read predicted events from localStorage: ${error}`);
            return [];
        }
    });
    const [isPredictorLoading, setIsPredictorLoading] = useState(false);
    const [predictorError, setPredictorError] = useState<string | null>(null);

    // State for ChatPage with localStorage persistence
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
        try {
            const storedMessages = window.localStorage.getItem(CHAT_STORAGE_KEY);
            return storedMessages ? JSON.parse(storedMessages) : [];
        } catch (error) {
            console.warn(`Could not read chat messages from localStorage: ${error}`);
            return [];
        }
    });

    // Helper for History Navigation
    const navigateTo = useCallback((view: AppView) => {
        // Check if we are in a safe environment to push state (http/https)
        // This prevents SecurityError in blob/sandbox environments
        const isSafeOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        
        if (isSafeOrigin) {
            try {
                window.history.pushState({ view }, '', `#${view}`);
            } catch (e) {
                // Fallback attempt without URL change if explicit hash fails
                try {
                    window.history.pushState({ view }, '');
                } catch (e2) {
                    console.warn("History pushState disabled in this environment.");
                }
            }
        }
        setAppView(view);
    }, []);

    // Handle initial load and back button (popstate)
    useEffect(() => {
        const isSafeOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        const initialView = isLoggedIn ? 'home' : 'landing';
        
        if (!window.history.state && isSafeOrigin) {
            try {
                window.history.replaceState({ view: initialView }, '', `#${initialView}`);
            } catch (e) {
                try {
                    window.history.replaceState({ view: initialView }, '');
                } catch (e2) {
                    console.warn("History replaceState disabled.");
                }
            }
        }

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.view) {
                setAppView(event.state.view);
            } else {
                // If user went back to before our state history, reset to logical default
                if (isLoggedIn) {
                    setAppView('home');
                } else {
                    setAppView('landing');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isLoggedIn]);


    // Effect to save news to localStorage whenever it changes
    useEffect(() => {
        try {
            window.localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(news));
        } catch (error) {
            console.error(`Could not save news to localStorage: ${error}`);
        }
    }, [news]);

    // Effect to save predicted events to localStorage whenever they change
    useEffect(() => {
        try {
            window.localStorage.setItem(PREDICTOR_STORAGE_KEY, JSON.stringify(predictedEvents));
        } catch (error) {
            console.error(`Could not save predicted events to localStorage: ${error}`);
        }
    }, [predictedEvents]);

    // Effect to save chat messages to localStorage whenever they change
    useEffect(() => {
        try {
            window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
        } catch (error) {
            console.error(`Could not save chat messages to localStorage: ${error}`);
        }
    }, [chatMessages]);

    // Lock body scroll when in Charting view to prevent rubber-banding and scroll interference
    useEffect(() => {
        if (appView === 'charting') {
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
        };
    }, [appView]);

    const fetchNewsData = useCallback(async () => {
        setIsNewsLoading(true);
        setNewsError(null);
        try {
            const fetchedNews = await getForexNews();
            // Sort news by date, newest first
            fetchedNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNews(fetchedNews);
        } catch (err) {
            setNewsError(err instanceof Error ? err.message : 'Failed to fetch news.');
        } finally {
            setIsNewsLoading(false);
        }
    }, []);
    
    const fetchPredictedEventsData = useCallback(async () => {
        setIsPredictorLoading(true);
        setPredictorError(null);
        try {
            const fetchedEvents = await getPredictedEvents();
            setPredictedEvents(fetchedEvents);
        } catch (err) {
            setPredictorError(err instanceof Error ? err.message : 'Failed to fetch predictions.');
        } finally {
            setIsPredictorLoading(false);
        }
    }, []);

    const handleNewChat = () => {
        setChatMessages([]);
        resetChatService();
    };

    const handleLogin = () => {
        login();
        navigateTo('home');
    };
    
    const handleSignUp = () => {
        login(); // Auto-login on sign up for simplicity
        navigateTo('home');
    };

    const handleLogout = () => {
        logout();
        const isSafeOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (isSafeOrigin) {
            try {
                window.history.pushState({ view: 'landing' }, '', '#landing');
            } catch (e) {
                try {
                    window.history.pushState({ view: 'landing' }, '');
                } catch (e2) {}
            }
        }
        setAppView('landing'); 
        setAuthPage('login');
    };

    const handleNavigateToAnalysis = (data: SignalData, from: AppView) => {
        setAnalysisData(data);
        setPreviousView(from);
        navigateTo('analysis');
    };
    
    const handleNewAnalysis = (data: Omit<SignalData, 'id' | 'timestamp'>) => {
        const savedData = saveAnalysis(data);
        handleNavigateToAnalysis(savedData, 'home');
    };

    const handleNavigateToHome = () => {
        setAnalysisData(null);
        navigateTo('home');
    };

    const handleNavigateToHistory = () => {
        navigateTo('history');
    };

    const handleNavigateToNews = () => {
        if (news.length === 0 && !newsError && !isNewsLoading) {
            fetchNewsData();
        }
        navigateTo('news');
    };

    const handleNavigateToChat = () => {
        navigateTo('chat');
    };
    
    const handleNavigateToPredictor = () => {
        if (predictedEvents.length === 0 && !predictorError && !isPredictorLoading) {
            fetchPredictedEventsData();
        }
        navigateTo('predictor');
    };

    const handleNavigateToStatistics = () => {
        navigateTo('statistics');
    };

    const handleNavigateToCharting = () => {
        navigateTo('charting');
    };

    const handleBackFromAnalysis = () => {
        setAnalysisData(null);
        // Instead of navigateTo, go back in history if possible to preserve natural flow,
        // otherwise default to previousView
        const isSafeOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (isSafeOrigin && window.history.length > 1) {
             window.history.back();
        } else {
             // Fallback if history is empty or unsafe
             navigateTo(previousView); 
        }
    };

    const handleEnterApp = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            const nextView = isLoggedIn ? 'home' : 'auth';
            if (isLoggedIn) {
                navigateTo('home');
            } else {
                setAppView('auth'); // Auth isn't a history state usually, effectively landing
            }
            setIsTransitioning(false);
        }, 2500); // 2.5 second transition for loading effect
    };

    const handleAssetSelect = (asset: string) => {
        setPendingChatQuery(`Tell me the current update on ${asset}`);
        navigateTo('chat');
    };

    // New handler for chart analysis from the overlay
    const handleChartAnalysis = useCallback(async (imageData: string) => {
        setIsAnalyzingChart(true);
        try {
            // Strip data URL prefix
            const base64Data = imageData.split(',')[1];
            
            const request: AnalysisRequest = {
                images: {
                    primary: {
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                },
                riskRewardRatio: '1:3', // Default for quick analysis
                tradingStyle: 'Day Trading', // Default
                isMultiDimensional: false,
                profitMode: false // Default to false for quick overlay analysis
            };

            const data = await generateTradingSignal(request);
            const savedData = saveAnalysis(data);
            
            setIsAnalyzingChart(false);
            handleNavigateToAnalysis(savedData, 'charting'); // Return to charting when "Back" is pressed
        } catch (error) {
            console.error("Chart Analysis Failed:", error);
            setIsAnalyzingChart(false);
            alert("Analysis failed. Please try again.");
        }
    }, []);
    
    if (isTransitioning) {
        return <TransitionLoader />;
    }

    if (appView === 'landing') {
        return <LandingPage onEnterApp={handleEnterApp} />;
    }

    if (!isLoggedIn) {
        if (authPage === 'signup') {
            return <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={() => setAuthPage('login')} />;
        }
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setAuthPage('signup')} />;
    }

    // Determine the main content based on the view
    let content: React.ReactNode = null;

    switch (appView) {
        case 'home':
            content = (
                <HomePage 
                    onLogout={handleLogout} 
                    onAnalysisComplete={handleNewAnalysis} 
                    onNavigateToHistory={handleNavigateToHistory}
                    onNavigateToNews={handleNavigateToNews}
                    onNavigateToChat={handleNavigateToChat}
                    onNavigateToPredictor={handleNavigateToPredictor}
                    onNavigateToStatistics={handleNavigateToStatistics}
                    onNavigateToCharting={handleNavigateToCharting}
                    onAssetSelect={handleAssetSelect}
                />
            );
            break;
        case 'predictor':
            content = (
                <PredictorPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    events={predictedEvents}
                    isLoading={isPredictorLoading}
                    error={predictorError}
                    onFetchPredictions={fetchPredictedEventsData}
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
        case 'news':
            content = (
                <NewsPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    news={news}
                    isLoading={isNewsLoading}
                    error={newsError}
                    onFetchNews={fetchNewsData}
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
        case 'statistics':
            content = (
                <MarketStatisticsPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                />
            );
            break;
        case 'analysis':
            if (analysisData) {
                content = (
                    <AnalysisPage 
                        data={analysisData} 
                        onBack={handleBackFromAnalysis} 
                        onLogout={handleLogout}
                    />
                );
            }
            break;
        case 'charting':
            // Content handled by persistent chartLayer
            break;
        default:
            content = null;
    }

    // Persistent Chart Layer
    // We changed this to display: block and use absolute positioning for children to ensure full screen map-like feel
    const isCharting = appView === 'charting';
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
            {/* Chart fills the entire container */}
            <div className="absolute inset-0 z-0">
                <TradingViewWidget />
            </div>

            {/* Floating HUD Layer - Positioned absolutely on top of chart */}
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    <SignalOverlay 
                        onAnalyzeClick={handleChartAnalysis} 
                        onBack={handleNavigateToHome}
                    />
                </div>
            </div>

            {/* Chart Analysis Loading Overlay */}
            {isAnalyzingChart && (
                <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader />
                    <p className="mt-4 text-green-400 font-bold animate-pulse">Analyzing Live Chart Data...</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <AutoLearningManager />
            {chartLayer}
            <div style={{ display: isCharting ? 'none' : 'block' }}>
                {content}
            </div>
        </>
    );
};

export default App;
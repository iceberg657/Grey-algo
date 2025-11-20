
import React, { useState, useCallback, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { HomePage } from './components/HomePage';
import { AnalysisPage } from './components/AnalysisPage';
import { HistoryPage } from './components/HistoryPage';
import { NewsPage } from './components/NewsPage';
import { ChatPage } from './components/ChatPage';
import { PredictorPage } from './components/PredictorPage';
import { useAuth } from './hooks/useAuth';
import { saveAnalysis } from './services/historyService';
import type { SignalData, NewsArticle, PredictedEvent, ChatMessage } from './types';
import { LandingPage } from './components/LandingPage';
import { TransitionLoader } from './components/TransitionLoader';
import { getForexNews } from './services/newsService';
import { getPredictedEvents } from './services/predictorService';
import { resetChat as resetChatService } from './services/chatService';
import { AutoLearningManager } from './components/AutoLearningManager';


type AuthPage = 'login' | 'signup';
type AppView = 'landing' | 'auth' | 'home' | 'analysis' | 'history' | 'news' | 'chat' | 'predictor';

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
        setAppView('home');
    };
    
    const handleSignUp = () => {
        login(); // Auto-login on sign up for simplicity
        setAppView('home');
    };

    const handleLogout = () => {
        logout();
        setAppView('landing'); // Go back to landing page on logout
        setAuthPage('login');
    };

    const handleNavigateToAnalysis = (data: SignalData, from: AppView) => {
        setAnalysisData(data);
        setPreviousView(from);
        setAppView('analysis');
    };
    
    const handleNewAnalysis = (data: Omit<SignalData, 'id' | 'timestamp'>) => {
        const savedData = saveAnalysis(data);
        handleNavigateToAnalysis(savedData, 'home');
    };

    const handleNavigateToHome = () => {
        setAnalysisData(null);
        setAppView('home');
    };

    const handleNavigateToHistory = () => {
        setAppView('history');
    };

    const handleNavigateToNews = () => {
        if (news.length === 0 && !newsError && !isNewsLoading) {
            fetchNewsData();
        }
        setAppView('news');
    };

    const handleNavigateToChat = () => {
        setAppView('chat');
    };
    
    const handleNavigateToPredictor = () => {
        if (predictedEvents.length === 0 && !predictorError && !isPredictorLoading) {
            fetchPredictedEventsData();
        }
        setAppView('predictor');
    };

    const handleBackFromAnalysis = () => {
        setAnalysisData(null);
        setAppView(previousView);
    };

    const handleEnterApp = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setAppView(isLoggedIn ? 'home' : 'auth');
            setIsTransitioning(false);
        }, 2500); // 2.5 second transition for loading effect
    };
    
    if (isTransitioning) {
        return <TransitionLoader />;
    }

    // Render AutoLearningManager inside the main app container to ensure it runs
    // whenever the app is mounted, but outside of specific pages so it persists.
    const autoLearning = isLoggedIn ? <AutoLearningManager /> : null;

    if (appView === 'landing') {
        return <LandingPage onEnterApp={handleEnterApp} />;
    }

    if (!isLoggedIn) {
        if (authPage === 'signup') {
            return <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={() => setAuthPage('login')} />;
        }
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setAuthPage('signup')} />;
    }

    if (appView === 'predictor') {
        return (
            <>
                {autoLearning}
                <PredictorPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    events={predictedEvents}
                    isLoading={isPredictorLoading}
                    error={predictorError}
                    onFetchPredictions={fetchPredictedEventsData}
                />
            </>
        );
    }

    if (appView === 'chat') {
        return (
            <>
                {autoLearning}
                <ChatPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                    onNewChat={handleNewChat}
                />
            </>
        );
    }

    if (appView === 'news') {
        return (
             <>
                {autoLearning}
                <NewsPage 
                    onBack={handleNavigateToHome} 
                    onLogout={handleLogout}
                    news={news}
                    isLoading={isNewsLoading}
                    error={newsError}
                    onFetchNews={fetchNewsData}
                />
            </>
        );
    }

    if (appView === 'history') {
        return (
            <>
                {autoLearning}
                <HistoryPage 
                    onSelectAnalysis={(data) => handleNavigateToAnalysis(data, 'history')}
                    onBack={handleNavigateToHome}
                    onLogout={handleLogout}
                />
            </>
        );
    }

    if (appView === 'analysis' && analysisData) {
        return (
            <>
                {autoLearning}
                <AnalysisPage 
                    data={analysisData} 
                    onBack={handleBackFromAnalysis} 
                    onLogout={handleLogout}
                />
            </>
        );
    }

    // Default to home page if logged in
    return (
        <>
            {autoLearning}
            <HomePage 
                onLogout={handleLogout} 
                onAnalysisComplete={handleNewAnalysis} 
                onNavigateToHistory={handleNavigateToHistory}
                onNavigateToNews={handleNavigateToNews}
                onNavigateToChat={handleNavigateToChat}
                onNavigateToPredictor={handleNavigateToPredictor}
            />
        </>
    );
};

export default App;

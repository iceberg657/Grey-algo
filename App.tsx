import React, { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { HomePage } from './components/HomePage';
import { AnalysisPage } from './components/AnalysisPage';
import { HistoryPage } from './components/HistoryPage';
import { NewsPage } from './components/NewsPage';
import { ChatPage } from './components/ChatPage';
import { useAuth } from './hooks/useAuth';
import { saveAnalysis } from './services/historyService';
import type { SignalData } from './types';

type AuthPage = 'login' | 'signup';
type AppView = 'auth' | 'home' | 'analysis' | 'history' | 'news' | 'chat';

const App: React.FC = () => {
    const { isLoggedIn, login, logout } = useAuth();
    const [authPage, setAuthPage] = useState<AuthPage>('login');
    const [appView, setAppView] = useState<AppView>('home');
    const [analysisData, setAnalysisData] = useState<SignalData | null>(null);
    const [previousView, setPreviousView] = useState<AppView>('home');
    
    const handleLogin = () => {
        login();
    };
    
    const handleSignUp = () => {
        login(); // Auto-login on sign up for simplicity
    };

    const handleLogout = () => {
        logout();
        setAppView('home'); // Go back to home view on logout
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
        setAppView('news');
    };

    const handleNavigateToChat = () => {
        setAppView('chat');
    };
    
    const handleBackFromAnalysis = () => {
        setAnalysisData(null);
        setAppView(previousView);
    };
    
    if (!isLoggedIn) {
        if (authPage === 'signup') {
            return <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={() => setAuthPage('login')} />;
        }
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setAuthPage('signup')} />;
    }

    if (appView === 'chat') {
        return <ChatPage onBack={handleNavigateToHome} onLogout={handleLogout} />;
    }

    if (appView === 'news') {
        return <NewsPage onBack={handleNavigateToHome} onLogout={handleLogout} />;
    }

    if (appView === 'history') {
        return <HistoryPage 
            onSelectAnalysis={(data) => handleNavigateToAnalysis(data, 'history')}
            onBack={handleNavigateToHome}
            onLogout={handleLogout}
        />;
    }

    if (appView === 'analysis' && analysisData) {
        return <AnalysisPage 
            data={analysisData} 
            onBack={handleBackFromAnalysis} 
            onLogout={handleLogout}
        />;
    }

    // Default to home page if logged in
    return <HomePage 
        onLogout={handleLogout} 
        onAnalysisComplete={handleNewAnalysis} 
        onNavigateToHistory={handleNavigateToHistory}
        onNavigateToNews={handleNavigateToNews}
        onNavigateToChat={handleNavigateToChat}
    />;
};

export default App;

import React, { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { ChartAnalyzerPage } from './components/ChartAnalyzerPage';

type Page = 'login' | 'signup';

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<Page>('login');

    const handleLogin = () => {
        setIsLoggedIn(true);
    };
    
    const handleSignUp = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentPage('login'); // Go back to login on logout
    };
    
    if (isLoggedIn) {
        return <ChartAnalyzerPage onLogout={handleLogout} />;
    }

    if (currentPage === 'signup') {
        return <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={() => setCurrentPage('login')} />;
    }
    
    // Default to login page
    return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setCurrentPage('signup')} />;
};

export default App;

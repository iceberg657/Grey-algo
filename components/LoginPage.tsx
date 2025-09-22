import React, { useState } from 'react';

interface LoginPageProps {
    onNavigateToSignUp: () => void;
    // FIX: Add onLogin prop to fix type error from App.tsx.
    onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToSignUp, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock login: succeed if fields are not empty
        if (email && password) {
            // FIX: Call the onLogin prop passed from App.tsx.
            onLogin();
        } else {
            alert("Please fill in both email and password.");
        }
    };

    return (
        <div className="min-h-screen text-dark-text font-sans p-4 flex flex-col items-center justify-center animate-fade-in">
             <header className="text-center mb-8">
                <svg className="h-16 w-16 mx-auto mb-4" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    {/* Changed green candles to green for thematic consistency */}
                    <g className="animate-bounce-candle origin-center [animation-delay:-0.2s]">
                        <path d="M20 12V20" stroke="#047857" strokeWidth="3" strokeLinecap="round"/>
                        <rect x="16" y="20" width="8" height="18" rx="1" fill="#059669"/>
                        <path d="M20 38V48" stroke="#047857" strokeWidth="3" strokeLinecap="round"/>
                    </g>
                    <g className="animate-bounce-candle origin-center">
                        <path d="M44 16V26" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                        <rect x="40" y="26" width="8" height="18" rx="1" fill="#10b981"/>
                        <path d="M44 44V52" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                    </g>
                </svg>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight animated-gradient-text animate-animated-gradient">
                    Grey Algo Chart Analyzer
                </h1>
            </header>
            
            <div className="bg-dark-card/60 backdrop-blur-lg p-8 rounded-2xl border border-green-500/20 shadow-2xl w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center text-green-400 mb-6 border-b-2 border-green-500/50 pb-4">Login</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-dark-text/80">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-dark-bg/80 border border-green-500/50 text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-500"
                            placeholder="name@company.com"
                            required
                            aria-label="Email Address"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block mb-2 text-sm font-medium text-dark-text/80">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-dark-bg/80 border border-green-500/50 text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-500"
                            placeholder="••••••••"
                            required
                            aria-label="Password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full text-white bg-green-600 hover:bg-green-500 focus:ring-4 focus:outline-none focus:ring-green-500/50 font-bold rounded-lg text-sm px-5 py-3 text-center transition-all duration-300 transform hover:scale-105"
                    >
                        Login
                    </button>
                </form>
                <p className="text-sm text-center text-dark-text/60 mt-6">
                    Don't have an account?{' '}
                    <button onClick={onNavigateToSignUp} className="font-medium text-green-400 hover:underline">
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};
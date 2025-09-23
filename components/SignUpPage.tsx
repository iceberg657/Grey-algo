import React, { useState } from 'react';

interface SignUpPageProps {
    onNavigateToLogin: () => void;
    // FIX: Add onSignUp prop to fix type error from App.tsx.
    onSignUp: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigateToLogin, onSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock signup: succeed if fields are not empty
        if (email && password) {
            // FIX: Call the onSignUp prop passed from App.tsx.
            onSignUp();
        } else {
            alert("Please fill in both email and password.");
        }
    };

    return (
        <div className="min-h-screen text-dark-text font-sans p-4 flex flex-col items-center justify-center animate-fade-in">
             <header className="text-center mb-8">
                <svg className="h-16 w-16 mx-auto mb-4" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <filter id="brilliantGlow" x="-100%" y="-100%" width="300%" height="300%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0" result="glow" />
                            <feComposite in="SourceGraphic" in2="glow" operator="over" />
                        </filter>
                        <linearGradient id="greenCandleFill" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#6ee7b7" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="darkGreenCandleFill" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                        <style>
                            {`
                                .sparkle {
                                    animation: sparkle-anim 2.5s ease-in-out infinite;
                                    transform-origin: center;
                                }
                                @keyframes sparkle-anim {
                                    0%, 100% { opacity: 0; transform: scale(0.5); }
                                    50% { opacity: 1; transform: scale(1.2); }
                                }
                            `}
                        </style>
                    </defs>

                    {/* Sparkles */}
                    <path d="M38 14 L40 10 L42 14 L46 16 L42 18 L40 22 L38 18 L34 16 Z" fill="#6ee7b7" className="sparkle" style={{ animationDelay: '0s' }} />
                    <path d="M18 50 L20 46 L22 50 L26 52 L22 54 L20 58 L18 54 L14 52 Z" fill="#a7f3d0" className="sparkle" style={{ animationDelay: '1.2s' }} />

                    <g className="animate-bounce-candle origin-center [animation-delay:-0.2s]" filter="url(#brilliantGlow)">
                        <path d="M20 12V20" stroke="#065f46" strokeWidth="3" strokeLinecap="round"/>
                        <rect x="16" y="20" width="8" height="18" rx="1" fill="url(#darkGreenCandleFill)"/>
                        <path d="M20 38V48" stroke="#065f46" strokeWidth="3" strokeLinecap="round"/>
                    </g>
                    <g className="animate-bounce-candle origin-center" filter="url(#brilliantGlow)">
                        <path d="M44 16V26" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                        <rect x="40" y="26" width="8" height="18" rx="1" fill="url(#greenCandleFill)"/>
                        <path d="M44 44V52" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                    </g>
                </svg>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight animated-gradient-text animate-animated-gradient">
                    Grey Algo Chart Analyzer
                </h1>
            </header>
            
            <div className="bg-dark-card/60 backdrop-blur-lg p-8 rounded-2xl border border-green-500/20 shadow-2xl w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center text-green-400 mb-6 border-b-2 border-green-500/50 pb-4">Create Account</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email-signup" className="block mb-2 text-sm font-medium text-dark-text/80">Email</label>
                        <input
                            type="email"
                            id="email-signup"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-dark-bg/80 border border-green-500/50 text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-500"
                            placeholder="name@company.com"
                            required
                            aria-label="Email Address"
                        />
                    </div>
                    <div>
                        <label htmlFor="password-signup" className="block mb-2 text-sm font-medium text-dark-text/80">Password</label>
                        <input
                            type="password"
                            id="password-signup"
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
                        Sign Up
                    </button>
                </form>
                <p className="text-sm text-center text-dark-text/60 mt-6">
                    Already have an account?{' '}
                    <button onClick={onNavigateToLogin} className="font-medium text-green-400 hover:underline">
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
};
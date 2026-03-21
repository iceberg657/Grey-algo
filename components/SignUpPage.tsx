
import React, { useState } from 'react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { NeuralBackground } from './NeuralBackground';
import { useAuth } from '../hooks/useAuth';

interface SignUpPageProps {
    onNavigateToLogin: () => void;
    onSignUp: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigateToLogin, onSignUp }) => {
    const { loginWithGoogle, signUpWithEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleGoogleSignUp = async () => {
        try {
            await loginWithGoogle();
            onSignUp();
        } catch (error) {
            console.error('Google sign up failed:', error);
            alert('Google sign up failed. Please try again.');
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }
        try {
            await signUpWithEmail(email, password);
            onSignUp();
        } catch (error: any) {
            console.error('Email sign up failed:', error);
            let errorMessage = 'Please check your details.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already in use. Please try another one.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'The email address is not valid.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/Password authentication is not enabled in the Firebase console.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'The password is too weak.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            alert(`Email sign up failed: ${errorMessage}`);
        }
    };

    return (
        <div className="min-h-screen text-slate-900 dark:text-dark-text font-sans flex flex-col items-center justify-center animate-fade-in relative">
             <NeuralBackground />
             <div className="absolute top-4 right-4">
                <ThemeToggleButton />
            </div>
            <div className="p-4 w-full flex flex-col items-center justify-center">
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
                        GreyAlpha
                    </h1>
                </header>
                
                <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl border border-gray-300 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] w-full max-w-sm">
                    <h2 className="text-2xl font-bold text-center text-green-600 dark:text-green-400 mb-6 border-b-2 border-green-500/50 pb-4 uppercase tracking-widest">Create Account</h2>
                    <form onSubmit={handleEmailSignUp} className="space-y-4 mb-6">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full p-2.5 rounded-lg bg-white/90 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-slate-900 dark:text-dark-text placeholder-slate-500"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full p-2.5 rounded-lg bg-white/90 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-slate-900 dark:text-dark-text placeholder-slate-500"
                            required
                        />
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg">
                            Sign up with Email
                        </button>
                    </form>
                    <div className="text-center text-sm text-slate-700 dark:text-dark-text/60 mb-4 font-bold uppercase tracking-widest">OR</div>
                    <button
                        onClick={handleGoogleSignUp}
                        className="w-full text-white bg-slate-700/80 hover:bg-slate-600/90 backdrop-blur-md border border-slate-500/50 focus:ring-4 focus:outline-none focus:ring-slate-500/50 font-bold rounded-lg text-sm px-5 py-3 text-center transition-all duration-300 transform hover:scale-105 shadow-[0_4px_16px_0_rgba(71,85,105,0.3)]"
                    >
                        Sign up with Google
                    </button>
                    <p className="text-sm text-center text-slate-800 dark:text-dark-text/60 mt-6 font-medium">
                        Already have an account?{' '}
                        <button onClick={onNavigateToLogin} className="font-bold text-green-600 dark:text-green-400 hover:underline">
                            Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

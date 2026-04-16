
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useTheme } from './contexts/ThemeContext';
import { NeuralBackground } from './NeuralBackground';
import { useAuth } from '../hooks/useAuth';

interface LoginPageProps {
    onNavigateToSignUp: () => void;
    onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToSignUp, onLogin }) => {
    const { loginWithGoogle, loginWithEmail, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [view, setView] = useState<'login' | 'forgot' | 'success'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [isFirebaseBlocked, setIsFirebaseBlocked] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const checkConnectivity = async () => {
            try {
                const { db } = await import('../firebase');
                const { getDoc, doc } = await import('firebase/firestore');
                await Promise.race([
                    getDoc(doc(db, 'admin_settings', 'system')),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);
                setIsFirebaseBlocked(false);
            } catch (e) {
                setIsFirebaseBlocked(true);
            }
        };
        checkConnectivity();
    }, []);

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            onLogin();
        } catch (error) {
            // Error is handled in AuthContext with a detailed alert
            console.error('Google login component error:', error);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await loginWithEmail(email, password);
            onLogin();
        } catch (error: any) {
            console.error('Email login failed:', error);
            let errorMessage = 'Please check your credentials.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'The email address is not valid.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This user account has been disabled.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed login attempts. Please try again later.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            setErrorMsg(`Email login failed: ${errorMessage}`);
            setTimeout(() => setErrorMsg(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setErrorMsg('Please enter your Gmail account address.');
            setTimeout(() => setErrorMsg(null), 3000);
            return;
        }
        setIsLoading(true);
        try {
            await resetPassword(email);
            setView('success');
        } catch (error: any) {
            console.error('Password reset failed:', error);
            setErrorMsg(`Failed to send reset email: ${error.message || 'Please try again later.'}`);
            setTimeout(() => setErrorMsg(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-slate-900 dark:text-dark-text font-sans flex flex-col items-center justify-center animate-fade-in relative">
            <NeuralBackground />
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggleButton />
            </div>
            <div className="p-4 w-full flex flex-col items-center justify-center z-10">
                {errorMsg && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold w-full max-w-md text-center"
                    >
                        {errorMsg}
                    </motion.div>
                )}
                {isFirebaseBlocked && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl backdrop-blur-xl text-center max-w-md w-full"
                    >
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                            ⚠️ Neural Link Blocked: VPN Required for Login
                        </p>
                        <p className="text-[9px] text-gray-400 mt-1">
                            Your current region is blocking Firebase. Please activate a VPN to proceed.
                        </p>
                    </motion.div>
                )}
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
                        </defs>

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
                
                <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl border border-gray-300 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] w-full max-w-sm transition-all duration-500">
                    {view === 'login' && (
                        <>
                            <h2 className="text-2xl font-bold text-center text-green-600 dark:text-green-400 mb-6 border-b-2 border-green-500/50 pb-4 uppercase tracking-widest">Login</h2>
                            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
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
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot')}
                                        className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline focus:outline-none"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg disabled:opacity-50"
                                >
                                    {isLoading ? 'Processing...' : 'Login with Email'}
                                </button>
                            </form>
                            <div className="text-center text-sm text-slate-700 dark:text-dark-text/60 mb-4 font-bold uppercase tracking-widest">OR</div>
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full text-white bg-slate-700/80 hover:bg-slate-600/90 backdrop-blur-md border border-slate-500/50 focus:ring-4 focus:outline-none focus:ring-slate-500/50 font-bold rounded-lg text-sm px-5 py-3 text-center transition-all duration-300 transform hover:scale-105 shadow-[0_4px_16px_0_rgba(71,85,105,0.3)]"
                            >
                                Sign in with Google
                            </button>
                            <p className="text-sm text-center text-slate-800 dark:text-dark-text/60 mt-6 font-medium">
                                Don't have an account?{' '}
                                <button onClick={onNavigateToSignUp} className="font-bold text-green-600 dark:text-green-400 hover:underline">
                                    Sign up
                                </button>
                            </p>
                        </>
                    )}

                    {view === 'forgot' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-bold text-center text-green-600 dark:text-green-400 mb-6 border-b-2 border-green-500/50 pb-4 uppercase tracking-widest">Reset Password</h2>
                            <p className="text-sm text-slate-600 dark:text-dark-text/70 mb-6 text-center">
                                Please input your Gmail account to receive a secure reset link.
                            </p>
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Gmail Account"
                                    className="w-full p-2.5 rounded-lg bg-white/90 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-slate-900 dark:text-dark-text placeholder-slate-500"
                                    required
                                />
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Reset Password'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setView('login')}
                                    className="w-full text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-dark-text/40 dark:hover:text-dark-text transition-colors"
                                >
                                    Back to Login
                                </button>
                            </form>
                        </div>
                    )}

                    {view === 'success' && (
                        <div className="text-center animate-fade-in">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4 uppercase tracking-widest">Link Sent!</h2>
                            <p className="text-sm text-slate-600 dark:text-dark-text/70 mb-6 leading-relaxed">
                                A password reset link has been sent to your email. 
                                <br /><br />
                                Look for the link labeled <span className="font-black text-green-600 dark:text-green-400">"click here"</span>.
                                <br /><br />
                                <span className="italic opacity-80">Note: The link has been moved to your direct inbox. If you don't see it, please wait a moment.</span>
                            </p>
                            <button 
                                onClick={() => setView('login')}
                                className="w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

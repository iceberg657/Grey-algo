import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: () => void;
    onNavigateToSignUp: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock login: succeed if fields are not empty
        if (email && password) {
            onLogin();
        } else {
            alert("Please fill in both email and password.");
        }
    };

    return (
        <div className="min-h-screen text-gray-200 font-sans p-4 flex flex-col items-center justify-center animate-fade-in">
             <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-red-500">
                    Grey Algo Chart Analyzer
                </h1>
            </header>
            
            <div className="bg-gray-900/40 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 shadow-2xl w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center text-gray-200 mb-6">Login</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                            placeholder="name@company.com"
                            required
                            aria-label="Email Address"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                            placeholder="••••••••"
                            required
                            aria-label="Password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full text-white bg-slate-700 hover:bg-slate-600 focus:ring-4 focus:outline-none focus:ring-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors duration-200 border border-slate-600"
                    >
                        Login
                    </button>
                </form>
                <p className="text-sm text-center text-gray-400 mt-6">
                    Don't have an account?{' '}
                    <button onClick={onNavigateToSignUp} className="font-medium text-green-400 hover:underline">
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

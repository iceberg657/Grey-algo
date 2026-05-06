import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export const TransitionLoader: React.FC = () => {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('glow-transition');

        // Cleanup function to remove the class when the component unmounts
        return () => {
            root.classList.remove('glow-transition');
        };
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center text-center p-4 z-[9999]"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            >
                <svg className="h-20 w-20 mx-auto mb-6" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
            </motion.div>
            <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-2xl font-bold text-white uppercase tracking-[0.2em] italic"
            >
                Wait while we redirect you...
            </motion.h2>
            <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="h-full w-1/3 bg-green-500"
                />
            </div>
        </motion.div>
    );
};

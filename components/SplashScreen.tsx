import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Wait for exit animation
        }, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100000] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
                >
                    {/* Liquid Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div 
                            animate={{ 
                                x: [0, 100, 0], 
                                y: [0, -50, 0],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-1/4 -left-1/4 w-full h-full bg-green-500/10 blur-[120px] rounded-full"
                        />
                        <motion.div 
                            animate={{ 
                                x: [0, -80, 0], 
                                y: [0, 100, 0],
                                scale: [1, 1.3, 1]
                            }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-blue-500/10 blur-[120px] rounded-full"
                        />
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="w-32 h-32 mb-8 relative"
                        >
                            {/* Glass Icon Container */}
                            <div className="absolute inset-0 liquid-glass rounded-3xl rotate-12 animate-liquid"></div>
                            <div className="absolute inset-0 liquid-glass rounded-3xl -rotate-6 animate-liquid [animation-delay:-2s]"></div>
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="64" height="64" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="alphaGradientSplash" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#6ee7b7"/>
                                            <stop offset="100%" stopColor="#10b981"/>
                                        </linearGradient>
                                    </defs>
                                    <g transform="translate(64, 64) scale(0.75)">
                                        <path d="M448 256C448 362.035 362.035 448 256 448C149.965 448 64 362.035 64 256C64 149.965 149.965 64 256 64C362.035 64 448 149.965 448 256Z" stroke="url(#alphaGradientSplash)" strokeWidth="24" strokeLinecap="round" opacity="0.2"/>
                                        <path d="M160 384C160 384 192 256 256 256C320 256 352 384 352 384" stroke="url(#alphaGradientSplash)" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M256 256C256 256 320 128 384 128C448 128 480 256 480 256" stroke="url(#alphaGradientSplash)" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                                        <circle cx="256" cy="256" r="40" fill="url(#alphaGradientSplash)"/>
                                    </g>
                                </svg>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="text-center"
                        >
                            <h1 className="text-4xl font-black uppercase tracking-[0.2em] italic text-white mb-2">
                                Grey<span className="text-green-500">Alpha</span>
                            </h1>
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-[1px] w-8 bg-green-500/50"></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-green-500/70">Neural Quant Engine</p>
                                <div className="h-[1px] w-8 bg-green-500/50"></div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Loading Bar */}
                    <div className="absolute bottom-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '0%' }}
                            transition={{ duration: 2.5, ease: "easeInOut" }}
                            className="h-full w-full bg-gradient-to-right from-green-500 to-blue-500"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

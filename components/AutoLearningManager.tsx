
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { canLearnMoreToday, performAutoLearning, incrementDailyCount, getDailyStats } from '../services/learningService';

export const AutoLearningManager: React.FC = () => {
    const [isLearning, setIsLearning] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    // Clean up on unmount
    useEffect(() => {
        mountedRef.current = true;
        scheduleNextRun();

        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (sessionRef.current) clearTimeout(sessionRef.current);
            // Ensure visual effects are removed if unmounting mid-session
            document.body.classList.remove('learning-mode');
        };
    }, []);

    const scheduleNextRun = useCallback(() => {
        if (!mountedRef.current) return;
        
        if (!canLearnMoreToday()) {
            console.log("Auto-ML: Daily limit reached. No more sessions scheduled for today.");
            return;
        }

        const stats = getDailyStats();
        
        // Calculate delay. 
        // If it's the first run of the day (count 0), schedule it sooner (1-10 mins) to ensure user sees it.
        // Otherwise, spread remaining sessions out. Assuming ~12 active hours, we want random intervals.
        // Random interval between 30 mins and 90 mins seems appropriate for 5-10x daily.
        let delayMs: number;
        
        if (stats.count === 0) {
             // First run of the day: Wait 1 to 5 minutes
             delayMs = (Math.random() * 4 + 1) * 60 * 1000;
        } else {
             // Subsequent runs: Wait 30 to 90 minutes
             delayMs = (Math.random() * 60 + 30) * 60 * 1000;
        }

        console.log(`Auto-ML: Next session scheduled in ${(delayMs / 60000).toFixed(1)} minutes.`);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            startLearningSession();
        }, delayMs);
    }, []);

    const startLearningSession = useCallback(async () => {
        if (!mountedRef.current) return;

        setIsLearning(true);
        document.body.classList.add('learning-mode');
        
        console.log("🚀 GreyQuant Auto-ML: Initiating 5-Minute Core Memory Upgrade...");

        // Perform the actual API call asynchronously
        try {
            const strategy = await performAutoLearning();
            if (strategy) {
                console.log("✅ Auto-ML: New Strategy Acquired:", strategy);
            }
        } catch (e) {
            console.error("Auto-ML Error:", e);
        }

        // The visual effect and state persist for exactly 5 minutes
        if (sessionRef.current) clearTimeout(sessionRef.current);
        sessionRef.current = setTimeout(() => {
            endLearningSession();
        }, 5 * 60 * 1000); // 5 minutes
    }, []);

    const endLearningSession = useCallback(() => {
        if (!mountedRef.current) return;

        setIsLearning(false);
        document.body.classList.remove('learning-mode');
        console.log("🛑 Auto-ML: Session Complete. Returning to normal state.");
        
        incrementDailyCount();
        scheduleNextRun();
    }, [scheduleNextRun]);

    if (!isLearning) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in w-full max-w-md px-4">
            <div className="bg-black/90 backdrop-blur-xl border-2 border-red-500 text-white px-6 py-4 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.6)] flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="relative flex h-4 w-4 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                    </div>
                    <div>
                         <h4 className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 animate-pulse">
                            AUTO-MACHINE LEARNING ACTIVE
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">Upgrading core trading logic...</p>
                    </div>
                </div>
                <div className="h-8 w-8 border-2 border-t-red-500 border-r-orange-500 border-b-yellow-500 border-l-transparent rounded-full animate-spin"></div>
            </div>
        </div>
    );
};

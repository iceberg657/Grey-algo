
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { canLearnMoreToday, performAutoLearning, incrementDailyCount, getDailyStats } from '../services/learningService';

export const AutoLearningManager: React.FC = () => {
    const [isLearning, setIsLearning] = useState(false);
    const [notification, setNotification] = useState<{ title: string; message: string; nextUpdate: string } | null>(null);
    
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    // Clean up on unmount
    useEffect(() => {
        mountedRef.current = true;
        scheduleNextRun();

        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (sessionRef.current) clearTimeout(sessionRef.current);
            if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
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
        // If it's the first run of the day (count 0), schedule it sooner (1-5 mins).
        // Otherwise, spread remaining sessions out. To fit 10-15 sessions, gaps need to be shorter.
        // Using random interval between 20 and 50 minutes.
        let delayMs: number;
        
        if (stats.count === 0) {
             // First run of the day: Wait 1 to 5 minutes
             delayMs = (Math.random() * 4 + 1) * 60 * 1000;
        } else {
             // Subsequent runs: Wait 20 to 50 minutes
             delayMs = (Math.random() * 30 + 20) * 60 * 1000;
        }

        console.log(`Auto-ML: Next session scheduled in ${(delayMs / 60000).toFixed(1)} minutes.`);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            startLearningSession();
        }, delayMs);
    }, []);

    const startLearningSession = useCallback(async () => {
        if (!mountedRef.current) return;

        // Set fixed duration to 2 minutes
        const durationMinutes = 2; 
        const durationMs = durationMinutes * 60 * 1000;

        // Calculate Next Update Time for display
        const stats = getDailyStats();
        let nextUpdateTimeString = "Tomorrow";
        
        // Check if we can run again after this session (count + 1)
        if (stats.count + 1 < stats.maxForDay) {
             // Next session delay (20-50 mins) + current session duration
             const nextDelayMinutes = Math.random() * 30 + 20;
             const totalDelayMs = durationMs + (nextDelayMinutes * 60 * 1000);
             const nextDate = new Date(Date.now() + totalDelayMs);
             nextUpdateTimeString = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        setIsLearning(true);
        document.body.classList.add('learning-mode');
        
        console.log(`🚀 GreyAlpha Auto-ML: Initiating ${durationMinutes.toFixed(1)}-Minute Core Memory Upgrade...`);

        // Perform the actual API call asynchronously
        try {
            const strategy = await performAutoLearning();
            if (strategy && mountedRef.current) {
                console.log("✅ Auto-ML: New Strategy Acquired:", strategy);
                
                // Show notification
                setNotification({
                    title: "Core Memory Upgraded",
                    message: strategy,
                    nextUpdate: nextUpdateTimeString
                });

                // Auto dismiss notification after 60 seconds (1 minute)
                if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
                notifTimeoutRef.current = setTimeout(() => {
                    if (mountedRef.current) setNotification(null);
                }, 60000);
            }
        } catch (e) {
            console.error("Auto-ML Error:", e);
        }

        // The visual effect and state persist for the duration
        if (sessionRef.current) clearTimeout(sessionRef.current);
        sessionRef.current = setTimeout(() => {
            endLearningSession();
        }, durationMs);
    }, []);

    const endLearningSession = useCallback(() => {
        if (!mountedRef.current) return;

        setIsLearning(false);
        document.body.classList.remove('learning-mode');
        console.log("🛑 Auto-ML: Session Complete. Returning to normal state.");
        
        incrementDailyCount();
        scheduleNextRun();
    }, [scheduleNextRun]);

    const closeNotification = () => {
        setNotification(null);
        if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };

    if (!isLearning && !notification) return null;

    return (
        <>
            {/* Active Learning Banner */}
            {isLearning && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in w-full max-w-md px-4 pointer-events-none">
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
                                <p className="text-xs text-gray-400 mt-0.5">Upgrading core pattern recognition...</p>
                            </div>
                        </div>
                        <div className="h-8 w-8 border-2 border-t-red-500 border-r-orange-500 border-b-yellow-500 border-l-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            )}

            {/* Strategy Learned Notification */}
            {notification && (
                <div className="fixed bottom-6 right-6 z-[10000] animate-fade-in max-w-sm w-full px-4 sm:px-0">
                    <div className="bg-gray-900/95 backdrop-blur-md border-l-4 border-green-500 text-white p-4 rounded-r-lg shadow-2xl flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-green-400 mb-1">{notification.title}</h4>
                            <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-2">{notification.message}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-1 border-t border-gray-700 pt-1">
                                Next Update: <span className="text-green-300 font-bold">{notification.nextUpdate}</span>
                            </p>
                        </div>
                        <button 
                            onClick={closeNotification}
                            className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
                            aria-label="Close notification"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

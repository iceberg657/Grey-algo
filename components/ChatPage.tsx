
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Send, 
    Image as ImageIcon, 
    Plus, 
    ArrowLeft, 
    LogOut, 
    Eye, 
    Volume2, 
    Square, 
    Sparkles, 
    RefreshCcw,
    AlertCircle,
    User,
    Terminal
} from 'lucide-react';
import type { ChatMessage, ImagePart } from '../types';
import { getChatInstance, sendMessageStreamWithRetry, getCurrentModelName } from '../services/chatService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { OraclePage } from './OraclePage';
import { generateAndPlayAudio, stopAudio } from '../services/ttsService';
import { NeuralBackground } from './NeuralBackground';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { UserMetadata, UserSettings } from '../types';

const fileToImagePart = (file: File): Promise<ImagePart> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const data = result.split(',')[1];
            if (!data) {
                reject(new Error("Invalid file format."));
                return;
            }
            resolve({ data, mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });

// A slightly better markdown to HTML converter
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const formatText = (inputText: string) => {
        let html = inputText
            .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono text-xs">$1</code>') // Inline code
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') // Bold
            .replace(/\n/g, '<br />'); // New lines

        // Unordered lists
        if (html.includes('* ')) {
             html = html.replace(/^\* (.*$)/gm, '<li class="ml-5 list-disc mb-1">$1</li>');
             html = `<ul class="my-2">${html}</ul>`.replace(/<\/li><br \/><ul>/g, '</li><ul>').replace(/<\/ul><br \/><li>/g,'</ul><li>');
        }
        return { __html: html };
    };

    return <div className="break-words leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={formatText(text)} />;
};

const detectSignalFromText = (text: string): 'BUY' | 'SELL' | null => {
    if (!text) return null;
    
    // Normalize text: uppercase and strip out markdown asterisks / underscores to make it formatting-independent
    const textUpper = text.toUpperCase().replace(/\*/g, '').replace(/_/g, '');
    
    // Explicit exact phrases first (highest priority)
    const matchesBuy = [
        'BIAS IS STRICTLY BUY',
        'OPERATIONAL BIAS: BUY',
        'OPERATIONAL BIAS BUY',
        'DIRECTION: BUY',
        'RECOMMENDATION: BUY',
        'ORDER: BUY',
        'SIGNAL: BUY',
        'TRADE IDEA: BUY',
        'ALERT: BUY',
        'BUY RESPONSE',
        'BUY SETUP',
        'BUY SIGNAL'
    ];

    const matchesSell = [
        'BIAS IS STRICTLY SELL',
        'OPERATIONAL BIAS: SELL',
        'OPERATIONAL BIAS SELL',
        'DIRECTION: SELL',
        'RECOMMENDATION: SELL',
        'ORDER: SELL',
        'SIGNAL: SELL',
        'TRADE IDEA: SELL',
        'ALERT: SELL',
        'SELL RESPONSE',
        'SELL SETUP',
        'SELL SIGNAL'
    ];

    for (const match of matchesBuy) {
        if (textUpper.includes(match)) return 'BUY';
    }
    for (const match of matchesSell) {
        if (textUpper.includes(match)) return 'SELL';
    }

    // Secondary indicators when the bias/strictly keyword is used with a side
    if (textUpper.includes('STRICTLY SELL') || textUpper.includes('MUST SELL') || textUpper.includes('BIAS: SELL') || textUpper.includes('BIAS IS SELL')) {
        return 'SELL';
    }
    if (textUpper.includes('STRICTLY BUY') || textUpper.includes('MUST BUY') || textUpper.includes('BIAS: BUY') || textUpper.includes('BIAS IS BUY')) {
        return 'BUY';
    }

    // Checking check-list indicators or specific trading targets (limit/stop instructions)
    const hasBuyWords = textUpper.includes('BUY LIMIT') || textUpper.includes('BUY STOP') || textUpper.includes('BULLISH ENGULFING') || textUpper.includes('GO LONG') || textUpper.includes('LONG SETUP');
    const hasSellWords = textUpper.includes('SELL LIMIT') || textUpper.includes('SELL STOP') || textUpper.includes('BEARISH ENGULFING') || textUpper.includes('GO SHORT') || textUpper.includes('SHORT SETUP');

    if (hasBuyWords && !hasSellWords) return 'BUY';
    if (hasSellWords && !hasBuyWords) return 'SELL';

    // Last resort: ONLY if one keyword is present in the entire message
    const hasBuyKeyword = textUpper.includes('BUY');
    const hasSellKeyword = textUpper.includes('SELL');
    if (hasBuyKeyword && !hasSellKeyword) return 'BUY';
    if (hasSellKeyword && !hasBuyKeyword) return 'SELL';

    return null;
};

const ChatBubble: React.FC<{
    message: ChatMessage;
    isBusy: boolean;
    onToggleSpeech: (message: ChatMessage) => void;
}> = ({ message, isBusy, onToggleSpeech }) => {
    const isUser = message.role === 'user';
    const signalType = !isUser ? detectSignalFromText(message.text) : null;
    const isBuy = signalType === 'BUY';
    const isSell = signalType === 'SELL';

    // Bubble styles
    let bubbleClass = '';
    let avatarClass = '';
    
    if (isUser) {
        bubbleClass = 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none shadow-lg shadow-blue-500/10 border border-blue-400/20';
        avatarClass = 'bg-blue-600 border-blue-500/50 text-white mt-1';
    } else if (isBuy) {
        bubbleClass = 'bg-white dark:bg-slate-900/80 text-gray-800 dark:text-slate-200 rounded-tl-none shadow-md border-y border-r border-gray-100 dark:border-white/5 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 backdrop-blur-md bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]';
        avatarClass = 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mt-1 animate-pulse';
    } else if (isSell) {
        bubbleClass = 'bg-white dark:bg-slate-900/80 text-gray-800 dark:text-slate-200 rounded-tl-none shadow-md border-y border-r border-gray-100 dark:border-white/5 border-l-4 border-l-rose-500 dark:border-l-rose-400 backdrop-blur-md bg-rose-500/[0.02] dark:bg-rose-500/[0.04]';
        avatarClass = 'bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400 mt-1 animate-pulse';
    } else {
        bubbleClass = 'bg-white dark:bg-slate-900/60 text-gray-800 dark:text-slate-200 rounded-tl-none shadow-sm border border-gray-100 dark:border-white/5 backdrop-blur-md';
        avatarClass = 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-1';
    }
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} w-full group mb-4`}
        >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-all duration-300 ${avatarClass}`}>
                {isUser ? <User size={16} /> : <Eye size={16} />}
            </div>
 
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] lg:max-w-[75%]`}>
                <div className={`relative px-4 py-3 rounded-2xl text-sm transition-all duration-300 ${bubbleClass}`}>
                    {isBuy && (
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-emerald-500/10 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            Neural Buy Signal Calibrated
                        </div>
                    )}
                    {isSell && (
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-rose-500/10 text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 font-mono">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            Neural Sell Signal Calibrated
                        </div>
                    )}
                    {message.images && message.images.length > 0 && (
                        <div className={`grid gap-2 mb-3 ${message.images.length === 3 ? 'grid-cols-3' : message.images.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {message.images.map((imgSrc, index) => (
                                <motion.img 
                                    whileHover={{ scale: 1.02 }}
                                    key={index}
                                    src={imgSrc} 
                                    alt={`Upload ${index + 1}`} 
                                    className="rounded-xl max-w-full h-auto object-cover border border-white/20"
                                    style={{ maxHeight: '240px' }}
                                />
                            ))}
                        </div>
                    )}
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <SimpleMarkdown text={message.text} />
                    </div>

                    {!isUser && (
                        <button
                            onClick={() => onToggleSpeech(message)}
                            className="absolute -right-3 -bottom-3 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 shadow-xl border border-gray-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 scale-90 hover:scale-100"
                            aria-label={isBusy ? "Stop reading" : "Read aloud"}
                        >
                            {isBusy ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                        </button>
                    )}
                </div>
                
                {message.timestamp && (
                    <span className="text-[10px] mt-1 text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase px-2">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </motion.div>
    );
};

const TypingIndicator: React.FC = () => {
    const [showThinking, setShowThinking] = useState(false);
    const [thoughtIndex, setThoughtIndex] = useState(0);

    const thoughts = [
        "Connecting to Neural Network...",
        "Analyzing market context...",
        "Checking historical patterns...",
        "Synthesizing strategy...",
        "Verifying risk constraints...",
        "Finalizing response..."
    ];

    useEffect(() => {
        const timer = setTimeout(() => setShowThinking(true), 4000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!showThinking) return;
        const interval = setInterval(() => {
            setThoughtIndex((prev) => (prev + 1) % thoughts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [showThinking, thoughts.length]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 w-full mb-4"
        >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse mt-1">
                <Eye size={16} />
            </div>
            
            <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-md px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-white/5 shadow-sm min-w-[120px]">
                {!showThinking ? (
                    <div className="flex items-center space-x-1.5 h-5">
                        {[0, 0.15, 0.3].map((delay) => (
                            <motion.div 
                                key={delay}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay }}
                                className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                            className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                        />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">
                            {thoughts[thoughtIndex]}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

interface ChatPageProps {
    onBack: () => void;
    onLogout: () => void;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    onNewChat: () => void;
    initialInput?: string | null;
    onClearInitialInput?: () => void;
    isLocked?: boolean;
    userMetadata?: UserMetadata | null;
}

const OracleLogo: React.FC = () => (
    <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative w-24 h-24 mb-6 flex items-center justify-center"
    >
        <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center bg-white/10 dark:bg-slate-800/20 border border-white/20 dark:border-slate-700/30 shadow-2xl backdrop-blur-xl rotate-12 group hover:rotate-0 transition-transform duration-500">
             <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
             >
                <Eye size={40} strokeWidth={1} className="text-emerald-500" />
             </motion.div>
        </div>
    </motion.div>
);

const SUGGESTED_PROMPTS = [
    "Analyze the current trend of XAU/USD",
    "What key economic events are today?",
    "Give me a scalping strategy for GBP/JPY",
    "Summarize the latest forex news"
];

const getModelSymbol = (modelName: string) => {
    if (modelName.includes('3.5')) return 'Α';
    if (modelName.includes('2.5-pro')) return 'Α'; 
    if (modelName.includes('2.5-flash')) return 'Β'; 
    if (modelName.includes('2.0-flash')) return 'Γ'; 
    if (modelName.includes('lite')) return 'Λ';   
    if (modelName.includes('3-pro')) return 'Ω';   
    if (modelName.includes('3-flash')) return 'Δ'; 
    return 'Σ'; 
};

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onLogout, messages, setMessages, onNewChat, initialInput, onClearInitialInput, isLocked, userMetadata }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [waitingMessageId, setWaitingMessageId] = useState<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentModelName, setCurrentModelName] = useState<string>('');
    const [retrySeconds, setRetrySeconds] = useState<number>(0);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | undefined>(undefined);
    const [showOracle, setShowOracle] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('greyquant_user_settings');
        if (stored) {
            try {
                setUserSettings(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user settings", e);
            }
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await getChatInstance(); 
            setCurrentModelName(getCurrentModelName());
        };
        init();
        return () => {
            stopAudio();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading, retrySeconds]);
    
    const handleToggleSpeech = useCallback(async (message: ChatMessage) => {
        if (speakingMessageId === message.id) {
            stopAudio();
            setSpeakingMessageId(null);
            return;
        }
        if (waitingMessageId === message.id) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setWaitingMessageId(null);
            return;
        }
        stopAudio();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSpeakingMessageId(null);
        setWaitingMessageId(null);

        const textToSpeak = message.text
            .replace(/\*\*(.*?)\*\*/g, '$1') 
            .replace(/(\* )/g, '') 
            .replace(/⚠️/g, '') 
            .trim()
            .replace(/\s+/g, ' ');

        setWaitingMessageId(message.id);
        timeoutRef.current = setTimeout(async () => {
            try {
                setWaitingMessageId(null);
                setSpeakingMessageId(message.id);
                await generateAndPlayAudio(textToSpeak, () => setSpeakingMessageId(null));
            } catch (error) {
                setSpeakingMessageId(null);
                setWaitingMessageId(null);
            }
        }, 5000);
    }, [speakingMessageId, waitingMessageId]);

    const handleRemoveImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            // Fix: Explicitly cast Array.from(files) to File[] to avoid 'unknown' type errors for f.type, f.name, f.size, and URL.createObjectURL(f)
            const newFiles = (Array.from(files) as File[]).filter(f => f.type.startsWith('image/'));
            
            if (imageFiles.length + newFiles.length > 3) {
                setUploadError("You can only upload up to 3 images.");
                setTimeout(() => setUploadError(null), 3000);
                return;
            }

            if (newFiles.length > 0) {
                const uniqueNewFiles = newFiles.filter(f => !imageFiles.some(existing => existing.name === f.name && existing.size === f.size));
                setImageFiles(prev => [...prev, ...uniqueNewFiles]);
                const newPreviews = uniqueNewFiles.map(f => URL.createObjectURL(f));
                setImagePreviews(prev => [...prev, ...newPreviews]);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) files.push(file);
            }
        }

        if (files.length > 0) {
            if (imageFiles.length + files.length > 3) {
                setUploadError("You can only upload up to 3 images.");
                setTimeout(() => setUploadError(null), 3000);
                return;
            }
            setImageFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(f => URL.createObjectURL(f));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const startCountdown = useCallback((delayMs: number) => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        let seconds = Math.ceil(delayMs / 1000);
        setRetrySeconds(seconds);
        countdownIntervalRef.current = setInterval(() => {
            setRetrySeconds(prev => {
                if (prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const executeSendMessage = useCallback(async (text: string, files: File[], previews: string[]) => {
         if ((!text.trim() && files.length === 0) || isLoading || retrySeconds > 0) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: text,
            images: previews,
            timestamp: Date.now()
        };
        
        if (userMetadata?.uid) {
            const path = `users/${userMetadata.uid}/chat_messages/${userMessage.id}`;
            try {
                const msgRef = doc(db, 'users', userMetadata.uid, 'chat_messages', userMessage.id);
                await setDoc(msgRef, userMessage);
            } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, path);
            }
        } else {
            setMessages(prev => [...prev, userMessage]);
        }
        
        setIsLoading(true);
        setError(null);
        setRetrySeconds(0);

        try {
            const messageParts: (({ text: string } | { inlineData: { data: string, mimeType: string } }))[] = [];
            if (files.length > 0) {
                const imageParts = await Promise.all(files.map(f => fileToImagePart(f)));
                imageParts.forEach(p => messageParts.push({ inlineData: { data: p.data, mimeType: p.mimeType } }));
            }
            
            // Check for potential asset symbol in text and if we have a TwelveData key
            let extraContext = '';

            messageParts.push({ text: text + extraContext });

            // Minimum 8s "thinking" time for thorough neural mapping
            await new Promise(resolve => setTimeout(resolve, 8000));

            const result = await sendMessageStreamWithRetry(messageParts, startCountdown);
            setCurrentModelName(getCurrentModelName());
            setRetrySeconds(0); 
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

            let responseText = '';
            const streamMessageId = `model-stream-${Date.now()}`;
            setMessages(prev => [...prev, { id: streamMessageId, role: 'model', text: '' }]);

            for await (const chunk of result) {
                responseText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const msgIndex = newMessages.findIndex(m => m.id === streamMessageId);
                    if (msgIndex !== -1) {
                         newMessages[msgIndex] = { ...newMessages[msgIndex], text: responseText };
                    }
                    return newMessages;
                });
            }

            // Save final model message to Firestore
            if (userMetadata?.uid) {
                const finalModelMessage: ChatMessage = {
                    id: streamMessageId,
                    role: 'model',
                    text: responseText,
                    timestamp: Date.now()
                };
                const path = `users/${userMetadata.uid}/chat_messages/${streamMessageId}`;
                try {
                    const msgRef = doc(db, 'users', userMetadata.uid, 'chat_messages', streamMessageId);
                    await setDoc(msgRef, finalModelMessage);
                } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, path);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMessage.includes("All Neural Lanes") || errorMessage.includes("congested")) {
                setError("System Cooldown Active: All neural lanes are currently congested. Please wait.");
                startCountdown(60000); 
            } else {
                setError(`Oracle Error: ${errorMessage}`);
            }
            const errorId = `model-error-${Date.now()}`;
            setMessages(prev => [...prev, { id: errorId, role: 'model', text: `Connection interrupted. \n\nDetails: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, setMessages, startCountdown, retrySeconds]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentText = input;
        const currentFiles = imageFiles;
        const currentPreviews = imagePreviews;
        setInput('');
        setImageFiles([]);
        setImagePreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await executeSendMessage(currentText, currentFiles, currentPreviews);
    };

    const handleSuggestionClick = async (suggestion: string) => {
        setInput('');
        await executeSendMessage(suggestion, [], []);
    };

    useEffect(() => {
        if (initialInput) {
            executeSendMessage(initialInput, [], []);
            if (onClearInitialInput) onClearInitialInput();
        }
    }, [initialInput, executeSendMessage, onClearInitialInput]);
    
    return (
        <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans flex flex-col relative overflow-hidden">
            <NeuralBackground />
            
            {/* Ambient Background Auras */}
            <div className="live-broadcast-aura top-[-100px] left-[-50px] opacity-70" />
            <div className="live-broadcast-aura bottom-[100px] right-[-100px] opacity-40" />
            
            <AnimatePresence>
                {isLocked && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 text-center"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-slate-900 border border-white/5 p-10 rounded-[32px] max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/10"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight mb-3">Neural Link Offline</h2>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                The Oracle is currently dormant. Access is restricted until the next synchronization cycle.
                            </p>
                            <button 
                                onClick={onBack}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-lg"
                            >
                                Return to Base
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex-shrink-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-b border-white/10 dark:border-slate-900/50 z-10">
                <div className="w-full max-w-5xl mx-auto px-4 py-3 flex justify-between items-center h-16">
                    <button onClick={onBack} className="group flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all">
                        <div className="p-2 mr-2 rounded-xl border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900/50 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="hidden sm:inline">Portal</span>
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-emerald-500 animate-pulse" />
                            <h1 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Oracle AI</h1>
                        </div>
                        {currentModelName && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-mono font-medium text-emerald-600/80 dark:text-emerald-400/80 uppercase">
                                    {currentModelName.split('/').pop()?.split('-')[0] || 'Neural'} {getModelSymbol(currentModelName)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3">
                        <button onClick={() => setShowOracle(true)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all" title="System Insight">
                             <Terminal size={20} />
                        </button>
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all" aria-label="Disconnect">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main ref={chatContainerRef} className="flex-grow overflow-y-auto scrollbar-hide relative z-0">
                <div className="w-full max-w-5xl mx-auto px-4 pt-10 pb-32">
                    {messages.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center text-center py-20">
                            <OracleLogo />
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
                            >
                                Seeking <span className="text-emerald-500">Clarity</span>?
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-500 dark:text-slate-400 mt-4 max-w-sm leading-relaxed"
                            >
                                Ask the Oracle for real-time market analysis, strategy synthesis, or trend forecasting.
                            </motion.p>
                            
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-12"
                            >
                                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestionClick(prompt)}
                                        className="text-xs font-semibold text-left p-4 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 backdrop-blur-md hover:bg-white dark:hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all group flex items-center justify-between"
                                    >
                                        <span className="text-slate-600 dark:text-slate-300">{prompt}</span>
                                        <Plus size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                ))}
                            </motion.div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             {messages.map((msg) => (
                                <ChatBubble 
                                    key={msg.id} 
                                    message={msg}
                                    isBusy={speakingMessageId === msg.id || waitingMessageId === msg.id}
                                    onToggleSpeech={handleToggleSpeech}
                                />
                            ))}
                            {isLoading && <TypingIndicator />}
                            
                            <AnimatePresence>
                                {retrySeconds > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex justify-center my-6"
                                    >
                                        <div className={`px-6 py-3 rounded-2xl text-xs font-bold tracking-widest uppercase flex items-center gap-3 shadow-2xl border ${
                                            isLoading 
                                            ? 'bg-yellow-500 text-black border-yellow-400' 
                                            : 'bg-red-500 text-white border-red-400'
                                        }`}>
                                            <RefreshCcw size={14} className="animate-spin" />
                                            {isLoading ? `Rate limit active: ${retrySeconds}s` : `System Cooldown: ${retrySeconds}s`}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {error && !retrySeconds && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mx-auto max-w-md p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-medium"
                                >
                                    <AlertCircle size={18} />
                                    {error}
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <footer className="absolute bottom-6 inset-x-0 z-20 pointer-events-none">
                <div className="w-full max-w-3xl mx-auto px-4 flex flex-col items-center gap-4">
                    <AnimatePresence>
                        {imagePreviews.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="w-full pointer-events-auto p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl flex gap-3 overflow-x-auto"
                            >
                                {imagePreviews.map((preview, index) => (
                                    <div key={preview} className="relative flex-shrink-0">
                                        <img src={preview} alt="Preview" className="h-20 w-20 object-cover rounded-2xl border border-white/10" />
                                        <button 
                                            onClick={() => handleRemoveImage(index)} 
                                            className="absolute -top-2 -right-2 bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs border border-white/20 hover:bg-red-500 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-20 w-20 flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all"
                                >
                                    <Plus size={24} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="w-full pointer-events-auto relative group">
                        <form 
                            onSubmit={handleSendMessage} 
                            className={`relative flex items-center premium-glass-card rounded-[28px] border border-slate-200 dark:border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.1)] focus-within:border-emerald-500/50 focus-within:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500 p-1.5 ${retrySeconds > 0 ? 'opacity-50 grayscale' : ''}`}
                        >
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                            
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={isLoading || retrySeconds > 0} 
                                className="p-3 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all flex-shrink-0"
                            >
                                <ImageIcon size={22} />
                            </button>
                            
                            <input 
                                type="text" 
                                value={input} 
                                onPaste={handlePaste} 
                                onChange={(e) => setInput(e.target.value)} 
                                placeholder={retrySeconds > 0 ? `System Recovery (${retrySeconds}s)...` : "Consult the Oracle..."} 
                                disabled={isLoading || retrySeconds > 0} 
                                className="flex-grow min-w-0 bg-transparent text-slate-900 dark:text-white px-2 py-3 text-sm focus:outline-none placeholder-slate-400 dark:placeholder-slate-600" 
                            />
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {input.trim() === '' && imageFiles.length === 0 && !isLoading && (
                                     <button onClick={onNewChat} type="button" className="p-3 text-slate-400 hover:text-blue-500 transition-all flex-shrink-0" title="New Link">
                                        <RefreshCcw size={20} />
                                    </button>
                                )}
                                
                                <button 
                                    type="submit" 
                                    disabled={isLoading || retrySeconds > 0 || (!input.trim() && imageFiles.length === 0)} 
                                    className={`relative flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300 flex-shrink-0 ${
                                        isLoading 
                                        ? 'bg-slate-100 dark:bg-white/5' 
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                                    }`}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                    ) : (
                                        <Send size={18} className="ml-0.5" />
                                    )}
                                </button>
                            </div>
                        </form>
                        
                        {uploadError && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xl whitespace-nowrap"
                            >
                                {uploadError}
                            </motion.div>
                        )}
                    </div>
                </div>
            </footer>

            <AnimatePresence>
                {showOracle && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-slate-950"
                    >
                        <OraclePage onBack={() => setShowOracle(false)} isHidden={false} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

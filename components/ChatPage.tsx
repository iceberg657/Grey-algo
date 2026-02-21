
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ImagePart } from '../types';
import { getChatInstance, sendMessageStreamWithRetry, getCurrentModelName } from '../services/chatService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { generateAndPlayAudio, stopAudio } from '../services/ttsService';
import { NeuralBackground } from './NeuralBackground';

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

// A simple markdown to HTML converter for bold and lists
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const formatText = (inputText: string) => {
        let html = inputText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n/g, '<br />'); // New lines

        // Unordered lists
        if (html.includes('* ')) {
             html = html.replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
             html = `<ul>${html}</ul>`.replace(/<\/li><br \/><ul>/g, '</li><ul>').replace(/<\/ul><br \/><li>/g,'</ul><li>');
        }
        return { __html: html };
    };

    return <div className="break-words" dangerouslySetInnerHTML={formatText(text)} />;
};

const ChatBubble: React.FC<{
    message: ChatMessage;
    isBusy: boolean;
    onToggleSpeech: (message: ChatMessage) => void;
}> = ({ message, isBusy, onToggleSpeech }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
            {!isUser && (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 dark:text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
            )}
            <div className={`relative group max-w-[85%] lg:max-w-lg p-3 rounded-2xl text-sm shadow-sm ${isUser ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 dark:bg-dark-bg/60 dark:text-dark-text/90 rounded-bl-none'}`}>
                 {message.images && message.images.length > 0 && (
                    <div className={`grid gap-2 mb-2 ${message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {message.images.map((imgSrc, index) => (
                             <img 
                                key={index}
                                src={imgSrc} 
                                alt={`User upload ${index + 1}`} 
                                className="rounded-lg max-w-full h-auto object-cover"
                                style={{ maxHeight: '200px' }}
                            />
                        ))}
                    </div>
                 )}
                 <SimpleMarkdown text={message.text} />
                  {!isUser && (
                     <button
                        onClick={() => onToggleSpeech(message)}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-gray-300/90 dark:bg-dark-card/90 text-green-600 dark:text-green-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shadow-sm z-10"
                        aria-label={isBusy ? "Stop reading message" : "Read message aloud"}
                    >
                        {isBusy ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4.022 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356zM5.394 9.122a.5.5 0 00-.638.45l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.302-.262zM7.17 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208zM15.978 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356z" clipRule="evenodd" /><path d="M11 12.333a1.5 1.5 0 01-3 0V7.5a1.5 1.5 0 013 0v4.833z" /></svg>
                        )}
                    </button>
                 )}
            </div>
        </div>
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
        const timer = setTimeout(() => {
            setShowThinking(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!showThinking) return;
        const interval = setInterval(() => {
            setThoughtIndex((prev) => (prev + 1) % thoughts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [showThinking, thoughts.length]);

    return (
        <div className="flex items-end gap-2 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 dark:text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </div>
            <div className="max-w-md lg:max-w-lg p-3 rounded-2xl bg-gray-200 dark:bg-dark-bg/60 text-gray-800 dark:text-dark-text/90 rounded-bl-none">
                {!showThinking ? (
                    <div className="flex items-center space-x-1 h-5 px-1">
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-1 animate-fade-in">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-xs sm:text-sm font-medium italic text-gray-500 dark:text-gray-400 animate-pulse">
                            {thoughts[thoughtIndex]}
                        </span>
                    </div>
                )}
            </div>
        </div>
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
}

const OracleLogo: React.FC = () => (
    <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
        <div className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-800/90 border-2 border-gray-200 dark:border-slate-700 shadow-2xl backdrop-blur-sm">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                    <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2dd4bf" />
                        <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                </defs>
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="url(#eyeGradient)"/>
                <circle cx="12" cy="12" r="3" stroke="url(#eyeGradient)"/>
            </svg>
        </div>
    </div>
);

const SUGGESTED_PROMPTS = [
    "Analyze the current trend of XAU/USD",
    "What key economic events are today?",
    "Give me a scalping strategy for GBP/JPY",
    "Summarize the latest forex news"
];

const getModelSymbol = (modelName: string) => {
    if (modelName.includes('2.5-pro')) return 'Α'; 
    if (modelName.includes('2.5-flash')) return 'Β'; 
    if (modelName.includes('2.0-flash')) return 'Γ'; 
    if (modelName.includes('lite')) return 'Λ';   
    if (modelName.includes('3-pro')) return 'Ω';   
    if (modelName.includes('3-flash')) return 'Δ'; 
    return 'Σ'; 
};

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onLogout, messages, setMessages, onNewChat, initialInput, onClearInitialInput }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            if (newFiles.length > 0) {
                const uniqueNewFiles = newFiles.filter(f => !imageFiles.some(existing => existing.name === f.name && existing.size === f.size));
                setImageFiles(prev => [...prev, ...uniqueNewFiles]);
                const newPreviews = uniqueNewFiles.map(f => URL.createObjectURL(f));
                setImagePreviews(prev => [...prev, ...newPreviews]);
            }
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
        };
        setMessages(prev => [...prev, userMessage]);
        
        setIsLoading(true);
        setError(null);
        setRetrySeconds(0);

        try {
            const messageParts: (({ text: string } | { inlineData: { data: string, mimeType: string } }))[] = [];
            if (files.length > 0) {
                const imageParts = await Promise.all(files.map(f => fileToImagePart(f)));
                imageParts.forEach(p => messageParts.push({ inlineData: { data: p.data, mimeType: p.mimeType } }));
            }
            messageParts.push({ text: text });

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
        <div className="h-[100dvh] bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-dark-text font-sans flex flex-col relative overflow-hidden">
            <NeuralBackground />
            <header className="flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 z-10">
                <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <div className="flex flex-col items-center mx-2">
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-200 truncate">Oracle AI</h1>
                        {currentModelName && (
                            <span className="text-xl md:text-2xl font-bold ml-1 cursor-help font-mono text-green-600 dark:text-green-400" title={`Active Model: ${currentModelName}`}>
                                {getModelSymbol(currentModelName)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs sm:text-sm font-medium p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Logout">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main ref={chatContainerRef} className="flex-grow overflow-y-auto overflow-x-hidden scroll-smooth relative z-0">
                <div className="w-full max-w-7xl mx-auto px-4 sm:p-6 h-full">
                    {messages.length === 0 && !isLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center h-full pb-20">
                            <OracleLogo />
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Hi, I'm Oracle AI</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 px-4 mb-8">Analyze markets, predict trends, and get trading insights.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestionClick(prompt)}
                                        className="text-sm text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm text-gray-700 dark:text-gray-300"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 pt-4 pb-4">
                             {messages.map((msg) => (
                                <ChatBubble 
                                    key={msg.id} 
                                    message={msg}
                                    isBusy={speakingMessageId === msg.id || waitingMessageId === msg.id}
                                    onToggleSpeech={handleToggleSpeech}
                                />
                            ))}
                            {isLoading && <TypingIndicator />}
                            {retrySeconds > 0 && (
                                <div className="flex justify-center w-full animate-fade-in my-2">
                                    <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-lg border ${isLoading ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'}`}>
                                        {isLoading ? `Rate limit reached. Retrying in ${retrySeconds}s...` : `System Cooldown: Restoring Neural Link in ${retrySeconds}s`}
                                    </div>
                                </div>
                            )}
                            {error && !retrySeconds && <p className="text-red-400 text-sm text-center p-2 bg-red-500/10 rounded-lg mx-4">{error}</p>}
                        </div>
                    )}
                </div>
            </main>

            <footer className="flex-shrink-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-t border-gray-200 dark:border-slate-800 z-10 pb-[env(safe-area-inset-bottom)]">
                <div className="w-full max-w-7xl mx-auto px-3 py-2 sm:p-4">
                    {imagePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-slate-800/60 rounded-lg mb-2 mx-1">
                            {imagePreviews.map((preview, index) => (
                                <div key={preview} className="relative group">
                                    <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded border border-gray-300 dark:border-slate-600" />
                                    <button onClick={() => handleRemoveImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className={`flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-300 dark:border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-green-500/50 transition-all ${retrySeconds > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading || retrySeconds > 0} className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 disabled:opacity-50 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={retrySeconds > 0 ? `Cooling down (${retrySeconds}s)...` : "Ask Oracle..."} disabled={isLoading || retrySeconds > 0} className="flex-grow bg-transparent text-gray-900 dark:text-gray-100 text-base md:text-sm focus:outline-none block w-full placeholder-gray-500 dark:placeholder-gray-600 py-1" />
                        <button type="submit" disabled={isLoading || retrySeconds > 0 || (!input.trim() && imageFiles.length === 0)} className="p-2 w-10 h-10 flex items-center justify-center text-white bg-green-600 rounded-full hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-gray-400 transition-all shadow-sm">
                           {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                        </button>
                    </form>
                </div>
            </footer>
            <button onClick={onNewChat} className="absolute bottom-24 right-4 sm:right-8 bg-green-600 hover:bg-green-500 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-105 active:scale-95 z-20" title="New Chat">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
    );
};

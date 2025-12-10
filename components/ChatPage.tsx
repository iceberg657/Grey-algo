
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ImagePart } from '../types';
import { getChatInstance, sendMessageStreamWithRetry } from '../services/chatService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { generateAndPlayAudio, stopAudio } from '../services/ttsService';

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
                        disabled={!process.env.API_KEY}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-gray-300/90 dark:bg-dark-card/90 text-green-600 dark:text-green-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shadow-sm z-10"
                        aria-label={isBusy ? "Stop reading message" : "Read message aloud"}
                    >
                        {isBusy ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4.022 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356zM5.394 9.122a.5.5 0 00-.638.45l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.302-.262zM7.17 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208z" />
                                <path fillRule="evenodd" d="M9.707 3.707a1 1 0 011.414 0l.443.443a1 1 0 010 1.414l-4.25 4.25a1 1 0 01-1.414 0L3.707 7.53a1 1 0 010-1.414l.443-.443a1 1 0 011.414 0l1.293 1.293L9.707 3.707zm5.553 3.53a.5.5 0 00-.45.638l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.49-.45zM13.829 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208zM15.978 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356z" clipRule="evenodd" /><path d="M11 12.333a1.5 1.5 0 01-3 0V7.5a1.5 1.5 0 013 0v4.833z" /></svg>
                        )}
                    </button>
                 )}
            </div>
        </div>
    );
};


const TypingIndicator: React.FC = () => (
    <div className="flex items-end gap-2 justify-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 dark:text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        </div>
        <div className="max-w-md lg:max-w-lg p-3 rounded-2xl bg-gray-200 dark:bg-dark-bg/60 text-gray-800 dark:text-dark-text/90 rounded-bl-none">
            <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
            </div>
        </div>
    </div>
);


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
    <div className="w-24 h-24 mb-4 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 shadow-lg">
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
);

const SUGGESTED_PROMPTS = [
    "Analyze the current trend of XAU/USD",
    "What key economic events are today?",
    "Give me a scalping strategy for GBP/JPY",
    "Summarize the latest forex news"
];

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

    useEffect(() => {
        getChatInstance(); // Initialize on component mount
        
        // Cleanup speech and timeout on unmount
        return () => {
            stopAudio();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);
    
    const handleToggleSpeech = useCallback(async (message: ChatMessage) => {
        if (speakingMessageId === message.id) {
            stopAudio();
            setSpeakingMessageId(null);
            return;
        }

        if (waitingMessageId === message.id) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setWaitingMessageId(null);
            return;
        }

        // If another TTS is active, stop it
        stopAudio();
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setSpeakingMessageId(null);
        setWaitingMessageId(null);

        const textToSpeak = message.text
            .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold markdown
            .replace(/(\* )/g, '') // remove list markers
            .replace(/⚠️/g, '') // remove warning emoji
            .trim()
            .replace(/\s+/g, ' ');

        setWaitingMessageId(message.id);
        timeoutRef.current = setTimeout(async () => {
            try {
                setWaitingMessageId(null);
                setSpeakingMessageId(message.id);
                await generateAndPlayAudio(textToSpeak, () => {
                    setSpeakingMessageId(null);
                });
            } catch (error) {
                console.error("TTS Error:", error);
                setSpeakingMessageId(null);
                setWaitingMessageId(null);
                alert("Failed to generate audio. Please check the console for details.");
            }
        }, 5000);
    }, [speakingMessageId, waitingMessageId]);

    const handleRemoveImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);

        setImageFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
        setImagePreviews(prevPreviews => prevPreviews.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
            if (newFiles.length > 0) {
                 const uniqueNewFiles = newFiles.filter(
                    (file: File) => !imageFiles.some((f) => f.name === file.name && f.size === file.size)
                );
                
                setImageFiles(prev => [...prev, ...uniqueNewFiles]);

                const newPreviews = uniqueNewFiles.map((file: File) => URL.createObjectURL(file));
                setImagePreviews(prev => [...prev, ...newPreviews]);
            }
        }
    };

    const executeSendMessage = useCallback(async (text: string, files: File[], previews: string[]) => {
         if ((!text.trim() && files.length === 0) || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: text,
            images: previews,
        };
        setMessages(prev => [...prev, userMessage]);
        
        setIsLoading(true);
        setError(null);

        try {
            const messageParts: (({ text: string } | { inlineData: { data: string, mimeType: string } }))[] = [];

            if (files.length > 0) {
                const imageParts = await Promise.all(files.map(file => fileToImagePart(file)));
                 imageParts.forEach(imagePart => {
                    messageParts.push({ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } });
                });
            }
            messageParts.push({ text: text });

            // Use the new retry-enabled service function
            const result = await sendMessageStreamWithRetry(messageParts);

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
            // If we've exhausted all retries and models, show a user-friendly message
            if (errorMessage.includes("503") || errorMessage.includes("Overloaded") || errorMessage.includes("Quota")) {
                setError("Oracle is currently overloaded. Please wait a moment and try again.");
            } else {
                setError(`Oracle Error: ${errorMessage}`);
            }
            
            const errorId = `model-error-${Date.now()}`;
            const errorText = `Connection interrupted. Please try again. \n\nDetails: ${errorMessage}`;
            setMessages(prev => [...prev, { id: errorId, role: 'model', text: errorText }]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, setMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentText = input;
        const currentFiles = imageFiles;
        const currentPreviews = imagePreviews;

        // Clear UI immediately
        setInput('');
        setImageFiles([]);
        setImagePreviews([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        await executeSendMessage(currentText, currentFiles, currentPreviews);
    };

    // Handle clicking on a suggested prompt
    const handleSuggestionClick = async (suggestion: string) => {
        setInput(''); // Clear any partial input
        await executeSendMessage(suggestion, [], []);
    };

    useEffect(() => {
        if (initialInput) {
            executeSendMessage(initialInput, [], []);
            if (onClearInitialInput) onClearInitialInput();
        }
    }, [initialInput, executeSendMessage, onClearInitialInput]);
    
    return (
        // Changed h-screen to h-[100dvh] for better mobile viewport support
        <div className="h-[100dvh] bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-dark-text font-sans flex flex-col relative overflow-hidden">
            <header className="flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 z-10">
                <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-200 truncate mx-2">Oracle AI</h1>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs sm:text-sm font-medium p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Logout">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto overflow-x-hidden scroll-smooth"
            >
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-full">
                    {messages.length === 0 && !isLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center h-full pb-20">
                            <OracleLogo />
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Hi, I'm Oracle AI</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 px-4 mb-8">Analyze markets, predict trends, and get trading insights.</p>
                            
                            {/* Suggestions Grid */}
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
                            {error && <p className="text-red-400 text-sm text-center p-2 bg-red-500/10 rounded-lg mx-4">{error}</p>}
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
                                    <img src={preview} alt={`Preview ${index + 1}`} className="h-16 w-16 object-cover rounded border border-gray-300 dark:border-slate-600" />
                                    <button 
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none shadow-md hover:bg-red-600 transition-colors"
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        &#x2715;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-300 dark:border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
                         <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 disabled:opacity-50 transition-colors flex-shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
                            aria-label="Attach image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Oracle..."
                            disabled={isLoading}
                            // Using text-base on mobile prevents auto-zoom on iOS
                            className="flex-grow bg-transparent text-gray-900 dark:text-gray-100 text-base md:text-sm focus:outline-none block w-full placeholder-gray-500 dark:placeholder-gray-600 disabled:opacity-50 py-1"
                            aria-label="Chat input"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || (!input.trim() && imageFiles.length === 0)}
                            className="p-2 w-10 h-10 flex items-center justify-center text-white bg-green-600 rounded-full hover:bg-green-500 focus:outline-none disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                            aria-label="Send message"
                        >
                           {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           ) : (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                               </svg>
                           )}
                        </button>
                    </form>
                </div>
            </footer>
            {/* New Chat Button - Positioned above footer */}
            <button
                onClick={onNewChat}
                className="absolute bottom-24 right-4 sm:right-8 bg-green-600 hover:bg-green-500 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-500/30 z-20"
                aria-label="Start new chat"
                title="New Chat"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};

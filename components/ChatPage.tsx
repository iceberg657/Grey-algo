import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ImagePart } from '../types';
import { getChatInstance } from '../services/chatService';
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

    return <div dangerouslySetInnerHTML={formatText(text)} />;
};

const ChatBubble: React.FC<{
    message: ChatMessage;
    isSpeaking: boolean;
    onToggleSpeech: (message: ChatMessage) => void;
}> = ({ message, isSpeaking, onToggleSpeech }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 dark:text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
            )}
            <div className={`relative group max-w-md lg:max-w-lg p-3 rounded-2xl text-sm ${isUser ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 dark:bg-dark-bg/60 dark:text-dark-text/90 rounded-bl-none'}`}>
                 {message.images && message.images.length > 0 && (
                    <div className={`grid gap-2 mb-2 ${message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {message.images.map((imgSrc, index) => (
                             <img 
                                key={index}
                                src={imgSrc} 
                                alt={`User upload ${index + 1}`} 
                                className="rounded-lg max-w-full h-auto"
                                style={{ maxHeight: '200px', maxWidth: '200px', objectFit: 'cover' }}
                            />
                        ))}
                    </div>
                 )}
                 <SimpleMarkdown text={message.text} />
                  {!isUser && (
                     <button
                        onClick={() => onToggleSpeech(message)}
                        disabled={!process.env.API_KEY}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-gray-300/80 dark:bg-dark-card/80 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={isSpeaking ? "Stop reading message" : "Read message aloud"}
                    >
                        {isSpeaking ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4.022 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356zM5.394 9.122a.5.5 0 00-.638.45l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.302-.262zM7.17 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208z" />
                                <path fillRule="evenodd" d="M9.707 3.707a1 1 0 011.414 0l.443.443a1 1 0 010 1.414l-4.25 4.25a1 1 0 01-1.414 0L3.707 7.53a1 1 0 010-1.414l.443-.443a1 1 0 011.414 0l1.293 1.293L9.707 3.707zm5.553 3.53a.5.5 0 00-.45.638l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.49-.45zM13.829 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208zM15.978 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356z" clipRule="evenodd" />
                                <path d="M11 12.333a1.5 1.5 0 01-3 0V7.5a1.5 1.5 0 013 0v4.833z" />
                            </svg>
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
}

const OracleLogo: React.FC = () => (
    <div className="w-24 h-24 mb-4 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700">
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


export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onLogout, messages, setMessages, onNewChat }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getChatInstance(); // Initialize on component mount
        
        // Cleanup speech on unmount
        return () => {
            stopAudio();
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

        // Stop any currently playing audio before starting a new one
        if (speakingMessageId !== null) {
            stopAudio();
        }

        const textToSpeak = message.text
            .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold markdown
            .replace(/(\* )/g, '') // remove list markers
            .replace(/⚠️/g, '') // remove warning emoji
            .trim()
            .replace(/\s+/g, ' ');

        try {
            setSpeakingMessageId(message.id);
            await generateAndPlayAudio(textToSpeak, () => {
                setSpeakingMessageId(null);
            });
        } catch (error) {
            console.error("TTS Error:", error);
            setSpeakingMessageId(null);
            alert("Failed to generate audio. Please check the console for details.");
        }
    }, [speakingMessageId]);

    const handleRemoveImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);

        setImageFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
        setImagePreviews(prevPreviews => prevPreviews.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
            if (newFiles.length > 0) {
                 const uniqueNewFiles = newFiles.filter(
                    (file) => !imageFiles.some((f) => f.name === file.name && f.size === file.size)
                );
                
                setImageFiles(prev => [...prev, ...uniqueNewFiles]);

                const newPreviews = uniqueNewFiles.map(file => URL.createObjectURL(file));
                setImagePreviews(prev => [...prev, ...newPreviews]);
            }
        }
    };

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const finalInput = input;
        if ((!finalInput.trim() && imageFiles.length === 0) || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: finalInput,
            images: imagePreviews,
        };
        setMessages(prev => [...prev, userMessage]);
        
        setInput('');
        const currentImageFiles = imageFiles;
        
        setImageFiles([]);
        setImagePreviews([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setIsLoading(true);
        setError(null);

        try {
            const chat = getChatInstance();
            const messageParts: (({ text: string } | { inlineData: { data: string, mimeType: string } }))[] = [];

            if (currentImageFiles.length > 0) {
                const imageParts = await Promise.all(currentImageFiles.map(file => fileToImagePart(file)));
                 imageParts.forEach(imagePart => {
                    messageParts.push({ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } });
                });
            }
            messageParts.push({ text: finalInput });

            const result = await chat.sendMessageStream({ message: messageParts });

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
            setError(`Oracle Error: ${errorMessage}`);
            const errorId = `model-error-${Date.now()}`;
            const errorText = `A system anomaly has occurred. Please try again. \n\nDetails: ${errorMessage}`;
            setMessages(prev => [...prev, { id: errorId, role: 'model', text: errorText }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, imageFiles, imagePreviews, setMessages]);
    
    return (
        <div className="h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-dark-text font-sans flex flex-col relative">
            <header className="flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800">
                <div className="w-full max-w-7xl mx-auto p-4 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-200">Oracle AI</h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-sm font-medium" aria-label="Logout">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto"
            >
                <div className="w-full max-w-7xl mx-auto px-4 h-full">
                    {messages.length === 0 && !isLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center h-full">
                            <OracleLogo />
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Hi, I'm Oracle AI</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">How can I help you today?</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2 pb-4">
                             {messages.map((msg) => (
                                <ChatBubble 
                                    key={msg.id} 
                                    message={msg}
                                    isSpeaking={speakingMessageId === msg.id}
                                    onToggleSpeech={handleToggleSpeech}
                                />
                            ))}
                            {isLoading && <TypingIndicator />}
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        </div>
                    )}
                </div>
            </main>

            <footer className="flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-t border-gray-200 dark:border-slate-800">
                <div className="w-full max-w-7xl mx-auto px-4 pt-2 pb-4">
                    {imagePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-200 dark:bg-slate-800/60 rounded-lg mb-2">
                            {imagePreviews.map((preview, index) => (
                                <div key={preview} className="relative">
                                    <img src={preview} alt={`Preview ${index + 1}`} className="h-20 w-20 object-cover rounded" />
                                    <button 
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        &#x2715;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-gray-300 dark:border-slate-700">
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
                            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 transition-colors"
                            aria-label="Attach image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message Oracle AI..."
                            disabled={isLoading}
                            className="flex-grow bg-transparent text-gray-900 dark:text-gray-200 text-sm focus:outline-none block w-full placeholder-gray-500 disabled:opacity-50"
                            aria-label="Chat input"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || (!input.trim() && imageFiles.length === 0)}
                            className="p-2 w-8 h-8 flex items-center justify-center text-white bg-green-600 rounded-full hover:bg-green-500 focus:outline-none disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send message"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7" />
                           </svg>
                        </button>
                    </form>
                </div>
            </footer>
            <button
                onClick={onNewChat}
                className="absolute bottom-24 right-6 bg-green-600 hover:bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-green-500"
                aria-label="Start new chat"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};
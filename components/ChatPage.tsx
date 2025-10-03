

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ImagePart } from '../types';
import { getChatInstance } from '../services/chatService';

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
    canSpeak: boolean;
}> = ({ message, isSpeaking, onToggleSpeech, canSpeak }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
            )}
            <div className={`relative group max-w-md lg:max-w-lg p-3 rounded-2xl text-sm ${isUser ? 'bg-blue-600/50 text-white rounded-br-none' : 'bg-dark-bg/60 text-dark-text/90 rounded-bl-none'}`}>
                 {message.image && (
                    <img 
                        src={message.image} 
                        alt="User upload" 
                        className="mb-2 rounded-lg max-w-full h-auto"
                        style={{ maxHeight: '300px' }}
                    />
                 )}
                 <SimpleMarkdown text={message.text} />
                  {!isUser && (
                     <button
                        onClick={() => onToggleSpeech(message)}
                        disabled={!canSpeak}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-dark-card/80 text-green-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        </div>
        <div className="max-w-md lg:max-w-lg p-3 rounded-2xl bg-dark-bg/60 text-dark-text/90 rounded-bl-none">
            <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
        </div>
    </div>
);


interface ChatPageProps {
    onBack: () => void;
    onLogout: () => void;
}

const OracleLogo: React.FC = () => (
    <div className="w-24 h-24 mb-4 rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-700">
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


export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onLogout }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canSpeak, setCanSpeak] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getChatInstance(); // Initialize on component mount
        setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);

        // Cleanup speech on unmount
        return () => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);
    
    const handleToggleSpeech = useCallback((message: ChatMessage) => {
        if (!canSpeak) return;

        // If the clicked message is already speaking, stop it.
        if (speakingMessageId === message.id) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }

        // If another message is speaking, or to start a new one, cancel any current speech.
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const textToSpeak = message.text
            .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold markdown for speech
            .replace(/(\* )/g, '') // remove list markers for speech
            .trim()
            .replace(/\s+/g, ' ');

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            if (event.error !== 'interrupted') {
                console.error("Speech synthesis error:", event.error);
            }
            setSpeakingMessageId(null);
        };

        window.speechSynthesis.speak(utterance);
        setSpeakingMessageId(message.id);
    }, [canSpeak, speakingMessageId]);

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const finalInput = input;
        if ((!finalInput.trim() && !imageFile) || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: finalInput,
            image: imagePreview,
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        const currentImageFile = imageFile;
        removeImage();

        setIsLoading(true);
        setError(null);

        try {
            const chat = getChatInstance();
            const messageParts: (({ text: string } | { inlineData: { data: string, mimeType: string } }))[] = [];

            if (currentImageFile) {
                const imagePart = await fileToImagePart(currentImageFile);
                messageParts.push({ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } });
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
    }, [input, isLoading, imageFile, imagePreview]);
    
    return (
        <div className="min-h-screen bg-slate-950 text-dark-text font-sans flex flex-col transition-colors duration-300">
             <div className="w-full max-w-7xl mx-auto flex flex-col h-screen p-4">
                 <header className="relative mb-4 flex justify-between items-center flex-shrink-0">
                     <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <h1 className="text-xl font-semibold text-gray-200">Oracle AI</h1>
                    <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors text-sm font-medium" aria-label="Logout">
                        Logout
                    </button>
                 </header>

                <main
                    ref={chatContainerRef}
                    className="flex-grow flex flex-col overflow-y-auto"
                >
                    {messages.length === 0 && !isLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center">
                            <OracleLogo />
                            <h2 className="text-3xl font-bold text-gray-100">Hi, I'm Oracle AI</h2>
                            <p className="text-gray-400 mt-2">How can I help you today?</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                             {messages.map((msg) => (
                                <ChatBubble 
                                    key={msg.id} 
                                    message={msg}
                                    isSpeaking={speakingMessageId === msg.id}
                                    onToggleSpeech={handleToggleSpeech}
                                    canSpeak={canSpeak}
                                />
                            ))}
                            {isLoading && <TypingIndicator />}
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        </div>
                    )}
                </main>

                <footer className="mt-4 flex-shrink-0">
                    {imagePreview && (
                        <div className="p-2 bg-slate-800/60 rounded-lg mb-2 inline-block relative">
                            <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                            <button 
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                                aria-label="Remove image"
                            >
                                &#x2715;
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                         <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                            aria-label="Attach image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message Oracle AI..."
                            disabled={isLoading}
                            className="flex-grow bg-transparent text-gray-200 text-sm focus:outline-none block w-full placeholder-gray-500 disabled:opacity-50"
                            aria-label="Chat input"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || (!input.trim() && !imageFile)}
                            className="p-2 w-8 h-8 flex items-center justify-center text-white bg-gray-500 rounded-full hover:bg-gray-400 focus:outline-none disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send message"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7" />
                           </svg>
                        </button>
                    </form>
                </footer>
             </div>
        </div>
    );
};
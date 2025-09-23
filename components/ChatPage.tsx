import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types';
import { getChatInstance } from '../services/chatService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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
    onSpeak: (text: string, id: string) => void;
    isSpeaking: boolean;
}> = ({ message, onSpeak, isSpeaking }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5A10 10 0 0 1 11.5 2h.05"/><path d="M22 12.5A10 10 0 0 1 12.5 22h-.05"/></svg>
                </div>
            )}
            <div className={`relative group max-w-md lg:max-w-lg p-3 rounded-2xl text-sm ${isUser ? 'bg-blue-600/50 text-white rounded-br-none' : 'bg-dark-bg/60 text-dark-text/90 rounded-bl-none'}`}>
                 <SimpleMarkdown text={message.text} />
                 {!isUser && message.text && (
                    <button 
                        onClick={() => onSpeak(message.text, message.id)}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-dark-card/80 text-green-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label="Read message aloud"
                    >
                        {isSpeaking ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5A10 10 0 0 1 11.5 2h.05"/><path d="M22 12.5A10 10 0 0 1 12.5 22h-.05"/></svg>
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

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onLogout }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [currentlySpeakingMessageId, setCurrentlySpeakingMessageId] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const handleSpeak = useCallback((text: string, messageId: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any previous speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setCurrentlySpeakingMessageId(messageId);
            utterance.onend = () => setCurrentlySpeakingMessageId(null);
            utterance.onerror = () => setCurrentlySpeakingMessageId(null);
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    useEffect(() => {
        getChatInstance(); // Initialize on component mount
        const initialMessageId = `model-${Date.now()}`;
        const initialMessageText = "Oracle is online. Voice input is now active. Ask me about any asset, request technical analysis, or inquire about current market sentiment. I will reveal the market's hidden truths.";
        setMessages([{
            id: initialMessageId,
            role: 'model',
            text: initialMessageText,
        }]);

        setTimeout(() => handleSpeak(initialMessageText, initialMessageId), 500);

        return () => {
            if (recognition) {
                recognition.abort();
            }
            window.speechSynthesis.cancel();
        };
    }, [handleSpeak]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSendMessage = useCallback(async (e?: React.FormEvent, messageText?: string) => {
        if (e) e.preventDefault();
        const finalInput = messageText || input;
        if (!finalInput.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: finalInput };
        setMessages(prev => [...prev, userMessage]);
        if (!messageText) {
            setInput('');
        }
        setIsLoading(true);
        setError(null);
        window.speechSynthesis.cancel();
        setCurrentlySpeakingMessageId(null);

        try {
            const chat = getChatInstance();
            const result = await chat.sendMessageStream({ message: finalInput });

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
            
            if (responseText) {
                 handleSpeak(responseText, streamMessageId);
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
    }, [input, isLoading, handleSpeak]);
    
    const handleToggleListening = () => {
        if (!recognition) {
            setError("Voice recognition is not supported by your browser.");
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            recognition.lang = 'en-US';
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: any) => {
                setError(`Voice recognition error: ${event.error}`);
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');
                setInput(transcript);

                if (event.results[event.results.length - 1].isFinal) {
                    handleSendMessage(undefined, transcript);
                    setInput('');
                }
            };

            recognition.start();
        }
    };

    return (
        <div className="min-h-screen text-dark-text font-sans p-4 flex flex-col transition-colors duration-300 animate-fade-in">
             <div className="w-full max-w-3xl mx-auto flex flex-col h-screen">
                 <header className="relative mb-4 flex justify-between items-center flex-shrink-0">
                     <button onClick={onBack} className="flex items-center text-sm font-semibold text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-green-400">Oracle Chat</h1>
                    <button onClick={onLogout} className="text-green-400 hover:text-green-300 transition-colors text-sm font-medium" aria-label="Logout">
                        Logout
                    </button>
                 </header>

                <main
                    ref={chatContainerRef}
                    className="flex-grow bg-dark-card/60 backdrop-blur-lg p-4 rounded-2xl border border-green-500/20 shadow-2xl space-y-4 overflow-y-auto"
                >
                    {messages.map((msg) => (
                        <ChatBubble 
                            key={msg.id} 
                            message={msg}
                            onSpeak={handleSpeak}
                            isSpeaking={currentlySpeakingMessageId === msg.id}
                        />
                    ))}
                    {isLoading && <TypingIndicator />}
                </main>

                <footer className="mt-4 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Ask the Oracle..."}
                            disabled={isLoading}
                            className="flex-grow bg-dark-bg/80 border border-green-500/50 text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-3 placeholder-gray-500 disabled:opacity-50"
                            aria-label="Chat input"
                        />
                         {recognition && (
                            <button
                                type="button"
                                onClick={handleToggleListening}
                                disabled={isLoading}
                                className={`p-3 rounded-lg focus:ring-4 focus:outline-none transition-colors transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isListening ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500/50' : 'bg-green-600 hover:bg-green-500 text-white focus:ring-green-500/50'}`}
                                aria-label={isListening ? "Stop listening" : "Start listening"}
                            >
                                {isListening ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                )}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="p-3 text-white bg-green-600 rounded-lg hover:bg-green-500 focus:ring-4 focus:outline-none focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                            aria-label="Send message"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </footer>
             </div>
        </div>
    );
};
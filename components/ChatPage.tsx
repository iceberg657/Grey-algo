import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types';
import { getChatInstance } from '../services/chatService';

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

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onLogout }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canSpeak, setCanSpeak] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getChatInstance(); // Initialize on component mount
        setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);

        const initialMessageId = `model-${Date.now()}`;
        const initialMessageText = "Oracle is online. Ask me about any asset, request technical analysis, or inquire about current market sentiment. I will reveal the market's hidden truths.";
        setMessages([{
            id: initialMessageId,
            role: 'model',
            text: initialMessageText,
        }]);

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
        utterance.onerror = (event) => {
            setSpeakingMessageId(null);
            console.error("Speech synthesis error", event.error);
        };

        window.speechSynthesis.speak(utterance);
        setSpeakingMessageId(message.id);
    }, [canSpeak, speakingMessageId]);

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const finalInput = input;
        if (!finalInput.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: finalInput };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

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

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Oracle Error: ${errorMessage}`);
            const errorId = `model-error-${Date.now()}`;
            const errorText = `A system anomaly has occurred. Please try again. \n\nDetails: ${errorMessage}`;
            setMessages(prev => [...prev, { id: errorId, role: 'model', text: errorText }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading]);
    
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
                            isSpeaking={speakingMessageId === msg.id}
                            onToggleSpeech={handleToggleSpeech}
                            canSpeak={canSpeak}
                        />
                    ))}
                    {isLoading && <TypingIndicator />}
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                </main>

                <footer className="mt-4 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask the Oracle..."
                            disabled={isLoading}
                            className="flex-grow bg-dark-bg/80 border border-green-500/50 text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-3 placeholder-gray-500 disabled:opacity-50"
                            aria-label="Chat input"
                        />
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
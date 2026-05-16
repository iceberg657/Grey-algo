
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import type { ChatMessage, ImagePart } from '../types';
import { getChatInstance, sendMessageStreamWithRetry, getCurrentModelName } from '../services/chatService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useTheme } from './contexts/ThemeContext';
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
            <div className={`relative group max-w-[85%] lg:max-w-lg p-3 rounded-2xl text-sm shadow-sm backdrop-blur-sm ${isUser ? 'bg-blue-500/90 text-white rounded-br-none border border-blue-400/30' : 'bg-gray-200/80 text-gray-800 dark:bg-slate-800/60 dark:text-gray-200 rounded-bl-none border border-gray-300/50 dark:border-slate-700/50'}`}>
                 {message.images && message.images.length > 0 && (
                    <div className={`grid gap-2 mb-2 ${message.images.length === 3 ? 'grid-cols-3' : message.images.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
            <div className="max-w-md lg:max-w-lg p-3 rounded-2xl bg-gray-200/80 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-300/50 dark:border-slate-700/50 text-gray-800 dark:text-gray-200 rounded-bl-none">
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
    isLocked?: boolean;
    userMetadata?: UserMetadata | null;
    onNavigate?: (view: string) => void;
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
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const [showKeyboardOverlay, setShowKeyboardOverlay] = useState(false);
    const [liveTextInput, setLiveTextInput] = useState('');
    const [isLiveMicMuted, setIsLiveMicMuted] = useState(false);
    const [liveStatus, setLiveStatus] = useState<string>('Connecting...');
    const liveWsRef = useRef<WebSocket | null>(null);
    const liveStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const inputAudioCtxRef = useRef<AudioContext | null>(null);

    const handleSendLiveText = () => {
        if (!liveTextInput.trim() || !liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) return;
        liveWsRef.current.send(JSON.stringify({ text: liveTextInput }));
        setLiveTextInput('');
        setShowKeyboardOverlay(false);
    };

    const pcmToBase64 = (pcmData: Float32Array) => {
      const buffer = new ArrayBuffer(pcmData.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < pcmData.length; i++) {
        let s = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      // Note: btoa can be slow, but usually fine for 4096 samples
      return btoa(binary);
    };

    const playAudioChunk = (base64: string) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const pcm16 = new Int16Array(bytes.buffer);
        const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcm16.length; i++) {
            channelData[i] = pcm16[i] / 32768;
        }
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        // Add gain node for volume boost
        const gainNode = ctx.createGain();
        gainNode.gain.value = 3.0; // 3x volume boost
        
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        const currentTime = ctx.currentTime;
        if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime + 0.1;
        }
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
    };

    const toggleLiveMic = () => {
        if (liveStreamRef.current) {
            const track = liveStreamRef.current.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsLiveMicMuted(!track.enabled);
            }
        }
    };

    useEffect(() => {
        if (isLiveMode) {
            let mounted = true;
            let stream: MediaStream | null = null;
            let processor: ScriptProcessorNode | null = null;
            let source: MediaStreamAudioSourceNode | null = null;
            setIsLiveMicMuted(false);
            setLiveStatus('Connecting...');

            const setupLive = async () => {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const hostUrl = window.location.host;
                const wsUrl = `${protocol}//${hostUrl}/live`;
                console.log('Attempting to connect to WebSocket at:', wsUrl);
                const ws = new WebSocket(wsUrl);
                liveWsRef.current = ws;

                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                nextStartTimeRef.current = 0;

                ws.onopen = () => {
                    if (mounted) setLiveStatus('Awaiting Voice Input...');
                };

                ws.onerror = (error) => {
                    console.error("Live WebSocket Error:", error);
                    if (mounted) {
                        setLiveStatus('Connection Error');
                        setTimeout(() => setIsLiveMode(false), 2000);
                    }
                };

                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    liveStreamRef.current = stream;
                } catch(e) {
                    console.error("Mic error:", e);
                    if (mounted) {
                        setLiveStatus('Microphone Error');
                        setTimeout(() => setIsLiveMode(false), 2000);
                    }
                    return;
                }

                if (!mounted) return;
                
                source = inputAudioCtxRef.current.createMediaStreamSource(stream);
                processor = inputAudioCtxRef.current.createScriptProcessor(1024, 1, 1);
                source.connect(processor);
                processor.connect(inputAudioCtxRef.current.destination);

                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN && !isLiveMicMuted) {
                        const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
                        ws.send(JSON.stringify({ audio: base64 }));
                    }
                };

                ws.onmessage = (event) => {
                    if (!mounted) return;
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'ERROR') {
                        setLiveStatus(msg.message);
                        return;
                    }
                    if (msg.audio) playAudioChunk(msg.audio);
                    if (msg.interrupted) {
                        nextStartTimeRef.current = 0; // barge-in flush
                    }
                };

                ws.onclose = () => {
                    console.log("Live WS Closed");
                    if (mounted) {
                        setLiveStatus('Disconnected. Checking limits...');
                        setTimeout(() => setIsLiveMode(false), 2000);
                    }
                };
            };
            setupLive();

            return () => {
                mounted = false;
                if (liveWsRef.current) liveWsRef.current.close();
                if (processor) processor.disconnect();
                if (source) source.disconnect();
                if (stream) stream.getTracks().forEach(t => t.stop());
                if (audioCtxRef.current) audioCtxRef.current.close();
                if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
                liveStreamRef.current = null;
            };
        }
    }, [isLiveMode]);

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);
            
            recognitionRef.current.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');
                
                setInput(transcript);
                
                // If it's a final result, we could auto-send in Live mode if we wanted, 
                // but let's keep it manual for safety.
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error("Failed to start listening", err);
            }
        }
    };
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentModelName, setCurrentModelName] = useState<string>('');
    const [retrySeconds, setRetrySeconds] = useState<number>(0);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | undefined>(undefined);
    const { toggleTheme } = useTheme();

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
            let key = ''; 
            try { 
                const stored = localStorage.getItem('greyquant_user_settings');
                if (stored) {
                    const settings = JSON.parse(stored);
                    key = settings.twelveDataApiKey || '';
                }
            } catch(e) {}
            
            if (key) {
                // Regex matches sequences like AAPL, BTC/USD, EURUSD
                const potentialAssets = text.match(/\b([A-Z]{3}\/?[A-Z]{3}|[A-Z]{1,5})\b/gi);
                if (potentialAssets && potentialAssets.length > 0) {
                    for (const asset of potentialAssets) {
                        try {
                            const res = await fetch(`/api/twelveData?symbol=${asset}&interval=1h&apikey=${key}`);
                            const data = await res.json();
                            if (data && !data.error && data.close) {
                                extraContext += `\n[System Data: Real-time TwelveData for ${asset}: Price=${data.close}, High=${data.high}, Low=${data.low}, Open=${data.open}, RSI=${data.rsi}, ATR=${data.atr}]`;
                            }
                        } catch(e) {
                            console.error("Failed to fetch twelve data for", asset, e);
                        }
                    }
                }
            }

            messageParts.push({ text: text + extraContext });

            const result = await sendMessageStreamWithRetry(messageParts, startCountdown, isLiveMode);
            setCurrentModelName(getCurrentModelName());
            setRetrySeconds(0); 
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

            let responseText = '';
            const streamMessageId = `model-stream-${Date.now()}`;
            setMessages(prev => [...prev, { id: streamMessageId, role: 'model', text: '' }]);

            const chat = await getChatInstance(isLiveMode);
            let hasFunctionCalls = false;
            let functionResponses: any[] = [];

            for await (const chunk of result) {
                const functionCalls = (chunk as any).functionCalls;
                if (functionCalls && functionCalls.length > 0) {
                    hasFunctionCalls = true;
                    for (const call of functionCalls) {
                        console.log(`[Neural Link] Tool Call: ${call.name}`, call.args);
                        let result: any = { status: "success" };

                        if (call.name === 'navigateTo' && onNavigate) {
                            onNavigate(call.args.page);
                            result = { status: "success", message: `Navigated to ${call.args.page}` };
                        } else if (call.name === 'toggleTheme') {
                            toggleTheme();
                            result = { status: "success", themeSwitched: true };
                        } else if (call.name === 'getMarketVitals') {
                            result = { 
                                status: "active", 
                                activeKeys: 12, 
                                neuralLanes: "k7-cascade", 
                                model: "GreyAlpha Quantum" 
                            };
                        }

                        functionResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: result
                            }
                        });
                    }
                }

                if (chunk.text) {
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
            }

            // If we had function calls, we need to send responses back to the model
            if (hasFunctionCalls && functionResponses.length > 0) {
                console.log("[Neural Link] Feeding tool results back to model...");
                const followUpResult = await chat.sendMessage(functionResponses);
                const followUpText = followUpResult.response.text();
                if (followUpText) {
                    responseText += "\n\n" + followUpText;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const msgIndex = newMessages.findIndex(m => m.id === streamMessageId);
                        if (msgIndex !== -1) {
                             newMessages[msgIndex] = { ...newMessages[msgIndex], text: responseText };
                        }
                        return newMessages;
                    });
                }
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
        <div className="h-[100dvh] bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-dark-text font-sans flex flex-col relative overflow-hidden">
            <NeuralBackground />
            
            {isLocked && (
                <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-white/10 p-10 rounded-3xl max-w-sm w-full shadow-2xl"
                    >
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Neural Link Offline</h2>
                        <p className="text-slate-400 text-sm mb-8">
                            Chat is closed, please try again later.
                        </p>
                        <button 
                            onClick={onBack}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                        >
                            Return to Base
                        </button>
                    </motion.div>
                </div>
            )}

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
                        <button 
                            onClick={() => setIsLiveMode(!isLiveMode)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${
                                isLiveMode 
                                ? 'bg-red-500/20 border-red-500/50 text-red-500' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-white/5'
                            }`}
                            title={isLiveMode ? "Disable Live Neural Link" : "Enable Live Neural Link (System Control)"}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-red-500 animate-pulse' : 'bg-gray-400 dark:bg-slate-600'}`} />
                            <span className="text-[10px] uppercase font-black tracking-widest hidden xs:block">{isLiveMode ? 'Live' : 'Standard'}</span>
                        </button>
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs sm:text-sm font-medium p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Logout">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main ref={chatContainerRef} className="flex-grow overflow-y-auto overflow-x-hidden scroll-smooth relative z-0">
                {isLiveMode ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-transparent">
                        <div className="relative mb-8 group">
                            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                            <div className="w-32 h-32 md:w-48 md:h-48 bg-slate-950 border-2 border-green-500/50 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.3)] relative overflow-hidden">
                                <div className="absolute inset-0 bg-green-500/10 animate-[ping_3s_ease-in-out_infinite]"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-24 md:w-24 text-green-400 animate-[pulse_2s_ease-in-out_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-2 animate-pulse">Neural Link Active</h2>
                        <p className={`text-sm md:text-base mb-12 flex items-center space-x-2 ${liveStatus.includes('Error') || liveStatus.includes('Disconnected') ? 'text-red-400/80' : 'text-green-400/80'}`}>
                             <span className={`w-2 h-2 rounded-full animate-ping ${liveStatus.includes('Error') || liveStatus.includes('Disconnected') ? 'bg-red-500' : 'bg-green-500'}`}></span>
                             <span>{liveStatus}</span>
                        </p>

                        {/* Controls */}
                        <div className="flex items-center gap-4">
                            {/* Mute Mic Toggle */}
                            <button 
                                onClick={toggleLiveMic}
                                className={`p-4 rounded-full transition-all border ${isLiveMicMuted ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/5 hover:border-white/20'}`}
                                title={isLiveMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                            >
                                {isLiveMicMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                )}
                            </button>

                            {/* Image Injection */}
                            <input type="file" ref={(el) => { if(el) (window as any).liveImageInput = el }} className="hidden" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file || !liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const base64 = (reader.result as string).split(',')[1];
                                    liveWsRef.current?.send(JSON.stringify({ video: { data: base64, mimeType: file.type } }));
                                };
                                reader.readAsDataURL(file);
                            }} />
                            <button 
                                onClick={() => (window as any).liveImageInput?.click()}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-4 rounded-full transition-all border border-white/5 hover:border-white/20"
                                title="Send Image to Neural Link"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>

                            {/* Keyboard Overlay Toggle */}
                            <button 
                                onClick={() => setShowKeyboardOverlay(!showKeyboardOverlay)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-4 rounded-full transition-all border border-white/5 hover:border-white/20"
                                title="Keyboard Input"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>

                        {showKeyboardOverlay && (
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute bottom-6 w-full max-w-lg px-4"
                            >
                                <form onSubmit={(e) => { e.preventDefault(); handleSendLiveText(); }} className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
                                    <input 
                                        type="text" 
                                        value={liveTextInput} 
                                        onChange={(e) => setLiveTextInput(e.target.value)} 
                                        placeholder="Send a direct command..." 
                                        className="flex-grow bg-transparent text-white placeholder-gray-400 py-2 px-4 focus:outline-none"
                                        autoFocus
                                    />
                                    <button type="submit" disabled={!liveTextInput.trim()} className="p-2 w-10 h-10 flex items-center justify-center text-white bg-green-600 rounded-full hover:bg-green-500 disabled:bg-slate-700 disabled:text-gray-500 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    </button>
                                </form>
                            </motion.div>
                        )}
                        <button 
                            onClick={() => setIsLiveMode(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-all font-bold uppercase text-xs"
                        >
                            Exit
                        </button>
                    </div>
                ) : (
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
                                        className="text-sm text-left p-4 rounded-xl bg-white/80 dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800/60 transition-colors shadow-sm text-gray-700 dark:text-gray-300"
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
                )}
            </main>

            <footer className="flex-shrink-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-t border-gray-200 dark:border-slate-800 z-10 pb-[env(safe-area-inset-bottom)]">
                {!isLiveMode && (
                <div className="w-full max-w-7xl mx-auto px-3 py-2 sm:p-4">
                    {uploadError && (
                        <div className="mx-4 mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs font-bold text-center animate-bounce">
                            {uploadError}
                        </div>
                    )}
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
                    <form onSubmit={handleSendMessage} className={`flex items-center gap-2 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md p-2 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm focus-within:ring-2 focus-within:ring-green-500/50 transition-all ${retrySeconds > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                        <button 
                            type="button" 
                            onClick={toggleListening} 
                            disabled={isLoading || retrySeconds > 0} 
                            className={`p-2 transition-colors rounded-full ${
                                isListening 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                            }`}
                            title="Voice Input"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading || retrySeconds > 0} className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 disabled:opacity-50 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <input type="text" value={input} onPaste={handlePaste} onChange={(e) => setInput(e.target.value)} placeholder={retrySeconds > 0 ? `Cooling down (${retrySeconds}s)...` : "Ask Oracle..."} disabled={isLoading || retrySeconds > 0} className="flex-grow bg-transparent text-gray-900 dark:text-gray-100 text-base md:text-sm focus:outline-none block w-full placeholder-gray-500 dark:placeholder-gray-600 py-1" />
                        <button type="submit" disabled={isLoading || retrySeconds > 0 || (!input.trim() && imageFiles.length === 0)} className="p-2 w-10 h-10 flex items-center justify-center text-white bg-green-600 rounded-full hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-gray-400 transition-all shadow-sm">
                           {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                        </button>
                    </form>
                </div>
                )}
            </footer>
            {!isLiveMode && (
            <button onClick={onNewChat} className="absolute bottom-24 right-4 sm:right-8 bg-green-600/90 hover:bg-green-500/90 backdrop-blur-md border border-green-500/50 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-105 active:scale-95 z-20" title="New Chat">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
            )}
        </div>
    );
};

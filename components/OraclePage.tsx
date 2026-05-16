import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { getApiKey } from '../services/retryUtils';
import { NeuralBackground } from './NeuralBackground';
import { Mic, MicOff, Keyboard, MessageSquare, Send } from 'lucide-react';

interface OraclePageProps {
  onBack: () => void;
  isHidden?: boolean;
  onOpen?: () => void;
  onNavigateTo?: (page: string) => void;
}

export const OraclePage: React.FC<OraclePageProps> = ({ onBack, isHidden = false, onOpen, onNavigateTo }) => {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [modelMessage, setModelMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const toggleMute = () => {
    if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => {
            track.enabled = isMuted; // enabled=true means unmuted
        });
        setIsMuted(!isMuted);
    }
  };

  const sendText = () => {
      if (sessionRef.current && textInput.trim()) {
          sessionRef.current.sendRealtimeInput({ text: textInput });
          setModelMessage(prev => prev + "\nUser: " + textInput); // Show user text
          setTextInput('');
      }
  }

  const stopOracle = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsActive(false);
    setIsInitializing(false);
  };

  const startOracle = async (includeCamera: boolean) => {
    setIsInitializing(true);
    setError(null);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });

      let audioStream: MediaStream;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      } catch (audioErr: any) {
        console.warn("Audio access failed:", audioErr);
        if (audioErr.name === 'NotAllowedError' || audioErr.message.includes('Permission denied')) {
            throw new Error("Microphone permission denied. Please grant permission or open the app in a new tab (using the button in the top right of the preview).");
        }
        throw new Error("Could not access microphone.");
      }
      
      let displayStream: MediaStream | null = null;
      if (includeCamera) {
          try {
            displayStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          } catch (camErr: any) {
            console.warn("Camera access failed:", camErr);
            if (camErr.name === 'NotAllowedError' || camErr.message.includes('Permission denied')) {
                throw new Error("Camera permission denied. Please grant permission or open the app in a new tab.");
            }
            throw new Error("Could not access camera.");
          }
      }
      
      // Combine tracks
      const combinedStream = new MediaStream([
        ...audioStream.getTracks(), 
        ...(displayStream ? displayStream.getTracks() : [])
      ]);
      streamRef.current = combinedStream;

      if (videoRef.current && displayStream) {
        videoRef.current.srcObject = displayStream;
        await videoRef.current.play();
      }

      // 2. Setup Audio Processing
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(audioStream);
      mediaStreamSourceRef.current = source;
      
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      
      source.connect(processor);
      processor.connect(audioCtx.destination);

      nextPlayTimeRef.current = audioCtx.currentTime;

      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsInitializing(false);
            
              // Audio input loop
                processor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const pcm16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  }
                  const uint8 = new Uint8Array(pcm16.buffer);
                  let binary = '';
                  for (let i = 0; i < uint8.length; i++) {
                    binary += String.fromCharCode(uint8[i]);
                  }
                  const base64Data = btoa(binary);
                  sessionPromise.then(s => {
                    s.sendRealtimeInput({
                      audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                    });
                  });
                };

                // Video frames loop (only if camera enabled)
                if (includeCamera && videoRef.current && canvasRef.current) {
                    frameIntervalRef.current = window.setInterval(() => {
                      if (videoRef.current && canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
                          const base64Data = dataUrl.split(',')[1];
                          sessionPromise.then(s => {
                            s.sendRealtimeInput({
                              video: { data: base64Data, mimeType: 'image/jpeg' }
                            });
                          });
                        }
                      }
                    }, 2000); 
                }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                  if (call.name === 'navigate_to_page' && onNavigateTo) {
                    const args = call.args as any;
                    if (args && args.page) {
                      onNavigateTo(args.page);
                      
                      // Respond to the tool call
                      sessionPromise.then(s => {
                        s.sendToolResponse({
                          functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { result: `Successfully navigated to ${args.page}` }
                          }]
                        });
                      });
                    }
                  }
                }
              }
            }

            if (message.serverContent) {
              const parts = message.serverContent.modelTurn?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  // Handle raw PCM audio
                  if (part.inlineData?.data) {
                    const base64Audio = part.inlineData.data;
                    const binaryString = atob(base64Audio);
                    const uint8Array = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                      uint8Array[i] = binaryString.charCodeAt(i);
                    }
                    const int16Array = new Int16Array(uint8Array.buffer);
                    const float32Array = new Float32Array(int16Array.length);
                    for (let i = 0; i < int16Array.length; i++) {
                      float32Array[i] = int16Array[i] / 32768.0;
                    }
                    const aCtx = audioContextRef.current;
                    if (aCtx) {
                      const audioBuffer = aCtx.createBuffer(1, float32Array.length, 24000);
                      audioBuffer.getChannelData(0).set(float32Array);
                      const sourceNode = aCtx.createBufferSource();
                      sourceNode.buffer = audioBuffer;
                      sourceNode.connect(aCtx.destination);
                      
                      let playTime = nextPlayTimeRef.current;
                      if (playTime < aCtx.currentTime) {
                          // Buffer underrun occurred, add a tiny delay to build up buffer to prevent micro-stutters
                          playTime = aCtx.currentTime + 0.1;
                      }
                      sourceNode.start(playTime);
                      nextPlayTimeRef.current = playTime + audioBuffer.duration;
                    }
                  }
                  
                  // Handle optional output transcription
                  if (part.text) {
                    setModelMessage(prev => prev + part.text);
                  }
                }
              }
              
              if (message.serverContent.interrupted) {
                // Clear state if user interrupts
                nextPlayTimeRef.current = 0;
              }
            }
          },
          onerror: (err) => {
            console.error("Oracle Error:", err);
            setError(String(err));
            stopOracle();
          },
          onclose: () => {
            stopOracle();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          outputAudioTranscription: {},
          systemInstruction: `You are Oracle, an Apex-level Quantitative Trading AI. 
You can see my entire screen. If I ask you to analyze a chart and give me a signal, you MUST act as an elite Institutional ICT/SMC trader. 
Analyze the market structure, give me the exact bias (Buy/Sell), calculate the safest Stop Loss (SL) using local liquidity points, and dictate the Take Profit (TP) levels. 
Be concise, assertive, and brilliant. Also, describe what you see mathematically.

You have the ability to navigate the user to different pages in the app if they ask you to open a specific page.
Use the tool 'navigate_to_page' with the correct 'page' argument. Available pages are: 'interactive-chart', 'home', 'chat', 'history', 'products', 'journal', 'admin', 'autotrade', 'sniper'`,
          tools: [{
            functionDeclarations: [
              {
                name: 'navigate_to_page',
                description: 'Navigates the web app to a specific page or view.',
                parameters: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'string',
                      description: "The page to navigate to. Valid values: 'interactive-chart', 'home', 'chat', 'history', 'products', 'journal', 'admin', 'autotrade', 'sniper'",
                    }
                  },
                  required: ['page']
                }
              }
            ]
          }],
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize Oracle');
      stopOracle();
    }
  };

  useEffect(() => {
    return () => {
      stopOracle();
    };
  }, []);

  return (
    <>
      {/* Hidden Elements - rendered outside conditional blocks to prevent unmounting and losing media stream */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} width="1280" height="720" className="hidden" />

      {isHidden ? (
        isActive ? (
          <motion.button 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={onOpen}
            className="w-16 h-16 rounded-full bg-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title="Return to Oracle"
          >
            <div className="w-8 h-8 rounded-full border-[3px] border-white/80 border-t-transparent animate-spin" />
            <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-ping" />
          </motion.button>
        ) : null
      ) : (
        <div className={`min-h-screen w-full flex-grow text-white flex flex-col p-6 transition-all duration-700 relative overflow-hidden`}>
          <div className="absolute inset-0 z-0">
            <NeuralBackground />
          </div>
          
          {/* Glowing Edge Effect */}
          <AnimatePresence>
            {isActive && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none fixed inset-0 z-50 shadow-[inset_0_0_120px_rgba(59,130,246,0.6)] border-4 border-blue-500/50 rounded-xl"
                transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
              />
            )}
          </AnimatePresence>

          {/* Header */}
          <header className="relative z-10 flex justify-between items-center mb-10">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
              &larr; Back to App
            </button>
            <div className="flex flex-col items-end">
              <h1 className="text-3xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                The Oracle
              </h1>
              <p className="text-xs text-blue-400/70 tracking-[0.2em] uppercase mt-1">Multi-Modal Vision & Audio Matrix</p>
            </div>
          </header>

          {/* Main Content */}
          <div className="relative z-10 flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
            
            {!isActive ? (
              <div className="flex flex-col items-center gap-8 bg-black/50 p-10 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="w-64 h-64 rounded-full border-2 border-white/10 flex items-center justify-center relative bg-slate-900/50 backdrop-blur-sm">
                  <div className="absolute inset-0 rounded-full border border-blue-500/20 blur-sm" />
                  <div className="text-center p-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-sm text-slate-400 font-mono">Oracle is dormant.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    id="cameraToggle" 
                    checked={isCameraEnabled} 
                    onChange={e => setIsCameraEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-500 bg-black/50 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="cameraToggle" className="text-slate-400 font-mono text-sm cursor-pointer">Enable Camera</label>
                </div>

                <button 
                  onClick={() => startOracle(isCameraEnabled)}
                  disabled={isInitializing}
                  className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full font-black tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] disabled:opacity-50"
                >
                  {isInitializing ? 'Connecting Matrix...' : 'Awaken Oracle'}
                </button>
                <p className="text-xs text-slate-500 text-center max-w-sm">Requires microphone access for voice chat. If you enable the camera, you will be prompted for camera permissions.</p>
                {error && (
                  <div className="flex flex-col items-center gap-2 mt-4 text-center p-4 bg-red-950/50 rounded-xl border border-red-500/50">
                    <p className="text-red-400 text-sm max-w-sm font-semibold">{error}</p>
                    {error.includes("permission") && (
                        <p className="text-red-300 text-xs mt-2 max-w-sm">
                            <strong className="text-white">Note:</strong> Browsers often block permissions inside previews. Try opening the app in a new tab by clicking the button below, or the arrow in the top right.
                        </p>
                    )}
                    <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium text-xs shadow-md transition-colors">
                      Open App in New Tab
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-10 w-full">
                {/* Active Core */}
                <div className="relative">
                  <motion.div 
                    className="w-48 h-48 rounded-full bg-blue-500 flex items-center justify-center relative z-10 overflow-hidden"
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute inset-2 border border-black/20 rounded-full" />
                    <div className="absolute inset-6 border border-white/20 rounded-full" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/30" />
                    <div className="w-16 h-16 bg-white/90 rounded-full shadow-[0_0_40px_rgba(255,255,255,1)]" />
                  </motion.div>
                  
                  <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full z-0 pointer-events-none animate-pulse" />
                </div>

                {/* Transcription Feed */}
                <div className="w-full max-w-2xl bg-black/40 border border-blue-500/30 p-6 rounded-2xl backdrop-blur-md max-h-64 overflow-y-auto">
                  <h3 className="text-xs tracking-widest text-blue-400 uppercase font-bold mb-4">Neural Data Stream (Transcription)</h3>
                  {modelMessage ? (
                    <p className="font-mono text-sm leading-relaxed text-slate-300">
                      {modelMessage}
                    </p>
                  ) : (
                    <div className="flex items-center space-x-2 opacity-50">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                      <p className="font-mono text-xs">Awaiting voice or vision input...</p>
                    </div>
                  )}
                </div>

                {/* Text/Mic Controls */}
                <div className="flex items-center gap-4 bg-slate-900/80 p-2 rounded-full border border-blue-500/30">
                  <button 
                      onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}
                      className={`p-3 rounded-full transition-colors ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Toggle Text Input"
                  >
                    {inputMode === 'voice' ? <Keyboard size={20} /> : <MessageSquare size={20} />}
                  </button>

                  {inputMode === 'voice' && (
                    <button 
                      onClick={toggleMute}
                      className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-600 text-white' : 'text-green-400 hover:text-white'}`}
                      title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  )}

                  {inputMode === 'text' && (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={textInput} 
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendText()}
                            placeholder="Type to Oracle..."
                            className="bg-transparent border-b border-blue-500/50 px-2 py-1 outline-none text-sm w-48"
                        />
                         <button onClick={sendText} className="p-2 text-blue-500 hover:text-blue-300">
                            <Send size={20} />
                         </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={stopOracle}
                  className="px-8 py-3 bg-red-600/20 border border-red-500/50 hover:bg-red-600/40 text-red-400 rounded-full font-bold tracking-widest uppercase transition-all shadow-lg"
                >
                  Terminate Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

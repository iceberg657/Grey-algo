
import { GoogleGenAI, Modality } from "@google/genai";
import { executeGeminiCall, runWithRetry } from './retryUtils';

// Audio context for playback
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContext;
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function generateAndPlayAudio(text: string, onEnded: () => void): Promise<void> {
    try {
        // Wrapped in executeGeminiCall for key rotation
        const response = await executeGeminiCall(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            // Wrapped in runWithRetry to handle strict 3 RPM limits on specific model/key pair
            return await runWithRetry(async () => {
                return await ai.models.generateContent({
                  model: "gemini-2.5-flash-preview-tts",
                  contents: [{ parts: [{ text }] }],
                  config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Kore' }, // A neutral, professional male voice
                        },
                    },
                  },
                });
            }, 3, 3000); 
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            const ctx = getAudioContext();
            await ctx.resume(); // Ensure context is running
            
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1,
            );
            
            stopAudio(); // Stop any currently playing audio

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
            
            currentSource = source;
            source.onended = () => {
                if (currentSource === source) {
                    currentSource = null;
                }
                onEnded();
            };
        } else {
            throw new Error("Could not generate audio from text.");
        }
    } catch (e) {
        console.error("TTS generation failed after retries", e);
        throw e;
    }
}

export function stopAudio(): void {
    if (currentSource) {
        try {
            currentSource.stop();
        } catch(e) {
            console.warn("Could not stop audio source:", e);
        }
        currentSource.disconnect();
        currentSource = null;
    }
}

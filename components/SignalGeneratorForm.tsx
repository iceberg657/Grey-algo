import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisRequest, ImagePart, TradingStyle } from '../types';
import { RISK_REWARD_RATIOS, TRADING_STYLES } from '../constants';

const toBase64 = (file: File): Promise<ImagePart> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, data] = result.split(',');
      if (!meta || !data) {
          reject(new Error("Invalid file format for base64 conversion."));
          return;
      }
      const mimeType = meta.split(';')[0].split(':')[1];
      resolve({ data, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });

interface ImageFileState {
    file: File | null;
    previewUrl: string | null;
}

type ImageSlot = 'higher' | 'primary' | 'entry';

interface ImageUploadSlotProps {
    id: ImageSlot;
    label: string;
    required?: boolean;
    imageState: ImageFileState;
    onFileSelect: (id: ImageSlot, file: File) => void;
    onFileRemove: (id: ImageSlot) => void;
}

const ImageUploadSlot: React.FC<ImageUploadSlotProps> = ({ id, label, required = false, imageState, onFileSelect, onFileRemove }) => {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File | undefined) => {
        if (file) {
            const MAX_SIZE_MB = 10;
            if (!file.type.startsWith('image/')) {
                // Optionally show an error to the user
                return;
            }
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                 return;
            }
            onFileSelect(id, file);
        }
    };
    
    const dragHandlers = {
        onDragEnter: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
            }
        },
    };

    return (
        <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-dark-text/80">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                {...dragHandlers}
                className={`flex flex-col justify-center items-center w-full min-h-[8rem] p-2 transition-all duration-300 bg-gray-200/50 dark:bg-black/20 border-2 border-dashed rounded-xl ${isDragging ? 'animate-glowing-border' : 'border-gray-400/50 dark:border-green-500/40 hover:border-green-500/60'}`}
            >
                {imageState.previewUrl && imageState.file ? (
                     <div className="text-center">
                        <img src={imageState.previewUrl} alt={`${label} preview`} className="max-h-24 w-auto object-contain rounded-md shadow-md" />
                        <div className="flex items-center justify-center space-x-2 mt-2">
                             <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2 py-1 text-xs font-semibold text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                                aria-label={`Change ${label} image`}
                            >
                                Change
                            </button>
                            <button
                                type="button"
                                onClick={() => onFileRemove(id)}
                                className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md border border-red-200 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/60 dark:hover:bg-red-900/60 transition-colors"
                                aria-label={`Remove ${label} image`}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center cursor-pointer p-2" onClick={() => fileInputRef.current?.click()}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-2 text-gray-500 dark:text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0 0l-3-3m3 3l3-3" />
                        </svg>
                        <p className="text-xs text-gray-600 dark:text-dark-text/80"><span className="font-semibold text-green-600 dark:text-green-400">Click</span> or drag</p>
                    </div>
                )}
                 <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" accept="image/*" />
            </div>
        </div>
    );
};

interface SignalGeneratorFormProps {
    onSubmit: (request: AnalysisRequest) => void;
    isLoading: boolean;
}

export const SignalGeneratorForm: React.FC<SignalGeneratorFormProps> = ({ onSubmit, isLoading }) => {
    const [images, setImages] = useState<Record<ImageSlot, ImageFileState>>({
        higher: { file: null, previewUrl: null },
        primary: { file: null, previewUrl: null },
        entry: { file: null, previewUrl: null },
    });
    const [riskRewardRatio, setRiskRewardRatio] = useState<string>(RISK_REWARD_RATIOS[2]);
    const [tradingStyle, setTradingStyle] = useState<TradingStyle>(TRADING_STYLES[1]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            // FIX: Explicitly type `img` to fix "property 'previewUrl' does not exist on type 'unknown'" error,
            // which can happen with some TypeScript configurations for Object.values.
            Object.values(images).forEach((img: ImageFileState) => {
                if (img.previewUrl) {
                    URL.revokeObjectURL(img.previewUrl);
                }
            });
        };
        // FIX: Add `images` to dependency array to revoke object URLs when images change, preventing memory leaks.
    }, [images]);

    const handleFileSelect = (id: ImageSlot, file: File) => {
        setError(null);
        setImages(prev => {
            // Revoke old URL before creating a new one.
            const oldUrl = prev[id].previewUrl;
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            return {
                ...prev,
                [id]: { file, previewUrl: URL.createObjectURL(file) }
            };
        });
    };
    
    const handleFileRemove = (id: ImageSlot) => {
        setError(null);
         setImages(prev => {
            const oldUrl = prev[id].previewUrl;
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            return {
                ...prev,
                [id]: { file: null, previewUrl: null }
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (!images.primary.file) {
            setError('Please upload a chart for the Primary Timeframe.');
            return;
        }

        try {
            const primary = await toBase64(images.primary.file);
            const higher = images.higher.file ? await toBase64(images.higher.file) : undefined;
            const entry = images.entry.file ? await toBase64(images.entry.file) : undefined;
            
            onSubmit({ 
                images: { primary, higher, entry }, 
                riskRewardRatio, 
                tradingStyle 
            });

        } catch(err) {
            setError(err instanceof Error ? err.message : 'Could not process the image file(s).');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="risk-reward" className="block mb-2 text-sm font-medium text-gray-700 dark:text-dark-text/80">Risk/Reward</label>
                    <select
                        id="risk-reward"
                        value={riskRewardRatio}
                        onChange={(e) => setRiskRewardRatio(e.target.value)}
                        disabled={isLoading}
                        className="bg-gray-100 border border-gray-400 text-slate-800 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-black/50 dark:border-green-500/40 dark:placeholder-gray-400 dark:text-dark-text dark:focus:ring-green-500 dark:focus:border-green-500 disabled:opacity-50"
                    >
                        {RISK_REWARD_RATIOS.map((ratio) => (
                            <option key={ratio} value={ratio}>
                                {ratio}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="trading-style" className="block mb-2 text-sm font-medium text-gray-700 dark:text-dark-text/80">Trading Style</label>
                    <select
                        id="trading-style"
                        value={tradingStyle}
                        onChange={(e) => setTradingStyle(e.target.value as TradingStyle)}
                        disabled={isLoading}
                        className="bg-gray-100 border border-gray-400 text-slate-800 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-black/50 dark:border-green-500/40 dark:placeholder-gray-400 dark:text-dark-text dark:focus:ring-green-500 dark:focus:border-green-500 disabled:opacity-50"
                    >
                        {TRADING_STYLES.map((style) => (
                            <option key={style} value={style}>
                                {style}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="space-y-4">
                <p className="text-sm text-center text-gray-500 dark:text-dark-text-secondary">Upload up to 3 timeframes for a comprehensive analysis.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <ImageUploadSlot id="higher" label="Higher Timeframe" imageState={images.higher} onFileSelect={handleFileSelect} onFileRemove={handleFileRemove} />
                   <ImageUploadSlot id="primary" label="Primary Timeframe" required={true} imageState={images.primary} onFileSelect={handleFileSelect} onFileRemove={handleFileRemove} />
                   <ImageUploadSlot id="entry" label="Entry Timeframe" imageState={images.entry} onFileSelect={handleFileSelect} onFileRemove={handleFileRemove} />
                </div>
            </div>

            {error && <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white bg-green-600 hover:bg-green-500 focus:ring-4 focus:outline-none focus:ring-green-500/50 font-bold rounded-lg text-sm px-5 py-3 text-center disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center transform hover:scale-105 disabled:scale-100"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5A10 10 0 0 1 11.5 2h.05"/><path d="M22 12.5A10 10 0 0 1 12.5 22h-.05"/></svg>
                        Analyze Chart
                    </>
                )}
            </button>
        </form>
    );
};
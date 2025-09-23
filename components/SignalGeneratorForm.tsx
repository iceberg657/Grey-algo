
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
    description: string;
    required?: boolean;
    imageState: ImageFileState;
    onFileSelect: (id: ImageSlot, file: File) => void;
    onFileRemove: (id: ImageSlot) => void;
}

const ImageUploadSlot: React.FC<ImageUploadSlotProps> = ({ id, label, description, required = false, imageState, onFileSelect, onFileRemove }) => {
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
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text/80">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-2 h-8">{description}</p>
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
    const [isMultiDimensional, setIsMultiDimensional] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            Object.values(images).forEach((img: ImageFileState) => {
                if (img.previewUrl) {
                    URL.revokeObjectURL(img.previewUrl);
                }
            });
        };
    }, [images]);

    useEffect(() => {
        const root = document.documentElement;
        if (tradingStyle === 'Scalp') {
            root.classList.add('glow-sell');
        } else {
            root.classList.remove('glow-sell');
        }

        return () => {
            root.classList.remove('glow-sell');
        };
    }, [tradingStyle]);

    const handleFileSelect = (id: ImageSlot, file: File) => {
        setError(null);
        setImages(prev => {
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
            setError('Please upload a chart for the Tactical View.');
            return;
        }

        try {
            const primary = await toBase64(images.primary.file);
            const higher = images.higher.file ? await toBase64(images.higher.file) : undefined;
            const entry = images.entry.file ? await toBase64(images.entry.file) : undefined;
            
            onSubmit({ 
                images: { primary, higher, entry }, 
                riskRewardRatio, 
                tradingStyle,
                isMultiDimensional,
            });

        } catch(err) {
            setError(err instanceof Error ? err.message : 'Could not process the image file(s).');
        }
    };

    const descriptions = {
        default: {
            higher: "Optional: The 'big picture' view to establish the dominant market trend.",
            primary: "Your main chart. The AI will identify the specific trade setup and key levels here.",
            entry: "Optional: A lower timeframe chart to pinpoint the optimal entry trigger."
        },
        scalp: {
            higher: "Crucial: 1h/30m chart for dominant intraday trend.",
            primary: "Key: 15m chart to pinpoint high-probability zones like pullbacks.",
            entry: "Trigger: 5m/1m chart to find the exact entry confirmation."
        }
    };
    const currentDescriptions = tradingStyle === 'Scalp' ? descriptions.scalp : descriptions.default;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ImageUploadSlot
                    id="higher"
                    label={isMultiDimensional ? "Strategic View (Higher TF)" : "Higher Timeframe"}
                    description={currentDescriptions.higher}
                    imageState={images.higher}
                    onFileSelect={handleFileSelect}
                    onFileRemove={handleFileRemove}
                />
                <ImageUploadSlot
                    id="primary"
                    label={isMultiDimensional ? "Tactical View (Primary TF)" : "Primary Timeframe"}
                    description={currentDescriptions.primary}
                    required={true}
                    imageState={images.primary}
                    onFileSelect={handleFileSelect}
                    onFileRemove={handleFileRemove}
                />
                <ImageUploadSlot
                    id="entry"
                    label={isMultiDimensional ? "Execution View (Entry TF)" : "Entry Timeframe"}
                    description={currentDescriptions.entry}
                    imageState={images.entry}
                    onFileSelect={handleFileSelect}
                    onFileRemove={handleFileRemove}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-300 dark:border-green-500/30">
                 <div>
                    <label htmlFor="tradingStyle" className="block text-sm font-medium text-gray-700 dark:text-dark-text/80 mb-2">Trading Style</label>
                    <select
                        id="tradingStyle"
                        value={tradingStyle}
                        onChange={(e) => setTradingStyle(e.target.value as TradingStyle)}
                        className="bg-white dark:bg-dark-bg/80 border border-gray-300 dark:border-green-500/50 text-gray-900 dark:text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                    >
                        {TRADING_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="riskRewardRatio" className="block text-sm font-medium text-gray-700 dark:text-dark-text/80 mb-2">Risk/Reward Ratio</label>
                    <select
                        id="riskRewardRatio"
                        value={riskRewardRatio}
                        onChange={(e) => setRiskRewardRatio(e.target.value)}
                         className="bg-white dark:bg-dark-bg/80 border border-gray-300 dark:border-green-500/50 text-gray-900 dark:text-dark-text text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                    >
                        {RISK_REWARD_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-200/50 dark:bg-dark-bg/40 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text/80">Oracle Multi-Dimensional Analysis</span>
                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary">Synthesizes all charts for highest accuracy</span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsMultiDimensional(!isMultiDimensional)}
                    className={`${isMultiDimensional ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    aria-pressed={isMultiDimensional}
                >
                    <span className="sr-only">Toggle Analysis Mode</span>
                    <span className={`${isMultiDimensional ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
            </div>

            {error && (
                <div className="text-center p-2 text-sm text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg animate-fade-in">
                    {error}
                </div>
            )}

            <div className="pt-4">
                 <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full text-white bg-green-600 hover:bg-green-500 focus:ring-4 focus:outline-none focus:ring-green-500/50 font-bold rounded-lg text-base px-5 py-3.5 text-center transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : 'Analyze Chart'}
                 </button>
            </div>
        </form>
    );
};

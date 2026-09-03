
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AnalysisRequest, ImagePart, TradingStyle } from '../types';
import { RISK_REWARD_RATIOS, TRADING_STYLES } from '../constants';

const fileToImagePart = (file: File): Promise<ImagePart> =>
    new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("File is missing or undefined."));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (!dataUrl) {
                reject(new Error("Failed to read file as DataURL"));
                return;
            }
            
            const base64Data = dataUrl.split(',')[1];
            if (!base64Data) {
                reject(new Error("Failed to parse base64 data from file"));
                return;
            }

            // Identify MIME Type
            let mimeType = file.type || 'image/jpeg';
            const fileName = file.name || '';
            const isHeic = fileName.toLowerCase().endsWith('.heic') || fileName.toLowerCase().endsWith('.heif');
            if (isHeic) {
                mimeType = 'image/heic';
            }

            // If it's HEIC or HEIF, do not try to load into HTML5 Image (browsers don't support HEIC rendering natively),
            // instead resolve with direct base64 immediately! This is extremely robust!
            if (mimeType === 'image/heic' || mimeType === 'image/heif') {
                resolve({ data: base64Data, mimeType });
                return;
            }

            const img = new Image();
            
            // Set a timeout of 1.5 seconds. If the image doesn't load/render in 1.5 seconds,
            // resolve immediately with the raw base64 data instead of failing!
            const timeoutId = setTimeout(() => {
                img.onload = null;
                img.onerror = null;
                resolve({ data: base64Data, mimeType });
            }, 1500);

            img.onload = () => {
                clearTimeout(timeoutId);
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimensions for Gemini
                    const MAX_DIMENSION = 2048;
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = Math.round((height * MAX_DIMENSION) / width);
                            width = MAX_DIMENSION;
                        } else {
                            width = Math.round((width * MAX_DIMENSION) / height);
                            height = MAX_DIMENSION;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve({ data: base64Data, mimeType });
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 0.8 quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    const data = compressedDataUrl.split(',')[1];
                    
                    if (!data) {
                        resolve({ data: base64Data, mimeType });
                        return;
                    }
                    resolve({ data, mimeType: 'image/jpeg' });
                } catch (err) {
                    resolve({ data: base64Data, mimeType });
                }
            };
            img.onerror = () => {
                clearTimeout(timeoutId);
                resolve({ data: base64Data, mimeType });
            };
            img.src = dataUrl;
        };
        reader.onerror = () => reject(new Error("FileReader encountered an error reading the file."));
    });

interface ImageUploaderProps {
    id: string;
    title: string;
    subtitle: string;
    onFileChange: (file: File | null) => void;
    required?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, title, subtitle, onFileChange, required }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pasteAreaRef = useRef<HTMLTextAreaElement>(null);

    const handleFile = (file: File | null) => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (file && file.type.startsWith('image/')) {
            setImagePreview(URL.createObjectURL(file));
            onFileChange(file);
        } else {
            setImagePreview(null);
            onFileChange(null);
        }
    };

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    handleFile(blob);
                    if (pasteAreaRef.current) pasteAreaRef.current.value = '';
                    break;
                }
            }
        }
    };

    const handleAreaClick = (e: React.MouseEvent) => {
        // Only trigger file select if it wasn't a right-click (native paste)
        if (e.button === 0) {
            fileInputRef.current?.click();
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleMouseEnter = () => {
        if (pasteAreaRef.current) {
            pasteAreaRef.current.focus();
        }
    };

    return (
        <div 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onMouseEnter={handleMouseEnter}
            className={`relative group flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all focus-within:ring-2 focus-within:ring-emerald-500/50 ${
                isDragging ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:bg-slate-900/60'
            } min-h-[130px] overflow-hidden`}
        >
            {/* Hidden Input Layer for native context menu "Paste" support AND Click-to-Select */}
            <textarea
                ref={pasteAreaRef}
                onPaste={handlePaste}
                onClick={handleAreaClick}
                readOnly={true}
                inputMode="none"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full resize-none z-10 overflow-hidden"
                aria-label={`Paste area for ${title}`}
                title="Click to select from storage, or Right click to paste"
            />
            
            <input
                ref={fileInputRef}
                type="file"
                id={id}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleChange}
            />
            
            {imagePreview ? (
                <>
                    <img src={imagePreview} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
                        <span className="text-white text-xs font-bold">Change Image</span>
                    </div>
                    <button 
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white rounded-full p-1 leading-none shadow-lg z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                        aria-label={`Remove ${title} image`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-center text-xs">{title} {required && <span className="text-rose-500">*</span>}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider mt-0.5">{subtitle || 'Paste or Click to Select'}</p>
                </div>
            )}
        </div>
    );
};

interface SignalGeneratorFormProps {
    onSubmit: (request: AnalysisRequest, primaryImageFile: File) => void;
    isLoading: boolean;
}

export const SignalGeneratorForm: React.FC<SignalGeneratorFormProps> = ({ onSubmit, isLoading }) => {
    const [isMultiDimensional, setIsMultiDimensional] = useState(true);
    const [liteAnalysis, setLiteAnalysis] = useState(false);
    const [asset, setAsset] = useState<string>('');
    const [riskRewardRatio, setRiskRewardRatio] = useState<string>(RISK_REWARD_RATIOS[1] || '1:2.5');
    const [tradingStyle, setTradingStyle] = useState<TradingStyle>('day trading(1 to 2hrs)');
    const [images, setImages] = useState<{ higher?: File, primary?: File, execution?: File }>({});
    const [error, setError] = useState<string | null>(null);

    // Reset local state when formKey changes (which happens on "Back")
    useEffect(() => {
        setAsset('');
        setImages({});
        setError(null);
    }, []);

    const handleFileChange = (id: 'higher' | 'primary' | 'execution', file: File | null) => {
        setImages(prev => file ? { ...prev, [id]: file } : { ...prev, [id]: undefined });
    };
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!images.primary) {
            setError('The Tactical View (Primary TF) chart is required.');
            return;
        }

        if (isMultiDimensional && (!images.higher || !images.execution)) {
             setError('For Multi-Dimensional Analysis, all three charts are required.');
             return;
        }

        try {
            const imageParts: AnalysisRequest['images'] = {
                primary: await fileToImagePart(images.primary),
            };

            if (isMultiDimensional) {
                if (images.higher) imageParts.higher = await fileToImagePart(images.higher);
                if (images.execution) imageParts.execution = await fileToImagePart(images.execution);
            }
            
            onSubmit({ 
                images: imageParts, 
                asset: asset.toUpperCase().trim(),
                riskRewardRatio, 
                tradingStyle,
                isMultiDimensional,
                liteAnalysis
            }, images.primary);

        } catch(err) {
            console.error("Image processing error details:", err);
            setError(err instanceof Error ? `Image Processing Error: ${err.message}` : 'Failed to process one of the image files. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Pro Tip Card */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 p-3 rounded-2xl shadow-xs">
                <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 text-sky-500 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[10px] tracking-wider mb-0.5">Strategy Boosters</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-1.5">
                            For maximum AI precision, include key indicators in screenshots:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {['RSI (7/14)', 'MACD', 'Volume Profile', 'Liquidity Zones', 'S/R Levels', 'Fair Value Gaps'].map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-md text-[9px] font-bold text-sky-600 dark:text-sky-300 uppercase">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {/* Top-Down Toggle */}
                    <div className="flex items-center justify-center space-x-2 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-xs">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Top-Down</span>
                        <label htmlFor="analysis-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="analysis-toggle" 
                                className="sr-only peer"
                                checked={isMultiDimensional}
                                onChange={() => setIsMultiDimensional(!isMultiDimensional)}
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <span className={`text-xs font-bold transition-colors ${isMultiDimensional ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>
                            Multi-Dim
                        </span>
                    </div>

                    {/* Lite Analysis Toggle */}
                    <div className="flex items-center justify-center space-x-2 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-xs">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Standard</span>
                        <label htmlFor="lite-analysis-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="lite-analysis-toggle" 
                                className="sr-only peer"
                                checked={liteAnalysis}
                                onChange={() => setLiteAnalysis(!liteAnalysis)}
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                        </label>
                        <span className={`text-xs font-bold transition-colors ${liteAnalysis ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'}`}>
                            Lite Mode
                        </span>
                    </div>

                </div>

            </div>

            <motion.div layout className={`grid grid-cols-1 gap-2.5 ${isMultiDimensional ? 'md:grid-cols-3' : ''}`}>
                <AnimatePresence mode="popLayout">
                    {isMultiDimensional && (
                        <motion.div
                            key="higher"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ImageUploader 
                                id="higher" 
                                title="Strategic View" 
                                subtitle="H4 / H1 Timeframe"
                                onFileChange={(file) => handleFileChange('higher', file)}
                                required={isMultiDimensional}
                            />
                        </motion.div>
                    )}
                    
                    <motion.div layout key="primary">
                        <ImageUploader 
                            id="primary" 
                            title="Tactical View" 
                            subtitle="M15 Timeframe"
                            onFileChange={(file) => handleFileChange('primary', file)}
                            required
                        />
                    </motion.div>

                    {isMultiDimensional && (
                        <motion.div
                            key="execution"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ImageUploader 
                                id="execution" 
                                title="Execution View" 
                                subtitle="M5 / M1 Timeframe"
                                onFileChange={(file) => handleFileChange('execution', file)}
                                required={isMultiDimensional}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                 <div>
                    <label htmlFor="asset" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Asset Symbol
                    </label>
                    <input
                        type="text"
                        id="asset"
                        value={asset}
                        onChange={(e) => setAsset(e.target.value)}
                        placeholder="EUR/USD, BTC, US30..."
                        className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 block w-full p-2.5 outline-none transition-all uppercase placeholder:normal-case font-medium"
                    />
                </div>
                 <div>
                    <label htmlFor="tradingStyle" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Trading Style
                    </label>
                    <select
                        id="tradingStyle"
                        value={tradingStyle}
                        onChange={(e) => setTradingStyle(e.target.value as TradingStyle)}
                        className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 block w-full p-2.5 outline-none transition-all font-medium cursor-pointer"
                    >
                        {TRADING_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="riskRewardRatio" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Risk/Reward Ratio
                    </label>
                    <select
                        id="riskRewardRatio"
                        value={riskRewardRatio}
                        onChange={(e) => setRiskRewardRatio(e.target.value)}
                        className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 block w-full p-2.5 outline-none transition-all font-medium cursor-pointer font-mono"
                    >
                        {RISK_REWARD_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                    </select>
                </div>
            </div>

            {error && (
                <div className="text-center p-2 text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-xl animate-fade-in">
                    {error}
                </div>
            )}

            <div className="pt-1">
                 <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full text-white font-black rounded-xl text-xs uppercase tracking-wider px-4 py-3 text-center transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md backdrop-blur-md border cursor-pointer ${
                        tradingStyle.includes('Scalping')
                            ? 'bg-rose-500 hover:bg-rose-600 border-rose-400/50 shadow-rose-500/20' 
                            : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400/50 shadow-emerald-500/20'
                    }`}
                >
                    {isLoading ? (
                        <>
                             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing Chart...
                        </>
                    ) : (
                        <>
                            Analyze Chart
                        </>
                    )}
                 </button>
            </div>
        </form>
    );
};

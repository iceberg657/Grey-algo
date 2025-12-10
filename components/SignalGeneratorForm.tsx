
import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisRequest, ImagePart, TradingStyle } from '../types';
import { RISK_REWARD_RATIOS, TRADING_STYLES } from '../constants';

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

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging ? 'border-green-400 bg-dark-card/80' : 'border-gray-300 dark:border-green-500/50 hover:border-green-400 dark:hover:bg-dark-bg/60'
            } min-h-[160px] overflow-hidden`}
        >
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
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                        <span className="text-white font-semibold">Change Image</span>
                    </div>
                    <button 
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white rounded-full p-1 leading-none shadow-lg z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                        aria-label={`Remove ${title} image`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-2 text-gray-500 dark:text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="font-semibold text-gray-700 dark:text-dark-text text-center">{title} {required && <span className="text-red-500">*</span>}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary text-center">{subtitle}</p>
                </>
            )}
        </div>
    );
};

interface SignalGeneratorFormProps {
    onSubmit: (request: AnalysisRequest) => void;
    isLoading: boolean;
}

export const SignalGeneratorForm: React.FC<SignalGeneratorFormProps> = ({ onSubmit, isLoading }) => {
    const [isMultiDimensional, setIsMultiDimensional] = useState(true);
    const [riskRewardRatio, setRiskRewardRatio] = useState<string>(RISK_REWARD_RATIOS[2]);
    const [tradingStyle, setTradingStyle] = useState<TradingStyle>(TRADING_STYLES[1]);
    const [images, setImages] = useState<{ higher?: File, primary?: File, entry?: File }>({});
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (id: 'higher' | 'primary' | 'entry', file: File | null) => {
        setImages(prev => file ? { ...prev, [id]: file } : { ...prev, [id]: undefined });
    };
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!images.primary) {
            setError('The Tactical View (Primary TF) chart is required.');
            return;
        }

        if (isMultiDimensional && (!images.higher || !images.entry)) {
             setError('For Multi-Dimensional Analysis, all three charts are required.');
             return;
        }

        try {
            const imageParts: AnalysisRequest['images'] = {
                primary: await fileToImagePart(images.primary),
            };

            if (isMultiDimensional) {
                if (images.higher) imageParts.higher = await fileToImagePart(images.higher);
                if (images.entry) imageParts.entry = await fileToImagePart(images.entry);
            }
            
            onSubmit({ 
                images: imageParts, 
                riskRewardRatio, 
                tradingStyle,
                isMultiDimensional,
            });

        } catch(err) {
            setError('Failed to process one of the image files. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Pro Tip Card */}
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="mt-1 text-blue-400 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-400 dark:text-blue-300 mb-1">Optional: Automatic Indicator Detection</h4>
                        <p className="text-sm text-gray-700 dark:text-blue-100/80 mb-2">
                            Adding indicators to your chart is <strong>optional</strong>. If you include them, our AI will automatically detect and analyze them for better confluence:
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-blue-200/70 list-disc list-inside space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                            <li><strong className="text-gray-800 dark:text-blue-200">OBV:</strong> Volume confirmation</li>
                            <li><strong className="text-gray-800 dark:text-blue-200">RSI:</strong> Momentum divergence</li>
                            <li><strong className="text-gray-800 dark:text-blue-200">EMAs (50/200):</strong> Trend direction</li>
                            <li><strong className="text-gray-800 dark:text-blue-200">MACD:</strong> Trend strength</li>
                            <li><strong className="text-gray-800 dark:text-blue-200">Bollinger Bands:</strong> Volatility</li>
                            <li><strong className="text-gray-800 dark:text-blue-200">Stochastic:</strong> Momentum oscillator</li>
                            <li><strong className="text-gray-800 dark:text-blue-200">VWAP:</strong> Intraday value</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-center space-x-3 bg-gray-200 dark:bg-dark-bg/60 p-2 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text/80">Top-Down Analysis</span>
                    <label htmlFor="analysis-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            id="analysis-toggle" 
                            className="sr-only peer"
                            checked={isMultiDimensional}
                            onChange={() => setIsMultiDimensional(!isMultiDimensional)}
                        />
                        <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/50 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    </label>
                    <span className={`text-sm font-medium transition-colors ${isMultiDimensional ? 'text-green-500' : 'text-gray-700 dark:text-dark-text/80'}`}>
                        Oracle Multi-Dimensional Analysis
                    </span>
                </div>
            </div>

            {/* Changed from lg:grid-cols-3 to md:grid-cols-2 lg:grid-cols-3 for better tablet support */}
            <div className={`grid grid-cols-1 gap-4 ${isMultiDimensional ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
                {isMultiDimensional && (
                     <ImageUploader 
                        id="higher" 
                        title="Strategic View" 
                        subtitle="Higher TF"
                        onFileChange={(file) => handleFileChange('higher', file)}
                        required={isMultiDimensional}
                     />
                )}
                <ImageUploader 
                    id="primary" 
                    title="Tactical View" 
                    subtitle="Primary TF"
                    onFileChange={(file) => handleFileChange('primary', file)}
                    required
                />
                 {isMultiDimensional && (
                    <ImageUploader 
                        id="entry" 
                        title="Execution View" 
                        subtitle="Entry TF"
                        onFileChange={(file) => handleFileChange('entry', file)}
                        required={isMultiDimensional}
                    />
                 )}
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

            {error && (
                <div className="text-center p-2 text-sm text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg animate-fade-in">
                    {error}
                </div>
            )}

            <div className="pt-2">
                 <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full text-white font-bold rounded-lg text-base px-5 py-3.5 text-center transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:ring-4 focus:outline-none ${
                        tradingStyle === 'Scalp'
                        ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500/50 animate-glowing-border-red' 
                        : 'bg-green-600 hover:bg-green-500 focus:ring-green-500/50'
                    }`}
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

import React, { useState, useRef } from 'react';
import type { AnalysisRequest } from '../types';
import { RISK_REWARD_RATIOS } from '../constants';

const toBase64 = (file: File): Promise<{ data: string; mimeType: string }> =>
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


interface SignalGeneratorFormProps {
    onSubmit: (request: AnalysisRequest) => void;
    isLoading: boolean;
}

export const SignalGeneratorForm: React.FC<SignalGeneratorFormProps> = ({ onSubmit, isLoading }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [riskRewardRatio, setRiskRewardRatio] = useState<string>(RISK_REWARD_RATIOS[2]); // Default to 1:2
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File | undefined) => {
        setError(null);
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file (PNG, JPG, etc.).');
                return;
            }
            setImageFile(file);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!imageFile) {
            setError('Please upload a chart image to analyze.');
            return;
        }
        try {
            const image = await toBase64(imageFile);
            onSubmit({ image, riskRewardRatio });
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Could not process the image file.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="risk-reward" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Risk/Reward Ratio</label>
                <select
                    id="risk-reward"
                    value={riskRewardRatio}
                    onChange={(e) => setRiskRewardRatio(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-200 border border-slate-400 text-slate-800 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-slate-800 dark:border-slate-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-green-500 dark:focus:border-green-500 disabled:opacity-50"
                >
                    {RISK_REWARD_RATIOS.map((ratio) => (
                        <option key={ratio} value={ratio}>
                            {ratio}
                        </option>
                    ))}
                </select>
            </div>

            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex justify-center items-center w-full h-48 px-4 transition bg-gray-200/50 dark:bg-gray-800/30 border-2 border-gray-400/50 dark:border-gray-600/50 border-dashed rounded-xl cursor-pointer hover:border-gray-500/80 ${isDragging ? 'border-green-500 dark:border-green-400' : ''}`}
            >
                <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0 0l-3-3m3 3l3-3" />
                    </svg>
                    {imageFile ? (
                         <p className="text-sm text-green-600 dark:text-green-400">{imageFile.name}</p>
                    ) : (
                        <>
                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold text-green-600 dark:text-green-400">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
                        </>
                    )}
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full text-slate-800 bg-slate-300 hover:bg-slate-400/80 focus:ring-4 focus:outline-none focus:ring-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center border border-slate-400 dark:text-white dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600 dark:disabled:bg-slate-800"
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
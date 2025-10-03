
import React, { useState, useEffect, useCallback } from 'react';
import type { NewsArticle } from '../types';
import { getForexNews } from '../services/newsService';
import { ErrorMessage } from './ErrorMessage';
import { ThemeToggleButton } from './ThemeToggleButton';

interface NewsPageProps {
    onBack: () => void;
    onLogout: () => void;
}

const NewsItem: React.FC<{ article: NewsArticle }> = ({ article }) => (
    <li className="bg-gray-200/30 dark:bg-dark-bg/40 p-4 rounded-lg transition-all duration-200">
        <h3 className="font-bold text-gray-900 dark:text-green-400">
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {article.title}
            </a>
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-text/80 mt-2">{article.summary}</p>
        <div className="text-xs text-gray-500 dark:text-dark-text/60 mt-3 flex justify-between items-center">
            <span>{article.source}</span>
            <span>{new Date(article.date).toLocaleString()}</span>
        </div>
    </li>
);

export const NewsPage: React.FC<NewsPageProps> = ({ onBack, onLogout }) => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedNews = await getForexNews();
            // Sort news by date, newest first
            fetchedNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNews(fetchedNews);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch news.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-green-400">
                        Forex Market News
                    </h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button
                            onClick={onLogout}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={fetchNews}
                            disabled={isLoading}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-500 disabled:opacity-50 transition-colors"
                        >
                             {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" /></svg>
                            )}
                            Refresh
                        </button>
                    </div>

                    {isLoading && news.length === 0 ? (
                        <div className="text-center py-16">
                            <svg className="animate-spin mx-auto h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">Fetching latest news...</p>
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} />
                    ) : news.length > 0 ? (
                         <ul className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                            {news.map((article, index) => (
                                <NewsItem key={index} article={article} />
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-16">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h3m-3 4h3m-3 4h3m-3 4h3" />
                            </svg>
                            <h3 className="mt-2 text-lg font-medium text-gray-800 dark:text-green-400">No News Found</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">Could not fetch market news at this time.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
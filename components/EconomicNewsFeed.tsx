import React, { useState, useEffect } from 'react';
import { getForexNews } from '../services/newsService';
import type { NewsArticle } from '../types';

export const EconomicNewsFeed: React.FC = () => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const data = await getForexNews();
                setNews(data.slice(0, 10)); // Load 10 events
            } catch (error) {
                console.error("Failed to fetch news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
        const interval = setInterval(fetchNews, 60 * 60 * 1000); // Update hourly
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white/80 dark:bg-dark-card/90 backdrop-blur-2xl p-6 rounded-2xl border-2 border-white/5 shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-gray-100 mb-6">Economic & News Events</h3>
            {loading ? (
                <div className="text-gray-500">Loading events...</div>
            ) : (
                <div className="space-y-4">
                    {news.map((article, index) => (
                        <div key={index} className="border-b border-gray-200 dark:border-slate-800 pb-2">
                            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{article.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(article.date).toLocaleTimeString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

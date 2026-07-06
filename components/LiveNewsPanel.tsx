import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, ExternalLink, AlertCircle, Newspaper, Clock, ArrowRight } from 'lucide-react';

interface NewsArticle {
    uuid: string;
    title: string;
    description: string;
    snippet: string;
    url: string;
    image_url: string;
    published_at: string;
    source: string;
    relevance_score: number | null;
    entities?: Array<{
        symbol: string;
        name: string;
        type: string;
    }>;
}

// Highly realistic preview news when API key is not configured to guide the user visually
const PREVIEW_NEWS: NewsArticle[] = [
    {
        uuid: "prev-1",
        title: "Fed Minutes Signal Potential Shift in Interest Rate Trajectory",
        description: "Federal Reserve policymakers debated the future path of monetary policy, highlighting concerns over sticky service-sector inflation while acknowledging cooling labor markets.",
        snippet: "Federal Reserve policymakers debated the future path of monetary policy, highlighting concerns over sticky service-sector inflation...",
        url: "#",
        image_url: "",
        published_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
        source: "Financial Times (Preview)",
        relevance_score: 0.95,
        entities: [{ symbol: "USD", name: "US Dollar", type: "currency" }]
    },
    {
        uuid: "prev-2",
        title: "ECB Officials Cautious on Further Rate Cuts Amid Wage Growth",
        description: "European Central Bank board members expressed hesitation regarding consecutive rate cuts, pointing to robust wage increases across core eurozone economies.",
        snippet: "European Central Bank board members expressed hesitation regarding consecutive rate cuts, pointing to robust wage increases...",
        url: "#",
        image_url: "",
        published_at: new Date(Date.now() - 120 * 60000).toISOString(), // 2 hours ago
        source: "Reuters (Preview)",
        relevance_score: 0.88,
        entities: [{ symbol: "EUR", name: "Euro", type: "currency" }]
    },
    {
        uuid: "prev-3",
        title: "UK Inflation Holds Steady at Target, Bank of England Watches Sterling Strength",
        description: "The latest Consumer Price Index print from the ONS matches expectations, keeping pressure on the MPC for a balanced approach in upcoming voting sessions.",
        snippet: "The latest Consumer Price Index print from the ONS matches expectations, keeping pressure on the MPC...",
        url: "#",
        image_url: "",
        published_at: new Date(Date.now() - 240 * 60000).toISOString(), // 4 hours ago
        source: "Bloomberg (Preview)",
        relevance_score: 0.85,
        entities: [{ symbol: "GBP", name: "British Pound", type: "currency" }]
    }
];

export const LiveNewsPanel: React.FC = () => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [search, setSearch] = useState('');
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfigured, setIsConfigured] = useState(true);
    const [configMessage, setConfigMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

    const fetchNews = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const symbolsParam = selectedSymbols.length > 0 ? selectedSymbols.join(',') : '';
            const query = `/api/news?search=${encodeURIComponent(search)}${symbolsParam ? `&symbols=${encodeURIComponent(symbolsParam)}` : ''}`;
            
            const response = await fetch(query);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            const data = await response.json();
            
            setIsConfigured(data.isConfigured);
            if (!data.isConfigured) {
                setConfigMessage(data.message);
                setNews(PREVIEW_NEWS); // Use polished preview news
            } else {
                setNews(data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch live news:", err);
            setError(err instanceof Error ? err.message : "Failed to load live news");
            setNews(PREVIEW_NEWS); // Graceful preview fallback on error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [selectedSymbols]); // Auto-refresh when active currency filters change

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchNews();
    };

    const toggleSymbol = (symbol: string) => {
        if (selectedSymbols.includes(symbol)) {
            setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
        } else {
            setSelectedSymbols([...selectedSymbols, symbol]);
        }
    };

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="w-full flex flex-col gap-6">
            
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Search headlines or keywords..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500"
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                </form>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Filter Currencies:</span>
                    {currencies.map(curr => {
                        const isSelected = selectedSymbols.includes(curr);
                        return (
                            <button
                                key={curr}
                                onClick={() => toggleSymbol(curr)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    isSelected 
                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10' 
                                    : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900'
                                }`}
                            >
                                {curr}
                            </button>
                        );
                    })}
                    <button 
                        onClick={fetchNews}
                        disabled={isLoading}
                        className="ml-auto md:ml-4 p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-amber-500 rounded-2xl transition-colors disabled:opacity-50"
                        title="Refresh Headlines"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-amber-500" : ""} />
                    </button>
                </div>
            </div>

            {/* Missing API Key Guidance Banner */}
            {!isConfigured && (
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-6 rounded-3xl">
                    <AlertCircle className="shrink-0 text-amber-500 mt-0.5 sm:mt-0" size={24} />
                    <div>
                        <h4 className="font-bold text-sm">Demo Mode Active (MarketAux API Key Required)</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {configMessage || "To stream real-time institutional sentiment and headlines, set the MARKETAUX_API_KEY environment variable. Currently showing polished preview market news."}
                        </p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-medium">
                    Failed to fetch live updates: {error}. Displaying fallback preview headlines.
                </div>
            )}

            {/* News Stream Grid */}
            {isLoading && news.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 h-64 rounded-3xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {news.map((item, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={item.uuid}
                            className="flex flex-col bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-md">
                                    {item.source}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Clock size={12} />
                                    <span>{formatDate(item.published_at)}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-base leading-snug text-slate-900 dark:text-white mb-3 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors line-clamp-3">
                                {item.title}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-4 flex-grow">
                                {item.description || item.snippet}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                <div className="flex gap-1.5">
                                    {item.entities?.slice(0, 2).map(entity => (
                                        <span key={entity.symbol} className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
                                            {entity.symbol}
                                        </span>
                                    ))}
                                </div>

                                {item.url !== '#' ? (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        referrerPolicy="no-referrer"
                                        className="text-xs font-black uppercase tracking-widest text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
                                    >
                                        Read More <ExternalLink size={12} />
                                    </a>
                                ) : (
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                        Preview Link <ArrowRight size={12} />
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

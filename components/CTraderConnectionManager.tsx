import React, { useState, useEffect } from 'react';
import { Settings, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

export const CTraderConnectionManager: React.FC = () => {
    const [authUrl, setAuthUrl] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [isSystemConnected, setIsSystemConnected] = useState(false);
    const [isConfigured, setIsConfigured] = useState(true); // Default true to avoid flash
    const [statusData, setStatusData] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const status = await checkSystemStatus();
            checkConnection(status);
            fetchAuthUrl();
        };
        init();
    }, []);

    const getManualConfig = () => {
        try {
            const stored = localStorage.getItem('greyquant_user_settings');
            if (stored) {
                const settings = JSON.parse(stored);
                if (settings.ctraderClientId && settings.ctraderClientSecret) {
                    return {
                        clientId: settings.ctraderClientId,
                        clientSecret: settings.ctraderClientSecret
                    };
                }
            }
        } catch (e) {}
        return null;
    };

    const checkSystemStatus = async () => {
        try {
            const config = getManualConfig();
            const url = new URL('/api/ctrader/status', window.location.origin);
            if (config) {
                url.searchParams.set('clientId', config.clientId);
                url.searchParams.set('clientSecret', config.clientSecret);
            }
            const res = await fetch(url.toString());
            if (res.ok) {
                const data = await res.json();
                console.log('[cTrader] System Status:', data);
                setStatusData(data);
                setIsSystemConnected(data.systemConnected);
                setIsConfigured(data.configured);
                if (data.systemConnected && data.systemAccountId) {
                    setSelectedAccountId(data.systemAccountId);
                }
                return data;
            }
        } catch (e) {
            console.error('[cTrader] Failed to fetch cTrader status', e);
        }
        return null;
    };

    const checkConnection = (systemStatus?: any) => {
        const token = localStorage.getItem('ctrader_access_token');
        if (token) {
            setIsConnected(true);
            fetchAccounts(token);
        } else if (systemStatus?.systemConnected) {
            setIsConnected(true);
            fetchAccounts(); // Fetch using system token on backend
        }

        const savedAccount = localStorage.getItem('ctrader_account_id');
        if (savedAccount) setSelectedAccountId(savedAccount);
        else if (systemStatus?.systemAccountId) setSelectedAccountId(systemStatus.systemAccountId);
    };

    const fetchAccounts = async (token?: string) => {
        try {
            const config = getManualConfig();
            const url = new URL('/api/ctrader/accounts', window.location.origin);
            if (config) {
                url.searchParams.set('clientId', config.clientId);
                url.searchParams.set('clientSecret', config.clientSecret);
            }

            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            
            const res = await fetch(url.toString(), { headers });
            if (res.ok) {
                const data = await res.json();
                setAccounts(data.accounts || []);
            }
        } catch (e) {
            console.error('Failed to fetch accounts', e);
        }
    };

    const fetchAuthUrl = async () => {
        try {
            const config = getManualConfig();
            const url = new URL('/api/ctrader/auth-url', window.location.origin);
            if (config) {
                url.searchParams.set('clientId', config.clientId);
                url.searchParams.set('clientSecret', config.clientSecret);
            }
            const res = await fetch(url.toString());
            if (res.ok) {
                const data = await res.json();
                setAuthUrl(data.authUrl);
            }
        } catch (e) {
            console.error('Failed to fetch auth url', e);
        }
    };

    const handleConnect = async () => {
        if (!authCode.trim()) {
            setError('Please enter the auth code or the redirect URL containing the code.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            let codeToExchange = authCode.trim();
            if (codeToExchange.includes('code=')) {
                try {
                    const url = new URL(codeToExchange);
                    codeToExchange = url.searchParams.get('code') || codeToExchange;
                } catch {
                    // Try regex if not a valid URL
                    const match = codeToExchange.match(/code=([^&]+)/);
                    if (match) {
                        codeToExchange = match[1];
                    }
                }
            }

            const config = getManualConfig();
            const res = await fetch('/api/ctrader/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: codeToExchange,
                    clientId: config?.clientId,
                    clientSecret: config?.clientSecret
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to exchange token');
            }

            localStorage.setItem('ctrader_access_token', data.accessToken);
            if (data.refreshToken) localStorage.setItem('ctrader_refresh_token', data.refreshToken);
            localStorage.setItem('ctrader_token_expiry', (Date.now() + (data.expiresIn * 1000)).toString());
            
            setIsConnected(true);
            setAuthCode('');
            fetchAccounts(data.accessToken);
        } catch (e: any) {
            setError(e.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem('ctrader_access_token');
        localStorage.removeItem('ctrader_refresh_token');
        localStorage.removeItem('ctrader_token_expiry');
        
        if (isSystemConnected) {
            // If system connected, we can't truly disconnect unless we ignore the system token
            // But usually the user wants to clear their local session.
            // We'll just refresh the status.
            checkSystemStatus().then(status => {
                if (status?.systemConnected) {
                    setIsConnected(true);
                } else {
                    setIsConnected(false);
                }
            });
        } else {
            setIsConnected(false);
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">cTrader Open API</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Connect your trading account</p>
                    </div>
                </div>
                <div>
                    {!isConfigured && !isConnected && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md animate-pulse">
                            Missing Credentials
                        </span>
                    )}
                    {isConnected ? (
                        <span className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
                                <CheckCircle className="w-3 h-3" /> Connected
                            </span>
                            {isSystemConnected && !localStorage.getItem('ctrader_access_token') && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 uppercase font-bold tracking-tight">System Environment Mode</span>
                            )}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md">
                            <XCircle className="w-3 h-3" /> Disconnected
                        </span>
                    )}
                </div>
            </div>

            {!isConnected ? (
                <div className="space-y-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        {!isConfigured && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mb-1 uppercase tracking-tight">Missing Server Configuration</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Client ID not detected in environment. Ensure <b>VITE_CTRADER_CLIENT_ID</b> and <b>VITE_CTRADER_CLIENT_SECRET</b> are set in your Vercel project settings.
                                </p>
                                {statusData && statusData.debug && (
                                    <div className="mt-2">
                                        <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Detected Keys:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {statusData.debug.envKeys.length > 0 ? statusData.debug.envKeys.map((k: string) => (
                                                <span key={k} className="text-[8px] bg-slate-200 dark:bg-slate-700 px-1 rounded">{k}</span>
                                            )) : <span className="text-[8px] italic">None</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="mb-2">1. Click the button below to authorize the application.</p>
                        {authUrl ? (
                            <a 
                                href={authUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                Authorize via cTrader <ExternalLink className="w-4 h-4" />
                            </a>
                        ) : (
                            <div className="px-4 py-2 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg w-48 h-9" />
                        )}
                        <p className="mt-4 mb-2">2. After authorizing, you will be redirected to an empty page. Copy the URL from your browser's address bar and paste it below.</p>
                        <input
                            type="text"
                            value={authCode}
                            onChange={(e) => setAuthCode(e.target.value)}
                            placeholder="Paste the redirect URL or authorization code here"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    {error && (
                        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-2 rounded-md">
                            {error}
                        </div>
                    )}
                    <button
                        onClick={handleConnect}
                        disabled={isLoading || !authCode.trim()}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        {isLoading ? 'Connecting...' : 'Connect Account'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                        Your cTrader account is securely connected. Select the account you want to trade with.
                    </div>
                    {accounts.length > 0 ? (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Trading Account</label>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => {
                                    setSelectedAccountId(e.target.value);
                                    localStorage.setItem('ctrader_account_id', e.target.value);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="" disabled>Select an account</option>
                                {accounts.map(acc => (
                                    <option key={acc.ctidTraderAccountId} value={acc.ctidTraderAccountId}>
                                        {acc.isLive ? 'Live' : 'Demo'} - {acc.ctidTraderAccountId}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="text-xs text-amber-600">Loading accounts...</div>
                    )}
                    <button
                        onClick={handleDisconnect}
                        className="w-full py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold transition-colors"
                    >
                        Disconnect Account
                    </button>
                </div>
            )}
        </div>
    );
};

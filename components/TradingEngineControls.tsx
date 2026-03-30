import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const TradingEngineControls: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<'manual' | 'auto'>('manual');
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(`${protocol}://${window.location.host}`);
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'ENGINE_STATE') {
                setIsRunning(data.state.isRunning);
                setMode(data.state.mode);
            }
        };
        setWs(socket);
        return () => socket.close();
    }, []);

    const toggleEngine = () => {
        if (ws) {
            ws.send(JSON.stringify({ type: 'TOGGLE_ENGINE', isRunning: !isRunning }));
        }
    };

    const toggleMode = () => {
        if (ws) {
            const newMode = mode === 'manual' ? 'auto' : 'manual';
            ws.send(JSON.stringify({ type: 'SET_MODE', mode: newMode }));
        }
    };

    return (
        <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Trading Engine</h2>
            <div className="flex items-center justify-between mb-6">
                <button 
                    onClick={toggleEngine}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                >
                    {isRunning ? 'Stop Engine' : 'Start Engine'}
                </button>
                <button 
                    onClick={toggleMode}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
                >
                    Mode: {mode.toUpperCase()}
                </button>
            </div>
            <div className="text-slate-400 text-sm">
                Status: {isRunning ? <span className="text-green-400">Running</span> : <span className="text-red-400">Stopped</span>}
            </div>
        </div>
    );
};

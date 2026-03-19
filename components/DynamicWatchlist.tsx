import React from 'react';

export const DynamicWatchlist = () => (
  <div className="p-4 bg-zinc-800/60 dark:bg-zinc-800/40 backdrop-blur-md rounded-xl border border-zinc-700/50 shadow-lg">
    <h2 className="text-lg font-semibold text-white mb-4">Dynamic Watchlist</h2>
    <div className="space-y-2">
      <div className="flex justify-between items-center bg-zinc-900/50 dark:bg-zinc-900/30 backdrop-blur-sm p-2 rounded border border-zinc-700/30">
        <span className="text-white font-medium">EURUSD</span>
        <span className="text-green-400">+0.25%</span>
      </div>
      <div className="flex justify-between items-center bg-zinc-900/50 dark:bg-zinc-900/30 backdrop-blur-sm p-2 rounded border border-zinc-700/30">
        <span className="text-white font-medium">XAUUSD</span>
        <span className="text-red-400">-0.12%</span>
      </div>
      <div className="mt-4">
        <p className="text-zinc-400 text-xs mb-1">Market Sentiment Index</p>
        <div className="w-full bg-zinc-700 h-2 rounded-full">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
        </div>
      </div>
    </div>
  </div>
);

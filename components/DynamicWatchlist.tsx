import React from 'react';

export const DynamicWatchlist = () => (
  <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
    <h2 className="text-lg font-semibold text-white mb-4">Dynamic Watchlist</h2>
    <div className="space-y-2">
      <div className="flex justify-between items-center bg-zinc-900 p-2 rounded">
        <span className="text-white font-medium">EURUSD</span>
        <span className="text-green-400">+0.25%</span>
      </div>
      <div className="flex justify-between items-center bg-zinc-900 p-2 rounded">
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

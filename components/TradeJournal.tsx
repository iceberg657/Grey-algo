import React from 'react';

export const TradeJournal = () => (
  <div className="p-4 bg-zinc-800/60 dark:bg-zinc-800/40 backdrop-blur-md rounded-xl border border-zinc-700/50 shadow-lg">
    <h2 className="text-lg font-semibold text-white mb-4">Trade Journal</h2>
    <div className="space-y-2">
      <div className="text-sm text-white">
        <span className="font-bold text-green-400">WIN</span> - EURUSD - +1.5%
      </div>
      <div className="text-sm text-white">
        <span className="font-bold text-red-400">LOSS</span> - XAUUSD - -0.8%
      </div>
    </div>
  </div>
);

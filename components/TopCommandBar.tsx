import React from 'react';

export const TopCommandBar = () => (
  <div className="p-4 bg-zinc-900/60 dark:bg-zinc-900/40 backdrop-blur-md border-b border-zinc-800/50 flex justify-between items-center shadow-md">
    <h1 className="text-xl font-bold text-white">Trading Dashboard</h1>
    <div className="flex gap-4">
      <span className="text-red-500 font-semibold animate-pulse">Alert: US CPI Data Release</span>
      <button className="bg-zinc-700/50 dark:bg-zinc-700/30 backdrop-blur-sm border border-zinc-600/30 text-white px-3 py-1 rounded hover:bg-zinc-600/50 transition-colors">Refresh</button>
      <button className="bg-zinc-700/50 dark:bg-zinc-700/30 backdrop-blur-sm border border-zinc-600/30 text-white px-3 py-1 rounded hover:bg-zinc-600/50 transition-colors">Seasonal Mode</button>
    </div>
  </div>
);

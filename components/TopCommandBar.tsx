import React from 'react';

export const TopCommandBar = () => (
  <div className="p-4 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800/50 flex justify-between items-center shadow-md">
    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trading Dashboard</h1>
    <div className="flex gap-4">
      <button className="bg-gray-100 dark:bg-zinc-700/30 backdrop-blur-sm border border-gray-300 dark:border-zinc-600/30 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-600/50 transition-colors">Refresh</button>
      <button className="bg-gray-100 dark:bg-zinc-700/30 backdrop-blur-sm border border-gray-300 dark:border-zinc-600/30 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-600/50 transition-colors">Seasonal Mode</button>
    </div>
  </div>
);

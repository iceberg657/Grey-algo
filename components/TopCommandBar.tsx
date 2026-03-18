import React from 'react';

export const TopCommandBar = () => (
  <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
    <h1 className="text-xl font-bold text-white">Trading Dashboard</h1>
    <div className="flex gap-4">
      <span className="text-red-500 font-semibold animate-pulse">Alert: US CPI Data Release</span>
      <button className="bg-zinc-700 text-white px-3 py-1 rounded">Refresh</button>
      <button className="bg-zinc-700 text-white px-3 py-1 rounded">Seasonal Mode</button>
    </div>
  </div>
);

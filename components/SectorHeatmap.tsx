import React from 'react';

export const SectorHeatmap = () => (
  <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
    <h2 className="text-lg font-semibold text-white mb-4">Sector Heatmap</h2>
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Tech</span>
          <span>Hot</span>
        </div>
        <div className="w-full bg-zinc-700 h-3 rounded-full">
          <div className="bg-red-500 h-3 rounded-full" style={{ width: '85%' }}></div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Energy</span>
          <span>Ranging</span>
        </div>
        <div className="w-full bg-zinc-700 h-3 rounded-full">
          <div className="bg-blue-500 h-3 rounded-full" style={{ width: '30%' }}></div>
        </div>
      </div>
    </div>
  </div>
);

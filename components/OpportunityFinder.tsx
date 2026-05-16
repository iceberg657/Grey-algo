import React from 'react';

export const OpportunityFinder = () => (
  <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
    <h2 className="text-lg font-semibold text-white mb-4">Opportunity Finder</h2>
    <div className="flex gap-2 mb-4">
      <button className="bg-zinc-700 text-white px-2 py-1 rounded text-xs">Performance</button>
      <button className="bg-zinc-700 text-white px-2 py-1 rounded text-xs">Volume</button>
      <button className="bg-zinc-700 text-white px-2 py-1 rounded text-xs">Technical</button>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="h-16 bg-zinc-900 rounded border border-zinc-700 flex items-center justify-center text-white text-xs">
          Asset {i+1}
        </div>
      ))}
    </div>
  </div>
);

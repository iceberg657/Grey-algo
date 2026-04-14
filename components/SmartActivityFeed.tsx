import React from 'react';

export const SmartActivityFeed = () => (
  <div className="p-4 bg-zinc-800/60 dark:bg-zinc-800/40 backdrop-blur-md rounded-xl border border-zinc-700/50 shadow-lg">
    <h2 className="text-lg font-semibold text-white mb-4">Smart Activity Feed</h2>
    <div className="space-y-3">
      <div className="p-3 bg-zinc-900/50 dark:bg-zinc-900/30 backdrop-blur-sm rounded-lg border border-zinc-700/30">
        <span className="text-blue-400 text-xs font-bold uppercase">News</span>
        <p className="text-white text-sm">Fed Chair Powell speaks on inflation.</p>
        <span className="text-zinc-500 text-xs">10:00 AM</span>
      </div>
      <div className="p-3 bg-zinc-900/50 dark:bg-zinc-900/30 backdrop-blur-sm rounded-lg border border-zinc-700/30">
        <span className="text-red-400 text-xs font-bold uppercase">Alert</span>
        <p className="text-white text-sm">EURUSD Breakout detected.</p>
        <span className="text-zinc-500 text-xs">10:05 AM</span>
      </div>
    </div>
  </div>
);

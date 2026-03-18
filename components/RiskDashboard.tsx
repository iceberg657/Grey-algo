import React from 'react';

export const RiskDashboard = () => (
  <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
    <h2 className="text-lg font-semibold text-white mb-4">Risk Dashboard</h2>
    <div className="space-y-4">
      <div>
        <p className="text-zinc-400 text-xs mb-1">Daily Drawdown</p>
        <div className="w-full bg-zinc-700 h-2 rounded-full">
          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }}></div>
        </div>
      </div>
      <div>
        <p className="text-zinc-400 text-xs mb-1">Max Drawdown</p>
        <div className="w-full bg-zinc-700 h-2 rounded-full">
          <div className="bg-red-500 h-2 rounded-full" style={{ width: '10%' }}></div>
        </div>
      </div>
    </div>
  </div>
);

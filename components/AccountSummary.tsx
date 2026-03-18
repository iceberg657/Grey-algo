import React from 'react';

export const AccountSummary = () => (
  <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
    <h2 className="text-lg font-semibold text-white mb-4">Account Summary</h2>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-zinc-400">Balance:</span>
        <span className="text-white font-bold">$100,000</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Equity:</span>
        <span className="text-white font-bold">$102,500</span>
      </div>
    </div>
  </div>
);

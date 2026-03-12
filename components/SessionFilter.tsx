import React, { useState, useEffect } from 'react';
import { fetchSessionAnalysis } from '../services/sessionService';

const SESSIONS = ['Asian', 'London', 'New York'];

export const SessionFilter: React.FC = () => {
  const [session, setSession] = useState(SESSIONS[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSessionAnalysis(session);
      setData(result);
    } catch (err) {
      setError('Failed to fetch analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(interval);
  }, [session]);

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Session Market Analysis</h2>
      <div className="flex gap-4 mb-6">
        {SESSIONS.map(s => (
          <button
            key={s}
            onClick={() => setSession(s)}
            className={`px-4 py-2 rounded ${session === s ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {data && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">{session} Session Analysis</h3>
          <pre className="bg-gray-800 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

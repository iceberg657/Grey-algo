export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { accountId } = req.query;
  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ error: 'Missing accountId' });
  }

  try {
    const token = process.env.METAAPI_TOKEN;
    if (!token) throw new Error('METAAPI_TOKEN not set');

    const metaApiFetch = async (endpoint: string) => {
      const response = await fetch(`https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai${endpoint}`, {
        method: 'GET',
        headers: {
          'auth-token': token,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`MetaAPI request failed (${response.status})`);
      }
      return response.status === 204 ? null : response.json();
    };

    // Fetch account info
    const info = await metaApiFetch(`/users/current/accounts/${accountId}/account-information`).catch(() => null);
    
    // Fetch positions
    const positions = await metaApiFetch(`/users/current/accounts/${accountId}/positions`).catch(() => []);
    
    // Fetch history (last 30 days)
    const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();
    const history = await metaApiFetch(`/users/current/accounts/${accountId}/history-deals/time/${startTime}/${endTime}`).catch(() => []);

    res.json({ info, positions, history });
  } catch (error) {
    console.error('Error fetching MT5 data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch MT5 data' });
  }
}

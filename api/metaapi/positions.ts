export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'Missing accountId' });
    }

    const token = process.env.METAAPI_TOKEN;
    if (!token) throw new Error('METAAPI_TOKEN not set');

    const response = await fetch(`https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/positions`, {
      method: 'GET',
      headers: {
        'auth-token': token,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `MetaAPI request failed (${response.status})`;
      try {
        const error = JSON.parse(text);
        errorMsg = error.message || errorMsg;
      } catch (e) {
        errorMsg = `${errorMsg}: ${text}`;
      }
      throw new Error(errorMsg);
    }

    const positions = response.status === 204 ? [] : await response.json();
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch positions' });
  }
}

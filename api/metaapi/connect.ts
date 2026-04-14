export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: 'Missing accountId' });
    }

    const token = process.env.METAAPI_TOKEN;
    if (!token) throw new Error('METAAPI_TOKEN not set');

    const response = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/deploy`, {
      method: 'POST',
      headers: {
        'auth-token': token,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `MetaAPI Provisioning request failed (${response.status})`;
      try {
        const error = JSON.parse(text);
        errorMsg = error.message || errorMsg;
      } catch (e) {
        errorMsg = `${errorMsg}: ${text}`;
      }
      throw new Error(errorMsg);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error connecting to MetaAPI:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to connect to MetaAPI' });
  }
}

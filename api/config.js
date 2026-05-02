export default function handler(req, res) {
  const primaryKey = process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY;
  res.status(200).json({ 
    apiKey: primaryKey,
    keys: {
      k1: primaryKey,
      k2: process.env.API_KEY_2,
      k3: process.env.API_KEY_3,
      k4: process.env.API_KEY_4,
      k5: process.env.API_KEY_5,
      k6: process.env.API_KEY_6,
      k7: process.env.API_KEY_7,
      k8: process.env.API_KEY_8,
      k9: process.env.API_KEY_9,
    }
  });
}

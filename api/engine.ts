export default async function engineHandler(req, res) {
  if (req.path.endsWith('/status')) {
    res.json({ isRunning: false });
  } else if (req.path.endsWith('/start')) {
    res.json({ success: true });
  } else if (req.path.endsWith('/stop')) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}

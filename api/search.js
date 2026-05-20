import { searchMusic } from './services/ytmusicService.js';

export default async function handler(req, res) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    const results = await searchMusic(q);
    res.json(results);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ success: false, error: 'Failed to search music' });
  }
}

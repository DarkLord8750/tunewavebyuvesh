import { streamCache } from './services/cacheService.js';
import { ytDlpService } from './services/ytDlpService.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid VIDEO_ID is required' });
  }

  try {
    // Check cache first
    const cachedStream = streamCache.get(id);
    if (cachedStream) {
      console.log(`[Cache Hit] Serving stream for ${id}`);
      return res.json({
        success: true,
        streamUrl: cachedStream
      });
    }

    console.log(`[Cache Miss] Fetching stream for ${id}`);
    const streamUrl = await ytDlpService.extractStreamUrl(id);

    // Save to cache
    streamCache.set(id, streamUrl);

    return res.json({
      success: true,
      streamUrl: streamUrl
    });

  } catch (error) {
    console.error(`[Stream Error] ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to extract audio stream',
      details: error.message
    });
  }
}

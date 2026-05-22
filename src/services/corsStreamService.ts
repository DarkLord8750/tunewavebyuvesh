/**
 * CORS Stream Service
 * Handles music streaming through CORS proxies when direct access is blocked
 * Used for educational purposes to bypass firewall restrictions
 */

const CORS_PROXIES = [
  {
    name: 'cors.uxer.dev',
    format: (url: string) => `https://cors.uxer.dev?url=${encodeURIComponent(url)}`
  },
  {
    name: 'allorigins.win',
    format: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  },
  {
    name: 'proxy.cors.sh',
    format: (url: string) => `https://proxy.cors.sh/${encodeURIComponent(url)}`
  },
  {
    name: 'thingproxy.freehostip.com',
    format: (url: string) => `https://thingproxy.freehostip.com/fetch/${encodeURIComponent(url)}`
  }
];

const PIPED_API = 'https://pipedapi.kavin.rocks/streams/';
const TIMEOUT = 15000; // 15 seconds timeout per proxy

/**
 * Fetch stream URL with timeout
 */
const fetchWithTimeout = (url: string, timeout: number): Promise<Response> => {
  return Promise.race([
    fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

/**
 * Get audio stream URL using CORS proxy
 * Tries multiple proxies until one works
 */
export const getStreamUrlViaCorsProxy = async (videoId: string): Promise<string | null> => {
  if (!videoId) {
    console.error('[CORS] No video ID provided');
    return null;
  }

  const pipedUrl = `${PIPED_API}${videoId}`;

  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy.format(pipedUrl);
      console.log(`[CORS] Attempting: ${proxy.name}`);

      const res = await fetchWithTimeout(proxyUrl, TIMEOUT);

      if (!res.ok) {
        console.warn(`[CORS] ${proxy.name} returned status ${res.status}`);
        continue;
      }

      const data = await res.json();

      // Check if response has audio streams
      if (data?.audioStreams && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
        // Sort by bitrate descending to get highest quality
        const sortedStreams = data.audioStreams.sort(
          (a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0)
        );

        const bestStream = sortedStreams[0];

        if (bestStream?.url) {
          const bitrate = bestStream.bitrate ? Math.round(bestStream.bitrate / 1000) : 'unknown';
          console.log(`✅ [CORS] Success via ${proxy.name} - ${bitrate}kbps`);
          return bestStream.url;
        }
      }

      console.warn(`[CORS] ${proxy.name} returned no audio streams`);
    } catch (error: any) {
      console.warn(`[CORS] ${proxy.name} failed:`, error.message);
      continue;
    }
  }

  console.error('[CORS] All proxies exhausted - stream unavailable');
  return null;
};

/**
 * Get stream URL (tries direct first, then CORS proxy as fallback)
 */
export const getStreamUrl = async (videoId: string): Promise<string | null> => {
  if (!videoId) return null;

  // First try direct Piped API (in case firewall is not blocking it)
  try {
    console.log(`[Stream] Trying direct Piped API for ${videoId}`);
    const res = await fetchWithTimeout(`${PIPED_API}${videoId}`, TIMEOUT);

    if (res.ok) {
      const data = await res.json();
      if (data?.audioStreams?.[0]?.url) {
        console.log('✅ [Stream] Direct Piped API successful');
        return data.audioStreams[0].url;
      }
    }
  } catch (error: any) {
    console.warn('[Stream] Direct Piped failed, falling back to CORS proxy:', error.message);
  }

  // Fallback to CORS proxy
  return await getStreamUrlViaCorsProxy(videoId);
};

/**
 * Health check - test if CORS proxy works
 */
export const testCorsProxy = async (): Promise<boolean> => {
  try {
    const testUrl = `${PIPED_API}dQw4w9WgXcQ`; // Rick Roll video ID
    const result = await getStreamUrlViaCorsProxy(testUrl);
    return !!result;
  } catch (error) {
    return false;
  }
};

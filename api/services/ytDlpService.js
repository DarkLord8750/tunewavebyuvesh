import ytDlp from 'yt-dlp-exec';

const YT_BASE = 'https://www.youtube.com/watch?v=';

export const ytDlpService = {
  async extractStreamUrl(videoId, retries = 1) {
    console.log(`[Stream API] Fetching high-quality stream for ${videoId}`);

    // PRIMARY METHOD: Piped API (Extremely Fast REST API)
    try {
      const pipedRes = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
      if (pipedRes.ok) {
        const data = await pipedRes.json();
        if (data && data.audioStreams && data.audioStreams.length > 0) {
          // Sort by bitrate descending to get highest quality audio
          const sortedStreams = data.audioStreams.sort((a, b) => b.bitrate - a.bitrate);
          const bestStreamUrl = sortedStreams[0].url;
          console.log(`[Piped API] Success! Found ${Math.round(sortedStreams[0].bitrate / 1000)}kbps audio stream.`);
          return bestStreamUrl;
        }
      }
    } catch (fallbackError) {
      console.warn(`[Piped API] Failed or timed out, falling back to yt-dlp:`, fallbackError.message);
    }

    // SECONDARY METHOD: yt-dlp (Slower child process, highly reliable fallback)
    const url = `${YT_BASE}${videoId}`;
    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[yt-dlp] Extracting stream for ${videoId} (Attempt ${i + 1})`);
        const result = await ytDlp(url, {
          format: 'bestaudio', // Highest quality available
          getUrl: true,
          noWarnings: true,
          preferFreeFormats: true,
          noPlaylist: true,
        });

        const streamUrl = result.trim();
        if (streamUrl && streamUrl.startsWith('http')) {
          console.log(`[yt-dlp] Success! Found stream.`);
          return streamUrl;
        } else {
          throw new Error('Invalid URL returned from yt-dlp');
        }
      } catch (error) {
        console.error(`[yt-dlp] Error on attempt ${i + 1} for ${videoId}:`, error.message);
        if (i < retries) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }

    throw new Error(`Failed to extract stream using Piped API and yt-dlp fallback`);
  }
};

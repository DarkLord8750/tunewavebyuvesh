import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubeProps } from 'react-youtube';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, ListMusic, Heart, Radio } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { musicService } from '../services/musicService';
import { getStreamUrl } from '../services/corsStreamService';
import { QueuePanel } from './QueuePanel';
import { cn } from '../utils/cn';
import { toast } from 'sonner';

export function Player() {
  const { currentTrack, queue, queueIndex, isPlaying, volume, isMuted, isShuffle, isRepeat, isAutoplay, progress, setIsPlaying, setProgress, togglePlayPause, playNext, playPrevious, toggleShuffle, toggleRepeat, toggleAutoplay, setVolume, toggleMute } = usePlayerStore();
  const { isLiked, toggleLikeSong } = usePlaylistStore();
  useKeyboardShortcuts();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const playerRef = useRef<any>(null); // YouTube player ref
  const audioRef = useRef<HTMLAudioElement>(null); // HTML5 audio ref
  const [duration, setDuration] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<'html5' | 'iframe'>('html5');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const isFetchingAutoplayRef = useRef(false);

  // 1. Fetch stream URL when track changes
  useEffect(() => {
    if (!currentTrack) return;

    let isMounted = true;
    setIsLoadingStream(true);
    setStreamUrl(null); // Reset
    
    // Stop previous playbacks
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (playerRef.current && playbackMode === 'iframe') {
      playerRef.current.pauseVideo();
    }

    const fetchStream = async () => {
      try {
        console.log(`[Player] Fetching stream for ${currentTrack.title} (${currentTrack.youtubeId})`);
        
        // Try backend first
        let streamUrlResult = null;
        
        try {
          const res = await fetch(`/api/stream?id=${currentTrack.youtubeId}`);
          const data = await res.json();
          
          if (data.success && data.streamUrl) {
            streamUrlResult = data.streamUrl;
            console.log('[Player] Backend stream successful');
          }
        } catch (backendErr) {
          console.warn('[Player] Backend stream failed, trying CORS proxy:', backendErr);
        }

        // Fallback to CORS proxy if backend fails
        if (!streamUrlResult) {
          console.log('[Player] Attempting CORS proxy stream...');
          streamUrlResult = await getStreamUrl(currentTrack.youtubeId);
        }
        
        if (!isMounted) return;

        if (streamUrlResult) {
          setStreamUrl(streamUrlResult);
          setPlaybackMode('html5');
          console.log('[Player] Stream URL acquired, ready to play');
        } else {
          throw new Error('Failed to get stream URL from all sources');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[Player] Stream extraction failed, falling back to YouTube iframe:', err);
        setPlaybackMode('iframe');
        toast.error('Playing via YouTube (stream extraction failed)');
      } finally {
        if (isMounted) setIsLoadingStream(false);
      }
    };

    fetchStream();

    // Media Session API for mobile lock screen
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: [{ src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => { setIsPlaying(true); });
      navigator.mediaSession.setActionHandler('pause', () => { setIsPlaying(false); });
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }

    return () => { isMounted = false; };
  }, [currentTrack]);

  // Preload next track OR Autoplay Background Fetch
  useEffect(() => {
    if (!queue || queue.length === 0 || queueIndex < 0) return;
    
    if (!isShuffle && queueIndex + 1 < queue.length) {
      // Preload next track's audio stream
      const nextTrack = queue[queueIndex + 1];
      getStreamUrl(nextTrack.youtubeId).catch(() => {});
    } else if (isAutoplay && currentTrack && queue.length - queueIndex <= 10 && !isFetchingAutoplayRef.current) {
      // Background Append for Autoplay: Buffer 30 tracks when we drop below 10 upcoming tracks
      const fetchAutoplay = async () => {
        isFetchingAutoplayRef.current = true;
        try {
          const lastTrackInQueue = queue[queue.length - 1] || currentTrack;
          
          // Combine queue and recently played to act as a strict session blacklist
          const sessionHistory = [
            ...usePlayerStore.getState().recentlyPlayed,
            ...usePlayerStore.getState().queue
          ];
          
          // The scoring engine will automatically blacklist duplicates and manage artist cooldowns
          const newTracks = await musicService.getRelatedTracks(lastTrackInQueue, sessionHistory);
          
          if (newTracks.length > 0) {
            usePlayerStore.getState().addMultipleToQueue(newTracks);
          }
        } catch (e) {
          console.error('[Player] Background autoplay fetch failed:', e);
        } finally {
          isFetchingAutoplayRef.current = false;
        }
      };
      fetchAutoplay();
    }
  }, [currentTrack, queue.length, queueIndex, isShuffle, isAutoplay]);

  // 2. Play/Pause state sync
  useEffect(() => {
    if (playbackMode === 'html5' && audioRef.current && streamUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error('[Player] Audio play error:', e));
      } else {
        audioRef.current.pause();
      }
    } else if (playbackMode === 'iframe' && playerRef.current) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, streamUrl, playbackMode]);

  // 3. Volume and Mute sync
  useEffect(() => {
    const activeVolume = isMuted ? 0 : volume / 100;
    if (audioRef.current) {
      audioRef.current.volume = activeVolume;
    }
    if (playerRef.current) {
      if (isMuted) playerRef.current.mute();
      else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      }
    }
  }, [volume, isMuted]);

  // 4. Time Update Loop for HTML5
  const handleAudioTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setLocalProgress(audioRef.current.currentTime);
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error('[Player] Error:', e));
      }
    }
  };

  const handleAudioEnded = () => {
    playNext();
  };

  // Time Update Loop for IFrame
  useEffect(() => {
    let interval: any;
    if (isPlaying && !isSeeking && playbackMode === 'iframe') {
      interval = setInterval(async () => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const currentTime = await playerRef.current.getCurrentTime();
          setLocalProgress(currentTime);
          setProgress(currentTime);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isSeeking, setProgress, playbackMode]);


  // YouTube IFrame Callbacks
  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    playerRef.current.setVolume(volume);
    if(isMuted) playerRef.current.mute();
    if (isPlaying && playbackMode === 'iframe') playerRef.current.playVideo();
  };

  const onStateChange = (event: YouTubeEvent) => {
    if (playbackMode !== 'iframe') return;
    if (event.data === 0) {
      playNext();
    } else if (event.data === 1) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());
    } else if (event.data === 2) {
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setLocalProgress(time);
    
    if (playbackMode === 'html5' && audioRef.current) {
      audioRef.current.currentTime = time;
    } else if (playbackMode === 'iframe' && playerRef.current) {
      playerRef.current.seekTo(time, true);
    }
  };

  const toggleGlobalPlayPause = () => {
    // If it was playing, and we pause, we just update state
    togglePlayPause();
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  const opts: YouTubeProps['opts'] = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: playbackMode === 'iframe' && isPlaying ? 1 : 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
    },
  };

  return (
    <>
      {/* HTML5 Audio Player */}
      {playbackMode === 'html5' && streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={handleAudioEnded}
          autoPlay={isPlaying}
          preload="auto"
          className="hidden"
          crossOrigin="anonymous"
        />
      )}

      {/* Hidden YouTube Player (Fallback) */}
      <div className={playbackMode === 'iframe' ? 'hidden' : 'hidden opacity-0 pointer-events-none'}>
        <YouTube
          videoId={currentTrack.youtubeId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      <div className="fixed bottom-[60px] md:bottom-0 w-full z-50 glass-panel border-t border-white/5 bg-tunewave-ink/90 backdrop-blur-2xl p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Track Info */}
          <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
            <img 
              src={currentTrack.thumbnail} 
              alt={currentTrack.title} 
              className={cn(
                "w-14 h-14 rounded-md object-cover shadow-lg shadow-black/50 transition-transform duration-500",
                isLoadingStream ? "animate-pulse" : ""
              )}
            />
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold truncate text-white block">{currentTrack.title}</h4>
              <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>
            </div>
            <button 
              onClick={() => toggleLikeSong(currentTrack)}
              className={cn("p-2 transition-colors", isLiked(currentTrack.id) ? "text-tunewave-accent" : "text-white/50 hover:text-white")}
            >
              <Heart className="w-5 h-5" fill={isLiked(currentTrack.id) ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center flex-1 max-w-2xl gap-2">
            <div className="flex items-center gap-6">
              <button onClick={toggleShuffle} className={cn("transition-colors", isShuffle ? "text-tunewave-accent" : "text-white/50 hover:text-white")}>
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={playPrevious} className="text-white hover:text-tunewave-accent transition-colors">
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              <button 
                onClick={toggleGlobalPlayPause} 
                disabled={isLoadingStream}
                className={cn(
                  "w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all",
                  isLoadingStream ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                )}
              >
                {isLoadingStream ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-1" />
                )}
              </button>
              <button onClick={playNext} className="text-white hover:text-tunewave-accent transition-colors">
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
              <button onClick={toggleRepeat} className={cn("transition-colors", isRepeat ? "text-tunewave-accent" : "text-white/50 hover:text-white")}>
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center w-full gap-3 text-xs text-white/50 font-mono">
              <span>{formatTime(localProgress)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={localProgress || 0}
                onMouseDown={() => setIsSeeking(true)}
                onMouseUp={() => setIsSeeking(false)}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-tunewave-accent [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all hover:[&::-webkit-slider-thumb]:scale-125"
                style={{
                  background: `linear-gradient(to right, var(--color-tunewave-accent) ${(localProgress / (duration || 100)) * 100}%, rgba(255,255,255,0.2) ${(localProgress / (duration || 100)) * 100}%)`
                }}
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Extra Controls */}
          <div className="hidden md:flex items-center justify-end gap-4 w-1/4 min-w-[200px]">
            <button 
              onClick={toggleAutoplay} 
              className={cn("transition-colors", isAutoplay ? "text-tunewave-accent" : "text-white/50 hover:text-white")} 
              title={isAutoplay ? "Autoplay On" : "Autoplay Off"}
            >
              <Radio className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsQueueOpen(!isQueueOpen)} 
              className={cn("transition-colors", isQueueOpen ? "text-tunewave-accent" : "text-white/50 hover:text-white")} 
              title="Queue"
            >
              <ListMusic className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 w-32">
              <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : (volume || 0)}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:[&::-webkit-slider-thumb]:bg-tunewave-accent"
                style={{
                  background: `linear-gradient(to right, white ${(isMuted ? 0 : volume)}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume)}%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </>
  );
}

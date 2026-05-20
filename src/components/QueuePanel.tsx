import { X, Play, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../utils/cn';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const { queue, queueIndex, currentTrack, recentlyPlayed, jumpToQueueIndex, removeFromQueue } = usePlayerStore();

  const upNext = queue.slice(queueIndex + 1);

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-96 glass-panel border-l border-white/10 z-[60] flex flex-col transition-transform duration-300 ease-in-out pb-[80px] bg-tunewave-ink",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-display font-bold tracking-tight">Queue</h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Now Playing */}
          {currentTrack && (
            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Now Playing</h3>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-tunewave-accent/20">
                <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-12 h-12 rounded object-cover shadow-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-tunewave-accent truncate">{currentTrack.title}</p>
                  <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center gap-1 opacity-80">
                  <div className="w-1 h-3 bg-tunewave-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-4 bg-tunewave-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-2 bg-tunewave-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Up Next */}
          {upNext.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Up Next</h3>
              <div className="space-y-1">
                {upNext.map((track, idx) => {
                  const actualIndex = queueIndex + 1 + idx;
                  return (
                    <div key={`next-${track.id}-${idx}`} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 cursor-pointer shadow-md" onClick={() => jumpToQueueIndex(actualIndex)}>
                        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => jumpToQueueIndex(actualIndex)}>
                        <p className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">{track.title}</p>
                        <p className="text-xs text-white/50 truncate">{track.artist}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(actualIndex); }}
                        className="p-2 text-white/0 group-hover:text-white/50 hover:!text-red-400 transition-all"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recently Played */}
          {recentlyPlayed.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recently Played</h3>
              <div className="space-y-1 opacity-70">
                {recentlyPlayed.map((track, idx) => (
                  <div key={`recent-${track.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-xl">
                    <img src={track.thumbnail} alt={track.title} className="w-10 h-10 rounded object-cover grayscale opacity-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/50 truncate">{track.title}</p>
                      <p className="text-xs text-white/30 truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upNext.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <p className="text-sm">Queue is empty</p>
              <p className="text-xs mt-1">Autoplay will suggest the next song</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

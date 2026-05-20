import { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import { musicService } from '../services/musicService';
import { Track } from '../types';
import { TrackCard } from '../components/TrackCard';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const handler = setTimeout(async () => {
      if (query.trim().length > 2) {
        setLoading(true);
        try {
          const res = await musicService.search(query, controller.signal);
          setResults(res);
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            setResults([]);
          }
        } finally {
          // If aborted, let the new request handle loading state
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="space-y-8 min-h-full">
      <div className="max-w-3xl mx-auto pt-4 md:pt-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/50 group-focus-within:text-tunewave-accent transition-colors">
            <SearchIcon className="w-6 h-6" />
          </div>
          <input
            type="text"
            value={query || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:ring-2 focus:ring-tunewave-accent/50 outline-none rounded-full py-4 pl-16 pr-6 text-xl transition-all shadow-xl placeholder:text-white/30 backdrop-blur-md"
          />
        </div>
      </div>

      <div className="pt-8">
        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 mt-8">
             {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white/5 rounded-xl p-4 aspect-square flex flex-col gap-3">
                  <div className="bg-white/10 rounded-lg w-full aspect-square"></div>
                  <div className="bg-white/10 rounded w-3/4 h-4 mt-2"></div>
                  <div className="bg-white/10 rounded w-1/2 h-3"></div>
                </div>
              ))}
           </div>
        ) : query && results.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            <p className="text-xl">No results found for "{query}"</p>
            <p className="text-sm mt-2">Try searching for artists, songs, or podcasts</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 animate-in slide-in-from-bottom-8 duration-500">
            {results.map(track => (
              <TrackCard key={`search-${track.id}`} track={track} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

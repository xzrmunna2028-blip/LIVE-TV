import React, { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, Trophy, Radio, Search } from 'lucide-react';

interface Match {
  id: string;
  sport: 'cricket' | 'football';
  tournament: string;
  team1: string;
  team2: string;
  status: 'live' | 'upcoming';
  time: string;
  score: string;
  liveChannelId?: string;
}

interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  playlistSource?: string;
}

interface SportsScheduleDashboardProps {
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
  onClose?: () => void;
}

export default function SportsScheduleDashboard({ 
  channels, 
  onSelectChannel,
  onClose 
}: SportsScheduleDashboardProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSport, setFilterSport] = useState<'all' | 'cricket' | 'football'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchSchedule = () => {
    setLoading(true);
    fetch('/api/sports/schedule')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Failed to load');
      })
      .then(data => {
        if (data && Array.isArray(data.matches)) {
          setMatches(data.matches);
        }
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching sports:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Helper to find client-side channel match by ID or keyword
  const findMatchingChannel = (match: Match): Channel | null => {
    const keyword = (match.liveChannelId || '').toLowerCase().trim();
    if (!keyword) return null;

    // First, direct ID check
    let ch = channels.find(c => c.id.toLowerCase() === keyword);
    if (ch) return ch;

    // Next, partial name match
    ch = channels.find(c => {
      const name = c.name.toLowerCase();
      // Handle complex names like T Sports, Gazi TV
      if (keyword === 'tsports' || keyword === 't_sports') {
        return name.includes('t sports') || name.includes('tsports');
      }
      if (keyword === 'gazi' || keyword === 'gazi_tv' || keyword === 'gtv') {
        return name.includes('gazi') || name.includes('gtv');
      }
      if (keyword === 'somoy' || keyword === 'somoy_tv') {
        return name.includes('somoy');
      }
      return name.includes(keyword) || c.id.toLowerCase().includes(keyword);
    });

    if (ch) return ch;

    // Fallback to first sports channel if it is a live match
    if (match.sport === 'cricket' || match.sport === 'football') {
      const sportsChannel = channels.find(c => c.group === 'Sports' || c.name.toLowerCase().includes('sports'));
      if (sportsChannel) return sportsChannel;
    }

    return null;
  };

  const handleWatchLive = (match: Match) => {
    const matchedCh = findMatchingChannel(match);
    if (matchedCh) {
      onSelectChannel(matchedCh);
      if (onClose) onClose();
      // Scroll to player
      setTimeout(() => {
        const player = document.getElementById('player-view-container');
        if (player) {
          player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    } else {
      alert('দুঃখিত! এই খেলাটির জন্য চ্যানেলটি বর্তমানে অনলাইন নেই। অনুগ্রহ করে খেলাধুলা ক্যাটাগরির অন্য চ্যানেলগুলো ট্রাই করুন।');
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesSport = filterSport === 'all' || match.sport === filterSport;
    const matchesSearch = searchQuery === '' || 
      match.team1.toLowerCase().includes(searchQuery.toLowerCase()) || 
      match.team2.toLowerCase().includes(searchQuery.toLowerCase()) || 
      match.tournament.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  return (
    <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm select-none">
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 h-48 w-48 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-sky-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
            লাইভ খেলার সিডিউল ও আপডেট
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            গুগল স্পোর্টস ইঞ্জিন থেকে প্রতি ৩ মিনিট পর পর স্বয়ংক্রিয় আপডেট হচ্ছে
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] text-slate-500 font-serif">
            আপডেট: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchSchedule}
            disabled={loading}
            className="p-1 px-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Sport select and Search Input Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-center justify-between">
        <div className="flex bg-slate-950 p-1 rounded-xl w-full sm:w-auto border border-slate-850">
          <button
            onClick={() => setFilterSport('all')}
            className={`flex-1 sm:flex-none text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterSport === 'all' 
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            সব খেলা
          </button>
          <button
            onClick={() => setFilterSport('cricket')}
            className={`flex-1 sm:flex-none text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              filterSport === 'cricket' 
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏏 ক্রিকেট
          </button>
          <button
            onClick={() => setFilterSport('football')}
            className={`flex-1 sm:flex-none text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              filterSport === 'football' 
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚽ ফুটবল
          </button>
        </div>

        {/* Mini Search input */}
        <div className="relative w-full sm:w-60">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="দল বা টুর্নামেন্ট খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-8 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/70"
          />
        </div>
      </div>

      {/* Match Schedules Display Container */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-850 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-sans">লাইভ খেলার ডেটা গুগল স্পোর্টস থেকে নিয়ে আসা হচ্ছে...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">বর্তমানে কোনো লাইভ বা শিডিউল ম্যাচ পাওয়া যায়নি।</p>
          <p className="text-[11px] text-slate-500 mt-1">অনুগ্রহ করে পরে আবার রিফ্রেশ করে চেক করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((match) => {
            const hasChannel = findMatchingChannel(match) !== null;
            return (
              <div 
                key={match.id} 
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] hover:border-slate-750 bg-slate-950/80
                  ${match.status === 'live' 
                    ? 'border-emerald-500/20 shadow-lg shadow-emerald-950/10' 
                    : 'border-slate-850/60'
                  }
                `}
              >
                {/* Upper row: Tournament name + Sport Tag */}
                <div className="flex justify-between items-center gap-2 mb-3">
                  <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wide bg-sky-950/50 px-2 py-0.5 rounded border border-sky-900/30">
                    {match.tournament}
                  </span>
                  <span className="text-xs shrink-0 select-none">
                    {match.sport === 'cricket' ? '🏏' : '⚽'}
                  </span>
                </div>

                {/* Score / Status Card body */}
                <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-850 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-200">{match.team1}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold my-1">বনাম</div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-200">{match.team2}</span>
                    </div>
                  </div>

                  {/* Right hand score info or time */}
                  <div className="text-right pl-3 border-l border-slate-800 shrink-0 flex flex-col justify-center items-end">
                    {match.status === 'live' ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-white bg-emerald-600 px-1.5 py-0.5 rounded animate-pulse">
                          ● লাইভ
                        </span>
                        {match.score ? (
                          <span className="text-[11px] font-semibold text-emerald-400 font-mono mt-1 w-28 text-right line-clamp-2">
                            {match.score}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-500 font-semibold mt-1">
                            চলছে
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5" /> শিডিউল
                        </span>
                        <span className="text-[11px] font-bold text-amber-400 font-sans mt-1">
                          {match.time}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Lower Action bar button for live play tuning */}
                <div className="flex items-center justify-between mt-auto pt-2 gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">
                    সাজেস্টেড চ্যানেল: {match.liveChannelId ? match.liveChannelId.toUpperCase() : 'সব চ্যানেল'}
                  </span>
                  
                  <button
                    onClick={() => handleWatchLive(match)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-[0.97] shadow-sm flex items-center gap-1
                      ${match.status === 'live'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                      }
                    `}
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    {match.status === 'live' ? 'সরাসরি দেখুন' : 'চ্যানেল টিউন করুন'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

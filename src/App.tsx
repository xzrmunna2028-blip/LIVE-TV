/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, Search, Heart, RefreshCw, AlertCircle, Sparkles, Filter, 
  Flame, Radio, Info, Smartphone, Check, PlaySquare, X, ListFilter, HelpCircle,
  LogIn, LogOut, User, ArrowLeft, Zap, SmartphoneNfc
} from 'lucide-react';
import { Channel } from './types';
import CustomPlayer from './components/CustomPlayer';
import ChannelCard from './components/ChannelCard';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';

// Available categories mapping Bengali and English
interface GroupCategory {
  id: string;
  nameBangla: string;
  nameEnglish: string;
  count?: number;
}

const CATEGORIES: GroupCategory[] = [
  { id: 'all', nameBangla: 'সব চ্যানেল', nameEnglish: 'All Channels' },
  { id: 'live', nameBangla: 'লাইভ (LIVE)', nameEnglish: 'Live Status' },
  { id: 'popular', nameBangla: 'পপুলার (Popular)', nameEnglish: 'Popular' },
  { id: 'favorites', nameBangla: 'প্রিয় তালিকা', nameEnglish: 'Favorites' },
  { id: 'Bangla', nameBangla: 'বাংলাদেশি', nameEnglish: 'Banglite' },
  { id: 'Sports', nameBangla: 'খেলাধুলা', nameEnglish: 'Sports' },
  { id: 'News', nameBangla: 'খবর', nameEnglish: 'News' },
  { id: 'Music', nameBangla: 'গান', nameEnglish: 'Music' },
  { id: 'Movies', nameBangla: 'সিনেমা', nameEnglish: 'Movies' },
  { id: 'Kids', nameBangla: 'কার্টুন', nameEnglish: 'Kids' },
  { id: 'failed', nameBangla: 'ফেইল চ্যানেল (Failed)', nameEnglish: 'Failed Channels' },
  { id: 'Other', nameBangla: 'অন্যান্য', nameEnglish: 'Other' }
];

const Marquee = 'marquee' as any;

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Selected stream
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Searching & Category Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // Local Favorites persistence
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Track failed streams report
  const [channelHealth, setChannelHealth] = useState<Record<string, 'working' | 'broken'>>({});

  // Navigation page views & VIP custom layouts
  const [currentPage, setCurrentPage] = useState<'landing' | 'app'>('landing');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string; badge: string } | null>(null);

  // Performance-focused dynamic viewport rendering slice count (resolves lag entirely)
  const [visibleCount, setVisibleCount] = useState<number>(80);

  // Load favorites, stream health status & auth configurations from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem('live_tv_favorites');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
      
      const savedHealth = localStorage.getItem('live_channels_health');
      if (savedHealth) {
        setChannelHealth(JSON.parse(savedHealth));
      }

      // Restore session state
      const savedLogin = localStorage.getItem('bongo_stream_logged_in');
      const savedUser = localStorage.getItem('bongo_stream_user_cfg');
      if (savedLogin === 'true' && savedUser) {
        setIsLoggedIn(true);
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Localstorage parsing error:', e);
    }
  }, []);

  // Handle user authentication sessions
  const handleLoginSuccess = (userByAuth: { name: string; username: string; badge: string }) => {
    setIsLoggedIn(true);
    setCurrentUser(userByAuth);
    localStorage.setItem('bongo_stream_logged_in', 'true');
    localStorage.setItem('bongo_stream_user_cfg', JSON.stringify(userByAuth));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('bongo_stream_logged_in');
    localStorage.removeItem('bongo_stream_user_cfg');
  };

  // Performance optimization hook - dynamically reset visible channels on input trigger
  useEffect(() => {
    setVisibleCount(80);
  }, [searchQuery, selectedGroup]);

  // Fetch channels from Express proxy backend
  const loadChannels = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      setRefreshing(true);
      // Clear flagged broken channels on manual refresh to allow fresh attempts
      setChannelHealth({});
      localStorage.removeItem('live_channels_health');
    }

    try {
      const url = forceRefresh ? '/api/channels?refresh=true' : '/api/channels';
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.channels)) {
        // Guarantee unique keys and duplicate-free channels on the frontend
        const uniqueChannels: Channel[] = [];
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        data.channels.forEach((ch: Channel) => {
          if (!ch || !ch.id || !ch.name) return;
          const nameKey = ch.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!seenIds.has(ch.id) && !seenNames.has(nameKey)) {
            seenIds.add(ch.id);
            seenNames.add(nameKey);
            uniqueChannels.push(ch);
          }
        });
        setChannels(uniqueChannels);
        
        // Auto-select the first verified/working channel if none is active
        if (uniqueChannels.length > 0 && !selectedChannel) {
          const firstVerified = uniqueChannels.find((c: Channel) => c.playlistSource.includes('Built-in')) || uniqueChannels[0];
          setSelectedChannel(firstVerified);
        }
      } else {
        throw new Error(data.error || 'চ্যানেল ডেটা লোড করার সময় বিভ্রাট দেখা দিয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'সার্ভার থেকে লাইভ টিভি চ্যানেল লিস্ট পাওয়া যায়নি।');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  // Sync favorites back to local storage
  const handleToggleFavorite = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering channel click
    let updated: string[];
    if (favorites.includes(channelId)) {
      updated = favorites.filter(id => id !== channelId);
    } else {
      updated = [...favorites, channelId];
    }
    setFavorites(updated);
    localStorage.setItem('live_tv_favorites', JSON.stringify(updated));
  };

  // Track stream playback feedback from player
  const handleReportWorkingState = (channelId: string, working: boolean) => {
    const updatedHealth = { ...channelHealth, [channelId]: working ? 'working' as const : 'broken' as const };
    setChannelHealth(updatedHealth);
    localStorage.setItem('live_channels_health', JSON.stringify(updatedHealth));
  };

  // Reset stream reports list
  const clearFlagsReport = () => {
    setChannelHealth({});
    localStorage.removeItem('live_channels_health');
  };

  // Channel selections callback
  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    // Smooth scroll back to phone player frame on mobile viewports
    setTimeout(() => {
      const playerEl = document.getElementById('player-view-container');
      if (playerEl && window.innerWidth < 1024) {
        playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Dynamic grouping counter matching categories
  const categoryCounts = useMemo(() => {
    const brokenChannels = channels.filter(ch => channelHealth[ch.id] === 'broken');
    const workingChannels = channels.filter(ch => channelHealth[ch.id] !== 'broken');

    const counts: Record<string, number> = { 
      all: workingChannels.length, 
      live: workingChannels.filter(ch => channelHealth[ch.id] === 'working' || selectedChannel?.id === ch.id).length,
      favorites: favorites.filter(id => workingChannels.some(ac => ac.id === id)).length,
      popular: workingChannels.filter(ch => {
        const norm = ch.name.toLowerCase();
        const popularKeywords = [
          'somoy', 'jamuna', 'independent', 'channel 24', 'ekattor', 'rtv', 'ntv', 'gtv', 'gazi',
          'atn news', 'btv', 'channel i', 'maasranga', 'deepto', 't sports', 'tsports', 'sony ten',
          'star sports', 'ten sports', 'star gold', 'hbo', 'zee bangla', 'star jalsha', 'cartoon network',
          'nickelodeon', 'disney'
        ];
        return popularKeywords.some(keyword => norm.includes(keyword));
      }).length,
      failed: brokenChannels.length
    };

    workingChannels.forEach(ch => {
      counts[ch.group] = (counts[ch.group] || 0) + 1;
    });
    return counts;
  }, [channels, favorites, channelHealth]);

  // Combined Search + Category Filter list computation
  const filteredChannels = useMemo(() => {
    const POPULAR_KEYWORDS = [
      'somoy', 'jamuna', 'independent', 'channel 24', 'ekattor', 'rtv', 'ntv', 'gtv', 'gazi',
      'atn news', 'btv', 'channel i', 'maasranga', 'deepto', 't sports', 'tsports', 'sony ten',
      'star sports', 'ten sports', 'star gold', 'hbo', 'zee bangla', 'star jalsha', 'cartoon network',
      'nickelodeon', 'disney'
    ];

    const getPopularityRank = (name: string): number => {
      const norm = name.toLowerCase();
      for (let i = 0; i < POPULAR_KEYWORDS.length; i++) {
        if (norm.includes(POPULAR_KEYWORDS[i])) {
          return i;
        }
      }
      return 999;
    };

    return channels
      .filter(ch => {
        // Handle failed (broken) channels tab routing
        const isBroken = channelHealth[ch.id] === 'broken';
        
        if (selectedGroup === 'failed') {
          if (!isBroken) return false;
        } else {
          if (isBroken) return false;
        }

        // 1. Filter match by Category tab
        if (selectedGroup === 'favorites') {
          if (!favorites.includes(ch.id)) return false;
        } else if (selectedGroup === 'live') {
          const isLive = channelHealth[ch.id] === 'working' || selectedChannel?.id === ch.id;
          if (!isLive) return false;
        } else if (selectedGroup === 'popular') {
          const norm = ch.name.toLowerCase();
          const isPopular = POPULAR_KEYWORDS.some(k => norm.includes(k));
          if (!isPopular) return false;
        } else if (selectedGroup !== 'all' && selectedGroup !== 'failed' && ch.group !== selectedGroup) {
          return false;
        }

        // 2. Filter match by text search query
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const matchesName = ch.name.toLowerCase().includes(query);
          const matchesGroup = ch.group.toLowerCase().includes(query);
          const matchesSource = ch.playlistSource.toLowerCase().includes(query);
          return matchesName || matchesGroup || matchesSource;
        }

        return true;
      })
      .sort((a, b) => {
        const rankA = getPopularityRank(a.name);
        const rankB = getPopularityRank(b.name);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [channels, selectedGroup, searchQuery, favorites, channelHealth]);

  if (currentPage === 'landing') {
    return (
      <div id="bongo-routing-landing-wrapper">
        <LandingPage
          onStartApp={() => setCurrentPage('app')}
          onOpenLogin={() => setIsAuthOpen(true)}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onLogout={handleLogout}
          totalChannelsCount={channels.length}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all selection:bg-sky-500/30 selection:text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950">
      
      {/* Decorative Grid Mesh overlay to retain aesthetic cohesion */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-15 pointer-events-none" />

      {/* Premium Top Navigation Bar */}
      <header id="app-navigation-header" className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/90 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-landing"
              onClick={() => setCurrentPage('landing')}
              title="হোমপেজে ফিরে যান"
              className="p-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg border border-slate-800 transition-all cursor-pointer mr-0.5 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-sky-400" />
            </button>

            <div className="flex items-center gap-2 select-none">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-505 flex items-center justify-center shadow-lg">
                <Tv className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none">
                    BongoStream
                  </h1>
                </div>
                <p className="text-[9px] text-slate-450 font-sans tracking-wide">স্মার্ট বাংলা টিভি প্লেয়ার</p>
              </div>
            </div>
          </div>

          {/* Profile & Live Actions wrapper */}
          <div className="flex items-center gap-3">
            
            {/* Authenticated User state display */}
            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-350">{currentUser.name}</span>
                  <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.1 rounded uppercase font-black uppercase">
                    {currentUser.badge}
                  </span>
                </div>
                <button
                  id="btn-header-logout"
                  onClick={handleLogout}
                  title="লগআউট"
                  className="p-1 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-850 hover:border-rose-900/30 rounded-md transition-all cursor-pointer ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-header-login-trigger"
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-250 hover:border-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-450" />
                <span>VIP অ্যাকাউন্ট</span>
              </button>
            )}

            <button
              id="btn-header-refresh-playlist"
              onClick={() => loadChannels(true)}
              disabled={loading || refreshing}
              title="নতুন করে সব চ্যানেল আপলোড ও পরীক্ষা করুন"
              className="flex items-center gap-1.2 px-3 py-1.5 bg-sky-600 hover:bg-sky-505 text-xs font-semibold text-white rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-5 lg:gap-6 relative z-10">

        {/* Core Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          
          {/* LEFT PANEL: Sticky Premium Standalone Stream Player Frame */}
          <div className="lg:col-span-5 sticky top-[72px] lg:top-24 z-30 flex flex-col gap-4">
            <CustomPlayer 
              channel={selectedChannel} 
              onReportWorkingState={handleReportWorkingState} 
            />
          </div>

          {/* RIGHT PANEL: Search, Categories & Channel Grid (Takes 7 Cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* Search and Filters Hub */}
            <div className="lg:sticky lg:top-24 z-20 bg-slate-900 rounded-2xl p-4 border border-slate-800/60 shadow-xl flex flex-col gap-4">
              
              {/* Moving Announcement/Marquee Notice bar */}
              <div id="notice-scrolling-container" className="bg-slate-950/90 border border-slate-850 rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden select-none">
                <span className="flex items-center gap-1 shrink-0 text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-sans tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  চলতি ঘোষণা
                </span>
                <Marquee className="text-xs text-slate-300 font-medium font-sans cursor-pointer flex-1" scrollamount="3" behavior="scroll" direction="left">
                  স্বাগতম বঙ্গস্ট্রিমে (BongoStream)! 📺 সম্পুর্ণ ফ্রিতে উপভোগ করুন যেকোনো সময় আপনার প্রিয় সব লাইভ স্পোর্টস ও বিনোদন চ্যানেল। কোনো চ্যানেল সাময়িকভাবে বন্ধ থাকলে রিফ্রেশ বাটনে ক্লিক করুন অথবা প্লেয়ারে অন্য লিংক অপশন সিলেক্ট করুন। আমরা নিয়মিত নতুন নতুন লাইভ চ্যানেল ও ফিড এড করছি। আমাদের সাথেই থাকুন!
                </Marquee>
              </div>

              {/* Row 1: Search Input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  id="channels-text-search-input"
                  type="text"
                  placeholder="চ্যানেলের নাম দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 focus:border-sky-500/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all font-sans"
                />
                {searchQuery && (
                  <button
                    id="btn-clear-search-query"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Row 2: Categories Tab Scroller */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    ক্যাটাগরি
                  </span>
                </div>
                
                {/* Scrollable track for category buttons */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat.id] || 0;
                    const isActive = selectedGroup === cat.id;

                    // Skip displaying empty groups unless they are 'all', 'favorites' or 'failed'
                    if (count === 0 && cat.id !== 'all' && cat.id !== 'favorites' && cat.id !== 'failed') return null;

                    return (
                      <button
                        id={`category-tab-btn-${cat.id}`}
                        key={cat.id}
                        onClick={() => setSelectedGroup(cat.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 transition-all duration-200 cursor-pointer border
                          ${isActive 
                            ? 'bg-sky-605 hover:bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-950/40' 
                            : 'bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                          }
                        `}
                      >
                        {cat.id === 'favorites' && <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-white' : 'text-sky-500 fill-sky-500'}`} />}
                        <span>{cat.nameBangla}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold
                          ${isActive ? 'bg-sky-700 text-white' : 'bg-slate-900 text-slate-500'}
                        `}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Channels List Grid Area */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1 text-slate-400 font-sans">
                <span className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                  <ListFilter className="w-4 h-4 text-sky-400" /> চ্যানেলসমূহ
                </span>
                
                <span className="text-2xs font-mono text-slate-500">
                  মোট ফিল্টার্ড: {filteredChannels.length}টি
                </span>
              </div>

              {/* Status loading view */}
              {loading && channels.length === 0 ? (
                <div id="loader-fallback-block" className="bg-slate-900/60 border border-slate-900 rounded-2xl p-16 text-center shadow-xl">
                  <div className="relative w-12 h-12 mx-auto mb-4">
                    <span className="absolute inset-0 border-3 border-slate-800 rounded-full"></span>
                    <span className="absolute inset-0 border-3 border-sky-500 rounded-full animate-spin border-t-transparent"></span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-300">চ্যানেল লোড হচ্ছে...</h3>
                </div>
              ) : error && channels.length === 0 ? (
                <div id="error-fallback-block" className="bg-slate-905 border border-slate-900 rounded-2xl p-10 text-center shadow-xl">
                  <AlertCircle className="w-12 h-12 text-rose-505 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-200">সার্ভার সংযোগে ত্রুটি!</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    {error}
                  </p>
                  <button
                    id="btn-error-reload-trigger"
                    onClick={() => loadChannels(false)}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors border border-slate-700 cursor-pointer"
                  >
                    পুনরায় চেষ্টা করুন
                  </button>
                </div>
              ) : filteredChannels.length === 0 ? (
                // Empty search result State
                <div id="no-results-fallback-block" className="bg-slate-910/20 border border-slate-900/60 rounded-2xl p-14 text-center">
                  <div className="text-3xl text-slate-500 mb-3">🔍</div>
                  <h3 className="text-sm font-semibold text-slate-300">কোনো চ্যানেল পাওয়া যায়নি</h3>
                  <button
                    id="btn-reset-filters"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGroup('all');
                    }}
                    className="mt-4 px-3.5 py-1.5 bg-sky-950/30 hover:bg-sky-900/40 text-sky-400 text-xs font-semibold rounded-lg border border-sky-900/40 transition-colors"
                  >
                    ফিল্টার রিসেট করুন
                  </button>
                </div>
              ) : (
                // Dynamic viewport optimized slicer (ONLY renders visibleCount initially to secure 60FPS UI response speeds)
                <div className="flex flex-col gap-5">
                  <div id="channels-result-scroller" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-h-[500px] lg:max-h-[calc(100vh-365px)] overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-850">
                    {filteredChannels.slice(0, visibleCount).map((ch) => (
                      <ChannelCard
                        key={ch.id}
                        channel={ch}
                        isSelected={selectedChannel?.id === ch.id}
                        isFavorite={favorites.includes(ch.id)}
                        onSelect={handleSelectChannel}
                        onToggleFavorite={handleToggleFavorite}
                        workingReport={channelHealth[ch.id] || 'untested'}
                      />
                    ))}
                  </div>

                  {/* Load More Pagination Container (Exposed if more items matching filters are queued for rendering) */}
                  {filteredChannels.length > visibleCount && (
                    <div id="load-more-section" className="flex justify-center py-2">
                      <button
                        id="btn-load-more-dynamic-channels"
                        onClick={() => setVisibleCount(prev => prev + 120)}
                        className="px-6 py-3 bg-slate-900 hover:bg-slate-850/80 text-sky-450 hover:text-white border border-slate-800 hover:border-slate-700 font-sans text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 hover:shadow-sky-500/10"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>আরো চ্যানেল দেখুন (বাকি আছে {filteredChannels.length - visibleCount}টি)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal embedded inside App to handle popups seamlessly */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Styled Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6 relative z-10 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-500 font-sans">
            &copy; {new Date().getFullYear()} BongoStream Premium. সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
      </footer>
    </div>
  );
}

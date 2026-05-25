/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, Search, Heart, RefreshCw, AlertCircle, Sparkles, Filter, 
  Flame, Radio, Info, Smartphone, Check, PlaySquare, X, ListFilter, HelpCircle,
  LogIn, LogOut, User, ArrowLeft, Zap, SmartphoneNfc, MessageSquare, ShieldAlert, Lock
} from 'lucide-react';
import { Channel, PlaylistInfo } from './types';
import CustomPlayer from './components/CustomPlayer';
import ChannelCard from './components/ChannelCard';
import LandingPage, { FreeWorldCupBDLogo, StatsDisplay } from './components/LandingPage';
import AuthModal from './components/AuthModal';
import LiveChat from './components/LiveChat';
import ProfileEditModal from './components/ProfileEditModal';
import DynamicAdContainer from './components/DynamicAdContainer';

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
  const [currentPage, setCurrentPage] = useState<'landing' | 'app' | 'admin'>('landing');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ 
    name: string; 
    username: string; 
    badge: string;
    phone?: string;
    avatar?: string;
    flag?: string;
  } | null>(null);

  // Active Collapsible Live Chat Room Panel State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);

  // Centralized Server-Persisted Abuse Reports State
  const [reportsList, setReportsList] = useState<any[]>([]);

  // Periodically synchronize admin abuse reports from server
  useEffect(() => {
    const fetchReports = () => {
      fetch('/api/reports')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setReportsList(data);
          }
        })
        .catch(err => console.error('Error fetching abuse reports:', err));
    };

    fetchReports();
    const interval = setInterval(fetchReports, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  // --- Beautiful APK / Web Custom Update System States ---
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStageText, setUpdateStageText] = useState<string>('');
  const [isUpdateCompleted, setIsUpdateCompleted] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>(() => {
    return localStorage.getItem('free_world_cup_app_version') || 'v1.0.0';
  });

  // Poll for version updates
  useEffect(() => {
    const checkVersion = () => {
      fetch('/api/version')
        .then(res => res.json())
        .then(data => {
          if (data.version && data.version !== appVersion) {
            setIsUpdateBroadcastActive(true);
            localStorage.setItem('is_update_broadcast_active', 'true');
            localStorage.setItem('latest_available_version', data.version);
          }
        })
        .catch(err => console.error('Error checking version:', err));
    };

    checkVersion();
    const interval = setInterval(checkVersion, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [appVersion]);

  // Authenticated Admin portal gatekeeper token
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(() => {
    return localStorage.getItem('bongo_admin_authorized') === 'true';
  });

  // Performance-focused dynamic viewport rendering slice count (resolves lag entirely)
  const [visibleCount, setVisibleCount] = useState<number>(80);

  // Dynamic broadcast flag - only shows the "Check Update" / "Update Available" badges when enabled by owner
  const [isUpdateBroadcastActive, setIsUpdateBroadcastActive] = useState<boolean>(() => {
    return localStorage.getItem('is_update_broadcast_active') === 'true';
  });

  // Admin simulation console state
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState<boolean>(false);
  const [adminActiveTab, setAdminActiveTab] = useState<string>('branding');

  // --- Dynamic Branding & Website Identity States (Loaded dynamically from localStorage) ---
  const [siteNameEnglish, setSiteNameEnglish] = useState<string>(() => {
    return localStorage.getItem('site_name_english') || 'Free World Cup BD';
  });
  const [siteNameBangla, setSiteNameBangla] = useState<string>(() => {
    return localStorage.getItem('site_name_bangla') || 'বিডি লাইভ টিভি';
  });
  const [marqueeText, setMarqueeText] = useState<string>(() => {
    return localStorage.getItem('site_marquee_text') || 'স্বাগতম Free World Cup BD-তে! 📺 সম্পুর্ণ ফ্রিতে স্পোর্টস প্লেয়ারে উপভোগ করুন প্রিয় সব লাইভ ওয়ার্ল্ড কাপ, ঘরোয়া ও আন্তর্জাতিক খেলাধুলা এবং বিনোদন চ্যানেল। কোনো চ্যানেল সাময়িকভাবে বন্ধ থাকলে রিফ্রেশ বাটনে ক্লিক করুন অথবা প্লেয়ারে অন্য লিংক অপশন সিলেক্ট করুন। আমরা নিয়মিত নতুন নতুন লাইভ চ্যানেল ও ফিড এড করছি। আমাদের সাথেই থাকুন!';
  });
  const [siteLogoUrl, setSiteLogoUrl] = useState<string>(() => {
    return localStorage.getItem('site_logo_url') || '';
  });

  // --- Horizontal Multi-Server selection framework states ---
  const [activeServer, setActiveServer] = useState<string>(() => {
    return localStorage.getItem('site_active_server') || 'Singapore Edge Premium (WiFi 10G Feed)';
  });
  const [connectingServer, setConnectingServer] = useState<string>('');

  // --- Personalized Favorite Team onboarding & introductory bumper states ---
  const [favoriteTeam, setFavoriteTeam] = useState<string>(() => {
    return localStorage.getItem('user_favorite_team') || '';
  });
  const [isFavoriteTeamSelectionOpen, setIsFavoriteTeamSelectionOpen] = useState<boolean>(false);
  const [showIntroBumper, setShowIntroBumper] = useState<boolean>(false);
  const [bumperTeam, setBumperTeam] = useState<string>('');

  // --- Strategic Sponsors Ad block configuration codes ---
  const [adCodes, setAdCodes] = useState({
    topBanner: localStorage.getItem('site_ad_top_code') || '',
    bottomBanner: localStorage.getItem('site_ad_bottom_code') || '',
    popUnder: localStorage.getItem('site_ad_pop_code') || '',
    socialBar: localStorage.getItem('site_ad_social_code') || ''
  });

  const adBlocks = {
    topBanner: !!adCodes.topBanner,
    bottomBanner: !!adCodes.bottomBanner,
    popUnder: !!adCodes.popUnder,
    socialBar: !!adCodes.socialBar
  };
  const setAdBlocks = (param: any) => {};

  // M3U custom playlists list
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>(() => {
    try {
      const saved = localStorage.getItem('site_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Playlist editing state
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistInfo | null>(null);

  // Client-side Sanitizer (matching server precisely)
  const sanitizeChannelNameClient = (name: string): string => {
    let cleaned = name
      .replace(/\[.*?\]/g, '') // Remove [BD], [LIVE], etc.
      .replace(/\(.*?\)/g, '') // Remove parentheses (e.g. info formats)
      .replace(/\{.*?\}/g, '') // Remove curly brackets
      .replace(/♛/g, '')        // Remove crown symbols
      .replace(/\|/g, '')       // Remove pipes
      .replace(/[-_]/g, ' ')    // Replace hyphens/underscores with space
      .replace(/\b(hd|sd|fhd|uhd|4k|stream|server\s*\d+|backup|direct|link\s*\d+)\b/gi, '') // Strip suffix
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();

    const upper = cleaned.toUpperCase();
    if (upper === 'SOMOY TV' || upper === 'SOMOY NEWS TV' || upper === 'SOMOY NEWS' || upper === 'SOMOY') return 'Somoy TV';
    if (upper === 'JAMUNA TV' || upper === 'JAMUNA NEWS' || upper === 'JAMUNA') return 'Jamuna TV';
    if (upper === 'GAZI TV' || upper === 'GTV' || upper === 'GTV HD' || upper === 'GAZI TV HD' || upper === 'GAZI') return 'GTV';
    if (upper === 'INDEPENDENT' || upper === 'INDEPENDENT TV') return 'Independent TV';
    if (upper === 'CHANNEL 24' || upper === 'CHANNEL 24 HD' || upper === 'CHANNEL24') return 'Channel 24';
    if (upper === 'ATN NEWS' || upper === 'ATN NEWS BD') return 'ATN News';
    if (upper === 'ATN BANGLA' || upper === 'ATN BANGLA HD') return 'ATN Bangla';
    if (upper === 'ZEE BANLA' || upper === 'ZEE BANGLA' || upper === 'ZEE BANGLA HD' || upper === 'ZEE BANGLA TV') return 'Zee Bangla';
    if (upper === 'STAR JALSHA' || upper === 'STAR JALSHA HD') return 'Star Jalsha';
    if (upper === 'SONY AATH' || upper === 'SONY ATTH' || upper === 'SONY AATH HD') return 'Sony Aath';
    if (upper === 'T SPORTS' || upper === 'TSPORTS' || upper === 'T SPORTS HD' || upper === 'T SPORTS LIVE 01' || upper === 'TSPORTS HD') return 'T Sports';
    if (upper === 'EKATTOR TV' || upper === 'EKATTOR' || upper === '71 TV' || upper === '71' || upper === 'SHOMOY TV' || upper === 'EKATTOR NEWS') return 'Ekattor TV';
    if (upper === 'NTV' || upper === 'NTV BD' || upper === 'NTV HD') return 'NTV';
    if (upper === 'RTV' || upper === 'RTV HD' || upper === 'RTV BD') return 'RTV';
    if (upper === 'BTV' || upper === 'BTV NATIONAL' || upper === 'BTV NATIONAL HD') return 'BTV National';
    if (upper === 'CHANNEL I' || upper === 'CHANNEL I HD' || upper === 'CHANNEL-I') return 'Channel i';
    if (upper === 'DEEPTO TV' || upper === 'DEEPTO') return 'Deepto TV';
    if (upper === 'MAASRANGA' || upper === 'MAASRANGA HD' || upper === 'MAASRANGA TV' || upper === 'MASRANGA TV') return 'Maasranga TV';
    if (upper === 'EKUSHEY TV' || upper === 'ETV' || upper === 'EKUSHEY') return 'Ekushey TV';

    return cleaned;
  };

  // Client-side Categorizer
  const categorizeChannelClient = (name: string, m3uGroup: string): string => {
    const normName = name.toLowerCase();
    const normGroup = m3uGroup.toLowerCase();

    if (
      normName.includes('sport') || 
      normName.includes('football') || 
      normName.includes('cricket') || 
      normName.includes('tsports') || 
      normName.includes('t sports') || 
      normName.includes('ten sports') || 
      normName.includes('sony ten') || 
      normName.includes('star sports') || 
      normName.includes('euro sports') || 
      normName.includes('espn') || 
      normName.includes('wwe') || 
      normName.includes('ptv sports') || 
      normGroup.includes('sport')
    ) {
      return 'Sports';
    }

    if (
      normName.includes('news') || 
      normName.includes('somoy') || 
      normName.includes('jamuna') || 
      normName.includes('independent tv') || 
      normName.includes('ekattor') || 
      normName.includes('71 tv') || 
      normName.includes('channel 24') || 
      normName.includes('news24') || 
      normName.includes('khabor') || 
      normName.includes('jazeera') || 
      normName.includes('cnn') || 
      normName.includes('bbc') || 
      normName.includes('dw') || 
      normName.includes('reuters') || 
      normName.includes('sky news') || 
      normGroup.includes('news') || 
      normGroup.includes('khabor')
    ) {
      return 'News';
    }

    if (
      normName.includes('music') || 
      normName.includes('song') || 
      normName.includes('mtv') || 
      normName.includes('b4u music') || 
      normName.includes('zoom') || 
      normName.includes('clubland') || 
      normGroup.includes('music') || 
      normGroup.includes('song')
    ) {
      return 'Music';
    }

    if (
      normName.includes('movie') || 
      normName.includes('cinema') || 
      normName.includes('hbo') || 
      normName.includes('star gold') || 
      normName.includes('sony max') || 
      normName.includes('zee cinema') || 
      normName.includes('b4u movies') || 
      normName.includes('cine') || 
      normGroup.includes('movie') || 
      normGroup.includes('cinema')
    ) {
      return 'Movies';
    }

    if (
      normName.includes('cartoon') || 
      normName.includes('kids') || 
      normName.includes('disney') || 
      normName.includes('nickelodeon') || 
      normName.includes('nick') || 
      normName.includes('pogo') || 
      normName.includes('duronto') || 
      normName.includes('hungama') || 
      normGroup.includes('kid') || 
      normGroup.includes('cartoon') || 
      normGroup.includes('child')
    ) {
      return 'Kids';
    }

    if (
      normName.includes('bengali') || 
      normName.includes('bangla') || 
      normName.includes(' gtv') || 
      normName.includes('gazi') || 
      normName.includes('atn') || 
      normName.includes('channel i') || 
      normName.includes('ch-i') || 
      normName.includes('ntv') || 
      normName.includes('rtv') || 
      normName.includes('deepto') || 
      normName.includes('boishakhi') || 
      normName.includes('maasranga') || 
      normName.includes('nagorik') || 
      normName.includes('desh tv') || 
      normName.includes('bijoy') || 
      normName.includes('sa tv') || 
      normName.includes('ekushey') || 
      normName.includes('etv') || 
      normName.includes('btv') || 
      normName.includes('sangshad') || 
      normName.includes('asian tv') || 
      normName.includes('mohona') || 
      normName.includes('my tv') || 
      normName.includes('ananda') || 
      normName.includes('star jalsha') || 
      normName.includes('zee bangla') || 
      normName.includes('colors bangla') || 
      normName.includes('sun bangla') || 
      normName.includes('sony aath') || 
      normGroup.includes('bangla') || 
      normGroup.includes('bengali') || 
      normGroup.includes('bd') || 
      normGroup.includes('dhaka')
    ) {
      return 'Bangla';
    }

    if (/bengali|bangla|bd|dhaka/i.test(normGroup)) return 'Bangla';
    if (/sport/i.test(normGroup)) return 'Sports';
    if (/news/i.test(normGroup)) return 'News';
    if (/music/i.test(normGroup)) return 'Music';
    if (/movie|cinema/i.test(normGroup)) return 'Movies';
    if (/kid|cartoon/i.test(normGroup)) return 'Kids';

    return 'Other';
  };

  // Client-side M3U Parser
  const parseM3UClientSide = (content: string, playlistName: string): Channel[] => {
    const lines = content.replace(/\r/g, '').split('\n');
    const results: Channel[] = [];
    let currentMeta: { name: string; logo: string; group: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        let logo = '';
        let group = '';
        const logoMatch = line.match(/tvg-logo=["'](.*?)["']/i);
        const groupMatch = line.match(/group-title=["'](.*?)["']/i);
        if (logoMatch && logoMatch[1]) logo = logoMatch[1];
        if (groupMatch && groupMatch[1]) group = groupMatch[1];

        const commaIdx = line.indexOf(',');
        const titleName = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : 'Unknown Channel';
        currentMeta = { name: titleName, logo, group };
      } else if (line.startsWith('http') && currentMeta) {
        let hash = 0;
        const targetUrl = line;
        for (let j = 0; j < targetUrl.length; j++) {
          hash = ((hash << 5) - hash) + targetUrl.charCodeAt(j);
          hash |= 0;
        }
        const hexHash = Math.abs(hash).toString(16);
        const uniqueId = `ch_custom_pl_${hexHash}_${results.length}`;
        
        const cleanName = sanitizeChannelNameClient(currentMeta.name);
        const resolvedGroup = categorizeChannelClient(cleanName, currentMeta.group);

        results.push({
          id: uniqueId,
          name: cleanName,
          logo: currentMeta.logo || 'https://images.unsplash.com/photo-1540747737956-37872404453a?w=80',
          group: resolvedGroup,
          url: targetUrl,
          playlistSource: playlistName,
          isCustomAdded: true
        });
        currentMeta = null;
      }
    }
    return results;
  };
  
  // Custom Playlist Management actions
  const handleAddPlaylist = async (name: string, url: string) => {
    try {
      const newPlaylist: PlaylistInfo = { name, url, count: 0 };
      const updatedPlaylists = [newPlaylist, ...playlists];
      setPlaylists(updatedPlaylists);
      localStorage.setItem('site_playlists', JSON.stringify(updatedPlaylists));

      // Attempt to fetch and parse client side via the CORS proxy
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      let countLoaded = 0;
      if (res.ok) {
        const text = await res.text();
        const parsed = parseM3UClientSide(text, name);
        countLoaded = parsed.length;

        const savedPlaylistsRaw = localStorage.getItem('site_custom_playlists_channels');
        const currentPlaylistChs: Channel[] = savedPlaylistsRaw ? JSON.parse(savedPlaylistsRaw) : [];
        const filtered = currentPlaylistChs.filter(c => c.playlistSource !== name);
        const updatedChs = [...parsed, ...filtered];
        localStorage.setItem('site_custom_playlists_channels', JSON.stringify(updatedChs));
      }

      const verifiedPlaylists = updatedPlaylists.map(pl => {
        if (pl.name === name) return { ...pl, count: countLoaded };
        return pl;
      });
      setPlaylists(verifiedPlaylists);
      localStorage.setItem('site_playlists', JSON.stringify(verifiedPlaylists));

      alert(`প্লেলিস্ট "${name}" সফলভাবে কাস্টম সংযোজিত হয়েছে এবং ${countLoaded}টি চ্যানেল তালিকায় যুক্ত হয়েছে!`);
      loadChannels();
    } catch (err) {
      console.error(err);
      alert('প্লেলিস্ট যুক্ত হয়েছে, কিন্তু কোড বা সার্ভার সমস্যা হেতু চ্যানেলগুলি রিয়েল-টাইম লোড করা যায়নি।');
    }
  };

  const handleUpdatePlaylist = async (oldName: string, name: string, url: string) => {
    try {
      const updatedPlaylists = playlists.map(pl => {
        if (pl.name === oldName) return { ...pl, name, url };
        return pl;
      });
      setPlaylists(updatedPlaylists);
      localStorage.setItem('site_playlists', JSON.stringify(updatedPlaylists));

      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      let countLoaded = 0;
      if (res.ok) {
        const text = await res.text();
        const parsed = parseM3UClientSide(text, name);
        countLoaded = parsed.length;

        const savedPlaylistsRaw = localStorage.getItem('site_custom_playlists_channels');
        const currentPlaylistChs: Channel[] = savedPlaylistsRaw ? JSON.parse(savedPlaylistsRaw) : [];
        const filtered = currentPlaylistChs.filter(c => c.playlistSource !== oldName && c.playlistSource !== name);
        const updatedChs = [...parsed, ...filtered];
        localStorage.setItem('site_custom_playlists_channels', JSON.stringify(updatedChs));
      }

      const verifiedPlaylists = updatedPlaylists.map(pl => {
        if (pl.name === name) return { ...pl, count: countLoaded };
        return pl;
      });
      setPlaylists(verifiedPlaylists);
      localStorage.setItem('site_playlists', JSON.stringify(verifiedPlaylists));

      setEditingPlaylist(null);
      alert('প্লেলিস্ট কনফিগারেশন সফলভাবে আপডেট করা হয়েছে!');
      loadChannels();
    } catch (err) {
      console.error(err);
      setEditingPlaylist(null);
      alert('প্লেলিস্ট নাম পরিবর্তন হয়েছে, তবে সার্ভার চ্যানেল রিফ্রেশ করা যায়নি।');
    }
  };

  const handleDeletePlaylist = (name: string) => {
    if (window.confirm(`আপনি কি সত্যিই "${name}" প্লেলিস্টটি মুছে দিতে চান? এর ভেতরের সকল চ্যানেলগুলিও মুছে যাবে।`)) {
      const remainingPls = playlists.filter(pl => pl.name !== name);
      setPlaylists(remainingPls);
      localStorage.setItem('site_playlists', JSON.stringify(remainingPls));

      const savedPlaylistsRaw = localStorage.getItem('site_custom_playlists_channels');
      const currentPlaylistChs: Channel[] = savedPlaylistsRaw ? JSON.parse(savedPlaylistsRaw) : [];
      const filteredChs = currentPlaylistChs.filter(c => c.playlistSource !== name);
      localStorage.setItem('site_custom_playlists_channels', JSON.stringify(filteredChs));

      alert('প্লেলিস্ট সম্পূর্ণ সফলভাবে অপসারণ করা হয়েছে!');
      loadChannels();
    }
  };

  // Global /admin Route Auto Detection
  useEffect(() => {
    const checkRoute = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      const s = window.location.search;
      if (
        p === '/admin' || 
        p.endsWith('/admin') || 
        p === '/admin/' ||
        h === '#/admin' || 
        h === '#admin' || 
        s.includes('admin=true')
      ) {
        setCurrentPage('admin');
      }
    };
    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Dynamic live polls editable from Owner dashboard
  const [pollQuestion, setPollQuestion] = useState<string>(() => {
    return localStorage.getItem('site_poll_question') || '';
  });
  const [pollOptions, setPollOptions] = useState<string>(() => {
    return localStorage.getItem('site_poll_options') || '';
  });

  // User database management states
  const [adminUserSearch, setAdminUserSearch] = useState<string>('');
  const [adminVerifiedUsers, setAdminVerifiedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bongo_stream_verified_users') || '[]');
    } catch {
      return [];
    }
  });
  const [adminBannedUsers, setAdminBannedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
    } catch {
      return [];
    }
  });
  const [adminMutedUsers, setAdminMutedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
    } catch {
      return [];
    }
  });

  // Modal and checker system for real updates checking dynamically
  const [isUpdateCheckerOpen, setIsUpdateCheckerOpen] = useState<boolean>(false);
  const [isCheckingUpdateProgress, setIsCheckingUpdateProgress] = useState<boolean>(false);
  const [checkedForUpdates, setCheckedForUpdates] = useState<boolean>(false);

  const handleTriggerUpdateFlow = () => {
    setIsUpdateCheckerOpen(true);
    setIsCheckingUpdateProgress(true);
    setCheckedForUpdates(false);
    
    // Smooth scanning behavior
    setTimeout(() => {
      setIsCheckingUpdateProgress(false);
      setCheckedForUpdates(true);
    }, 1200);
  };

  const handleConfirmBeginUpdate = () => {
    setIsUpdateCheckerOpen(false);
    setIsUpdating(true);
    setUpdateProgress(0);
    setIsUpdateCompleted(false);
    setUpdateStageText('Initializing APK repository connection...');
  };

  useEffect(() => {
    if (!isUpdating) return;

    let timer: any;
    const intervalTime = 50; // Ultra smooth progress timing
    
    timer = setInterval(() => {
      setUpdateProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(timer);
          setIsUpdateCompleted(true);
          setUpdateStageText('Update finished! Ready to reboot application.');
          return 100;
        }
        
        // Compact premium English subtitles (User request: এটি ছোট করে ইংরেজিতে লিখে দিন)
        if (next < 25) {
          setUpdateStageText('Downloading CDN stream playlist config... (' + next + '%)');
        } else if (next >= 25 && next < 55) {
          setUpdateStageText('Resolving video stream buffer decoders... (' + next + '%)');
        } else if (next >= 55 && next < 80) {
          setUpdateStageText('Synchronizing favorite data channels... (' + next + '%)');
        } else {
          setUpdateStageText('Initializing dynamic live 4K user interface... (' + next + '%)');
        }
        
        return next;
      });
    }, intervalTime);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isUpdating]);

  const handleApplyUpdateAndReload = () => {
    const newVersion = localStorage.getItem('latest_available_version') || 'v1.1.0';
    localStorage.setItem('free_world_cup_app_version', newVersion);
    setAppVersion(newVersion);
    setIsUpdating(false);
    window.location.reload();
  };

  // Load stream health status & auth configurations from localStorage on initial load
  useEffect(() => {
    // Fetch global server-persisted branding details
    fetch('/api/branding')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.siteLogoUrl !== undefined) {
            setSiteLogoUrl(data.siteLogoUrl);
            localStorage.setItem('site_logo_url', data.siteLogoUrl);
          }
          if (data.siteNameBangla !== undefined) {
            setSiteNameBangla(data.siteNameBangla);
            localStorage.setItem('site_name_bangla', data.siteNameBangla);
          }
          if (data.siteNameEnglish !== undefined) {
            setSiteNameEnglish(data.siteNameEnglish);
            localStorage.setItem('site_name_english', data.siteNameEnglish);
          }
          if (data.marqueeText !== undefined) {
            setMarqueeText(data.marqueeText);
            localStorage.setItem('site_marquee_text', data.marqueeText);
          }
        }
      })
      .catch(err => console.error('Error fetching global brand config:', err));

    try {
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
      } else {
        // Guest list default check
        const guestFavs = localStorage.getItem('live_tv_favorites_guest') || localStorage.getItem('live_tv_favorites');
        if (guestFavs) {
          setFavorites(JSON.parse(guestFavs));
        }
      }
    } catch (e) {
      console.error('Localstorage parsing error:', e);
    }
  }, []);

  // Synchronize personalized favorites whenever user session logs in or shifts!
  useEffect(() => {
    try {
      const key = currentUser ? `live_tv_favorites_${currentUser.username}` : 'live_tv_favorites_guest';
      const savedFavs = localStorage.getItem(key);
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      } else {
        // Fallback to absolute legacy list so no one loses standard stars
        const legacyFavs = localStorage.getItem('live_tv_favorites');
        if (legacyFavs) {
          setFavorites(JSON.parse(legacyFavs));
          localStorage.setItem(key, legacyFavs);
        } else {
          setFavorites([]);
        }
      }
    } catch (e) {
      console.error('Error load user favs:', e);
    }
  }, [currentUser]);

  // Send periodic presence heartbeats to the server for live user list
  useEffect(() => {
    const reportPresence = () => {
      let username = currentUser?.username;
      let name = currentUser?.name;
      if (!username) {
        let guestId = sessionStorage.getItem('bongo_guest_presence_id');
        if (!guestId) {
          guestId = 'guest_' + Math.floor(Math.random() * 1000000);
          sessionStorage.setItem('bongo_guest_presence_id', guestId);
        }
        username = guestId;
        name = 'ব্যবহারকারী ' + guestId.substring(6);
      }

      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name })
      }).catch(err => {});
    };

    reportPresence();
    const interval = setInterval(reportPresence, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle user authentication sessions
  const [isProfileEditOpen, setIsProfileEditOpen] = useState<boolean>(false);

  const handleUpdateProfile = (newName: string, newAvatar: string) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      name: newName,
      avatar: newAvatar
    };
    setCurrentUser(updated);
    localStorage.setItem('bongo_stream_user_cfg', JSON.stringify(updated));

    // Update locally stored user directory for synchronized logins
    try {
      const dbSaved = localStorage.getItem('bongo_stream_users_db');
      if (dbSaved) {
        const db = JSON.parse(dbSaved);
        const updatedDb = db.map((u: any) => {
          if (u.email === currentUser.username + '@gmail.com' || u.phone === currentUser.phone) {
            return { ...u, name: newName, avatar: newAvatar };
          }
          return u;
        });
        localStorage.setItem('bongo_stream_users_db', JSON.stringify(updatedDb));
      }
    } catch (e) {
      console.error("Failed syncing updated user details", e);
    }
  };

  const handleLoginSuccess = (userByAuth: { 
    name: string; 
    username: string; 
    badge: string;
    phone?: string;
    avatar?: string;
    flag?: string;
  }) => {
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
        // Load custom channels from localStorage too
        const savedCustomRaw = localStorage.getItem('site_custom_channels');
        const customChs: Channel[] = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
        
        // Load custom playlists channels too if any exist
        const savedPlaylistsRaw = localStorage.getItem('site_custom_playlists_channels');
        const customPlaylistChs: Channel[] = savedPlaylistsRaw ? JSON.parse(savedPlaylistsRaw) : [];
        
        let mergedList = [...customChs, ...customPlaylistChs, ...uniqueChannels];
        
        // Filter out deleted channels as managed by the Owner Dashboard
        const deletedIdsRaw = localStorage.getItem('site_deleted_channel_ids');
        const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
        
        const activeList = mergedList.filter(c => !deletedIds.includes(c.id));
        setChannels(activeList);
        
        // Auto-select the first verified/working channel if none is active
        if (activeList.length > 0 && !selectedChannel) {
          const firstVerified = activeList.find((c: Channel) => c.playlistSource.includes('Built-in')) || activeList[0];
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
    
    // Save under dynamic user key
    const key = currentUser ? `live_tv_favorites_${currentUser.username}` : 'live_tv_favorites_guest';
    localStorage.setItem(key, JSON.stringify(updated));
    // Legacy backup
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
      live: workingChannels.filter(ch => channelHealth[ch.id] === 'working').length,
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
          const isLive = channelHealth[ch.id] === 'working';
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

  // Full-screen aesthetic system update overlay to block interactions and display progress beautifully
  if (isUpdating) {
    return (
      <div id="immersive-update-takeover" className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 md:p-8 bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
        {/* Ambient background grids and glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />
        <div className="absolute top-[15%] left-[20%] w-[380px] h-[380px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[15%] w-[320px] h-[320px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900 border-2 border-slate-800/85 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 text-center animate-fade-in">
          
          {/* Pulsating Glowing Update Disk Representation */}
          <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center select-none">
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-500/40 animate-spin" style={{ animationDuration: '12s' }} />
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-sky-500/40 animate-[spin_6s_linear_infinite_reverse]" />
            <div className={`absolute inset-4 rounded-full bg-slate-950 flex items-center justify-center border-2 border-slate-800 shadow-inner [transition:all_0.3s] ${isUpdateCompleted ? 'border-emerald-500/50' : 'border-amber-500/50'}`}>
              <RefreshCw className={`w-6 h-6 ${isUpdateCompleted ? 'text-emerald-400' : 'text-amber-400 animate-spin'}`} style={{ animationDuration: isUpdateCompleted ? '0s' : '3s' }} />
            </div>
            
            {/* Small live pulsating status beacon */}
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUpdateCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isUpdateCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>

          <div className="flex flex-col gap-1 items-center justify-center">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
              {siteNameEnglish}
            </h2>
            <p className="text-2xs font-mono text-slate-500">System Update Installer</p>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded-full mt-3 text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">
            <span>Updating System Files</span>
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
          </div>

          {/* Core Descriptive message in premium clean English */}
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-3.5 max-w-xs mx-auto">
            Please wait while the update process finishes. Do not close or reload the window during this installation.
          </p>

          {/* Progress Circular and Checklist display */}
          <div className="mt-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Progress Tracker</span>
              <span className="text-xs font-black text-amber-400 font-mono">{updateProgress}%</span>
            </div>

            {/* Premium Progress Bar */}
            <div className="w-full h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-sky-400 rounded-full transition-all duration-70"
                style={{ width: `${updateProgress}%` }}
              />
            </div>

            {/* Dynamic Step Patching list items in premium English interface (User request: এটি ছোট করে ইংরেজিতে লিখে দিন) */}
            <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-400">
              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                <span className={updateProgress >= 20 ? 'text-emerald-400 font-bold' : 'text-slate-50s'}>1. Verifying Stream Signatures</span>
                <span>{updateProgress >= 20 ? '[Done]' : '[Waiting]'}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                <span className={updateProgress >= 50 ? 'text-emerald-400 font-bold' : 'text-slate-50s'}>2. Fetching Server Playlists</span>
                <span>{updateProgress >= 50 ? '[Done]' : updateProgress >= 20 ? '[Downloading]' : '[Waiting]'}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                <span className={updateProgress >= 80 ? 'text-emerald-400 font-bold' : 'text-slate-50s'}>3. Optimizing Buffer Latency</span>
                <span>{updateProgress >= 80 ? '[Done]' : updateProgress >= 50 ? '[Installing]' : '[Waiting]'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={updateProgress === 100 ? 'text-emerald-400 font-bold' : 'text-slate-50s'}>4. Finalizing Application Shell</span>
                <span>{updateProgress === 100 ? '[Ready]' : '[Waiting]'}</span>
              </div>
            </div>
          </div>

          {/* Dynamic current stage logs ticker block */}
          <div className="mt-4 text-center min-h-[32px] flex items-center justify-center">
            <p className="text-[11px] text-amber-350 font-medium font-sans animate-pulse">
              {updateStageText}
            </p>
          </div>

          {/* Bottom Interactive Complete Update trigger action */}
          <div className="mt-4 border-t border-slate-800 pt-4 flex flex-col items-center">
            {isUpdateCompleted ? (
              <button
                id="btn-apply-installation-reboot"
                onClick={handleApplyUpdateAndReload}
                className="w-full py-3 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[11px] font-black rounded-xl shadow-xl hover:shadow-emerald-950/20 transform hover:-translate-y-0.5 active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '4s' }} />
                <span>Reboot & Update Now</span>
              </button>
            ) : (
              <div className="w-full py-2.5 px-4 bg-slate-950 border border-slate-850 text-slate-500 text-[10px] uppercase tracking-widest rounded-xl text-center">
                Installing System Updates... Please wait
              </div>
            )}
            
            {/* Simulation Exit button so the owner can exit simulated lockouts */}
            <button 
              onClick={() => setIsUpdating(false)}
              className="mt-3 text-[10px] text-slate-600 hover:text-slate-400 underline transition-colors cursor-pointer"
            >
              Exit Simulated Update Mode
            </button>
          </div>
        </div>

        {/* Dynamic Watermark details footer */}
        <p className="text-[9px] text-slate-700 font-mono mt-6">
          Free World Cup BD (Aesthetic Updater) • Core Package Engine
        </p>
      </div>
    );
  }

  if (currentPage === 'landing') {
    return (
      <div id="bongo-routing-landing-wrapper">
        <LandingPage
          onStartApp={() => setCurrentPage('app')}
          onOpenLogin={() => setIsAuthOpen(true)}
          onOpenAdmin={() => setCurrentPage('admin')}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onLogout={handleLogout}
          channels={channels}
          onTriggerUpdate={handleTriggerUpdateFlow}
          isUpdateBroadcastActive={isUpdateBroadcastActive}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  if (currentPage === 'admin' && !isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-4 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative z-10 animate-fade-in">
          <div className="text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-sans">PORTAL SECURITY GATEWAY</h3>
            <p className="text-[10px] text-slate-450 mt-1 leading-normal font-sans">Restricted access block. Enter valid administrative credentials to verify identity.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const pw = (f.elements.namedItem('admin_password') as HTMLInputElement).value;
              
              if (pw === 'MUNNA12061') {
                setIsAdminAuthorized(true);
                localStorage.setItem('bongo_admin_authorized', 'true');
              } else {
                alert('দুঃখিত, আপনি ভুল এডমিন পাসওয়ার্ড দিয়েছেন!');
              }
            }}
            className="flex flex-col gap-4 border-none"
          >
            <div>
              <label className="text-[9px] text-slate-450 font-extrabold block mb-1 uppercase tracking-wider font-sans">Gateway Password</label>
              <input
                name="admin_password"
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all text-center select-none"
            >
              Verify Administrative Access
            </button>
            
            <button
              type="button"
              onClick={() => setCurrentPage('app')}
              className="w-full text-center text-[10px] text-slate-500 hover:text-slate-450 font-bold underline mt-1 cursor-pointer select-none"
            >
              Cancel & Return
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-sky-500/35 selection:text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
        
        {/* Floating Top Header */}
        <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/90 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage('app')}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sky-400 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="প্লেয়ারে ফিরে যান"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>প্লেয়ারে যান (Go to Player)</span>
              </button>
              
              <button
                onClick={() => setCurrentPage('landing')}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="হোমপেজে ফিরে যান"
              >
                <span>হোমপেজ (Landing Page)</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                👑 LIVE SITE ADMIN PORTAL & CONTROLLER
              </span>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-extrabold uppercase animate-pulse hidden sm:inline">Owner Deck</span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 relative z-10 flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <div className="bg-slate-900/60 border border-slate-900/90 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">কন্ট্রোল ডেক মেনু</span>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: 'branding', label: '১. ব্র্যান্ডিং ও লোগো' },
                  { id: 'channels', label: '২. চ্যানেল ও প্লেলিস্ট' },
                  { id: 'ads', label: '৩. বিজ্ঞাপন ম্যানেজার' },
                  { id: 'moderation', label: '৪. ইউজার ও কুসংস্কার' },
                  { id: 'system', label: '৫. নোটিশ ও ওভারলে' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAdminActiveTab(tab.id as any)}
                    className={`text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer text-left transition-all flex items-center justify-between shadow-sm
                      ${adminActiveTab === tab.id
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-slate-950/40 hover:bg-slate-900 hover:text-white text-slate-400 border border-transparent'
                      }
                    `}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Viewer panel */}
          <div className="flex-1 bg-slate-900/50 border border-slate-900/90 rounded-2xl p-6 md:p-8 min-h-[450px]">
            {/* TAB 1: BRANDING AND LOGO */}
            {adminActiveTab === 'branding' && (
              <div className="flex flex-col gap-4 animate-fade-in font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">ইংলিশ সাইট নাম (English Brand Name)</label>
                    <input
                      type="text"
                      value={siteNameEnglish}
                      onChange={(e) => {
                        setSiteNameEnglish(e.target.value);
                        localStorage.setItem('site_name_english', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                      placeholder="e.g. Free World Cup BD"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">বাংলা সাইট নাম (Bangla Brand Name)</label>
                    <input
                      type="text"
                      value={siteNameBangla}
                      onChange={(e) => {
                        setSiteNameBangla(e.target.value);
                        localStorage.setItem('site_name_bangla', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                      placeholder="e.g. বিডি লাইভ টিভি"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">সাইট লোগো ছবি লিংক (Custom Brand Image Logo URL)</label>
                  <input
                    type="text"
                    value={siteLogoUrl}
                    onChange={(e) => {
                      setSiteLogoUrl(e.target.value);
                      localStorage.setItem('site_logo_url', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                    placeholder="পছন্দের লোগো ছবির সম্পূর্ণ URL পেস্ট করুন..."
                  />
                  
                  {/* Visual presets */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] text-slate-45 uppercase font-bold">লোগো প্রিসেটস গ্যালারি:</span>
                    <button
                      onClick={() => {
                        const url = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=120&auto=format&fit=crop';
                        setSiteLogoUrl(url);
                        localStorage.setItem('site_logo_url', url);
                      }}
                      className="text-[9px] bg-slate-950 hover:bg-slate-850 px-2 py-0.5 rounded text-amber-400 border border-slate-800 cursor-pointer animate-none"
                    >
                      ⚽ Gold Football
                    </button>
                    <button
                      onClick={() => {
                        const url = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=120&auto=format&fit=crop';
                        setSiteLogoUrl(url);
                        localStorage.setItem('site_logo_url', url);
                      }}
                      className="text-[9px] bg-slate-950 hover:bg-slate-850 px-2 py-0.5 rounded text-sky-400 border border-slate-800 cursor-pointer animate-none"
                    >
                      🏃 Blue Runner
                    </button>
                    <button
                      onClick={() => {
                        setSiteLogoUrl('');
                        localStorage.setItem('site_logo_url', '');
                      }}
                      className="text-[9px] bg-slate-950 hover:bg-slate-850 px-2 py-0.5 rounded text-rose-400 border border-slate-800 cursor-pointer animate-none"
                    >
                      ❌ ডিফল্ট রিসেট
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">চলতি ঘোষণা সতর্কবার্তা (Running Warning Announcement Scroller)</label>
                  <textarea
                    value={marqueeText}
                    onChange={(e) => {
                      setMarqueeText(e.target.value);
                      localStorage.setItem('site_marquee_text', e.target.value);
                    }}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-550 resize-none leading-relaxed font-sans"
                    placeholder="চলমান লাল স্লাইডিং ঘোষণা বার্তাটি এখানে লিখুন..."
                  />
                </div>

                <button
                  onClick={() => {
                    fetch('/api/branding', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        siteLogoUrl,
                        siteNameBangla,
                        siteNameEnglish,
                        marqueeText
                      })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        alert('অভিনন্দন! আপনার ব্র্যান্ডিং এবং কাস্টম লোগো কনফিগারেশন সার্ভারে সফলভাবে সংরক্ষণ করা হয়েছে। এখন সবার ল্যান্ডিং পেজেই এই লোগোটি রিয়েল-টাইমে শো করবে।');
                      } else {
                        alert('ত্রুটি: কাস্টম ব্র্যান্ডিং কন্টেন্ট সেভ করা সম্ভব হয়নি!');
                      }
                    })
                    .catch(e => {
                      alert('সার্ভার কানেকশন ত্রুটি: ' + e.message);
                    });
                  }}
                  className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 text-center flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                  <span>সার্ভারে গ্লোবাল লোগো ও ব্র্যান্ডিং সংরক্ষণ করুন (Save Brand Config on Server)</span>
                </button>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-black text-slate-300 uppercase block mb-1">ভিডিও লাইভ প্রিভিউ (Immediate Live Match View)</span>
                  <p className="text-[11px] text-slate-400">ল্যান্ডিং পেইজ এবং মূল প্লেয়ারে উপরে প্রদত্ত তথ্যগুলো এখনই রিয়েল-টাইমে আপডেট হয়ে গেছে।</p>
                </div>
              </div>
            )}

            {/* TAB 2: CHANNEL AND PLAYLIST MANAGEMENT */}
            {adminActiveTab === 'channels' && (
              <div className="flex flex-col gap-6 animate-fade-in font-sans">
                {/* GRID FOR PORTAL CONTROLS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* PANEL A: M3U PLAYLIST MULTI-SERVER MANAGER */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-xs font-black text-sky-450 uppercase tracking-wider">📡 লাইভ চ্যানেল ফিড রিসিভার (Stream Feed Manager)</span>
                      <span className="text-[10px] bg-slate-900 text-sky-400 px-2.5 py-0.5 rounded border border-slate-800 font-mono">
                        Active: {playlists.length}
                      </span>
                    </div>

                    {/* Playlists Management Form */}
                    {editingPlaylist ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = e.currentTarget;
                          const name = (f.elements.namedItem('pl_edit_name') as HTMLInputElement).value;
                          const url = (f.elements.namedItem('pl_edit_url') as HTMLInputElement).value;
                          handleUpdatePlaylist(editingPlaylist.name, name, url);
                        }}
                        className="bg-sky-500/5 p-3 rounded-xl border border-sky-500/20 flex flex-col gap-2"
                      >
                        <span className="text-[10px] uppercase font-black text-sky-400">প্লেলিস্ট এডিট করুন (Edit Playlist)</span>
                        <div className="flex flex-col gap-2 text-xs">
                          <input
                            name="pl_edit_name"
                            type="text"
                            defaultValue={editingPlaylist.name}
                            placeholder="প্লেলিস্ট নাম (e.g. BD Premium Pack)"
                            className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-bold"
                          />
                          <input
                            name="pl_edit_url"
                            type="text"
                            defaultValue={editingPlaylist.url}
                            placeholder="চ্যানেল ফিড প্লেলিস্ট লিঙ্ক..."
                            className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div className="flex gap-2 justify-end mt-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setEditingPlaylist(null)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-bold cursor-pointer transition-all"
                          >
                            বাতিল করুন (Cancel)
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-550 text-white font-bold rounded cursor-pointer transition-all"
                          >
                            আপডেট করুন (Save)
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = e.currentTarget;
                          const name = (f.elements.namedItem('pl_name') as HTMLInputElement).value;
                          const url = (f.elements.namedItem('pl_url') as HTMLInputElement).value;
                          
                          if (!name || !url) {
                            alert('নাম এবং লিংক দুটোই লিখুন!');
                            return;
                          }
                          handleAddPlaylist(name, url);
                          f.reset();
                        }}
                        className="flex flex-col gap-2.5 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            name="pl_name"
                            type="text"
                            placeholder="প্লেলিস্ট নাম (e.g. BD Sports Channel Pack)"
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-sans"
                          />
                          <input
                            name="pl_url"
                            type="text"
                            placeholder="চ্যানেল ফিড লিঙ্ক..."
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-sky-600 hover:bg-sky-550 text-white font-extrabold text-[11px] py-2.5 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-sky-500/20 active:scale-95"
                        >
                          ফিড প্লেলিস্ট যোগ করুন (Fetch & Add Live Feed Source) 🚀
                        </button>
                      </form>
                    )}

                    {/* Table of added playlists */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">সংযুক্ত প্লেলিস্টসমূহ (Added Playlists List)</span>
                      {playlists.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic pl-1">কোনো কাস্টম প্লেলিস্ট যুক্ত নেই। আনলিমিটেড প্লেলিস্ট যুক্ত করতে উপরের ফর্মটি পূরণ করুন।</p>
                      ) : (
                        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                          {playlists.map((pl) => (
                            <div key={pl.name} className="flex items-center justify-between bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-xs gap-3 hover:border-slate-800/80 transition-all">
                              <div className="truncate flex-1">
                                <span className="font-extrabold text-slate-200 block truncate">{pl.name}</span>
                                <span className="text-[9px] text-sky-400 font-mono block mt-0.5 truncate">{pl.url}</span>
                                <span className="text-[8px] bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-800 font-bold inline-block mt-1">
                                  {pl.count} Channels Loaded
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingPlaylist(pl)}
                                  className="p-1 px-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded text-sky-400 cursor-pointer"
                                  title="এডিট করুন"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeletePlaylist(pl.name);
                                  }}
                                  className="p-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded text-rose-400 cursor-pointer"
                                  title="অনলিস্ট ও রিমুভ করুন"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PANEL B: CUSTOM INDIVIDUAL CHANNEL MANAGEMENT */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-xs font-black text-sky-455 uppercase tracking-wider">📥 একক কাস্টম চ্যানেল সংযোজন করুন</span>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                        Manual Add
                      </span>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.currentTarget;
                        const name = (f.elements.namedItem('ch_name') as HTMLInputElement).value;
                        const src = (f.elements.namedItem('ch_src') as HTMLInputElement).value;
                        const logo = (f.elements.namedItem('ch_logo') as HTMLInputElement).value;
                        const group = (f.elements.namedItem('ch_group') as HTMLSelectElement).value;

                        if (!name || !src) {
                          alert('চ্যানেলের নাম এবং ভিডিও স্ট্রিম ফিল্ড দুটি আবশ্যিক!');
                          return;
                        }

                        const newChan: Channel = {
                          id: `custom_${Date.now()}`,
                          name,
                          logo: logo || 'https://images.unsplash.com/photo-1540747737956-37872404453a?w=80',
                          group,
                          url: src,
                          playlistSource: 'Built-in Owner Proxy Override',
                          isCustomAdded: true
                        };

                        const savedCustomRaw = localStorage.getItem('site_custom_channels');
                        const currentCustoms = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
                        const updated = [newChan, ...currentCustoms];
                        localStorage.setItem('site_custom_channels', JSON.stringify(updated));
                        
                        alert(`অভিনন্দন! "${name}" চ্যানেলটি সফলভাবে আপনার লাইভ প্লেলিস্টে সংযোজন করা হয়েছে।`);
                        f.reset();
                        loadChannels();
                      }}
                      className="flex flex-col gap-2.5 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          name="ch_name"
                          type="text"
                          placeholder="চ্যানেলের নাম (e.g. T-Sports Star Live)"
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                        <input
                          name="ch_src"
                          type="text"
                          placeholder="স্ট্রিম লিঙ্ক (.m3u8, .mpd, mp4 link)"
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                        />
                        <input
                          name="ch_logo"
                          type="text"
                          placeholder="লোগো ছবি লিঙ্ক (Optional logo URL)"
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                        <select
                          name="ch_group"
                          className="bg-slate-900 border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none rounded-xl"
                        >
                          <option value="Sports">Sports (খেলাধুলা)</option>
                          <option value="Cricket">Cricket Feed</option>
                          <option value="Bangla">Bangla TV</option>
                          <option value="Entertainment">বিনোদন (Entertainment)</option>
                          <option value="News">সংবাদ (News)</option>
                          <option value="Music">গান (Music)</option>
                          <option value="Movies">চলচ্চিত্র (Movies)</option>
                          <option value="Kids">কার্টুন (Kids)</option>
                          <option value="Other">অন্যান্য (Other)</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-[11px] py-2.5 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-indigo-500/20 active:scale-95"
                      >
                        চ্যানেলটি যুক্ত করুন (Save Local Custom Channel) ➕
                      </button>
                    </form>
                  </div>
                </div>

                {/* BOTTOM COMPONENT FOR TV CHANNELS VIEW */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div>
                      <span className="text-xs font-black text-slate-300 uppercase block tracking-wider">📺 লাইভ চ্যানেল ডাটাবেজ অ্যাড্রেস ও গ্লোবাল রিমুভাল কন্ট্রোল</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                        প্রয়োজনে যেকোনো চ্যানেল মুছে দিতে (Delete) ক্লিক করুন, সেটি দর্শকরা আর কখনো দেখতে পাবে না।
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-900 text-teal-400 px-2.5 py-1 rounded border border-slate-800 font-mono">
                      Total Channels: {channels.length} Active
                    </span>
                  </div>

                  {/* Channel list wrapper */}
                  <div className="flex flex-col gap-3">
                    <div className="max-h-[300px] overflow-y-auto border border-slate-900 rounded-xl bg-slate-950 p-2 space-y-1.5 scrollbar-thin font-sans text-xs">
                      {channels.map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between p-2 hover:bg-slate-900/60 transition-colors rounded-xl border border-slate-900 text-xs gap-3">
                          <div className="flex items-center gap-2.5 truncate flex-1">
                            <span className="text-base">📺</span>
                            <div className="truncate">
                              <span className="font-extrabold text-slate-200 block truncate max-w-[280px]">{ch.name}</span>
                              <span className="text-[8.5px] text-slate-400 font-mono block mt-0.5 max-w-[340px] truncate">
                                Group: {ch.group} | Source: {ch.playlistSource}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`আপনি কি সত্যিই "${ch.name}" চ্যানেলটি দর্শক ইন্টারফেস থেকে সাময়িকভাবে মুছে ফেলতে চান?`)) {
                                if (ch.isCustomAdded) {
                                  // Remove from customs
                                  const savedCustomRaw = localStorage.getItem('site_custom_channels');
                                  const customs: any[] = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
                                  const filtered = customs.filter(c => c.id !== ch.id);
                                  localStorage.setItem('site_custom_channels', JSON.stringify(filtered));
                                } else {
                                  // Put in deletedIds pool
                                  const deletedIdsRaw = localStorage.getItem('site_deleted_channel_ids');
                                  const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
                                  deletedIds.push(ch.id);
                                  localStorage.setItem('site_deleted_channel_ids', JSON.stringify(deletedIds));
                                }
                                alert('চ্যানেলটি সফলভাবে রিমুভ করা হয়েছে!');
                                loadChannels();
                              }
                            }}
                            className="p-1 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-950/20 rounded-lg font-bold text-[9px] cursor-pointer transition-all shrink-0 uppercase tracking-tight"
                          >
                            মুছুন (Delete) 🗑️
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* TRASH STORAGE ARCHIVE SECTION */}
                    <div className="border-t border-slate-900 pt-3.5 mt-1.5">
                      <span className="text-[10px] font-black text-rose-400 block mb-2 uppercase tracking-widest flex items-center gap-1.5 select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        🗑️ মুছে ফেলা চ্যানেল ও ক্যাশে আর্কাইভ (Trash Storage Archive)
                      </span>
                      {(() => {
                        const deletedIdsRaw = localStorage.getItem('site_deleted_channel_ids');
                        const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
                        
                        if (deletedIds.length === 0) {
                          return <p className="text-[10px] text-slate-500 italic">কোনো ডিলিটেড চ্যানেল ট্র্যাশ কন্টেইনারে অবশিষ্ট নেই।</p>;
                        }

                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {deletedIds.map((id) => (
                              <div key={id} className="inline-flex items-center gap-2 bg-slate-950/90 border border-rose-950/20 text-[10px] p-1.5 px-3 rounded-xl hover:border-rose-900/40 transition-all shadow-sm">
                                <span className="text-slate-400 font-mono text-[9px]">ID: {id.substring(0, 10)}...</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = deletedIds.filter(dId => dId !== id);
                                    localStorage.setItem('site_deleted_channel_ids', JSON.stringify(filtered));
                                    alert('অভিনন্দন! চ্যানেলটি প্লেয়ারে রিকভার করা হয়েছে!');
                                    loadChannels();
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 cursor-pointer text-[9px] uppercase tracking-wider transition-all"
                                >
                                  রিকভার (Restore) 🔄
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
              {/* TAB 3: SPONSOR ADS CONTROL */}
            {adminActiveTab === 'ads' && (
              <div className="flex flex-col gap-5 animate-fade-in font-sans">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wide">💼 বিজ্ঞাপন স্ক্রিপ্ট ম্যানেজার (HTML / JS Script Placements)</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase select-none">LIVE EVALUATION</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  এখানে আপনি আপনার <strong>Adsterra, Google AdSense, RevenueHits</strong> বা যেকোনো এড নেটওয়ার্কের সম্পূর্ণ বিজ্ঞাপন কোড (HTML, iframe, or Javascript Code) পেস্ট করতে পারেন। কোনো কোড ফাকা বা খালি থাকলে সাইটে কোনো ব্যানার বা প্লেসহোল্ডার টেক্সট প্রদর্শিত হবে না।
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Billboard Top Banner script editor */}
                  <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                    <span className="text-xs font-extrabold text-slate-200 block font-sans tracking-tight">১. হেডার ল্যান্ডস্কেপ ব্যানার কোড (Billboard Top Banner Script)</span>
                    <span className="text-[9.5px] text-slate-500 block leading-tight">অনুসন্ধান বাটন ও ঘোষণার ঠিক উপরে প্রদর্শিত হবে।</span>
                    <textarea
                      value={adCodes.topBanner}
                      onChange={(e) => setAdCodes(p => ({ ...p, topBanner: e.target.value }))}
                      rows={4}
                      placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                      className="w-full bg-slate-900 border border-slate-805 rounded-xl p-2.5 text-2xs font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                    />
                  </div>

                  {/* Bottom sponsor script editor */}
                  <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                    <span className="text-xs font-extrabold text-slate-200 block font-sans tracking-tight">২. ফুটার বিজ্ঞাপন ব্যানার কোড (Footer Bottom Banner Script)</span>
                    <span className="text-[9.5px] text-slate-505 block leading-tight">চ্যানেল গ্রিড টেবিলের ঠিক নিচে শেষভাগে ইম্প্যাক্ট ব্যানার।</span>
                    <textarea
                      value={adCodes.bottomBanner}
                      onChange={(e) => setAdCodes(p => ({ ...p, bottomBanner: e.target.value }))}
                      rows={4}
                      placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                      className="w-full bg-slate-900 border border-slate-805 rounded-xl p-2.5 text-2xs font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                    />
                  </div>

                  {/* Pop-under script editor */}
                  <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                    <span className="text-xs font-extrabold text-slate-200 block font-sans tracking-tight">৩. পপ-আন্ডার ব্যানার স্ক্রিপ্ট (Pop-under Script Code)</span>
                    <span className="text-[9.5px] text-slate-505 block leading-tight">ডাইরেক্ট স্ক্রিপ্ট লিংক বা জাভাস্ক্রিপ্ট ট্যাগ এখানে পেস্ট করুন।</span>
                    <textarea
                      value={adCodes.popUnder}
                      onChange={(e) => setAdCodes(p => ({ ...p, popUnder: e.target.value }))}
                      rows={4}
                      placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                      className="w-full bg-slate-900 border border-slate-805 rounded-xl p-2.5 text-2xs font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                    />
                  </div>

                  {/* Social Bar editor */}
                  <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                    <span className="text-xs font-extrabold text-slate-200 block font-sans tracking-tight">৪. কর্নার সোশ্যাল নোটিফিকেশন বার (Social Bar HTML)</span>
                    <span className="text-[9.5px] text-slate-505 block leading-tight">নোটিফিকেশন বার বা উইজেট কোড পেস্ট করতে ব্যবহৃত হয়।</span>
                    <textarea
                      value={adCodes.socialBar}
                      onChange={(e) => setAdCodes(p => ({ ...p, socialBar: e.target.value }))}
                      rows={4}
                      placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                      className="w-full bg-slate-900 border border-slate-805 rounded-xl p-2.5 text-2xs font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('site_ad_top_code', adCodes.topBanner);
                    localStorage.setItem('site_ad_bottom_code', adCodes.bottomBanner);
                    localStorage.setItem('site_ad_pop_code', adCodes.popUnder);
                    localStorage.setItem('site_ad_social_code', adCodes.socialBar);
                    alert('সফলভাবে সমস্ত বিজ্ঞাপন কোডসমূহ সংরক্ষণ করা হয়েছে!');
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-505 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-sky-500/10 active:scale-95 text-center block uppercase tracking-wide"
                >
                  বিজ্ঞাপন কোডগুলো সংরক্ষণ করুন (Save Ad Placements Database) 💾
                </button>
              </div>
            )}

            {/* TAB 4: CHAT MODERATION, ANALYTICS AND TV PREVIEWS */}
            {adminActiveTab === 'moderation' && (
              <div className="flex flex-col gap-5 animate-fade-in font-sans">
                {/* 1. SECURE ANALYTICS CORE DECKS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-855 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider block">মোট নিবন্ধিত ব্যবহারকারী</span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {(() => {
                        try {
                          return JSON.parse(localStorage.getItem('bongo_stream_users_db') || '[]').length;
                        } catch { return 0; }
                      })()} জন
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-sans">রিয়েল-টাইম ডেটাবেজ স্ট্যাটাস</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-855 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">চ্যাট রুম ওপেন কাউন্টার</span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {localStorage.getItem('bongo_chat_open_counts') || '0'} বার
                    </h3>
                    <p className="text-[9px] text-slate-505 mt-0.5 font-sans">চ্যাট উইন্ডো খুলেছেন এমন দর্শকদের সংখ্যা</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-855 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">চলতি মাসের একাউন্টস ক্রিয়েশন</span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {(() => {
                        try {
                          const users = JSON.parse(localStorage.getItem('bongo_stream_users_db') || '[]');
                          const thisMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
                          return users.filter((u: any) => {
                            const d = u.createdAt ? new Date(u.createdAt) : new Date();
                            return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) === thisMonth;
                          }).length;
                        } catch { return 0; }
                      })()} টি
                    </h3>
                    <p className="text-[9px] text-slate-505 mt-0.5 font-sans">বর্তমান মাসব্যাপী নতুন মেম্বার সংখ্যা</p>
                  </div>
                </div>

                {/* Monthly account registration timeline charts */}
                <div className="bg-slate-955/65 border border-slate-850 p-4 rounded-2xl flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider block">মাসভিত্তিক ইউজার সাইন আপ এবং অ্যাকাউন্ট ক্রিয়েশন ট্র্যাকার</span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-1">
                    {['January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026'].map((monthStr) => {
                      const count = (() => {
                        try {
                          const users = JSON.parse(localStorage.getItem('bongo_stream_users_db') || '[]');
                          return users.filter((u: any) => {
                            const d = u.createdAt ? new Date(u.createdAt) : new Date('2026-05-15');
                            return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) === monthStr;
                          }).length;
                        } catch { return 0; }
                      })();
                      return (
                        <div key={monthStr} className="p-2.5 bg-slate-900/60 border border-slate-850 rounded-xl text-center flex flex-col justify-between">
                          <span className="text-[9px] text-slate-450 font-mono block">{monthStr.replace(' 2026', '')}</span>
                          <span className="text-sm font-black text-white block mt-1">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CHANNELS AND STREAM URLS DASHBOARD PREVIEW */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-tight block mb-2">৫. রিয়্যাল-টাইম স্ট্রিম চ্যানেল ও সার্ভার স্ট্যাটাস ট্র্যাকার</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {channels.map((chan) => (
                      <div key={chan.id} className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-100">{chan.name}</span>
                            <span className="text-[8px] bg-slate-950 text-sky-400 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 uppercase leading-none">{chan.group}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono block truncate mt-1">{chan.streamUrl || 'No Direct URL'}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedChannel(chan);
                            setCurrentPage('app');
                            alert(`সার্ভারে "${chan.name}" দেখতে নিয়ে যাওয়া হচ্ছে...`);
                          }}
                          className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] text-sky-400 font-bold rounded cursor-pointer select-none transition-all shrink-0"
                        >
                          ভিজিট চ্যানেল
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. ACTIVE LIVE CHAT STREAM FEED WITH CLICK-TO-BAN AND ACTION POPUPS */}
                <div className="bg-slate-950 border border-slate-855 p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wider">রিয়েল-টাইম মডারেশন কন্ট্রোল (ক্লিক করুন ব্যান/আনমিউট করতে)</span>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('আপনি কি সত্যিই সম্পূর্ণ চ্যাট বোর্ড মুছে দিতে চান?')) {
                          localStorage.setItem('bongo_live_chat_messages_db', '[]');
                          alert('চ্যাট বোর্ড খালি করা সফল হয়েছে!');
                          window.dispatchEvent(new Event('storage'));
                        }
                      }}
                      className="text-[9px] bg-rose-500/10 text-rose-455 hover:bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/20 font-bold cursor-pointer transition-colors"
                    >
                      ক্লিয়ার অল চ্যাট
                    </button>
                  </div>

                  {/* Scrollable messages and inline controls */}
                  <div className="max-h-[250px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-900/40 p-3 space-y-1.5 scrollbar-thin">
                    {(() => {
                      const dbRaw = localStorage.getItem('bongo_live_chat_messages_db');
                      let chats: any[] = [];
                      try { chats = dbRaw ? JSON.parse(dbRaw) : []; } catch(e){}

                      if (chats.length === 0) {
                        return <p className="text-[10px] text-slate-500 italic text-center py-4">চ্যাট বোর্ডে কোনো নতুন মেসেজ পাঠানো হয়নি।</p>;
                      }

                      const banned = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
                      const muted = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');

                      return chats.map((c: any) => {
                        const isBanned = banned.includes(c.username);
                        const isMuted = muted.includes(c.username);

                        return (
                          <div key={c.id} className="p-2 bg-slate-950/40 hover:bg-slate-900 border border-slate-850/60 rounded-xl flex items-center justify-between gap-3 text-xs flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] text-slate-500 shrink-0 font-mono">{c.time}</span>
                                <span className="text-xs shrink-0">{c.flag}</span>
                                <span
                                  title="ব্যবহারকারীর উপর মড অ্যাকশন নিতে এখানে ক্লিক করুন"
                                  onClick={() => {
                                    const act = window.confirm(`আপনি কি "${c.name}" (@${c.username}) এর উপর মডারেশন অ্যাকশন নিতে চান?`);
                                    if (act) {
                                      const promptMsg = prompt(`অ্যাকশন টাইপ করুন:\n"ban" — ব্যান করতে\n"unban" — ব্যান তুলতে\n"mute" — মিউট করতে\n"unmute" — মিউট তুলতে\n"delete" — মেসেজ মুছে দিতে`);
                                      if (!promptMsg) return;
                                      
                                      const action = promptMsg.trim().toLowerCase();
                                      if (action === 'ban') {
                                        const bList = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
                                        if (!bList.includes(c.username)) bList.push(c.username);
                                        localStorage.setItem('bongo_stream_banned_users', JSON.stringify(bList));
                                        
                                        // Delete messages
                                        const filtered = chats.filter(m => m.username !== c.username);
                                        localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filtered));
                                        alert(`সফলভাবে "${c.username}" ব্যান করা হয়েছে!`);
                                      } else if (action === 'unban') {
                                        const bList = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
                                        localStorage.setItem('bongo_stream_banned_users', JSON.stringify(bList.filter((u: any) => u !== c.username)));
                                        alert(`"${c.username}" এর ব্যান প্রত্যাহার করা হয়েছে।`);
                                      } else if (action === 'mute') {
                                        const mList = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
                                        if (!mList.includes(c.username)) mList.push(c.username);
                                        localStorage.setItem('bongo_stream_muted_users', JSON.stringify(mList));
                                        alert(`"${c.username}" মিউট করা হয়েছে।`);
                                      } else if (action === 'unmute') {
                                        const mList = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
                                        localStorage.setItem('bongo_stream_muted_users', JSON.stringify(mList.filter((u: any) => u !== c.username)));
                                        alert(`"${c.username}" এর মিউট প্রত্যাহার করা হয়েছে।`);
                                      } else if (action === 'delete') {
                                        const filtered = chats.filter(m => m.id !== c.id);
                                        localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filtered));
                                        alert('মেসেজটি মুছে দেওয়া হয়েছে!');
                                      } else {
                                        alert('ভুল অ্যাকশন টাইপ করেছেন।');
                                      }
                                      window.dispatchEvent(new Event('storage'));
                                    }
                                  }}
                                  className="font-extrabold text-sky-450 hover:text-sky-355 cursor-pointer underline flex items-center gap-0.5"
                                >
                                  @{c.name}
                                  {isBanned && <span className="text-[7.5px] bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded px-1 lowercase font-mono">banned</span>}
                                  {isMuted && <span className="text-[7.5px] bg-zinc-700/20 text-zinc-400 border border-zinc-700/25 rounded px-1 lowercase font-mono">muted</span>}
                                </span>
                              </div>
                              <p className="text-slate-200 mt-1 font-sans break-all select-all leading-normal">{c.text}</p>
                            </div>

                            <div className="flex items-center gap-1 md:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextBanned = isBanned 
                                    ? banned.filter((u: string) => u !== c.username)
                                    : [...banned, c.username];
                                  localStorage.setItem('bongo_stream_banned_users', JSON.stringify(nextBanned));
                                  if (!isBanned) {
                                    const filtered = chats.filter(m => m.username !== c.username);
                                    localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filtered));
                                  }
                                  alert(isBanned ? `"${c.name}" আনব্যান করা হয়েছে!` : `"${c.name}" ব্যান ও চ্যাট অপসারিত হয়েছে!`);
                                  window.dispatchEvent(new Event('storage'));
                                }}
                                className={`px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                                  isBanned 
                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' 
                                    : 'bg-rose-500/10 text-rose-450 hover:bg-rose-500/20'
                                }`}
                              >
                                {isBanned ? 'Unban' : 'Ban'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextMuted = isMuted 
                                    ? muted.filter((u: string) => u !== c.username)
                                    : [...muted, c.username];
                                  localStorage.setItem('bongo_stream_muted_users', JSON.stringify(nextMuted));
                                  alert(isMuted ? `"${c.name}" আনমিউট করা হয়েছে!` : `"${c.name}" মিউট করা হয়েছে!`);
                                  window.dispatchEvent(new Event('storage'));
                                }}
                                className={`px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                                  isMuted 
                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {isMuted ? 'Unmute' : 'Mute'}
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 3.1 USER REPORTS AND ABUSE COMPLAINTS CORNER */}
                <div className="bg-slate-950 border border-slate-855 p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wider">🚨 ব্যবহারকারী অভিযোগ ও রিপোর্ট লাল তালিকা (Submissions & Abuse Reports)</span>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('আপনি কি সত্যিই সম্পূর্ণ অভিযোগ তালিকা খালি করতে চান?')) {
                          reportsList.forEach(r => {
                            fetch('/api/reports/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: r.id })
                            }).catch(() => {});
                          });
                          setReportsList([]);
                          localStorage.setItem('bongo_live_chat_reports_db', '[]');
                          alert('রিপোর্ট বোর্ড খালি করা সফল হয়েছে!');
                          window.dispatchEvent(new Event('storage'));
                        }
                      }}
                      className="text-[9px] bg-rose-500/10 text-rose-450 hover:bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/20 font-bold cursor-pointer transition-colors"
                    >
                      ক্লিয়ার অল রিপোর্টস
                    </button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-900/40 p-3 space-y-2 scrollbar-thin">
                    {reportsList.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic text-center py-4">রিপোর্ট বোর্ডে কোনো পেন্ডিং অভিযোগ পাওয়া যায়নি।</p>
                    ) : (
                      reportsList.map((r: any) => {
                        return (
                          <div key={r.id} className="p-3 bg-slate-950/65 border border-slate-850 rounded-xl flex flex-col gap-2 text-xs">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="text-[9px] text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded font-black font-sans uppercase">
                                ⚠️ {r.reason}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono italic">{r.reportedAt}</span>
                            </div>

                            <p className="text-slate-350">
                              আসামি: <strong className="text-amber-400">@{r.reportedName} ({r.reportedUser})</strong> 
                              <span className="text-slate-500"> — অভিযোগকারী: </span>
                              <strong className="text-sky-450">{r.reporterName}</strong>
                            </p>

                            <div className="p-2 bg-slate-950 rounded border border-slate-900 text-slate-400 font-mono italic text-[11px] break-all leading-normal">
                              "{r.reportedMessage}"
                            </div>

                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <button
                                onClick={() => {
                                  // Dismiss report server-side
                                  fetch('/api/reports/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id })
                                  })
                                  .then(() => {
                                    const filtered = reportsList.filter((i: any) => i.id !== r.id);
                                    setReportsList(filtered);
                                    localStorage.setItem('bongo_live_chat_reports_db', JSON.stringify(filtered));
                                    alert('অভিযোগটি খারিজ করা হয়েছে।');
                                    window.dispatchEvent(new Event('storage'));
                                  })
                                  .catch(() => {
                                    alert('সার্ভার কানেকশন ত্রুটি!');
                                  });
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                খারিজ (Dismiss)
                              </button>

                              <button
                                onClick={() => {
                                  try {
                                    const chatDbRaw = localStorage.getItem('bongo_live_chat_messages_db');
                                    const chatDb = chatDbRaw ? JSON.parse(chatDbRaw) : [];
                                    const filteredChats = chatDb.filter((m: any) => m.id !== r.messageId);
                                    localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filteredChats));
                                  } catch(e){}

                                  fetch('/api/reports/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id })
                                  })
                                  .then(() => {
                                    const filteredReports = reportsList.filter((i: any) => i.id !== r.id);
                                    setReportsList(filteredReports);
                                    localStorage.setItem('bongo_live_chat_reports_db', JSON.stringify(filteredReports));
                                    alert('মেসেজটি সফলভাবে ডিলিট এবং চ্যাট বোর্ড থেকে অপসারণ করা হয়েছে!');
                                    window.dispatchEvent(new Event('storage'));
                                  })
                                  .catch(() => {
                                    alert('মেসেজ ডিলিট সফল হয়েছে কিন্তু রিপোর্ট ডিলিট সার্ভার ত্রুটি!');
                                  });
                                }}
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded text-[10px] font-extrabold cursor-pointer transition-all"
                              >
                                মেসেজ ডিলিট (Delete Msg)
                              </button>

                              <button
                                onClick={() => {
                                  const banned = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
                                  if (!banned.includes(r.reportedUser)) {
                                    banned.push(r.reportedUser);
                                    localStorage.setItem('bongo_stream_banned_users', JSON.stringify(banned));
                                  }

                                  try {
                                    const chatDbRaw = localStorage.getItem('bongo_live_chat_messages_db');
                                    const chatDb = chatDbRaw ? JSON.parse(chatDbRaw) : [];
                                    const filteredChats = chatDb.filter((m: any) => m.username !== r.reportedUser);
                                    localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filteredChats));
                                  } catch(e){}

                                  fetch('/api/reports/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id })
                                  })
                                  .then(() => {
                                    const filteredReports = reportsList.filter((i: any) => i.id !== r.id);
                                    setReportsList(filteredReports);
                                    localStorage.setItem('bongo_live_chat_reports_db', JSON.stringify(filteredReports));
                                    alert(`ব্যবহারকারী @${r.reportedUser} কে সফলভাবে ব্যান এবং সকল মেসেজ অপসারণ করা হয়েছে!`);
                                    window.dispatchEvent(new Event('storage'));
                                  })
                                  .catch(() => {
                                    alert('ইউজার ব্যান সম্পন্ন হয়েছে কিন্তু রিপোর্ট বাতিল সার্ভার ত্রুটি!');
                                  });
                                }}
                                className="px-2 py-1 bg-red-650 hover:bg-red-600 text-white border border-red-700/50 rounded text-[10px] font-black cursor-pointer transition-all"
                              >
                                আসামিকে ব্যান করুন (Extreme Ban)
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. LIVE CHAT POLL CONTROLLER FORM */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                  <span className="text-xs font-black text-indigo-400 block mb-2 uppercase tracking-wide">🗳️ লাইভ চ্যাট পোল আপডেট করুন (Manage Live Poll Widget)</span>
                  
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = e.currentTarget;
                      const q = (f.elements.namedItem('poll_q') as HTMLInputElement).value;
                      const opts = (f.elements.namedItem('poll_opts') as HTMLInputElement).value;

                      if (!q || !opts) {
                        alert('পোল প্রশ্ন এবং অপশনসমূহ আবশ্যিক!');
                        return;
                      }

                      setPollQuestion(q);
                      setPollOptions(opts);

                      // Instantly broadcast
                      const pollObj = {
                        question: q,
                        options: opts.split(',').map(o => ({ text: o.trim(), votes: Math.floor(Math.random() * 40 + 20) }))
                      };

                      localStorage.setItem('site_poll_question', q);
                      localStorage.setItem('site_poll_options', opts);
                      localStorage.setItem('chat_active_poll', JSON.stringify(pollObj));

                      alert('সফলভাবে লাইভ চ্যাট পোল আপডেট করা হয়েছে! দর্শকরা এখন এই পোল ভোট করতে পারবে।');
                    }}
                    className="grid grid-cols-1 gap-3 text-xs border-none"
                  >
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="text-[10px] text-slate-450 font-bold block mb-1">পোল বা জরিপ জিজ্ঞাসা (Poll Query):</label>
                        <input
                          name="poll_q"
                          type="text"
                          defaultValue={pollQuestion}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                          placeholder="e.g. Which Team do you love?"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-450 font-bold block mb-1">পোল অপশনসমূহ (কমা দিয়ে আলাদা করুন):</label>
                        <input
                          name="poll_opts"
                          type="text"
                          defaultValue={pollOptions}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                          placeholder="Option1,Option2,Option3,Option4"
                        />
                      </div>
                      <button
                        type="submit"
                        className="mt-1 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-[10px] py-1.5 px-3 rounded cursor-pointer self-start transition-colors"
                      >
                        পোল আপডেট করুন 🗳️
                      </button>
                    </div>
                  </form>
                </div>

                {/* Registered VIP users management lists */}
                <div className="mt-1 p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <span className="text-[11px] font-bold text-slate-200 uppercase">নিবন্ধিত ব্যবহারকারী কাস্টমাইজেশন ও মডারেশন (Registered Users Control Panel)</span>
                    
                    {/* Search bar */}
                    <input
                      type="text"
                      placeholder="নাম, ইউজারনেম বা মোবাইল দিয়ে খুঁজুন..."
                      value={adminUserSearch}
                      onChange={(e) => setAdminUserSearch(e.target.value)}
                      className="bg-slate-900 border border-slate-805 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-505 w-full sm:w-60 font-sans"
                    />
                  </div>
                  
                  {(() => {
                    const dbRaw = localStorage.getItem('bongo_stream_users_db');
                    let usersList = [];
                    try {
                      usersList = dbRaw ? JSON.parse(dbRaw) : [];
                    } catch (e) {}

                    // Filter users based on search
                    const filteredUsers = usersList.filter((usr: any) => {
                      const searchLower = adminUserSearch.toLowerCase();
                      const nameMatch = usr.name?.toLowerCase().includes(searchLower);
                      const emailMatch = usr.email?.toLowerCase().includes(searchLower);
                      const phoneMatch = usr.phone?.toLowerCase().includes(searchLower);
                      return nameMatch || emailMatch || phoneMatch;
                    });

                    if (filteredUsers.length === 0) {
                      return <p className="text-[10px] text-slate-500 italic text-center py-2">কোনো নিবন্ধিত ব্যবহারকারী পাওয়া যায়নি।</p>;
                    }

                    return (
                      <div className="max-h-[300px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-900 p-2 space-y-2 scrollbar-thin text-xs font-sans">
                        {filteredUsers.map((usr: any, i: number) => {
                          const usrUsername = usr.email ? usr.email.split('@')[0] : (usr.username || usr.name.toLowerCase().replace(/\s+/g, ''));
                          const isVerified = adminVerifiedUsers.includes(usrUsername);
                          const isBanned = adminBannedUsers.includes(usrUsername);
                          const isMuted = adminMutedUsers.includes(usrUsername);

                          const toggleVerify = () => {
                            let next: string[];
                            if (isVerified) {
                              next = adminVerifiedUsers.filter(u => u !== usrUsername);
                            } else {
                              next = [...adminVerifiedUsers, usrUsername];
                            }
                            setAdminVerifiedUsers(next);
                            localStorage.setItem('bongo_stream_verified_users', JSON.stringify(next));
                            window.dispatchEvent(new Event('storage'));
                          };

                          const toggleBan = () => {
                            let next: string[];
                            if (isBanned) {
                              next = adminBannedUsers.filter(u => u !== usrUsername);
                              alert(`ব্যবহারকারী @${usrUsername} সফলভাবে আনব্যান করা হয়েছে।`);
                            } else {
                              next = [...adminBannedUsers, usrUsername];
                              // Automatically remove their messages from chat
                              try {
                                const chatDbRaw = localStorage.getItem('bongo_live_chat_messages_db');
                                const chatDb = chatDbRaw ? JSON.parse(chatDbRaw) : [];
                                const filteredChats = chatDb.filter((m: any) => m.username !== usrUsername);
                                localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filteredChats));
                              } catch(e){}
                              alert(`ব্যবহারকারী @${usrUsername} ব্যান এবং তাদের মেসেজসমূহ অপসারণ করা হয়েছে!`);
                            }
                            setAdminBannedUsers(next);
                            localStorage.setItem('bongo_stream_banned_users', JSON.stringify(next));
                            window.dispatchEvent(new Event('storage'));
                          };

                          const toggleMute = () => {
                            let next: string[];
                            if (isMuted) {
                              next = adminMutedUsers.filter(u => u !== usrUsername);
                              alert(`ব্যবহারকারী @${usrUsername} সফলভাবে আনমিউট করা হয়েছে।`);
                            } else {
                              next = [...adminMutedUsers, usrUsername];
                              alert(`ব্যবহারকারী @${usrUsername} মিউট করা হয়েছে।`);
                            }
                            setAdminMutedUsers(next);
                            localStorage.setItem('bongo_stream_muted_users', JSON.stringify(next));
                            window.dispatchEvent(new Event('storage'));
                          };

                          return (
                            <div key={usr.phone || usrUsername || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 rounded-xl gap-2 transition-all">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-100 block text-xs">{usr.name}</span>
                                  <span className="text-[10px] text-sky-400 font-mono">@{usrUsername}</span>
                                  
                                  {isVerified && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1 rounded-full font-sans uppercase font-black">
                                      ✓ Verified
                                    </span>
                                  )}
                                  {isBanned && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] bg-rose-500/15 text-rose-450 border border-rose-500/20 px-1 rounded-full font-sans uppercase font-bold">
                                      Blocked
                                    </span>
                                  )}
                                  {isMuted && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] bg-zinc-700/20 text-zinc-400 border border-zinc-700/20 px-1 rounded-full font-sans uppercase font-bold">
                                      Muted
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                                  Email: {usr.email} | Mobile: {usr.phone || 'N/A'} | Flag: {usr.flag || '🇧🇩'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 font-sans shrink-0">
                                {/* Blue tick verify button */}
                                <button
                                  type="button"
                                  onClick={toggleVerify}
                                  className={`p-1.5 px-2 text-[10px] rounded cursor-pointer font-bold transition-all border
                                    ${isVerified 
                                      ? 'bg-sky-500/20 text-sky-450 border-sky-500/30 hover:bg-sky-500/35' 
                                      : 'bg-slate-900 text-slate-450 border-slate-800 hover:border-slate-700 hover:text-white'
                                    }
                                  `}
                                >
                                  {isVerified ? 'Remove Blue Tick' : 'Give Blue Tick 🔵'}
                                </button>

                                <button
                                  type="button"
                                  onClick={toggleMute}
                                  className={`p-1.5 px-2 text-[10px] rounded cursor-pointer font-bold transition-all border
                                    ${isMuted 
                                      ? 'bg-zinc-700/20 text-zinc-350 border-zinc-700' 
                                      : 'bg-slate-900 text-slate-450 border-slate-800 hover:border-slate-700 hover:text-white'
                                    }
                                  `}
                                >
                                  {isMuted ? 'Unmute 🔊' : 'Mute 🔇'}
                                </button>

                                <button
                                  type="button"
                                  onClick={toggleBan}
                                  className={`p-1.5 px-2 text-[10px] rounded cursor-pointer font-bold transition-all border
                                    ${isBanned 
                                      ? 'bg-rose-500/10 text-rose-450 border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20' 
                                      : 'bg-rose-600 text-white border-rose-700 hover:bg-rose-550'
                                    }
                                  `}
                                >
                                  {isBanned ? 'Unban' : 'Ban 🚫'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 5: SYSTEM AND VERSIONS */}
            {adminActiveTab === 'system' && (
              <div className="flex flex-col gap-4 animate-fade-in font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Broadcast notice toggle */}
                  <div className="p-3 bg-slate-950 border border-slate-855 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-350 block">১. আপডেট ব্রডকাস্ট নোটিশ</span>
                      <span className="text-[10px] text-slate-500 font-sans block mt-1 leading-relaxed text-slate-404">
                        এটি চালু করলে হেডার ও ল্যান্ডিং পেজে হলুদ রঙের "আপডেট উপলব্ধ" ও "আপডেট চেক" বাটনটি দেখা যাবে। বন্ধ রাখলে ব্যবহারকারীরা কোনো নোটিফিকেশন পাবেন না।
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const next = !isUpdateBroadcastActive;
                        setIsUpdateBroadcastActive(next);
                        localStorage.setItem('is_update_broadcast_active', String(next));
                      }}
                      className={`mt-3 w-full py-2 px-3 rounded text-[11px] font-black tracking-wide cursor-pointer transition-all text-center
                        ${isUpdateBroadcastActive 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold' 
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-850'}
                      `}
                    >
                      {isUpdateBroadcastActive ? '✓ ব্রডকাস্ট চালু আছে (Notice is Live)' : '✗ ব্রডকাস্ট বন্ধ (Notice is Hidden)'}
                    </button>
                  </div>

                  {/* Simulated force takeover button */}
                  <div className="p-3 bg-slate-950 border border-slate-855 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-350 block">২. জবরদস্তিমূলক রক্ষণাবেক্ষণ ওভারলে</span>
                      <span className="text-[10px] text-slate-500 font-sans block mt-1 leading-relaxed text-slate-404">
                        যখন আপনি সার্ভারে কাজ করবেন, তখন এটি অন করলে কোনো চ্যানেল ভিজিটর দেখতে পারবে না। সরাসরি ইমার্সিভ ব্ল্যাকআউট আপডেট ইন্সটলার স্ক্রিন চালু হবে।
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setIsUpdating(true);
                        setUpdateProgress(0);
                        setIsUpdateCompleted(false);
                        setUpdateStageText('Initializing APK repository connection...');
                      }}
                      className="mt-3 w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded text-[11px] font-black tracking-wide cursor-pointer transition-all text-center"
                    >
                      🚀 জবরদস্তিমূলক ইভেন্ট (Live Countdown Overlay)
                    </button>
                  </div>
                </div>

                {/* Version Reset Control & Live Standable HTML Export */}
                <div className="border-t border-slate-850 pt-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs font-sans mt-2">
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-300 block font-sans">৩. টেস্ট রিসেট সংস্করণ (Version Codes)</span>
                    <span className="text-[10px] text-slate-404 font-sans block mt-0.5">ইন্সটল করা সংস্করণ v1.1.0 থেকে পুনরায় v1.0.0 এ রিসেট দিন।</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        localStorage.setItem('free_world_cup_app_version', 'v1.0.0');
                        setAppVersion('v1.0.0');
                        alert('সফলভাবে সংস্করণ v1.0.0 এ রিসেট করা হয়েছে!');
                        window.location.reload();
                      }}
                      className="py-1.5 px-3 bg-slate-950 hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded font-bold text-[10px] cursor-pointer"
                    >
                      সংস্করণ রিসেট v1.0.0
                    </button>
                    
                    <button
                      onClick={() => {
                        alert(`আপনার সাকসেসফুল ওয়েবসাইট কনফিগারেশন ব্যাকআপ কপি জেনারেট করা হয়েছে!\nআপনার ব্রাউজারে এটি ডাউনলোড বা সেভ রাখা হয়েছে।`);
                      }}
                      className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] rounded transition-all cursor-pointer"
                    >
                      📥 ডাউনলোড করুন সম্পূর্ণ HTML কোড (Export Config)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* Simple visual separator footer */}
        <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6 text-center">
          <p className="text-xs text-slate-500 font-sans font-semibold">
            &copy; {new Date().getFullYear()} {siteNameEnglish} Admin Console. Secured Access.
          </p>
        </footer>
      </div>
    );
  }

  if (currentPage === 'landing') {
    return (
      <div id="bongo-routing-landing-wrapper">
        <LandingPage
          onStartApp={() => setCurrentPage('app')}
          onOpenLogin={() => setIsAuthOpen(true)}
          onOpenAdmin={() => setCurrentPage('admin')}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onLogout={handleLogout}
          channels={channels}
          onTriggerUpdate={handleTriggerUpdateFlow}
          isUpdateBroadcastActive={isUpdateBroadcastActive}
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
              <FreeWorldCupBDLogo className="w-10 h-10 hover:scale-105 transition-transform shrink-0" />
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                    {siteNameEnglish}
                  </h1>
                </div>
                <p className="text-[9px] text-slate-450 font-sans tracking-wide">{siteNameBangla} - লাইভ স্পোর্টস ও টিভি</p>
              </div>
            </div>
          </div>

          {/* Profile & Live Actions wrapper */}
          <div className="flex items-center gap-3">
            
            {/* Standalone Admin Dashboard button - Invisible to normal viewers */}
            {currentUser?.username === 'bongomember' && (
              <button
                id="btn-header-admin-dashboard"
                onClick={() => setCurrentPage('admin')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-bold cursor-pointer transition-all active:scale-95 text-sky-400"
                title="অ্যাডমিন ড্যাশবোর্ড"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>এডমিন প্যানেল</span>
              </button>
            )}
            
            {/* Authenticated User state display */}
            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-2">
                {/* Visual Clickable Avatar and Name button to edit profile settings */}
                <button
                  id="btn-edit-profile-header-trigger"
                  onClick={() => setIsProfileEditOpen(true)}
                  title="প্রোফাইল সম্পাদন ও এভারটার পরিবর্তন করুন"
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 border border-slate-800 rounded-xl pl-2 pr-3 py-1 text-xs font-semibold cursor-pointer transition-all active:scale-95 group"
                >
                  {/* Circular Avatar thumbnail display */}
                  {currentUser.avatar ? (
                    currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http') ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="w-6 h-6 rounded-full object-cover border border-amber-400 group-hover:scale-105 transition-transform" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-white flex items-center justify-center font-bold">
                        {currentUser.avatar}
                      </div>
                    )
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-550 to-sky-500 flex items-center justify-center text-white text-[10px] font-black border border-indigo-400">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-250 block max-w-[85px] truncate group-hover:text-amber-400 transition-colors">
                      {currentUser.name}
                    </span>
                    <span className="text-[8px] text-amber-400 font-extrabold tracking-tighter block uppercase leading-none mt-0.5">
                      {currentUser.badge} ★
                    </span>
                  </div>
                </button>

                <button
                  id="btn-header-logout"
                  onClick={handleLogout}
                  title="লগআউট"
                  className="p-1 px-2 bg-slate-950 hover:bg-rose-955/20 text-slate-400 hover:text-rose-455 border border-slate-850 hover:border-rose-950/20 rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center h-8"
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

            {/* Beautiful App update detection banner for inside the player dashboard - only shows when broadcast is enabled by owner */}
            {isUpdateBroadcastActive && (
              <button
                id="btn-header-check-update"
                onClick={handleTriggerUpdateFlow}
                title="নতুন সংস্করণ বা সংস্করণ আপডেট চেক করুন"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 text-amber-400 text-2xs sm:text-xs font-bold rounded-lg border border-amber-500/35 hover:border-amber-400 transition-all cursor-pointer shadow active:scale-95 group animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>আপডেট {appVersion === 'v1.1.0' ? 'v1.1.0 (আপডেটেড)' : 'উপলব্ধ (v1.1.0)'}</span>
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

        {!isLoggedIn ? (
          /* VIP Account Auth blocked screen as requested */
          <div id="app-auth-lock-gate" className="w-full max-w-lg bg-slate-900 border border-slate-805 rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl text-center select-none my-12 mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 text-amber-450 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            
            <h2 className="text-base md:text-lg font-black text-slate-100 uppercase tracking-tight leading-snug">VIP অ্যাকাউন্ট অনুমোদন লগইন প্রয়োজন!</h2>
            <p className="text-[10px] text-emerald-450 font-sans font-extrabold tracking-wider mt-1 uppercase">Authentication Required</p>
            
            <p className="text-xs text-slate-400 mt-4 leading-relaxed font-sans max-w-sm mx-auto">
              Free World Cup BD-তে সরাসরি খেলা অথবা টিভি উপভোগ করতে আপনাকে প্রথমে একটি সম্পূর্ণ সচল ফ্রি ভেরিফাইড মেম্বার অ্যাকাউন্ট তৈরি করতে হবে। অ্যাকাউন্ট ছাড়া কোনো সেশন চালু করা সম্ভব নয়।
            </p>

            {/* Quick Benefits Bullet layout with check-circles */}
            <div className="grid grid-cols-1 gap-2.5 mt-5 text-[11px] text-slate-300 text-left bg-slate-950 p-4 rounded-xl border border-slate-850">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>৫১+ রিয়েল-টাইম লাইভ স্পোর্টস ও বিনোদন চ্যানেল</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>কম্প্যাক্ট বাফারিং ও প্রিমিয়াম ভিডিও প্লেয়ার অ্যাক্সেস</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>লাইভ চ্যাট রুমে ইমোজি ও মেসেজিং করা</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>সম্পুর্ণ ফ্রি লাইফটাইম ব্রডকাস্ট কভারেজ</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                id="btn-gate-auth-trigger"
                onClick={() => setIsAuthOpen(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-505 hover:to-indigo-505 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer hover:scale-101 hover:shadow-sky-505/10"
              >
                <Sparkles className="w-4 h-4 text-amber-305 animate-bounce-short" />
                <span>ফ্রি অ্যাকাউন্ট তৈরি / লগইন করুন</span>
              </button>
            </div>

            {/* Safety policy disclaimer */}
            <div className="mt-5.5 flex items-center justify-center gap-1 text-[10px] text-slate-500 font-sans border-t border-slate-850/60 pt-3.5 leading-normal max-w-sm mx-auto">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>ইউটিউব অথবা ফেসবুকে রি-স্ট্রিম করা কঠোরভাবে আইনি দণ্ডনীয় অপরাধ।</span>
            </div>
          </div>
        ) : (
          /* Normal app split contents when logged in */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            
            {/* LEFT PANEL: Sticky Premium Standalone Stream Player Frame */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 z-30 flex flex-col gap-4 animate-fade-in">
              <div className="relative">
                <CustomPlayer 
                  channel={selectedChannel} 
                  onReportWorkingState={handleReportWorkingState} 
                />
                
                {/* Connecting Server overlay indicator */}
                {connectingServer && (
                  <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 animate-pulse">
                    <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                    <p className="text-xs font-bold text-slate-200">সার্ভার পরিবর্তন করা হচ্ছে...</p>
                    <p className="text-[10px] text-sky-400 font-mono">Connecting to {connectingServer} Speed Route</p>
                  </div>
                )}
              </div>

              {/* Dynamic Live Chat panel integration placed directly under display */}
              {selectedChannel && (
                <div className="flex flex-col gap-2.5 select-none">
                  {isChatOpen && (
                    <LiveChat
                      channelGroup={selectedChannel.group}
                      currentUser={currentUser}
                      isOpen={isChatOpen}
                      onClose={() => setIsChatOpen(false)}
                    />
                  )}
                  
                  <button
                    id="btn-toggle-live-chat-panel"
                    type="button"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`w-full py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.8 transition-all cursor-pointer shadow active:scale-95
                      ${isChatOpen 
                        ? 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-950/40 text-rose-450' 
                        : 'bg-gradient-to-r from-sky-600 via-sky-650 to-indigo-650 hover:from-sky-500 hover:to-indigo-500 text-white border-sky-500/10 shadow-md hover:shadow-sky-600/10'
                      }
                    `}
                  >
                    <MessageSquare className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{isChatOpen ? 'லைவ் চ্যাট ক্লোজ করুন (Collapse Chat)' : 'লাইভ চ্যাট রুম ওপেন করুন (Open Chat)'}</span>
                  </button>
                </div>
              )}

              {/* MAGNIFICENT 15 GLOBAL VIRTUAL SERVERS SELECTOR BLOCK */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>সার্ভার সিলেক্ট করুন (Sports Fast CDNs)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                    ● ACTIVE
                  </span>
                </div>
                
                {/* Active server readout details */}
                <div className="p-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>চলতি সার্ভার (Current Routing):</span>
                  {connectingServer ? (
                    <span className="text-amber-400 font-bold animate-pulse">Connecting {connectingServer}...</span>
                  ) : (
                    <span className="text-sky-400 font-bold">{activeServer}</span>
                  )}
                </div>

                {/* Horizontal draggable Server Row */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {[
                    { id: '1', name: 'Singapore Edge Premium (WiFi 10G Feed)', provider: 'WiFi SG-10G', ping: '4ms', load: '12%', country: 'SG' },
                    { id: '2', name: 'GP-Fast 5G Turbo Boost (Grameenphone)', provider: 'GP 5G Booster', ping: '6ms', load: '18%', country: 'BD' },
                    { id: '3', name: 'Robi High-Speed Multipath Saver', provider: 'Robi Save', ping: '8ms', load: '15%', country: 'BD' },
                    { id: '4', name: 'Banglalink Low-Latency CricEdge', provider: 'BL CricEdge', ping: '10ms', load: '21%', country: 'BD' },
                    { id: '5', name: 'Airtel CDN Speed Booster 4K', provider: 'Airtel 4K Max', ping: '12ms', load: '22%', country: 'BD' },
                    { id: '6', name: 'Doha Fast Line (Qatar Cricket Server)', provider: 'Doha Sports', ping: '32ms', load: '41%', country: 'QA' },
                    { id: '7', name: 'Mumbai Dedicated Sports Feed', provider: 'Mumbai Host', ping: '18ms', load: '35%', country: 'IN' },
                    { id: '8', name: 'Sleek Low Data Saver (Cellular Opt)', provider: 'Low-Data Opt', ping: '13ms', load: '9%', country: 'US' },
                    { id: '10', name: 'Teletalk Freedom Stream Optimizer', provider: 'Teletalk Fast', ping: '16ms', load: '5%', country: 'BD' },
                    { id: '11', name: 'Tokyo Fast Router 4K Video Base', provider: 'Tokyo Stream', ping: '29ms', load: '14%', country: 'JP' },
                    { id: '12', name: 'Frankfurt Direct CDN Bypass Feed', provider: 'Germany Route', ping: '48ms', load: '32%', country: 'DE' },
                    { id: '13', name: 'London VIP Backhaul Server 1', provider: 'London VIP', ping: '55ms', load: '8%', country: 'UK' },
                    { id: '14', name: 'Sydney CricEdge Live Relaying Port', provider: 'Australia Cric', ping: '62ms', load: '11%', country: 'AU' },
                    { id: '15', name: 'Automatic Cloud Balance Routing', provider: 'Auto DNS', ping: '5ms', load: '3%' }
                  ].map((srv) => (
                    <button
                      key={srv.id}
                      onClick={() => {
                        setConnectingServer(srv.provider);
                        setTimeout(() => {
                          setConnectingServer('');
                          setActiveServer(srv.name);
                          localStorage.setItem('site_active_server', srv.name);
                        }, 1200);
                      }}
                      disabled={!!connectingServer}
                      style={{ contentVisibility: 'auto' }}
                      className={`shrink-0 flex flex-col items-start gap-1 p-2 py-1.5 rounded-lg border text-left cursor-pointer transition-all active:scale-95 duration-100 min-w-[115px]
                        ${activeServer === srv.name
                          ? 'bg-sky-500/10 border-sky-400 shadow shadow-sky-400/20'
                          : 'bg-slate-950 hover:bg-slate-900 border-slate-805'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold text-slate-205">{srv.provider}</span>
                        <span className="text-[8px] text-slate-500 font-mono">{srv.ping}</span>
                      </div>
                      <div className="flex items-center justify-between w-full text-[8px] text-slate-400 leading-none">
                        <span>Load: {srv.load}</span>
                        <span className="text-[8px] font-bold text-sky-450">Active</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PERSONALIZED USER CHOSEN FAVORITE MATCH DAY BUMPER & PREFERENCES */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>আপনার প্রিয় দল নির্বাচন (Favorite Team)</span>
                  </span>
                  {favoriteTeam ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {favoriteTeam} Selected 🌟
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded animate-pulse">
                      Pending Select
                    </span>
                  )}
                </div>

                {/* Introductory Bumper Player teaser simulation */}
                {showIntroBumper && bumperTeam && (
                  <div className="relative overflow-hidden bg-slate-950 border border-indigo-950 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 animate-fade-in my-1.5">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/10 via-amber-900/10 to-transparent pointer-events-none" />
                    <span className="text-3xl animate-bounce">🎈</span>
                    <h5 className="text-[12px] font-extrabold text-amber-400 tracking-tight">
                      {bumperTeam} Live Intro-Bumper Stream!
                    </h5>
                    <p className="text-[10px] text-slate-300 leading-normal max-w-xs font-sans">
                      আপনার নির্বাচিত ভালোবাসার দল ৪কে আল্ট্রা-এইচডি সার্ভারে অপ্টিমাইজড হচ্ছে। কোনো বাফারিং বা লেটেন্সি ছাড়া সরাসরি উপভোগ করুন!
                    </p>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 animate-[pulse_1.5s_infinite]" style={{ width: '85%' }} />
                    </div>
                    <button
                      onClick={() => {
                        setShowIntroBumper(false);
                        setBumperTeam('');
                      }}
                      className="mt-2 text-[9px] text-slate-500 hover:text-slate-350 underline cursor-pointer"
                    >
                      Skip Teaser Overlay
                    </button>
                  </div>
                )}

                {/* Team Selection pills row */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    { name: 'বাংলাদেশ 🇧🇩', key: 'Bangladesh' },
                    { name: 'আর্জেন্টিনা 🇦🇷', key: 'Argentina' },
                    { name: 'ব্রাজিল 🇧🇷', key: 'Brazil' },
                    { name: 'ভারত 🇮🇳', key: 'India' },
                    { name: 'পাকিস্তান 🇵🇰', key: 'Pakistan' },
                    { name: 'জার্মানি 🇩🇪', key: 'Germany' },
                    { name: 'পর্তুগাল 🇵🇹', key: 'Portugal' }
                  ].map((team) => (
                    <button
                      key={team.key}
                      onClick={() => {
                        setFavoriteTeam(team.name);
                        localStorage.setItem('user_favorite_team', team.name);
                        setBumperTeam(team.name);
                        setShowIntroBumper(true);
                        // Auto-hide the bumper screen after 4 seconds
                        setTimeout(() => {
                          setShowIntroBumper(false);
                          setBumperTeam('');
                        }, 4500);
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all active:scale-95
                        ${favoriteTeam === team.name
                          ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-450 text-amber-300 shadow shadow-amber-500/10'
                          : 'bg-slate-950 hover:bg-slate-850 border-slate-805 text-slate-400 hover:text-white'
                        }
                      `}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          {/* RIGHT PANEL: Search, Categories & Channel Grid (Takes 7 Cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* TOP BANNER AD SLOT */}
            {adCodes.topBanner && (
              <DynamicAdContainer html={adCodes.topBanner} />
            )}
            
            {/* Search and Filters Hub */}
            <div className="lg:sticky lg:top-24 z-20 bg-slate-900 rounded-2xl p-4 border border-slate-800/60 shadow-xl flex flex-col gap-4">
              
              {/* Moving Announcement/Marquee Notice bar */}
              <div id="notice-scrolling-container" className="bg-slate-950/90 border border-slate-850 rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden select-none">
                <span className="flex items-center gap-1 shrink-0 text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-sans tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  চলতি ঘোষণা
                </span>
                <Marquee className="text-xs text-slate-300 font-medium font-sans cursor-pointer flex-1" scrollamount="3" behavior="scroll" direction="left">
                  {marqueeText}
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

            {/* BOTTOM BANNER AD SLOT */}
            {adCodes.bottomBanner && (
              <DynamicAdContainer html={adCodes.bottomBanner} />
            )}
          </div>
        </div>
        )}
      </main>

      {/* Auth Modal embedded inside App to handle popups seamlessly */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Profile Edit Settings Modal */}
      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        currentUser={currentUser}
        onSave={handleUpdateProfile}
      />

      {/* Dynamic APK & Version Update Check Notice Dialog */}
      {isUpdateCheckerOpen && (
        <div id="apk-update-checker-backdrop" className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative text-center">
            
            {/* Top Close icon */}
            <button 
              onClick={() => setIsUpdateCheckerOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-350 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Simulated Radar Icon */}
            <div className="w-11 h-11 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3.5 text-amber-500">
              {isCheckingUpdateProgress ? (
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <h3 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none mb-1">
              সিস্টেম সংস্করণ যাচাইকারক
            </h3>
            <span className="text-[10px] font-mono text-slate-505">Current version installed: {appVersion}</span>

            {/* Body content depends on checking status */}
            {isCheckingUpdateProgress ? (
              <div className="mt-5 py-4 flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1 items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                {appVersion === 'v1.1.0' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold leading-relaxed">
                      ✓ আপনার অ্যাপটি ইতিমধ্যেই সর্বশেষ সংস্করণে (v1.1.0) আপডেট করা আছে।
                    </div>
                    <button
                      onClick={() => setIsUpdateCheckerOpen(false)}
                      className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ঠিক আছে
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold leading-relaxed">
                      ⚠️ একটি নতুন সংস্করণ আপডেট (v1.1.0) উপলব্ধ আছে।
                    </div>
                    <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                      নতুন সংস্করণে পারফরম্যান্স উন্নত করা হয়েছে এবং নতুন প্রিমিয়াম চ্যানেল যুক্ত করা হয়েছে।
                    </p>
                    <button
                      onClick={handleConfirmBeginUpdate}
                      className="mt-2 w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:scale-[1.02] font-black tracking-wide rounded-xl text-xs transition-colors cursor-pointer shadow-lg"
                    >
                      আপডেট ইনস্টল করুন 🚀
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="bg-slate-955/40 py-4 relative z-50 text-center font-sans">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
            প্রিমিয়াম লাইভ কভারেজ • সর্বাধুনিক সোর্স লিংকসমূহ দিয়ে সাজানো প্লেয়ার।
          </p>
        </div>
      </div>

      {isAdminConsoleOpen ? (
            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 text-left shadow-2xl animate-fade-in text-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <span>👑 BD Live Web Administrator Control Deck</span>
                    <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono font-extrabold uppercase animate-pulse">Owner View</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">রিয়েল-টাইমে ওয়েবসাইট কাস্টমাইজ, চ্যানেল সংযোজন/অপসারণ, চ্যাট মডারেশন ও স্পন্সর বিজ্ঞাপন কন্ট্রোল করুন।</p>
                </div>
                
                {/* Horizontal Tab selections */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'branding', label: '১. ব্র্যান্ডিং ও লোগো' },
                    { id: 'channels', label: '২. চ্যানেল ও প্লেলিস্ট' },
                    { id: 'ads', label: '৩. বিজ্ঞাপন ম্যানেজার' },
                    { id: 'moderation', label: '৪. ইউজার ও কুসংস্কার' },
                    { id: 'system', label: '৫. নোটিশ ও ওভারলে' },
                    { id: 'stats', label: '৬. পরিসংখ্যান (Stats)' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminActiveTab(tab.id)}
                      className={`text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors
                        ${adminActiveTab === tab.id
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border border-transparent'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: BRANDING AND LOGO */}
              {adminActiveTab === 'branding' && (
                <div className="flex flex-col gap-4 animate-fade-in font-sans font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">ইংলিশ সাইট নাম (English Brand Name)</label>
                      <input
                        type="text"
                        value={siteNameEnglish}
                        onChange={(e) => {
                          setSiteNameEnglish(e.target.value);
                          localStorage.setItem('site_name_english', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                        placeholder="e.g. Free World Cup BD"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">বাংলা সাইট নাম (Bangla Brand Name)</label>
                      <input
                        type="text"
                        value={siteNameBangla}
                        onChange={(e) => {
                          setSiteNameBangla(e.target.value);
                          localStorage.setItem('site_name_bangla', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                        placeholder="e.g. বিডি লাইভ টিভি"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">সাইট লোগো ছবি লিংক (Custom Brand Image Logo URL)</label>
                    <input
                      type="text"
                      value={siteLogoUrl}
                      onChange={(e) => {
                        setSiteLogoUrl(e.target.value);
                        localStorage.setItem('site_logo_url', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                      placeholder="পছন্দের লোগো ছবির সম্পূর্ণ URL পেস্ট করুন..."
                    />
                    
                    {/* Visual presets */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9px] text-slate-450 uppercase font-bold">লোগো প্রিসেটস গ্যালারি:</span>
                      <button
                        onClick={() => {
                          const url = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=120&auto=format&fit=crop';
                          setSiteLogoUrl(url);
                          localStorage.setItem('site_logo_url', url);
                        }}
                        className="text-[9px] bg-slate-950 hover:bg-slate-850 px-2 py-0.5 rounded text-amber-400 border border-slate-800 cursor-pointer"
                      >
                        ⚽ Gold Football
                      </button>
                      <button
                        onClick={() => {
                          const url = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=120&auto=format&fit=crop';
                          setSiteLogoUrl(url);
                          localStorage.setItem('site_logo_url', url);
                        }}
                        className="text-[9px] bg-slate-950 hover:bg-slate-850 px-2 py-0.5 rounded text-sky-400 border border-slate-800 cursor-pointer"
                      >
                        🏃 Blue Runner
                      </button>
                      <button
                        onClick={() => {
                          setSiteLogoUrl('');
                          localStorage.setItem('site_logo_url', '');
                        }}
                        className="text-[9px] bg-slate-950 hover:bg-slate-850 px-2 py-0.5 rounded text-slate-400 border border-slate-800 cursor-pointer"
                      >
                        ❌ ডিফল্ট রিসেট
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">চলতি ঘোষণা সতর্কবার্তা (Running Warning Announcement Scroller)</label>
                    <textarea
                      value={marqueeText}
                      onChange={(e) => {
                        setMarqueeText(e.target.value);
                        localStorage.setItem('site_marquee_text', e.target.value);
                      }}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-205 focus:outline-none focus:border-sky-550 resize-none leading-relaxed font-sans"
                      placeholder="চলমান লাল স্লাইডিং ঘোষণা বার্তাটি এখানে লিখুন..."
                    />
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <span className="text-[10px] font-black text-slate-300 uppercase block mb-1">ভিডিও লাইভ প্রিভিউ (Immediate Live Match View)</span>
                    <p className="text-[11px] text-slate-400">ল্যান্ডিং পেইজ এবং মূল প্লেয়ারে উপরে প্রদত্ত তথ্যগুলো এখনই রিয়েল-টাইমে আপডেট হয়ে গেছে।</p>
                  </div>
                </div>
              )}

              {/* TAB 2: CHANNEL AND PLAYLIST MANAGEMENT */}
              {adminActiveTab === 'channels' && (
                <div className="flex flex-col gap-4 animate-fade-in font-sans">
                  
                  {/* Form to Add New Individual Channel / Playlist */}
                  <div className="p-3.5 bg-slate-950 border border-sky-900/35 rounded-xl">
                    <span className="text-[11px] font-black uppercase text-sky-400 block mb-2">📥 নতুন একক চ্যানেল বা বিশেষ স্ট্রিম প্লেলিস্ট সংযোজন করুন</span>
                    
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.currentTarget;
                        const name = (f.elements.namedItem('ch_name') as HTMLInputElement).value;
                        const src = (f.elements.namedItem('ch_src') as HTMLInputElement).value;
                        const logo = (f.elements.namedItem('ch_logo') as HTMLInputElement).value;
                        const group = (f.elements.namedItem('ch_group') as HTMLSelectElement).value;

                        if (!name || !src) {
                          alert('চ্যানেলের নাম এবং ভিডিও স্ট্রিম ফিল্ড দুটি আবশ্যিক!');
                          return;
                        }

                        const newChan: Channel = {
                          id: `custom_${Date.now()}`,
                          name,
                          logo: logo || 'https://images.unsplash.com/photo-1540747737956-37872404453a?w=80',
                          group,
                          url: src,
                          playlistSource: 'Built-in Owner Proxy Override',
                          isCustomAdded: true
                        };

                        const savedCustomRaw = localStorage.getItem('site_custom_channels');
                        const currentCustoms = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
                        const updated = [newChan, ...currentCustoms];
                        localStorage.setItem('site_custom_channels', JSON.stringify(updated));
                        
                        alert(`অভিনন্দন! "${name}" চ্যানেলটি সফলভাবে আপনার লাইভ প্লেলিস্টে সংযোজন করা হয়েছে।`);
                        f.reset();
                        loadChannels();
                      }}
                      className="grid grid-cols-1 gap-2 border-none"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          name="ch_name"
                          type="text"
                          placeholder="চ্যানেলের নাম (e.g. T-Sports Star Live)"
                          className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                        />
                        <input
                          name="ch_src"
                          type="text"
                          placeholder="স্ট্রিম লিংক (.m3u8, .mpd, mp4 link)"
                          className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                        />
                        <input
                          name="ch_logo"
                          type="text"
                          placeholder="লোগো ছবি লিংক (Optional logo URL)"
                          className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                        />
                        <div className="flex gap-1">
                          <select
                            name="ch_group"
                            className="bg-slate-900 border border-slate-805 rounded p-2 text-xs text-slate-205 focus:outline-none flex-1"
                          >
                            <option value="Sports">Sports (খেলাধুলা)</option>
                            <option value="Cricket">Cricket Feed</option>
                            <option value="Bangla">Bangla TV</option>
                            <option value="Entertainment">বিনোদন</option>
                            <option value="News">সংবাদ</option>
                          </select>
                          <button
                            type="submit"
                            className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] px-3 py-2 rounded transition-all cursor-pointer shrink-0"
                          >
                            যোগ করুন ➕
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Active TV channels List */}
                  <div className="mt-1">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">ম্যানেজ লাইভ টিভি চ্যানেল (Active TV Channels: {channels.length}টি)</span>
                    
                    <div className="max-h-[220px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-1.5 space-y-1.5 scrollbar-thin font-sans text-xs">
                      {channels.map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between p-2 hover:bg-slate-900/60 transition-colors rounded-lg border border-slate-900 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-lg">📺</span>
                            <div>
                              <span className="font-bold text-slate-200 block truncate max-w-[200px]">{ch.name}</span>
                              <span className="text-[8px] text-slate-450 font-mono block">Category: {ch.group} | Type: {ch.isCustomAdded ? 'Custom Add' : 'Cloud Feed'}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (window.confirm(`আপনি কি সত্যিই "${ch.name}" চ্যানেলটি দর্শক ইন্টারভিউ থেকে মুছে দিতে চান?`)) {
                                if (ch.isCustomAdded) {
                                  // Remove from customs
                                  const savedCustomRaw = localStorage.getItem('site_custom_channels');
                                  const customs: Channel[] = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
                                  const filtered = customs.filter(c => c.id !== ch.id);
                                  localStorage.setItem('site_custom_channels', JSON.stringify(filtered));
                                } else {
                                  // Mark as deleted id
                                  const deletedIdsRaw = localStorage.getItem('site_deleted_channel_ids');
                                  const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
                                  deletedIds.push(ch.id);
                                  localStorage.setItem('site_deleted_channel_ids', JSON.stringify(deletedIds));
                                }
                                alert('চ্যানেলটি সফলভাবে মুছে ফেলা হয়েছে!');
                                loadChannels();
                              }
                            }}
                            className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-505/20 text-rose-400 hover:text-rose-400 border border-rose-950/20 rounded font-bold text-[10px] cursor-pointer"
                          >
                            মুছুন (Delete) 🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RESTORE ARCHIVE LIST */}
                  <div className="mt-1 border-t border-slate-850 pt-3">
                    <span className="text-[11px] font-bold text-rose-400 block mb-2 uppercase tracking-wide flex items-center gap-1">
                      <span>🗑️ মুছে ফেলা চ্যানেল ও রিস্টোর আর্কাইভ (Trash Storage Archive Cache)</span>
                    </span>
                    
                    {(() => {
                      const deletedIdsRaw = localStorage.getItem('site_deleted_channel_ids');
                      const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
                      
                      if (deletedIds.length === 0) {
                        return <p className="text-[10px] text-slate-500 italic">মুছে ফেলা কোনো আইটেম পাওয়া যায়নি। আপনার ট্র্যাশ ক্যাশে সম্পূর্ণ ফাকা!</p>;
                      }

                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {deletedIds.map((id) => (
                            <div key={id} className="inline-flex items-center gap-2 bg-slate-950/80 border border-rose-950/30 text-[10px] p-1 px-2 rounded-lg">
                              <span className="text-slate-400 font-mono text-[9px]">ID: {id.substring(0, 8)}...</span>
                              <button
                                onClick={() => {
                                  const filtered = deletedIds.filter(dId => dId !== id);
                                  localStorage.setItem('site_deleted_channel_ids', JSON.stringify(filtered));
                                  alert('চ্যানেলটি সফলভাবে পুনরুদ্ধার (Restore) করা হয়েছে!');
                                  loadChannels();
                                }}
                                className="text-emerald-450 hover:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 cursor-pointer"
                              >
                                রিস্টোর (Restore) 🔄
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: SPONSOR ADS CONTROL */}
              {adminActiveTab === 'ads' && (
                <div className="flex flex-col gap-4 animate-fade-in font-sans">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1"> estratégico ADSTERRA & SPONSOR PLACEMENTS SWITCHER</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-sans">
                    
                    {/* Top Banner toggle */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-300 block font-sans">১. হেডার স্পোর্টস ব্যানার (Top Sponsor Banner)</span>
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">অনুসন্ধান ফিল্টারের উপরে স্পন্সর ব্যানার প্রদর্শন করুন।</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = !adBlocks.topBanner;
                          setAdBlocks(prev => ({ ...prev, topBanner: next }));
                          localStorage.setItem('site_ad_top_banner', String(next));
                        }}
                        className={`p-1 px-3 text-[10px] font-black rounded border cursor-pointer
                          ${adBlocks.topBanner 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                          }
                        `}
                      >
                        {adBlocks.topBanner ? 'ACTIVE (চালু)' : 'HIDDEN (বন্ধ)'}
                      </button>
                    </div>

                    {/* Bottom Banner toggle */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-300 block font-sans">২. ফুটার মোবাইল ব্যানার (Bottom Mobile Action)</span>
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">চ্যানেল গ্রিড টেবিলের ঠিক নিচে Sponsor বাটন দেখান।</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = !adBlocks.bottomBanner;
                          setAdBlocks(prev => ({ ...prev, bottomBanner: next }));
                          localStorage.setItem('site_ad_bottom_banner', String(next));
                        }}
                        className={`p-1 px-3 text-[10px] font-black rounded border cursor-pointer
                          ${adBlocks.bottomBanner 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                          }
                        `}
                      >
                        {adBlocks.bottomBanner ? 'ACTIVE (চালু)' : 'HIDDEN (বন্ধ)'}
                      </button>
                    </div>

                    {/* Pop-Under popup simulator toggle */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-300 block font-sans">৩. পপ-আন্ডার প্রোমো ডায়ালগ (Pop-Under Alert)</span>
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">চ্যানেল পরিবর্তন করার সময় আলতো স্পন্সর ডায়ালগ দেখান।</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = !adBlocks.popUnder;
                          setAdBlocks(prev => ({ ...prev, popUnder: next }));
                          localStorage.setItem('site_ad_pop_under', String(next));
                        }}
                        className={`p-1 px-3 text-[10px] font-black rounded border cursor-pointer
                          ${adBlocks.popUnder 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                          }
                        `}
                      >
                        {adBlocks.popUnder ? 'ACTIVE (চালু)' : 'HIDDEN (বন্ধ)'}
                      </button>
                    </div>

                    {/* Social Bar slide out placeholder */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-300 block font-sans">৪. কর্নার সোশ্যাল নোটিফিকেশন বার</span>
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">চটে অফিশিয়াল স্পন্সর মেসেজ ও কুপন নোটিশ ভাসাতে ব্যবহৃত হয়।</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = !adBlocks.socialBar;
                          setAdBlocks(prev => ({ ...prev, socialBar: next }));
                          localStorage.setItem('site_ad_social_bar', String(next));
                        }}
                        className={`p-1 px-3 text-[10px] font-black rounded border cursor-pointer
                          ${adBlocks.socialBar 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                          }
                        `}
                      >
                        {adBlocks.socialBar ? 'ACTIVE (চালু)' : 'HIDDEN (বন্ধ)'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-850/60 flex items-center justify-between text-xs">
                    <span>💡 <strong>Strategic Adsterra Opt:</strong> সমস্ত বিজ্ঞাপন স্লট সম্পূর্ণ নিরাপদ। এটি দর্শকদের বিরক্তি না ঘটিয়ে ওয়েবসাইট পরিচালনাকারী ডেভেলপারের আয় বাড়াতে সাহায্য করে।</span>
                  </div>
                </div>
              )}

              {/* TAB 4: CHAT MODERATION AND USERS */}
              {adminActiveTab === 'moderation' && (
                <div className="flex flex-col gap-4 animate-fade-in font-sans">
                  
                  {/* LIVE CHAT POLL CONTROLLER FORM */}
                  <div className="p-3 bg-slate-950 border border-sky-950 rounded-xl">
                    <span className="text-[11px] font-bold text-sky-400 block mb-2 uppercase tracking-wide">🗳️ লাইভ চ্যাট পোল আপডেট করুন (Manage Live Poll Widget)</span>
                    
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.currentTarget;
                        const q = (f.elements.namedItem('poll_q') as HTMLInputElement).value;
                        const opts = (f.elements.namedItem('poll_opts') as HTMLInputElement).value;

                        if (!q || !opts) {
                          alert('পোল প্রশ্ন এবং অপশনসমূহ আবশ্যিক!');
                          return;
                        }

                        setPollQuestion(q);
                        setPollOptions(opts);

                        localStorage.setItem('site_poll_question', q);
                        localStorage.setItem('site_poll_options', opts);

                        alert('সফলভাবে লাইভ চ্যাট পোল আপডেট করা হয়েছে! দর্শকরা এখন এই পোল ভোট করতে পারবে।');
                      }}
                      className="grid grid-cols-1 gap-2 text-xs border-none"
                    >
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">পোল বা জরিপ জিজ্ঞাসা (Poll Query):</label>
                          <input
                            name="poll_q"
                            type="text"
                            defaultValue={pollQuestion}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                            placeholder="e.g. Which Team do you love?"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">পোল অপশনসমূহ (কমা দিয়ে আলাদা করুন):</label>
                          <input
                            name="poll_opts"
                            type="text"
                            defaultValue={pollOptions}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                            placeholder="Option1,Option2,Option3,Option4"
                          />
                        </div>
                        <button
                          type="submit"
                          className="mt-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] py-1.5 px-3 rounded cursor-pointer self-start animate-pulse"
                        >
                          পোল আপডেট করুন 🗳️
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Registered VIP users management lists */}
                  <div className="mt-1">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase">নিবন্ধিত ব্যবহারকারী তালিকা ও আইপি মডারেশন (User Database & Block Control)</span>
                    
                    {(() => {
                      const dbRaw = localStorage.getItem('bongo_stream_users_db');
                      let usersList = [];
                      try {
                        usersList = dbRaw ? JSON.parse(dbRaw) : [];
                      } catch (e) {}

                      if (usersList.length === 0) {
                        return <p className="text-[10px] text-slate-500 italic">কোনো নিবন্ধিত ব্যবহারকারী হিস্টোরি পাওয়া যায়নি।</p>;
                      }

                      return (
                        <div className="max-h-[180px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2 space-y-1.5 scrollbar-thin text-xs font-sans">
                          {usersList.map((usr: any, i: number) => (
                            <div key={usr.phone || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-slate-900 rounded-lg border border-slate-850 gap-2">
                              <div>
                                <span className="font-extrabold text-slate-200 block text-xs">{usr.name} {usr.phone ? `(${usr.phone})` : ''}</span>
                                <span className="text-[9px] text-slate-450 block font-mono">Location Match: {usr.location || 'Dhaka Base'} | Favorite: {usr.favoriteTeam || 'Not Selected'}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(`সফলভাবে সদস্য "${usr.name}" এর উপর চ্যাট অবরুদ্ধকরণ বিধি জারি করা হলো।`);
                                  }}
                                  className="p-1 px-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-[10px] rounded cursor-pointer"
                                >
                                  Mute (মিউট করুন 🔇)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(`VIP সদস্য "${usr.name}" অ্যাকাউন্টটি সাময়িকভাবে সাসপেন্ড (Ban) করা হলো।`);
                                  }}
                                  className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 border border-rose-500/20 text-[10px] rounded cursor-pointer"
                                >
                                  Ban (ব্যান করুন 🚫)
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM AND VERSIONS */}
              {adminActiveTab === 'system' && (
                <div className="flex flex-col gap-4 animate-fade-in font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Broadcast notice toggle */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-300 block">১. আপডেট ব্রডকাস্ট নোটিশ</span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-1 leading-relaxed">
                          এটি চালু করলে হেডার ও ল্যান্ডিং পেজে হলুদ রঙের "আপডেট উপলব্ধ (v1.1.0)" ও "আপডেট চেক" বাটনটি দেখা যাবে। বন্ধ রাখলে ব্যবহারকারীরা কোনো ওপরে টেক্সট বা নোটিফিকেশন পাবে না, পুরো ইন্টারফেস ক্লিন থাকবে।
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const next = !isUpdateBroadcastActive;
                          setIsUpdateBroadcastActive(next);
                          localStorage.setItem('is_update_broadcast_active', String(next));
                        }}
                        className={`mt-3 w-full py-2 px-3 rounded text-[11px] font-black tracking-wide cursor-pointer transition-all text-center
                          ${isUpdateBroadcastActive 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold' 
                            : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'}
                        `}
                      >
                        {isUpdateBroadcastActive ? '✓ ব্রডকাস্ট চালু আছে (Notice is Live)' : '✗ ব্রডকাস্ট বন্ধ (Notice is Hidden)'}
                      </button>
                    </div>

                    {/* Simulated force takeover button */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-300 block">২. জবরদস্তিমূলক রক্ষণাবেক্ষণ ওভারলে</span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-1 leading-relaxed">
                          যখন আপনি সার্ভারে কাজ করবেন, তখন এটি অন করলে কোনো চ্যানেল ভিজিটর দেখতে পারবে না। সরাসরি ইমার্সিভ ব্ল্যাকআউট আপডেট ইন্সটলার স্ক্রিন চালু হবে।
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setIsUpdating(true);
                          setUpdateProgress(0);
                          setIsUpdateCompleted(false);
                          setUpdateStageText('Initializing APK repository connection...');
                        }}
                        className="mt-3 w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 hover:text-rose-400 border border-rose-500/25 rounded text-[11px] font-black tracking-wide cursor-pointer transition-all text-center"
                      >
                        🚀 জবরদস্তিমূলক ইভেন্ট (Live Countdown Overlay)
                      </button>
                    </div>
                  </div>

                  {/* Version Reset Control & Live Standable HTML Export */}
                  <div className="border-t border-slate-850 pt-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs font-sans">
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-300 block">৩. টেস্ট রিসেট সংস্করণ (Version Codes)</span>
                      <span className="text-[10px] text-slate-404 font-sans block">ইন্সটল করা সংস্করণ v1.1.0 থেকে পুনরায় v1.0.0 এ রিসেট দিন।</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          localStorage.setItem('free_world_cup_app_version', 'v1.0.0');
                          setAppVersion('v1.0.0');
                          alert('সফলভাবে সংস্করণ v1.0.0 এ রিসেট করা হয়েছে!');
                          window.location.reload();
                        }}
                        className="py-1.5 px-3 bg-slate-950 hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded font-bold text-[10px] cursor-pointer"
                      >
                        সংস্করণ রিসেট v1.0.0
                      </button>
                      
                      <button
                        onClick={() => {
                          alert(`আপনার সাকসেসফুল ওয়েবসাইট কনফিগারেশন ব্যাকআপ কপি জেনারেট করা হয়েছে!\nআপনার ব্রাউজারে এটি ডাউনলোড বা সেভ রাখা হয়েছে।`);
                        }}
                        className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] rounded transition-all cursor-pointer"
                      >
                        📥 ডাউনলোড করুন সম্পূর্ণ HTML কোড (Export Config)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: STATS */}
              {adminActiveTab === 'stats' && (
                <div className="flex flex-col gap-4 animate-fade-in font-sans">
                  <h4 className="text-sm font-bold text-slate-300">রিয়েল-টাইম পরিসংখ্যান</h4>
                  <StatsDisplay />
                </div>
              )}
            </div>
      ) : null}

      {/* Styled Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6 relative z-10 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-500 font-sans">
            &copy; {new Date().getFullYear()} {siteNameEnglish}. সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
      </footer>
    </div>
  );
}

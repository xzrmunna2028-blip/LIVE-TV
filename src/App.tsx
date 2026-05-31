/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, Search, Heart, RefreshCw, AlertCircle, Sparkles, Filter, 
  Flame, Radio, Info, Smartphone, Check, PlaySquare, X, ListFilter, HelpCircle,
  LogIn, LogOut, User, ArrowLeft, Zap, SmartphoneNfc, MessageSquare, ShieldAlert, Lock, ExternalLink,
  Menu, Share2, Monitor, Download, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel, PlaylistInfo } from './types';
import CustomPlayer from './components/CustomPlayer';
import ChannelCard from './components/ChannelCard';
import LandingPage, { FreeWorldCupBDLogo, StatsDisplay } from './components/LandingPage';
import AuthModal from './components/AuthModal';
import LiveChat from './components/LiveChat';
import SupportChat from './components/SupportChat';
import ProfileEditModal from './components/ProfileEditModal';
import DynamicAdContainer from './components/DynamicAdContainer';
import NoticeModal from './components/NoticeModal';
import TelegramOnboarding from './components/TelegramOnboarding';
import PartnerProgramModal from './components/PartnerProgramModal';


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
  const [currentPage, setCurrentPage] = useState<'landing' | 'app' | 'admin'>(() => {
    const saved = localStorage.getItem('bongo_current_page');
    if (saved === 'admin') return 'admin';
    return 'app';
  });

  useEffect(() => {
    if (currentPage) {
      localStorage.setItem('bongo_current_page', currentPage);
    }
  }, [currentPage]);

  const [rememberLast, setRememberLast] = useState<boolean>(() => {
    return localStorage.getItem('site_remember_last') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('site_remember_last', rememberLast ? 'true' : 'false');
    if (selectedChannel && selectedChannel.id) {
      if (rememberLast) {
        localStorage.setItem('bongo_selected_channel_id', selectedChannel.id);
      } else {
        localStorage.removeItem('bongo_selected_channel_id');
      }
    }
  }, [selectedChannel, rememberLast]);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState<boolean>(false);
  const [isCopyrightModalOpen, setIsCopyrightModalOpen] = useState<boolean>(false);

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

  // Live Support Chat States
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [supportEnabled, setSupportEnabled] = useState<boolean>(true);

  // Sync Live Support toggle status from server
  useEffect(() => {
    const fetchSupportStatus = () => {
      fetch('/api/support/status')
        .then(res => {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Response is not JSON or not OK');
        })
        .then(data => {
          if (data && typeof data.supportEnabled === 'boolean') {
            setSupportEnabled(data.supportEnabled);
          }
        })
        .catch(err => {
          // Silent fallback for non-JSON transients
        });
    };
    fetchSupportStatus();
    const interval = setInterval(fetchSupportStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // Centralized Server-Persisted Abuse Reports State
  const [reportsList, setReportsList] = useState<any[]>([]);

  // Periodically synchronize admin abuse reports from server
  useEffect(() => {
    const fetchReports = () => {
      fetch('/api/reports')
        .then(res => {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Response is not JSON or not OK');
        })
        .then(data => {
          if (Array.isArray(data)) {
            setReportsList(data);
          }
        })
        .catch(err => {
          // Gracefully suppress logging of HTML/Network boot transients as severe errors
          console.warn('Abuse reports status: server JSON endpoint not fully ready or returned non-JSON. Retrying shortly...');
        });
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
        .then(res => {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Response is not JSON or not OK');
        })
        .then(data => {
          if (data.version && data.version !== appVersion) {
            setIsUpdateBroadcastActive(true);
            localStorage.setItem('is_update_broadcast_active', 'true');
            localStorage.setItem('latest_available_version', data.version);
          }
        })
        .catch(err => {
          // Silent fallback for non-JSON transients
        });
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
    return localStorage.getItem('site_name_bangla') || 'ফ্রী ওয়ার্ল্ড কাপ বিডি';
  });
  const [marqueeText, setMarqueeText] = useState<string>(() => {
    return localStorage.getItem('site_marquee_text') || 'স্বাগতম Free World Cup BD-তে! 📺 সম্পুর্ণ ফ্রিতে স্পোর্টস প্লেয়ারে উপভোগ করুন প্রিয় সব লাইভ ওয়ার্ল্ড কাপ, ঘরোয়া ও আন্তর্জাতিক খেলাধুলা এবং বিনোদন চ্যানেল। কোনো চ্যানেল সাময়িকভাবে বন্ধ থাকলে রিফ্রেশ বাটনে ক্লিক করুন অথবা প্লেয়ারে অন্য লিংক অপশন সিলেক্ট করুন। আমরা নিয়মিত নতুন নতুন লাইভ চ্যানেল ও ফিড এড করছি। আমাদের সাথেই থাকুন!';
  });
  const [siteLogoUrl, setSiteLogoUrl] = useState<string>(() => {
    return localStorage.getItem('site_logo_url') || '';
  });

  // --- Horizontal Multi-Server selection framework states ---
  const [activeServerId, setActiveServerId] = useState<string>(() => {
    return localStorage.getItem('site_active_server_id') || '1';
  });
  const [activeServer, setActiveServer] = useState<string>(() => {
    return localStorage.getItem('site_active_server') || 'Server 1 (High Speed)';
  });
  const [connectingServer, setConnectingServer] = useState<string>('');

  // --- Personalized Favorite Team onboarding & introductory bumper states ---
  const [favoriteTeam, setFavoriteTeam] = useState<string>(() => {
    return localStorage.getItem('user_favorite_team') || '';
  });
  const [isFavoriteTeamSelectionOpen, setIsFavoriteTeamSelectionOpen] = useState<boolean>(false);
  const [showIntroBumper, setShowIntroBumper] = useState<boolean>(false);
  const [bumperTeam, setBumperTeam] = useState<string>('');

  // --- Dynamic Site Settings State (Server-backed dynamic engine) ---
  const [siteSettings, setSiteSettings] = useState<{
    maintenanceMode: boolean;
    maintenanceMessage: string;
    telegramUrl: string;
    siteNameEnglish: string;
    siteNameBangla: string;
    marqueeText: string;
    siteLogoUrl: string;
    customAds: {
      id: string;
      title: string;
      placement: 'top' | 'bottom' | 'popunder' | 'floating' | 'sidebar';
      code: string;
      active: boolean;
    }[];
  }>({
    maintenanceMode: false,
    maintenanceMessage: 'সাময়িকভাবে আমাদের ওয়েবসাইট এখন বন্ধ আছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, দ্রুতই আবার চালু করা হবে!',
    telegramUrl: 'https://t.me/FIFAWorldCupbd1',
    siteNameEnglish: 'Free World Cup BD',
    siteNameBangla: 'ফ্রী ওয়ার্ল্ড কাপ বিডি',
    marqueeText: 'স্বাগতম Free World Cup BD-তে!',
    siteLogoUrl: '',
    customAds: []
  });

  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);
  const [isTelegramOnboardingOpen, setIsTelegramOnboardingOpen] = useState<boolean>(false);

  // Helpdesk Realtime Chat States
  const [adminSupportSessions, setAdminSupportSessions] = useState<any[]>([]);
  const [activeAdminSession, setActiveAdminSession] = useState<any | null>(null);
  const [adminSupportReplyText, setAdminSupportReplyText] = useState<string>('');

  const fetchSiteSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSiteSettings(data);
          if (data.siteNameEnglish) {
            setSiteNameEnglish(data.siteNameEnglish);
            localStorage.setItem('site_name_english', data.siteNameEnglish);
          }
          if (data.siteNameBangla) {
            setSiteNameBangla(data.siteNameBangla);
            localStorage.setItem('site_name_bangla', data.siteNameBangla);
          }
          if (data.marqueeText) {
            setMarqueeText(data.marqueeText);
            localStorage.setItem('site_marquee_text', data.marqueeText);
          }
          if (data.siteLogoUrl !== undefined) {
            setSiteLogoUrl(data.siteLogoUrl);
            localStorage.setItem('site_logo_url', data.siteLogoUrl);
          }
        }
      })
      .catch(err => console.error('Error fetching site settings:', err));
  };

  const saveSiteSettings = async (updatedFields: Partial<typeof siteSettings>) => {
    try {
      const workingSettings = { ...siteSettings, ...updatedFields };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workingSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSiteSettings(data.settings);
        return true;
      }
    } catch (e) {
      console.error('Error saving site settings:', e);
    }
    return false;
  };

  useEffect(() => {
    // Migrating old default localStorage values to new branding
    const currentCachedBangla = localStorage.getItem('site_name_bangla');
    if (currentCachedBangla === 'বিডি লাইভ টিভি') {
      localStorage.setItem('site_name_bangla', 'ফ্রী ওয়ার্ল্ড কাপ বিডি');
      setSiteNameBangla('ফ্রী ওয়ার্ল্ড কাপ বিডি');
    }
    fetchSiteSettings();
    const intervalSettings = setInterval(fetchSiteSettings, 8000);

    const syncModerationAndData = async () => {
      try {
        // 1. Fetch moderation lists
        const modRes = await fetch('/api/moderation/status');
        const modData = await modRes.json();
        if (modData) {
          if (Array.isArray(modData.verifiedUsers)) {
            setAdminVerifiedUsers(modData.verifiedUsers);
            localStorage.setItem('bongo_stream_verified_users', JSON.stringify(modData.verifiedUsers));
          }
          if (Array.isArray(modData.bannedUsers)) {
            setAdminBannedUsers(modData.bannedUsers);
            localStorage.setItem('bongo_stream_banned_users', JSON.stringify(modData.bannedUsers));
          }
          if (Array.isArray(modData.mutedUsers)) {
            setAdminMutedUsers(modData.mutedUsers);
            localStorage.setItem('bongo_stream_muted_users', JSON.stringify(modData.mutedUsers));
          }
        }

        // 2. Fetch users and sync local storage
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (usersData && Array.isArray(usersData.users)) {
          localStorage.setItem('bongo_stream_users_db', JSON.stringify(usersData.users));
        }

        // 3. Fetch partners list
        const partnersRes = await fetch('/api/partner/list');
        const partnersData = await partnersRes.json();
        if (partnersData && Array.isArray(partnersData.members)) {
          setPartnerMembers(partnersData.members);
        }
      } catch (err) {
        console.error('Error syncing real-time databases:', err);
      }
    };

    // Immediate invocation
    syncModerationAndData();
    const intervalSync = setInterval(syncModerationAndData, 5000);

    return () => {
      clearInterval(intervalSettings);
      clearInterval(intervalSync);
    };
  }, []);

  // Sync local users to server database on initial startup
  useEffect(() => {
    try {
      const dbRaw = localStorage.getItem('bongo_stream_users_db');
      if (dbRaw) {
        const users = JSON.parse(dbRaw);
        if (users && users.length > 0) {
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users })
          }).catch(err => console.error('Error syncing local users to server:', err));
        }
      }
    } catch (e) {
      console.error('Error in local users sync:', e);
    }
  }, []);

  // Poll for live tickets when admin support tab is open
  useEffect(() => {
    if (currentPage !== 'admin' || adminActiveTab !== 'support') return;

    const pullAdminSupport = () => {
      fetch('/api/support/sessions')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAdminSupportSessions(data);
            if (activeAdminSession) {
              const matched = data.find(s => s.id === activeAdminSession.id);
              if (matched) {
                setActiveAdminSession(matched);
              }
            }
          }
        })
        .catch(err => console.error('Error fetching admin support sessions:', err));
    };

    pullAdminSupport();
    const timer = setInterval(pullAdminSupport, 4000);
    return () => clearInterval(timer);
  }, [currentPage, adminActiveTab, activeAdminSession?.id]);


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

  // Real-time online users presences
  const [onlinePresenceUsers, setOnlinePresenceUsers] = useState<any[]>([]);
  const [partnerMembers, setPartnerMembers] = useState<any[]>([]);

  useEffect(() => {
    const fetchOnlinePresences = () => {
      fetch('/api/presence')
        .then(res => res.json())
        .then(data => {
          if (data && data.users) {
            setOnlinePresenceUsers(data.users);
          }
        })
        .catch(() => {});
    };
    fetchOnlinePresences();
    const interval = setInterval(fetchOnlinePresences, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleDownloadHTMLUserPanel = () => {
    const channelsJson = JSON.stringify(channels, null, 2);
    const htmlTemplate = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteNameBangla || 'Bongo Live Studio'}</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Hls.js CDN for standalone video streaming -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
    </style>
</head>
<body class="text-slate-100 flex flex-col min-h-screen">

    <!-- Header Navigation -->
    <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-amber-505 flex items-center justify-center font-bold text-white shadow-lg animate-pulse">
                🎮
            </div>
            <div>
                <h1 class="text-sm font-black tracking-wide text-white uppercase">${siteNameEnglish || 'Bongo Live'}</h1>
                <p class="text-[9px] text-sky-404">রিয়েল-টাইম লাইভ স্পোর্টস ড্যাশবোর্ড</p>
            </div>
        </div>
        <span class="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-sans animate-pulse font-bold font-sans">
            🟢 STADIUM LIVE
        </span>
    </header>

    <!-- Main Workspace -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <!-- Interactive Player Area -->
        <section class="lg:col-span-2 flex flex-col gap-3">
            <div class="bg-black/90 rounded-2xl overflow-hidden aspect-video relative border border-slate-800 shadow-2xl">
                <video id="hls-video-player" class="w-full h-full object-contain" controls autoplay playsinline></video>
                <div id="player-status-badge" class="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1 shadow font-sans">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    <span>LIVE</span>
                </div>
            </div>
            
            <div class="bg-slate-900 border border-slate-800/85 p-4 rounded-2xl flex flex-col gap-1 shadow bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900">
                <span id="current-channel-tag" class="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded self-start font-sans">SELECT A CHANNEL</span>
                <h2 id="current-channel-title" class="text-sm font-black text-slate-100 mt-1">প্লে করতে ডানদিকের তালিকা থেকে চ্যানেল বেছে নিন</h2>
                <p class="text-[10px] text-slate-400 leading-relaxed font-sans mt-0.5">১০০% ফ্রি ও হাই-ডেফিনিশন লাইভ স্ট্রিমিং চ্যানেল, কোনো বিজ্ঞাপন ছাড়াই সরাসরি উপভোগ করুন।</p>
            </div>
        </section>

        <!-- Dynamic Category/Channel Selector Sidebar -->
        <section class="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col gap-3 h-[420px] lg:h-auto overflow-hidden">
            <div class="border-b border-slate-800 pb-2">
                <h3 class="text-xs font-black text-slate-200 uppercase tracking-wide">লাইভ টিভি চ্যানেলসমূহ</h3>
                <p class="text-[9px] text-slate-500">সিলেক্ট করতে চ্যানেল কার্ডে ক্লিক করুন</p>
            </div>
            
            <div id="html-channels-scroll-track" class="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                <!-- Channels will be populated here -->
            </div>
        </section>

    </main>

    <!-- App Scripts and Mounting logic -->
    <script>
        const fallbackChannelsList = ${channelsJson};

        let activeVideoPlayer = document.getElementById('hls-video-player');
        let playerHls = null;

        function loadChannelStream(streamUrl, name) {
            document.getElementById('current-channel-title').innerText = name;
            document.getElementById('current-channel-tag').innerText = "LIVE PLAYING";

            if (Hls.isSupported()) {
                if (playerHls) {
                    playerHls.destroy();
                }
                playerHls = new Hls({
                    maxBufferLength: 30,
                    enableWorker: true,
                    lowLatencyMode: true
                });
                playerHls.loadSource(streamUrl);
                playerHls.attachMedia(activeVideoPlayer);
                playerHls.on(Hls.Events.MANIFEST_PARSED, function() {
                    activeVideoPlayer.play().catch(e => console.log("Auto play prevented:", e));
                });
                playerHls.on(Hls.Events.ERROR, function(event, data) {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log("Network error, retrying...");
                                playerHls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log("Media error, recovering...");
                                playerHls.recoverMediaError();
                                break;
                            default:
                                break;
                        }
                    }
                });
            } else if (activeVideoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                activeVideoPlayer.src = streamUrl;
                activeVideoPlayer.addEventListener('loadedmetadata', function() {
                    activeVideoPlayer.play().catch(e => console.log("Auto play prevented:", e));
                });
            }
        }

        // Initialize and build channels list
        function bootstrapUserPanel() {
            const listContainer = document.getElementById('html-channels-scroll-track');
            listContainer.innerHTML = '';

            if (!fallbackChannelsList || fallbackChannelsList.length === 0) {
                listContainer.innerHTML = \`<div class="text-center text-slate-600 text-[11px] py-8">কোনো চ্যানেল পাওয়া যায়নি</div>\`;
                return;
            }

            fallbackChannelsList.forEach(item => {
                const card = document.createElement('div');
                card.className = "flex items-center gap-2.5 p-2 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700/80 rounded-xl border border-transparent transition-all duration-150 cursor-pointer select-none group";
                card.onclick = () => loadChannelStream(item.streamUrl, item.name);

                card.innerHTML = \`
                    <div class="relative shrink-0 select-none">
                        <img src="\${item.logo || 'https://images.unsplash.com/photo-1540747737956-378724044453?w=80&fit=crop'}" class="w-8 h-8 rounded-lg object-cover border border-slate-800" alt="logo" onerror="this.src='https://images.unsplash.com/photo-1540747737956-378724044453?w=80&fit=crop'" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] font-extrabold text-slate-100 group-hover:text-sky-400 transition-colors truncate">\${item.name}</p>
                        <p class="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">\${item.category || 'Bangla'}</p>
                    </div>
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1 shrink-0"></span>
                \`;

                listContainer.appendChild(card);
            });

            // Auto play first channel initially
            if (fallbackChannelsList.length > 0) {
                const first = fallbackChannelsList[0];
                loadChannelStream(first.streamUrl, first.name);
            }
        }

        window.onload = bootstrapUserPanel;
    </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${siteNameEnglish || "bongo_live"}_user_panel.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('অভিনন্দন! ডাব্লিউ৩ স্ট্যান্ডার্ড সিঙ্ক্রোনাইজড ইউজার প্যানেল স্ক্রিন ফাইল সফলভাবে ডাউনলোড হয়েছে।');
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
        // Auto-login guest immediately to enable chat and favoriting
        let guestId = localStorage.getItem('bongo_guest_username');
        if (!guestId) {
          guestId = 'guest_' + Math.floor(Math.random() * 1000000);
          localStorage.setItem('bongo_guest_username', guestId);
        }
        const guestName = 'ব্যবহারকারী ' + guestId.substring(6);
        const guestUser = {
          username: guestId,
          name: guestName,
          badge: 'GUEST_VIP',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`
        };
        localStorage.setItem('bongo_stream_logged_in', 'true');
        localStorage.setItem('bongo_stream_user_cfg', JSON.stringify(guestUser));
        setCurrentUser(guestUser);
        setIsLoggedIn(true);

        const guestFavs = localStorage.getItem('live_tv_favorites_guest') || localStorage.getItem('live_tv_favorites');
        if (guestFavs) {
          setFavorites(JSON.parse(guestFavs));
        }

        // Trigger Telegram popup on first launch of dashboard
        const onboardingSeen = localStorage.getItem('bongo_onboarding_seen');
        if (!onboardingSeen) {
          setIsTelegramOnboardingOpen(true);
          localStorage.setItem('bongo_onboarding_seen', 'true');
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
        body: JSON.stringify({ 
          username, 
          name,
          watchingChannel: selectedChannel ? selectedChannel.name : 'কোনো চ্যানেল দেখছেন না',
          watchingChannelId: selectedChannel ? selectedChannel.id : ''
        })
      }).catch(err => {});
    };

    reportPresence();
    const interval = setInterval(reportPresence, 10000);
    return () => clearInterval(interval);
  }, [currentUser, selectedChannel]);

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
        
        // Restore selected channel from localStorage if present
        if (activeList.length > 0) {
          const savedChId = localStorage.getItem('bongo_selected_channel_id');
          const restoredCh = activeList.find(c => c.id === savedChId);
          if (restoredCh) {
            setSelectedChannel(restoredCh);
          } else if (!selectedChannel) {
            const firstVerified = activeList.find((c: Channel) => c.playlistSource.includes('Built-in')) || activeList[0];
            setSelectedChannel(firstVerified);
          }
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

  // Check if current logged-in user is banned on the server or locally
  const isUserBanned = currentUser ? adminBannedUsers.includes(currentUser.username) : false;

  if (isUserBanned) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-4 relative overflow-hidden">
        {/* Subtle background red pulse glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-950/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
        
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative z-10 text-center animate-fade-in animate-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto mb-2 text-rose-500 animate-bounce">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight font-sans">আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে!</h1>
            <p className="text-xs text-rose-450 font-semibold uppercase tracking-wider font-sans">Access Blocked & Suspended</p>
          </div>
          
          <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-[11px] text-slate-305 space-y-3 leading-normal text-left font-sans">
            <p>আপনার অ্যাকাউন্টটি <span className="text-rose-450 font-bold">@{currentUser.username}</span> আমাদের প্ল্যাটফর্মে নীতি লঙ্ঘন করার জন্য বা এডমিন প্যানেল থেকে সাময়িকভাবে ব্যান করা হয়েছে।</p>
            <p className="border-t border-slate-850/60 pt-2 text-[10.5px]">এর সমাধান করতে অথবা আপিল করতে দয়া করে আমাদের অফিশিয়াল ফ্রী ওয়ার্ল্ড কাপ বিডি হোয়াটসঅ্যাপ নাম্বারে (+8801640227120) অথবা সাপোর্ট সেন্টারে যোগাযোগ করুন।</p>
          </div>

          <a 
            href="tel:+8801640227120"
            className="w-full py-3 text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 font-bold rounded-xl text-xs transition-transform active:scale-95 text-center flex items-center justify-center gap-2"
          >
            <span>সাপোর্ট নাম্বারে সরাসরি কল করুন</span>
          </a>

          <button
            onClick={() => {
              handleLogout();
              window.location.reload();
            }}
            className="text-[11px] text-slate-500 hover:text-slate-400 font-extrabold underline cursor-pointer"
          >
            অন্য অ্যাকাউন্ট দিয়ে সাইন-ইন করুন
          </button>
        </div>
      </div>
    );
  }

  // Global Immersive Closed/Maintenance Mode overlay (Bypasses Admin to allow them to toggle back to active)
  if (siteSettings.maintenanceMode && currentPage !== 'admin') {
    return (
      <div id="immersive-maintenance-takeover" className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 md:p-8 bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />
        <div className="absolute top-[20%] left-[20%] w-[320px] h-[320px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[20%] w-[320px] h-[320px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 text-center animate-fade-in flex flex-col gap-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-450 animate-pulse animate-none">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <h2 className="text-lg md:text-xl font-black text-slate-100 tracking-tight leading-snug">সাময়িকভাবে আমাদের ওয়েবসাইট বন্ধ আছে</h2>
          <p className="text-[10px] text-rose-400 font-sans font-extrabold tracking-widest uppercase">Maintenance Mode Active</p>
          
          <p className="text-xs text-slate-350 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850">
            {siteSettings.maintenanceMessage || 'সাময়িকভাবে আমাদের ওয়েবসাইট এখন বন্ধ আছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, দ্রুতই আবার চালু করা হবে!'}
          </p>

          <p className="text-[11px] text-slate-400 leading-normal">
            আমাদের অফিশিয়াল আপডেট ও কন্ডিশন জানতে সরাসরি টেলিগ্রাম চ্যানেলে জয়েন করুন।
          </p>

          <a 
            href={siteSettings.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-gradient-to-r from-sky-505 to-sky-600 hover:from-sky-450 hover:to-sky-550 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 shadow-lg hover:shadow-sky-500/10"
          >
            <span>টেলিগ্রাম চ্যানেলে জয়েন করুন</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
          </a>

          {/* Hidden Admin Login Gateway trigger - double click to escape maintenance lock */}
          <div className="mt-4 pt-3 border-t border-slate-850/40">
            <button 
              onClick={() => setCurrentPage('admin')}
              className="text-[9px] text-slate-600 hover:text-slate-500 uppercase tracking-widest font-mono cursor-pointer transition-colors"
            >
              System Admin Gateway Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'landing') {
    return (
      <div id="bongo-routing-landing-wrapper">
        <LandingPage
          onStartApp={() => {
            if (!isLoggedIn) {
              let guestId = localStorage.getItem('bongo_guest_username');
              if (!guestId) {
                guestId = 'guest_' + Math.floor(Math.random() * 1000000);
                localStorage.setItem('bongo_guest_username', guestId);
              }
              const guestName = 'ব্যবহারকারী ' + guestId.substring(6);
              const guestUser = {
                username: guestId,
                name: guestName,
                badge: 'GUEST_VIP',
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`
              };
              localStorage.setItem('bongo_stream_logged_in', 'true');
              localStorage.setItem('bongo_stream_user_cfg', JSON.stringify(guestUser));
              setCurrentUser(guestUser);
              setIsLoggedIn(true);
            }
            setIsTelegramOnboardingOpen(true);
          }}
          onOpenLogin={() => setIsNoticeOpen(true)}
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
        <NoticeModal
          isOpen={isNoticeOpen}
          onClose={() => setIsNoticeOpen(false)}
          siteNameEnglish={siteNameEnglish}
          siteNameBangla={siteNameBangla}
        />
        <TelegramOnboarding
          isOpen={isTelegramOnboardingOpen}
          onClose={() => {
            setIsTelegramOnboardingOpen(false);
            setCurrentPage('app');
          }}
          telegramUrl={siteSettings.telegramUrl}
        />
      </div>
    );
  }

  if (currentPage === 'admin' && !isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-4 relative overflow-x-hidden max-w-full w-full">
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-sky-500/35 selection:text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 overflow-x-hidden max-w-full w-full">
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
              <button
                onClick={() => {
                  setIsAdminAuthorized(false);
                  localStorage.removeItem('bongo_admin_authorized');
                  setCurrentPage('landing');
                }}
                className="py-1 px-2.5 bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 font-extrabold rounded-lg text-[10px] uppercase cursor-pointer select-none transition-all active:scale-95 ml-2"
                title="লগআউট এবং লক করুন"
              >
                লগআউট এডমিন (Lock)
              </button>
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
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-202 focus:outline-none focus:border-sky-500 font-mono"
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
                                <span className="text-[9px] text-sky-450 font-mono block mt-0.5 truncate">{pl.url}</span>
                                <span className="text-[8px] bg-slate-900 text-emerald-450 px-1.5 py-0.5 rounded border border-slate-800 font-bold inline-block mt-1">
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
                                  className="p-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded text-rose-450 cursor-pointer"
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
                      className="grid grid-cols-1 gap-3 border-none animate-fade-in"
                    >
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
                        className="bg-slate-900 border border-slate-805 rounded p-2 text-xs text-slate-205 focus:outline-none placeholder-slate-500"
                      />
                      <div className="flex gap-2">
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
                          className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] px-4 py-2 rounded transition-all cursor-pointer shrink-0"
                        >
                          যোগ করুন ➕
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* BOTTOM COMPONENT FOR TV CHANNELS VIEW */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wide font-sans">📦 কাস্টম চ্যানেল তালিকা ({channels.filter(c => c.isCustomAdded).length} টি)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('আপনি কি সত্যিই সমস্ত কাস্টম চ্যানেল মুছে দিতে চান?')) {
                          localStorage.removeItem('site_custom_channels');
                          alert('সমস্ত কাস্টম চ্যানেল মুছে দেওয়া হয়েছে!');
                          loadChannels();
                        }
                      }}
                      className="text-[9px] text-red-400 hover:text-red-300 font-bold bg-rose-500/5 hover:bg-rose-500/10 border border-rose-950 px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      ক্লিয়ার কাস্টম চ্যানেল
                    </button>
                  </div>
                  
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {channels.filter(c => c.isCustomAdded).length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic p-4 text-center font-sans">কোনো কাস্টম চ্যানেল এড করা নেই।</p>
                    ) : (
                      channels.filter(c => c.isCustomAdded).map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between bg-slate-900/30 border border-slate-900 p-2 rounded-xl text-xs font-sans">
                          <div className="flex items-center gap-2 truncate">
                            <img src={ch.logo} className="w-5 h-5 rounded object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                            <div className="truncate">
                              <span className="font-extrabold text-slate-205 block truncate">{ch.name}</span>
                              <span className="text-[8px] text-slate-500 block truncate font-mono">{ch.url}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`আপনি কি "${ch.name}" channelটি মুছে ফেলতে চান?`)) {
                                const savedCustomRaw = localStorage.getItem('site_custom_channels');
                                const currentCustoms = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
                                const updated = currentCustoms.filter((c) => c.id !== ch.id);
                                localStorage.setItem('site_custom_channels', JSON.stringify(updated));
                                alert('চ্যানেলটি ডিলিট করা হয়েছে!');
                                loadChannels();
                              }
                            }}
                            className="text-[9px] text-rose-450 hover:text-rose-400 p-1 px-2 hover:bg-rose-500/5 border border-rose-955 rounded cursor-pointer transition-colors"
                          >
                            মুছুন 🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ADVERTISING MANAGER */}
            {adminActiveTab === 'ads' && (
              <div className="flex flex-col gap-5 animate-fade-in font-sans text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wide">💼 বিজ্ঞাপন স্ক্রিপ্ট ও কাস্টম এডস প্ল্যাটফর্ম</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase select-none">DYNAMIC ACTIVE</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  এখানে আপনি আপনার <strong>Adsterra, Google AdSense, RevenueHits</strong> বা যেকোনো এড নেটওয়ার্কের বিজ্ঞাপন বসাতে পারেন। প্লাস (+) বাটনে ক্লিক করে আনলিমিটেড অ্যাড তৈরি করুন এবং প্রতিটি বক্সে আলাদা অন/অফ সুইচ দিয়ে নিয়ন্ত্রণ করুন।
                </p>

                {/* PLUS BUTTON FORM TO CREATE UNLIMITED ADS */}
                <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-3.5 mb-2 relative">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block font-sans">📥 নতুন বিজ্ঞাপন ইউনিট সংযোজন (Create New Ad Box)</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-sans">বিজ্ঞাপনের নাম (Internal Name)</label>
                      <input
                        id="new-ad-title"
                        type="text"
                        placeholder="e.g. Adsterra Direct Header Banner"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-505 font-sans"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-sans font-sans">বিজ্ঞাপন প্লেসমেন্ট / রিলেশন (Where it shows)</label>
                      <select
                        id="new-ad-placement"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none font-sans"
                      >
                        <option value="top">Header Top Banner (হেডার ব্যানার)</option>
                        <option value="bottom">Footer Bottom Banner (ফুটার ব্যানার)</option>
                        <option value="popunder">Pop-under Script Code (পপ-আন্ডার স্ক্রিপ্ট লিংক)</option>
                        <option value="floating">Bottom Floating Widget (ভাসমান অলংকরণ)</option>
                        <option value="sidebar">Sidebar Chat Panel Banner (চ্যাট সাইডবার)</option>
                      </select>
                    </div>

                    <div className="flex items-end font-sans">
                      <button
                        type="button"
                        onClick={async () => {
                          const titleEl = document.getElementById('new-ad-title') as HTMLInputElement;
                          const placementEl = document.getElementById('new-ad-placement') as HTMLSelectElement;
                          if (!titleEl || !titleEl.value.trim()) {
                            alert('অনুগ্রহ করে বিজ্ঞাপনের একটি নাম প্রবেশ করান!');
                            return;
                          }
                          const newAd = {
                            id: 'ad_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                            title: titleEl.value.trim(),
                            placement: placementEl.value as any,
                            code: '',
                            active: true
                          };
                          const updatedAds = [...(siteSettings.customAds || []), newAd];
                          const ok = await saveSiteSettings({ customAds: updatedAds });
                          if (ok) {
                            titleEl.value = '';
                            alert(`অভিনন্দন! "${newAd.title}" বিজ্ঞাপন বক্সটি তৈরি হয়েছে। নিচে কোড বসিয়ে অন করুন।`);
                          }
                        }}
                        className="w-full py-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-450 hover:to-sky-550 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
                      >
                        <span>প্লাস অপশন (+) অ্যাড করুন</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ACTIVE SPONSOR ADS LIST */}
                {(!siteSettings.customAds || siteSettings.customAds.length === 0) ? (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-900">
                    <p className="text-xs text-slate-500 italic font-sans animate-none">কোনো কাস্টম বিজ্ঞাপন ইউনিট তৈরি করা হয়নি। উপরে প্লাস (+) বাটনে ক্লিক করে প্রথম বিজ্ঞাপনটি চালু করুন!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-none">
                    {siteSettings.customAds.map((ad, idx) => (
                      <div key={ad.id} className="bg-slate-955 p-4 border border-slate-900 rounded-2xl flex flex-col gap-3 relative">
                        <div className="flex justify-between items-center border-b border-slate-900 pb-2 font-sans">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-200 block truncate max-w-[180px]">{idx + 1}. {ad.title}</span>
                            <span className="text-[8.5px] font-mono text-sky-400 uppercase mt-0.5">Placement: {ad.placement}</span>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`আপনি কি সত্যিই "${ad.title}" বিজ্ঞাপনটি সম্পূর্ণ ডিলিট করতে চান?`)) {
                                const updated = siteSettings.customAds.filter(a => a.id !== ad.id);
                                await saveSiteSettings({ customAds: updated });
                                alert('বিজ্ঞাপনটি ডিলিট করা হয়েছে!');
                              }
                            }}
                            className="text-[9px] text-red-500 hover:text-red-450 font-bold hover:bg-red-500/10 border border-slate-850 p-1 px-2 rounded-lg cursor-pointer transition-colors"
                          >
                            মুছে ফেলুন (Delete) 🗑️
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5 font-sans">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">এইচটিএমএল / স্ক্রিপ্ট কোড (Ad Code Script)</label>
                          <textarea
                            value={ad.code}
                            onChange={(e) => {
                              const updated = siteSettings.customAds.map(a => a.id === ad.id ? { ...a, code: e.target.value } : a);
                              setSiteSettings(prev => ({ ...prev, customAds: updated }));
                            }}
                            rows={4}
                            placeholder="Embed code (HTML/JS/iFrame) here..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                          />
                        </div>

                        {/* ON / OFF toggle below each adbox */}
                        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-xl border border-slate-800 select-none mt-1 font-sans">
                          <span className="text-[10px] font-bold text-slate-400">অন/অফ কন্ট্রোল বাটন</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = siteSettings.customAds.map(a => a.id === ad.id ? { ...a, active: !a.active } : a);
                              await saveSiteSettings({ customAds: updated });
                            }}
                            className={`p-1 px-3 text-[10px] font-black rounded border cursor-pointer transition-colors
                              ${ad.active
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                                : 'bg-slate-900 border-slate-850 text-slate-400'
                              }
                            `}
                          >
                            {ad.active ? 'ON (বিজ্ঞপ্তি অন)' : 'OFF (বিজ্ঞপ্তি অফ)'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BOTTOM COMPONENT FOR MANUAL SCRIPT BANNER ADS */}
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 mt-4 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wide">💼 গ্লোবাল বিজ্ঞাপন কোড ম্যানেজার (HTML / JS Script Placements)</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase select-none">LIVE EVALUATION</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    এখানে আপনি আপনার <strong>Adsterra, Google AdSense, RevenueHits</strong> বা যেকোনো এড নেটওয়ার্কের সম্পূর্ণ বিজ্ঞাপন কোড (HTML, iframe, or Javascript Code) পেস্ট করতে পারেন। কোনো কোড ফাকা বা খালি থাকলে সাইটে কোনো ব্যানার বা প্লেসহোল্ডার টেক্সট প্রদর্শিত হবে না।
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Billboard Top Banner script editor */}
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                      <span className="text-xs font-extrabold text-slate-205 block tracking-tight">১. হেডার ল্যান্ডস্কেপ ব্যানার কোড (Billboard Top Banner Script)</span>
                      <span className="text-[9.5px] text-slate-500 block leading-tight">অনুসন্ধান বাটন ও ঘোষণার ঠিক উপরে প্রদর্শিত হবে।</span>
                      <textarea
                        value={adCodes.topBanner}
                        onChange={(e) => setAdCodes(p => ({ ...p, topBanner: e.target.value }))}
                        rows={4}
                        placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                      />
                    </div>

                    {/* Bottom sponsor script editor */}
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                      <span className="text-xs font-extrabold text-slate-205 block tracking-tight">২. ফুটার বিজ্ঞাপন ব্যানার কোড (Footer Bottom Banner Script)</span>
                      <span className="text-[9.5px] text-slate-505 block leading-tight">চ্যানেল গ্রিড টেবিলের ঠিক নিচে শেষভাগে ইম্প্যাক্ট ব্যানার।</span>
                      <textarea
                        value={adCodes.bottomBanner}
                        onChange={(e) => setAdCodes(p => ({ ...p, bottomBanner: e.target.value }))}
                        rows={4}
                        placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                      />
                    </div>

                    {/* Pop-under script editor */}
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                      <span className="text-xs font-extrabold text-slate-205 block tracking-tight">৩. পপ-আন্ডার ব্যানার স্ক্রিপ্ট (Pop-under Script Code)</span>
                      <span className="text-[9.5px] text-slate-505 block leading-tight">ডাইরেক্ট স্ক্রিপ্ট লিংক বা জাভাস্ক্রিপ্ট ট্যাগ এখানে পেস্ট করুন।</span>
                      <textarea
                        value={adCodes.popUnder}
                        onChange={(e) => setAdCodes(p => ({ ...p, popUnder: e.target.value }))}
                        rows={4}
                        placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
                      />
                    </div>

                    {/* Social Bar editor */}
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl flex flex-col gap-2">
                      <span className="text-xs font-extrabold text-slate-205 block tracking-tight">৪. কর্নার সোশ্যাল নোটিফিকেশন বার (Social Bar HTML)</span>
                      <span className="text-[9.5px] text-slate-505 block leading-tight">নোটিফিকেশন বার বা উইজেট কোড পেস্ট করতে ব্যবহৃত হয়।</span>
                      <textarea
                        value={adCodes.socialBar}
                        onChange={(e) => setAdCodes(p => ({ ...p, socialBar: e.target.value }))}
                        rows={4}
                        placeholder="বিজ্ঞাপন কোডটি এখানে পেস্ট করুন..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-sky-505 leading-normal"
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
                    className="w-full bg-sky-600 hover:bg-sky-550 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-sky-500/10 active:scale-95 text-center block uppercase tracking-wide"
                  >
                    বিজ্ঞাপন কোডগুলো সংরক্ষণ করুন (Save Ad Placements Database) 💾
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: CHAT MODERATION, ANALYTICS AND OTHER CONTROLS */}
            {adminActiveTab === 'moderation' && (
              <div className="flex flex-col gap-5 animate-fade-in font-sans">
                {/* 1. SECURE ANALYTICS CORE DECKS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider block">মোট নিবন্ধিত ব্যবহারকারী</span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {(() => {
                        try {
                          return JSON.parse(localStorage.getItem('bongo_stream_users_db') || '[]').length;
                        } catch { return 0; }
                      })()} জন
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-0.5">রিয়েল-টাইম ডেটাবেজ স্ট্যাটাস</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl font-sans">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">চ্যাট রুম ওপেন কাউন্টার</span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {localStorage.getItem('bongo_chat_open_counts') || '0'} বার
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-0.5">চ্যাট উইন্ডো খুলেছেন এমন দর্শকদের সংখ্যা</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl font-sans">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">চলতি মাসের একাউন্টস ক্রিয়েশন</span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {(() => {
                        try {
                          return JSON.parse(localStorage.getItem('bongo_stream_users_db') || '[]').length;
                        } catch { return 0; }
                      })()} জন
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-0.5">নতুন অ্যাকাউন্ট খোলার সংখ্যা</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 font-sans">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-505 animate-pulse" />
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wider">১. লাইভ চ্যাট রুম মডারেশন কন্ট্রোল (ক্লিক করুন ব্যান/আনমিউট করতে)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('আপনি কি সত্যিই সম্পূর্ণ চ্যাট বোর্ড মুছে দিতে চান?')) {
                          localStorage.setItem('bongo_live_chat_messages_db', '[]');
                          alert('চ্যাট বোর্ড খালি করা সফল হয়েছে!');
                          window.dispatchEvent(new Event('storage'));
                        }
                      }}
                      className="text-[9px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/20 font-bold cursor-pointer transition-colors"
                    >
                      ক্লিয়ার অল চ্যাট
                    </button>
                  </div>

                  {/* Scrollable messages and inline controls */}
                  <div className="max-h-[250px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-900/40 p-3 space-y-1.5 scrollbar-thin">
                    {(() => {
                      const dbRaw = localStorage.getItem('bongo_live_chat_messages_db');
                      let chats = [];
                      try { chats = dbRaw ? JSON.parse(dbRaw) : []; } catch(e){}

                      if (chats.length === 0) {
                        return <p className="text-[10px] text-slate-500 italic text-center py-4">চ্যাট বোর্ডে কোনো নতুন মেসেজ পাঠানো হয়নি।</p>;
                      }

                      const banned = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
                      const muted = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');

                      return chats.map((c) => {
                        const isBanned = banned.includes(c.username);
                        const isMuted = muted.includes(c.username);

                        return (
                          <div key={c.id} className="p-2 bg-slate-950/40 hover:bg-slate-900 border border-slate-800/60 rounded-xl flex items-center justify-between gap-3 text-xs flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] text-slate-500 shrink-0 font-mono">{c.time}</span>
                                <span className="text-xs shrink-0">{c.flag}</span>
                                <button
                                  type="button"
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
                                        fetch('/api/moderation/update', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ bannedUsers: bList })
                                        }).catch(err => console.error('Error posting ban status:', err));
                                        alert(`"${c.username}" ব্যান করা হয়েছে এবং চ্যাট অপসারিত হয়েছে।`);
                                      } else if (action === 'unban') {
                                        const bList = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
                                        const nextList = bList.filter((u) => u !== c.username);
                                        localStorage.setItem('bongo_stream_banned_users', JSON.stringify(nextList));
                                        fetch('/api/moderation/update', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ bannedUsers: nextList })
                                        }).catch(err => console.error('Error posting ban status:', err));
                                        alert(`"${c.username}" এর ব্যান প্রত্যাহার করা হয়েছে।`);
                                      } else if (action === 'mute') {
                                        const mList = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
                                        if (!mList.includes(c.username)) mList.push(c.username);
                                        localStorage.setItem('bongo_stream_muted_users', JSON.stringify(mList));
                                        fetch('/api/moderation/update', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ mutedUsers: mList })
                                        }).catch(err => console.error('Error posting mute status:', err));
                                        alert(`"${c.username}" মিউট করা হয়েছে।`);
                                      } else if (action === 'unmute') {
                                        const mList = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
                                        const nextList = mList.filter((u) => u !== c.username);
                                        localStorage.setItem('bongo_stream_muted_users', JSON.stringify(nextList));
                                        fetch('/api/moderation/update', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ mutedUsers: nextList })
                                        }).catch(err => console.error('Error posting mute status:', err));
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
                                  className="font-extrabold text-sky-400 hover:text-sky-305 cursor-pointer underline flex items-center gap-0.5 hover:no-underline font-sans"
                                >
                                  @{c.name}
                                  {isBanned && <span className="text-[7.5px] bg-rose-500/20 text-rose-450 border border-rose-500/25 rounded px-1 lowercase font-mono">banned</span>}
                                  {isMuted && <span className="text-[7.5px] bg-zinc-700/20 text-zinc-400 border border-zinc-700/25 rounded px-1 lowercase font-mono">muted</span>}
                                </button>
                              </div>
                              <p className="text-slate-205 mt-1 font-sans break-all select-all leading-normal">{c.text}</p>
                            </div>

                            <div className="flex items-center gap-1 md:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextBanned = isBanned 
                                    ? banned.filter((u) => u !== c.username)
                                    : [...banned, c.username];
                                  localStorage.setItem('bongo_stream_banned_users', JSON.stringify(nextBanned));
                                  if (!isBanned) {
                                    const filtered = chats.filter(m => m.username !== c.username);
                                    localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filtered));
                                  }
                                  fetch('/api/moderation/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ bannedUsers: nextBanned })
                                  }).catch(err => console.error('Error posting ban status:', err));
                                  alert(isBanned ? `"${c.name}" আনব্যান করা হয়েছে!` : `"${c.name}" ব্যান ও চ্যাট অপসারিত হয়েছে!`);
                                  window.dispatchEvent(new Event('storage'));
                                }}
                                className={`px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                                  isBanned 
                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' 
                                    : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                }`}
                              >
                                {isBanned ? 'Unban' : 'Ban'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextMuted = isMuted 
                                    ? muted.filter((u) => u !== c.username)
                                    : [...muted, c.username];
                                  localStorage.setItem('bongo_stream_muted_users', JSON.stringify(nextMuted));
                                  fetch('/api/moderation/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ mutedUsers: nextMuted })
                                  }).catch(err => console.error('Error posting mute status:', err));
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
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wider">🚨 ব্যবহারকারী অভিযোগ ও রিপোর্ট লাল তালিকা (Submissions & Abuse Reports)</span>
                    </div>
                    <button
                      type="button"
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
                      className="text-[9px] bg-rose-500/10 text-rose-455 hover:bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/20 font-bold cursor-pointer transition-colors"
                    >
                      ক্লিয়ার অল রিপোর্টস
                    </button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-900/40 p-3 space-y-2 scrollbar-thin">
                    {reportsList.length === 0 ? (
                      <p className="text-[10px] text-slate-505 italic text-center py-4">রিপোর্ট বোর্ডে কোনো পেন্ডিং অভিযোগ পাওয়া যায়নি।</p>
                    ) : (
                      reportsList.map((r) => {
                        return (
                          <div key={r.id} className="p-3 bg-slate-950/65 border border-slate-800 rounded-xl flex flex-col gap-2 text-xs font-sans">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="text-[9px] text-rose-450 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded font-black font-sans uppercase">
                                ⚠️ {r.reason}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono italic">{r.reportedAt}</span>
                            </div>

                            <p className="text-slate-350">
                              আসামি: <strong className="text-amber-400">@{r.reportedName} ({r.reportedUser})</strong> 
                              <span className="text-slate-500"> — অভিযোগকারী: </span>
                              <strong className="text-sky-400">{r.reporterName}</strong>
                            </p>

                            <div className="p-2 bg-slate-950 rounded border border-slate-900 text-slate-450 font-mono italic text-[11px] break-all leading-normal">
                              "{r.reportedMessage}"
                            </div>

                            <div className="flex items-center justify-end gap-1.5 mt-1 border-none bg-transparent">
                              <button
                                type="button"
                                onClick={() => {
                                  // Dismiss report server-side
                                  fetch('/api/reports/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id })
                                  })
                                  .then(() => {
                                    const filtered = reportsList.filter((i) => i.id !== r.id);
                                    setReportsList(filtered);
                                    localStorage.setItem('bongo_live_chat_reports_db', JSON.stringify(filtered));
                                    alert('অভিযোগটি খারিজ করা হয়েছে।');
                                    window.dispatchEvent(new Event('storage'));
                                  })
                                  .catch(() => {
                                    alert('সার্ভার কানেকশন ত্রুটি!');
                                  });
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-colors border border-transparent"
                              >
                                খারিজ (Dismiss)
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  let bannedList = [...adminBannedUsers];
                                  if (!bannedList.includes(r.reportedUser)) {
                                    bannedList.push(r.reportedUser);
                                    setAdminBannedUsers(bannedList);
                                    localStorage.setItem('bongo_stream_banned_users', JSON.stringify(bannedList));
                                    fetch('/api/moderation/update', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ bannedUsers: bannedList })
                                    }).catch(err => console.error('Error posting ban status:', err));
                                  }

                                  try {
                                    const chatDbRaw = localStorage.getItem('bongo_live_chat_messages_db');
                                    const chatDb = chatDbRaw ? JSON.parse(chatDbRaw) : [];
                                    const filteredChats = chatDb.filter((m) => m.username !== r.reportedUser);
                                    localStorage.setItem('bongo_live_chat_messages_db', JSON.stringify(filteredChats));
                                  } catch (e) {}

                                  fetch('/api/reports/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id })
                                  })
                                  .then(() => {
                                    const filteredReports = reportsList.filter((i) => i.id !== r.id);
                                    setReportsList(filteredReports);
                                    localStorage.setItem('bongo_live_chat_reports_db', JSON.stringify(filteredReports));
                                    alert(`ব্যবহারকারী @${r.reportedUser} কে সফলভাবে ব্যান এবং সকল মেসেজ অপসারণ করা হয়েছে!`);
                                    window.dispatchEvent(new Event('storage'));
                                  })
                                  .catch(() => {
                                    alert('ইউজার ব্যান সম্পন্ন হয়েছে কিন্তু রিপোর্ট বাতিল সার্ভার ত্রুটি!');
                                  });
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-550 hover:to-rose-650 text-white rounded text-[10px] font-black cursor-pointer transition-all border border-transparent"
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
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <span className="text-xs font-black text-indigo-400 block mb-2 uppercase tracking-wide">🗳️ লাইভ চ্যাট পোল আপডেট করুন (Manage Live Poll Widget)</span>
                  
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = e.currentTarget;
                      const q = f.elements.namedItem('poll_q').value;
                      const opts = f.elements.namedItem('poll_opts').value;

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
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">পোল বা জরিপ জিজ্ঞাসা (Poll Query):</label>
                        <input
                          name="poll_q"
                          type="text"
                          defaultValue={pollQuestion}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-205 focus:outline-none focus:border-indigo-500 font-sans"
                          placeholder="e.g. Which Team do you love?"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">পোল অপশনসমূহ (কমা দিয়ে আলাদা করুন):</label>
                        <input
                          name="poll_opts"
                          type="text"
                          defaultValue={pollOptions}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-205 focus:outline-none focus:border-indigo-500 font-sans"
                          placeholder="Option1,Option2,Option3,Option4"
                        />
                      </div>
                      <button
                        type="submit"
                        className="mt-1 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-[10px] py-1.5 px-3 rounded cursor-pointer self-start transition-colors"
                      >
                        পোল আপডেট করুন 🗳️
                      </button>
                    </div>
                  </form>
                </div>

                {/* Registered VIP users management lists */}
                <div className="mt-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <span className="text-[11px] font-bold text-slate-200 uppercase font-sans">নিবন্ধিত ব্যবহারকারী কাস্টমাইজেশন ও মডারেশন (Registered Users Control Panel)</span>
                    
                    {/* Search bar */}
                    <input
                      type="text"
                      placeholder="নাম, ইউজারনেম বা মোবাইল দিয়ে খুঁজুন..."
                      value={adminUserSearch}
                      onChange={(e) => setAdminUserSearch(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-505 w-full sm:w-60 font-sans"
                    />
                  </div>
                  
                  {(() => {
                    const dbRaw = localStorage.getItem('bongo_stream_users_db');
                    let usersList = [];
                    try {
                      usersList = dbRaw ? JSON.parse(dbRaw) : [];
                    } catch (e) {}

                    // Filter users based on search
                    const filteredUsers = usersList.filter((usr) => {
                      const searchLower = adminUserSearch.toLowerCase();
                      const nameMatch = usr.name?.toLowerCase().includes(searchLower);
                      const emailMatch = usr.email?.toLowerCase().includes(searchLower);
                      const phoneMatch = usr.phone?.toLowerCase().includes(searchLower);
                      return nameMatch || emailMatch || phoneMatch;
                    });

                    if (filteredUsers.length === 0) {
                      return <p className="text-[10px] text-slate-505 italic text-center py-2">কোনো নিবন্ধিত ব্যবহারকারী পাওয়া যায়নি।</p>;
                    }

                    return (
                      <div className="max-h-[300px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-900 p-2 space-y-2 scrollbar-thin text-xs font-sans">
                        {filteredUsers.map((usr, i) => {
                          const usrUsername = usr.email ? usr.email.split('@')[0] : (usr.username || usr.name.toLowerCase().replace(/\s+/g, ''));
                          const isVerified = adminVerifiedUsers.includes(usrUsername);
                          const isBanned = adminBannedUsers.includes(usrUsername);
                          const isMuted = adminMutedUsers.includes(usrUsername);

                          const toggleVerify = () => {
                            let next;
                            if (isVerified) {
                              next = adminVerifiedUsers.filter(u => u !== usrUsername);
                            } else {
                              next = [...adminVerifiedUsers, usrUsername];
                            }
                            setAdminVerifiedUsers(next);
                            localStorage.setItem('bongo_stream_verified_users', JSON.stringify(next));
                            fetch('/api/moderation/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ verifiedUsers: next })
                            }).catch(err => console.error('Error updating verified users on server:', err));
                            window.dispatchEvent(new Event('storage'));
                          };

                          const toggleBan = () => {
                            let next;
                            if (isBanned) {
                              next = adminBannedUsers.filter(u => u !== usrUsername);
                              alert(`ব্যবহারকারী @${usrUsername} সফলভাবে আনব্যান করা হয়েছে।`);
                            } else {
                              next = [...adminBannedUsers, usrUsername];
                              alert(`ব্যবহারকারী @${usrUsername} ব্যান করা হয়েছে।`);
                            }
                            setAdminBannedUsers(next);
                            localStorage.setItem('bongo_stream_banned_users', JSON.stringify(next));
                            fetch('/api/moderation/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ bannedUsers: next })
                            }).catch(err => console.error('Error updating banned users on server:', err));
                            window.dispatchEvent(new Event('storage'));
                          };

                          const toggleMute = () => {
                            let next;
                            if (isMuted) {
                              next = adminMutedUsers.filter(u => u !== usrUsername);
                              alert(`ব্যবহারকারী @${usrUsername} সফলভাবে আনমিউট করা হয়েছে।`);
                            } else {
                              next = [...adminMutedUsers, usrUsername];
                              alert(`ব্যবহারকারী @${usrUsername} মিউট করা হয়েছে।`);
                            }
                            setAdminMutedUsers(next);
                            localStorage.setItem('bongo_stream_muted_users', JSON.stringify(next));
                            fetch('/api/moderation/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mutedUsers: next })
                            }).catch(err => console.error('Error updating muted users on server:', err));
                            window.dispatchEvent(new Event('storage'));
                          };

                          const activePres = onlinePresenceUsers.find((p) => p.username === usrUsername);
                          const watchingText = activePres ? activePres.watchingChannel : '';

                          return (
                            <div key={usr.phone || usrUsername || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-955 border border-slate-800 rounded-xl gap-2 transition-all">
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

                                {watchingText && (
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-450 bg-emerald-555/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg w-fit font-semibold font-sans">
                                    <span className="w-1.5 h-1.5 bg-emerald-555 rounded-full animate-pulse shrink-0" />
                                    <span>বর্তমানে দেখছেন: <strong className="text-emerald-400 font-sans">{watchingText}</strong></span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1.5 font-sans shrink-0">
                                <button
                                  type="button"
                                  onClick={toggleVerify}
                                  className={`p-1.5 px-2 text-[10px] rounded cursor-pointer font-bold transition-all border
                                    ${isVerified 
                                      ? 'bg-sky-500/20 text-sky-450 border-sky-500/30 hover:bg-sky-500/35' 
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
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
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
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
                      onClick={handleDownloadHTMLUserPanel}
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
          onStartApp={() => {
            if (!isLoggedIn) {
              let guestId = localStorage.getItem('bongo_guest_username');
              if (!guestId) {
                guestId = 'guest_' + Math.floor(Math.random() * 1000000);
                localStorage.setItem('bongo_guest_username', guestId);
              }
              const guestName = 'ব্যবহারকারী ' + guestId.substring(6);
              const guestUser = {
                username: guestId,
                name: guestName,
                badge: 'GUEST_VIP',
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`
              };
              localStorage.setItem('bongo_stream_logged_in', 'true');
              localStorage.setItem('bongo_stream_user_cfg', JSON.stringify(guestUser));
              setCurrentUser(guestUser);
              setIsLoggedIn(true);
            }
            setIsTelegramOnboardingOpen(true);
          }}
          onOpenLogin={() => setIsNoticeOpen(true)}
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
        <NoticeModal
          isOpen={isNoticeOpen}
          onClose={() => setIsNoticeOpen(false)}
          siteNameEnglish={siteNameEnglish}
          siteNameBangla={siteNameBangla}
        />
        <TelegramOnboarding
          isOpen={isTelegramOnboardingOpen}
          onClose={() => {
            setIsTelegramOnboardingOpen(false);
            setCurrentPage('app');
          }}
          telegramUrl={siteSettings.telegramUrl}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all selection:bg-sky-500/30 selection:text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 overflow-x-hidden max-w-full w-full">
      
      {/* Decorative Grid Mesh overlay to retain aesthetic cohesion */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-15 pointer-events-none" />

      {/* Premium Top Navigation Bar */}
      <header id="app-navigation-header" className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/90 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-2 xs:px-4 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-2">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              id="btn-toggle-sidebar"
              onClick={() => setIsSidebarOpen(true)}
              title="সাইডবার মেনু খুলুন"
              className="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg border border-slate-800 transition-all cursor-pointer mr-0 sm:mr-0.5 active:scale-95 shrink-0"
            >
              <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-450" />
            </button>

            <button
              id="btn-back-to-landing"
              onClick={() => setCurrentPage('landing')}
              title="হোমপেজে ফিরে যান"
              className="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg border border-slate-800 transition-all cursor-pointer mr-0 sm:mr-0.5 active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 select-none shrink-0">
              <FreeWorldCupBDLogo className="w-7.5 h-7.5 sm:w-10 sm:h-10 hover:scale-105 transition-transform shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <h1 className="text-2xs xs:text-xs sm:text-sm font-extrabold text-slate-100 tracking-tight leading-none bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[165px] md:max-w-[200px]">
                    {siteNameEnglish}
                  </h1>
                </div>
                <p className="text-[7.5px] xs:text-[8px] sm:text-[8.5px] text-slate-450 font-sans tracking-tight truncate max-w-[65px] xs:max-w-[95px] sm:max-w-[155px] md:max-w-[200px]" title={siteNameBangla}>
                  {siteNameBangla}
                </p>
              </div>
            </div>
          </div>

          {/* Profile & Live Actions wrapper */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-1 min-w-0 justify-end">
            
            {/* Standalone Admin Dashboard button - Invisible to normal viewers */}
            {currentUser?.username === 'bongomember' && (
              <button
                id="btn-header-admin-dashboard"
                onClick={() => setCurrentPage('admin')}
                className="flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all active:scale-95 text-sky-400 shrink-0"
                title="অ্যাডমিন ড্যাশবোর্ড"
              >
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">এডমিন প্যানেল</span>
              </button>
            )}

             {/* Authenticated User state display */}
            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Visual Clickable Avatar and Name button to edit profile settings */}
                <button
                  id="btn-edit-profile-header-trigger"
                  onClick={() => setIsProfileEditOpen(true)}
                  title="প্রোফাইল সম্পাদন ও এভারটার পরিবর্তন করুন"
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 border border-slate-800 rounded-xl px-1.5 py-1 sm:pl-2 sm:pr-3 sm:py-1 text-xs font-semibold cursor-pointer transition-all active:scale-95 group shrink-0"
                >
                  {/* Circular Avatar thumbnail display */}
                  {currentUser.avatar ? (
                    currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http') ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-amber-400 group-hover:scale-105 transition-transform shrink-0" 
                      />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-800 border border-slate-700 text-[9.5px] sm:text-[10px] text-white flex items-center justify-center font-bold shrink-0">
                        {currentUser.avatar}
                      </div>
                    )
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-indigo-550 to-sky-500 flex items-center justify-center text-white text-[9.5px] sm:text-[10px] font-black border border-indigo-400 shrink-0">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
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
                  className="p-1 px-1.5 bg-slate-950 hover:bg-rose-955/20 text-slate-400 hover:text-rose-455 border border-slate-850 hover:border-rose-950/20 rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-header-login-trigger"
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-250 hover:border-slate-700 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-450" />
                <span>VIP অ্যাকাউন্ট</span>
              </button>
            )}

            {/* Beautiful App update detection banner for inside the player dashboard - only shows when broadcast is enabled by owner */}
            {isUpdateBroadcastActive && (
              <button
                id="btn-header-check-update"
                onClick={handleTriggerUpdateFlow}
                title="নতুন সংস্করণ বা সংস্করণ আপডেট চেক করুন"
                className="flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 text-amber-400 text-[9.5px] sm:text-xs font-bold rounded-lg border border-amber-500/35 hover:border-amber-400 transition-all cursor-pointer shadow active:scale-95 group animate-pulse shrink-0"
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 font-bold group-hover:scale-110 transition-transform shrink-0" />
                <span>
                  <span className="hidden sm:inline">আপডেট {appVersion === 'v1.1.0' ? 'v1.1.0 (আপডেটেড)' : 'উপলব্ধ (v1.1.0)'}</span>
                  <span className="sm:hidden text-[9px]">{appVersion === 'v1.1.0' ? 'v1.1.0' : 'Update'}</span>
                </span>
              </button>
            )}

            <button
               id="btn-header-refresh-playlist"
               onClick={() => loadChannels(true)}
               disabled={loading || refreshing}
               title="নতুন করে সব চ্যানেল আপলোড ও পরীক্ষা করুন"
               className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-sky-600 hover:bg-sky-505 text-[10px] sm:text-xs font-semibold text-white rounded-lg transition-all shadow-md cursor-pointer active:scale-95 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">রিফ্রেশ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-5 lg:gap-6 relative z-10">

        {!isLoggedIn ? (
          /* VIP Account Auth blocked screen as requested */
          <div id="app-auth-lock-gate" className="w-full max-w-lg bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl text-center select-none my-12 mx-auto">
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
            <div className="lg:col-span-4 lg:sticky lg:top-24 z-30 flex flex-col gap-4 animate-fade-in">
              <div className="relative">
                <CustomPlayer 
                  channel={selectedChannel} 
                  onReportWorkingState={handleReportWorkingState} 
                  serverId={activeServerId}
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
                      channelId={selectedChannel.id}
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

              {/* MAGNIFICENT 4 REAL-TIME HIGH SPEED SERVERS SELECTOR BLOCK */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Radio className="w-4 h-4 text-pink-500 animate-pulse" />
                    <span>সার্ভার</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                    ● real-time
                  </span>
                </div>
                
                {/* Active server readout details */}
                <div className="p-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>চলতি সার্ভার (Routing):</span>
                  {connectingServer ? (
                    <span className="text-amber-400 font-bold animate-pulse">অনলাইন {connectingServer}...</span>
                  ) : (
                    <span className="text-pink-400 font-bold">সার্ভার {activeServerId === '1' ? '১' : activeServerId === '2' ? '২' : activeServerId === '3' ? '৩' : '৪'}</span>
                  )}
                </div>

                {/* Grid layout for 4 real-time servers */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { id: '1', eng: '1', ben: '১', ping: '12ms', load: '14%' },
                    { id: '2', eng: '2', ben: '২', ping: '18ms', load: '19%' },
                    { id: '3', eng: '3', ben: '৩', ping: '15ms', load: '22%' },
                    { id: '4', eng: '4', ben: '৪', ping: '20ms', load: '28%' }
                  ].map((srv) => {
                    const isActive = activeServerId === srv.id;
                    return (
                      <button
                        key={srv.id}
                        onClick={() => {
                          setConnectingServer(srv.ben);
                          setTimeout(() => {
                            setConnectingServer('');
                            setActiveServerId(srv.id);
                            setActiveServer(`Server ${srv.eng}`);
                            localStorage.setItem('site_active_server_id', srv.id);
                            localStorage.setItem('site_active_server', `Server ${srv.eng}`);
                          }, 800);
                        }}
                        disabled={!!connectingServer}
                        className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 cursor-pointer
                          ${isActive
                            ? 'bg-pink-500/10 border-pink-505 text-pink-400 shadow shadow-pink-500/10'
                            : 'bg-slate-950 hover:bg-slate-850 border-slate-850 text-slate-400 hover:text-slate-200'
                          }
                        `}
                      >
                        <span className="text-sm font-extrabold">{srv.ben}</span>
                        <div className="flex flex-col items-center text-[7px] font-mono text-slate-505 leading-none mt-0.5">
                          <span>{srv.ping}</span>
                          <span className="text-[6px] opacity-70">Load: {srv.load}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>


            </div>

          {/* MIDDLE PANEL: Search, Categories & Channel Grid (Takes 8 Cols on desktop for expanded beautiful view) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
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
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 border-pink-400 text-white shadow-lg shadow-pink-950/40' 
                            : 'bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                          }
                        `}
                      >
                        {cat.id === 'favorites' && <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-white' : 'text-pink-500 fill-pink-500'}`} />}
                        <span>{cat.nameBangla}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold
                          ${isActive ? 'bg-pink-700 text-white' : 'bg-slate-900 text-slate-500'}
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
                  <ListFilter className="w-4 h-4 text-pink-405" /> চ্যানেলসমূহ
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
                    <span className="absolute inset-0 border-3 border-pink-500 rounded-full animate-spin border-t-transparent"></span>
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
                  <div id="channels-result-scroller" className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-3 md:gap-4 lg:gap-3 xl:gap-4 max-h-[500px] lg:max-h-[calc(100vh-365px)] overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-850">
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

      {/* EXCLUSIVE SIDEBAR DRAWER INTERFACE */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div 
            id="mobile-sidebar-backdrop"
            className="fixed inset-0 z-[9999] flex bg-black/65 backdrop-blur-xs transition-opacity overflow-hidden w-full h-full"
            onClick={() => setIsSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-80 h-full bg-slate-950 border-r border-slate-900 flex flex-col shadow-2xl relative"
            >
              {/* Header Box mirroring screenshot */}
              <div className="p-4 border-b border-slate-900 flex items-center justify-between select-none shrink-0 bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <FreeWorldCupBDLogo className="w-10 h-10 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-amber-400">
                      Free World Cup BD
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold font-sans">
                      গতিহীন পথ চলা...
                    </span>
                  </div>
                </div>
                
                {/* Close Button matching yellow highlighting */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border-amber-400/60 border bg-amber-400/10 text-amber-450 hover:bg-amber-400/20 active:scale-95 transition-all text-xs font-bold cursor-pointer"
                  title="বন্ধ করুন"
                >
                  ✕
                </button>
              </div>

              {/* Sidebar Content Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar text-left select-none bg-slate-950">
                
                {/* 1. EXCLUSIVE CATEGORY */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
                    EXCLUSIVE
                  </span>
                  
                  {/* Sportz Live Button */}
                  <button
                    onClick={() => {
                      setSelectedGroup('Sports');
                      setSearchQuery('');
                      setIsSidebarOpen(false);
                      setCurrentPage('app');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border transition-all cursor-pointer group text-left
                      ${selectedGroup === 'Sports' ? 'border-pink-500/40 bg-pink-500/10' : 'border-slate-900 hover:border-slate-800'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-slate-200 group-hover:text-white transition-colors">
                        Sportz Live
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-white bg-pink-550 px-2 py-0.5 rounded shadow-sm">
                      LIVE
                    </span>
                  </button>

                  {/* BDIX Live Button */}
                  <button
                    onClick={() => {
                      setSelectedGroup('Bangla');
                      setSearchQuery('bdix');
                      setIsSidebarOpen(false);
                      setCurrentPage('app');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-extrabold text-slate-200 group-hover:text-white transition-colors">
                        BDIX Live
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-white bg-pink-550 px-2 py-0.5 rounded shadow-sm">
                      NEW
                    </span>
                  </button>
                </div>

                {/* 2. SETTINGS CATEGORY */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
                    SETTINGS
                  </span>

                  {/* Remember Last Active toggle */}
                  <div
                    onClick={() => setRememberLast(prev => !prev)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-sky-450" />
                      <span className="text-xs font-extrabold text-slate-200 group-hover:text-white transition-colors">
                        Remember Last ...
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded
                      ${rememberLast ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/20' : 'text-slate-400 bg-slate-900'}
                    `}>
                      {rememberLast ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* 3. COMMUNICATE CATEGORY */}
                <div className="flex flex-col gap-1.5 border-t border-slate-900/60 pt-4">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 mb-1.5">
                    COMMUNICATE
                  </span>

                  {/* Telegram */}
                  <a
                    href={siteSettings.telegramUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/80 hover:pl-3.5 transition-all text-xs font-bold"
                  >
                    <Zap className="w-4 h-4 text-sky-400 shrink-0 select-none rotate-45" />
                    <span>Telegram</span>
                  </a>

                  {/* Contact */}
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsSupportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/85 hover:pl-3.5 transition-all text-xs font-bold cursor-pointer text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Contact</span>
                  </button>

                  {/* Support Us */}
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsDonationModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/85 hover:pl-3.5 transition-all text-xs font-bold cursor-pointer text-left"
                  >
                    <Heart className="w-4 h-4 text-pink-500 shrink-0 fill-pink-500/20" />
                    <span>Support Us</span>
                  </button>

                  {/* Share Content */}
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      if (navigator.share) {
                        navigator.share({
                          title: siteNameEnglish,
                          text: `Free World Cup BD - সরাসরি ক্রিকেট খেলা এবং বিনোদন উপভোগ করুন সম্পূর্ণ ফ্রিতে!`,
                          url: window.location.href,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert('লিঙ্কটি কপি করা হয়েছে! আপনার বন্ধুদের সাথে শেয়ার করুন।');
                      }
                    }}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/85 hover:pl-3.5 transition-all text-xs font-bold cursor-pointer text-left"
                  >
                    <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Share</span>
                  </button>

                  {/* Update App */}
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      handleTriggerUpdateFlow();
                    }}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/85 hover:pl-3.5 transition-all text-xs font-bold cursor-pointer text-left"
                  >
                    <Download className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Update App</span>
                  </button>

                  {/* Copyright */}
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsCopyrightModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/85 hover:pl-3.5 transition-all text-xs font-bold cursor-pointer text-left"
                  >
                    <AlertTriangle className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Copyright</span>
                  </button>

                  {/* Exit */}
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setCurrentPage('landing');
                    }}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl text-slate-300 hover:text-rose-455 hover:bg-rose-950/15 hover:pl-3.5 transition-all text-xs font-bold cursor-pointer text-left border-t border-slate-900/80 mt-2.5 pt-3"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Exit</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUPPORT US / DONATION SPECIFIC MODAL */}
      <AnimatePresence>
        {isDonationModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative text-left"
            >
              <button 
                onClick={() => setIsDonationModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-4 text-pink-500">
                <Heart className="w-6 h-6 fill-pink-500/10 animate-pulse" />
              </div>

              <h3 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none">সাপোর্ট করুন (Support Us)</h3>
              <p className="text-[10px] text-pink-400 font-extrabold uppercase mt-1 tracking-wider font-sans">Sustain Our Free HD Streams</p>
              
               <div className="text-xs text-slate-350 mt-4 leading-relaxed font-sans flex flex-col gap-3">
                <p>
                  Free World Cup BD সম্পূর্ণ ফ্রিতে কোনো প্রকার বাফার ছাড়াই খেলাধুলা এবং বিনোদন ভোগ করার প্লাটফর্ম। এই ফ্রি সার্ভিস চালু রাখতে আমাদের প্রতিমাসে সার্ভার ও ব্যান্ডউইথ খরচ বহন করতে হয়।
                </p>
                <p className="border-l-2 border-pink-500 pl-3.5 text-slate-200 font-bold">
                  আপনার সামান্য সহযোগিতা আমাদের টিমকে আরো নতুন হাই-স্পিড চ্যানেল লিঙ্ক যোগ করতে এবং সচল রাখতে সাহায্য করবে।
                </p>
              </div>

              {/* Donation options */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-550" />
                    <span className="text-2xs font-extrabold text-slate-350 uppercase">bKash / Nagad (Personal):</span>
                  </div>
                  <span className="text-xs font-mono font-black text-pink-400 select-all tracking-wider">+8801640227120</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-2xs font-extrabold text-slate-350 uppercase">Rocket (Personal):</span>
                  </div>
                  <span className="text-xs font-mono font-black text-violet-445 select-all tracking-wider">+8801640227120</span>
                </div>
              </div>

              <div className="mt-5.5 flex items-center justify-end">
                <button
                  onClick={() => setIsDonationModalOpen(false)}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-505 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer active:scale-95 shadow"
                >
                  ঠিক আছে, ধন্যবাদ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COPYRIGHT / DMCA POLICY MODAL */}
      <AnimatePresence>
        {isCopyrightModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative text-left"
            >
              <button 
                onClick={() => setIsCopyrightModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4 text-teal-400">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>

              <h3 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none">কপিরাইট নীতিমালা (DMCA Compliance)</h3>
              <p className="text-[10px] text-teal-400 font-extrabold uppercase mt-1 tracking-wider font-sans">Legal Integrity & Compliance</p>
              
              <div className="text-xs text-slate-350 mt-4 leading-relaxed font-sans flex flex-col gap-3">
                <p>
                  Free World Cup BD স্ট্রিমিং লিঙ্কগুলি সরাসরি নিজেরা হোস্ট বা আপলোড করে না। এখানে প্রদর্শিত সমস্ত মিডিয়া এবং টিভি ফিড ইন্টারনেটে প্রকাশ্যে উপলব্ধ পাবলিক সোর্স ও m3u প্লেলিস্ট থেকে স্বয়ংক্রিয়ভাবে ইনডেক্সড।
                </p>
                <p className="border-l-2 border-teal-500 pl-3.5 text-slate-250 font-bold leading-normal">
                  আমরা মেধাস্বত্ব এবং কপিরাইট আইনের প্রতি যথোচিত শ্রদ্ধাশীল।
                </p>
                <p className="text-[11px] text-slate-400/90 leading-relaxed">
                  যদি কোনো নির্দিষ্ট স্পোর্টস ফিড বা সামগ্রীর বৈধ সত্যাধিকারী আপনি হয়ে থাকেন এবং আপত্তি জানাতে চান, তবে অনুগ্রহ করে আমাদের লাইভ এজেন্ট হেল্পডেস্কে মেসেজ পাঠান, আমরা কপিরাইট ক্লেইম পাওয়ার সাথে সাথেই চ্যানেল স্ট্রিমটি রিমুভ করে দেব।
                </p>
              </div>

              <div className="mt-5.5 flex items-center justify-end">
                <button
                  onClick={() => setIsCopyrightModalOpen(false)}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-505 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer active:scale-95 shadow"
                >
                  সম্মত আছি
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Help & Support Chat floating console overlay removed since it is now embedded inline */}

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
                    <span>👑 Free World Cup BD Administrator Control Deck</span>
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
                        onClick={handleDownloadHTMLUserPanel}
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

      {/* Floating Customer Support Chat Button & Overlay Sheet */}
      {currentPage === 'app' && (
        <>
          {/* Floating Circle Button with pulsing glow */}
          <button
            id="floating-live-support-button"
            onClick={() => setIsSupportModalOpen(true)}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[999] w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group cursor-pointer border border-emerald-400/40 select-none animate-fade-in"
            title="লাইভ সাপোর্ট চ্যাট"
          >
            {/* Pulsing ring */}
            <span className="absolute -inset-1.5 rounded-full bg-emerald-500/20 animate-ping opacity-60" style={{ animationDuration: '3s' }} />
            
            <div className="relative flex items-center justify-center">
              <MessageSquare className="w-6 h-6 md:w-7 md:h-7 text-white" />
              
              {/* Online Green Pill badge */}
              {supportEnabled && (
                <span className="absolute -top-3 -right-3 flex h-3.5 w-3.5" title="এজেন্ট অনলাইন">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border border-slate-950"></span>
                </span>
              )}
            </div>

            {/* Hover Tooltip/Badge */}
            <span className="absolute right-16 md:right-18 bg-slate-900/95 border border-slate-850 text-[10px] md:text-sm font-black text-slate-200 py-1.5 px-3 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-250 select-none pointer-events-none tracking-wide">
              💬 লাইভ সাপোর্ট (অনলাইন)
            </span>
          </button>

          {/* Render real non-inline drawer chat overlay inside App */}
          <SupportChat
            isOpen={isSupportModalOpen}
            onClose={() => setIsSupportModalOpen(false)}
            currentUser={currentUser}
            isInline={false}
          />
        </>
      )}
    </div>
  );
}

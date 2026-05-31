/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  X, 
  Users, 
  MessageSquare,
  Sparkles,
  Zap,
  Pin,
  CheckCircle,
  Ban,
  VolumeX,
  Volume2,
  Trash2,
  Bookmark,
  Share2,
  Activity
} from 'lucide-react';

interface ChatMessage {
  id: string;
  name: string;
  username: string;
  avatar: string;
  flag: string;
  text: string;
  time: string;
  isMe?: boolean;
  isAdmin?: boolean;
  replyTo?: {
    id: string;
    text: string;
    username: string;
  };
}

interface LiveChatProps {
  channelId: string;
  currentUser: { 
    name: string; 
    username: string; 
    phone?: string; 
    avatar?: string; 
    flag?: string; 
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const PREMIUM_REACTIONS = [
  { tag: "[PREMIUM_FIRE]", label: "Fire Ultra", emoji: "🔥", badge: "ULTRA FIRE", style: "from-orange-500 to-red-650 shadow-md shadow-orange-500/20 text-white" },
  { tag: "[BANGLA_TIGER]", label: "Bangla Tiger", emoji: "🐅", badge: "TIGER PRIDE", style: "bg-gradient-to-r from-emerald-600 to-green-700 shadow-md shadow-emerald-500/20 text-white" },
  { tag: "[BIG_SIXER]", label: "Golden Sixer", emoji: "🏏", badge: "BIG SIXER", style: "bg-gradient-to-r from-sky-500 to-blue-650 shadow-md shadow-blue-500/20 text-white" },
  { tag: "[GOAL_STRIKE]", label: "Extreme Goal", emoji: "⚽", badge: "GOALLL!", style: "bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-fuchsia-500/20 text-white" },
  { tag: "[ROYAL_CROWN]", label: "Royal Crown", emoji: "👑", badge: "VIP ROYAL", style: "bg-gradient-to-r from-amber-400 to-yellow-650 shadow-md shadow-amber-500/20 text-slate-950 font-black" },
  { tag: "[MEGA_LOVE]", label: "Mega Love", emoji: "💖", badge: "LOVE IT", style: "bg-gradient-to-r from-pink-500 to-rose-600 shadow-md shadow-pink-500/20 text-white" },
  { tag: "[SPEED_ZAP]", label: "Speed Ultra", emoji: "⚡", badge: "FAST CONNECT", style: "bg-gradient-to-r from-amber-400 to-orange-500 shadow-md shadow-orange-500/20 text-white" },
  { tag: "[CHAMP_CUP]", label: "Champion Cup", emoji: "🏆", badge: "CHAMPION", style: "bg-gradient-to-r from-yellow-405 to-amber-600 shadow-md shadow-yellow-500/20 text-white" }
];

export default function LiveChat({ channelId, currentUser, isOpen, onClose }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);

  // Load real-time presence audience count on mount
  useEffect(() => {
    const fetchAudienceCount = () => {
      fetch('/api/presence')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.count === 'number') {
            setOnlineCount(data.count || 1);
          }
        })
        .catch(() => {});
    };

    fetchAudienceCount();
    const interval = setInterval(fetchAudienceCount, 15000); // Polling every 15s to optimize speed
    return () => clearInterval(interval);
  }, []);

  // Poll state (Local Storage based real time synchronization)
  // [REMOVED AS PER REQUEST]

  // Pinned comment state
  const [pinnedMsg, setPinnedMsg] = useState<{
    text: string;
    author: string;
    avatar?: string;
  } | null>(null);

  // Selected message for Admin moderation popup
  const [moderatingMessage, setModeratingMessage] = useState<ChatMessage | null>(null);

  // Selected message for user reporting popup
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState('হ্যারেজমেন্ট / কটূক্তি করা');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin Verification state check
  const isCurrentAdmin = currentUser?.username === 'bongomember';

  // Helpers for channel-specific storage/broadcasting
  const storageKey = `bongo_live_chat_messages_db_${channelId}`;

  // Poll real-time messages from server API (multi-device active sync)
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = () => {
      fetch(`/api/stadium-chat/${channelId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMessages(data);
          }
        })
        .catch(err => console.error("Failed to poll server chat messages", err));
    };

    // Initial fetch
    fetchMessages();

    // Constant active poll every 4.5 seconds for lag-free performance
    const interval = setInterval(fetchMessages, 4500);

    // Track active chat count
    const counts = Number(localStorage.getItem('bongo_chat_open_counts') || '0');
    localStorage.setItem('bongo_chat_open_counts', String(counts + 1));

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, channelId]);

  // Handle local state loading
  useEffect(() => {
    // Load Pinned Message
    try {
      const savedPin = localStorage.getItem('chat_pinned_comment');
      if (savedPin) {
        setPinnedMsg(JSON.parse(savedPin));
      } else {
        setPinnedMsg(null);
      }
    } catch {
      // Fallback
    }
  }, [channelId]);

  // Listen to any changes on storage (pinned comments)
  useEffect(() => {
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'chat_pinned_comment') {
        setPinnedMsg(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [storageKey]);

  // Autoscroll to bottom whenever message queue updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, pinnedMsg]);

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Double check if a user is currently banned or muted
  const checkIfUserMuted = (username: string): boolean => {
    try {
      const mutedUsers = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
      return mutedUsers.includes(username);
    } catch {
      return false;
    }
  };

  const checkIfUserBanned = (username: string): boolean => {
    try {
      const bannedUsers = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
      return bannedUsers.includes(username);
    } catch {
      return false;
    }
  };

  const checkIfUserVerified = (username: string): boolean => {
    try {
      const verifiedUsers = JSON.parse(localStorage.getItem('bongo_stream_verified_users') || '[]');
      return verifiedUsers.includes(username);
    } catch {
      return false;
    }
  };

  // Parse custom premium tags & clickable URLs in text string
  function renderMessageText(text: string) {
    // 1. Convert URLs to custom click targets
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    
    // Parse premium tags first
    const parts = text.split(/(\[.*?\])/g);
    
    return (
      <span className="flex flex-wrap items-center gap-1.5 font-sans break-words max-w-full">
        {parts.map((part, index) => {
          const matched = PREMIUM_REACTIONS.find(r => r.tag === part);
          if (matched) {
            return (
              <span 
                key={index} 
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-tight uppercase shadow-sm select-none bg-gradient-to-r ${matched.style} animate-pulse`}
              >
                <span className="text-[11px]">{matched.emoji}</span>
                <span>{matched.badge}</span>
              </span>
            );
          }

          // Search URL inside string fragment
          const subParts = part.split(urlPattern);
          return subParts.map((sub, sIdx) => {
            if (sub.match(urlPattern)) {
              return (
                <a 
                  key={`link-${index}-${sIdx}`}
                  href={sub}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-400 hover:text-sky-305 underline break-all inline flex-wrap"
                >
                  {sub}
                </a>
              );
            }
            return <span key={`text-${index}-${sIdx}`}>{sub}</span>;
          });
        })}
      </span>
    );
  }

  // User details avatar rendering
  function renderAvatar(avatar: string | undefined, name: string, isAdmin: boolean = false) {
    if (isAdmin) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-650 flex items-center justify-center text-white text-xs font-black shadow-lg border-2 border-amber-400 shrink-0 select-none animate-bounce-short">
          👑
        </div>
      );
    }

    if (!avatar) {
      const initial = name ? name.trim().charAt(0).toUpperCase() : 'B';
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 via-sky-600 to-teal-500 flex items-center justify-center text-white text-xs font-black shadow-inner border border-indigo-400 shrink-0 select-none">
          {initial}
        </div>
      );
    }

    if (avatar.startsWith('data:') || avatar.startsWith('http')) {
      return (
        <img
          src={avatar}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-md shrink-0 select-none"
        />
      );
    }

    // Characters or single letters
    return (
      <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 text-sm flex items-center justify-center shadow-md shrink-0 select-none font-bold">
        {avatar}
      </div>
    );
  }

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (!currentUser) return;

    // Check if banned or muted
    if (checkIfUserBanned(currentUser.username)) {
      alert('সতর্কবার্তা: আপনাকে এডমিন প্যানেল থেকে ব্লক করা হয়েছে! আপনি কোনো মেসেজ প্রদান করতে পারবেন না।');
      return;
    }

    if (checkIfUserMuted(currentUser.username)) {
      alert('সতর্কবার্তা: আজেবাজে আচরণের কারণে এডমিন আপনাকে মিউট করে রেখেছে! চ্যাটে মেসেজ পাঠানো নিষ্ক্রিয়।');
      return;
    }

    const myMessage = {
      name: currentUser.name,
      username: currentUser.username,
      avatar: currentUser.avatar || '',
      flag: currentUser.flag || '🇧🇩',
      text: inputText.trim(),
      time: formatTime(new Date()),
      isAdmin: isCurrentAdmin,
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, username: replyingTo.username } : undefined
    };

    // Post to server-backed chat controller
    fetch(`/api/stadium-chat/${channelId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(myMessage)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    })
    .catch(err => {
      console.error("Failed to post message", err);
      // Client-side fallback if server fails
      setMessages(prev => [...prev, { ...myMessage, id: `my-fallback-${Date.now()}` } as ChatMessage]);
    });
    
    // Auto sync state for administrative settings trigger channel
    if (isCurrentAdmin) {
      if (inputText.toLowerCase().startsWith('/pin ')) {
        const pinText = inputText.substring(5);
        const newPin = { text: pinText, author: currentUser.name, avatar: currentUser.avatar };
        setPinnedMsg(newPin);
        localStorage.setItem('chat_pinned_comment', JSON.stringify(newPin));
      }
    }

    setInputText('');
    setShowEmojiTray(false);
    setReplyingTo(null);
  };

  const handleEmojiClick = (emojiTag: string) => {
    setInputText(prev => prev + " " + emojiTag + " ");
  };

  // Handle Admin controls triggers (connected directly to Server APIs)
  const handleAdminAction = (type: 'ban' | 'mute' | 'unban' | 'unmute' | 'pin' | 'delete') => {
    if (!moderatingMessage) return;
    const targetUsername = moderatingMessage.username;

    if (type === 'ban') {
      // 1. Extreme ban server action: delete user chats from backend
      fetch(`/api/stadium-chat/${channelId}/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(err => console.error("Error running ban user server action:", err));

      // 2. Persist to ban list locally and server-side
      const banned = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
      if (!banned.includes(targetUsername)) {
        banned.push(targetUsername);
        localStorage.setItem('bongo_stream_banned_users', JSON.stringify(banned));
      }
      fetch('/api/moderation/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannedUsers: banned })
      }).catch(err => console.error('Error syncing ban status:', err));

      alert(`ইউজার @${targetUsername} কে সফলভাবে চ্যাট থেকে ব্যান ও নিষ্ক্রিয় করা হয়েছে!`);
    }

    if (type === 'unban') {
      const banned = JSON.parse(localStorage.getItem('bongo_stream_banned_users') || '[]');
      const filtered = banned.filter((u: string) => u !== targetUsername);
      localStorage.setItem('bongo_stream_banned_users', JSON.stringify(filtered));
      
      fetch('/api/moderation/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannedUsers: filtered })
      }).catch(err => console.error('Error syncing unban status:', err));

      alert(`ইউজার @${targetUsername} থেকে ব্যান প্রত্যাহার করা হয়েছে।`);
    }

    if (type === 'mute') {
      const muted = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
      if (!muted.includes(targetUsername)) {
        muted.push(targetUsername);
        localStorage.setItem('bongo_stream_muted_users', JSON.stringify(muted));
      }

      fetch('/api/moderation/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutedUsers: muted })
      }).catch(err => console.error('Error syncing mute status:', err));

      alert(`ইউজার @${targetUsername} কে সফলভাবে চ্যাটে মিউট করা হয়েছে।`);
    }

    if (type === 'unmute') {
      const muted = JSON.parse(localStorage.getItem('bongo_stream_muted_users') || '[]');
      const filtered = muted.filter((u: string) => u !== targetUsername);
      localStorage.setItem('bongo_stream_muted_users', JSON.stringify(filtered));

      fetch('/api/moderation/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutedUsers: filtered })
      }).catch(err => console.error('Error syncing unmute status:', err));

      alert(`ইউজার @${targetUsername} থেকে মিউট প্রত্যাহার করা হয়েছে।`);
    }

    if (type === 'pin') {
      const newPin = {
        text: moderatingMessage.text,
        author: moderatingMessage.name,
        avatar: moderatingMessage.avatar
      };
      setPinnedMsg(newPin);
      localStorage.setItem('chat_pinned_comment', JSON.stringify(newPin));
      alert('মেসেজটি সবার উপরে পিন করা হয়েছে!');
    }

    if (type === 'delete') {
      fetch(`/api/stadium-chat/${channelId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: moderatingMessage.id })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(err => console.error("Error executing message delete:", err));

      alert('মেসেজটি চ্যাট বোর্ড থেকে সফলভাবে অপসারণ করা হয়েছে!');
    }

    setModeratingMessage(null);
  };


  // Handle report submission
  const handleReportAction = (reason: string) => {
    if (!reportingMessage) return;
    try {
      const newReport = {
        id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        reportedUser: reportingMessage.username,
        reportedName: reportingMessage.name,
        reportedMessage: reportingMessage.text,
        messageId: reportingMessage.id,
        messageTime: reportingMessage.time,
        reason: reason,
        reporterName: currentUser ? currentUser.name : 'Guest User',
        reporterUsername: currentUser ? currentUser.username : 'guest',
        reportedAt: new Date().toLocaleString('bn-BD', { hour12: true })
      };
      
      // Post report server-side
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      })
      .then(() => {
        // Backup to localstorage
        const reportsRaw = localStorage.getItem('bongo_live_chat_reports_db');
        const reports = reportsRaw ? JSON.parse(reportsRaw) : [];
        reports.push(newReport);
        localStorage.setItem('bongo_live_chat_reports_db', JSON.stringify(reports));
        
        // Dispatch storage event so other tabs get it
        window.dispatchEvent(new Event('storage'));
      })
      .catch(err => console.error('Error sending report:', err));
      
      alert(`ধন্যবাদ! @${reportingMessage.name} এর বিরুদ্ধে আপনার রিপোর্টটি সফলভাবে অ্যাডমিন প্যানেলে পাঠানো হয়েছে।`);
    } catch (e) {
      console.error(e);
    }
    setReportingMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="live-stadium-chat-box"
      className="bg-slate-900 border border-slate-805 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans h-[520px] w-full animate-fade-in relative z-20"
    >
      {/* Live Chat header */}
      <div className="bg-slate-955 border-b border-slate-850 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <h4 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>Stadium Live Chat</span>
          </h4>
          <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-sans flex items-center gap-1 font-bold">
            <Users className="w-3 h-3 text-sky-400 shrink-0 animate-pulse" />
            <span>{onlineCount} Stadium Gfans</span>
          </span>
        </div>
        
        <button
          id="btn-close-stadium-chat"
          type="button"
          onClick={onClose}
          title="চ্যাট বক্স বন্ধ করুন"
          className="p-1.5 bg-slate-950 hover:bg-rose-955/40 text-slate-400 hover:text-rose-455 rounded-lg border border-slate-800 hover:border-rose-900/15 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* --- PINNED COMMENTS CONTAINER PANEL --- */}
      {pinnedMsg && (
        <div id="live-chat-pinned-box" className="bg-slate-950/90 border-b border-slate-850 px-3.5 py-2 flex items-start gap-2 select-none z-10">
          <Pin className="w-3.5 h-3.5 text-amber-400 mt-1.5 shrink-0 rotate-45" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black tracking-wider uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded font-sans">
                PINNED
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                @{pinnedMsg.author}
              </span>
            </div>
            <p className="text-[10px] text-slate-205 font-medium leading-relaxed mt-0.5 max-w-full">
              {renderMessageText(pinnedMsg.text)}
            </p>
          </div>
          {isCurrentAdmin && (
            <button
              onClick={() => {
                setPinnedMsg(null);
                localStorage.removeItem('chat_pinned_comment');
              }}
              title="পিন সরিয়ে ফেলুন"
              className="text-slate-500 hover:text-rose-450 p-1 rounded hover:bg-slate-905 cursor-pointer"
            >
              <X className="w-3" />
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll track */}
      <div 
        ref={scrollRef}
        id="chat-messages-scroll-track"
        className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 selection:bg-slate-800"
      >
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center text-slate-500 text-center p-6 select-none font-sans">
            <MessageSquare className="w-9 h-9 text-slate-700 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-slate-400">কোনো ডেমো চ্যাট বা রোবট মেসেজ নেই</p>
            <p className="text-[10px] text-slate-500 mt-1">প্রথম মেসেজটি লিখে চ্যাট রুম সচল করুন!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMsgAdmin = msg.isAdmin || msg.username === 'fwcbdmember';
            const isOwnMessage = currentUser && msg.username === currentUser.username;
            
            return (
              <div 
                key={msg.id} 
                onClick={() => setReplyingTo(msg)}
                className={`py-1.5 px-2 hover:bg-slate-800/40 rounded-xl text-xs leading-relaxed animate-fade-in group relative select-all transition-all duration-200 border border-transparent hover:border-slate-800/50
                  ${isMsgAdmin ? 'border-l-2 border-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent' : ''}
                `}
              >
                <div className="flex items-start gap-2.5 max-w-full">
                  {/* User Profile Details */}
                  <div className="shrink-0 mt-0.5" title={msg.username}>
                    {renderAvatar(msg.avatar, msg.name, isMsgAdmin)}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-1.5 w-full select-none">
                      <div className="flex items-center gap-1.5">
                        {/* Username handle FIRST */}
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMsgAdmin) return;
                            if (isCurrentAdmin) {
                              setModeratingMessage(msg);
                            } else if (currentUser && msg.username !== currentUser.username) {
                              setSelectedReportReason('হ্যারেজমেন্ট / কটূক্তি করা');
                              setReportingMessage(msg);
                            }
                          }}
                          className={`font-black tracking-wide cursor-pointer hover:underline inline-flex items-center gap-1 shrink-0 text-[11px] transition-all
                            ${isMsgAdmin ? 'text-amber-400' : 'text-sky-400 hover:text-sky-305'}
                          `}
                        >
                          {msg.name}
                          {isMsgAdmin && (
                            <span className="text-[7px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-full font-black uppercase tracking-widest animate-pulse border border-amber-500/35">ADMIN</span>
                          )}
                        </span>

                        {/* Animated Flag indicator SECOND */}
                        {msg.flag === '🇧🇩' ? (
                          <span className="text-xs select-none inline-block hover:scale-130 transition-transform origin-center filter drop-shadow-[0_0_5px_rgba(16,185,129,0.9)] animate-pulse" title="বাংলা টাইগার্স সমর্থক">
                            🇧🇩
                          </span>
                        ) : (
                          <span className="text-xs select-none inline-block hover:scale-120 transition-transform" title={`দেশ: ${msg.flag}`}>
                            {msg.flag}
                          </span>
                        )}
                      </div>

                      {/* Time stamp far right */}
                      <span className="text-[8px] text-slate-500 font-mono select-none">
                        {msg.time}
                      </span>
                    </div>

                    {/* Chat Text area */}
                    <div className="relative group/msg flex flex-col gap-1 max-w-full">
                      {msg.replyTo && (
                        <div className="bg-slate-950/60 p-1.5 rounded-lg text-[10px] text-slate-400 border-l-2 border-sky-505 mb-1 max-w-full">
                          <p className="text-sky-300 font-bold">@{msg.replyTo.username}</p>
                          <p className="truncate">{msg.replyTo.text}</p>
                        </div>
                      )}
                      <span className="text-slate-205 leading-normal font-sans tracking-wide break-words max-w-full">
                        {renderMessageText(msg.text)}
                      </span>
                      
                      {/* Delete option */}
                      {isOwnMessage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetch(`/api/stadium-chat/${channelId}/delete`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: msg.id })
                            })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success && data.messages) {
                                setMessages(data.messages);
                              }
                            })
                            .catch(err => console.error("Error deleting msg:", err));
                          }}
                          className="absolute -right-1 bottom-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-950/50 rounded-lg text-rose-500 cursor-pointer transition-opacity duration-150"
                          title="মেসেজ মুছুন"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- LIVE INTERACTIVE MODERATOR OPTION ACTION PROMPT OVERLAY --- */}
      {moderatingMessage && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-xs shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
              <span className="text-11px font-black uppercase tracking-wider text-rose-455 flex items-center gap-1 font-sans">
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>চ্যাট মডারেশন নিয়ন্ত্রণ</span>
              </span>
              <button 
                onClick={() => setModeratingMessage(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-950"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal mb-3 font-sans">
              আপনি ইউজার <span className="text-sky-400 font-bold">@{moderatingMessage.name}</span> এর মেসেজ (<span className="text-slate-300 font-mono italic">"{moderatingMessage.text.substring(0, 16)}..."</span>) মডারেট করছেন। অ্যাকশন সিলেক্ট করুন:
            </p>

            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => handleAdminAction('pin')}
                className="w-full text-left py-1.5 px-3 bg-slate-950 hover:bg-amber-500/10 text-[11px] text-amber-400 hover:text-amber-305 border border-slate-850 rounded-lg font-bold flex items-center gap-1.8 cursor-pointer transition-colors"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>মেসেজটি সবার উপরে পিন (Pin Comment)</span>
              </button>
              
              <button 
                onClick={() => handleAdminAction('delete')}
                className="w-full text-left py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-[11px] text-rose-455 border border-slate-850 rounded-lg font-bold flex items-center gap-1.8 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>চ্যাট বোর্ড থেকে মেসেজ মুছে দিন</span>
              </button>

              <button 
                onClick={() => handleAdminAction('mute')}
                className="w-full text-left py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-[11px] text-zinc-100 border border-slate-850 rounded-lg font-bold flex items-center gap-1.8 cursor-pointer transition-colors"
              >
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>ইউজারকে মিউট করুন (Mute Keyboard)</span>
              </button>

              <button 
                onClick={() => handleAdminAction('ban')}
                className="w-full text-left py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] text-rose-455 border border-rose-500/25 rounded-lg font-bold flex items-center gap-1.8 cursor-pointer transition-all"
              >
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>ইউজার ব্যান এবং ব্লক করুন (Extreme Ban)</span>
              </button>
            </div>

            <div className="mt-3.5 border-t border-slate-850 pt-2.5 flex justify-between gap-1.5">
              <button
                onClick={() => handleAdminAction('unmute')}
                className="text-[9px] text-slate-450 hover:text-slate-300 underline font-semibold"
              >
                মিউট প্রত্যাহার
              </button>
              <button
                onClick={() => handleAdminAction('unban')}
                className="text-[9px] text-slate-450 hover:text-slate-300 underline font-semibold"
              >
                ব্যান প্রত্যাহার
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIVE INTERACTIVE USER REPORT OPTIONS OVERLAY --- */}
      {reportingMessage && (
        <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-xs shadow-2xl animate-scale-up text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-455 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>রিপোর্ট করুন (Report User)</span>
              </span>
              <button 
                onClick={() => setReportingMessage(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-950"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mb-3 p-2 bg-slate-950 rounded border border-slate-850">
              <p className="text-[10px] text-slate-500 font-mono">মেসেজ লেখক:</p>
              <p className="font-bold text-sky-400">@{reportingMessage.name} ({reportingMessage.username})</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">মেসেজ কনটেন্ট:</p>
              <p className="text-slate-300 italic truncate mt-0.5">"{reportingMessage.text}"</p>
            </div>

            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">রিপোর্টের কারণ নির্বাচন করুন:</label>
            <select
              value={selectedReportReason}
              onChange={(e) => setSelectedReportReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 focus:outline-none mb-4 outline-none font-sans"
            >
              <option value="হ্যারেজমেন্ট / কটূক্তি করা">হ্যারেজমেন্ট / কটূক্তি করা (Harassment)</option>
              <option value="স্প্যাম মেসেজ পাঠানো">স্প্যাম মেসেজ পাঠানো (Spamming)</option>
              <option value="অশালীন বা আপত্তিকর ভাষা">অশালীন বা আপত্তিকর ভাষা (Abusive Language)</option>
              <option value="বিভ্রান্তিকর তথ্য বা ভুয়া লিংক">বিভ্রান্তিকর তথ্য বা লিংক (Misleading / Fake Links)</option>
              <option value="চ্যাটরুমের পরিবেশ ব্যাঘাত করা">চ্যাটরুমের পরিবেশ ব্যাঘাত করা (Disruption)</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportingMessage(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold rounded-lg cursor-pointer text-slate-300 text-center select-none"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => handleReportAction(selectedReportReason)}
                className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-505 text-white text-[10px] font-bold rounded-lg cursor-pointer text-center select-none shadow-md shadow-rose-950/20"
              >
                রিপোর্ট জমা দিন 🚨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Emojis clickable panel drawer */}
      {showEmojiTray && (
        <div 
          id="stadium-chat-emoji-panel"
          className="absolute bottom-16 left-3 right-3 bg-slate-955 border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 select-none z-25 animate-fade-in"
        >
          <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-850 pb-1.5 font-sans">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>প্রিমিয়াম এনিমেশন রিঅ্যাকশন পিলসমূহ</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PREMIUM_REACTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                title={item.label}
                onClick={() => handleEmojiClick(item.tag)}
                className="hover:scale-105 active:scale-95 transition-transform cursor-pointer p-1.5 bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center gap-1"
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-[8px] uppercase tracking-tighter text-slate-400 font-bold font-sans">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input controls form */
      replyingTo && (
        <div className="bg-slate-955 border-t border-slate-850 px-3.5 py-1.5 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2 truncate">
             <MessageSquare className="w-3 h-3 text-sky-400" />
             <span className="text-slate-400">Reply to <b className="text-sky-400">@{replyingTo.name}</b></span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <form 
        onSubmit={handleSendMessage}
        className="bg-slate-955 border-t border-slate-850 px-3.5 py-3 flex items-center gap-2 select-none"
      >
        {/* Toggle Emojis selection */}
        <button
          type="button"
          id="btn-toggle-emoji-tray"
          onClick={() => setShowEmojiTray(!showEmojiTray)}
          className={`p-2 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0
            ${showEmojiTray 
              ? 'bg-sky-500/10 text-sky-400 border-sky-505/30' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }
          `}
          title="প্রিমিয়াম রিঅ্যাকশন এনিমেশন নির্বাচন"
        >
          <Smile className="w-4 h-4 text-amber-400" />
        </button>

        {/* Text Input area */}
        <input
          id="chat-text-input-field"
          type="text"
          placeholder={currentUser ? "প্রিমিয়াম ইমোজি সহ চ্যাট লিখুন..." : "ভেরিফাইড অ্যাকাউন্টে লগইন করে চ্যাট করুন..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="bg-slate-900 border border-slate-800 focus:border-sky-505/50 rounded-lg px-3 py-2 text-base md:text-xs text-slate-250 outline-none flex-1 min-w-0"
          disabled={!currentUser}
        />

        {/* Submit button */}
        <button
          type="submit"
          id="btn-submit-chat-message"
          disabled={!inputText.trim() || !currentUser}
          className="p-2 bg-sky-600 hover:bg-sky-505 disabled:bg-slate-900 text-white disabled:text-slate-600 rounded-lg transition-all shadow cursor-pointer shrink-0 active:scale-95"
          title="পাঠান"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

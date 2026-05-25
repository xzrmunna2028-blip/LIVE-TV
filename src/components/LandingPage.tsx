/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  Sparkles, 
  Smartphone, 
  ShieldCheck, 
  Flame, 
  Languages, 
  Play, 
  Lock, 
  LogIn, 
  LogOut, 
  Zap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Activity,
  Star,
  Award,
  Tv2,
  RefreshCw
} from 'lucide-react';
import { Channel } from '../types';

export function StatsDisplay() {
  const [stats, setStats] = useState({ totalRegistrations: 0, totalLogins: 0, activeUsers: 0 });
  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(setStats);
    const interval = setInterval(() => {                
        fetch('/api/stats').then(res => res.json()).then(setStats);
    }, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);                

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center shadow-lg">
        <span className="text-lg md:text-xl font-black text-white">{stats.totalRegistrations}</span>
        <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-0.5">সব রেজিস্ট্রেশন</span>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center shadow-lg">
        <span className="text-lg md:text-xl font-black text-white">{stats.totalLogins}</span>
        <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-0.5">সব লগইন</span>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center shadow-lg">
        <span className="text-lg md:text-xl font-black text-emerald-400">{stats.activeUsers}</span>
        <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-0.5">বর্তমানে লাইভ</span>
      </div>
    </div>
  )
}
  const customLogoUrl = localStorage.getItem('site_logo_url') || '';
  const siteNameBangla = localStorage.getItem('site_name_bangla') || 'বিডি লাইভ টিভি';
  const siteNameEnglish = localStorage.getItem('site_name_english') || 'BD LIVE TV';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Outer Rotating Cyber Neon Rings */}
      <div className="absolute inset-0 rounded-full border-4 border-dashed border-sky-504/40 animate-[spin_40s_linear_infinite]" />
      <div className="absolute inset-1.5 rounded-full border-2 border-indigo-505/30 animate-[spin_20s_linear_infinite_reverse]" />
      
      {/* Glowing Backdrop */}
      <div className="absolute inset-3 bg-gradient-to-tr from-sky-600/35 to-indigo-650/45 rounded-full blur-xl opacity-80" />
      
      {/* Main Logo Disc */}
      {customLogoUrl ? (
        <img 
          src={customLogoUrl} 
          alt="Brand Logo" 
          referrerPolicy="no-referrer"
          className="w-[85%] h-[85%] rounded-full object-cover relative z-10 border border-sky-400/50 shadow-lg shadow-sky-500/10"
        />
      ) : (
        <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 drop-shadow-[0_0_25px_rgba(14,165,233,0.5)]">
          {/* Sky gradient background */}
          <defs>
            <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="45%" stopColor="#0369a1" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id="flagRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="flagGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          {/* Base Circle */}
          <circle cx="200" cy="200" r="185" fill="url(#discGrad)" stroke="#38bdf8" strokeWidth="6" />
          <circle cx="200" cy="200" r="176" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.6" />

          {/* Stadium Lights Beams */}
          <path d="M 50 100 L 200 200 L 350 100" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
          <path d="M 100 50 L 200 200 L 300 50" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />

          {/* Map of Bangladesh inside disc on the Right */}
          <path 
            d="M 280 150 Q 310 130 330 150 T 350 180 T 330 220 T 340 260 T 310 280 T 290 250 T 280 200 Z" 
            fill="url(#flagGreen)" 
            opacity="0.35" 
            stroke="#059669" 
            strokeWidth="1.5"
          />
          {/* Red circle element on Bangladesh Map */}
          <circle cx="315" cy="200" r="18" fill="url(#flagRed)" opacity="0.5" />

          {/* Bangladesh Flag graphic on Right Margin background */}
          <g transform="translate(310, 80) scale(0.45)" opacity="0.9">
            <rect x="0" y="0" width="100" height="60" rx="4" fill="#047857" stroke="#ffffff" strokeWidth="2" />
            <circle cx="45" cy="30" r="18" fill="#e11d48" />
          </g>

          {/* Cricket Batsman Silhouette Vector on Left */}
          <g transform="translate(68, 120) scale(0.28)" opacity="0.85">
            {/* Batsman outline with sky glow */}
            <path d="M50 160 Q80 110 90 90 L110 50 L115 45 Q125 35 140 45 L155 60 L140 100 L110 160" stroke="#38bdf8" strokeWidth="12" fill="none" strokeLinecap="round" />
            <line x1="115" y1="45" x2="200" y2="-10" stroke="url(#goldGrad)" strokeWidth="15" strokeLinecap="round" /> {/* Bat */}
            <circle cx="95" cy="70" r="16" fill="#ffffff" />
          </g>

          {/* Soccer Player Silhouette Vector on Right */}
          <g transform="translate(205, 125) scale(0.26)" opacity="0.85">
            <path d="M40 160 L60 90 L120 70 L140 100" stroke="#38bdf8" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M60 90 L10 110 L5 125" stroke="#38bdf8" strokeWidth="10" fill="none" strokeLinecap="round" />
            <circle cx="120" cy="50" r="16" fill="#ffffff" />
            <circle cx="160" cy="115" r="12" fill="#ffffff" stroke="#000000" strokeWidth="2" /> {/* Football */}
          </g>

          {/* Central Globe Outline */}
          <circle cx="200" cy="280" r="48" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" opacity="0.8" />
          <path d="M 152 280 Q 200 295 248 280" fill="none" stroke="#059669" strokeWidth="2" opacity="0.7" />
          <path d="M 152 280 Q 200 265 248 280" fill="none" stroke="#059669" strokeWidth="2" opacity="0.7" />
          <path d="M 200 232 Q 215 280 200 328" fill="none" stroke="#059669" strokeWidth="2" opacity="0.7" />
          <path d="M 200 232 Q 185 280 200 328" fill="none" stroke="#059669" strokeWidth="2" opacity="0.7" />

          {/* Glow Arc Lines */}
          <path d="M 50 200 C 50 100, 350 100, 350 200" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.4" />
          <path d="M 80 200 C 80 120, 320 120, 320 200" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.3" strokeDasharray="5,5" />

          {/* Completely Free Badge at top */}
          <g transform="translate(145, 30)">
            <rect x="0" y="0" width="110" height="34" rx="17" fill="url(#flagRed)" stroke="#ef4444" strokeWidth="1.5" />
            <text x="55" y="21" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">সম্পূর্ণ ফ্রি</text>
          </g>

          {/* Bengali Brand Text: Dynamic siteNameBangla */}
          <text 
            x="200" 
            y="115" 
            fill="#ffffff" 
            fontSize="32" 
            fontWeight="900" 
            textAnchor="middle" 
            fontFamily="sans-serif"
            letterSpacing="0.5"
            stroke="#000000"
            strokeWidth="3.5"
            paintOrder="stroke"
          >
            {siteNameBangla}
          </text>

          {/* Subtitle: Dynamic siteNameEnglish */}
          <text 
            x="200" 
            y="152" 
            fill="url(#goldGrad)" 
            fontSize="18" 
            fontWeight="800" 
            textAnchor="middle" 
            fontFamily="sans-serif"
            letterSpacing="1"
            stroke="#000000"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            {siteNameEnglish.toUpperCase()}
          </text>
        </svg>
      )}
    </div>
  );
}

// 5 Stunning Live Match Demos that simulate authentic World Cup broadcast coverage
interface SlideShowEvent {
  id: string;
  sport: 'cricket' | 'football' | 'news' | 'special';
  title: string;
  opponent: string;
  status: string;
  score: string;
  ticker: string;
  backdrop: string;
  channelName: string;
  channelId: string;
  badge: string;
}

const FEATURED_SLIDES: SlideShowEvent[] = [
  {
    id: 'ch-t20-wc',
    sport: 'cricket',
    title: 'ICC T20 World Cup - Live 4K',
    opponent: 'Bangladesh vs India',
    status: 'চলমান লাইভ (2nd Innings)',
    score: 'BAN 158/4 (18.3 Ov) • IND 157/7 (20 Ov)',
    ticker: 'বাংলাদেশ টাইগার্স এর দুর্দান্ত ব্যাটিং! জয়ের একদম শেষ প্রান্তে বাংলাদেশ।',
    backdrop: 'from-sky-950 via-slate-900 to-indigo-950',
    channelName: 'T Sports 4K Live',
    channelId: 'tsports',
    badge: 'টি-স্পোর্টস এক্সক্লুসিভ'
  },
  {
    id: 'ch-fifa-wc',
    sport: 'football',
    title: 'FIFA World Cup Elite Stage',
    opponent: 'Argentina vs Brazil',
    status: 'লাইভ প্রথমার্ধ (22 mins сыграно)',
    score: 'ARG 1 - 0 BRA',
    ticker: 'লিওনেল মেসির চমৎকার গোল অ্যাসিস্টে আর্জেন্টিনা এগিয়ে! মারাকানা কাপ্প কাপ্পা!',
    backdrop: 'from-emerald-950 via-slate-900 to-teal-950',
    channelName: 'Sony Ten 1 HD Live',
    channelId: 'sony_ten1',
    badge: 'ফুটবল ম্যাচ ২'
  },
  {
    id: 'ch-gtv-live',
    sport: 'cricket',
    title: 'দ্বিপাক্ষিক সিরিজ আন্তর্জাতিক',
    opponent: 'Bangladesh vs Sri Lanka Live',
    status: 'লাঞ্চ বিরতি (Day 1)',
    score: 'BAN 110/1 (32.0 Ov) • SRI LANKA',
    ticker: 'ওপেনার তানজিদ হাসান এর দুর্দান্ত হাফ-সেঞ্চুরি ৮২ রান!',
    backdrop: 'from-blue-950 via-slate-900 to-slate-950',
    channelName: 'GTV (Gazi TV) Live',
    channelId: 'gtv_live',
    badge: 'বাংলাদেশ ভেন্যু আইপিটিভি'
  },
  {
    id: 'ch-news-somoy',
    sport: 'news',
    title: 'সরাসরি দেশ-বিদেশের খবর',
    opponent: 'Somoy TV Latest News Feed',
    status: 'লাইভ সম্প্রচার',
    score: 'Breaking: গুরুত্বপূর্ণ আপডেটসমূহ',
    ticker: 'সারাদেশের সকল জেলা ও উপজেলার নিরপেক্ষ খবর সরাসরি স্টুডিও থেকে।',
    backdrop: 'from-rose-950 via-slate-900 to-slate-950',
    channelName: 'Somoy News Live',
    channelId: 'somoy_news',
    badge: 'টানা ২৪ ঘন্টা সংবাদ'
  },
  {
    id: 'ch-movies-sg',
    sport: 'special',
    title: 'সুপার ব্লকবাস্টার সিনেমা',
    opponent: 'Star Gold Action Specials',
    status: 'লাইভ সিনেমা স্ক্রিন',
    score: 'Movie: K.G.F Chapter 2 HD',
    ticker: 'বিশ্ব ক্রিকেটের বিরতিতে আকর্ষণীয় সব সিনেমার এইচডি সম্প্রচার।',
    backdrop: 'from-amber-950 via-slate-900 to-slate-950',
    channelName: 'Star Gold Live BD',
    channelId: 'star_gold',
    badge: 'সিনেমা স্পেশাল'
  }
];

// Beautiful Simulated Broadcast TV Screen with four corner borders showing sports dynamic play animations
export function BroadcastSimulatedScreen({ slide }: { slide: SlideShowEvent }) {
  return (
    <div className="relative w-full max-w-sm md:w-80 h-48 rounded-2xl bg-neutral-950 border-[4px] border-slate-800 shadow-2xl overflow-hidden group select-none">
      
      {/* Real physical glass glare gradient layer */}
      <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-20" />
      
      {/* TV Screen scanlines filter for high-end authentic premium feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] bg-[size:100%_4px,6px_100%] pointer-events-none z-20" />

      {/* Magnificent Neon Four-Corner Display Borders (as requested by user!) */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-sky-400 z-30 animate-pulse" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-sky-400 z-30 animate-pulse" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-sky-400 z-30 animate-pulse" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-sky-400 z-30 animate-pulse" />

      {/* Screen contents based on sports category */}
      {slide.sport === 'cricket' && (
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 flex flex-col justify-between p-3 overflow-hidden">
          {/* Pitch background sketch */}
          <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
            {/* Field lines */}
            <div className="w-48 h-48 rounded-full border border-white" />
            <div className="absolute w-24 h-36 border border-white" />
          </div>

          {/* Animated Cricket Field simulation */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-12 z-10 w-full justify-center">
            {/* Wickets */}
            <div className="flex gap-1 items-end opacity-80 h-10">
              <div className="w-1 h-8 bg-amber-200" />
              <div className="w-1 h-8 bg-amber-200" />
              <div className="w-1 h-8 bg-amber-200" />
            </div>

            {/* Simulated Animated Ball */}
            <motion.div 
              animate={{ 
                x: [-120, 0, 120], 
                y: [-10, -50, 20],
                scale: [0.5, 1.2, 0.4] 
              }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeOut" }}
              className="w-3 h-3 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 shadow-md shadow-red-500/80" 
            />

            {/* Glowing Cricket Bat */}
            <motion.div 
              animate={{ rotate: [0, -35, 15, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
              className="origin-bottom-left"
            >
              <div className="w-1.5 h-12 bg-gradient-to-b from-amber-400 to-amber-600 rounded-sm shadow-md" />
            </motion.div>
          </div>

          {/* Score overlay */}
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-sans font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow">BAN VS IND</span>
            <span className="text-[9px] font-sans text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 uppercase tracking-widest animate-pulse">● LIVE 4K</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-450 font-bold">BAN 158/4 (18.3)</span>
            <span className="text-[9px] font-mono text-slate-400">CRR: 8.54 • TBA: 12</span>
          </div>
        </div>
      )}

      {slide.sport === 'football' && (
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-green-950 to-neutral-950 flex flex-col justify-between p-3 overflow-hidden">
          {/* Pitch background line */}
          <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
            <div className="w-full h-[1px] bg-white absolute top-1/2" />
            <div className="w-24 h-24 rounded-full border border-white" />
          </div>

          {/* Simulated Animated Goal Post & Football */}
          <div className="absolute bottom-10 inset-x-0 flex items-center justify-center z-10">
            {/* Goal Net mockup */}
            <div className="relative w-40 h-20 border-2 border-b-0 border-white/60 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:6px_6px] flex items-center justify-center">
              {/* Flying Football */}
              <motion.div 
                animate={{ 
                  scale: [0.4, 1.4, 0.8], 
                  x: [-80, -30, 40],
                  y: [20, -15, 10],
                  rotate: [0, 360, 720]
                }}
                transition={{ repeat: Infinity, duration: 3.2, ease: "easeOut" }}
                className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[7px] font-black text-black select-none pointer-events-none shadow-md"
              >
                ⚽
              </motion.div>
            </div>
          </div>

          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-sans font-bold bg-sky-500 text-white px-2 py-0.5 rounded shadow">ARG VS BRA</span>
            <span className="text-[9px] font-sans text-rose-455 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 uppercase tracking-widest animate-pulse">● LIVE G1</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-450 font-bold">ARG 1 - 0 BRA</span>
            <span className="text-[10px] font-mono text-slate-400">22' (PR)</span>
          </div>
        </div>
      )}

      {slide.sport === 'news' && (
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950 via-slate-950 to-neutral-950 flex flex-col justify-between p-3 overflow-hidden">
          {/* Breaking News glowing bar layout */}
          <div className="absolute inset-y-12 left-0 right-0 bg-gradient-to-r from-red-600/30 to-rose-600/50 backdrop-blur-sm flex items-center p-2 z-10 border-y border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-2 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-yellow-300 tracking-wider">BREAKING NEWS</span>
              <span className="text-[10px] font-bold text-white leading-tight">সময় টিভি সরাসরি স্টুডিও সম্প্রচার</span>
            </div>
          </div>

          {/* Equalizer Visualizer Bars block */}
          <div className="absolute bottom-11 right-3 flex items-end gap-1 h-8 pointer-events-none z-10">
            {[1, 2, 3, 4, 5].map((bar) => (
              <motion.div
                key={bar}
                animate={{ height: ['15%', '85%', '40%', '95%', '15%'] }}
                transition={{ repeat: Infinity, duration: 1 + (bar * 0.15), ease: "easeInOut" }}
                className="w-1.5 bg-red-500 rounded-t shadow"
              />
            ))}
          </div>

          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-sans font-bold bg-rose-600 text-white px-2 py-0.5 rounded shadow">SOMOY NEWS</span>
            <span className="text-[9px] font-sans text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 uppercase tracking-widest animate-pulse">● LIVE FEED</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-amber-450 font-bold">গুরুত্বপূর্ণ আপডেটসমূহ</span>
            <span className="text-[9px] font-mono text-slate-400">Live 24h</span>
          </div>
        </div>
      )}

      {slide.sport === 'special' && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950 via-slate-950 to-neutral-950 flex flex-col justify-between p-3 overflow-hidden">
          {/* Animated Movie Projector spotlight cone */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18)_0%,transparent_75%)] pointer-events-none" />

          {/* Moving Cinema film rolls */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-30 z-10">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-[spin_8s_linear_infinite]" />
          </div>

          {/* Film block simulation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.6, 0.95, 0.6] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-center"
            >
              <p className="text-[24px]">🎬</p>
              <p className="text-[9px] font-bold text-amber-400 tracking-widest">STAR GOLD ACTION HD</p>
            </motion.div>
          </div>

          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-sans font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow">MOVIE SP</span>
            <span className="text-[9px] font-sans text-rose-450 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 uppercase tracking-widest animate-pulse">● PLAYING HD</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-200">K.G.F Chapter 2 HD</span>
            <span className="text-[9px] font-mono text-slate-400">720p BD</span>
          </div>
        </div>
      )}

      {/* Screen Overlay Play Circle overlay on hover */}
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-15 backdrop-blur-3xs">
        <div className="w-12 h-12 rounded-full bg-sky-500/90 flex items-center justify-center text-white shadow-xl transform scale-90 group-hover:scale-100 transition-all cursor-pointer">
          <Play className="w-6 h-6 fill-current text-white translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

interface LandingPageProps {
  onStartApp: () => void;
  onOpenLogin: () => void;
  onOpenAdmin: () => void;
  isLoggedIn: boolean;
  currentUser: { name: string; username: string; badge: string; avatar?: string } | null;
  onLogout: () => void;
  channels: Channel[];
  onTriggerUpdate: () => void;
  isUpdateBroadcastActive?: boolean;
}

export default function LandingPage({ 
  onStartApp, 
  onOpenLogin, 
  onOpenAdmin,
  isLoggedIn, 
  currentUser, 
  onLogout,
  channels = [],
  onTriggerUpdate,
  isUpdateBroadcastActive = false
}: LandingPageProps) {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const siteNameEnglish = localStorage.getItem('site_name_english') || 'Free World Cup BD';
  const siteNameBangla = localStorage.getItem('site_name_bangla') || 'বিডি লাইভ টিভি';

  // Auto rotate slide carousel interval
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % FEATURED_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % FEATURED_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + FEATURED_SLIDES.length) % FEATURED_SLIDES.length);
  };

  // Safe subset or full length of channels with standard logos for moving marquee
  const displayChannels = channels.length > 0 ? channels : [
    { id: '1', name: 'T Sports', logo: 'https://images.unsplash.com/photo-1540747737956-378724044453?w=80&fit=crop&q=60', group: 'Sports' },
    { id: '2', name: 'GTV Gazi TV', logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=80&fit=crop&q=60', group: 'Sports' },
    { id: '3', name: 'Somoy News', logo: 'https://images.unsplash.com/photo-1495020689067-958852a6565d?w=80&fit=crop&q=60', group: 'News' },
    { id: '4', name: 'Jamuna TV', logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=80&fit=crop&q=60', group: 'News' },
    { id: '5', name: 'Star Sports 1', logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=80&fit=crop&q=60', group: 'Sports' },
    { id: '6', name: 'Sony Ten 2', logo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=80&fit=crop&q=60', group: 'Sports' },
    { id: '7', name: 'Zee Bangla', logo: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=80&fit=crop&q=60', group: 'Other' },
    { id: '8', name: 'Nick BD', logo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80&fit=crop&q=60', group: 'Kids' }
  ];

  // Double array to secure seamless overflow transitions in CSS marquee tracks
  const marqueeList1 = [...displayChannels, ...displayChannels, ...displayChannels];
  const marqueeList2 = [...displayChannels].reverse().concat([...displayChannels].reverse());

  return (
    <div id="landing-page-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/35 selection:text-white relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950">
      
      {/* Decorative Grid Mesh Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Atmospheric Top Light Flares */}
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-sky-505/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-[10%] right-[15%] w-[350px] h-[350px] bg-indigo-605/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Sticky Header */}
      <header id="landing-header" className="sticky top-0 bg-slate-950/70 backdrop-blur-xl border-b border-slate-900/90 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-18 flex items-center justify-between">
          
          {/* Brand Logo with updated "Free World Cup BD" Header */}
          <div className="flex items-center gap-3 select-none cursor-pointer group" onClick={onStartApp}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-600 to-indigo-550 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Tv className="w-5.5 h-5.5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-md md:text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-205 to-sky-400 bg-clip-text text-transparent">
                  {siteNameEnglish}
                </span>
                <span className="text-[9px] font-sans font-black bg-rose-505/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md shadow uppercase tracking-wide animate-pulse">
                  লাইভ
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-sans tracking-wide">ফ্রি লাইভ স্পোর্টস ও টিভি পোর্টাল</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* Beautiful App update detection banner - only appears when broadcast active */}
            {isUpdateBroadcastActive && (
              <button
                id="btn-landing-check-update"
                onClick={onTriggerUpdate}
                title="নতুন সংস্করণ বা আপডেট চেক করুন"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 text-amber-400 text-2xs md:text-xs font-bold rounded-lg border border-amber-500/35 hover:border-amber-400 transition-all cursor-pointer shadow active:scale-95 group animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>আপডেট চেক</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </button>
            )}

            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                    <span className="text-[9px] font-sans font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded shadow">
                      {currentUser.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">@{currentUser.username}</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-550 to-indigo-500 p-0.5 shadow">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-bold text-[13px] text-sky-400">
                    {currentUser.avatar ? (
                      currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http') ? (
                        <img src={currentUser.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        currentUser.avatar.substring(0, 2).toUpperCase()
                      )
                    ) : (
                      currentUser.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                </div>
                <button
                  id="btn-landing-logout"
                  onClick={onLogout}
                  title="লগআউট"
                  className="p-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-900/30 transition-all cursor-pointer shadow"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-landing-login-trigger"
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-200 text-2xs md:text-xs font-bold rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden xs:inline">প্রবেশ করুন</span>
                <span className="xs:hidden">লগইন</span>
              </button>
            )}



            <button
              id="btn-nav-direct-stream"
              onClick={onStartApp}
              className="flex items-center gap-1.5 px-3 md:px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-505 hover:to-indigo-505 text-white text-2xs md:text-xs font-black rounded-lg transition-all shadow-lg active:scale-95 cursor-pointer shadow-indigo-950/20"
            >
              <Play className="w-3.5 h-3.5 fill-current text-white animate-bounce-short" />
              <span>প্লেয়ারে যান</span>
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 z-10 relative">
        <StatsDisplay />
      </section>

      {/* Hero & Logo Visual Block */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-6 flex flex-col items-center justify-center text-center relative z-10">
        
        {/* Glowing Badge Area linking Map logo */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <FreeWorldCupBDLogo className="w-36 h-36 md:w-44 md:h-44 hover:scale-103 transition-transform duration-300" />
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/60 border border-sky-500/20 shadow mt-2 text-[11px] font-semibold text-slate-200"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>সরাসরি সম্পুর্ণ ফ্রিতে ২০00+ বিশ্বখ্যাত লাইভ খেলাধুলা ও সকল টিভি চ্যানেল</span>
          </motion.div>
        </div>

        {/* Catchy Main Heading */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight text-white mb-5 font-sans">
          বাংলাদেশের নাম্বার ১ স্পোর্টস প্রিমিয়ার <br />
          <span className="bg-gradient-to-r from-sky-400 via-yellow-200 to-emerald-400 bg-clip-text text-transparent">
            {siteNameEnglish} Live TV
          </span>
        </h2>

        {/* Subtext description */}
        <p className="text-slate-400 text-xs md:text-base max-w-2xl leading-relaxed mb-8 font-sans">
          কোনো রকম বাফারিং ছাড়াই ফ্রিতে উপভোগ করুন ২০২৩ সালের টি-টোয়েন্টি বিশ্বকাপ, চ্যাম্পিয়নস ট্রফি, ফুটবল লিগ আর দেশী-বিদেশী সকল লাইভ টিভি চ্যানেল! স্পষ্ট ৪কে লাইভ ফিড ও তাৎক্ষণিক রিফ্রেশ ব্যাকআপ সাপোর্ট।
        </p>
      </section>

      {/* BIG SPORTS CAROUSEL CONTAINER ("লাইটারের মত সরাসরি করবে...") */}
      <section className="max-w-4xl w-full mx-auto px-4 md:px-6 pb-12 relative z-10 select-none">
        <div className="text-center md:text-left mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-450 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">চলতি স্পেশাল স্পোর্টস ও লাইভ কভারেজ (Carousel)</h3>
          </div>
          <div className="hidden md:flex gap-1">
            <button 
              onClick={handlePrevSlide}
              className="p-1 px-2.5 bg-slate-900 border border-slate-805 hover:bg-slate-800 rounded-lg text-slate-350 cursor-pointer active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleNextSlide}
              className="p-1 px-2.5 bg-slate-900 border border-slate-805 hover:bg-slate-800 rounded-lg text-slate-350 cursor-pointer active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Slide Display Panel */}
        <div className="relative overflow-hidden w-full rounded-2xl md:rounded-3xl border border-slate-800/80 shadow-2xl bg-slate-900">
          <AnimatePresence mode="wait">
            {FEATURED_SLIDES.map((slide, idx) => {
              if (idx !== activeSlide) return null;
              return (
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.45 }}
                  className={`bg-gradient-to-r ${slide.backdrop} p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between min-h-[220px] md:min-h-[260px] relative`}
                >
                  {/* Decorative Field Line details inside Carousel Card */}
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80 pointer-events-none" />
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/5 border-dashed hidden md:block" />

                  {/* Left Metadata Side */}
                  <div className="flex-1 relative z-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] md:text-[10px] font-sans font-bold bg-sky-502/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                          {slide.badge}
                        </span>
                        
                        <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-sans font-extrabold text-rose-450 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {slide.status}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wide">{slide.title}</h4>
                      <h5 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 mb-2 font-sans">
                        {slide.opponent}
                      </h5>
                    </div>

                    {/* Live score box ticker */}
                    <div className="bg-slate-950/70 backdrop-blur-md rounded-xl p-3 border border-slate-850 max-w-md shadow-inner mt-2">
                      <p className="text-amber-400 font-mono text-sm font-black tracking-tight flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>{slide.score}</span>
                      </p>
                      <p className="text-[11px] text-slate-300 font-medium font-sans mt-1">
                        📢 {slide.ticker}
                      </p>
                    </div>
                  </div>

                  {/* Right side Live TV play overlay featuring four corners display monitor style */}
                  <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
                    <BroadcastSimulatedScreen slide={slide} />
                    
                    <button
                      onClick={onStartApp}
                      className="mt-3 w-full px-5 py-2.5 bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-sky-950/20 cursor-pointer transform active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span>সরাসরি প্লেয়ারে দেখতে ক্লিক করুন</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Carousel slide indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {FEATURED_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`h-2 rounded-full cursor-pointer transition-all ${i === activeSlide ? 'w-6 bg-sky-500' : 'w-2 bg-slate-800 hover:bg-slate-700'}`}
            />
          ))}
        </div>
      </section>

      {/* QUICK CORE FEATURES HUB */}
      <section className="max-w-5xl w-full mx-auto px-4 md:px-6 pb-20 relative z-10">
        <div className="text-center mb-10">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">সর্বোত্তম খেলা সম্প্রচারের বিশেষ টেকনোলজিসমূহ</h3>
          <p className="text-slate-450 text-xs font-sans mt-1">Free World Cup BD প্ল্যাটফর্মের সেরা ৩টি মূল স্তম্ভ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 shadow-sm flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center mb-4">
                <Languages className="w-5.5 h-5.5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">রিয়েল-টাইম ফুটবল স্কোরবোর্ড</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                লাইভ খেলা দেখার স্ক্রিনেই সরাসরি চলমান ম্যাচের সর্বশেষ রান রেট, স্কোর এবং খেলার সময় দেখে নিন। আলাদা কোনো অ্যাপ বা সাইট চেক করা লাগবে না।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-sky-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
              প্লেয়ারে দেখুন &rarr;
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 shadow-sm flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-5.5 h-5.5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">মোবাইল অ্যাপ ফ্রেন্ডলি ফাস্ট বাফারিং</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                বিশেষভাবে লো-ব্যান্ডউইথ ব্যবহারকারীদের জন্য অপ্টিমাইজড প্লেয়ার। আপনার ৩জি, ৪জি বা যেকোনো ব্রডব্যান্ড লাইনে থাকবে জিরো-লেভেল লেটেন্সি সম্প্রচার।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
              প্লেয়ারে যান &rarr;
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 shadow-sm flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">স্থায়ী ফেভারিট ও ফেইল্ড চ্যানেল লিস্ট</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                যেকোনো সচল চ্যানেলকে সহজেই স্টার ক্লিক করে প্রিয় করুন। একবার প্রিয় করা চ্যানেলগুলো কিংবা অফলাইন ফেইল্ড চ্যানেলগুলো স্থায়ীভাবে আপনার আইডিতে সেভ থাকবে।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-amber-500 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
              প্লেয়ারে দেখুন &rarr;
            </div>
          </div>
        </div>
      </section>

      {/* CONTINUOUS DYNAMIC CHANNEL MARQUEES ("চ্যানেলগুলো যাওয়া আসা করবে...") */}
      <section className="bg-slate-950/60 border-t border-slate-900 py-6 overflow-hidden select-none relative z-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 mb-3 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2 text-slate-450">
          <Star className="w-4 h-4 text-sky-400 fill-sky-500/10" />
          <span className="text-xs font-bold uppercase tracking-widest font-sans">প্লেয়ার সচল আইপিটিভি লাইভ চ্যানেলসমূহ (Dynamic Shifting Track)</span>
        </div>

        {/* Track 1: Moving left to right */}
        <div className="flex overflow-hidden relative w-full h-15 gap-4 items-center">
          <div className="animate-marquee-fast flex items-center gap-4 shrink-0 min-w-full">
            {marqueeList1.map((ch, idx) => (
              <div 
                key={`${ch.id}-m1-${idx}`}
                onClick={onStartApp}
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-slate-805/75 rounded-xl text-xs hover:border-sky-500/40 hover:bg-slate-850 cursor-pointer transition-all shadow"
              >
                {ch.logo ? (
                  <img 
                    src={ch.logo} 
                    alt={ch.name} 
                    className="w-6 h-6 rounded-md object-cover border border-slate-800"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540747737956-378724044453?w=50';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-white text-[10px]">
                    {ch.name.slice(0, 2)}
                  </div>
                )}
                <span className="font-bold text-slate-100">{ch.name}</span>
                <span className="text-[9px] font-sans font-medium px-1.5 py-0.2 bg-slate-950 text-sky-400 rounded-md border border-slate-850">
                  {ch.group || 'Live'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Track 2: Reverse moving */}
        <div className="flex overflow-hidden relative w-full h-15 gap-4 items-center mt-2.5">
          <div className="animate-marquee-reverse-fast flex items-center gap-4 shrink-0 min-w-full">
            {marqueeList2.map((ch, idx) => (
              <div 
                key={`${ch.id}-m2-${idx}`}
                onClick={onStartApp}
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-slate-805/75 rounded-xl text-xs hover:border-sky-500/40 hover:bg-slate-850 cursor-pointer transition-all shadow"
              >
                {ch.logo ? (
                  <img 
                    src={ch.logo} 
                    alt={ch.name} 
                    className="w-6 h-6 rounded-md object-cover border border-slate-800"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540747737956-378724044453?w=50';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-white text-[10px]">
                    {ch.name.slice(0, 2)}
                  </div>
                )}
                <span className="font-bold text-slate-100">{ch.name}</span>
                <span className="text-[9px] font-sans font-medium px-1.5 py-0.2 bg-slate-950 text-indigo-400 rounded-md border border-slate-850">
                  {ch.group || 'Live'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styled Footer copyright statement */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 relative z-10 text-center text-slate-500 text-xs font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} {siteNameEnglish}. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex gap-4 text-slate-400">
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onStartApp}>টিভি প্লেয়ার</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onOpenLogin}>প্রাইভেসি</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onStartApp}>শর্তাবলী</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

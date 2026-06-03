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
    const fetchStats = () => {
      fetch('/api/stats')
        .then(res => {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Not OK or not JSON');
        })
        .then(setStats)
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 45000); // Poll every 45s instead of 10s to prevent rate limits
    return () => clearInterval(interval);
  }, []);                

  return (
    <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto px-1">
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-2 rounded-xl text-center shadow-lg">
        <span className="text-base md:text-xl font-black text-emerald-450 block">{stats.totalRegistrations}</span>
        <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-0.5 truncate">কালেকশন</span>
      </div>
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-2 rounded-xl text-center shadow-lg">
        <span className="text-base md:text-xl font-black text-teal-400 block">{stats.totalLogins}</span>
         <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-0.5 truncate">লগইন</span>
      </div>
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-2 rounded-xl text-center shadow-lg">
        <span className="text-base md:text-xl font-black text-sky-400 block">{stats.activeUsers}</span>
        <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-0.5 animate-pulse truncate select-none">অনলাইন</span>
      </div>
    </div>
  );
}

export function FreeWorldCupBDLogo({ className = "w-32 h-32" }: { className?: string }) {
  const customLogoUrl = localStorage.getItem('site_logo_url') || '';
  const siteNameBangla = localStorage.getItem('site_name_bangla') || 'ফ্রী ওয়ার্ল্ড কাপ বিডি';
  const siteNameEnglish = localStorage.getItem('site_name_english') || 'Free World Cup BD';

  if (customLogoUrl) {
    return (
      <div className={`relative flex items-center justify-center select-none ${className}`}>
        <img 
          src={customLogoUrl} 
          alt="Brand Logo" 
          referrerPolicy="no-referrer"
          className="w-[85%] h-[85%] rounded-full object-cover relative z-10 border border-emerald-400 shadow-lg shadow-emerald-500/20"
        />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* High-Fidelity SVG Replication of the User's Uploaded Logo */}
      <svg viewBox="0 0 450 450" className="w-full h-full filter drop-shadow-2xl">
        <defs>
          <radialGradient id="stadiumGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#020617" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="metalRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#0ea5e9" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="redPill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>

        {/* Stadium Lights & outer glow background */}
        <circle cx="225" cy="225" r="215" fill="url(#stadiumGlow)" />
        <circle cx="225" cy="225" r="210" fill="none" stroke="url(#metalRing)" strokeWidth="6" strokeDasharray="1400" />
        <circle cx="225" cy="225" r="202" fill="none" stroke="#1e293b" strokeWidth="2" />
        
        {/* Stadium Floodlights beams/dots on the sides */}
        {/* Left floodlights */}
        <g opacity="0.85" transform="translate(45, 120)">
          <rect x="-10" y="-10" width="40" height="25" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="0" cy="0" r="3" fill="#fff" />
          <circle cx="10" cy="0" r="3" fill="#fff" />
          <circle cx="20" cy="0" r="3" fill="#fff" />
          <circle cx="0" cy="8" r="3" fill="#fff" />
          <circle cx="10" cy="8" r="3" fill="#fff" />
          <circle cx="20" cy="8" r="3" fill="#fff" />
        </g>
        
        {/* Right floodlights */}
        <g opacity="0.85" transform="translate(365, 120)">
          <rect x="-10" y="-10" width="40" height="25" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="0" cy="0" r="3" fill="#fff" />
          <circle cx="10" cy="0" r="3" fill="#fff" />
          <circle cx="20" cy="0" r="3" fill="#fff" />
          <circle cx="0" cy="8" r="3" fill="#fff" />
          <circle cx="10" cy="8" r="3" fill="#fff" />
          <circle cx="20" cy="8" r="3" fill="#fff" />
        </g>

        {/* Bangladesh Map and flag aesthetics in the top right quadrant */}
        <path d="M 285,170 C 295,140 335,120 355,145 C 375,170 345,210 325,230 Z" fill="#15803d" opacity="0.30" />
        <circle cx="325" cy="175" r="25" fill="#ef4444" opacity="0.45" />

        {/* Stadium turf radial grass paths inside the ring */}
        <path d="M 85,320 L 365,320 C 345,390 285,410 225,410 C 165,410 105,390 85,320 Z" fill="#047857" opacity="0.25" />

        {/* Dynamic Stadium Strikers (Cricket and Football vectors) */}
        {/* Left Side: Cricket Batsman Silhouette */}
        <g fill="#10b981" opacity="0.9" transform="translate(70, 220) scale(0.7)">
          {/* Bat */}
          <path d="M 20,-10 L 45,-65 C 47,-69 51,-68 53,-65 C 55,-62 54,-58 51,-55 L 28,0 Z" fill="#fbbf24" />
          {/* Batsman body */}
          <circle cx="5" cy="-70" r="12" />
          <path d="M -5,-55 Q 10,-55 20,-45 L 25,-25 Q 5,-40 -10,-45 Q -25,-50 -20,-20 L -30,25" stroke="#10b981" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M -5,-50 L 5,-15 L 15,35" stroke="#10b981" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>

        {/* Right Side: Footballer Kicking a Ball Silhouette */}
        <g fill="#0ea5e9" opacity="0.9" transform="translate(380, 220) scale(0.7) scale(-1, 1)">
          <circle cx="5" cy="-70" r="12" />
          {/* Body */}
          <path d="M -10,-55 Q 10,-60 20,-40 L 45,-30 L 60,-5" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" fill="none" />
          {/* Legs */}
          <path d="M 5,-45 L -15,-20 L -5,25" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 5,-45 L 15,-10 L 35,5" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" fill="none" />
          {/* Ball */}
          <circle cx="65" cy="30" r="10" fill="#fff" />
          <circle cx="65" cy="30" r="10" stroke="#0f172a" strokeWidth="2.5" fill="none" />
        </g>

        {/* Central Core Circle (Channels Ring) */}
        <circle cx="225" cy="225" r="115" fill="#1e1b4b" opacity="0.4" stroke="#475569" strokeWidth="1" strokeDasharray="5" />
        {/* Globe contour at center */}
        <circle cx="225" cy="255" r="60" fill="#047857" opacity="0.25" />
        <ellipse cx="225" cy="255" rx="60" ry="20" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />
        <ellipse cx="225" cy="255" rx="20" ry="60" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />

        {/* Red Shield Banner: "সম্পূর্ণ ফ্রি" */}
        <g transform="translate(225, 60)">
          <path d="M -65,-14 H 65 V 10 Q 0,22 -65,10 Z" fill="url(#redPill)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))" />
          <text x="0" y="4" fill="#ffffff" fontSize="14" fontWeight="900" textAnchor="middle" letterSpacing="1" fontFamily="sans-serif">
            সম্পূর্ণ ফ্রি
          </text>
        </g>

        {/* Bold Title "বিডি লাইভ টিভি" & English "BD LIVE TV" */}
        <text 
          x="225" 
          y="135" 
          fill="#ffffff" 
          fontSize="36" 
          fontWeight="900" 
          textAnchor="middle" 
          filter="drop-shadow(0 3px 5px rgba(0,0,0,0.8))"
          fontFamily="system-ui, sans-serif"
        >
          {siteNameBangla}
        </text>

        <text 
          x="225" 
          y="172" 
          fill="url(#goldText)" 
          fontSize="19" 
          fontWeight="900" 
          letterSpacing="4" 
          textAnchor="middle" 
          fontFamily="monospace, sans-serif"
          filter="drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
        >
          {siteNameEnglish.toUpperCase()}
        </text>

        {/* Dial segmented channel logos (representative geometric dots) */}
        <g opacity="0.6">
          <circle cx="225" cy="255" r="45" fill="none" stroke="#334155" strokeWidth="3" />
          <circle cx="185" cy="235" r="8" fill="#ef4444" />
          <circle cx="265" cy="235" r="8" fill="#eab308" />
          <circle cx="225" cy="215" r="8" fill="#10b981" />
          <circle cx="195" cy="275" r="8" fill="#a855f7" />
          <circle cx="255" cy="275" r="8" fill="#0ea5e9" />
        </g>

        {/* Glowing Live beacon indicator */}
        <g transform="translate(160, 315)">
          <rect x="-10" y="-12" width="46" height="20" rx="6" fill="#ef4444" />
          <text x="13" y="2" fill="#fff" fontSize="10" stroke="none" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">LIVE</text>
          
          {/* Signal wave lines */}
          <path d="M -5,-2 Q -8,1 -5,4" stroke="#ff0" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M -2,-5 Q -6,1 -2,7" stroke="#ff0" strokeWidth="1.5" fill="none" />
        </g>

        {/* Bottom capsule: "সব খবর ও লাইভ খেলা একই অ্যাপে" */}
        <g transform="translate(225, 360)">
          <rect x="-115" y="-13" width="230" height="26" rx="13" fill="#1e3a8a" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="0" y="4" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="system-ui, sans-serif">
            সব খবর ও লাইভ খেলা একই অ্যাপে
          </text>
        </g>
      </svg>
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
    id: 'ch-jamuna',
    sport: 'news',
    title: 'যমুনা টেলিভিশন সরাসরি',
    opponent: 'বিশেষ টকশো ও লাইভ কভারেজ',
    status: 'সরাসরি সম্প্রচার',
    score: 'যমুনা স্পেশাল • ২৪/৭ লাইভ',
    ticker: 'সরাসরি সম্প্রচারিত হচ্ছে ঢাকা ও দেশের অন্য সকল প্রান্তের খবরাখবর।',
    backdrop: 'from-slate-900 via-amber-950/85 to-slate-950',
    channelName: 'Jamuna TV',
    channelId: 'jamuna',
    badge: 'ONLINE HD'
  },
  {
    id: 'ch-somoy',
    sport: 'news',
    title: 'সময় টেলিভিশন সরাসরি',
    opponent: 'জাতীয় ও আন্তর্জাতিক সংবাদ আপডেট',
    status: 'সরাসরি সম্প্রচার',
    score: 'সময় সংবাদ বুলেটিন • ব্রেকিং নিউজ',
    ticker: 'দেশের প্রথম সারির সংবাদ চ্যানেল সময় টিভিতে প্রতি মুহূর্তের সচল খবরসমূহ সরাসরি।',
    backdrop: 'from-slate-900 via-rose-950/85 to-slate-950',
    channelName: 'Somoy TV',
    channelId: 'somoy',
    badge: 'Live 24h'
  },
  {
    id: 'ch-tsports',
    sport: 'cricket',
    title: 'টি স্পোর্টস সচল লাইভ',
    opponent: 'বাংলাদেশ বনাম ভারত বিশেষ সিরিজ',
    status: 'চলমান লাইভ',
    score: 'BAN 164/5 (19.1) • IND (Batting Next)',
    ticker: 'টি স্পোর্টস এ দ্বিপাক্ষিক সিরিজ ও ক্রিকেট টুর্নামেন্ট সরাসরি সম্প্রচার।',
    backdrop: 'from-slate-900 via-emerald-950/85 to-slate-950',
    channelName: 'T Sports',
    channelId: 'tsports',
    badge: 'Live HD'
  },
  {
    id: 'ch-gtv',
    sport: 'football',
    title: 'জিটিভি স্পোর্টস লাইভ',
    opponent: 'আন্তর্জাতিক প্রীতি ম্যাচ লাইভ',
    status: 'লাইভ প্রথমার্ধ',
    score: 'ARG 1 - 0 BRA (22\')',
    ticker: 'গাজী টিভিতে লাইভ বিশ্বকাপ কোয়ালিফায়ার্স এবং ক্রীড়া উৎসব সরাসরি ফিড।',
    backdrop: 'from-slate-900 via-sky-950/85 to-slate-950',
    channelName: 'GTV',
    channelId: 'gtv',
    badge: 'Live 4K'
  }
];

// Beautiful Simulated Broadcast TV Screen with four corner borders showing sports dynamic play animations
export function BroadcastSimulatedScreen({ slide }: { slide: SlideShowEvent }) {
  return (
    <div className="relative w-full max-w-sm md:w-80 h-48 rounded-2xl bg-neutral-950 border-[4px] border-slate-850 shadow-2xl overflow-hidden group select-none">
      
      {/* Real physical glass glare gradient layer */}
      <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-20" />
      
      {/* TV Screen scanlines filter for high-end authentic premium feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] bg-[size:100%_4px,6px_100%] pointer-events-none z-20" />

      {/* Magnificent Neon Four-Corner Display Borders (as requested by user!) */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 z-30 animate-pulse" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 z-30 animate-pulse" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 z-30 animate-pulse" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 z-30 animate-pulse" />

      {/* Jamuna TV Live Simulation */}
      {slide.channelId === 'jamuna' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-amber-950/40 flex flex-col justify-between p-3 overflow-hidden">
          {/* Studio Backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute right-3 top-3 opacity-30 z-10 animate-spin" style={{ animationDuration: '20s' }}>
            <RefreshCw className="w-10 h-10 text-amber-500" />
          </div>

          {/* Jamuna TV Red/Gold Graphic */}
          <div className="flex justify-between items-start z-10">
            <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-amber-600 px-2.5 py-0.5 rounded text-white font-extrabold text-[10px] shadow">
              <span className="tracking-wide">JAMUNA TV</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </div>
            <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">● HD STREAM</span>
          </div>

          {/* News Studio visualization */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-90">
            <div className="text-center transform -translate-y-1">
              <p className="text-2xl animate-bounce" style={{ animationDuration: '3s' }}>🎙️</p>
              <p className="text-[10px] font-bold text-amber-300 font-sans tracking-widest mt-1">যমুনা স্পেশাল নিউজ ডেস্ক</p>
              <p className="text-[8px] text-slate-400 mt-0.5">সব খবর সবার আগে লাইভ</p>
            </div>
          </div>

          {/* Scrolling Marquee News Ticker in Bangla */}
          <div className="bg-slate-950/90 border border-slate-800 rounded p-1.5 z-10">
            <div className="w-full overflow-hidden whitespace-nowrap">
              <div className="inline-block animate-marquee-fast text-[8.5px] font-sans text-amber-400 font-black">
                *** যমুনা খবর লাইভ: বিশ্বকাপ ক্রিকেটে বাংলাদেশের দুর্দান্ত প্রস্তুতি ম্যাচ শুরু, ক্রিকেট ভক্তদের স্বতঃস্ফূর্ত উল্লাস...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Somoy News Live Simulation */}
      {slide.channelId === 'somoy' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-rose-950/40 flex flex-col justify-between p-3 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,transparent_70%)] pointer-events-none" />
          
          {/* Equalizer Wave bars at the center representing Studio Feed */}
          <div className="absolute bottom-11 right-3 flex items-end gap-1 h-6 pointer-events-none z-10">
            {[1, 2, 3, 4, 5].map((b) => (
              <motion.div
                key={b}
                animate={{ height: ['15%', '90%', '40%', '98%', '15%'] }}
                transition={{ repeat: Infinity, duration: 1.2 + (b * 0.12), ease: 'easeInOut' }}
                className="w-1 bg-red-500 rounded-t shadow"
              />
            ))}
          </div>

          <div className="flex justify-between items-start z-10">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-slate-900 px-2.5 py-0.5 rounded text-white font-extrabold text-[10.5px] shadow">
              <span>SOMOY NEWS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <span className="text-[8px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">● 7/24 DVB-T</span>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-90">
            <div className="text-center transform -translate-y-1">
              <p className="text-2xl animate-pulse">📺</p>
              <p className="text-[10px] font-bold text-red-00 font-sans tracking-widest mt-1">সময় সংবাদ লাইভ ফিড</p>
              <p className="text-[8px] text-slate-400 mt-0.5">জাতীয় বুলেটিন চলছে সরাসরি</p>
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded p-1.5 z-10">
            <div className="w-full overflow-hidden whitespace-nowrap">
              <div className="inline-block animate-marquee-fast text-[8.5px] font-sans text-rose-450 font-black">
                *** ব্রেকিং লাইভ: ঢাকা শহরের আবহাওয়া নিয়ে বিশেষ সংবাদ সম্মেলন সরাসরি সম্প্রচারিত তথ্য চিত্র...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* T Sports Cricket Live Simulation */}
      {slide.channelId === 'tsports' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-emerald-950/40 flex flex-col justify-between p-3 overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-white" />
            <div className="absolute w-24 h-36 border border-white" />
          </div>

          {/* Cricket Ball & Bat Animation */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-11 z-10 w-full justify-center">
            <div className="flex gap-0.5 items-end opacity-80 h-8">
              <div className="w-0.5 h-6 bg-amber-200" />
              <div className="w-0.5 h-6 bg-amber-200" />
              <div className="w-0.5 h-6 bg-amber-200" />
            </div>
            <motion.div 
              animate={{ 
                x: [-100, 0, 100], 
                y: [-5, -45, 15],
                scale: [0.5, 1.2, 0.4] 
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
              className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 shadow-md shadow-red-500/80" 
            />
            <motion.div animate={{ rotate: [0, -35, 15, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} className="origin-bottom-left">
              <div className="w-1 h-10 bg-amber-500 rounded-sm" />
            </motion.div>
          </div>

          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-extrabold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded shadow">T SPORTS LIVE</span>
            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">● 4K BROADCAST</span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded p-1.5 z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-450 font-black">BAN 164/5 (19.1)</span>
            <span className="text-[8.5px] font-mono text-slate-450">CRR: 8.58 • RRR: 10.2</span>
          </div>
        </div>
      )}

      {/* GTV Sports Live Simulation */}
      {slide.channelId === 'gtv' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-sky-950/40 flex flex-col justify-between p-3 overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center">
            <div className="w-full h-[1px] bg-white absolute top-1/2" />
            <div className="w-24 h-24 rounded-full border border-white" />
          </div>

          {/* Football Kick-net Animation */}
          <div className="absolute bottom-10 inset-x-0 flex items-center justify-center z-10">
            <div className="relative w-36 h-16 border border-b-0 border-white/40 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:5px_5px] flex items-center justify-center">
              <motion.div 
                animate={{ 
                  scale: [0.4, 1.4, 0.8], 
                  x: [-70, -20, 35],
                  y: [15, -10, 8],
                  rotate: [0, 360, 720]
                }}
                transition={{ repeat: Infinity, duration: 3.0, ease: "easeOut" }}
                className="w-3.5 h-3.5 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[6px] font-black"
              >
                ⚽
              </motion.div>
            </div>
          </div>

          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-extrabold bg-sky-500 text-white px-2 py-0.5 rounded shadow">GTV LIVE</span>
            <span className="text-[8px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-00/20">● 1080P Feed</span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded p-1.5 z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-sky-400 font-black">ARG 1 - 0 BRA</span>
            <span className="text-[8.5px] font-mono text-slate-450">2nd Half Play</span>
          </div>
        </div>
      )}

      {/* Screen Overlay Play Circle overlay on hover */}
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-15 backdrop-blur-3xs">
        <div className="w-12 h-12 rounded-full bg-emerald-500/90 flex items-center justify-center text-white shadow-xl transform scale-90 group-hover:scale-100 transition-all cursor-pointer">
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
  const siteNameBangla = localStorage.getItem('site_name_bangla') || 'ফ্রী ওয়ার্ল্ড কাপ বিডি';

  // Auto rotate slide carousel interval (Changing exactly every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % FEATURED_SLIDES.length);
    }, 5000);
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
    <div id="landing-page-root" className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 relative">
      
      {/* Container */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 overflow-x-hidden">
        
        {/* Floating Header */}
        <header id="landing-header" className="py-6 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer group shrink min-w-0" onClick={onStartApp}>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Tv className="w-5.5 h-5.5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base md:text-xl font-black text-white tracking-tighter block truncate">{siteNameEnglish}</span>
              <p className="text-[10px] md:text-xs text-emerald-400 font-semibold tracking-wide uppercase truncate">Free Live Platform</p>
            </div>
          </div>
          <motion.button 
            onClick={onStartApp}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 md:px-6 md:py-2.5 bg-white/5 hover:bg-white/10 text-white text-[11px] md:text-xs font-bold rounded-lg border border-white/10 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            GET STARTED
          </motion.button>
        </header>

        {/* Hero Section */}
        <section className="py-16 flex flex-col items-center text-center">
          <FreeWorldCupBDLogo className="w-32 h-32 mb-8 drop-shadow-2xl" />
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter">
             {siteNameEnglish}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
            লাইভ খেলাধুলা ও বাংলাদেশি টিভি চ্যানেল উপভোগের জন্য সবচেয়ে নির্ভরযোগ্য প্ল্যাটফর্ম। সব সময়, সবখানে — ফ্রিতে।
            <br />
            Enjoy 100% free live sports, cricket matches, and TV channels instantly. Secure, fast, and buffering-free.
          </p>
          
          <motion.button 
            onClick={onStartApp}
            whileHover={{ scale: 1.06, shadow: "0 0 25px rgba(16, 185, 129, 0.6)" }}
            whileTap={{ scale: 0.94 }}
            animate={{
              boxShadow: ["0 0 0 0 rgba(16,185,129,0.4)", "0 0 0 12px rgba(16,185,129,0)", "0 0 0 0 rgba(16,185,129,0)"],
            }}
            transition={{
              boxShadow: {
                repeat: Infinity,
                duration: 1.8,
                ease: "easeOut"
              }
            }}
            className="px-12 py-5 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-500 bg-[length:200%_auto] hover:bg-right text-white font-extrabold text-xl rounded-2xl shadow-xl shadow-emerald-950/50 transition-all cursor-pointer relative overflow-hidden group tracking-wider flex items-center gap-3"
          >
            <span className="relative z-10">GET STARTED</span>
            <Play className="w-5 h-5 text-white animate-pulse relative z-10 fill-current" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
          </motion.button>
          
          <div className="mt-12 w-full">
            <StatsDisplay />
          </div>
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
                      className="mt-3 w-full px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-emerald-950/20 cursor-pointer transform active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span>START WATCHING LIVE</span>
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
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">আমাদের সেরা মূল ৩টি টেকনোলজিসমূহ</h3>
          <p className="text-slate-450 text-xs font-sans mt-1">সবচেয়ে ফাস্ট ও সচল কভারেজ উপভোগ করুন</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Feature 1 - Slide from Left */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 shadow-sm flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center mb-4">
                <Languages className="w-5.5 h-5.5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">রিয়েল-টাইম স্কোরবোর্ড</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                লাইভ স্ক্রিনেই কোনো বাফারিং ছাড়াই প্রিয় দলগুলোর রানিং স্কোর আপডেট দেখে নিন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-sky-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
              প্লেয়ারে দেখুন &rarr;
            </div>
          </motion.div>

          {/* Feature 2 - Slide from Bottom */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 shadow-sm flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-5.5 h-5.5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">অপ্টিমাইজড ফাস্ট বাফারিং</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                যেকোনো ৩জি বা ৪জি ইন্টারনেট কানেকশনে জিরো লেটেন্সি ও হাই কোয়ালিটি স্পিড।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
              প্লেয়ারে যান &rarr;
            </div>
          </motion.div>

          {/* Feature 3 - Slide from Right */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 shadow-sm flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">স্থায়ী ফেভারিট লিস্ট</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                সহজেই যেকোনো সচল চ্যানেল সেভ করে আপনার অ্যাকাউন্টে প্রিয় তালিকায় রাখুন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-amber-500 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
              প্লেয়ারে দেখুন &rarr;
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION: PLATFORM RULES, DISCLOSURE & SECURITY GUARANTEES (আমাদের ওয়েবসাইট টা সত্য বলে দিয়ে দেন) */}
      <section className="max-w-5xl w-full mx-auto px-4 md:px-6 pb-20 relative z-10">
        <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-teal-950/20 border border-slate-800/80 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Left intro details - Slide from Left */}
            <motion.div 
              initial={{ opacity: 0, x: -70 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:w-1/3 shrink-0"
            >
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                নীতি ও সত্যতা
              </span>
              <h3 className="text-xl md:text-2xl font-black text-white mt-4 leading-tight">
                প্ল্যাটফর্মের সত্যতা ও <br />নিরাপত্তা নীতিমালা
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-3 leading-relaxed">
                Free World Cup BD একটি শতভাগ বিশ্বস্ত, নির্ভরযোগ্য এবং সম্পূর্ণ বাফারিং-ফ্রি উন্মুক্ত আইপিটিভি পোর্টাল।
              </p>
              <div className="mt-6 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5.5 h-5.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">SSL এনক্রিপ্টেড</p>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">সুরক্ষিত ভিডিও ট্রাফিক প্রোটোকল</p>
                </div>
              </div>
            </motion.div>

            {/* Right side checklist grid - Elements Slide in from Right */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              
              {/* Item 1 */}
              <motion.div 
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl"
              >
                <span className="text-amber-400 text-xs font-extrabold block">📡 সচল আইপিটিভি গ্যারান্টি</span>
                <p className="text-[11px] text-slate-300 font-semibold font-sans mt-1.5 leading-relaxed">
                  সবচেয়ে দ্রুতগতির লাইভ ফিড ও সচল সার্ভার নিশ্চিত করতে রিয়াল-টাইম রিকোয়েস্ট মনিটর করা হয়।
                </p>
              </motion.div>

              {/* Item 2 */}
              <motion.div 
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl"
              >
                <span className="text-emerald-400 text-xs font-extrabold block">🔐 ১০০% নিরাপদ সংযোগ</span>
                <p className="text-[11px] text-slate-300 font-semibold font-sans mt-1.5 leading-relaxed font-sans">
                  আমরা কোনো ব্যক্তিগত ডাটা সেভ করি না। আমাদের সকল কন্টেন্ট সম্পূর্ণ নিরাপদ।
                </p>
              </motion.div>

              {/* Item 3 */}
              <motion.div 
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl"
              >
                <span className="text-rose-400 text-xs font-extrabold block">❌ কোনো প্রতারণা বা পেমেন্ট নেই</span>
                <p className="text-[11px] text-slate-300 font-semibold font-sans mt-1.5 leading-relaxed">
                  কোনো বিরক্তিকর পপআপ অ্যাড ছাড়াই সম্পূর্ণ বিনামূল্যে সবসময় খেলা দেখতে পারবেন।
                </p>
              </motion.div>

              {/* Item 4 */}
              <motion.div 
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl"
              >
                <span className="text-sky-400 text-xs font-extrabold block">⚖️ ফেয়ার ইউজ ও কপিরাইট</span>
                <p className="text-[11px] text-slate-300 font-semibold font-sans mt-1.5 leading-relaxed">
                  আমরা ইন্টারনেট থেকে সংগৃহীত সোর্স দেখাই এবং চ্যানেল ওনারদের অনুরোধে যেকোনো ফিড অপসারণ করি।
                </p>
              </motion.div>

            </div>

          </div>
        </div>
      </section>

      {/* Closes the inner max-w-7xl layout container to allow marquee to span full-screen width */}
      </div>

      {/* CONTINUOUS DYNAMIC CHANNEL MARQUEES ("চ্যানেলগুলো যাওয়া আসা করবে...") */}
      <section className="bg-slate-950/60 border-t border-b border-slate-900 py-6 overflow-hidden select-none relative z-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 mb-3 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2 text-slate-450">
          <Star className="w-4 h-4 text-emerald-400 fill-emerald-500/10" />
          <span className="text-xs font-bold uppercase tracking-widest font-sans">প্লেয়ার সচল আইপিটিভি লাইভ চ্যানেলসমূহ (Dynamic Shifting Track)</span>
        </div>

        {/* Track 1: Moving left to right */}
        <div className="flex overflow-hidden relative w-full h-15 gap-4 items-center">
          <div className="animate-marquee-fast flex items-center gap-4 shrink-0 min-w-full">
            {marqueeList1.map((ch, idx) => (
              <div 
                key={`${ch.id}-m1-${idx}`}
                onClick={onStartApp}
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-slate-805/75 rounded-xl text-xs hover:border-emerald-500/40 hover:bg-slate-850 cursor-pointer transition-all shadow"
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
                <span className="text-[9px] font-sans font-medium px-1.5 py-0.2 bg-slate-950 text-emerald-400 rounded-md border border-slate-850">
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
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-slate-805/75 rounded-xl text-xs hover:border-emerald-500/40 hover:bg-slate-850 cursor-pointer transition-all shadow"
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
                <span className="text-[9px] font-sans font-medium px-1.5 py-0.2 bg-slate-950 text-teal-400 rounded-md border border-slate-850">
                  {ch.group || 'Live'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styled Footer copyright statement (rendered completely fluid outside the main grid body) */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 relative z-10 text-center text-slate-500 text-xs font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} {siteNameEnglish}. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex gap-4 text-slate-400">
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onStartApp}>GET STARTED</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onOpenLogin}>PRIVACY</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onStartApp}>TERMS</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

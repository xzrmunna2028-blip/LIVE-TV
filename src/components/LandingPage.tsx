/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Tv, 
  Sparkles, 
  Smartphone, 
  TrendingUp, 
  ShieldCheck, 
  Flame, 
  Languages, 
  Users, 
  Tv2, 
  Play, 
  Lock, 
  LogIn, 
  LogOut, 
  Laptop, 
  Heart, 
  Zap 
} from 'lucide-react';

interface LandingPageProps {
  onStartApp: () => void;
  onOpenLogin: () => void;
  isLoggedIn: boolean;
  currentUser: { name: string; username: string; badge: string } | null;
  onLogout: () => void;
  totalChannelsCount: number;
}

export default function LandingPage({ 
  onStartApp, 
  onOpenLogin, 
  isLoggedIn, 
  currentUser, 
  onLogout,
  totalChannelsCount
}: LandingPageProps) {
  return (
    <div id="landing-page-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/35 selection:text-white relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950">
      
      {/* Decorative Grid Mesh Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Atmospheric Top Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-sky-505/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-[10%] right-[15%] w-[350px] h-[350px] bg-violet-605/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Header */}
      <header id="landing-header" className="sticky top-0 bg-slate-950/70 backdrop-blur-xl border-b border-slate-900/90 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-18 flex items-center justify-between">
          
          {/* Stunning Brand Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-505 flex items-center justify-center shadow-lg shadow-sky-500/20 shadow-md">
              <Tv className="w-5.5 h-5.5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
                  BongoStream
                </span>
                <span className="text-[10px] font-sans font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md shadow uppercase tracking-widest scale-90 animate-pulse">
                  ফ্রি (FREE)
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-sans tracking-wide">স্মার্ট বাংলা আইপিটিভি পোর্টাল</p>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-3">
            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                    <span className="text-[9px] font-sans font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded shadow uppercase tracking-tight">
                      {currentUser.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">@{currentUser.username}</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 shadow-md">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-bold text-[13px] text-sky-400">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <button
                  id="btn-landing-logout"
                  onClick={onLogout}
                  title="লগআউট করুন"
                  className="p-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-900/30 transition-all cursor-pointer shadow"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-landing-login-trigger"
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow active:scale-95"
              >
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>লগইন / সাইন আপ</span>
              </button>
            )}

            <button
              id="btn-nav-direct-stream"
              onClick={onStartApp}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer shadow-indigo-950"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>টিভি দেখুন</span>
            </button>
          </div>
        </div>
      </header>

      {/* Epic Hero Section */}
      <section id="landing-hero" className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center relative z-10">
        
        {/* Dynamic Glowing Live Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/70 border border-sky-500/20 shadow-lg shadow-sky-950 mb-6 text-xs font-semibold text-slate-100"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-slate-350 tracking-wide font-sans">উচ্চগতিসম্পন্ন লাইভ টিভি সম্প্রচার</span>
        </motion.div>

        {/* Catchy Main Heading */}
        <motion.h2 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight text-white mb-6 font-sans"
        >
          বিনোদনের নতুন দিগন্ত <br />
          <span className="bg-gradient-to-r from-sky-400 via-emerald-350 to-indigo-400 bg-clip-text text-transparent">
            BongoStream Free Live TV
          </span>
        </motion.h2>

        {/* Clear Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-sm md:text-lg max-w-2xl leading-relaxed mb-10 font-sans"
        >
          এক জায়গায় উপভোগ করুন দেশী-বিদেশী {totalChannelsCount > 0 ? `${totalChannelsCount}টিরও বেশি` : '২২০০+'} সচল লাইভ টিভি চ্যানেল! স্পষ্ট এইচডি কোয়ালিটি, লাইভ বাংলা অনুবাদ সাবটাইটেল (CC), এবং ইনস্ট্যান্ট প্লেব্যাকের এক অভূতপূর্ব অভিজ্ঞতা।
        </motion.p>

        {/* Interactive Double CTA buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full justify-center"
        >
          <button
            id="btn-hero-glowing-cta"
            onClick={onStartApp}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-sky-500 via-sky-650 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold leading-none text-base shadow-xl shadow-sky-950 transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-sky-500/20"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>সরাসরি স্ট্রিমিং দেখুন</span>
          </button>

          {!isLoggedIn && (
            <button
              id="btn-hero-register"
              onClick={onOpenLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900 override-all hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-base transition-all duration-200 active:scale-95 cursor-pointer shadow-md"
            >
              <Zap className="w-4.5 h-4.5 text-emerald-450 animate-pulse" />
              <span>ফ্রি অ্যাকাউন্ট তৈরি করুন</span>
            </button>
          )}
        </motion.div>

        {/* Floating Metrics Highlights Block */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-4xl"
        >
          {[
            { value: totalChannelsCount > 0 ? `${totalChannelsCount}+` : '২,২০০+', label: 'সক্রিয় লাইভ চ্যানেল', icon: Tv2, color: 'text-sky-405' },
            { value: '৪কে / এইচডি', label: 'স্মার্ট রেজুলেশন', icon: Flame, color: 'text-amber-500' },
            { value: 'বাংলা CC', label: 'লাইভ অনুবাদ সাবটাইটেল', icon: Languages, color: 'text-indigo-400' },
            { value: '১ মিলি সেকেন্ড', label: 'ইনস্ট্যান্ট লোডিং স্পিড', icon: Zap, color: 'text-emerald-400' }
          ].map((item, index) => (
            <div 
              key={index} 
              className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-850 hover:border-slate-800 hover:bg-slate-900/95 transition-all text-center flex flex-col items-center group shadow-lg"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center mb-3 group-hover:bg-slate-900 transition-all">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <h4 className="text-xl md:text-2xl font-black font-sans tracking-tight text-white">{item.value}</h4>
              <p className="text-[11px] text-slate-400 font-sans font-medium mt-1 uppercase tracking-wide">{item.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Features Bento style Presentation */}
        <div className="mt-20 w-full text-left max-w-5xl">
          <div className="text-center mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">সবচেয়ে ফিচার-সমৃদ্ধ স্ট্রিমিং অ্যাপ্লিকেশন</h3>
            <p className="text-slate-450 text-xs md:text-sm font-sans mt-1.5">BongoStream এ ব্যবহারকারীদের সুবিধার্থেই তৈরি করা হয়েছে সর্বাধুনিক সব অপশন</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Box 1 */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 hover:border-slate-800 transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                  <Languages className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-base font-bold text-slate-100">বাংলা কো-অনুবাদ (CC Module)</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                  বিদেশী বা ইংরেজি চ্যানেলগুলোতে কী বলা হচ্ছে তা সহজে বুঝতে চালু করুন CC বাংলা সাবটাইটেল। লাইভ স্ক্রিনের নিচেই বড় অক্ষরে তাৎক্ষণিক অনুবাদ ভেসে উঠবে।
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
                প্লেয়ারে ট্রাই করুন &rarr;
              </div>
            </div>

            {/* Box 2 */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 hover:border-slate-800 transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div className="w-11 h-11 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center mb-4">
                  <Smartphone className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-base font-bold text-slate-100">রিস্পনসিভ মোবাইল ইন্টারফেস</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                  আপনার স্মার্টফোন, ট্যাবলেট কিংবা ল্যাপটপে স্বাচ্ছন্দ্যে ব্যবহারের জন্য সম্পূর্ণ রেসপনসিভ করে এটি ডিজাইন করা হয়েছে। মোবাইল ডাটাতেও থাকবে সুপার ফাস্ট বাফারিং।
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-sky-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
                লাইভ সম্প্রচার দেখুন &rarr;
              </div>
            </div>

            {/* Box 3 */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-850/80 hover:border-slate-800 transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-base font-bold text-slate-100">ফেইলড চ্যানেলের স্বয়ংক্রিয় ব্যাকআপ</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                  কোনো কারণে একটি চ্যানেল অফলাইন হয়ে গেলে এটি আলাদা ফেইল ফোল্ডারে জমা হয়। আপনি যেকোনো সময় ফেইল্ড থেকে ওই চ্যানেলটিতে ক্লিক করলেই প্লেয়ারটি অটো যাচাই করে সক্রিয় করে দিবে!
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-xs text-amber-500 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer" onClick={onStartApp}>
                লাইভ ব্যাকআপ দেখুন &rarr;
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Mini Simple Landing Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6 relative z-10 text-center text-slate-500 text-xs font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} BongoStream Free. সর্বস্বত্ব সংরক্ষিত।</p>
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

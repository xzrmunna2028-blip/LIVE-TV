/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Tv 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; username: string; badge: string }) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Status handlers
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handles Quick Fill Demo Account
  const handleQuickFill = () => {
    setLoginEmail('member@bongostream.live');
    setLoginPassword('bongo1234');
    setErrorMsg(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('সবগুলো ফিল্ড সঠিকভাবে পূরণ করুন!');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Simulate real auth validation safely
      if (loginEmail.includes('@') && loginPassword.length >= 4) {
        let displayName = 'ফ্রি ইউজার';
        if (loginEmail === 'member@bongostream.live') {
          displayName = 'বঙ্গ মেম্বার (Bongo Member)';
        } else {
          displayName = loginEmail.split('@')[0];
        }

        setSuccessMsg('লগইন সফল হয়েছে! বঙ্গস্ট্রিমে আপনাকে স্বাগতম।');
        
        setTimeout(() => {
          onLoginSuccess({
            name: displayName,
            username: loginEmail.toLowerCase().split('@')[0],
            badge: 'Free Member'
          });
          onClose();
        }, 1500);
      } else {
        setErrorMsg('ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
    }, 1000);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('দয়া করে নাম, ইমেল এবং পাসওয়ার্ড ফিল্ডসমূহ পূরণ করুন!');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg('অ্যাকউন্ট তৈরি সফল হয়েছে! স্বয়ংক্রিয়ভাবে প্রবেশ করানো হচ্ছে...');
      
      setTimeout(() => {
        onLoginSuccess({
          name: regName,
          username: regEmail.split('@')[0],
          badge: 'Free Member'
        });
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-99 flex items-center justify-center p-4">
      
      {/* Centered glassmorphic card container with motion */}
      <div 
        id="auth-modal-box" 
        className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
      >
        {/* Design Highlight Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Box */}
        <div className="p-6 md:p-8">
          
          {/* Header branding */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
              <Tv className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight uppercase">BongoStream</span>
              <p className="text-[10px] text-emerald-400 font-sans tracking-tight font-bold">১০০% ফ্রি অ্যাকাউন্ট পোর্টাল</p>
            </div>
          </div>

          {/* Form Tabs Selection */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850/60 mb-6">
            <button
              id="tab-auth-select-login"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none
                ${activeTab === 'login' 
                  ? 'bg-slate-900 text-sky-400 font-bold border border-slate-800' 
                  : 'text-slate-450 hover:text-slate-205'
                }
              `}
            >
              লগইন (Sign In)
            </button>
            <button
              id="tab-auth-select-signup"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none
                ${activeTab === 'signup' 
                  ? 'bg-slate-900 text-sky-400 font-bold border border-slate-800' 
                  : 'text-slate-450 hover:text-slate-205'
                }
              `}
            >
              রেজিস্ট্রেশন (Sign Up)
            </button>
          </div>

          {/* Success Alerts */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs font-sans font-medium leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Error Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-450">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs font-sans font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Tab 1: Login Form */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 font-sans">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350">আপনার ইমেইল এড্রেস</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500/50 rounded-lg text-xs text-slate-200 outline-none"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350">সিকিউর অ্যাকাউন্ট পাসওয়ার্ড</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500/50 rounded-lg text-xs text-slate-200 outline-none"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Quick Fill Suggestion Container */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850/60 mt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-sky-400 block tracking-tight">ডিমো এক্সেস চেক করুন</span>
                    <span className="text-[9px] text-slate-400 block font-sans mt-0.5">টাইপ ছাড়াই টেস্ট ইউজার দিয়ে এখনই লগইন করুন</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="px-2.5 py-1.5 bg-sky-600/10 hover:bg-sky-600 text-[10px] font-bold text-sky-405 hover:text-white border border-sky-500/20 hover:border-sky-500 rounded-lg transition-all cursor-pointer"
                  >
                    Preset Fill
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'প্রবেশ করা হচ্ছে...' : 'লগইন সম্পন্ন করুন'}
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          ) : (
            /* Tab 2: Signup Form */
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5 font-sans">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350">আপনার নাম</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="যেমনঃ রাজিব আহমেদ"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500/50 rounded-lg text-xs text-slate-200 outline-none"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350">ইমেইল এড্রেস</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="razib@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500/50 rounded-lg text-xs text-slate-200 outline-none"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350">নিরাপত্তা পাসওয়ার্ড</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="পাসওয়ার্ড দিন"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500/50 rounded-lg text-xs text-slate-200 outline-none"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'প্রসেসিং হচ্ছে...' : 'রেজিস্ট্রেশন সম্পূর্ণ করুন'}
                {!loading && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              </button>
            </form>
          )}

          {/* Safety terms notice */}
          <div className="mt-6 text-center">
            <span className="text-[10px] text-slate-500">
              নিরাপদ এনক্রিপশন প্রটোকল দ্বারা সেশনটি পরিচালিত হচ্ছে।
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}

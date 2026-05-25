/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  User, 
  Send, 
  ExternalLink, 
  Camera, 
  Check, 
  ShieldCheck, 
  Info 
} from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { 
    name: string; 
    username: string; 
    badge: string; 
    phone?: string; 
    avatar?: string; 
    flag?: string; 
  } | null;
  onSave: (newName: string, newAvatar: string) => void;
}

const PRESET_DEMO_AVATARS = [
  {
    name: 'Free World Cup BD Indigo (B)',
    value: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230284c7" /><stop offset="100%" stop-color="%236366f1" /></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(%23g1)" /><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="950" font-size="64" fill="%23ffffff">B</text></svg>`
  },
  {
    name: 'VIP Green (G)',
    value: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981" /><stop offset="100%" stop-color="%23059669" /></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(%23g2)" /><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="950" font-size="64" fill="%23ffffff">G</text></svg>`
  },
  {
    name: 'Crown Amber (VIP)',
    value: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23eab308" /><stop offset="100%" stop-color="%23ca8a04" /></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(%23g3)" /><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="950" font-size="52" fill="%230f172a">★</text></svg>`
  }
];

export default function ProfileEditModal({ isOpen, onClose, currentUser, onSave }: ProfileEditModalProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setAvatar(currentUser.avatar || PRESET_DEMO_AVATARS[0].value);
    }
  }, [currentUser, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('ফাইলের আকার ২ মেগাবাইটের বেশি হতে পারবে না!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('দয়া করে আপনার নাম প্রদান করুন!');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave(name.trim(), avatar);
      setSuccessMsg('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
    }, 800);
  };

  if (!isOpen || !currentUser) return null;

  return (
    <div id="profile-edit-modal-overlay" className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-99 flex items-center justify-center p-4">
      <div 
        id="profile-edit-modal-box" 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col select-none animate-fade-in"
      >
        {/* Color stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-sky-500 to-indigo-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Headline */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center">
              <Camera className="w-4.5 h-4.5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-widest">প্রোফাইল সেটিংস</h3>
              <p className="text-[10px] text-amber-400 tracking-wider font-sans font-extrabold">EDIT VIP PROFILE</p>
            </div>
          </div>

          {/* Success / Error Banners */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium font-sans">
              ✓ {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium font-sans">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {/* Live Profile photo preview and upload actions */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4">
              <div className="relative shrink-0">
                {avatar.startsWith('data:') || avatar.startsWith('http') ? (
                  <img 
                    src={avatar} 
                    alt="Current Avatar" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md" 
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center text-white text-lg font-bold">
                    {avatar || name.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1 border border-slate-950">
                  <Sparkles className="w-2.5 h-2.5 text-slate-950" />
                </div>
              </div>

              <div className="flex-1 text-left">
                <span className="text-[9.5px] font-bold text-slate-400 block mb-1.5">আপনার প্রোফাইল ফটো পরিবর্তন করুন:</span>
                
                <div className="flex flex-wrap gap-1.5">
                  <label className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[8.5px] text-sky-400 hover:text-white font-black rounded-md cursor-pointer transition-all active:scale-95 flex items-center gap-1">
                    <span>📁 নতুন ছবি দিন</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>

                  {PRESET_DEMO_AVATARS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(p.value)}
                      className={`px-1.5 py-1 rounded-md border text-[8.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-all active:scale-95
                        ${avatar === p.value 
                          ? 'border-amber-400/40 bg-amber-500/10 text-amber-400' 
                          : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-350'
                        }
                      `}
                    >
                      <span>ডিফল্ট {i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* User display name edit field */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>আপনার পূর্ণ নাম পরিবর্তন করুন:</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="নাম লিখুন..."
                maxLength={25}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-amber-405 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition-colors"
                required
              />
            </div>

            {/* Telegram update channel promotion as requested ("এবং এটা লগিং পেজেও থাকবে প্লাস আমাদের ড্যাশবোরেও থাকবে") */}
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl select-none text-left flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-400">
                <Send className="w-3 h-3 text-sky-400 animate-pulse rotate-45 shrink-0" />
                <span>Join Official Telegram APK Channel</span>
              </div>
              <p className="text-[9px] text-slate-450 leading-relaxed font-sans">
                সাইটের সকল আপডেট, বাফারিং ফিক্স, নতুন সার্ভার রিলিজ ও ফাস্ট এপিকে (APK) ডাউনলোড লিঙ্ক পেতে আমাদের টেলিগ্রাম পরিবারে যুক্ত হন।
              </p>
              <a 
                href="https://t.me/FIFAWorldCupbd1" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 bg-sky-600/10 hover:bg-sky-600 text-sky-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all text-center border border-sky-500/10 justify-center"
              >
                <span>📁 টেলিগ্রাম গ্রুপে এখনই যুক্ত হোন</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 text-xs font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 text-center"
              >
                বাতিল করুন
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 hover:brightness-110 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                {!saving && <Check className="w-3.5 h-3.5 text-slate-950" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, User, Clock, CheckCircle, AlertTriangle, Send, 
  Image as ImageIcon, Trash2, ShieldCheck, Power, Search, RefreshCw, X
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Message {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  time: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'audio';
  createdAt?: string;
}

interface SupportSession {
  id: string;
  username: string;
  name: string;
  problem: string;
  status: 'pending' | 'accepted' | 'closed';
  lastMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: Message[];
}

export default function AdminSupportPanel() {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'closed'>('all');
  const [supportEnabled, setSupportEnabled] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null); // base64
  const [isSending, setIsSending] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Gemini Diagnostics State
  const [geminiStatus, setGeminiStatus] = useState<{ status: string; message: string } | null>(null);
  const [checkingGemini, setCheckingGemini] = useState(false);

  const checkGeminiStatus = () => {
    setCheckingGemini(true);
    fetch('/api/support/gemini-status')
      .then(res => res.json())
      .then(data => {
        setGeminiStatus(data);
        setCheckingGemini(false);
      })
      .catch(err => {
        setGeminiStatus({ status: 'error', message: err?.message || String(err) });
        setCheckingGemini(false);
      });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Connect real-time ticket sessions from Firestore
  useEffect(() => {
    const q = collection(db, "support");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets: SupportSession[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        tickets.push({
          id: docSnap.id,
          username: data.username || '',
          name: data.name || '',
          problem: data.problem || '',
          status: data.status || 'pending',
          lastMessage: data.lastMessage || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || ''
        });
      });

      // Sort by updatedAt descending, fallback to id
      tickets.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });

      setSessions(tickets);
    }, (err) => {
      console.warn("Firestore sessions index sync error:", err);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch global live support availability status on load
  useEffect(() => {
    fetch('/api/support/status')
      .then(res => res.json())
      .then(data => {
        if (typeof data.supportEnabled === 'boolean') {
          setSupportEnabled(data.supportEnabled);
        }
      })
      .catch(err => console.error("Error loaded support availability status:", err));

    checkGeminiStatus();
  }, []);

  // 3. Connect real-time chat messages for selected session
  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setMessages([]);
      return;
    }

    const active = sessions.find(s => s.id === selectedSessionId);
    if (active) {
      setSelectedSession(active);
    }

    const messagesRef = collection(db, "support", selectedSessionId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveMsgs: Message[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        liveMsgs.push({
          id: docSnap.id,
          sender: data.sender || '',
          senderName: data.senderName || '',
          text: data.text || '',
          time: data.time || '',
          attachmentUrl: data.attachmentUrl || undefined,
          attachmentType: data.attachmentType || undefined,
          createdAt: data.createdAt || ''
        });
      });
      setMessages(liveMsgs);
    }, (err) => {
      console.warn("Firestore message feed connection error:", err);
    });

    return () => unsubscribe();
  }, [selectedSessionId, sessions]);

  // Scroll to bottom when messages load
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle Support Agent Availability Online/Offline
  const handleToggleSupportStatus = () => {
    setIsTogglingStatus(true);
    const nextStatus = !supportEnabled;

    fetch('/api/support/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supportEnabled: nextStatus })
    })
      .then(res => res.json())
      .then(data => {
        setSupportEnabled(data.supportEnabled);
        setIsTogglingStatus(false);
        alert(`সাপোর্ট সার্ভিস সফলভাবে ${nextStatus ? 'অনলাইন (সচল)' : 'অফলাইন (বন্ধ)'} করা হয়েছে!`);
      })
      .catch(err => {
        console.error(err);
        setIsTogglingStatus(false);
      });
  };

  // Convert image select to base64 encoding
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('সীমাবদ্ধতা: ফাইল ৪ মেগাবাইটের কম সাইজের হতে হবে।');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReplyImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Admin support message reply
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || (!replyText.trim() && !replyImage)) return;

    setIsSending(true);
    const textToSend = replyText.trim();
    const imageToSend = replyImage;

    setReplyText('');
    setReplyImage(null);

    // Call REST endpoint to save session metadata & trigger auto log updates
    fetch('/api/support/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedSessionId,
        sender: 'support_agent',
        senderName: 'এডমিন সাপোর্ট',
        text: textToSend || 'একটি ফটো সংযুক্তি পাঠানো হয়েছে।',
        attachmentUrl: imageToSend || undefined,
        attachmentType: imageToSend ? 'image' : undefined
      })
    })
      .then(res => res.json())
      .then(() => {
        // Post directly to Firestore collection to force real-time user refresh
        const messageId = `msg_agent_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        setDoc(doc(db, "support", selectedSessionId, "messages", messageId), {
          sender: 'support_agent',
          senderName: 'এডমিন সাপোর্ট',
          text: textToSend || 'একটি ফটো সংযুক্তি পাঠানো হয়েছে।',
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          attachmentUrl: imageToSend || null,
          attachmentType: imageToSend ? 'image' : null,
          createdAt: new Date().toISOString()
        })
          .then(() => {
            // Update lastMessage metadata in session
            setDoc(doc(db, "support", selectedSessionId), {
              lastMessage: textToSend || '📷 ইমেজ পাঠানো হয়েছে',
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(err => console.warn(err));
            
            setIsSending(false);
          })
          .catch(err => {
            console.error(err);
            setIsSending(false);
          });
      })
      .catch(err => {
        console.error(err);
        setIsSending(false);
      });
  };

  // Accept/Activate ticket session
  const handleAcceptTicket = () => {
    if (!selectedSessionId) return;

    fetch('/api/support/sessions/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedSessionId })
    })
      .then(res => res.json())
      .then(() => {
        // Sync to Firestore status
        setDoc(doc(db, "support", selectedSessionId), {
          status: 'accepted',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn(err));

        // Post system notification to Firestore
        const sysMsgId = `msg_sys_accept_${Date.now()}`;
        setDoc(doc(db, "support", selectedSessionId, "messages", sysMsgId), {
          sender: 'system',
          senderName: 'সিস্টেম নোটিশ',
          text: 'আপনার অ্যাকাউন্ট এজেন্টের সাথে কানেক্ট হয়েছে, অনুগ্রহ করে আপনার সমস্যা তুলে ধরুন। আমাদের এজেন্ট সাহায্য করতে প্রস্তুত আছেন।',
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString()
        }).catch(err => console.warn(err));
      })
      .catch(err => console.error(err));
  };

  // Close ticket session
  const handleCloseTicket = () => {
    if (!selectedSessionId) return;

    fetch('/api/support/sessions/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedSessionId })
    })
      .then(res => res.json())
      .then(() => {
        // Sync to Firestore status
        setDoc(doc(db, "support", selectedSessionId), {
          status: 'closed',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn(err));

        // Post system notification to Firestore
        const sysMsgId = `msg_sys_close_${Date.now()}`;
        setDoc(doc(db, "support", selectedSessionId, "messages", sysMsgId), {
          sender: 'system',
          senderName: 'সিস্টেম নোটিশ',
          text: 'এই সাপোর্ট চ্যাট সেশনটি এডমিন বা এজেন্টের অনুরোধে সফলভাবে ক্লোজড করা হয়েছে। ধন্যবাদ!',
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString()
        }).catch(err => console.warn(err));
      })
      .catch(err => console.error(err));
  };

  // Filtering & Searches queries
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.problem.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && session.status === statusFilter;
  });

  // Calculate stats for badge count
  const pendingCount = sessions.filter(s => s.status === 'pending').length;
  const acceptedCount = sessions.filter(s => s.status === 'accepted').length;

  return (
    <div className="flex flex-col h-[580px] md:h-[620px] bg-slate-950/20 rounded-2xl overflow-hidden text-slate-100 font-sans">
      
      {/* Top action header: Status indicator & toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 border-b border-slate-800/80 px-5 py-4 select-none shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-lg">
              <MessageSquare className="w-5 h-5 text-sky-400 animate-pulse" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-slate-900 ${
              supportEnabled ? 'bg-emerald-500 animate-bounce' : 'bg-rose-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-200">হেল্পডেস্ক লাইভ টিকেট ম্যানেজার</h4>
              {geminiStatus && (
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                  geminiStatus.status === 'ok' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-450 text-rose-400 animate-pulse'
                }`}>
                  {geminiStatus.status === 'ok' ? '🤖 জেমিনি সচল' : '⚠️ জেমিনি নিষ্ক্রিয়'}
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5 flex items-center gap-1">
              {supportEnabled ? (
                <span className="text-emerald-400 font-semibold tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  অনলাইন হেল্প ডেক চালু আছে
                </span>
              ) : (
                <span className="text-rose-450 font-semibold tracking-wider flex items-center gap-1 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-550 shrink-0" />
                  মেম্বারদের চ্যাট সার্ভিস বন্ধ আছে
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Global Support availability power toggle switcher */}
        <div className="flex items-center gap-2">
          {geminiStatus && geminiStatus.status !== 'ok' && (
            <button
              onClick={checkGeminiStatus}
              disabled={checkingGemini}
              title="এআই স্ট্যাটাস রি-চেক করুন"
              className="p-2 py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl cursor-pointer active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingGemini ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={handleToggleSupportStatus}
            disabled={isTogglingStatus}
            className={`px-3.5 py-2 cursor-pointer rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 ${
              supportEnabled 
                ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-500/20' 
                : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{supportEnabled ? '🔴 হেল্পডেস্ক অফলাইন করুন' : '🟢 হেল্পডেস্ক অনলাইন করুন'}</span>
          </button>
        </div>
      </div>

      {/* Gemini Diagnostics Banner if issue found */}
      {geminiStatus && geminiStatus.status !== 'ok' && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs select-none">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-450 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
            <p className="leading-relaxed text-slate-300">
              <strong className="font-extrabold text-amber-400">জেমিনি এআই সার্ভিস সতর্কবার্তা:</strong> আপনার জেমিনি API Key-টি গুগলের সিকিউরিটি ব্লকলিস্টে পড়েছে! অনুগ্রহ করে সোর্স কোডের <strong>Secrets setup</strong> বা <strong>settings (⚙️) panel</strong> এ নতুন সচল API Key সেভ করুন।
              <span className="block text-[10px] text-slate-500 mt-0.5 select-all font-mono">ত্রুটি বার্তা: {geminiStatus.message}</span>
            </p>
          </div>
          <button 
            onClick={checkGeminiStatus} 
            disabled={checkingGemini} 
            className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-305 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/15 cursor-pointer leading-none transition-all select-none self-end sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${checkingGemini ? 'animate-spin' : ''}`} />
            রি-চেক করুন
          </button>
        </div>
      )}

      {/* Main split work area */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-950/40">
        
        {/* Left Side: Ticket index stream list */}
        <div className="w-full md:w-80 shrink-0 border-r border-slate-900 flex flex-col min-h-0">
          
          {/* Quick Find Search box */}
          <div className="p-3 bg-slate-900/40 border-b border-slate-900 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="টিকেট রিসিভার বা নাম দিয়ে খুঁজুন..."
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl pl-9 pr-3 py-2 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Tab buttons for ticket filters */}
          <div className="p-2 gap-1 bg-slate-950/30 border-b border-slate-900 shrink-0 grid grid-cols-4 select-none">
            {[
              { id: 'all', label: 'সবাই' },
              { id: 'pending', label: 'পেন্ডিং', count: pendingCount },
              { id: 'accepted', label: 'চলমান', count: acceptedCount },
              { id: 'closed', label: 'ক্লোজড' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`py-1.5 px-1 relative rounded-lg font-bold text-[9px] uppercase tracking-tight text-center cursor-pointer transition-colors ${
                  statusFilter === tab.id 
                    ? 'bg-slate-900 text-sky-400 font-extrabold border border-slate-800' 
                    : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] text-white flex items-center justify-center font-extrabold ${
                    tab.id === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-sky-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Ticket stream */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {filteredSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-600 text-[11px] select-none">
                কোনো সাপোর্ট টিকিট পাওয়া যায়নি।
              </div>
            ) : (
              filteredSessions.map(session => {
                const isActive = selectedSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3 rounded-xl border block transition-all relative ${
                      isActive 
                        ? 'bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/30 shadow-indigo-950/10' 
                        : 'bg-slate-900/40 hover:bg-slate-900 border-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-100 truncate max-w-[140px]">{session.name}</span>
                      
                      {/* Ticket Status Label Pill */}
                      {session.status === 'pending' && (
                        <span className="text-[8px] font-black tracking-wider uppercase text-amber-550 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">পেন্ডিং</span>
                      )}
                      {session.status === 'accepted' && (
                        <span className="text-[8px] font-black tracking-wider uppercase text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">সক্রিয়</span>
                      )}
                      {session.status === 'closed' && (
                        <span className="text-[8px] font-black tracking-wider uppercase text-slate-500 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded">ক্লোজড</span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 truncate mb-1 bg-slate-950/45 px-2 py-1 rounded font-sans border border-slate-900/50">
                      📋 {session.problem}
                    </p>

                    <p className="text-[9px] text-slate-500 italic truncate tracking-wide">
                      💬 {session.lastMessage || 'সাপোর্ট চ্যাট রুমে সেশন চলছে...'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation window */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-950/20">
          {!selectedSessionId ? (
            /* Empty state selection alert */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-slate-950/10">
              <div className="w-14 h-14 rounded-2xl bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-500 mb-4 animate-bounce">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h5 className="text-slate-300 font-extrabold text-sm mb-1">কমিউনিকেশনস সেন্টার</h5>
              <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed">
                রিয়েল-টাইম বার্তা আদান-প্রদান করতে এবং গ্রাহকদের সরাসরি সাহায্য কাস্টমাইজ করতে বাম দিকের যেকোনো একটি সাপোর্ট টিকিট চয়ন করুন।
              </p>
            </div>
          ) : (
            /* Active select thread viewer */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              
              {/* Conver header details & ticket actions */}
              <div className="px-5 py-3.5 bg-slate-900/40 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-black text-slate-100">{selectedSession?.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">(@{selectedSession?.username})</span>
                  </div>
                  <span className="text-[9px] block text-sky-400 font-sans mt-1">🌿 চিহ্নিত ত্রুটি: {selectedSession?.problem}</span>
                </div>

                {/* Ticket session action triggers */}
                <div className="flex items-center gap-1.5">
                  {selectedSession?.status !== 'accepted' && (
                    <button
                      onClick={handleAcceptTicket}
                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-extrabold text-[9px] tracking-wide rounded-lg uppercase cursor-pointer"
                    >
                      ✓ একসেপ্ট করুন
                    </button>
                  )}
                  
                  {selectedSession?.status !== 'closed' && (
                    <button
                      onClick={handleCloseTicket}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/30 font-extrabold text-[9px] tracking-wide rounded-lg uppercase cursor-pointer"
                    >
                      ✕ টিকেট বন্ধ করুন
                    </button>
                  )}
                </div>
              </div>

              {/* Message scroll log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/5 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-600 text-xs italic select-none">
                    নতুন টিকিট সেশন শুরু হয়েছে। বার্তা পাঠানো বা আসার প্রতীক্ষা করুন...
                  </div>
                ) : (
                  messages.map(msg => {
                    const isSystem = msg.sender === 'system';
                    const isMe = msg.sender === 'admin' || msg.sender === 'support_agent';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center select-none text-center py-1">
                          <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 rounded-lg max-w-sm leading-normal">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[8px] text-slate-500 font-bold mb-0.5 select-none px-1">
                            {msg.senderName}
                          </span>

                          <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow border ${
                            isMe 
                              ? 'bg-sky-500/10 border-sky-500/20 text-sky-300 rounded-tr-none' 
                              : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                            
                            {/* Attachment display */}
                            {msg.attachmentUrl && msg.attachmentType === 'image' && (
                              <div className="mb-1.5 bg-black/20 border border-black/40 rounded-xl overflow-hidden max-h-44 flex items-center justify-center">
                                <img
                                  src={msg.attachmentUrl}
                                  alt="Payload image"
                                  className="object-contain max-h-44 max-w-full cursor-pointer hover:opacity-95"
                                  onClick={() => setZoomedImage(msg.attachmentUrl || null)}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            <p className="break-words leading-relaxed">{msg.text}</p>
                          </div>
                          
                          <span className="text-[8px] text-slate-650 mt-1 select-none font-mono text-slate-500 px-1">{msg.time}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Bot reply box drafting panel */}
              <div className="p-3 bg-slate-900 p-3 bg-slate-950/80 border-t border-slate-900 shrink-0">
                
                {/* Draft thumbnail attachment preview */}
                {replyImage && (
                  <div className="mb-2.5 p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded border border-slate-805 overflow-hidden bg-black/10 flex items-center justify-center shrink-0">
                        <img src={replyImage} alt="Draft" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-[10px] text-slate-450 font-sans italic font-medium leading-none text-slate-400">মেসেজের সাথে ছবি বা স্ক্রিনশট যুক্ত হয়েছে</span>
                    </div>
                    <button
                      onClick={() => setReplyImage(null)}
                      className="p-1 px-2 text-[10px] bg-red-950 hover:bg-red-900 text-red-400 font-extrabold rounded-lg cursor-pointer transition-colors"
                    >
                      ✕ মুছুন
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                  
                  {/* Select file dialog hidden toggle */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Attachment image trigger */}
                  <button
                    type="button"
                    title="ফটো সংযুক্ত করুন"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-450 hover:text-slate-300 rounded-xl cursor-pointer transition-colors transition-all active:scale-95"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                  </button>

                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="আপনার বার্তাটি টাইপ করুন..."
                    className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!replyText.trim() && !replyImage)}
                    className="p-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow-lg cursor-pointer transition-colors active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">পাঠান</span>
                  </button>
                </form>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Internal popup zoomer modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center p-4 font-sans" 
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Expanded view" 
              className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl border border-slate-800" 
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setZoomedImage(null)} 
              className="absolute -top-12 right-0 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full p-2 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

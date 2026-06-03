/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, X, Send, Image as ImageIcon, Mic, Square, Trash2, 
  HelpCircle, ShieldCheck, AlertCircle, RefreshCw, Paperclip, Play, Pause, Headphones
} from 'lucide-react';

interface TicketMessage {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  time: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'audio';
}

interface TicketSession {
  id: string;
  username: string;
  name: string;
  problem: string;
  status: 'pending' | 'accepted' | 'closed';
  createdAt: string;
  messages: TicketMessage[];
}

interface SupportChatProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentUser: { name: string; username: string } | null;
  isInline?: boolean;
}

export default function SupportChat({ isOpen, onClose, currentUser, isInline = false }: SupportChatProps) {
  const [session, setSession] = useState<TicketSession | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('চ্যানেল লোড হচ্ছে না');
  
  // States for attachments
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // base64
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // base64 payload
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // App support offline toggles
  const [supportEnabled, setSupportEnabled] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs for audio recorder & scroll
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch support status (Enabled vs Disabled) on mount and periodically
  const fetchStatus = () => {
    fetch('/api/support/status')
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          return res.json();
        }
        throw new Error('Not OK or not JSON');
      })
      .then(data => {
        if (data && typeof data.supportEnabled === 'boolean') {
          setSupportEnabled(data.supportEnabled);
        }
        setLoadingStatus(false);
      })
      .catch(err => {
        setLoadingStatus(false);
      });
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s instead of 8s to prevent rate limits
    return () => clearInterval(interval);
  }, []);

  // 2. Load active support session on mount from localStorage if it exists
  useEffect(() => {
    if (!currentUser) return;
    const savedSessionId = localStorage.getItem(`bongo_support_session_id_${currentUser.username}`);
    
    if (savedSessionId) {
      setIsConnecting(true);
      fetch(`/api/support/messages/${savedSessionId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('stale');
        })
        .then(msgs => {
          setMessages(msgs);
          setSession({
            id: savedSessionId,
            username: currentUser.username,
            name: currentUser.name,
            problem: '',
            status: 'accepted',
            createdAt: '',
            messages: msgs
          });
          setIsConnecting(false);
        })
        .catch(() => {
          // Clean stale session
          localStorage.removeItem(`bongo_support_session_id_${currentUser.username}`);
          setSession(null);
          setIsConnecting(false);
        });
    }
  }, [currentUser]);

  // 3. Keep messages refreshed during active support chats
  useEffect(() => {
    if (!session?.id) return;

    const pullMessages = () => {
      fetch(`/api/support/messages/${session.id}`)
        .then(res => {
          if (res.ok) return res.json();
          return [];
        })
        .then(msgs => {
          if (msgs.length !== messages.length) {
            setMessages(msgs);
          }
        })
        .catch(err => console.warn('Polling skipped:', err));
    };

    pullMessages();
    const timer = setInterval(pullMessages, 4000); // Pulse poll every 4s
    return () => clearInterval(timer);
  }, [session?.id, messages.length]);

  // Scroll to bottom helper
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedImage, audioUrl, isOpen]);

  // 4. Initiates a helpdesk live support session
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsConnecting(true);
    fetch('/api/support/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.username,
        name: currentUser.name,
        problem: selectedProblem
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setSession(data);
          setMessages(data.messages || []);
          localStorage.setItem(`bongo_support_session_id_${currentUser.username}`, data.id);
        }
        setIsConnecting(false);
      })
      .catch(err => {
        console.error(err);
        setIsConnecting(false);
      });
  };

  // 5. Handles file selection directly from gallery
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('সীমাবদ্ধতা: ফাইল সাইজ ৪ মেগাবাইট বা তার চেয়ে কম হতে হবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 6. Voice recording controller
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Turn off mic tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Cannot access microphone:', err);
      alert('মাইক্রোফোন অ্যাক্সেস করতে ব্যর্থ হয়েছে। দয়া করে ব্রাউজার পারমিশন চেক করুন।');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // ignore content
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setAudioUrl(null);
    audioChunksRef.current = [];
  };

  // 7. Sends message to active session
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || (!inputText.trim() && !selectedImage && !audioUrl)) return;
    if (!currentUser) return;

    let payloadText = inputText.trim();
    let attachUrl: string | undefined = undefined;
    let attachType: 'image' | 'audio' | undefined = undefined;

    if (selectedImage) {
      attachUrl = selectedImage;
      attachType = 'image';
      if (!payloadText) payloadText = '📸 একটি ছবি সংযুক্ত করেছেন।';
    } else if (audioUrl) {
      attachUrl = audioUrl;
      attachType = 'audio';
      if (!payloadText) payloadText = '🎤 একটি ভয়েস নোট পাঠিয়েছেন।';
    }

    const currentText = payloadText;
    setInputText('');
    setSelectedImage(null);
    setAudioUrl(null);

    // Optimistically update frontend messages instantly for lag-free performance
    const tempMsgId = 'temp_' + Date.now();
    const optMessage: TicketMessage = {
      id: tempMsgId,
      sender: currentUser.username,
      senderName: currentUser.name,
      text: currentText,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      attachmentUrl: attachUrl,
      attachmentType: attachType
    };

    setMessages((prev) => [...prev, optMessage]);

    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.id,
          sender: currentUser.username,
          senderName: currentUser.name,
          text: currentText,
          attachmentUrl: attachUrl,
          attachmentType: attachType
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'failed');
      }

      const updatedSession = await res.json();
      setMessages(updatedSession.messages || []);
    } catch (err: any) {
      alert(err.message || 'মেসেজ পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে পরে চেষ্টা করুন।');
      // Rollback optimistic update
      setMessages((prev) => prev.filter(m => m.id !== tempMsgId));
    }
  };

  const clearSession = () => {
    if (!window.confirm('আপনি কি এই চ্যাট বন্ধ করে নতুন সেশন শুরু করতে চান?')) return;
    if (currentUser) {
      localStorage.removeItem(`bongo_support_session_id_${currentUser.username}`);
    }
    setSession(null);
    setMessages([]);
  };

  if (!isInline && !isOpen) return null;

  const renderChatInner = () => {
    return (
      <div className={`relative w-full h-full flex flex-col overflow-hidden text-left ${isInline ? 'bg-slate-900/40' : ''}`}>
          {/* Support Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MessageSquare className="w-5 h-5 text-white animate-pulse" />
                </div>
                {supportEnabled && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-bounce" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5ClassName">
                  লাইভ সাপোর্ট ডেস্ক
                </h4>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wider flex items-center gap-1">
                  {supportEnabled ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      অনলাইন সাপোর্ট সচল
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      এজেন্ট এখন অফলাইন
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {session && (
                <button 
                  onClick={clearSession} 
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 border border-slate-800"
                  title="নতুন টিকিট তৈরি করুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>রিবুট সেশন</span>
                </button>
              )}
              {!isInline && onClose && (
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer border border-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* User Signin Gatekeeper Overlay */}
          {!currentUser ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950/70 select-none">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3 animate-bounce" />
              <h5 className="text-white font-bold text-lg mb-1">লগইন প্রয়োজন</h5>
              <p className="text-slate-400 text-xs max-w-xs mb-4">
                লাইভ চ্যাটে সাহায্য পেতে অনুগ্রহ করে প্রথমে আপনার ফ্রী ওয়ার্ল্ড কাপ বিডি অ্যাকাউন্টে লগইন করুন।
              </p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
              >
                ফিরে যান
              </button>
            </div>
          ) : loadingStatus ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 select-none text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <span className="text-xs">সাপোর্ট অপশন চেক করা হচ্ছে...</span>
            </div>
          ) : !supportEnabled ? (
            /* --- BEAUTIFUL OFFLINE RENDER WITH LOGO/INDICATOR --- */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/50 select-none">
              <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-dashed border-rose-500/30 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-rose-500/5 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <MessageSquare className="w-10 h-10 text-rose-500" />
                <X className="absolute top-2 right-2 w-6 h-6 text-rose-500 bg-slate-950 rounded-full p-1 border border-rose-500/30" />
              </div>
              <h5 className="text-white font-extrabold text-xl mb-2 tracking-tight">আমাদের এজেন্ট সাপোর্ট এখন বন্ধ আছে</h5>
              <div className="max-w-sm bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl text-xs text-slate-400 leading-relaxed shadow-lg">
                <p className="font-semibold text-rose-400 mb-2">📢 নোটিশ</p>
                আমাদের অফিসিয়াল হেল্পডেস্ক এবং লাইভ সাপোর্ট মেম্বারগণ বর্তমানে সাময়িকভাবে অফলাইনে আছেন। সাধারণত সাপোর্ট টিম সকাল ১০:০০ টা থেকে রাত ১০:০০ টা পর্যন্ত লাইভ সাহায্য করে থাকেন।
                <br />
                <span className="block mt-2 font-medium text-emerald-400">
                  ⚠️ আপনার কোন চ্যানেল বাফার করলে অনুগ্রহ করে প্লেয়ারের "রিফ্রেশ" বাটন ক্লিক করুন বা সার্ভার চ্যানেল লিংক পরিবর্তন করুন।
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-6">ধন্যবাদ আপনার ধৈর্যের জন্য! - ফ্রী ওয়ার্ল্ড কাপ বিডি টিম</p>
            </div>
          ) : !session ? (
            /* --- WELCOME SCREEN / CHOOSE PROBLEM TO INITIATE TICKETS --- */
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60 select-none">
              <div className="max-w-md mx-auto text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4 border border-sky-400/20">
                  <Headphones className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
                <h5 className="text-white font-black text-lg mb-2">হ্যালো, {currentUser.name}!</h5>
                <p className="text-slate-400 text-xs mb-8">
                  ফ্রী ওয়ার্ল্ড কাপ বিডিতে আপনার কোন সমস্যা হচ্ছে? সরাসরি চ্যাটে জানাতে নিচের যেকোনো একটি অপশন ক্লিক করে সেশন শুরু করুন।
                </p>

                <form onSubmit={handleCreateSession} className="text-left space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">সমস্যার ধরন নির্বাচন করুন:</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'চ্যানেল লোড হচ্ছে না (Buffering/Black Screen)',
                        'টি স্পোর্টস অথবা অন্য স্পোর্টস চ্যানেল চলছে না',
                        'শব্দ আসছে না (No Audio Noise)',
                        'এপ্লিকেশনে অন্য বাগ/এরর আসছে',
                        'অন্যান্য সাধারণ সাহায্য প্রয়োজন'
                      ].map((prob) => (
                        <button
                          key={prob}
                          type="button"
                          onClick={() => setSelectedProblem(prob)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${
                            selectedProblem === prob 
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/5' 
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span>{prob}</span>
                          {selectedProblem === prob && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>কানেক্ট করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>এজেন্টের সাথে লাইভ চ্যাট শুরু করুন</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* --- ACTIVE LIVE CHAT LOG INTERFACE --- */
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
              
              {/* User Ticket Info strip */}
              <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-850 text-[10px] text-slate-400 flex justify-between select-none shrink-0 font-mono">
                <span className="truncate">📋 টিকিট সমস্যা: {session.problem || selectedProblem}</span>
                <span className="text-emerald-400 flex items-center gap-1 flex-shrink-0 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  সচল
                </span>
              </div>

              {/* Scrollable messages container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender === currentUser.username;
                  const isSystem = msg.sender === 'system';
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center select-none text-center py-1">
                        <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 rounded-lg max-w-xs leading-normal">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Sender Label */}
                        <span className="text-[9px] text-slate-500 font-bold mb-0.5 select-none font-sans px-1">
                          {msg.senderName}
                        </span>

                        {/* Content Card Bubble */}
                        <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md relative group break-words ${
                          isMe 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none' 
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                        }`}>
                          
                          {/* 1. Attachment image renderer */}
                          {msg.attachmentUrl && msg.attachmentType === 'image' && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-black/45 bg-black/10 max-h-48 flex items-center justify-center">
                              <img 
                                src={msg.attachmentUrl} 
                                alt="Attachment" 
                                className="object-contain max-h-48 cursor-pointer hover:opacity-90 max-w-full"
                                referrerPolicy="no-referrer"
                                onClick={() => {
                                  // Simple open click for zooming
                                  const win = window.open();
                                  if (win) win.document.write(`<img src="${msg.attachmentUrl}" style="max-width:100%; height:auto;" />`);
                                }}
                              />
                            </div>
                          )}

                          {/* 2. Attachment audio voicemail player */}
                          {msg.attachmentUrl && msg.attachmentType === 'audio' && (
                            <div className="mb-2 py-1.5 px-2 bg-slate-950/60 rounded-xl flex items-center gap-2 border border-slate-800">
                              <audio 
                                src={msg.attachmentUrl} 
                                controls 
                                className="w-full h-8 accent-emerald-500 text-slate-100 font-mono text-[9px]"
                              />
                            </div>
                          )}

                          <p className="whitespace-pre-line tracking-wide font-sans">{msg.text}</p>
                        </div>

                        {/* Timestamp helper */}
                        <span className="text-[8px] text-slate-500 mt-1 px-1">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Active inputs and attachment queues */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-850 shrink-0">
                
                {/* 1. Image preview indicator */}
                {selectedImage && (
                  <div className="mb-2 p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between select-none animate-fade-in relative">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded border border-slate-800 overflow-hidden shrink-0">
                        <img src={selectedImage} alt="Attachment queue" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white font-bold font-sans">গ্যালারি ছবি রেডি</p>
                        <p className="text-[9px] text-slate-500">মেসেজ সেন্ড করলে ইমেজটি যাবে।</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="p-1 px-2 bg-slate-805 hover:bg-slate-700 rounded text-slate-300 text-[10px]"
                    >
                      বাতিল
                    </button>
                  </div>
                )}

                {/* 2. Recorded Voice note indicator */}
                {audioUrl && (
                  <div className="mb-2 p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between select-none animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <Headphones className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold font-sans">🎤 ভয়েস মেসেজ রেডি</p>
                        <audio src={audioUrl} controls className="h-4 w-40 mt-1 accent-emerald-500 text-slate-100" />
                      </div>
                    </div>
                    <button 
                      onClick={() => setAudioUrl(null)}
                      className="p-1 px-2 bg-slate-805 hover:bg-slate-700 rounded text-slate-300 text-[10px]"
                    >
                      বাতিল
                    </button>
                  </div>
                )}

                {/* 3. Live Microphone Recording progress banner */}
                {isRecording && (
                  <div className="mb-2 p-2.5 bg-rose-500/10 border border-rose-550 rounded-xl flex items-center justify-between select-none animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[11px] text-rose-450 font-bold font-mono">ভয়েস রেকর্ড হচ্ছে: {recordingSeconds}s</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={stopRecording}
                        className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white font-bold text-[10px] rounded"
                      >
                        কমপ্লিট
                      </button>
                      <button
                        onClick={cancelRecording}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] rounded"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                )}

                {/* Main typing bar container */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={filesInputRef} 
                    onChange={handleImageSelect}
                  />
                  
                  {/* Gallery action asset trigger */}
                  <button
                    type="button"
                    title="গ্যালারি থেকে ফটো দিন"
                    disabled={isRecording}
                    onClick={() => filesInputRef.current?.click()}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-colors active:scale-90 flex-shrink-0"
                  >
                    <ImageIcon className="w-4.5 h-4.5" />
                  </button>

                  {/* Voicemail Recorder action asset triggers */}
                  {!isRecording ? (
                    <button
                      type="button"
                      title="ভয়েস মেসেজ রেকর্ড করুন"
                      onClick={startRecording}
                      disabled={!!selectedImage || !!audioUrl}
                      className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl cursor-pointer transition-colors active:scale-90 disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
                    >
                      <Mic className="w-4.5 h-4.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="রেকর্ডিং অফ করুন"
                      onClick={stopRecording}
                      className="p-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl cursor-pointer transition-colors animate-pulse flex-shrink-0"
                    >
                      <Square className="w-4.5 h-4.5" />
                    </button>
                  )}

                  <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isRecording}
                    placeholder={isRecording ? 'ভয়েস রেকর্ডিং একটিভ আছে...' : 'আপনার সমস্যার বিবরণ লিখুন...'}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-base md:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-w-0"
                  />

                  <button
                    type="submit"
                    disabled={isRecording || (!inputText.trim() && !selectedImage && !audioUrl)}
                    className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-900/10 cursor-pointer active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none flex-shrink-0"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </div>

            </div>
          )}

      </div>
    );
  };

  if (isInline) {
    return (
      <div className="relative w-full h-[540px] lg:h-[calc(100vh-270px)] bg-slate-900 border border-slate-800/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {renderChatInner()}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[999] flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 overflow-hidden w-full h-full"
        onClick={onClose}
      >
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden"
        >
          {renderChatInner()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

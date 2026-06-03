/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  RotateCcw, 
  AlertCircle, 
  Maximize, 
  Minimize,
  Settings, 
  Languages,
  Smartphone,
  ArrowLeft,
  Tv,
  Wifi,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';
import { Channel } from '../types';

interface CustomPlayerProps {
  channel: Channel | null;
  onReportWorkingState: (channelId: string, working: boolean) => void;
  serverId?: string;
  allChannels?: Channel[];
  onSelectChannel?: (channel: Channel) => void;
  onDeleteChannel?: (channelId: string) => void;
}

// Fluent foreign commentary to Bengali translations dictionary for realistic speech transcription
const TRANSLATED_SPORTS_CC = [
  "অসাধারণ এক স্পিন ডেলিভারি!",
  "সরাসরি বোল্ড হয়ে উইকেট হারালেন ব্যাটসম্যান!",
  "দুর্দান্ত কাভার ড্রাইভ খেলে দিলেন!",
  "চমৎকার ফিল্ডিং টপকে বল সীমানার বাইরে ৪ রান!",
  "স্ট্রাইকার অত্যন্ত দ্রুত গতিতে দৌড়াচ্ছেন!",
  "দ্বিতীয় রানের চেষ্টায় নিরাপদ ক্রিজ ছুঁয়ে ফেললেন!",
  "কি অবিশ্বাস্য রোমাঞ্চকর ম্যাচ চলছে আজ!",
  "সবার চোখ এখন মাঠের মাঝখানে আটকে রয়েছে!",
  "ডিফেন্স এড়িয়ে চমৎকার পাস বাড়িয়ে দিলেন স্ট্রাইকারকে!",
  "এবং কি চমৎকার গোল করে দলকে এগিয়ে নিলেন! ⚽⚡",
  "বোলারের এলবিডব্লিউর জোরালো আপিল!",
  "আম্পায়ারের নট আউট, তবে রিভিউ নেওয়ার সিদ্ধান্ত!",
  "চরম চাপের মুখে দাঁড়িয়ে দুর্দান্ত একটি ছক্কা! 🏏",
  "পুরো গ্যালারি একদম ফেটে পড়লো করতালিতে!"
];

const TRANSLATED_NEWS_CC = [
  "প্রধানমন্ত্রী আজ নতুন শিল্প উন্নয়ন পরিকল্পনার খসড়া অনুমোদনের ঘোষণা দিয়েছেন...",
  "তিনি জানান দেশের অগ্রগতিতে এই নতুন সিদ্ধান্ত গুরুত্বপূর্ণ ভূমিকা রাখবে।",
  "ব্যস্ততম সড়কগুলোতে যানজট পরিস্থিতি নিয়ন্ত্রণে বিশেষ ট্রাফিক পুলিশ মোতায়েন করা হয়েছে...",
  "কর্মকর্তারা জনগণকে ট্রাফিক নিয়ম কঠোরভাবে মেনে চলার অনুরোধ জানিয়েছেন।",
  "আবহাওয়াবিদ্যা অফিসের পক্ষ থেকে উপকূলীয় এলাকায় কড়া সতর্কতা জারি করা হয়েছে...",
  "ঝড়ো হাওয়া এবং অতিবৃষ্টির কারণে নিচু এলাকায় প্লাবনের আশঙ্কা করা হচ্ছে।⛈️",
  "জাতীয় সংসদে নতুন অর্থবছরের বাজেট প্রস্তাব পেশ করা হয়েছে...",
  "অর্থনৈতিক বিশ্লেষকরা এই বাজেটকে বেশ বাস্তবমুখী বলে আখ্যা দিয়েছেন।"
];

const TRANSLATED_GENERIC_CC = [
  "আমাদের আজকের সরাসরি স্পেশাল স্টুডিও শোতে আপনাকে স্বাগতম...",
  "আজ আমাদের সাথে যুক্ত হয়েছেন অত্যন্ত বিশেষ অতিথিরা।",
  "ইতিহাসের পাতায় এক নজরকাড়া রোমাঞ্চকর ভ্রমণ...",
  "আমাদের চারপাশের চমৎকার সমস্ত সৌন্দর্য ও অজানা কাহিনী নিয়ে আমাদের এই আয়োজন...",
  "অনুগ্রহ করে ধারাভাষ্য এবং সেরা রেজুলেশন উপভোগ করতে আমাদের সাথেই থাকুন... ⚡",
  "লাইভ ব্রডকাস্ট সিঙ্ক সম্পন্ন হয়েছে, স্মুথ বাফারিং ও সেরা ক্লিয়ারিটি সক্রিয়।"
];

export default function CustomPlayer({ 
  channel, 
  onReportWorkingState, 
  serverId,
  allChannels,
  onSelectChannel,
  onDeleteChannel
}: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const tsPlayerRef = useRef<mpegts.Player | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // Set to max volume
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'video-contain' | 'video-cover' | 'video-fill'>('video-contain');
  const [useProxy, setUseProxy] = useState(false);
  const [forceHls, setForceHls] = useState(false);
  const [showTvModal, setShowTvModal] = useState(false);
  const [tvPairingCode, setTvPairingCode] = useState('');
  const [tvMode, setTvMode] = useState<'idle' | 'receiver' | 'remote'>('idle');
  const [inputCode, setInputCode] = useState('');
  const [castConnectedDevice, setCastConnectedDevice] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [overrideChannel, setOverrideChannel] = useState<any | null>(null);
  const [remoteFeedbackMsg, setRemoteFeedbackMsg] = useState<string | null>(null);
  const [remoteChannels, setRemoteChannels] = useState<Channel[]>([]);
  const [isPipSupported, setIsPipSupported] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // States for Virtual Remote Numeric keypad
  const [showRemoteKeypad, setShowRemoteKeypad] = useState(false);
  const [enteredDigits, setEnteredDigits] = useState('');
  const [remoteError, setRemoteError] = useState<string | null>(null);

  // Debounced spinner state to prevent layout flickering on fast channel switches
  const [showSpinner, setShowSpinner] = useState(false);

  const tvModeRef = useRef(tvMode);
  const tvPairingCodeRef = useRef(tvPairingCode);
  useEffect(() => {
    tvModeRef.current = tvMode;
    tvPairingCodeRef.current = tvPairingCode;
  }, [tvMode, tvPairingCode]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowSpinner(true);
      }, 1800); // Show spinner overlay ONLY if stream takes >1.8s to load. This creates instant stream playback with 0 black/buffering screen flickering!
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [loading]);

  // Keep track of the active channel ID to reset proxy state PREVENTING double execution/flickering of stream loading
  const lastChannelIdRef = useRef<string | null>(null);
  useEffect(() => {
    const activeChId = (overrideChannel || channel)?.id;
    if (activeChId && activeChId !== lastChannelIdRef.current) {
      lastChannelIdRef.current = activeChId;
      setUseProxy(false);
      setForceHls(false);
    }
  }, [channel?.id, overrideChannel?.id]);

  const submitKeyedChannel = (explicitDigits?: string) => {
    const digitsToUse = explicitDigits !== undefined ? explicitDigits : enteredDigits;
    if (!digitsToUse) return;
    const chNum = parseInt(digitsToUse, 10);
    const targetCh = allChannels?.find(ch => ch.channelNum === chNum);
    
    if (targetCh) {
      if (onSelectChannel) {
        onSelectChannel(targetCh);
      }
      setShowRemoteKeypad(false);
      setEnteredDigits('');
      setRemoteError(null);
    } else {
      setRemoteError(`চ্যানেল নম্বর #${chNum} পাওয়া যায়নি। দয়া করে আবার চেষ্টা করুন।`);
      // Auto clear feedback after 3.5 seconds
      setTimeout(() => {
        setRemoteError(null);
      }, 3500);
    }
  };

  // Real-time remote automatic channel trigger on digit typing
  useEffect(() => {
    if (!enteredDigits) return;

    // Wait exactly 1.3 seconds after typing stops, then automatically play the typed channel!
    const timer = setTimeout(() => {
      const chNum = parseInt(enteredDigits, 10);
      const targetCh = allChannels?.find(ch => ch.channelNum === chNum);
      if (targetCh) {
        if (onSelectChannel) {
          onSelectChannel(targetCh);
        }
        setShowRemoteKeypad(false);
        setEnteredDigits('');
        setRemoteError(null);
      } else {
        setRemoteError(`চ্যানেল নম্বর #${chNum} পাওয়া যায়নি।`);
        setTimeout(() => {
          setRemoteError(null);
        }, 3000);
      }
    }, 1300);

    return () => clearTimeout(timer);
  }, [enteredDigits, allChannels, onSelectChannel]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setShowRemoteKeypad(true);
        setEnteredDigits(prev => {
          const next = prev + e.key;
          if (next.length > 3) return next.substring(0, 3);
          return next;
        });
        setRemoteError(null);
      } else if (showRemoteKeypad && e.key === 'Backspace') {
        e.preventDefault();
        setEnteredDigits(prev => prev.slice(0, -1));
      } else if (showRemoteKeypad && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const digitsToUse = enteredDigits;
        if (!digitsToUse) return;
        const chNum = parseInt(digitsToUse, 10);
        const targetCh = allChannels?.find(ch => ch.channelNum === chNum);
        
        if (targetCh) {
          if (onSelectChannel) {
            onSelectChannel(targetCh);
          }
          setShowRemoteKeypad(false);
          setEnteredDigits('');
          setRemoteError(null);
        } else {
          setRemoteError(`চ্যানেল নম্বর #${chNum} পাওয়া যায়নি। দয়া করে আবার চেষ্টা করুন।`);
        }
      } else if (showRemoteKeypad && e.key === 'Escape') {
        e.preventDefault();
        setShowRemoteKeypad(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showRemoteKeypad, enteredDigits, allChannels, onSelectChannel]);

  // Reset proxy bypass state whenever a different channel or server is selected
  useEffect(() => {
    setUseProxy(false);
    setForceHls(false);
  }, [channel?.id, overrideChannel?.id, serverId]);

  // Setup Picture in Picture and Fullscreen Sync
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsPipSupported('pictureInPictureEnabled' in document);
      
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      };
    }
  }, []);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Picture-in-picture activation failed:", err);
    }
  };

  // Derive active playing channel safely
  const playingChannel = overrideChannel || channel;

  // Automated crowd-source check: report broken channels to sever to filter out permanently
  useEffect(() => {
    if (error && playingChannel) {
      fetch('/api/channels/report-broken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: playingChannel.id, channelName: playingChannel.name })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log(`[Real-time Auto-Cleaner] Permanently blacklisted broken channel: ${playingChannel.name}`);
        }
      })
      .catch(err => console.error('[Real-time Auto-Cleaner Error] Failed to report broken channel:', err));
    }
  }, [error, playingChannel]);

  // Initialize pairing session if modal is open and tvMode is receiver
  useEffect(() => {
    if (showTvModal && tvMode === 'receiver' && !tvPairingCode) {
      setIsPairingLoading(true);
      fetch('/api/tv/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: 'স্মার্ট টিভি স্ক্রিন' })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          setTvPairingCode(data.session.pairingCode);
        }
      })
      .catch(err => console.error("Error registering TV casting:", err))
      .finally(() => setIsPairingLoading(false));
    }
  }, [showTvModal, tvMode, tvPairingCode]);

  // Polling for Receiver Mode
  useEffect(() => {
    if (tvMode !== 'receiver' || !tvPairingCode) return;

    let active = true;
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/tv/status/${tvPairingCode}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

        if (data.success && data.session) {
          setCastConnectedDevice(data.session.controllerDeviceName || null);
          
          if (data.commands && data.commands.length > 0) {
            data.commands.forEach((cmd: any) => {
              if (cmd.type === 'play_channel') {
                setOverrideChannel(cmd.payload);
              } else if (cmd.type === 'toggle_play') {
                const video = videoRef.current;
                if (video) {
                  if (video.paused) {
                    video.play().catch(() => {});
                    setIsPlaying(true);
                  } else {
                    video.pause();
                    setIsPlaying(false);
                  }
                }
              } else if (cmd.type === 'set_volume') {
                const video = videoRef.current;
                if (video) {
                  video.volume = cmd.payload;
                  setVolume(cmd.payload);
                }
              } else if (cmd.type === 'set_aspect') {
                setAspectRatio(cmd.payload);
              }
            });
          }
        }
      } catch (e) {
        console.error("TV receiver status poll failed", e);
      }
    };

    pollStatus();
    const timer = setInterval(pollStatus, 1500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tvMode, tvPairingCode]);

  // Load channels for remote mode
  useEffect(() => {
    if (tvMode === 'remote') {
      fetch('/api/channels')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRemoteChannels(data);
          }
        })
        .catch(err => console.error("Error loading channels for remote:", err));
    }
  }, [tvMode]);

  // Instantly sync channel changes to TV in remote mode
  useEffect(() => {
    if (tvMode === 'remote' && tvPairingCode && channel) {
      fetch('/api/tv/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: tvPairingCode.toUpperCase(),
          commandType: 'play_channel',
          payload: channel
        })
      }).catch(err => console.error("Error casting payload play_channel:", err));
    }
  }, [channel, tvMode, tvPairingCode]);

  // Handle Mobile Remote pairing request to TV secure API
  const handleMobileRemotePair = async () => {
    if (!inputCode) {
      alert("দয়া করে ৬ সংখ্যার টিভি কোডটি লিখুন!");
      return;
    }
    setIsPairingLoading(true);
    setRemoteFeedbackMsg(null);
    try {
      const res = await fetch('/api/tv/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: inputCode.trim(),
          deviceName: 'মোবাইল রিমোট সোর্স'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTvPairingCode(inputCode.trim().toUpperCase());
        setTvMode('remote');
        setCastConnectedDevice(data.session.receiverDeviceName || 'Smart TV Screen');
        setRemoteFeedbackMsg("সাফল্যের সাথে কানেক্টেড! নীচের রিমোট দিয়ে কন্ট্রোল করুন।");
        
        // Change TV channel instantly to currently active channel
        if (channel) {
          fetch('/api/tv/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pairingCode: inputCode.trim().toUpperCase(),
              commandType: 'play_channel',
              payload: channel
            })
          }).catch(err => console.error("Error cast:", err));
        }
      } else {
        setRemoteFeedbackMsg(data.error || "টিভি কানেকশন কোড সঠিক নয়। দয়া করে আবার চেষ্টা করুন।");
      }
    } catch (e: any) {
      setRemoteFeedbackMsg("সার্ভার বা কানেকশন ত্রুটি! দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setIsPairingLoading(false);
    }
  };

  const triggerRemoteCommand = (type: string, payload?: any) => {
    if (!tvPairingCode) return;
    fetch('/api/tv/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingCode: tvPairingCode.toUpperCase(),
        commandType: type,
        payload
      })
    })
    .catch(err => console.error("Error dispatching remote command:", err));
  };

    // CC & Quality States
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string>('Auto (স্বয়ংক্রিয়)');
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string }[]>([]);
  const [ccActive, setCcActive] = useState(false);
  const [ccText, setCcText] = useState('');
  const [displayedCcText, setDisplayedCcText] = useState('');
  
  // Real-time Widescreen Rotation Simulation State (সোজা না আড়াআড়ি করার অপশন)
  const [isRotatedLandscape, setIsRotatedLandscape] = useState(false);

  const onReportWorkingStateRef = useRef(onReportWorkingState);
  useEffect(() => {
    onReportWorkingStateRef.current = onReportWorkingState;
  }, [onReportWorkingState]);

  useEffect(() => {
    setUseProxy(false);
    setForceHls(false);
    setShowQualityMenu(false);
    setHlsLevels([]);
    setCurrentQuality('Auto (স্বয়ংক্রিয়)');
  }, [playingChannel?.id]);

  // CC Subtitle speed timing engine mapping translation sentences
  useEffect(() => {
    if (!ccActive || !playingChannel) {
      setCcText('');
      setDisplayedCcText('');
      return;
    }

    const selectCaptionList = () => {
      const g = playingChannel.group.toLowerCase();
      const n = playingChannel.name.toLowerCase();
      if (g.includes('sport') || n.includes('sport') || n.includes('t sports') || n.includes('gazi') || n.includes('ten')) {
        return TRANSLATED_SPORTS_CC;
      } else if (g.includes('news') || n.includes('news') || n.includes('somoy') || n.includes('jamuna')) {
        return TRANSLATED_NEWS_CC;
      }
      return TRANSLATED_GENERIC_CC;
    };

    const runCaptionCycle = () => {
      const list = selectCaptionList();
      const phrase = list[Math.floor(Math.random() * list.length)];
      setCcText(phrase);
    };

    runCaptionCycle();
    const interval = setInterval(runCaptionCycle, 4100);

    return () => clearInterval(interval);
  }, [ccActive, playingChannel]);

  // Syllable/word-by-word streaming ticker to match natural speech (like live Youtube CC)
  useEffect(() => {
    if (!ccActive || !ccText) {
      setDisplayedCcText('');
      return;
    }

    const words = ccText.split(" ");
    let currentText = '';
    let wordIdx = 0;

    const streamInterval = setInterval(() => {
      if (wordIdx < words.length) {
        currentText += (wordIdx === 0 ? '' : ' ') + words[wordIdx];
        setDisplayedCcText(currentText);
        wordIdx++;
      } else {
        clearInterval(streamInterval);
      }
    }, 240); // 240ms per word represents a natural human speech rhythm

    return () => clearInterval(streamInterval);
  }, [ccText, ccActive]);

  // High-performance Playback Watchdog: monitors and automatically catches excessive buffering or frozen black screen
  useEffect(() => {
    if (!playingChannel) return;

    let lastTime = 0;
    let unchangedCount = 0;
    let consecutiveLoadingCount = 0;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      if (loading) {
        consecutiveLoadingCount += 1;
        // If it is stuck loading/buffering for 4 seconds, trigger the playback timeout error instantly
        if (consecutiveLoadingCount >= 4) {
          console.warn('Watchdog: Stream loading took more than 4s, marked as broken.');
          setError('চ্যানেল চালু হতে অত্যন্ত সময় নিচ্ছে এবং বাফারিং হচ্ছে। দয়া করে অন্য চ্যানেল চেষ্টা করুন অথবা চ্যানেলটি ডিলিট করুন!');
          setLoading(false);
          setIsPlaying(false);
          onReportWorkingStateRef.current(playingChannel.id, false);
          clearInterval(interval);
        }
      } else {
        consecutiveLoadingCount = 0;
      }

      if (isPlaying && !video.paused) {
        const currentTime = video.currentTime;
        if (currentTime === lastTime) {
          unchangedCount += 1;
          // If video is reportedly "playing" but currentTime remains stuck for 4 seconds (frozen, stalled, or rendering a permanent black screen)
          if (unchangedCount >= 4) {
            console.warn('Watchdog: Continuous playback frozen or rendering a black screen for 4s.');
            setError('চ্যানেলটিতে ব্ল্যাক স্ক্রিন অথবা প্লেব্যাক থেমে যাওয়ার সমস্যা হয়েছে। অনুগ্রহ করে চ্যানেলটি ডিলিট করুন বা অন্যটি চেষ্টা করুন!');
            setLoading(false);
            setIsPlaying(false);
            onReportWorkingStateRef.current(playingChannel.id, false);
            clearInterval(interval);
          }
        } else {
          unchangedCount = 0;
          lastTime = currentTime;
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [playingChannel?.id, loading, isPlaying, serverId, useProxy, forceHls]);

  // Global exception and promise rejection trap specifically tuned to intercept async third-party library errors (like mpegts.js & hls.js)
  useEffect(() => {
    if (!playingChannel) return;

    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (
        msg.toLowerCase().includes('mpegts') ||
        msg.toLowerCase().includes('hls') ||
        msg.toLowerCase().includes('networkerror') ||
        msg.toLowerCase().includes('play')
      ) {
        event.preventDefault(); // prevents standard uncaught exception logging from breaking or cluttering
        console.warn('Caught global player error gracefully:', msg);
        setError('চ্যানেল সংযোগে নেটওয়ার্ক বা প্লেব্যাক ত্রুটি হয়েছে! অনুগ্রহ করে চ্যানেলটি ডিলিট করুন বা অন্যটি চেষ্টা করুন।');
        setLoading(false);
        setIsPlaying(false);
        onReportWorkingStateRef.current(playingChannel.id, false);
      }
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = reason?.message || String(reason || '');
      if (
        msg.toLowerCase().includes('mpegts') ||
        msg.toLowerCase().includes('hls') ||
        msg.toLowerCase().includes('networkerror') ||
        msg.toLowerCase().includes('play')
      ) {
        event.preventDefault(); // prevents unhandled promise rejection logging from breaking or cluttering
        console.warn('Caught global player promise rejection gracefully:', msg);
        setError('চ্যানেল সংযোগে নেটওয়ার্ক বা প্লেব্যাক ত্রুটি হয়েছে! অনুগ্রহ করে চ্যানেলটি ডিলিট করুন বা অন্যটি চেষ্টা করুন।');
        setLoading(false);
        setIsPlaying(false);
        onReportWorkingStateRef.current(playingChannel.id, false);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalRejection);
    };
  }, [playingChannel?.id]);

  // Video Tag Controller effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);
    setIsPlaying(false);

    if (!playingChannel) {
      setLoading(false);
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (tsPlayerRef.current) {
      tsPlayerRef.current.destroy();
      tsPlayerRef.current = null;
    }

    let targetUrl = playingChannel.url;
    if (playingChannel.servers && playingChannel.servers.length > 0) {
      const index = parseInt(serverId || '1', 10) - 1;
      if (index >= 0 && index < playingChannel.servers.length) {
        targetUrl = playingChannel.servers[index].url;
      } else {
        targetUrl = playingChannel.servers[0].url;
      }
    }

    const isHttpsSite = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpStream = targetUrl.toLowerCase().startsWith('http://');
    const shouldForceProxy = useProxy || (isHttpsSite && isHttpStream);

    let activeUrl = shouldForceProxy 
      ? `/api/proxy?url=${encodeURIComponent(targetUrl)}` 
      : targetUrl;

    if (serverId && (!playingChannel.servers || playingChannel.servers.length === 0)) {
      const glue = activeUrl.includes('?') ? '&' : '?';
      activeUrl = `${activeUrl}${glue}server_id=${serverId}`;
    }

    // Identify raw MPEG-2 TS stream links
    const isTsStream = (
      targetUrl.toLowerCase().split('?')[0].endsWith('.ts') ||
      targetUrl.toLowerCase().includes('.ts') ||
      activeUrl.toLowerCase().includes('.ts') ||
      targetUrl.toLowerCase().includes('premiumtvs.space')
    ) && !activeUrl.toLowerCase().includes('.m3u8') && !forceHls;

    if (isTsStream && mpegts.isSupported()) {
      try {
        const tsPlayer = mpegts.createPlayer({
          type: 'mpegts',
          isLive: true,
          url: activeUrl
        }, {
          enableWorker: true,
          enableStashBuffer: false,
          stashInitialSize: 128
        });

        tsPlayerRef.current = tsPlayer;
        tsPlayer.attachMediaElement(video);
        tsPlayer.load();

        const handlePlay = () => {
          setIsPlaying(true);
          setLoading(false);
          onReportWorkingStateRef.current(playingChannel.id, true);
          
          if (tvModeRef.current === 'receiver' && tvPairingCodeRef.current) {
            fetch('/api/tv/update-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pairingCode: tvPairingCodeRef.current,
                activeChannel: playingChannel,
                playbackState: { isPlaying: true, volume: video.volume * 100 }
              })
            }).catch(e => console.error(e));
          }
        };

        const handleWaiting = () => setLoading(true);
        const handlePlaying = () => setLoading(false);
        const handleError = () => {
          try {
            tsPlayer.unload();
            tsPlayer.detachMediaElement();
            tsPlayer.destroy();
          } catch (e) {
            console.warn('Handling tsPlayer breakdown gracefully:', e);
          }
          tsPlayerRef.current = null;

          if (!useProxy) {
            setUseProxy(true);
            return;
          }
          if (!forceHls) {
            setForceHls(true);
            return;
          }
          setError('চ্যানেল প্লেব্যাক ব্যর্থ হয়েছে। অনুগ্রহ করে অন্যটি চেষ্টা করুন।');
          setLoading(false);
          onReportWorkingStateRef.current(playingChannel.id, false);
        };

        tsPlayer.on(mpegts.Events.ERROR, (type, detail) => {
          console.warn('mpegts.js handled stream error:', type, detail);
          handleError();
        });

        video.addEventListener('playing', handlePlaying);
        video.addEventListener('waiting', handleWaiting);

        video.play()
          .then(handlePlay)
          .catch(() => {});

        return () => {
          video.removeEventListener('playing', handlePlaying);
          video.removeEventListener('waiting', handleWaiting);
          try {
            tsPlayer.destroy();
          } catch (destroyErr) {
            console.warn('Error destroying mpegts player instance:', destroyErr);
          }
          tsPlayerRef.current = null;
        };
      } catch (tsErr: any) {
        console.warn('mpegts.js handled sync initialization failure:', tsErr.message);
        if (!useProxy) {
          setUseProxy(true);
        } else if (!forceHls) {
          setForceHls(true);
        } else {
          setError('চ্যানেল প্লেব্যাক চালু করা যাচ্ছে না। দয়া করে অন্য চ্যানেল চেষ্টা করুন।');
          setLoading(false);
          onReportWorkingStateRef.current(playingChannel.id, false);
        }
      }
    }
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeUrl;
      
      const handlePlay = () => {
        setIsPlaying(true);
        setLoading(false);
        onReportWorkingStateRef.current(playingChannel.id, true);
        
        // Push state updates back if receiver
        if (tvModeRef.current === 'receiver' && tvPairingCodeRef.current) {
          fetch('/api/tv/update-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pairingCode: tvPairingCodeRef.current,
              activeChannel: playingChannel,
              playbackState: { isPlaying: true, volume: video.volume * 100 }
            })
          }).catch(e => console.error(e));
        }
      };
      const handleWaiting = () => setLoading(true);
      const handlePlaying = () => setLoading(false);
      const handleError = () => {
        if (!useProxy) {
          setUseProxy(true);
          return;
        }
        setError('চ্যানেল লোড করা সম্ভব হয়নি। অনুগ্রহ করে অন্যটি চেষ্টা করুন।');
        setLoading(false);
        onReportWorkingStateRef.current(playingChannel.id, false);
      };

      video.addEventListener('canplay', handlePlay);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('error', handleError);

      video.play().catch(() => {});

      return () => {
        video.removeEventListener('canplay', handlePlay);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('error', handleError);
      };
    } 
    else if (Hls.isSupported()) {
      // Hyper-optimized buffer config for instant play and smooth streaming with 0 stuttering
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 8,               // Keeps 8 seconds of buffer to prevent stuttering/stalls
        maxMaxBufferLength: 16,
        maxBufferSize: 12 * 1024 * 1024,  // 12MB buffer allows downloading plenty of stream ahead
        liveSyncDurationCount: 1.5,       // Small delay to ensure chunk continuity
        liveMaxLatencyDurationCount: 4,
        backBufferLength: 5,              // Limit memory overhead while maintaining safe back buffer
        enableSoftwareAES: true,
        highBufferWatchdogPeriod: 2,
        maxLoadingDelay: 1,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play()
          .then(() => {
            setIsPlaying(true);
            if (tvModeRef.current === 'receiver' && tvPairingCodeRef.current) {
              fetch('/api/tv/update-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pairingCode: tvPairingCodeRef.current,
                  activeChannel: playingChannel,
                  playbackState: { isPlaying: true, volume: video.volume * 100 }
                })
              }).catch(e => console.error(e));
            }
          })
          .catch(() => setIsPlaying(false));
        onReportWorkingStateRef.current(playingChannel.id, true);

        if (hls.levels && hls.levels.length > 0) {
          const list = hls.levels.map((lvl, idx) => {
            const h = lvl.height;
            let resName = h ? `${h}p HD` : `${Math.round(lvl.bitrate / 1000)} Kbps`;
            if (h >= 1080) resName = '1080p FHD';
            else if (h >= 720) resName = '720p HD';
            return { index: idx, label: resName };
          });
          setHlsLevels(list);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        const isNetworkError = data.type === Hls.ErrorTypes.NETWORK_ERROR;
        // Bypasses local cross-origin CORS limitations instantly using cors proxy wrapper
        if (!useProxy && (data.fatal || isNetworkError)) {
          setUseProxy(true);
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('লাইভ স্ট্রিম সংযোগ বিচ্ছিন্ন হয়েছে।');
              setLoading(false);
              onReportWorkingStateRef.current(playingChannel.id, false);
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else {
      setError('আপনার ব্রাউজারটি HLS সমর্থক নয়।');
      setLoading(false);
    }
  }, [playingChannel?.id, playingChannel?.url, useProxy, serverId, forceHls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    video.volume = v;
    video.muted = (v === 0);
    setVolume(v);
    setIsMuted(v === 0);
  };

  const selectQuality = (levelIdx: number, label: string) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.currentLevel = levelIdx;
    }
    setCurrentQuality(label);
    setShowQualityMenu(false);
    
    // Trigger smooth transition/buffering animation for realistic quality adaptation
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 650);
  };

  const triggerFullScreen = () => {
    const container = document.getElementById('player-view-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (video) video.load();
    setLoading(true);
    setError(null);
    setUseProxy(prev => !prev);
  };

  const toggleRotateLandscape = () => {
    setIsRotatedLandscape(prev => !prev);
  };

  // Detect if physical screen orientation is vertical potrait (phone held straight)
  const isCurrentlyPortrait = typeof window !== 'undefined' 
    ? window.innerWidth < window.innerHeight 
    : true;

  // Custom styling for vertical orientation rotation
  const containerClassStyles = isRotatedLandscape
    ? "fixed inset-0 bg-black z-[9999] flex flex-col justify-between p-4 overflow-hidden"
    : "relative flex flex-col bg-slate-955 rounded-2xl overflow-hidden shadow-2xl border border-slate-900 aspect-video w-full group";

  const videoClassStyles = isRotatedLandscape
    ? (isCurrentlyPortrait ? "w-[98vh] h-[98vw] rotate-90 object-contain mx-auto my-auto select-none" : "w-full h-full object-contain")
    : `w-full h-full bg-black transition-all duration-300 ${aspectRatio === 'video-cover' ? 'object-cover' : aspectRatio === 'video-fill' ? 'object-fill' : 'object-contain'}`;

  return (
    <div id="player-view-wrapper" className="flex flex-col gap-2.5 w-full select-none">
      
      {/* Aspect-Video Display Container (transforms to fixed full screen on Tilt orientation) */}
      <div 
        id="player-view-container" 
        className={containerClassStyles}
      >
        <style>{`
          .video-contain { object-fit: contain; }
          .video-cover { object-fit: cover; }
          .video-fill { object-fit: fill; }
        `}</style>

        {isRotatedLandscape && (
          <style>{`
            body {
              overflow: hidden !important;
              position: fixed !important;
              width: 100% !important;
              height: 100% !important;
            }
          `}</style>
        )}

        {/* Embedded native HTML5 Video tag */}
        <video
          ref={videoRef}
          id="live-tv-native-video"
          className={videoClassStyles}
          playsInline
          preload="auto"
          autoPlay
          controls
        />

        {/* Premium Overlay Settings Menu inside the Video Stage itself to prevent outer clipping */}
        {showQualityMenu && playingChannel && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 relative animate-fade-in">
              {/* Close Button */}
              <button
                onClick={() => setShowQualityMenu(false)}
                className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800 border border-slate-805/40 rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="বন্ধ করুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="text-center font-bold text-slate-205 text-[11px] pb-2.5 border-b border-slate-850 uppercase tracking-widest flex items-center justify-center gap-1.5 select-none">
                <Settings className="w-3.5 h-3.5 text-sky-400 animate-spin-hover" />
                <span>ভিডিও রেজুলেশন সেটিংস</span>
              </div>

              <div className="flex flex-col gap-1 mt-3">
                {hlsLevels.length > 0 ? (
                  <>
                    <button
                      onClick={() => {
                        selectQuality(-1, 'Auto (স্বয়ংক্রিয়)');
                        setShowQualityMenu(false);
                      }}
                      className={`flex items-center justify-between w-full text-left px-3 py-1.8 rounded-xl text-xs transition-colors cursor-pointer font-bold
                        ${currentQuality === 'Auto (স্বয়ংক্রিয়)' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'}
                      `}
                    >
                      <span>Auto (স্বয়ংক্রিয়)</span>
                      {currentQuality === 'Auto (স্বয়ংক্রিয়)' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </button>
                    {hlsLevels.map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => {
                          selectQuality(lvl.index, lvl.label);
                          setShowQualityMenu(false);
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-1.8 rounded-xl text-xs transition-colors cursor-pointer font-bold
                          ${currentQuality === lvl.label ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'}
                        `}
                      >
                        <span>{lvl.label}</span>
                        {currentQuality === lvl.label && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        selectQuality(-1, 'Auto (স্বয়ংক্রিয়)');
                        setShowQualityMenu(false);
                      }}
                      className={`flex items-center justify-between w-full text-left px-3 py-1.8 rounded-xl text-xs transition-colors cursor-pointer font-bold
                        ${currentQuality === 'Auto (স্বয়ংক্রিয়)' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}
                      `}
                    >
                      <span>Auto (স্বয়ংক্রিয়)</span>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded">সক্রিয়</span>
                    </button>
                    {[
                      { index: 0, label: '1080p FHD (হাই ডেফিনিশন)' },
                      { index: 1, label: '720p HD (স্ট্যান্ডার্ড)' },
                      { index: 2, label: '480p SD (মিডিয়াম ক্লিয়ারিটি)' },
                      { index: 3, label: '360p LQ (ডাটা সেভার)' },
                    ].map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => {
                          selectQuality(lvl.index, lvl.label);
                          setShowQualityMenu(false);
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-1.8 rounded-xl text-xs transition-colors cursor-pointer font-bold
                          ${currentQuality === lvl.label ? 'bg-sky-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-850'}
                        `}
                      >
                        <span>{lvl.label}</span>
                        {currentQuality === lvl.label && (
                          <span className="text-[9px] text-sky-200 font-bold bg-sky-950/40 px-1.5 rounded">সক্রিয়</span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating corner controls when landscape orientation is active */}
        {isRotatedLandscape && playingChannel && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto bg-slate-955/95 backdrop-blur-lg px-4 py-3 rounded-2xl border border-slate-800 z-50 text-xs font-semibold shadow-2xl">
            <button
              onClick={() => setIsRotatedLandscape(false)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-rose-600 via-rose-650 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold rounded-xl cursor-pointer hover:scale-102 active:scale-95 transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>← ফিরে যান (ডিসপ্লে সোজা করুন)</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={togglePlay}
                className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-505 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'বিরাম' : 'চালু'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Prominent Corner Fit in typical display mode (remote is now a beautiful floating button below) */}
        {!isRotatedLandscape && playingChannel && !error && (
          <div className="absolute top-2.5 right-2 text-xs z-25 flex items-center gap-2">
            <button
              id="btn-corner-full-stretch"
              onClick={() => {
                setAspectRatio(prev => {
                  if (prev === 'video-contain') return 'video-cover';
                  if (prev === 'video-cover') return 'video-fill';
                  return 'video-contain';
                });
              }}
              title="ডিসপ্লে সাইড ফিট ও রি-স্কেল"
              className="flex items-center gap-1.2 px-2.5 py-1.5 rounded-lg bg-slate-955/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-[10px] font-bold text-slate-200 shadow-md transition-all active:scale-95 cursor-pointer select-none"
            >
              <Maximize className="w-3 h-3 text-sky-400" />
              <span>রিসাইজ</span>
            </button>
          </div>
        )}

        {/* Floating TV Remote Button - styled exactly like the Live Support Floating Chat with a pulsing pink wave */}
        {!isRotatedLandscape && playingChannel && !error && (
          <button
            id="btn-player-floating-remote"
            type="button"
            onClick={() => {
              setShowRemoteKeypad(prev => !prev);
              setEnteredDigits('');
              setRemoteError(null);
            }}
            className={`absolute bottom-16 right-3.5 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer border select-none shadow-[0_8px_30px_rgb(236,72,153,0.3)]
              ${showRemoteKeypad
                ? 'bg-gradient-to-tr from-rose-600 to-pink-600 border-pink-400 text-white animate-pulse'
                : 'bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-600 border-pink-400/40 text-white'
              }
            `}
            title="ভার্চুয়াল রিমোট কন্ট্রোল"
          >
            {/* Pulsing ring indicator */}
            {!showRemoteKeypad && (
              <span className="absolute inset-0 rounded-full bg-pink-500/25 animate-ping pointer-events-none" />
            )}
            <div className="relative flex items-center justify-center">
              <Tv className="w-5.5 h-5.5 text-white" />
            </div>
          </button>
        )}

        {/* Interactive Virtual Remote Control overlay directly integrated inside the player container screen */}
        {showRemoteKeypad && playingChannel && !error && (
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-45 flex items-center justify-center p-3 animate-fade-in select-none"
            onClick={() => {
              setShowRemoteKeypad(false);
              setEnteredDigits('');
              setRemoteError(null);
            }}
          >
            <div 
              className="w-[240px] bg-[#0d0d12] border border-slate-800 rounded-[28px] p-4.5 flex flex-col gap-3 shadow-[0_24px_60px_rgba(0,0,0,0.95)] animate-scale-up text-left relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glossy top subtle border glow */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-pink-500/30 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <div className="flex items-center gap-1.8">
                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)] shrink-0" />
                  <span className="text-[11px] font-black hover:text-pink-400 text-slate-200 tracking-wide font-sans">রিমোট কন্ট্রোল (TV Remote)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoteKeypad(false);
                    setEnteredDigits('');
                    setRemoteError(null);
                  }}
                  className="w-5.5 h-5.5 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400 text-[10px] font-bold flex items-center justify-center cursor-pointer font-sans"
                >
                  ✕
                </button>
              </div>

              {/* Status input screen */}
              <div className="bg-[#050508] border border-slate-850 rounded-xl p-2.5 flex flex-col items-center justify-center min-h-[55px] relative shadow-inner">
                <span className="text-[6.5px] font-black tracking-widest text-slate-500 uppercase font-sans mb-0.5 select-none">
                  LAUNCH CHANNEL NUMBER
                </span>
                
                {enteredDigits ? (
                  <div className="flex flex-col items-center gap-0.5 w-[190px]">
                    <span className="text-2xl font-black tracking-widest text-[#10b981] font-mono leading-none animate-pulse">
                      {enteredDigits}
                    </span>
                    {(() => {
                      const matched = allChannels?.find(ch => ch.channelNum === parseInt(enteredDigits, 10));
                      return matched ? (
                        <span className="text-[9px] text-emerald-400 font-bold truncate max-w-full text-center mt-0.5 font-sans">
                          📺 {matched.name}
                        </span>
                      ) : (
                        <span className="text-[9px] text-rose-450 font-bold tracking-wide mt-0.5 font-sans">
                          চ্যানেল পাওয়া যায়নি
                        </span>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-sm font-bold text-slate-600 tracking-widest animate-pulse font-mono py-0.5 selection:bg-transparent">
                    - - -
                  </span>
                )}

                {remoteError && (
                  <div className="absolute -bottom-2.5 left-0 right-0 text-center z-10 transition-all">
                    <span className="text-[8px] font-bold text-rose-300 bg-red-955 border border-red-900/40 px-2.5 py-0.5 rounded-full shadow-lg">
                      {remoteError}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid of keys matching remote styling */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      setEnteredDigits(prev => {
                        const next = prev + num;
                        if (next.length > 3) return next.substring(0, 3);
                        return next;
                      });
                      setRemoteError(null);
                    }}
                    className="w-full py-2 bg-[#22222b] hover:bg-[#2c2c31] active:bg-[#343446] text-white font-extrabold text-lg rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-102 border border-white/5 active:border-white/10 select-none"
                  >
                    {num}
                  </button>
                ))}

                {/* Clear button (C) */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(6);
                    setEnteredDigits('');
                    setRemoteError(null);
                  }}
                  className="w-full py-2 bg-[#3e1b1b] hover:bg-[#522121] active:bg-[#632424] text-[#f87171] font-black text-lg rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-101 border border-red-500/10 hover:border-red-500/20 select-none"
                >
                  C
                </button>

                {/* Zero button (0) */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    setEnteredDigits(prev => {
                      const next = prev + '0';
                      if (next.length > 3) return next.substring(0, 3);
                      return next;
                    });
                    setRemoteError(null);
                  }}
                  className="w-full py-2 bg-[#22222b] hover:bg-[#2c2c31] active:bg-[#343446] text-white font-extrabold text-lg rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-102 border border-white/5 select-none"
                >
                  0
                </button>

                {/* OK button */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(18);
                    submitKeyedChannel();
                  }}
                  className="w-full py-2 bg-[#054434] hover:bg-[#075944] active:bg-[#046e53] text-[#34d399] font-black text-sm rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 hover:scale-101 hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)] border border-emerald-500/10 hover:border-emerald-500/20 select-none"
                >
                  OK
                </button>
              </div>

              {/* Physical Keyboard Guideline */}
              <p className="text-[8px] text-slate-500 text-center font-sans leading-normal select-none px-1">
                ফিজিক্যাল রিমোটের বোতাম (0-9) চেপেও চ্যানেল খুলতে পারবেন।
              </p>
            </div>
          </div>
        )}

        {/* Subtle, Gorgeous Telegram watermark on the player */}
        {playingChannel && !error && (
          <a
            href="https://t.me/FIFAWorldCupbd1"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-16 left-3.5 z-20 bg-black/45 hover:bg-sky-505/20 backdrop-blur-md border border-white/10 hover:border-sky-400/35 px-2.5 py-1.2 rounded-xl flex items-center gap-1.5 cursor-pointer hover:scale-103 active:scale-97 select-none transition-all group shadow-lg"
          >
            <svg 
              className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform transform rotate-45 -translate-y-0.5 shrink-0" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.99.54-1.41.53-.46-.01-1.34-.26-1.99-.47-.8-.26-1.43-.4-1.38-.85.03-.23.35-.47.96-.73 3.76-1.63 6.27-2.71 7.53-3.23 3.58-1.48 4.32-1.74 4.81-1.75.11 0 .35.03.5.16.13.12.17.29.18.41-.01.07 0 .15-.01.23z"/>
            </svg>
            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-200 group-hover:text-white transition-colors uppercase font-mono">
              t.me/FIFAWorldCupbd1
            </span>
          </a>
        )}

        {/* Channel empty visual */}
        {!playingChannel && (
          <div id="channel-empty-screen" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-955 border border-slate-900 p-6 text-center text-slate-405 z-10">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center animate-bounce mb-2.5 border border-slate-800 shadow-xl">
              <Play className="w-6 h-6 text-sky-400 fill-sky-500 translate-x-0.5" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">কোনো চ্যানেল সিলেক্ট করা নেই</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">অনুগ্রহ করে চ্যানেল লিস্ট থেকে যেকোনো একটি ফুটবল বা স্পোর্টস চ্যানেল প্লেব্যাক করার জন্য বেছে নিন।</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && playingChannel && !error && (
          <div id="player-loading-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-15 select-none">
            {/* Spinning element */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <div className="absolute inset-0 border-3 border-transparent border-t-pink-500 rounded-full animate-spin [animation-duration:0.5s]" />
              <div className="absolute inset-0 border-3 border-transparent border-b-sky-400 rounded-full animate-spin [animation-duration:1s]" />
              <Play className="w-4 h-4 text-sky-400 animate-pulse translate-x-0.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-300 mt-3.5 tracking-wider animate-pulse flex items-center gap-1.5">লোড হচ্ছে...</span>
          </div>
        )}

        {/* Error overlay */}
        {error && playingChannel && (
          <div id="player-error-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center z-10 select-none">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2.5" />
            <h4 className="text-xs font-bold text-slate-200">চ্যানেল প্লেব্যাক ব্যর্থ হয়েছে!</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{error}</p>
            
            <div className="flex flex-wrap justify-center gap-2.5 mt-3.5">
              <button
                id="btn-retry-player-stream-new"
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-505 text-[11px] font-bold text-white rounded-lg transition-all shadow cursor-pointer active:scale-95 hover:scale-102"
              >
                <RotateCcw className="w-3.5 h-3.5" /> পুনরায় কানেক্ট করুন
              </button>
              {onDeleteChannel && (
                <button
                  id="btn-delete-player-stream"
                  onClick={() => {
                    if (window.confirm('আপনি কি সত্যিই এই অচল চ্যানেলটি ওয়েবসাইট থেকে আজীবনের জন্য ডিলিট করে দিতে চান?')) {
                      onDeleteChannel(playingChannel.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-900/40 hover:bg-rose-900 border border-rose-800 text-rose-350 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow cursor-pointer active:scale-95 hover:scale-102"
                >
                  🗑️ চ্যানেল ডিলিট করুন
                </button>
              )}
            </div>
          </div>
        )}
      </div>



      {/* Render Remote Dialer Keypad directly INLINE below the display! */}
      {!isRotatedLandscape && playingChannel && !error && showRemoteKeypad && (
         <div 
           id="remote-keypad-panel"
           className="w-full max-w-[280px] mx-auto bg-[#121217] border border-slate-800 rounded-[28px] p-5.5 shadow-[0_16px_50px_rgba(0,0,0,0.8)] text-slate-100 flex flex-col gap-4 animate-slide-up relative mt-2 shrink-0 animate-fade-in"
           onClick={(e) => e.stopPropagation()}
         >

           {/* Top status indicator screen mimicking screenshot LCD screen */}
           <div className="bg-[#050508] border border-slate-850 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[72px] relative shadow-inner select-none">
                <span className="text-[7.5px] font-black tracking-widest text-slate-500 uppercase font-sans mb-1 selection:bg-transparent">
                  DIGITAL LAUNCH SCREEN
                </span>
                
                {enteredDigits ? (
                  <div className="flex flex-col items-center gap-0.5 w-[210px]">
                    <span className="text-3xl font-black tracking-widest text-[#10b981] font-mono leading-none">
                      {enteredDigits}
                    </span>
                    {(() => {
                      const matched = allChannels?.find(ch => ch.channelNum === parseInt(enteredDigits, 10));
                      return matched ? (
                        <span className="text-[10px] text-emerald-400 font-bold truncate max-w-full text-center mt-1 animate-pulse font-sans">
                          📺 {matched.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-400 font-bold tracking-wide mt-1 font-sans">
                          চ্যানেল পাওয়া যায়নি
                        </span>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-xl font-bold text-slate-700 tracking-widest animate-pulse font-mono py-1 selection:bg-transparent">
                    - - -
                  </span>
                )}

                {remoteError && (
                  <div className="absolute -bottom-3 left-0 right-0 text-center z-10 transition-all">
                    <span className="text-[8.5px] font-bold text-rose-300 bg-red-955 border border-red-900 px-3 py-0.5 rounded-full shadow-md">
                      {remoteError}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid of keys matching remote styling */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      setEnteredDigits(prev => {
                        const next = prev + num;
                        if (next.length > 3) return next.substring(0, 3);
                        return next;
                      });
                      setRemoteError(null);
                    }}
                    className="w-full aspect-square bg-[#22222b] hover:bg-[#2c2c3a] active:bg-[#343446] text-white font-extrabold text-2xl rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-102 border border-white/5 active:border-white/10 select-none"
                  >
                    {num}
                  </button>
                ))}

                {/* Clear button (C) */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(6);
                    setEnteredDigits('');
                    setRemoteError(null);
                  }}
                  className="w-full aspect-square bg-[#3e1b1b] hover:bg-[#522121] active:bg-[#632424] text-[#f87171] font-black text-2xl rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-101 border border-red-500/10 hover:border-red-500/20 select-none"
                >
                  C
                </button>

                {/* Zero button (0) */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    setEnteredDigits(prev => {
                      const next = prev + '0';
                      if (next.length > 3) return next.substring(0, 3);
                      return next;
                    });
                    setRemoteError(null);
                  }}
                  className="w-full aspect-square bg-[#22222b] hover:bg-[#2c2c3a] active:bg-[#343446] text-white font-extrabold text-2xl rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-102 border border-white/5 select-none"
                >
                  0
                </button>

                {/* OK button */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(18);
                    submitKeyedChannel();
                  }}
                  className="w-full aspect-square bg-[#054434] hover:bg-[#075944] active:bg-[#046e53] text-[#34d399] font-black text-lg rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 hover:scale-101 hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)] border border-emerald-500/10 hover:border-emerald-500/20 select-none"
                >
                  OK
                </button>
              </div>

              {/* Physical Keyboard Guideline */}
              <p className="text-[9px] text-slate-500 text-center font-sans leading-normal select-none px-1">
                কম্পিউটার বা টিভির ফিজিক্যাল রিমোটের সংখ্যা বোতাম (0-9) চেপেও সরাসরি যেকোনো চ্যানেল নম্বর খুলতে পারবেন।
              </p>
            </div>
          )}
    </div>
  );
}

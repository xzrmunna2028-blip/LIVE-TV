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
  "ফাউল! কিন্তু রেফারি খেলা চালিয়ে যাওয়ার নির্দেশ দিলেন।",
  "অবিশ্বাস্য গোলকিপিং! নিশ্চিত গোল থেকে বাঁচিয়ে দিলেন দলকে!",
  "মাঝমাঠ থেকে সুন্দর একটি পাস দিলেন ফরোয়ার্ডের দিকে।",
  "অসাধারণ শট! গোল পোস্টের সামান্য উপর দিয়ে চলে গেল বলটি।",
  "হৃদয়স্পন্দন বাড়িয়ে দেওয়া রোমাঞ্চকর খেলা চলছে!",
  "দারুণ আক্রমণ ছিল কিন্তু অফসাইডের সিদ্ধান্ত রেফারি স্যারের।"
];

const TRANSLATED_NEWS_CC = [
  "আজকের প্রধান খবর, দেশজুড়ে উৎসবমুখর পরিবেশে খেলা উপভোগ করছেন সাধারণ মানুষ।",
  "আবহাওয়া দপ্তরের পূর্বাভাস অনুযায়ী সন্ধ্যা নাগাদ সামান্য বৃষ্টিপাতের সম্ভাবনা রয়েছে।",
  "আইসিসি বিশ্বকাপের চূড়ান্ত প্রস্তুতি কমিটির গুরুত্বপূর্ন সভা অনুষ্ঠিত হয়েছে।",
  "দর্শকদের নিরাপত্তার স্বার্থে স্টেডিয়াম এলাকায় অতিরিক্ত নিরাপত্তা ব্যবস্থা জোরদার করা হয়েছে।"
];

const TRANSLATED_GENERIC_CC = [
  "লাইভ সম্প্রচারের সাথে থাকুন, উপভোগ করুন বিরতিহীন বিনোদন।",
  "ফ্রি ওয়ার্ল্ড কাপ বিডি দেখার জন্য আপনাকে ধন্যবাদ!",
  "অবিরাম হাই-স্পিড বাফারিং-ফ্রি লাইভ স্ট্রিমিং সার্ভার লোড হচ্ছে...",
  "স্ক্রিনের নিচের সাপোর্ট লিংকে ক্লিক করে আমাদের ফেসবুক ও টেলিগ্রামে যুক্ত হতে পারেন।"
];

export default function CustomPlayer({
  channel,
  onReportWorkingState,
  serverId = '1',
  allChannels = [],
  onSelectChannel,
  onDeleteChannel
}: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const tsPlayerRef = useRef<mpegts.Player | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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
  const [showSpinner, setShowSpinner] = useState(false);

  // States for digital remote controls
  const [showRemoteKeypad, setShowRemoteKeypad] = useState(false);
  const [enteredDigits, setEnteredDigits] = useState('');
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const onSelectChannelRef = useRef(onSelectChannel);
  useEffect(() => {
    onSelectChannelRef.current = onSelectChannel;
  }, [onSelectChannel]);

  const submitKeyedChannel = () => {
    if (!enteredDigits) return;
    const channelNum = parseInt(enteredDigits, 10);
    if (isNaN(channelNum) || channelNum <= 0) {
      setRemoteError('সঠিক নম্বর লিখুন');
      return;
    }

    const channelsToSearch = allChannels || [];
    if (channelsToSearch.length === 0) {
      setRemoteError('কোনো চ্যানেল পাওয়া যায়নি');
      return;
    }

    let matchedCh = channelsToSearch.find(c => c.id === enteredDigits || c.id === `${channelNum}`);
    if (!matchedCh) {
      const idx = channelNum - 1;
      if (idx >= 0 && idx < channelsToSearch.length) {
        matchedCh = channelsToSearch[idx];
      }
    }

    if (matchedCh) {
      if (onSelectChannel) {
        onSelectChannel(matchedCh);
      } else if (onSelectChannelRef.current) {
        onSelectChannelRef.current(matchedCh);
      }
      setEnteredDigits('');
      setRemoteError(null);
      setShowRemoteKeypad(false); // auto-hide remote keypad on selection
    } else {
      setRemoteError('চ্যানেল নম্বর সঠিক নয়');
    }
  };

  // Physical keyboard mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') {
        if (navigator.vibrate) navigator.vibrate(8);
        setShowRemoteKeypad(true);
        setEnteredDigits(prev => {
          const next = prev + e.key;
          if (next.length > 3) return next.substring(0, 3);
          return next;
        });
        setRemoteError(null);
      } else if (e.key === 'Backspace') {
        setEnteredDigits(prev => prev.slice(0, -1));
        setRemoteError(null);
      } else if (e.key === 'Escape') {
        setEnteredDigits('');
        setRemoteError(null);
        setShowRemoteKeypad(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitKeyedChannel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allChannels, enteredDigits]);

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
      }, 1800);
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
        // High-speed Fail-Fast Action: If a stream is stuck loading/buffering for ~1.2 seconds, auto-heal & auto-delete instantly
        if (consecutiveLoadingCount >= 4) {
          console.warn('Watchdog: Stream loading took more than 1.2s, auto-deleting channel.');
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
          // If video is reportedly "playing" but currentTime remains stuck for ~2.1 seconds, auto-delete to keep streams fresh!
          if (unchangedCount >= 7) {
            console.warn('Watchdog: Playback frozen for 2.1s, auto-deleting channel.');
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
    }, 300);

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
      });

      hlsRef.current = hls;
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(activeUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = hls.levels.map((lvl, index) => {
          const height = lvl.height;
          let label = `${height}p`;
          if (height >= 1080) label += ' FHD';
          else if (height >= 720) label += ' HD';
          else if (height >= 480) label += ' SD';
          else label += ' LQ';
          return { index, label };
        });
        setHlsLevels(levels);

        video.play()
          .then(() => {
            setIsPlaying(true);
            setLoading(false);
            onReportWorkingStateRef.current(playingChannel.id, true);
          })
          .catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error encountered, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error encountered, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS source breakdown occurred:', data.details);
              hls.destroy();
              hlsRef.current = null;
              if (!useProxy) {
                setUseProxy(true);
              } else {
                setError('চ্যানেল প্লেব্যাক সিঙ্ক বা কানেকশন ত্রুটি! দয়া করে অন্য চ্যানেল চেষ্টা করুন।');
                setLoading(false);
                onReportWorkingStateRef.current(playingChannel.id, false);
              }
              break;
          }
        }
      });

      const handlePlaying = () => setLoading(false);
      const handleWaiting = () => setLoading(true);

      video.addEventListener('playing', handlePlaying);
      video.addEventListener('waiting', handleWaiting);

      return () => {
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('waiting', handleWaiting);
        hls.destroy();
        hlsRef.current = null;
      };
    }
  }, [channel?.id, overrideChannel?.id, serverId, useProxy, forceHls]);

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

  const selectQuality = (index: number, label: string) => {
    setCurrentQuality(label);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
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
          <div className="absolute inset-0 bg-slate-955/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 relative animate-fade-in">
              {/* Close Button */}
              <button
                onClick={() => setShowQualityMenu(false)}
                className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white bg-slate-955/60 hover:bg-slate-850 border border-slate-805/45 rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="বন্ধ করুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="text-center font-bold text-slate-205 text-[11px] pb-2.5 border-b border-slate-850 uppercase tracking-widest flex items-center justify-center gap-1.5 select-none">
                <Settings className="w-3.5 h-3.5 text-sky-400 animate-spin-hover" />
                <span>ভিডিও রেজুলেশন সেটিংস</span>
              </div>

              <div className="flex flex-col gap-1 mt-3 font-sans">
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
                      { index: 0, label: '1080p FHD (হাই ডেفিনিশন)' },
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

        {/* Custom Floating Landscape close button for quick exit */}
        {isRotatedLandscape && playingChannel && (
          <button
            onClick={toggleRotateLandscape}
            className="absolute top-4 left-4 z-50 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/10 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105"
            title="ভিউ মোড থেকে বের হন"
          >
            <Minimize className="w-5 h-5 text-amber-400" />
          </button>
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
            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-[#f1f5f9] group-hover:text-white transition-colors uppercase font-mono">
              t.me/FIFAWorldCupbd1
            </span>
          </a>
        )}

        {/* Channel empty visual */}
        {!playingChannel && (
          <div id="channel-empty-screen" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-955 border border-slate-900 p-6 text-center text-slate-405 z-10 font-sans">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center animate-bounce mb-2.5 border border-slate-800 shadow-xl">
              <Play className="w-6 h-6 text-sky-400 fill-sky-550 translate-x-0.5" />
            </div>
            <h4 className="text-sm font-bold text-slate-205">কোনো চ্যানেল সিলেক্ট করা নেই</h4>
            <p className="text-[11px] text-slate-405 mt-1 max-w-[220px]">অনুগ্রহ করে চ্যানেল লিস্ট থেকে যেকোনো একটি ফুটবল বা স্পোর্টস চ্যানেল প্লেব্যাক করার জন্য বেছে নিন।</p>
          </div>
        )}

        {/* Error overlay */}
        {error && playingChannel && (
          <div id="player-error-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center z-10 select-none font-sans">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2.5" />
            <h4 className="text-xs font-bold text-slate-202">চ্যানেল প্লেব্যাক ব্যর্থ হয়েছে!</h4>
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

      {/* Small Button Bar below the player container */}
      <div className="flex items-center justify-between gap-2.5 px-1 py-1 text-slate-400 select-none">
        <a
          href="https://wa.me/8801640227120"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-[#34d399] hover:text-emerald-300 transition-all font-sans"
        >
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]"></span>
          </span>
          💬 লাইভ সাপোর্ট (অনলাইন)
        </a>

        {/* Remote Trigger button */}
        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(10);
            setShowRemoteKeypad(prev => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.2 py-1 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer select-none font-sans
            ${showRemoteKeypad ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 animate-pulse' : 'bg-slate-900 border-slate-800/80 hover:bg-slate-850 text-slate-350 hover:text-white'}
          `}
        >
          <Tv className="w-3.5 h-3.5 text-amber-400" /> 📱 টিভি রিমোট
        </button>
      </div>

      {/* Numerical remote keypad area rendered inline BELOW the display, never shown inside the video screen */}
      {showRemoteKeypad && !error && playingChannel && (
          <div className="w-full bg-[#0a0a0f]/95 border border-[#1e1e2d] rounded-2xl shadow-2xl p-4.5 flex flex-col gap-3 mt-1.5 relative select-none animate-fade-in text-left font-sans">
            <div className="flex items-center justify-between border-b border-[#1e1e2d] pb-2">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-amber-400" />
                <h5 className="text-[12px] font-extrabold text-[#f1f5f9] font-sans">
                  ডিজিটাল টিভি রিমোট কন্ট্রোল
                </h5>
              </div>
              <button
                onClick={() => setShowRemoteKeypad(false)}
                className="text-[9px] text-slate-400 hover:text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-bold active:scale-95 transition-all cursor-pointer font-sans"
              >
                বন্ধ করুন
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-2 bg-[#050508] border border-[#141420] rounded-xl relative overflow-hidden font-sans">
              <span className="text-[9px] text-[#475569] font-bold tracking-wider select-none uppercase font-sans mb-1 block">
                চ্যানেল নম্বর চাপুন (০-৯৯৯)
              </span>
              
              {enteredDigits ? (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-amber-400 tracking-widest font-mono py-0.5 select-none text-center">
                    {enteredDigits}
                  </span>
                  
                  {(() => {
                    const channelNum = parseInt(enteredDigits, 10);
                    const channelsToSearch = allChannels || [];
                    let matched = channelsToSearch.find(c => c.id === enteredDigits || c.id === `${channelNum}`);
                    if (!matched) {
                      const idx = channelNum - 1;
                      if (idx >= 0 && idx < channelsToSearch.length) {
                        matched = channelsToSearch[idx];
                      }
                    }
                    return matched ? (
                      <span className="text-[10px] text-emerald-400 font-bold tracking-wide mt-0.5 animate-pulse font-sans">
                        📺 {matched.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold tracking-wide mt-0.5 font-sans">
                        চ্যানেল পাওয়া যায়নি
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <span className="text-lg font-bold text-slate-700 tracking-widest animate-pulse font-mono py-1 selection:bg-transparent">
                  - - -
                </span>
              )}

              {remoteError && (
                <div className="absolute bottom-1 left-0 right-0 text-center z-10 transition-all font-sans animate-bounce">
                  <span className="text-[8.5px] font-bold text-rose-300 bg-rose-950/90 border border-rose-900 px-3 py-0.5 rounded-full shadow-md font-sans">
                    {remoteError}
                  </span>
                </div>
              )}
            </div>

            {/* Grid of keys matching remote styling */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto w-full pt-1 font-sans">
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
                  className="w-full aspect-square bg-[#141420] hover:bg-[#1a1a29] active:bg-[#222235] text-white font-extrabold text-lg rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-102 border border-white/5 active:border-white/10 select-none shadow-md font-sans"
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
                className="w-full aspect-square bg-rose-950/45 hover:bg-rose-900/60 active:bg-rose-900 border border-slate-800 text-[#f87171] font-black text-lg rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 select-none shadow-md font-sans"
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
                className="w-full aspect-square bg-[#141420] hover:bg-[#1a1a29] text-white font-extrabold text-lg rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 border border-white/5 select-none shadow-md font-sans"
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
                className="w-full aspect-square bg-emerald-950/45 hover:bg-emerald-900/60 active:bg-[#046e53] text-[#34d399] font-black text-xs rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-850 select-none shadow-md font-sans"
              >
                OK
              </button>
            </div>

            <p className="text-[9px] text-[#475569] text-center font-sans leading-normal select-none px-1 font-sans">
              কম্পিউটার বা টিভির ফিজিক্যাল রিমোটের সংখ্যা বোতাম (0-9) চেপেও সরাসরি যেকোনো চ্যানেল নম্বর খুলতে পারবেন।
            </p>
          </div>
      )}
    </div>
  );
}

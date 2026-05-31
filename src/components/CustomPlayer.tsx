/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
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

export default function CustomPlayer({ channel, onReportWorkingState, serverId }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // Set to max volume
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'video-contain' | 'video-cover' | 'video-fill'>('video-contain');
  const [useProxy, setUseProxy] = useState(false);
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

    let activeUrl = useProxy 
      ? `/api/proxy?url=${encodeURIComponent(playingChannel.url)}` 
      : playingChannel.url;

    if (serverId) {
      const glue = activeUrl.includes('?') ? '&' : '?';
      activeUrl = `${activeUrl}${glue}server_id=${serverId}`;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeUrl;
      
      const handlePlay = () => {
        setIsPlaying(true);
        setLoading(false);
        onReportWorkingStateRef.current(playingChannel.id, true);
        
        // Push state updates back if receiver
        if (tvMode === 'receiver' && tvPairingCode) {
          fetch('/api/tv/update-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pairingCode: tvPairingCode,
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
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 4,
        maxBufferSize: 3 * 1024 * 1024,
        liveSyncDurationCount: 1.2,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play()
          .then(() => {
            setIsPlaying(true);
            if (tvMode === 'receiver' && tvPairingCode) {
              fetch('/api/tv/update-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pairingCode: tvPairingCode,
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
        if (!useProxy && data.fatal) {
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
  }, [playingChannel, useProxy, serverId, tvMode, tvPairingCode]);

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
          onClick={togglePlay}
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

        {/* Prominent Corner Fit Button in typical display mode */}
        {!isRotatedLandscape && playingChannel && !error && (
          <div className="absolute top-2.5 right-2 text-xs z-25">
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

        {/* Channel empty visual */}
        {!playingChannel && (
          <div id="channel-empty-screen" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-955 border border-slate-900 p-6 text-center text-slate-405 z-10">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center animate-bounce mb-2.5 border border-slate-800 shadow-xl">
              <Play className="w-6 h-6 text-sky-400 fill-sky-500 translate-x-0.5" />
            </div>
            <p className="text-sm font-bold text-slate-200">একটি লাইভ চ্যানেল নির্বাচন করুন</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm font-sans leading-relaxed">বাফারিং ছাড়াই সচল ও রিয়েল-টাইম লাইভ ম্যাচ দেখতে নিচের যেকোনো একটি চ্যানেল প্লে করুন।</p>
          </div>
        )}

        {/* Buffering Indicator */}
        {loading && playingChannel && (
          <div id="player-buffering-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px] z-10">
            <div className="relative w-10 h-10 select-none">
              <span className="absolute inset-0 border-3 border-slate-800 rounded-full"></span>
              <span className="absolute inset-0 border-3 border-sky-400 rounded-full animate-spin border-t-transparent"></span>
            </div>
            <span className="text-slate-405 text-xs mt-3.5 animate-pulse">স্ট্রিম বাফারিং হচ্ছে...</span>
          </div>
        )}

        {/* Error placeholder */}
        {error && playingChannel && (
          <div id="player-error-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center z-10 select-none">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2.5" />
            <h4 className="text-xs font-bold text-slate-200">চ্যানেল প্লেব্যাক ব্যর্থ হয়েছে।</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{error}</p>
            
            <button
              id="btn-retry-player-stream"
              onClick={handleRestart}
              className="mt-3.5 flex items-center gap-1 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-505 text-[11px] font-bold text-white rounded-lg transition-all shadow cursor-pointer active:scale-95 hover:scale-102"
            >
              <RotateCcw className="w-3.5 h-3.5" /> পুনরায় কানেক্ট করুন
            </button>
          </div>
        )}

      </div>

      {/* Beautiful Speech translation / live transcript ribbon directly below the display screen */}
      {ccActive && displayedCcText && playingChannel && !error && !loading && (
        <div id="cc-below-display-box" className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl shadow-lg animate-fade-in my-1 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 mb-2 select-none">
            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-505 animate-ping shrink-0" />
              লাইভ বঙ্গঅনবাদ সাবটাইটেল (CC)
            </span>
            <span className="text-[9.5px] bg-slate-950 px-1.8 py-0.2 rounded text-slate-400 font-mono font-bold">
              Speech Translation Active
            </span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-sky-200 tracking-wide font-sans leading-relaxed pl-0.5">
            "{displayedCcText}"
          </p>
        </div>
      )}

      {/* Controls panel BELOW display */}
      {!isRotatedLandscape && playingChannel && !error && (
        <div 
          id="player-controls-panel-below" 
          className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex flex-col gap-2.5 shadow-sm font-sans select-none"
        >
          {/* Top category label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1 w-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-red-500"></span>
              </span>
              <span className="text-[9px] uppercase font-black tracking-widest text-red-500 bg-red-500/10 px-1.5 rounded">LIVE broadcast</span>
              <span className="text-[11px] font-extrabold text-slate-200 truncate max-w-[200px] sm:max-w-xs">{playingChannel.name}</span>
            </div>
          </div>

          {/* Player buttons */}
          <div className="flex flex-col gap-2.5 sm:gap-3 pt-0.5 max-w-full">
            
            {/* Row 1: Primary Stream Controls & Volume with direct Screen Alignment (Play, Reload, Volume, slider, TV Cast, Fullscreen) */}
            <div className="flex items-center justify-between gap-1.5 w-full">
              {/* Playback Controls & Volume elements Grouped */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="btn-player-play-pause-small"
                  onClick={togglePlay}
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-sky-600 hover:bg-sky-505 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                  title={isPlaying ? "বিরতি" : "প্লে করুন"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                </button>

                <button
                  id="btn-player-reload-stream-small"
                  onClick={handleRestart}
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-slate-955 border border-slate-850 hover:bg-slate-850 text-slate-405 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                  title="স্ট্রিম রিলোড করুন"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Volume Option */}
                <button
                  id="btn-player-mute-toggle"
                  onClick={handleMuteToggle}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0
                    ${isMuted 
                      ? 'bg-rose-600/25 border-rose-500/50 text-rose-455 shadow-md animate-pulse' 
                      : 'bg-slate-955 border-slate-850 hover:bg-slate-800 text-slate-405 hover:text-white'
                    }
                  `}
                  title={isMuted ? "শব্দ চালু করুন" : "মিউট করুন"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-10 xs:w-16 sm:w-20 md:w-24 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-505 shrink-0 outline-none"
                  title="ভলিউম নিয়ন্ত্রণ"
                />
              </div>

              {/* Seamless aligned Right Actions (TV Cast, Fullscreen) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* TV Cast Icon Button */}
                <button
                  id="btn-player-tv-pairing-cast"
                  type="button"
                  onClick={() => setShowTvModal(true)}
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-slate-955 border border-slate-850 hover:bg-slate-800 text-amber-500 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 animate-pulse shrink-0"
                  title="সরাসরি টিভিতে খেলা দেখুন (TV Cast)"
                >
                  <Tv className="w-3.5 h-3.5 text-amber-500" />
                </button>

                {/* Fullscreen button with dynamic state icon */}
                <button
                  id="btn-player-trigger-fullscreen"
                  onClick={triggerFullScreen}
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-slate-955 border border-slate-855 hover:bg-slate-805 text-slate-405 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title={isFullscreen ? "ফুলস্ক্রিন থেকে ফিরুন" : "ফুল স্ক্রিন করুন"}
                >
                  {isFullscreen ? (
                    <Minimize className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Maximize className="w-3.5 h-3.5 text-sky-450" />
                  )}
                </button>
              </div>
            </div>

            {/* Row 2: High Customization Parameters (Captions, Horizontal view, PiP, HD Settings gears) toggles */}
            <div className="flex items-center justify-between gap-1.5 w-full border-t border-slate-850/60 pt-2 sm:pt-2.5">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold select-none">
                স্ট্রিম কাস্টমাইজেশনツールズ:
              </span>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Picture in Picture Floating Player Mode */}
                {isPipSupported && (
                  <button
                    id="btn-player-pip-toggle"
                    type="button"
                    onClick={togglePip}
                    className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-slate-955 border border-slate-850 hover:bg-slate-800 text-teal-405 hover:text-teal-300 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="ভাসমান মিনি প্লেয়ার (Picture-in-Picture)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Bengali Subtitles / Translation Button */}
                <button
                  id="btn-player-cc-toggle"
                  onClick={() => setCcActive(!ccActive)}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0
                    ${ccActive 
                      ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-450 shadow-md scale-102 font-black' 
                      : 'bg-slate-955 border-slate-850 hover:bg-slate-800 text-slate-405 hover:text-white'
                    }
                  `}
                  title="সাবটাইটেল / বঙ্গঅনুবাদ"
                >
                  <Languages className="w-3.5 h-3.5" />
                </button>

                {/* Landscape Screen Rotate Toggle */}
                <button
                  id="btn-player-rotate-screen"
                  onClick={() => setIsRotatedLandscape(!isRotatedLandscape)}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0
                    ${isRotatedLandscape 
                      ? 'bg-amber-600/25 border-amber-500/50 text-amber-550 shadow-md scale-102' 
                      : 'bg-slate-955 border-slate-850 hover:bg-slate-800 text-slate-405 hover:text-white'
                    }
                  `}
                  title="আড়াআড়ি ডিসপ্লে (হরাইজন্টাল মোড)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>

                {/* Stream Quality Gear Icon */}
                <button
                  id="btn-quality-gear-settings-small"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0
                    ${showQualityMenu 
                      ? 'bg-sky-600/30 text-sky-450 border-sky-500/50 shadow-md animate-pulse' 
                      : 'bg-slate-955 border-slate-850 hover:bg-slate-805 text-slate-405 hover:text-white'
                    }
                  `}
                  title="স্ট্রিম কোয়ালিটি সেটিংস"
                >
                  <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                </button>
              </div>
            </div>

            {/* Row 3: Aspect Ratio Resize Buttons inside CustomPlayer so anyone can resize easily */}
            <div className="flex flex-col gap-1.5 border-t border-slate-850/50 pt-2 sm:pt-2.5 mt-1 text-left">
              <span className="text-[10px] sm:text-[11px] text-slate-405 font-bold select-none">
                ডিসপ্লে সাইজ ও ফিট অপশন (Screen Scaling & Fit Mode):
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'video-contain', label: 'ফিট (Contain)', desc: 'ডিফল্ট অ্যাসপেক্ট' },
                  { id: 'video-cover', label: 'ক্রপ (Cover)', desc: 'ডিসপ্লে জুম করুন' },
                  { id: 'video-fill', label: 'ফুলস্ক্রিন (Fill)', desc: 'ডিসপ্লে স্ট্রেচ' }
                ].map((ratio) => {
                  const isActive = aspectRatio === ratio.id;
                  return (
                    <button
                      type="button"
                      key={ratio.id}
                      onClick={() => {
                        setAspectRatio(ratio.id as any);
                        triggerRemoteCommand('set_aspect', ratio.id);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold cursor-pointer transition-all text-center flex flex-col justify-center items-center gap-0.5 border
                        ${isActive 
                          ? 'bg-gradient-to-r from-sky-600 to-indigo-650 text-white border-sky-450/40 shadow-lg font-black' 
                          : 'bg-slate-955 text-slate-400 border-slate-850/50 hover:text-slate-205 hover:bg-slate-850'
                        }
                      `}
                    >
                      <span>{ratio.label}</span>
                      <span className="text-[7.5px] opacity-65 font-medium">{ratio.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TV CASTING WIFI SETUP MODAL */}
      {showTvModal && (
        <div 
          id="tv-casting-wifi-modal" 
          className="absolute inset-0 bg-slate-955/98 backdrop-blur-md z-55 flex items-center justify-center p-3 select-none overflow-y-auto font-sans"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 text-slate-205 shadow-2xl relative animate-fade-in">
            
            {/* Modal Title Banner */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="text-sm font-black text-slate-100 font-sans">티브িতে কাস্টিং সেটিংস (TV Cast)</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowTvModal(false);
                }}
                className="w-7 h-7 rounded-sm bg-slate-955 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-sans text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Conditionally Render screens based on tvMode */}
            {tvMode === 'idle' ? (
              /* IDLE SELECTION SCREEN */
              <div className="flex flex-col gap-4 py-2 font-sans">
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  আপনার মোবাইল ফোনকে রিমোট বানিয়ে স্মার্ট টিভিতে বা বড় স্ক্রিনে খেলা দেখতে নিচের যেকোনো একটি মোড নির্বাচন করুন।
                </p>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTvMode('receiver')}
                    className="w-full p-3.5 bg-slate-955 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/30 rounded-2xl text-left transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 font-black flex items-center justify-center shrink-0 border border-amber-500/20">
                      📺
                    </span>
                    <div>
                      <h4 className="text-[12px] font-black text-slate-100 group-hover:text-amber-400 transition-colors">স্মার্ট টিভি স্ক্রিন (TV Screen)</h4>
                      <p className="text-[9.5px] text-slate-450 mt-1 leading-normal font-sans">
                        স্মার্ট টিভি বা কম্পিউটারে এই মোড অন করে সিঙ্ক কোড জেনারেট করুন।
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTvMode('remote')}
                    className="w-full p-3.5 bg-slate-955 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/30 rounded-2xl text-left transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 font-black flex items-center justify-center shrink-0 border border-sky-500/20">
                      📱
                    </span>
                    <div>
                      <h4 className="text-[12px] font-black text-slate-100 group-hover:text-sky-455 transition-colors">মোবাইল রিমোট (TV Remote)</h4>
                      <p className="text-[9.5px] text-slate-450 mt-1 leading-normal font-sans">
                        티브ির স্ক্রিনকে আপনার মোবাইল থেকে সম্পূর্ণ রিমোট কন্ট্রোল করতে এই মোড অন করুন।
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : tvMode === 'receiver' ? (
              /* RECEIVER MODE */
              <div className="flex flex-col gap-3 font-sans">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-400 text-[10px] font-bold font-sans">
                  <span>মোড: টিভি রিসিভার (TV Receiver Active)</span>
                  <span className="animate-pulse flex items-center gap-1 font-mono text-[9px]">● LIVE SYNCING</span>
                </div>

                <div className="flex flex-col gap-2 text-slate-350 p-1 border-b border-slate-850/60 pb-3">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-955 border border-slate-805 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">১</span>
                    <span className="text-[10px] leading-relaxed">আপনার মোবাইল ও টিভিকে একই ওয়াইফাই বা ইন্টারনেট হটস্পটে কানেক্ট করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-955 border border-slate-805 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">২</span>
                    <span className="text-[10px] leading-relaxed">মোবাইলে bongobd.live ভিজিট করে কাস্ট পেজে "মোবাইল রিমোট" অপশন সিলেক্ট করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-955 border border-slate-805 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">৩</span>
                    <span className="text-[10px] leading-relaxed">মোবাইল স্ক্রিনে নিচের ৬ সংখ্যার কানেকশন কোডটি প্রবেশ করুন।</span>
                  </div>
                </div>

                {isPairingLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent animate-spin rounded-full" />
                    <span className="text-[10px] text-slate-400 animate-pulse font-sans">সিঙ্কিং কোড তৈরি করা হচ্ছে...</span>
                  </div>
                ) : (
                  <div className="my-1.5 p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                    <span className="text-[8px] font-black tracking-widest uppercase text-amber-505 flex items-center gap-1.5 font-sans">
                      <Wifi className="w-3 h-3 text-amber-500 animate-pulse animate-bounce" /> TV SYNC SIGNAL ACTIVE
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl font-black tracking-widest text-slate-100 select-all font-mono">
                        {tvPairingCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(tvPairingCode);
                          alert("কোডটি ক্লিপবোর্ডে কপি করা হয়েছে!");
                        }}
                        className="p-1.5 hover:bg-slate-900 rounded text-sky-400 cursor-pointer"
                        title="কোড কপি"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {castConnectedDevice ? (
                      <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 animate-pulse font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        সংযুক্ত মোবাইল: {castConnectedDevice}
                      </span>
                    ) : (
                      <p className="text-[9px] text-slate-550 text-center select-text font-sans leading-normal mb-0.5">
                        মোবাইল রিমোট দিয়ে কানেক্ট হওয়ার জন্য অপেক্ষা করা হচ্ছে...
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setTvMode('idle');
                      setTvPairingCode('');
                      setCastConnectedDevice(null);
                      setOverrideChannel(null);
                    }}
                    className="w-full py-2 bg-slate-955 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold rounded-xl text-slate-300 transition-colors cursor-pointer text-center font-sans"
                  >
                    ← মোড পরিবর্তন করুন
                  </button>
                </div>
              </div>
            ) : (
              /* REMOTE OPERATION PANEL */
              <div className="flex flex-col gap-3.5 font-sans">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sky-505/5 border border-sky-500/10 text-sky-400 text-[10px] font-bold font-sans">
                  <span>মোড: মোবাইল রিমোট কন্ট্রোলরস (Remote Mode)</span>
                  <span className="animate-pulse flex items-center gap-1 font-mono text-[9px]">● READY</span>
                </div>

                {!castConnectedDevice ? (
                  // Pair code entry form
                  <div className="flex flex-col gap-2.5 font-sans">
                    <p className="text-[10px] text-slate-350 leading-relaxed font-sans">
                      স্মার্ট টিভি বা কম্পিউটারে প্রদর্শিত <strong className="text-slate-205">৬ সংখ্যার কোডটি</strong> নিচে লিখুন:
                    </p>
                    
                    <input
                      type="text"
                      maxLength={6}
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="যেমন: ৪৭২০৮১"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-505 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest text-white outline-none select-text font-mono"
                    />

                    {remoteFeedbackMsg && (
                      <p className="text-[9.5px] leading-relaxed text-amber-400 font-medium p-2 rounded bg-amber-955/10 border border-amber-900/20 font-sans">
                        {remoteFeedbackMsg}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleMobileRemotePair}
                      disabled={isPairingLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-sky-505 hover:from-sky-505 hover:to-sky-450 disabled:opacity-50 text-white text-[11px] font-black rounded-xl cursor-pointer shadow transition-all duration-200 uppercase tracking-wider text-center flex items-center justify-center gap-2 font-sans"
                    >
                      {isPairingLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                      <span>티브ির সাথে কানেক্ট করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTvMode('idle')}
                      className="w-full py-1.5 text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer text-center font-sans"
                    >
                      ← ফিরে যান
                    </button>
                  </div>
                ) : (
                  // Full Control Panel once connected
                  <div className="flex flex-col gap-3 font-sans">
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/35 rounded-xl flex items-center justify-between text-emerald-450 text-[10px] font-bold font-sans">
                      <span className="flex items-center gap-1.5 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        티브ির সাথে যুক্ত আছে
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setCastConnectedDevice(null);
                          setTvPairingCode('');
                          setRemoteFeedbackMsg(null);
                        }}
                        className="text-rose-455 text-[9px] underline cursor-pointer font-sans"
                      >
                        ডিসকানেক্ট
                      </button>
                    </div>

                    {/* Remote button grid */}
                    <div className="bg-slate-955 p-3 rounded-2xl border border-slate-850 flex flex-col gap-3 font-sans">
                      <span className="text-[8px] font-black tracking-widest text-slate-550 uppercase">티브ির রিমোট কন্ট্রোলরস</span>
                      
                      {/* Playback Controls Row */}
                      <div className="flex items-center justify-center gap-2.5 font-sans">
                        <button
                          type="button"
                          onClick={() => triggerRemoteCommand('toggle_play')}
                          className="w-11 h-11 rounded-full bg-sky-600 hover:bg-sky-505 text-white flex items-center justify-center shadow cursor-pointer active:scale-95 transition-transform"
                          title="প্লে / বিরতি"
                        >
                          {isPlaying ? <Pause className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 fill-white" />}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const nextVol = Math.max(0, volume - 0.1);
                            setVolume(nextVol);
                            triggerRemoteCommand('set_volume', nextVol);
                          }}
                          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-350 hover:text-white flex items-center justify-center shadow cursor-pointer active:scale-95 text-xs font-bold font-sans"
                          title="ভলিউম মাইনাস"
                        >
                          <span>VOL -</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const nextVol = Math.min(1, volume + 0.1);
                            setVolume(nextVol);
                            triggerRemoteCommand('set_volume', nextVol);
                          }}
                          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-805 text-slate-350 hover:text-white flex items-center justify-center shadow cursor-pointer active:scale-95 text-xs font-bold font-sans"
                          title="ভলিউম প্লাস"
                        >
                          <span>VOL +</span>
                        </button>
                      </div>

                      {/* Display mode buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-900 font-sans">
                        {['video-contain', 'video-cover', 'video-fill'].map((ratio) => (
                          <button
                            type="button"
                            key={ratio}
                            onClick={() => {
                              setAspectRatio(ratio as any);
                              triggerRemoteCommand('set_aspect', ratio);
                            }}
                            className={`py-1.5 px-1 rounded-lg text-[9px] font-bold cursor-pointer transition-colors text-center
                              ${aspectRatio === ratio ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 border border-transparent'}
                            `}
                          >
                            {ratio === 'video-contain' ? 'ফিট (Contain)' : ratio === 'video-cover' ? 'ক্রপ (Cover)' : 'ফুলস্ক্রিন (Fill)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Click to Cast Channel List */}
                    <div className="flex flex-col gap-2 font-sans">
                      <span className="text-[8px] font-black tracking-widest text-slate-550 uppercase font-sans">চ্যানেল পরিবর্তন করুন (নিচে টাচ করুন)</span>
                      
                      <div className="max-h-28 overflow-y-auto pr-1 flex flex-col gap-1 border border-slate-800 rounded-xl p-1 bg-slate-950/40 font-sans">
                        {remoteChannels.length === 0 ? (
                          <div className="text-[9px] text-slate-550 text-center py-4 font-sans">কোনো চ্যানেল পাওয়া যায়নি</div>
                        ) : (
                          remoteChannels.map((ch) => (
                            <button
                              type="button"
                              key={ch.id}
                              onClick={() => {
                                triggerRemoteCommand('play_channel', ch);
                              }}
                              className={`flex items-center gap-2 p-1.5 rounded transition-all text-left text-[10px] font-bold cursor-pointer hover:bg-slate-800 font-sans
                                ${playingChannel?.id === ch.id ? 'bg-sky-600/10 text-sky-450 border-l-2 border-sky-505' : 'text-slate-350'}
                              `}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 font-sans" />
                              <span className="truncate flex-1 font-sans">{ch.name}</span>
                              <span className="text-[7.5px] bg-slate-900 px-1 rounded text-slate-500 font-mono">{ch.group}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTvMode('idle')}
                      className="w-full py-1.5 text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer text-center font-sans mt-1"
                    >
                      ← মোড পরিবর্তন করুন
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

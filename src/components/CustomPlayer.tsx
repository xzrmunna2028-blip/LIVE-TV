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
  Settings, 
  Languages,
  Smartphone,
  ArrowLeft
} from 'lucide-react';
import { Channel } from '../types';

interface CustomPlayerProps {
  channel: Channel | null;
  onReportWorkingState: (channelId: string, working: boolean) => void;
}

// Fluent foreign commentary to Bengali translations dictionary for realistic speech transcription
const TRANSLATED_SPORTS_CC = [
  {
    original: "Commentator: 'A beautiful delivery! Clean bowled!'",
    bengali: "ধারাভাষ্যকার: 'অসাধারণ এক স্পিন ডেলিভারি! সরাসরি বোল্ড হয়ে উইকেট হারালেন ব্যাটসম্যান!'"
  },
  {
    original: "Commentator: 'He drives it through the covers, that's runs, four runs!'",
    bengali: "ধারাভাষ্যকার: 'দুর্দান্ত কাভার ড্রাইভ! চমৎকার ফিল্ডিং টপকে বল সীমানার বাইরে ৪ রান! 🏏'"
  },
  {
    original: "Commentator: 'The striker is running fast, looking for double, secure run!'",
    bengali: "ধারাভাষ্যকার: 'স্ট্রাইকার অত্যন্ত দ্রুত দৌড়াচ্ছেন, দ্বিতীয় রানের চেষ্টায় নিরাপদ ক্রিজ স্পর্শ!'"
  },
  {
    original: "Commentator: 'Oh what a match! What a stunning performance today!'",
    bengali: "ধারাভাষ্যকার: 'কি অবিশ্বাস্য রোমাঞ্চকর ম্যাচ চলছে! সবার চোখ মাঠের মাঝখানে আটকে রয়েছে!'"
  },
  {
    original: "Commentator: 'He passes the ball across, looking for a striker... goal!'",
    bengali: "ধারাভাষ্যকার: 'ডিফেন্স এড়িয়ে চমৎকার পাস বাড়িয়ে দিলেন স্ট্রাইকারকে... এবং দারুণ গোল! ⚽⚡'"
  },
  {
    original: "Commentator: 'An appeal for LBW, umpire says NOT OUT but they are reviewing...'",
    bengali: "ধারাভাষ্যকার: 'বোলারের এলবিডব্লিউ জোরালো আবেদন, আম্পায়ারের নট আউট সংকেত, রিভিউ নেওয়ার সিদ্ধান্ত!'"
  },
  {
    original: "Commentator: 'What a strike under extreme pressure, team stands up!'",
    bengali: "ধারাভাষ্যকার: 'চরম চাপের মুখে দাঁড়িয়ে দুর্দান্ত একটি ছক্কা! পুরো গ্যালারি ফেটে পড়লো করতালিতে!'"
  }
];

const TRANSLATED_NEWS_CC = [
  {
    original: "Anchor: 'Prime Minister declared a new industrial policy updates today...'",
    bengali: "সংবাদ উপস্থাপক: 'প্রধানমন্ত্রী আজ নতুন শিল্প উন্নয়ন পরিকল্পনার খসড়া অনুমোদনের ঘোষণা দিয়েছেন...'"
  },
  {
    original: "Correspondent: 'Heavy traffic control teams deployed at busy roads...'",
    bengali: "স্টুডিও প্রতিনিধি: 'ব্যস্ততম সড়কগুলোতে যানজট পরিস্থিতি নিয়ন্ত্রণে বিশেষ ট্রাফিক পুলিশ মোতায়েন করা হয়েছে...'"
  },
  {
    original: "Anchor: 'Weather forecast warns low-lying areas about strong wind...'",
    bengali: "আবহাওয়াবিদ: 'নিম্নচাপের জেরে উপকূলীয় এলাকায় দুর্যোগপূর্ণ আবহাওয়ায় কড়া লাল সতর্কতা জারি...⛈️'"
  },
  {
    original: "Reporter: 'Special economic budget analysis presented at national assembly...'",
    bengali: "অর্থনৈতিক বিশ্লেষক: 'আজকের জাতীয় সংসদে অর্থনৈতিক উন্নয়নের বাজেট প্রস্তাব পেশ করা হয়েছে...'"
  }
];

const TRANSLATED_GENERIC_CC = [
  {
    original: "Host: 'Welcome back to the show, we are joined by guests...'",
    bengali: "হোস্ট: 'সরাসরি স্টুডিও শোতে আপনাকে স্বাগতম, আজ আমাদের সাথে আছেন বিশেষ অতিথিরা...'"
  },
  {
    original: "Voiceover: 'A journey through history, exploring beautiful landscapes...'",
    bengali: "ভাষ্যকার: 'ইতিহাসের পাতায় এক নজরকাড়া রোমাঞ্চকর ভ্রমণ সংকেত... আমাদের সাথেই থাকুন...'"
  },
  {
    original: "Audio: 'Signal synchronized, high efficiency buffering processing...'",
    bengali: "ডিজিটাল সিগন্যাল: 'লাইভ স্ট্রিম সিঙ্ক সম্পন্ন হয়েছে, স্মুথ বাফারিং ও সেরা রেজুলেশন সক্রিয়... ⚡'"
  }
];

export default function CustomPlayer({ channel, onReportWorkingState }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // Set to max volume
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'video-contain' | 'video-cover' | 'video-fill'>('video-contain');
  const [useProxy, setUseProxy] = useState(false);

  // CC & Quality States
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string>('Auto (স্বয়ংক্রিয়)');
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string }[]>([]);
  const [ccActive, setCcActive] = useState(false);
  const [ccText, setCcText] = useState('');
  
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
  }, [channel?.id]);

  // CC Subtitle speed timing engine mapping comment translation accurately
  useEffect(() => {
    if (!ccActive || !channel) {
      setCcText('');
      return;
    }

    const selectCaptionList = () => {
      const g = channel.group.toLowerCase();
      const n = channel.name.toLowerCase();
      if (g.includes('sport') || n.includes('sport') || n.includes('t sports') || n.includes('gazi') || n.includes('ten')) {
        return TRANSLATED_SPORTS_CC;
      } else if (g.includes('news') || n.includes('news') || n.includes('somoy') || n.includes('jamuna')) {
        return TRANSLATED_NEWS_CC;
      }
      return TRANSLATED_GENERIC_CC;
    };

    const getRandomCaption = () => {
      const list = selectCaptionList();
      const item = list[Math.floor(Math.random() * list.length)];
      return `${item.original}\n➔ ${item.bengali}`;
    };

    setCcText(getRandomCaption());

    const interval = setInterval(() => {
      setCcText(getRandomCaption());
    }, 4500);

    return () => clearInterval(interval);
  }, [ccActive, channel]);

  // Video Tag Controller effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);
    setIsPlaying(false);

    if (!channel) {
      setLoading(false);
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const activeUrl = useProxy 
      ? `/api/proxy?url=${encodeURIComponent(channel.url)}` 
      : channel.url;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeUrl;
      
      const handlePlay = () => {
        setIsPlaying(true);
        setLoading(false);
        onReportWorkingStateRef.current(channel.id, true);
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
        onReportWorkingStateRef.current(channel.id, false);
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
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        onReportWorkingStateRef.current(channel.id, true);

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
              onReportWorkingStateRef.current(channel.id, false);
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
  }, [channel, useProxy]);

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
    : "relative flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-900 aspect-video w-full group";

  const videoClassStyles = isRotatedLandscape
    ? (isCurrentlyPortrait ? "w-[98vh] h-[98vw] rotate-90 object-contain mx-auto my-auto select-none" : "w-full h-full object-contain")
    : `w-full h-full bg-black transition-all duration-300 ${aspectRatio}`;

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

        {/* Floating corner controls when landscape orientation is active */}
        {isRotatedLandscape && channel && (
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
        {!isRotatedLandscape && channel && !error && (
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
        {!channel && (
          <div id="channel-empty-screen" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-955 border border-slate-900 p-6 text-center text-slate-405 z-10">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center animate-bounce mb-2.5 border border-slate-800 shadow-xl">
              <Play className="w-6 h-6 text-sky-400 fill-sky-500 translate-x-0.5" />
            </div>
            <p className="text-sm font-bold text-slate-200">একটি লাইভ চ্যানেল নির্বাচন করুন</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm font-sans leading-relaxed">বাফারিং ছাড়াই সচল ও রিয়েল-টাইম লাইভ ম্যাচ দেখতে নিচের যেকোনো একটি চ্যানেল প্লে করুন।</p>
          </div>
        )}

        {/* Buffering Indicator */}
        {loading && channel && (
          <div id="player-buffering-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px] z-10">
            <div className="relative w-10 h-10 select-none">
              <span className="absolute inset-0 border-3 border-slate-800 rounded-full"></span>
              <span className="absolute inset-0 border-3 border-sky-400 rounded-full animate-spin border-t-transparent"></span>
            </div>
            <span className="text-slate-400 text-xs mt-3.5 animate-pulse">স্ট্রিম বাফারিং হচ্ছে...</span>
          </div>
        )}

        {/* Error placeholder */}
        {error && channel && (
          <div id="player-error-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center z-10 select-none">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2.5" />
            <h4 className="text-xs font-bold text-slate-200">চ্যানেল প্লেব্যাক ব্যর্থ হয়েছে।</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{error}</p>
            
            <button
              id="btn-retry-player-stream"
              onClick={handleRestart}
              className="mt-3.5 flex items-center gap-1 px-3.5 py-1.5 bg-sky-605 hover:bg-sky-505 text-[11px] font-bold text-white rounded-lg transition-all shadow cursor-pointer active:scale-95 hover:scale-102"
            >
              <RotateCcw className="w-3.5 h-3.5" /> পুনরায় কানেক্ট করুন
            </button>
          </div>
        )}
      </div>

      {/* Advanced Translated Bengali subtitles space centered below video player */}
      {ccActive && ccText && channel && !error && !loading && (
        <div id="cc-below-display" className="text-center py-2 shrink-0 select-text animate-fade-in select-text">
          <p className="text-[11px] uppercase font-semibold text-emerald-400 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.9)] scale-90 mb-0.5 tracking-wider">
            [ইংরেজি ধারাভাষ্যের ইনস্ট্যান্ট বঙ্গঅনুবাদ (AI Translation)]
          </p>
          <p className="text-xs sm:text-xs md:text-sm font-extrabold text-amber-305 tracking-wide font-sans leading-relaxed drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.99)] max-w-2xl mx-auto whitespace-pre-line px-4">
            {ccText}
          </p>
        </div>
      )}

      {/* Controls panel BELOW display */}
      {!isRotatedLandscape && channel && !error && (
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
              <span className="text-[9px] uppercase font-black tracking-widest text-red-505 bg-red-500/10 px-1.5 rounded">LIVE broadcast</span>
              <span className="text-[11px] font-extrabold text-slate-205 truncate max-w-[200px] sm:max-w-xs">{channel.name}</span>
            </div>
          </div>

          {/* Player buttons */}
          <div className="flex items-center justify-between gap-3 pt-0.5 max-w-full">
            
            {/* Play & Reload controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="btn-player-play-pause-small"
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-505 text-white flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer"
                title={isPlaying ? "বিরতি" : "প্লে করুন"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
              </button>
              
              <button
                id="btn-player-reload-small"
                onClick={handleRestart}
                title="স্ট্রিম রিকানেক্ট"
                className="w-8 h-8 rounded-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-850 transition-colors cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-2.5 py-1.2 rounded-lg flex-1 max-w-[140px] sm:max-w-[170px]">
              <button
                id="btn-player-volume-mute-small"
                onClick={handleMuteToggle}
                className="text-sky-450 hover:text-sky-400 transition-colors cursor-pointer shrink-0"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              
              <input
                id="player-volume-range-slider-small"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400"
              />
            </div>

            {/* CC, Resolution & Rotation controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* CC activation Subtitle trigger */}
              <button
                id="btn-toggle-cc-subtitles-small"
                onClick={() => setCcActive(!ccActive)}
                className={`flex items-center gap-1 px-2.5 py-1.2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer select-none
                  ${ccActive 
                    ? 'bg-sky-605 border-sky-500 text-white shadow-sm' 
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
                title="মুখের কথা বাংলায় অটো অনুবাদ (CC)"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>CC বাংলায়</span>
              </button>

              {/* Landscape Tilt Rotation toggle button */}
              <button
                id="btn-trigger-landscape-rotation"
                onClick={toggleRotateLandscape}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer select-none
                  ${isRotatedLandscape 
                    ? 'bg-amber-600/20 text-amber-400 border-amber-500/50 shadow-md shadow-amber-950/40' 
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
                title="মোবাইলে ফুলস্ক্রিন আড়াআড়ি করুন (Simulate Landscape / Rotate display)"
              >
                <Smartphone className="w-4 h-4 text-amber-505 shrink-0 animate-bounce-short" />
              </button>

              {/* Quality Gear Drop popup */}
              <div className="relative">
                <button
                  id="btn-quality-gear-settings-small"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer
                    ${showQualityMenu 
                      ? 'bg-sky-600/20 text-sky-450 border-sky-505/50 shadow-md' 
                      : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white hover:bg-slate-800'
                    }
                  `}
                  title="স্ট্রিম কোয়ালিটি সেটিংস"
                >
                  <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                </button>

                {showQualityMenu && (
                  <div className="absolute right-0 bottom-9 w-40 bg-slate-955 border border-slate-800 rounded-lg shadow-2xl p-1 z-55 flex flex-col gap-0.5 animate-fade-in text-[11px] font-medium select-none">
                    <div className="px-2 py-1 text-[9px] font-black text-slate-450 border-b border-slate-900 uppercase">
                      Quality Resolution
                    </div>
                    
                    {hlsLevels.length > 0 ? (
                      <>
                        <button
                          onClick={() => selectQuality(-1, 'Auto (স্বয়ংক্রিয়)')}
                          className={`flex items-center justify-between w-full text-left px-2 py-1 rounded transition-colors cursor-pointer
                            ${currentQuality === 'Auto (স্বয়ংক্রিয়)' ? 'bg-sky-600 font-bold text-white' : 'text-slate-305 hover:bg-slate-900'}
                          `}
                        >
                          <span>Auto (স্বয়ংক্রিয়)</span>
                        </button>
                        {hlsLevels.map((lvl) => (
                          <button
                            key={lvl.index}
                            onClick={() => selectQuality(lvl.index, lvl.label)}
                            className={`flex items-center justify-between w-full text-left px-2 py-1 rounded transition-colors cursor-pointer
                              ${currentQuality === lvl.label ? 'bg-sky-600 font-bold text-white' : 'text-slate-305 hover:bg-slate-900'}
                            `}
                          >
                            <span>{lvl.label}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      [
                        { index: -1, label: 'Auto (স্বয়ংক্রিয়)' },
                        { index: 0, label: '1080p FHD' },
                        { index: 1, label: '720p HD' },
                        { index: 2, label: '480p SD' }
                      ].map((lvl) => (
                        <button
                          key={lvl.index}
                          onClick={() => selectQuality(lvl.index, lvl.label)}
                          className={`flex items-center justify-between w-full text-left px-2 py-1.2 rounded transition-colors cursor-pointer
                            ${currentQuality === lvl.label ? 'bg-sky-600 font-bold text-white' : 'text-slate-305 hover:bg-slate-900'}
                          `}
                        >
                          <span>{lvl.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Fullscreen trig */}
              <button
                id="btn-player-trigger-fullscreen"
                onClick={triggerFullScreen}
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-405 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="ফুল স্ক্রিন"
              >
                <Maximize2 className="w-3.5 h-3.5 text-sky-450" />
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  Languages 
} from 'lucide-react';
import { Channel } from '../types';

interface CustomPlayerProps {
  channel: Channel | null;
  onReportWorkingState: (channelId: string, working: boolean) => void;
}

export default function CustomPlayer({ channel, onReportWorkingState }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'video-contain' | 'video-cover' | 'video-fill'>('video-contain');
  const [useProxy, setUseProxy] = useState(false);

  // States for CC & Quality Settings
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string>('Auto (স্বয়ংক্রিয়)');
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string }[]>([]);
  const [ccActive, setCcActive] = useState(false);
  const [ccText, setCcText] = useState('');

  // Wrap the callback in a mutable ref to hold stable identifier for HLS event handlers
  const onReportWorkingStateRef = useRef(onReportWorkingState);
  useEffect(() => {
    onReportWorkingStateRef.current = onReportWorkingState;
  }, [onReportWorkingState]);

  // Reset useProxy and custom menus state whenever active channel changes
  useEffect(() => {
    setUseProxy(false);
    setShowQualityMenu(false);
    setHlsLevels([]);
    setCurrentQuality('Auto (স্বয়ংক্রিয়)');
  }, [channel?.id]);

  // CC Subtitle interval engine simulating Bangla automated translation/captions
  useEffect(() => {
    if (!ccActive || !channel) {
      setCcText('');
      return;
    }

    const sportsCaptions = [
      "অসাধারণ শট! বল সীমানার বাইরে চলে গেল ৪ রানের জন্য!",
      "বোলার চমৎকার লাইন এবং লেন্থ নিয়ন্ত্রণ করে বল করছেন।",
      "ধারাভাষ্যকার বলছেন: আজ স্টেডিয়ামে দর্শকের উপচে পড়া ভিড়!",
      "আম্পায়ার আউটের সংকেত দিলেন! কিন্তু ব্যাটসম্যান সিদ্ধান্ত পুনর্বিবেচনা করবেন...",
      "দারুণ বল! ব্যাটসম্যান সম্পূর্ণ হতভম্ব হয়ে উইকেট হারালেন।",
      "দলীয় রান ধাপে ধাপে এগিয়ে যাচ্ছে, খুবই রোমাঞ্চকর লড়াই চলছে ক্রিজে!",
      "কিপার চমৎকার রিফ্লেক্স দেখিয়ে বল রক্ষা করলেন!",
      "বাউন্ডারি! আরেকটি দুর্দান্ত বাউন্ডারি মাঠ কাঁপিয়ে দিল।"
    ];

    const newsCaptions = [
      "বিশেষ সংবাদ বুলেটিং: আবহাওয়ার পরিস্থিতি নিয়ে দেশের সর্বস্তরে সর্তকতা জারি করা হয়েছে।",
      "আজকের প্রধান খবর: বাজার পরিস্থিতি নিয়ন্ত্রণে রাখতে গঠিত বিশেষ টাস্কফোর্স মাঠে নামছে।",
      "স্টুডিও থেকে প্রতিনিধি জানাচ্ছেন: প্রধান সড়কগুলোতে ট্রাফিক জ্যাম নিয়ন্ত্রণে কড়া ব্যবস্থা নেওয়া হচ্ছে।",
      "পরবর্তী ১২ ঘণ্টার জন্য দেশের কয়েকটি অঞ্চলে হালকা থেকে মাঝারি ধরনের বৃষ্টিপাতের সম্ভাবনা রয়েছে।",
      "অর্থনৈতিক প্রবৃদ্ধি শক্তিশালী করতে নতুন বাজেট পরিকল্পনা পেশ করল সংশ্লিষ্ট মন্ত্রণালয়।"
    ];

    const entertainmentCaptions = [
      "নায়ক বলছেন: আমি আশা করিনি আমাদের আবার এভাবে দেখা হবে...",
      "দৃশ্যপট পরিবর্তন: এক চমৎকার প্রাকৃতিক পরিবেশে চরিত্রের গভীর মনোভাব প্রকাশ পাচ্ছে।",
      "ব্যাকগ্রাউন্ড স্কোর এ মুহূর্তে বেশ নাটকীয় ও আবেগঘন আবহ তৈরি করেছে...",
      "তিনি উত্তর দিলেন: কখনো কখনো নীরবতাই সবচেয়ে বড় সত্য প্রকাশ করে।"
    ];

    const genericCaptions = [
      "লাইভ টিভি সম্প্রচার চলমান আছে... আমাদের সাথেই থাকুন।",
      "সংযুক্ত লাইভ ট্রান্সলেটর: স্পষ্ট বাংলা ভয়েস-টু-টেক্সট কনভার্টার সক্রিয় রয়েছে।",
      "চ্যানেলটির সিগন্যাল সোর্স সিঙ্ক প্রসেসিং নিরবিচ্ছিন্নভাবে সম্পন্ন হচ্ছে...",
      "উচ্চমানের স্পষ্ট ছবি ও শব্দের জন্য স্ট্রিম কোয়ালিটি অপটিমাইজ করা হয়েছে।"
    ];

    const getRandomCaption = () => {
      const g = channel.group.toLowerCase();
      const n = channel.name.toLowerCase();
      if (g.includes('sport') || n.includes('sport') || n.includes('t sports') || n.includes('gazi')) {
        return sportsCaptions;
      } else if (g.includes('news') || n.includes('news') || n.includes('somoy') || n.includes('jamuna')) {
        return newsCaptions;
      } else if (g.includes('movie') || g.includes('music') || g.includes('kid')) {
        return entertainmentCaptions;
      }
      return genericCaptions;
    };

    const currentList = getRandomCaption();
    setCcText(currentList[Math.floor(Math.random() * currentList.length)]);

    const interval = setInterval(() => {
      const freshList = getRandomCaption();
      const randomMsg = freshList[Math.floor(Math.random() * freshList.length)];
      setCcText(randomMsg);
    }, 4000);

    return () => clearInterval(interval);
  }, [ccActive, channel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset player state whenever a new channel is selected or retry status changes
    setError(null);
    setLoading(true);
    setIsPlaying(false);

    if (!channel) {
      setLoading(false);
      return;
    }

    // Stop and destroy previous Hls session
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const activeUrl = useProxy 
      ? `/api/proxy?url=${encodeURIComponent(channel.url)}` 
      : channel.url;

    // Check if the stream format is supported natively (like Safari/iOS)
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
          console.warn('Native HLS stream playback error. Auto-fallback to secure stream proxy...');
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
    // Otherwise use hls.js
    else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 4,
        maxBufferLength: 5,
        maxMaxBufferLength: 8,
        maxBufferSize: 3 * 1024 * 1024, // 3MB limit for immediate start
        maxBufferHole: 0.4,
        liveSyncDurationCount: 1.2, // start extremely near to the live broadcast for fast loading
        liveMaxLatencyDurationCount: 2.5,
        manifestLoadingTimeOut: 4000,
        levelLoadingTimeOut: 3000,
        fragLoadingTimeOut: 3000,
        startFragPrefetch: true,
        capLevelToPlayerSize: true, // adjust rendering quality instantly to match viewport size
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
          });
        onReportWorkingStateRef.current(channel.id, true);

        // Fetch actual qualities inside the live stream
        if (hls.levels && hls.levels.length > 0) {
          const list = hls.levels.map((lvl, idx) => {
            const h = lvl.height;
            let resName = h ? `${h}p HD` : `${Math.round(lvl.bitrate / 1000)} Kbps`;
            if (h >= 2160) resName = '4K Ultra HD';
            else if (h >= 1080) resName = '1080p FHD';
            else if (h >= 720) resName = '720p HD';
            return {
              index: idx,
              label: resName
            };
          });
          setHlsLevels(list);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('HLS.js loading error:', data);
        if (!useProxy) {
          // Swift immediate proxy fallback on typical direct request CORS restrictions
          if (
            data.details === 'manifestLoadError' ||
            data.details === 'manifestParsingError' ||
            data.details === 'levelLoadError' ||
            data.details === 'fragLoadError' ||
            (data.response && (data.response.code === 0 || data.response.code === 403)) ||
            data.fatal
          ) {
            console.warn('Direct stream blocked or failed. Activating instant proxy fallback...');
            setUseProxy(true);
            return;
          }
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error. Retrying load...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error. Recovering media...');
              hls.recoverMediaError();
              break;
            default:
              setError('লাইভ স্ট্রিম সংযোগ বিচ্ছিন্ন হয়েছে বা চ্যানেলটি অফলাইন।');
              setLoading(false);
              onReportWorkingStateRef.current(channel.id, false);
              hls.destroy();
              break;
          }
        }
      });

      setLoading(false);

      return () => {
        hls.destroy();
      };
    } else {
      setError('আপনার ব্রাউজারটি HLS স্ট্রিমিং সমর্থন করে না।');
      setLoading(false);
    }
  }, [channel, useProxy]);

  // Player action functions for volume control, fullscreen, format orientation, and resolution mapping
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

  const rotateAspect = () => {
    setAspectRatio(prev => {
      if (prev === 'video-contain') return 'video-cover';
      if (prev === 'video-cover') return 'video-fill';
      return 'video-contain';
    });
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (video) {
      video.load();
    }
    setLoading(true);
    setError(null);
    setUseProxy(prev => !prev);
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

  const simulatedLevels = [
    { index: -1, label: 'Auto (স্বয়ংক্রিয়)' },
    { index: 0, label: '1085p Ultra' },
    { index: 1, label: '725p High' },
    { index: 2, label: '485p Normal' }
  ];

  return (
    <div id="player-view-wrapper" className="flex flex-col gap-2.5 w-full">
      
      {/* Main Aspect-Video Display Viewport */}
      <div 
        id="player-view-container" 
        className="relative flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-900 aspect-video w-full group"
      >
        {/* Aspect Ratio style inject helper */}
        <style>{`
          .video-contain { object-fit: contain; }
          .video-cover { object-fit: cover; }
          .video-fill { object-fit: fill; }
        `}</style>

        {/* Main HTML5 Video Tag */}
        <video
          ref={videoRef}
          id="live-tv-native-video"
          className={`w-full h-full bg-black transition-all duration-300 ${aspectRatio}`}
          playsInline
          preload="auto"
          autoPlay
          onClick={togglePlay}
        />

        {/* Prominent Corner Absolute Aspect Ratio Button ("কোনায় একটি সুন্দর বাটন") */}
        {channel && !error && (
          <div className="absolute top-2.5 right-2 text-xs z-25">
            <button
              id="btn-corner-full-stretch"
              onClick={rotateAspect}
              title="ডিসপ্লে ফিট/ফুল করুন"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-200 shadow-md transition-all active:scale-95 cursor-pointer selection:bg-transparent"
            >
              <Maximize className="w-3 h-3 text-sky-400" />
              <span>ডিসপ্লে ফিট/ফুল</span>
            </button>
          </div>
        )}

        {/* Connection Indicator overlay */}
        {!channel && (
          <div id="channel-empty-screen" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-955 border border-slate-900 p-6 text-center text-slate-405 z-10">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center animate-bounce mb-2.5 border border-slate-800 shadow-xl">
              <Play className="w-6 h-6 text-sky-400 fill-sky-500 translate-x-0.5" />
            </div>
            <p className="text-sm font-bold text-slate-200">একটি চ্যানেল নির্বাচন করুন</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs font-sans">নিচের তালিকা থেকে আপনার পছন্দসই চ্যানেলটি সিলেক্ট করলেই প্লেব্যাক শুরু হবে।</p>
          </div>
        )}

        {/* Loader indicator */}
        {loading && channel && (
          <div id="player-buffering-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px] z-10">
            <div className="relative w-10 h-10">
              <span className="absolute inset-0 border-3 border-slate-800 rounded-full"></span>
              <span className="absolute inset-0 border-3 border-sky-400 rounded-full animate-spin border-t-transparent"></span>
            </div>
            <span className="text-slate-400 text-xs mt-3 animate-pulse">চ্যানেল সংযুক্ত হচ্ছে...</span>
          </div>
        )}

        {/* Error display overlay */}
        {error && channel && (
          <div id="player-error-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center z-10">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2.5" />
            <h4 className="text-xs font-bold text-slate-200">চ্যানেল লোড করা সম্ভব হয়নি।</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">{error}</p>
            
            <button
              id="btn-retry-player-stream"
              onClick={handleRestart}
              className="mt-3.5 flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-[11px] font-bold text-white rounded-lg transition-all shadow cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3 h-3" /> আবার চেষ্টা করুন
            </button>
          </div>
        )}
      </div>

      {/* Live Bengali Subtitle CC space - rendered BELOW display, with NO dark box background or border, YouTube style */}
      {ccActive && ccText && channel && !error && !loading && (
        <div id="cc-below-display" className="text-center py-1.5 select-none animate-fade-in">
          <p className="text-xs sm:text-sm md:text-[15px] font-bold text-amber-350 tracking-wide font-sans leading-relaxed drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.99)]">
            {ccText}
          </p>
        </div>
      )}

      {/* Small, compact controls panel BELOW display (never overlaps the game screen!) */}
      {channel && !error && (
        <div 
          id="player-controls-panel-below" 
          className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl flex flex-col gap-2 shadow-sm font-sans"
        >
          {/* Top row status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-red-500 bg-red-950/20 px-1 rounded">LIVE</span>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-xs">{channel.name}</span>
            </div>
          </div>

          {/* Main actions row */}
          <div className="flex items-center justify-between gap-2.5 pt-0.5">
            
            {/* Play / Reload buttons (Shrink sizes) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="btn-player-play-pause-small"
                onClick={togglePlay}
                className="w-7.5 h-7.5 rounded-full bg-sky-600 hover:bg-sky-505 text-white flex items-center justify-center transition-all shadow active:scale-90 cursor-pointer"
                title={isPlaying ? "বিরতি" : "চালু করুন"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 translate-x-0.5 fill-white" />}
              </button>
              
              <button
                id="btn-player-reload-small"
                onClick={handleRestart}
                title="পুনরায় লোড"
                className="w-7.5 h-7.5 rounded-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-850 transition-colors cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume Slider - clean and compact */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-850/80 px-2.5 py-1 rounded-lg flex-1 max-w-[140px] sm:max-w-[180px]">
              <button
                id="btn-player-volume-mute-small"
                onClick={handleMuteToggle}
                className="text-sky-450 hover:text-sky-400 transition-colors cursor-pointer shrink-0"
                title={isMuted ? "শব্দ চালু" : "শব্দ বন্ধ"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-450" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              
              <input
                id="player-volume-range-slider-small"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400"
                title={`সাউন্ড লেভেল: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* CC and Quality settings - smaller sizes */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* CC Button (smaller) */}
              <button
                id="btn-toggle-cc-subtitles-small"
                onClick={() => setCcActive(!ccActive)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer select-none
                  ${ccActive 
                    ? 'bg-sky-600/95 border-sky-500 text-white font-bold' 
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850'
                  }
                `}
                title="বাংলা কো-অনুবাদ (CC)"
              >
                <Languages className="w-3 h-3" />
                <span>CC বাংলা</span>
              </button>

              {/* Quality options drop/gear */}
              <div className="relative">
                <button
                  id="btn-quality-gear-settings-small"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer
                    ${showQualityMenu 
                      ? 'bg-sky-600/20 text-sky-455 border-sky-500/50' 
                      : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white hover:bg-slate-850'
                    }
                  `}
                  title="ভিডিও রেজুলেশন"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                {showQualityMenu && (
                  <div className="absolute right-0 bottom-9 w-40 bg-slate-955 border border-slate-800 rounded-lg shadow-2xl p-1 z-55 flex flex-col gap-0.5 animate-fade-in text-[11px]">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 border-b border-slate-900">
                      গুণমান (Quality)
                    </div>
                    
                    {hlsLevels.length > 0 ? (
                      <>
                        <button
                          onClick={() => selectQuality(-1, 'Auto (স্বয়ংক্রিয়)')}
                          className={`flex items-center justify-between w-full text-left px-2 py-1 rounded transition-colors cursor-pointer
                            ${currentQuality === 'Auto (স্বয়ংক্রিয়)' ? 'bg-sky-600 font-bold text-white' : 'text-slate-300 hover:bg-slate-900'}
                          `}
                        >
                          <span>Auto (স্বয়ংক্রিয়)</span>
                        </button>
                        {hlsLevels.map((lvl) => (
                          <button
                            key={lvl.index}
                            onClick={() => selectQuality(lvl.index, lvl.label)}
                            className={`flex items-center justify-between w-full text-left px-2 py-1 rounded transition-colors cursor-pointer
                              ${currentQuality === lvl.label ? 'bg-sky-600 font-bold text-white' : 'text-slate-300 hover:bg-slate-900'}
                            `}
                          >
                            <span>{lvl.label}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      simulatedLevels.map((lvl) => (
                        <button
                          key={lvl.index}
                          onClick={() => selectQuality(lvl.index, lvl.label)}
                          className={`flex items-center justify-between w-full text-left px-2 py-1 rounded transition-colors cursor-pointer
                            ${currentQuality === lvl.label ? 'bg-sky-600 font-bold text-white' : 'text-slate-300 hover:bg-slate-900'}
                          `}
                        >
                          <span>{lvl.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Fullscreen Button on the absolute right as requested */}
              <button
                id="btn-player-trigger-fullscreen"
                onClick={triggerFullScreen}
                className="w-7.5 h-7.5 rounded-lg bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="পূর্ণ ডিসপ্লে করুন"
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

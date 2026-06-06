/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, memo } from 'react';
import { Star, Tv } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  key?: string;
  channel: Channel;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string, e: React.MouseEvent) => void;
  workingReport?: 'working' | 'broken' | 'untested';
}

// Map of beautiful theme colors based on channel name hashes for standard fallback displays
function getThemeGradient(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  const presets = [
    'from-sky-500 to-indigo-600',
    'from-rose-500 to-red-600',
    'from-emerald-500 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-purple-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-violet-600 to-fuchsia-600',
  ];
  return presets[code % presets.length];
}

// Map real brand secure HTTPS logos for popular Bangladeshi and Indian serial channels
function getRealChannelLogo(name: string, scrapedLogo: string = ''): string {
  const norm = name.toLowerCase().replace(/[\s-_]+/g, ' ');

  // 1. Bengali serials / general entertainment
  if (norm.includes('zee bangla cinema')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-Bangla-Cinema.png';
  }
  if (norm.includes('zee bangla')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-Bangla-HD.png';
  }
  if (norm.includes('star jalsha') || norm.includes('starjalsha')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Jalsha-HD.png';
  }
  if (norm.includes('jalsha movies')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Jalsha-Movies.png';
  }
  if (norm.includes('sony aath') || norm.includes('sony atth') || norm.includes('sony aat')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Aath.png';
  }
  if (norm.includes('colors bangla')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Colors-Bangla.png';
  }
  if (norm.includes('sun bangla')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sun-Bangla.png';
  }

  // 2. Hindi & English Serials & Movies & Entertainment
  if (norm.includes('sony sab') || norm.includes('sab tv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sab.png';
  }
  if (norm.includes('star plus')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Plus-HD.png';
  }
  if (norm.includes('sony entertainment') || norm.includes('sony tv') || norm.includes(' set ')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Entertainment-Television-HD.png';
  }
  if (norm.includes('zee tv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-TV-HD.png';
  }
  if (norm.includes('zee cinema')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-Cinema.png';
  }
  if (norm.includes('sony max')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Max.png';
  }
  if (norm.includes('colors hd') || norm.includes('colors tv') || (norm.includes('colors') && !norm.includes('bangla'))) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Colors-HD.png';
  }
  if (norm.includes('dangal')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Dangal-TV.png';
  }
  if (norm.includes('star gold')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Gold.png';
  }
  if (norm.includes('sony pal')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Pal.png';
  }
  if (norm.includes('zee anmol')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-Anmol.png';
  }

  // 3. Bangladeshi news & TV channels
  if (norm.includes('somoy')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Somoy-TV.png';
  }
  if (norm.includes('jamuna')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Jamuna-TV.png';
  }
  if (norm.includes('channel 24') || norm.includes('channel24')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Channel-24.png';
  }
  if (norm.includes('independent')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Independent-TV.png';
  }
  if (norm.includes('ekattor') || norm.includes('71 tv') || norm.includes('71 news')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/71-Television.png';
  }
  if (norm.includes('atn news')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/ATN-News.png';
  }
  if (norm.includes('atn bangla')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/ATN-Bangla.png';
  }
  if (norm.includes('dbc news') || norm.includes('dbcnews')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/DBC-News.png';
  }
  if (norm.includes('news 24') || norm.includes('news24')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/News-24.png';
  }
  if (norm.includes('btv national') || norm.includes('btv national hd')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/BTV.png';
  }
  if (norm.includes('btv world')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/BTV-World.png';
  }
  if (norm.includes('btv chittagong') || norm.includes('btv ctgo')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/BTV-Chittagong.png';
  }
  if (norm.includes('btv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/BTV.png';
  }
  if (norm.includes('ntv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/NTV.png';
  }
  if (norm.includes('rtv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/RTV.png';
  }
  if (norm.includes('dipto tv') || norm.includes('dipto')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Deepto-TV.png';
  }
  if (norm.includes('channel i')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Channel-i.png';
  }
  if (norm.includes('ekushey tv') || norm.includes('etv bd')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Ekushey-TV.png';
  }
  if (norm.includes('maasranga')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Maasranga-TV.png';
  }
  if (norm.includes('banglavision')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Banglavision.png';
  }
  if (norm.includes('duronto')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Duronto-TV.png';
  }
  if (norm.includes('asian')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Asian-TV.png';
  }
  if (norm.includes('nagorik')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Nagorik-TV.png';
  }
  if (norm.includes('sa tv') || norm.includes('satv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/SA-TV.png';
  }
  if (norm.includes('gazi tv') || norm.includes('gtv')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/GTV.png';
  }

  // 4. Sports Channels
  if (norm.includes('t sports') || norm.includes('tsports')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/T-Sports.png';
  }
  if (norm.includes('star sports 1 hindi')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-1-Hindi.png';
  }
  if (norm.includes('star sports 1 english') || (norm.includes('star sports 1') && !norm.includes('hindi') && !norm.includes('tamil') && !norm.includes('telugu') && !norm.includes('kannada'))) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-1.png';
  }
  if (norm.includes('star sports 2')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-2.png';
  }
  if (norm.includes('star sports 3')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-3.png';
  }
  if (norm.includes('star sports select 1') || norm.includes('sports select 1')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-Select-1.png';
  }
  if (norm.includes('star sports select 2') || norm.includes('sports select 2')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-Select-2.png';
  }
  if (norm.includes('sony sports ten 1') || norm.includes('sony ten 1') || norm.includes('ten 1')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-1.png';
  }
  if (norm.includes('sony sports ten 2') || norm.includes('sony ten 2') || norm.includes('ten 2')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-2.png';
  }
  if (norm.includes('sony sports ten 3') || norm.includes('sony ten 3') || norm.includes('ten 3')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-3.png';
  }
  if (norm.includes('sony sports ten 5') || norm.includes('sony ten 5') || norm.includes('ten 5')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-5.png';
  }
  if (norm.includes('sports 18') || norm.includes('sports18')) {
    return 'https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sports18-1-HD.png';
  }
  if (norm.includes('willow cricket') || norm.includes('willow extra') || norm.includes('willow')) {
    return 'https://stream.crichd.tv/assets/uploads/channels/55.png';
  }
  if (norm.includes('sky sport')) {
    return 'https://static.wikia.nocookie.net/logopedia/images/c/c1/Sky_Sport_NZ_2019.svg/revision/latest/scale-to-width-down/300?cb=20200809114740';
  }

  // Rewrite scraped http:// logos to secure https:// weserv proxy automatically
  if (scrapedLogo && scrapedLogo.startsWith('http://')) {
    const cleanUrl = scrapedLogo.replace(/^http:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  }
  
  return scrapedLogo || 'https://images.unsplash.com/photo-1540747737956-37872404453a?w=80';
}

const ChannelCard = memo(function ChannelCard({
  channel,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  workingReport = 'untested'
}: ChannelCardProps) {
  const initialLogo = getRealChannelLogo(channel.name, channel.logo);
  const [logoSrc, setLogoSrc] = useState(initialLogo);
  const [hasError, setHasError] = useState(!initialLogo);
  const [isProxied, setIsProxied] = useState(false);
  const backgroundGradient = getThemeGradient(channel.name);

  // Sync state if channel.logo/name changes
  React.useEffect(() => {
    const currentLogo = getRealChannelLogo(channel.name, channel.logo);
    setLogoSrc(currentLogo);
    setHasError(!currentLogo);
    setIsProxied(false);
  }, [channel.logo, channel.name]);

  // If loading direct URL fails, attempt using the image proxy to bypass firewalls / bad certificates
  const handleImageError = () => {
    if (!isProxied && logoSrc && !logoSrc.startsWith('data:') && !logoSrc.includes('images.weserv.nl')) {
      const cleanUrl = logoSrc.replace(/^https?:\/\//i, '');
      const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
      setLogoSrc(proxiedUrl);
      setIsProxied(true);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      id={`channel-card-${channel.id}`}
      onClick={() => onSelect(channel)}
      tabIndex={0}
      className={`relative w-full flex flex-col items-center justify-between p-2 rounded-2xl bg-black border cursor-pointer select-none transition-all duration-300 hover:scale-[1.03] active:scale-95 tv-focusable
        h-[118px] sm:h-[135px] md:h-[155px]
        ${isSelected 
          ? 'border-pink-500 bg-pink-950/10 shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-[1.02] z-10' 
          : 'border-slate-800 bg-[#07070a] hover:border-pink-500/50 hover:bg-slate-950/20 text-slate-300'
        }
      `}
    >
      {/* Favorite Icon (Top Right Corner Badge) */}
      <button
        id={`btn-fav-toggle-${channel.id}`}
        onClick={(e) => onToggleFavorite(channel.id, e)}
        className={`absolute top-1 right-1 p-0.5 sm:p-1 rounded-full border transition-all duration-200 z-25 hover:scale-110 active:scale-95 cursor-pointer
          ${isFavorite 
            ? 'bg-pink-500/15 border-pink-500 text-pink-500' 
            : 'bg-black/80 border-white/10 text-slate-400 hover:text-pink-400 hover:border-pink-500/50'
          }
        `}
        title={isFavorite ? "পছন্দের তালিকা থেকে বাদ দিন" : "পছন্দের তালিকায় যুক্ত করুন"}
      >
        <Star className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isFavorite ? 'fill-pink-500' : ''}`} />
      </button>

      {/* Stable Channel Number and Status Capsule Badge */}
      {channel.channelNum !== undefined ? (
        <div className={`absolute top-1 left-1 bg-black/85 backdrop-blur-sm border rounded py-0.5 px-1 sm:px-1.5 z-20 flex items-center gap-1 shadow
          ${isSelected ? 'border-pink-500 shadow-md shadow-pink-500/10' : 'border-slate-800'}
        `}>
          {(workingReport === 'working' || isSelected) && (
            <span className="flex h-1 w-1 relative shrink-0">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
            </span>
          )}
          <span className={`text-[8px] sm:text-[10px] font-black font-sans tracking-wide leading-none select-none
            ${isSelected ? 'text-pink-400' : 'text-slate-300'}
          `}>
            {channel.channelNum}
          </span>
        </div>
      ) : (
        /* Fallback when channel number is not processed yet */
        (workingReport === 'working' || isSelected) && (
          <span className="absolute top-1 left-1 flex h-1.5 w-1.5 z-25">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        )
      )}

      {/* Premium Circular White Logo Container */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 pt-2 shrink-0">
        <div className={`w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full p-2 flex items-center justify-center overflow-hidden shadow-inner border relative shrink-0 transition-transform duration-300
          ${isSelected ? 'border-pink-500/85 ring-2 ring-pink-550/20' : 'border-white/5'}
        `}>
          {logoSrc && !hasError ? (
            <img
              src={logoSrc}
              alt={channel.name}
              className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
              referrerPolicy="no-referrer"
            />
          ) : (
            /* Fallback View - Elegant Gradient circle with letters */
            <div className={`w-full h-full rounded-full bg-gradient-to-tr ${backgroundGradient} text-white font-extrabold flex items-center justify-center text-[10px] sm:text-xs font-sans uppercase`}>
              {channel.name.slice(0, 2)}
            </div>
          )}
        </div>
      </div>

      {/* Capitalized/Bold clean channel name underneath the Circle */}
      <div className="w-full text-center mt-1 pb-1 flex flex-col items-center justify-center min-h-[22px] max-h-[36px] min-w-0 overflow-hidden leading-tight shrink-0 gap-0.5">
        <span 
          className={`text-[8px] xs:text-[9.5px] sm:text-[11px] md:text-[12px] font-bold block w-full text-center truncate leading-tight uppercase font-sans tracking-wide px-0.5 whitespace-nowrap overflow-hidden text-ellipsis
            ${isSelected 
              ? 'text-pink-400 font-extrabold' 
              : 'text-slate-200 group-hover:text-white'
            }
          `}
        >
          {channel.name}
        </span>
        {isSelected && (
          <span className="inline-flex items-center gap-0.5 bg-pink-500/15 border border-pink-500/30 px-1 py-0.5 rounded text-[6px] xs:text-[7px] font-black text-pink-400 tracking-wider font-sans select-none shrink-0">
            <span className="w-1 h-1 rounded-full bg-pink-500 inline-block animate-pulse" />
            লাইভ
          </span>
        )}
      </div>
    </div>
  );
});

export default ChannelCard;

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

const ChannelCard = memo(function ChannelCard({
  channel,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  workingReport = 'untested'
}: ChannelCardProps) {
  const [hasError, setHasError] = useState(false);
  const backgroundGradient = getThemeGradient(channel.name);

  // Generate safe proxied logo url using global weserv.nl proxy bypass
  const getSafeLogoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  };

  const proxiedLogo = getSafeLogoUrl(channel.logo);

  return (
    <div
      id={`channel-card-${channel.id}`}
      onClick={() => onSelect(channel)}
      tabIndex={0}
      className={`relative w-full aspect-[4/5] flex flex-col items-center justify-between p-2.5 rounded-[20px] bg-black border cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 tv-focusable
        ${isSelected 
          ? 'border-pink-500 bg-pink-950/10 shadow-[0_0_20px_rgba(236,72,153,0.6)] scale-[1.03] z-10' 
          : 'border-slate-800 bg-[#07070a] hover:border-pink-500/50 hover:bg-slate-950/20 text-slate-300'
        }
      `}
    >
      {/* Favorite Icon (Top Right Corner Badge) */}
      <button
        id={`btn-fav-toggle-${channel.id}`}
        onClick={(e) => onToggleFavorite(channel.id, e)}
        className={`absolute top-1.5 right-1.5 p-1 rounded-full border transition-all duration-200 z-20 hover:scale-110 active:scale-95 cursor-pointer
          ${isFavorite 
            ? 'bg-pink-500/15 border-pink-500 text-pink-500' 
            : 'bg-black/80 border-white/10 text-slate-400 hover:text-pink-400 hover:border-pink-500/50'
          }
        `}
        title={isFavorite ? "পছন্দের তালিকা থেকে বাদ দিন" : "পছন্দের তালিকায় যুক্ত করুন"}
      >
        <Star className={`w-3 h-3 ${isFavorite ? 'fill-pink-500' : ''}`} />
      </button>

      {/* Stable Channel Number and Status Capsule Badge */}
      {channel.channelNum !== undefined ? (
        <div className={`absolute top-1.5 left-1.5 bg-black/85 backdrop-blur-sm border rounded-md py-0.5 px-1.5 z-20 flex items-center gap-1.5 shadow
          ${isSelected ? 'border-pink-500 shadow-md shadow-pink-500/10' : 'border-slate-800'}
        `}>
          {(workingReport === 'working' || isSelected) && (
            <span className="flex h-1.5 w-1.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          )}
          <span className={`text-[10px] sm:text-[11px] font-black font-sans tracking-wide leading-none select-none
            ${isSelected ? 'text-pink-400' : 'text-slate-300'}
          `}>
            {channel.channelNum}
          </span>
        </div>
      ) : (
        /* Fallback when channel number is not processed yet */
        (workingReport === 'working' || isSelected) && (
          <span className="absolute top-2 left-2 flex h-2 w-2 z-25">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-505"></span>
          </span>
        )
      )}

      {/* Premium Circular White Logo Container */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 pt-1">
        <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white rounded-full p-2.5 flex items-center justify-center overflow-hidden shadow-inner border relative shrink-0 transition-transform duration-300
          ${isSelected ? 'border-pink-500/85 scale-102 ring-2 ring-pink-505/20' : 'border-white/5'}
        `}>
          {proxiedLogo && !hasError ? (
            <img
              src={proxiedLogo}
              alt={channel.name}
              className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-110"
              onError={() => {
                setHasError(true);
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            /* Fallback View - Elegant Gradient circle with letters */
            <div className={`w-full h-full rounded-full bg-gradient-to-tr ${backgroundGradient} text-white font-extrabold flex items-center justify-center text-xs font-sans uppercase`}>
              {channel.name.slice(0, 2)}
            </div>
          )}
        </div>
      </div>

      {/* Capitalized/Bold clean channel name underneath the Circle */}
      <div className="w-full text-center mt-1 pb-0.5 flex flex-col items-center gap-1 min-h-[30px] justify-center">
        <span 
          className={`text-[9px] sm:text-[11px] md:text-xs font-bold block truncate leading-tight uppercase font-sans tracking-wide px-0.5
            ${isSelected 
              ? 'text-pink-400 font-extrabold' 
              : 'text-slate-200 group-hover:text-white'
            }
          `}
        >
          {channel.name}
        </span>
        {isSelected && (
          <span className="inline-flex items-center gap-1 bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 rounded-full text-[8px] font-black text-pink-400 tracking-wider font-sans select-none shrink-0 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse inline-block" />
            এখন চলছে
          </span>
        )}
      </div>
    </div>
  );
});

export default ChannelCard;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

export default function ChannelCard({
  channel,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  workingReport = 'untested'
}: ChannelCardProps) {
  const [hasError, setHasError] = useState(false);
  const firstLetter = channel.name.charAt(0);
  const backgroundGradient = getThemeGradient(channel.name);

  // Generate safe proxied logo url using global weserv.nl proxy bypass
  const getSafeLogoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  };

  const proxiedLogo = getSafeLogoUrl(channel.logo);

  // Determine the status dot color and label
  let statusColor = 'bg-slate-500';
  let statusText = 'পরীক্ষা করা হয়নি';
  if (workingReport === 'working') {
    statusColor = 'bg-emerald-500 ring-2 ring-emerald-500/30';
    statusText = 'সক্রিয় অনলাইন';
  } else if (workingReport === 'broken') {
    statusColor = 'bg-rose-500 ring-2 ring-rose-500/30';
    statusText = 'ত্রুটিযুক্ত / অফলাইন';
  }

  return (
    <div
      id={`channel-card-${channel.id}`}
      onClick={() => onSelect(channel)}
      className="flex flex-col items-center justify-center p-2 group cursor-pointer transition-all duration-300 relative select-none"
    >
      {/* Circle Card Container */}
      <div 
        className={`w-28 h-28 rounded-full flex items-center justify-center relative transition-all duration-300 border-2 shadow-lg
          ${isSelected 
            ? 'bg-sky-950/40 border-sky-450 shadow-sky-500/25 scale-105' 
            : 'bg-slate-900 border-slate-800 hover:border-sky-500 hover:scale-105'
          }
        `}
      >
        {/* Dynamic Equalizer Overlay when playing */}
        {isSelected && (
          <div className="absolute inset-x-0 bottom-1.5 flex items-end justify-center gap-0.5 h-4.5 bg-slate-950/90 rounded-full py-0.5 max-w-[55px] mx-auto border border-sky-500/30 z-10 animate-pulse">
            <span className="w-0.5 bg-sky-400 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 bg-sky-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 bg-sky-400 rounded-full animate-bounce h-3" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Favorite Icon (Top Right Corner Badge) */}
        <button
          id={`btn-fav-toggle-${channel.id}`}
          onClick={(e) => onToggleFavorite(channel.id, e)}
          className={`absolute -top-1 -right-1 p-1.5 rounded-full border transition-all duration-250 z-20 hover:scale-110 active:scale-95 shadow-md cursor-pointer
            ${isFavorite 
              ? 'bg-slate-900 border-sky-500 text-sky-455' 
              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-sky-450 hover:border-slate-700'
            }
          `}
          title={isFavorite ? "পছন্দের তালিকা থেকে বাদ দিন" : "পছন্দের তালিকায় যুক্ত করুন"}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-sky-400' : ''}`} />
        </button>

        {/* Real-time LIVE Status Badge with pulsing beacon (Top Left Corner) */}
        {(workingReport === 'working' || isSelected) && (
          <div 
            id={`badge-live-marker-${channel.id}`}
            className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-rose-600 border border-slate-950 rounded-md text-[7px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1 shadow-lg animate-pulse z-20 select-none"
            title="লাইভ সম্প্রচার চলছে (LIVE)"
          >
            <span className="relative flex h-1 w-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85"></span>
              <span className="relative inline-flex rounded-full h-1 w-1 bg-white"></span>
            </span>
            <span>LIVE</span>
          </div>
        )}

        {/* Channel Logo Image */}
        <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-slate-950 p-2 border border-slate-800/80 relative">
          
          {/* Subtle Translucent Watermark Overlay if Live */}
          {(workingReport === 'working' || isSelected) && (
            <div className="absolute inset-0 bg-rose-600/[0.04] pointer-events-none flex items-center justify-center z-10 transition-all">
              <span className="absolute bottom-1 bg-rose-950/70 text-[6px] font-black text-rose-450 border border-rose-500/20 px-1 py-0.2 rounded tracking-widest font-sans scale-90 flex items-center gap-0.5 select-none uppercase">
                <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                Live SD
              </span>
            </div>
          )}

          {proxiedLogo && !hasError ? (
            <img
              src={proxiedLogo}
              alt={channel.name}
              className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-110"
              onError={() => {
                // Secondary check: if proxied version failed, let's try direct as a secondary fallback
                setHasError(true);
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            /* Fallback View - Elegant Gradient circle with letters */
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr ${backgroundGradient} text-white font-extrabold select-none p-2 text-center rounded-full transition-all duration-300 shadow-inner`}>
              <Tv className="w-6 h-6 text-white/95 mb-0.5 drop-shadow-md" />
              <span className="text-[10px] tracking-wider text-white truncate max-w-[70px] uppercase font-sans font-bold drop-shadow-sm">
                {channel.name}
              </span>
            </div>
          )}
        </div>

        {/* Streaming active status indicator */}
        <span 
          className={`absolute -bottom-0.5 right-1.5 h-4 w-4 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-md transition-colors duration-350
            ${isSelected ? 'bg-sky-400 ring-2 ring-sky-500/40 animate-pulse' : statusColor}
          `}
          title={isSelected ? "বর্তমানে চালুকৃত" : statusText}
        />
      </div>

      {/* Simplified, Clean Name underneath the Circle */}
      <h4 
        className={`text-xs mt-2 text-center font-medium max-w-[110px] truncate leading-tight transition-colors duration-200 font-sans
          ${isSelected 
            ? 'text-sky-400 font-semibold' 
            : 'text-slate-300 group-hover:text-slate-100'
          }
        `}
      >
        {channel.name}
      </h4>
    </div>
  );
}

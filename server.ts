/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Global override to bypass rigid unauthorized SSL/TLS checks in third-party channels
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import net from 'net';

// Initialize the secure-level server side Gemini API Client with safe fallback
const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAANQhCoBEGY8QwAPMv3nfGyKwNJW3wabA';
const ai = new GoogleGenAI({
  apiKey: GEMINI_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const SUPPORT_SYSTEM_INSTRUCTION = `
You are a friendly, natural, and helpful Live Support Agent named "Bongo Support Agent (AI)" representing Free World Cup BD. 
Your main goal is to greet users warmly, answer their common questions, and help them troubleshoot channel streams politely and elegantly in Bengali, Bangla/Banglish, or English.

CRITICAL GUARDRAIL - DO NOT SHARE:
1. Under no circumstances should you ever reveal or share our TV playlist source URLs, server m3u, or private .m3u8 web links.
2. Do not leak internal backend server IPs, database details, admin credentials, user hashes, or private developer settings.
3. If users ask for M3U playlist file downloads, explain that the live channels are securely optimized directly inside our web app for safe, instant, and copyright-protected viewing and cannot be exported outside.

GUIDELINES FOR HELPING USERS:
- If a channel stream is buffering or fails to load, advise them to click the "রিফ্রেশ" (Refresh/Reload) button above the TV player or switch to "সার্ভার ২ (Alternate Links)" in the player.
- Tell them that we regularly add and update news, sports, and entertainment channels to keep the streaming feeds live.
- Keep your replies highly concise, supporting, and brief (under 2-3 sentences), so they resemble a fast-typing live chat clerk.
- Address them politely using natural Bengali/Banglish or English depending on their input message. Speak as a proud, helpful support staff of Free World Cup BD!
`;

function parseDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

// A beautifully robust, secure-level-bypassing client helper to replace standard undici fetch in node
// Designed specifically to avoid "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" from legacy stream servers 
interface TlsSafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface TlsSafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function tlsSafeFetch(urlStr: string, options: TlsSafeFetchOptions = {}): Promise<TlsSafeFetchResponse> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const reqHeaders: Record<string, string> = { ...options.headers };
      
      const reqOptions: http.RequestOptions = {
        method: options.method || 'GET',
        headers: reqHeaders,
      };

      if (isHttps) {
        // Enforce maximum TLS legacy compatibility & disable OpenSSL 3's strict SECLEVEL=2 checks
        (reqOptions as https.RequestOptions).rejectUnauthorized = false;
        // Setting secureProtocol together with minVersion causes ERR_TLS_PROTOCOL_VERSION_CONFLICT in Node.js.
        // We omit secureProtocol and define minVersion and legacy ciphers directly.
        (reqOptions as https.RequestOptions).ciphers = 'ALL:DEFAULT:@SECLEVEL=0'; // enable all fallback legacy ciphers & disable modern client security rejections
        (reqOptions as https.RequestOptions).minVersion = 'TLSv1'; // fallback smoothly to TLS 1.0/1.1 if needed
      }

      let reqAborted = false;
      let req: http.ClientRequest | null = null;

      if (options.signal) {
        if (options.signal.aborted) {
          return reject(new Error('Aborted'));
        }
        options.signal.addEventListener('abort', () => {
          reqAborted = true;
          if (req) {
            req.destroy();
          }
          reject(new Error('Aborted'));
        });
      }

      req = lib.request(parsedUrl, reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          if (reqAborted) return;
          const bodyBuffer = Buffer.concat(chunks);
          
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 200,
            statusText: res.statusMessage || '',
            headers: {
              get(name: string): string | null {
                const val = res.headers[name.toLowerCase()];
                if (Array.isArray(val)) return val.join(', ');
                return val || null;
              }
            },
            async text() {
              return bodyBuffer.toString('utf8');
            },
            async arrayBuffer() {
              return bodyBuffer.buffer.slice(bodyBuffer.byteOffset, bodyBuffer.byteOffset + bodyBuffer.byteLength);
            }
          });
        });
      });

      req.on('error', (err) => {
        if (reqAborted) return;
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  playlistSource: string;
  status: 'online' | 'offline' | 'unknown';
  servers?: { name: string; url: string }[];
}

const app = express();
const PORT = 3000;

// Enable JSON middleware
app.use(express.json());

// Built-in stream feeds to fetch and parse
const BUILTIN_STREAM_FEEDS = [
  {
    name: 'Obiram TV Live Stream Feed',
    url: 'https://playlist.emonsa4.workers.dev/playlist.m3u',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://obiramtvlive.pages.dev/',
      'Origin': 'https://obiramtvlive.pages.dev'
    }
  },
  {
    name: 'Global Stream Feed Redirection',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'
  },
  {
    name: 'TS-Sports CDN Auto-Feed',
    url: 'https://raw.githubusercontent.com/abusaeeidx/T-Sports-Playlist-Auto-Update/main/ns_player.m3u'
  },
  {
    name: 'BDIX Edge Stream Provider',
    url: 'https://raw.githubusercontent.com/abusaeeidx/Mrgify-BDIX-IPTV/main/playlist.m3u'
  }
];

// Simple in-memory cache
interface Cache {
  channels: Channel[];
  timestamp: number;
}

let channelCache: Cache | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Helper to sanitize and normalize channel titles for deduplication and grouping
function sanitizeChannelName(name: string): string {
  let cleaned = name
    .replace(/\[.*?\]/g, '') // Remove [BD], [LIVE], etc.
    .replace(/\(.*?\)/g, '') // Remove parentheses (e.g. info formats)
    .replace(/\{.*?\}/g, '') // Remove curly brackets
    .replace(/♛/g, '')        // Remove crown symbols
    .replace(/\|/g, '')       // Remove pipes
    .replace(/[-_]/g, ' ')    // Replace hyphens/underscores with space
    .replace(/\bw\s*300\s*q\b/gi, '') // Strip specific leaked query param patterns "w 300 q"
    .replace(/\bw300q\b/gi, '')
    .replace(/\b(hd|sd|fhd|uhd|4k|stream|server\s*\d+|backup|direct|link\s*\d+)\b/gi, '') // Strip typical suffix qualities
    .replace(/\s+/g, ' ')     // Normalize whitespaces
    .trim();

  // If the string contains Bengali script, resolve it to canonical English equivalent
  if (/[\u0980-\u09ff]/.test(cleaned)) {
    const LowerName = cleaned.toLowerCase();
    if (LowerName.includes('সময়') || LowerName.includes('সময়')) return 'Somoy TV';
    if (LowerName.includes('যমুনা')) return 'Jamuna TV';
    if (LowerName.includes('গাজী') || LowerName.includes('জিটিভি')) return 'GTV';
    if (LowerName.includes('ইন্ডিপেন্ডেন্ট') || LowerName.includes('ইনডিপেনডেন্ট')) return 'Independent TV';
    if (LowerName.includes('২৪') || LowerName.includes('24')) return 'Channel 24';
    if (LowerName.includes('টি স্পোর্টস') || LowerName.includes('টি-স্পোর্টস') || LowerName.includes('স্পোর্টস')) return 'T Sports';
    if (LowerName.includes('একাত্তর')) return 'Ekattor TV';
    if (LowerName.includes('এনটিভি') || LowerName.includes('এন টিভি')) return 'NTV';
    if (LowerName.includes('আরটিভি') || LowerName.includes('আর টিভি')) return 'RTV';
    if (LowerName.includes('বিটিভি') || LowerName.includes('বাংলাদেশ টেলিভিশন')) {
      if (LowerName.includes('ওয়ার্ল্ড') || LowerName.includes('ওয়ার্ল্ড') || LowerName.includes('world')) return 'BTV World';
      if (LowerName.includes('সংসদ') || LowerName.includes('সংদদ')) return 'Sangshad TV';
      return 'BTV National';
    }
    if (LowerName.includes('চ্যানেল আই') || LowerName.includes('চ্যানেল-আই')) return 'Channel i';
    if (LowerName.includes('দীপ্ত')) return 'Deepto TV';
    if (LowerName.includes('মাছরাঙা') || LowerName.includes('মাছরাঙ্গা')) return 'Maasranga TV';
    if (LowerName.includes('একুশে')) return 'Ekushey TV';
    if (LowerName.includes('এটিএন নিউজ')) return 'ATN News';
    if (LowerName.includes('এটিএন বাংলা')) return 'ATN Bangla';
    if (LowerName.includes('জি বাংলা') || LowerName.includes('জি-বাংলা')) return 'Zee Bangla';
    if (LowerName.includes('স্টার জলসা') || LowerName.includes('জলসা')) return 'Star Jalsha';
    if (LowerName.includes('রংধনু')) return 'Rangdhanu TV';
    if (LowerName.includes('দুরন্ত')) return 'Duronto TV';
    if (LowerName.includes('নাগরিক')) return 'Nagorik TV';
    if (LowerName.includes('দেশ')) return 'Desh TV';
  }

  // Normalize common duplicate channel display names
  const upper = cleaned.toUpperCase().trim();
  if (upper.includes('SOMOY') || upper.includes('SHOMOY')) {
    return 'Somoy TV';
  }
  if (upper.includes('JAMUNA')) {
    return 'Jamuna TV';
  }
  if (upper.includes('GAZI TV') || upper.includes('GTV') || upper === 'GAZI') {
    return 'GTV';
  }
  if (upper.includes('INDEPENDENT')) {
    return 'Independent TV';
  }
  if (upper.includes('CHANNEL 24') || upper.includes('CHANNEL24')) {
    return 'Channel 24';
  }
  if (upper.includes('ATN NEWS')) {
    return 'ATN News';
  }
  if (upper.includes('ATN BANGLA')) {
    return 'ATN Bangla';
  }
  if (upper.includes('ZEE BANGLA') || upper.includes('ZEE BANLA')) {
    return 'Zee Bangla';
  }
  if (upper.includes('STAR JALSHA')) {
    return 'Star Jalsha';
  }
  if (upper.includes('SONY AATH') || upper.includes('SONY ATTH')) {
    return 'Sony Aath';
  }
  if (upper.includes('T SPORTS') || upper.includes('TSPORTS')) {
    return 'T Sports';
  }
  if (upper.includes('EKATTOR') || upper === '71 TV' || upper === '71') {
    return 'Ekattor TV';
  }
  if (upper === 'NTV' || upper.includes('NTV BD') || upper.includes('NTV HD') || upper === 'NTV BANGLA') {
    return 'NTV';
  }
  if (upper === 'RTV' || upper.includes('RTV HD') || upper.includes('RTV BD') || upper === 'RTV BANGLA') {
    return 'RTV';
  }
  if (upper.includes('BTV NATIONAL') || (upper === 'BTV' || upper === 'BTV BD')) {
    return 'BTV National';
  }
  if (upper.includes('BTV WORLD')) {
    return 'BTV World';
  }
  if (upper.includes('SANGSHAD')) {
    return 'Sangshad TV';
  }
  if (upper.includes('CHANNEL I') || upper.includes('CHANNEL-I')) {
    return 'Channel i';
  }
  if (upper.includes('DEEPTO')) {
    return 'Deepto TV';
  }
  if (upper.includes('MAASRANGA') || upper.includes('MASRANGA')) {
    return 'Maasranga TV';
  }
  if (upper.includes('EKUSHEY') || upper === 'ETV') {
    return 'Ekushey TV';
  }

  // Handle purely numeric names after stripping (like "300")
  if (!cleaned || /^\d+$/.test(cleaned) || cleaned.toLowerCase() === 'stream' || cleaned.toLowerCase() === 'live') {
    if (/^\d+$/.test(cleaned)) {
      return `IPTV Channel ${cleaned}`;
    }
    return 'Live IPTV Channel';
  }

  return cleaned;
}

// Map high-fidelity fallback logo icons to ensure non-empty graphics for top channels
function assignDefaultLogo(name: string, logo: string): string {
  if (logo && logo.trim().length > 15) {
    return logo;
  }
  const upper = name.toUpperCase().trim();

  // Precise mappings matching the Akash and Aynaott CDN vectors
  if (upper.includes('SOMOY')) {
    return "https://tstatic.akash-go.com/cms-ui/images/custom-content/1735560559088.png";
  }
  if (upper.includes('JAMUNA')) {
    return "https://tstatic.akash-go.com/cms-ui/images/custom-content/1735560213832.png";
  }
  if (upper.includes('T SPORTS') || upper.includes('TSPORTS')) {
    return "https://s3.aynaott.com/storage/dbc585f70a60b9855b6e13a8ce4cb6f4";
  }
  if (upper.includes('GTV') || upper.includes('GAZI')) {
    return "https://s3.aynaott.com/storage/417a833f6d83021c99bfc3d4176610f4";
  }
  if (upper.includes('CHANNEL 24') || upper.includes('CHANNEL24')) {
    return "https://tstatic.akash-go.com/cms-ui/images/custom-content/1735556516924.png";
  }
  if (upper.includes('BTV NATIONAL')) {
    return "https://s3.aynaott.com/storage/9b6f35f73a099b7a5885a970523c5f78";
  }
  if (upper.includes('BTV WORLD')) {
    return "https://s3.aynaott.com/storage/b30147b97d86754e4b97fc2989628391";
  }

  // General Category Graphic Assets for generic empty slots
  if (upper.includes('SPORTS') || upper.includes('CRICKET') || upper.includes('FOOTBALL') || upper.includes('TEN') || upper.includes('SONY')) {
    return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&fit=crop&q=60";
  }
  if (upper.includes('NEWS') || upper.includes('খবর') || upper.includes('সময়') || upper.includes('যমুনা')) {
    return "https://images.unsplash.com/photo-1495020689067-958852a6565d?w=120&fit=crop&q=60";
  }
  if (upper.includes('BANGLA') || upper.includes('TV') || upper.includes('বিডি') || upper.includes('BD')) {
    return "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=120&fit=crop&q=60";
  }

  return "https://images.unsplash.com/photo-1540747737956-378724044453?w=120&fit=crop&q=60";
}

// Highly robust and precise categorizer for sports, news, music, movies, kids, bangla, and general streams
function categorizeChannel(name: string, m3uGroup: string): string {
  const normName = name.toLowerCase();
  const normGroup = m3uGroup.toLowerCase();

  // 1. Sports
  if (
    normName.includes('sport') || 
    normName.includes('football') || 
    normName.includes('cricket') || 
    normName.includes('tsports') || 
    normName.includes('t sports') || 
    normName.includes('ten sports') || 
    normName.includes('sony ten') || 
    normName.includes('star sports') || 
    normName.includes('euro sports') || 
    normName.includes('espn') || 
    normName.includes('wwe') || 
    normName.includes('ptv sports') || 
    normName.includes('fifa') || 
    normName.includes('ipl') || 
    normName.includes('bpl') || 
    normName.includes('t20') || 
    normName.includes('world cup') || 
    normName.includes('cup') || 
    normName.includes('league') || 
    normGroup.includes('sport')
  ) {
    return 'Sports';
  }

  // 2. News
  if (
    normName.includes('news') || 
    normName.includes('somoy') || 
    normName.includes('jamuna') || 
    normName.includes('independent tv') || 
    normName.includes('ekattor') || 
    normName.includes('71 tv') || 
    normName.includes('channel 24') || 
    normName.includes('news24') || 
    normName.includes('khabor') || 
    normName.includes('jazeera') || 
    normName.includes('cnn') || 
    normName.includes('bbc') || 
    normName.includes('dw') || 
    normName.includes('reuters') || 
    normName.includes('sky news') || 
    normGroup.includes('news') || 
    normGroup.includes('khabor')
  ) {
    return 'News';
  }

  // 3. Music
  if (
    normName.includes('music') || 
    normName.includes('song') || 
    normName.includes('mtv') || 
    normName.includes('b4u music') || 
    normName.includes('zoom') || 
    normName.includes('clubland') || 
    normGroup.includes('music') || 
    normGroup.includes('song')
  ) {
    return 'Music';
  }

  // 4. Movies
  if (
    normName.includes('movie') || 
    normName.includes('cinema') || 
    normName.includes('hbo') || 
    normName.includes('star gold') || 
    normName.includes('sony max') || 
    normName.includes('zee cinema') || 
    normName.includes('b4u movies') || 
    normName.includes('cine') || 
    normGroup.includes('movie') || 
    normGroup.includes('cinema')
  ) {
    return 'Movies';
  }

  // 5. Kids
  if (
    normName.includes('cartoon') || 
    normName.includes('kids') || 
    normName.includes('disney') || 
    normName.includes('nickelodeon') || 
    normName.includes('nick') || 
    normName.includes('pogo') || 
    normName.includes('duronto') || 
    normName.includes('hungama') || 
    normGroup.includes('kid') || 
    normGroup.includes('cartoon') || 
    normGroup.includes('child')
  ) {
    return 'Kids';
  }

  // 5.5. Indian Series
  if (
    normName.includes('star jalsha') || 
    normName.includes('zee bangla') || 
    normName.includes('colors bangla') || 
    normName.includes('sun bangla') || 
    normName.includes('sony aath') ||
    normName.includes('star plus') ||
    normName.includes('colors tv') ||
    normName.includes('zee tv') ||
    normName.includes('sony sab') ||
    normName.includes('sony tv') ||
    normGroup.includes('indian serial') ||
    normGroup.includes('indian series') ||
    normGroup.includes('hindi serial')
  ) {
    return 'Indian Series';
  }

  // 6. Bangla
  if (
    normName.includes('bengali') || 
    normName.includes('bangla') || 
    normName.includes(' gtv') || 
    normName.includes('gazi') || 
    normName.includes('atn') || 
    normName.includes('channel i') || 
    normName.includes('ch-i') || 
    normName.includes('ntv') || 
    normName.includes('rtv') || 
    normName.includes('deepto') || 
    normName.includes('boishakhi') || 
    normName.includes('maasranga') || 
    normName.includes('nagorik') || 
    normName.includes('desh tv') || 
    normName.includes('bijoy') || 
    normName.includes('sa tv') || 
    normName.includes('ekushey') || 
    normName.includes('etv') || 
    normName.includes('btv') || 
    normName.includes('sangshad') || 
    normName.includes('asian tv') || 
    normName.includes('mohona') || 
    normName.includes('my tv') || 
    normName.includes('ananda') || 
    normGroup.includes('bangla') || 
    normGroup.includes('bengali') || 
    normGroup.includes('bd') || 
    normGroup.includes('dhaka')
  ) {
    return 'Bangla';
  }

  // 7. General match fallback on group name standard matching
  if (/bengali|bangla|bd|dhaka/i.test(normGroup)) return 'Bangla';
  if (/sport/i.test(normGroup)) return 'Sports';
  if (/news/i.test(normGroup)) return 'News';
  if (/music/i.test(normGroup)) return 'Music';
  if (/movie|cinema/i.test(normGroup)) return 'Movies';
  if (/kid|cartoon/i.test(normGroup)) return 'Kids';

  return 'Other';
}

function isAllowedChannel(name: string, group: string): boolean {
  const normName = name.toLowerCase();
  const normGroup = group.toLowerCase();

  const isSports = 
    normGroup === 'sports' || 
    normName.includes('sport') || 
    normName.includes('cricket') || 
    normName.includes('football') || 
    normName.includes('tsports') || 
    normName.includes('t sports') || 
    normName.includes('gazi') || 
    normName.includes('gtv') || 
    normName.includes('ten sports') || 
    normName.includes('sony ten') || 
    normName.includes('star sports') || 
    normName.includes('euro sports') || 
    normName.includes('espn') || 
    normName.includes('wwe') || 
    normName.includes('ptv sports') || 
    normName.includes('willow') ||
    normName.includes('astro super') ||
    normName.includes('supersport') ||
    normName.includes('cric') ||
    normName.includes('league') ||
    normName.includes('cup') ||
    normName.includes('bpl') ||
    normName.includes('ipl');

  if (isSports) return true;

  const isBangladeshiNews = 
    (normGroup === 'news' && (
      normName.includes('bd') || 
      normName.includes('bangla') || 
      normName.includes('tv') ||
      !/(cnn|bbc|dw|reuters|sky|al jazeera|france24)/i.test(normName)
    )) ||
    normName.includes('somoy') || 
    normName.includes('shomoy') || 
    normName.includes('সময়') ||
    normName.includes('jamuna') || 
    normName.includes('যমুনা') ||
    normName.includes('independent') || 
    normName.includes('ইন্ডিপেন্ডেন্ট') ||
    normName.includes('ইনডিপেনডেন্ট') ||
    normName.includes('71 tv') || 
    normName.includes('71') || 
    normName.includes('ekattor') || 
    normName.includes('একাত্তর') ||
    normName.includes('channel 24') || 
    normName.includes('channel24') || 
    normName.includes('২৪') ||
    normName.includes('news24') || 
    normName.includes('news 24') || 
    normName.includes('dbc') || 
    normName.includes('ডিবিসি') ||
    normName.includes('atn news') || 
    normName.includes('এটিএন নিউজ');

  if (isBangladeshiNews) return true;

  const isGlobalNewsAllowed = 
    normName.includes('jazeera') || 
    normName.includes('cnn') || 
    normName.includes('bbc') || 
    normName.includes('dw');

  if (isGlobalNewsAllowed) return true;

  return false;
}

// Helper to generate a unique channel ID from its stream URL safely and repeatably
function generateChannelId(streamUrl: string): string {
  let hash = 0;
  for (let i = 0; i < streamUrl.length; i++) {
    hash = ((hash << 5) - hash) + streamUrl.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const hexHash = Math.abs(hash).toString(16);
  // Alphanumeric suffix of URL to preserve clarity
  const cleanSuffix = streamUrl.replace(/[^a-zA-Z0-9]/g, '').slice(-15);
  return `ch_${cleanSuffix}_${hexHash}`;
}

// Regex M3U playlist parser
function parseM3UContent(content: string, playlistName: string): Channel[] {
  const lines = content.replace(/\r/g, '').split('\n');
  const results: Channel[] = [];
  let currentMeta: { name: string; logo: string; group: string; servers: { name: string; url: string }[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse main attributes
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const nameAttrMatch = line.match(/tvg-name="([^"]+)"/i);

      const logo = logoMatch ? logoMatch[1] : '';
      let group = groupMatch ? groupMatch[1] : '';
      let nameAttr = nameAttrMatch ? nameAttrMatch[1] : '';

      // Get readable display text after comma (ignoring commas inside quoted attribute strings)
      let commaIndex = -1;
      let inQuotes = false;
      let quoteChar = '';
      for (let idx = 0; idx < line.length; idx++) {
        const char = line[idx];
        if ((char === '"' || char === "'") && (idx === 0 || line[idx - 1] !== '\\')) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuotes = false;
          }
        } else if (char === ',' && !inQuotes) {
          commaIndex = idx;
          break;
        }
      }

      let displayName = '';
      if (commaIndex !== -1) {
        displayName = line.substring(commaIndex + 1).trim();
      }

      if (!displayName) {
        displayName = nameAttr || 'Unknown Channel';
      }

      // Dynamic precise group assignment
      const assignedGroup = categorizeChannel(displayName, group);

      currentMeta = {
        name: displayName,
        logo,
        group: assignedGroup,
        servers: []
      };
    } else if (line.startsWith('#EXT-X-MEDIA:') && currentMeta) {
      const nameMatch = line.match(/NAME="([^"]*)"/); 
      const urlMatch = line.match(/URI="([^"]*)"/);
      if (nameMatch && urlMatch) {
        currentMeta.servers.push({ name: nameMatch[1], url: urlMatch[1] });
      }
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      const parts = line.split('#'); // Strip comments from lines
      const streamUrl = parts[0].trim();

      if (currentMeta) {
        // Unshift the primary link as Server 1
        currentMeta.servers.unshift({ name: "Server 1", url: streamUrl });

        results.push({
          id: generateChannelId(streamUrl),
          name: sanitizeChannelName(currentMeta.name),
          url: streamUrl,
          logo: currentMeta.logo,
          group: currentMeta.group,
          playlistSource: playlistName,
          status: 'unknown',
          servers: currentMeta.servers
        });
        currentMeta = null;
      } else {
        // Discovered URL without preceding EXTINF information
        // Strip query params so we don't leak strings like ?w=300&q=...
        const cleanUrlPart = streamUrl.split('?')[0].trim();
        const urlParts = cleanUrlPart.split('/');
        const textLabel = urlParts[urlParts.length - 1]
          .replace(/\.m3u8|\.m3u|\.ts/gi, '')
          .replace(/[-_]/g, ' ');
        results.push({
          id: generateChannelId(streamUrl),
          name: sanitizeChannelName(textLabel || 'Stream Channel'),
          url: streamUrl,
          logo: '',
          group: 'Other',
          playlistSource: playlistName,
          status: 'unknown',
          servers: [{ name: "Server 1", url: streamUrl }]
        });
      }
    }
  }

  return results;
}

// Active list of server-verified broken channel IDs
let SERVER_SIDE_BROKEN_CHANNEL_IDS = new Set<string>();
let LAST_HEALTH_CHECK_TIMESTAMP = 0;
const HEALTH_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes interval to keep list healthy and fresh
let IS_HEALTH_CHECK_RUNNING = false;

const BROKEN_CHANNELS_FILE_PATH = path.join(process.cwd(), 'broken_channels.json');

// Helper to load broken channels on startup
function loadBrokenChannels() {
  try {
    if (fs.existsSync(BROKEN_CHANNELS_FILE_PATH)) {
      const data = fs.readFileSync(BROKEN_CHANNELS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        SERVER_SIDE_BROKEN_CHANNEL_IDS = new Set(parsed);
        console.log(`[Health Checker] Loaded ${SERVER_SIDE_BROKEN_CHANNEL_IDS.size} blacklisted/broken channels from storage.`);
      }
    }
  } catch (err) {
    console.error('[Health Checker Error] Failed to load broken channels:', err);
  }
}

// Helper to save broken channels
function saveBrokenChannels() {
  try {
    const list = Array.from(SERVER_SIDE_BROKEN_CHANNEL_IDS);
    fs.writeFileSync(BROKEN_CHANNELS_FILE_PATH, JSON.stringify(list, null, 2), 'utf8');
    console.log(`[Health Checker] Saved ${SERVER_SIDE_BROKEN_CHANNEL_IDS.size} blacklisted/broken channels to storage.`);
  } catch (err) {
    console.error('[Health Checker Error] Failed to save broken channels:', err);
  }
}

// Auto load broken channels immediately
loadBrokenChannels();

// Fast hybrid connection & availability check
async function checkStreamHealth(streamUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(streamUrl);
    const host = parsed.hostname;
    if (!host || host.includes('example.com') || host.includes('127.0.0.1')) {
      return false;
    }

    // Try executing a direct fetch check with a 2.5 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(streamUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': parsed.origin,
          'Origin': parsed.origin
        }
      });
      clearTimeout(timeoutId);

      // If res.status is between 200 and 399, the stream endpoint is generally reachable and valid
      if (res.status >= 200 && res.status < 400) {
        return true;
      }

      // If it returned 404, 403, 502, 500, etc., then it's definitively broken!
      console.warn(`[Health Checker] Stream returned HTTP ${res.status}: ${streamUrl}`);
      return false;
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      
      // If fetch failed due to certificate errors, TLS mismatch, or strict Node-agent blocking,
      // fallback to a standard low-level TCP connect check as the stream may still be played in the browser.
      return new Promise<boolean>((resolve) => {
        const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
        const socket = new net.Socket();
        socket.setTimeout(1800);

        socket.connect(port, host, () => {
          socket.destroy();
          resolve(true); // Host server is reachable
        });

        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
      });
    }
  } catch (e) {
    return false;
  }
}

// Concurrently verify health of all imported live channels in background
async function runBackgroundChannelHealthCheck(channels: Channel[]) {
  if (IS_HEALTH_CHECK_RUNNING || !channels || channels.length === 0) return;
  IS_HEALTH_CHECK_RUNNING = true;
  console.log(`[Health Checker] Concurrently verifying connectivity of ${channels.length} channels...`);

  const brokenSet = new Set<string>();
  const batchSize = 15; // Parallel checks of 15 channels a time

  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (ch) => {
        const isHealthy = await checkStreamHealth(ch.url);
        if (!isHealthy) {
          console.warn(`[Health Checker] Offline / Broken stream removed: ${ch.name} (ID: ${ch.id})`);
          brokenSet.add(ch.id);
        }
      })
    );
  }

  // Merge new broken channels into our permanent blacklist and persist
  for (const id of brokenSet) {
    SERVER_SIDE_BROKEN_CHANNEL_IDS.add(id);
  }
  saveBrokenChannels();
  
  LAST_HEALTH_CHECK_TIMESTAMP = Date.now();
  IS_HEALTH_CHECK_RUNNING = false;
  console.log(`[Health Checker] Verify complete! Permanent blacklisted list now has ${SERVER_SIDE_BROKEN_CHANNEL_IDS.size} channels.`);
}

// Curated list of high-quality, resilient built-in fallback channels
const FALLBACK_CHANNELS: Channel[] = [
  {
    id: "fb_somoy_tv",
    name: "Somoy TV Live News",
    url: "https://live.somoynews.tv/somonewslive/index.m3u8",
    logo: "https://tstatic.akash-go.com/cms-ui/images/custom-content/1735560559088.png",
    group: "News",
    playlistSource: "Built-in fallbacks",
    status: "online"
  },
  {
    id: "fb_jamuna_tv",
    name: "Jamuna TV Live News",
    url: "https://jamunapr.b-cdn.net/jamunatv/index.m3u8",
    logo: "https://tstatic.akash-go.com/cms-ui/images/custom-content/1735560213832.png",
    group: "News",
    playlistSource: "Built-in fallbacks",
    status: "online"
  },
  {
    id: "fb_tsports",
    name: "T Sports Live HD",
    url: "https://live.tsports.com/tsports/index.m3u8",
    logo: "https://s3.aynaott.com/storage/dbc585f70a60b9855b6e13a8ce4cb6f4",
    group: "Sports",
    playlistSource: "Built-in fallbacks",
    status: "online"
  },
  {
    id: "fb_gtv",
    name: "GTV (Gazi TV) Live",
    url: "https://live.gtvbd.com/gtvbd/index.m3u8",
    logo: "https://s3.aynaott.com/storage/417a833f6d83021c99bfc3d4176610f4",
    group: "Sports",
    playlistSource: "Built-in fallbacks",
    status: "online"
  },
  {
    id: "fb_channel24",
    name: "Channel 24 Live News",
    url: "https://live.channel24bd.tv/c24/index.m3u8",
    logo: "https://tstatic.akash-go.com/cms-ui/images/custom-content/1735556516924.png",
    group: "News",
    playlistSource: "Built-in fallbacks",
    status: "online"
  }
];

// Fetch channels from all playlist URLs
async function fetchAllChannels(): Promise<Channel[]> {
  const allChannels: Channel[] = [];
  const processedUrls = new Set<string>();

  try {
    let htmlText = '';
    const shopnilUrl = 'https://shopniltv.blogspot.com/?m=1';
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    try {
      const res = await fetch(shopnilUrl, { headers: requestHeaders });
      if (res.ok) {
        htmlText = await res.text();
        // Persist fresh backup
        fs.writeFileSync('./blogspot_html.txt', htmlText, 'utf8');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (nativeErr: any) {
      console.warn(`Native fetch failed for ShopnilTV: ${nativeErr.message}. Trying tlsSafeFetch...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      try {
        const resFallback = await tlsSafeFetch(shopnilUrl, {
          signal: controller.signal,
          headers: requestHeaders
        });
        clearTimeout(timeoutId);
        if (resFallback.ok) {
          htmlText = await resFallback.text();
          // Persist fresh backup
          fs.writeFileSync('./blogspot_html.txt', htmlText, 'utf8');
        } else {
          throw new Error(`Fallback HTTP Status: ${resFallback.status}`);
        }
      } catch (fallbackErr: any) {
        clearTimeout(timeoutId);
        console.error(`Fallback fetch failed for ShopnilTV: ${fallbackErr.message}`);
      }
    }

    // Try reading from local backup if both fetches failed
    if (!htmlText) {
      console.warn('Scraping failed, falling back to local cached copy ./blogspot_html.txt');
      try {
        if (fs.existsSync('./blogspot_html.txt')) {
          htmlText = fs.readFileSync('./blogspot_html.txt', 'utf8');
        }
      } catch (fsErr: any) {
        console.error('Failed to read local cached blogspot copy:', fsErr);
      }
    }

    if (!htmlText) {
      throw new Error('No HTML content available to parse channels.');
    }

    // Split HTML by category-section divs
    const sections = htmlText.split(/<div class='category-section'\s*data-cat='([^']+)'>/);
    
    for (let i = 1; i < sections.length; i += 2) {
      const rawCatId = sections[i];
      const sectionContent = sections[i + 1];
      if (!sectionContent) continue;
      
      let category = 'Other';
      if (rawCatId === 'bangla') category = 'Bangla';
      else if (rawCatId === 'sports') category = 'Sports';
      else if (rawCatId === 'news') category = 'News';
      else if (rawCatId === 'kids') category = 'Kids';
      else if (rawCatId === 'movies') category = 'Movies';
      else if (rawCatId === 'english') category = 'Hindi/Eng';
      else if (rawCatId === 'religion') category = 'Religion';
      
      // Robust channel scraper matching channel-item divs
      const regex = /<div class='channel-item'[^>]*onclick='playChannel\(&#39;([^']+)&#39;,\s*this,\s*&#39;([^']+)&#39;\)'[^>]*>(.*?)<\/div>\s*<\/div>/g;
      let match;
      
      while ((match = regex.exec(sectionContent)) !== null) {
        const url = match[1] ? match[1].trim() : '';
        const rawName = match[2] ? match[2].trim() : '';
        const innerHtml = match[3] || '';
        
        if (!url || !rawName) continue;
        
        const imgMatch = innerHtml.match(/src='([^']+)'/);
        const logo = imgMatch ? imgMatch[1].trim() : '';
        
        // Clean name
        const cleanName = sanitizeChannelName(rawName);
        const rawUrlLower = url.toLowerCase().trim();
        
        if (processedUrls.has(rawUrlLower)) continue;
        processedUrls.add(rawUrlLower);
        
        const channelId = `ch_shopnil_${generateChannelId(url)}`;
        
        const channelObj: Channel = {
          id: channelId,
          name: cleanName,
          logo: logo || 'https://images.unsplash.com/photo-1540747737956-37872404453a?w=80',
          group: category,
          url: url,
          playlistSource: 'ShopnilTV',
          status: 'online',
          servers: [{ name: "Server 1", url: url }]
        };
        
        allChannels.push(channelObj);
      }
    }
  } catch (err: any) {
    console.error('Fatal error scraper in fetchAllChannels:', err);
  }

  if (allChannels.length === 0) {
    console.warn('Scraper returned 0 channels, recovering with static fallbacks');
    return FALLBACK_CHANNELS;
  }

  // Sort channels alphabetically
  return allChannels.sort((a, b) => a.name.localeCompare(b.name));
}

// REST GET channels with high-performance routing
app.get('/api/channels', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh && channelCache && (Date.now() - channelCache.timestamp < CACHE_DURATION_MS)) {
      return res.json({
        success: true,
        source: 'cache',
        count: channelCache.channels.length,
        channels: channelCache.channels
      });
    }

    const channels = await fetchAllChannels();

    // Trigger asynchronous background network verification if interval expired
    if (!IS_HEALTH_CHECK_RUNNING && (Date.now() - LAST_HEALTH_CHECK_TIMESTAMP > HEALTH_CHECK_INTERVAL_MS)) {
      runBackgroundChannelHealthCheck(channels).catch(err => {
        console.error('[Health Checker Error] Background check trigger rejected:', err);
      });
    }

    channelCache = {
      channels,
      timestamp: Date.now()
    };

    return res.json({
      success: true,
      source: 'live',
      count: channels.length,
      channels
    });
  } catch (err: any) {
    console.error('API channels error:', err);
    // If no cache exists, return empty array cleanly instead of crashing or showing demo channels
    return res.json({
      success: true,
      source: 'error_fallback',
      count: channelCache ? channelCache.channels.length : 0,
      channels: channelCache ? channelCache.channels : [],
      error: err.message
    });
  }
});

interface ScanLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

let SCAN_STATUS = {
  isRunning: false,
  totalChannels: 0,
  checkedChannels: 0,
  brokenChannelsCount: 0,
  currentChannelName: '',
  logs: [] as ScanLog[]
};

// Helper to push logs with a limit of 200 logs
function addScanLog(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  SCAN_STATUS.logs.unshift({ timestamp, message, type });
  if (SCAN_STATUS.logs.length > 200) {
    SCAN_STATUS.logs = SCAN_STATUS.logs.slice(0, 200);
  }
}

// GET the status of the automated checking
app.get('/api/channels/scan/status', (req, res) => {
  res.json({
    success: true,
    status: SCAN_STATUS
  });
});

// START the comprehensive scanning process
app.post('/api/channels/scan', async (req, res) => {
  if (SCAN_STATUS.isRunning) {
    return res.json({ success: false, message: 'Scan already in progress' });
  }

  SCAN_STATUS.isRunning = true;
  SCAN_STATUS.checkedChannels = 0;
  SCAN_STATUS.brokenChannelsCount = 0;
  SCAN_STATUS.currentChannelName = 'Initializing scan...';
  SCAN_STATUS.logs = [];

  addScanLog('Automated comprehensive channel health scan started.', 'info');

  // Launch background scan asynchronously
  (async () => {
    try {
      const channels = await fetchAllChannels();
      SCAN_STATUS.totalChannels = channels.length;
      addScanLog(`Fetched ${channels.length} channels from playlists sources. Verifying stream connectivities...`, 'info');

      const batchSize = 10;
      for (let i = 0; i < channels.length; i += batchSize) {
        if (!SCAN_STATUS.isRunning) {
          addScanLog('Scan was manually interrupted or stopped.', 'warn');
          break;
        }

        const batch = channels.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (ch) => {
            SCAN_STATUS.currentChannelName = ch.name;
            const isHealthy = await checkStreamHealth(ch.url);
            SCAN_STATUS.checkedChannels++;

            if (isHealthy) {
              addScanLog(`Active channel validated: ${ch.name} [OK]`, 'success');
            } else {
              SCAN_STATUS.brokenChannelsCount++;
              SERVER_SIDE_BROKEN_CHANNEL_IDS.add(ch.id);
              addScanLog(`Broken/Offline channel detected: ${ch.name} (Removing permanently) [REMOVED]`, 'error');
            }
          })
        );

        // Periodically save to preserve progress
        saveBrokenChannels();
        // Clear the server side channelCache so broken ones are instantly omitted for users
        channelCache = null;
      }

      SCAN_STATUS.isRunning = false;
      SCAN_STATUS.currentChannelName = 'Completed!';
      addScanLog(`Automated scanning complete! Checked ${SCAN_STATUS.checkedChannels} channels, removed ${SCAN_STATUS.brokenChannelsCount} dead links permanently.`, 'success');
    } catch (scanErr: any) {
      SCAN_STATUS.isRunning = false;
      SCAN_STATUS.currentChannelName = 'Error occurred';
      addScanLog(`Scan error occurred: ${scanErr.message}`, 'error');
    }
  })().catch(err => {
    console.error('Asynchronous scan error:', err);
  });

  res.json({ success: true, message: 'Comprehensive scanner launched successfully' });
});

// STOP the scanning process
app.post('/api/channels/scan/stop', (req, res) => {
  if (SCAN_STATUS.isRunning) {
    SCAN_STATUS.isRunning = false;
    addScanLog('Stopping automated health check scan...', 'warn');
    return res.json({ success: true, message: 'Scanning interruption requested' });
  }
  res.json({ success: false, message: 'No scanner currently running' });
});

// REPORT broken channel from client-side player error or admin action
app.post('/api/channels/report-broken', async (req, res) => {
  try {
    const { channelId, channelName } = req.body;
    if (!channelId) {
      return res.status(400).json({ success: false, error: 'channelId is required' });
    }

    if (!SERVER_SIDE_BROKEN_CHANNEL_IDS.has(channelId)) {
      SERVER_SIDE_BROKEN_CHANNEL_IDS.add(channelId);
      saveBrokenChannels();
      console.warn(`[Crowd-Sourced Real-Time Filter] User-reported broken channel blacklisted: ${channelName || ''} (ID: ${channelId})`);
      
      // Clear cache so that the channel is instantly removed for everyone
      channelCache = null;
    }

    return res.json({
      success: true,
      message: 'Channel successfully blacklisted and filtered permanently'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// RESTORE/UNBLACKLIST a channel
app.post('/api/channels/unblacklist', async (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) {
      return res.status(400).json({ success: false, error: 'channelId is required' });
    }

    if (SERVER_SIDE_BROKEN_CHANNEL_IDS.has(channelId)) {
      SERVER_SIDE_BROKEN_CHANNEL_IDS.delete(channelId);
      saveBrokenChannels();
      console.log(`[Health Checker] Unblacklisted channel ID: ${channelId}`);
      
      // Clear cache to restore
      channelCache = null;
    }

    return res.json({
      success: true,
      message: 'Channel successfully unblacklisted'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET currently blacklisted/broken channels for display
app.get('/api/channels/blacklisted', (req, res) => {
  res.json({
    success: true,
    blacklistedIds: Array.from(SERVER_SIDE_BROKEN_CHANNEL_IDS)
  });
});

// Stream CORS proxy bypass for channels that block standard origins
app.get('/api/proxy', async (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send('Parameters url matches required properties');
  }

  try {
    const parsedUrl = new URL(streamUrl);
    const origin = parsedUrl.origin;
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions: any = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': origin + '/',
        'Origin': origin
      },
      rejectUnauthorized: false
    };

    if (isHttps) {
      reqOptions.rejectUnauthorized = false;
      reqOptions.ciphers = 'ALL:DEFAULT:@SECLEVEL=0';
      reqOptions.minVersion = 'TLSv1';
    }

    // Use native streaming request to pipe TS chunks directly with zero latency or in-memory buffering!
    const proxyReq = lib.request(parsedUrl, reqOptions, (proxyRes) => {
      proxyRes.on('error', (err: any) => {
        console.error('[Proxy Response Error]', err);
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      const contentType = proxyRes.headers['content-type'] || '';
      const isM3U8 = contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL') || streamUrl.split('?')[0].endsWith('.m3u8');

      if (isM3U8) {
        // M3U8 indices are tiny, so they are fast and safe to fully buffer and rewrite!
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        
        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk.toString('utf8');
        });

        proxyRes.on('end', () => {
          const lines = body.split('\n');
          const rewrittenLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // Metadata line
            if (trimmed.startsWith('#')) {
              return trimmed.replace(/(URI=")([^"]+)(")/gi, (match, prefix, rUrl, suffix) => {
                try {
                  const absUrl = new URL(rUrl, streamUrl).href;
                  return `${prefix}/api/proxy?url=${encodeURIComponent(absUrl)}${suffix}`;
                } catch (e) {
                  return match;
                }
              });
            }

            // Direct stream segments or sub-playlists
            try {
              const absUrl = new URL(trimmed, streamUrl).href;
              return `/api/proxy?url=${encodeURIComponent(absUrl)}`;
            } catch (e) {
              return line;
            }
          });

          res.send(rewrittenLines.join('\n'));
        });
      } else {
        // Direct non-buffering binary pipe for TS video segments, keys, images
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }

        // Cache static video chunks, segments, keys, vectors to avoid round-trips and buffering
        const lowerUrl = streamUrl.toLowerCase();
        if (
          lowerUrl.includes('.ts') || 
          lowerUrl.includes('.key') || 
          lowerUrl.includes('.mp4') || 
          lowerUrl.includes('.m4s') ||
          contentType.includes('video/mp2t') ||
          contentType.includes('video/mp4')
        ) {
          res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        }

        proxyRes.pipe(res);
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });

    proxyReq.on('error', (err: any) => {
      const isTargetIssue = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EHOSTUNREACH'].includes(err.code) ||
                            err.message?.includes('ECONNREFUSED') ||
                            err.message?.includes('ETIMEDOUT') ||
                            err.message?.includes('ENOTFOUND') ||
                            err.message?.includes('ECONNRESET');
      if (isTargetIssue) {
        console.warn(`[Proxy Stream Off-line] Remote target issue (${err.code || 'CONNECTION_FAILURE'}): ${streamUrl}`);
      } else {
        console.error('Proxy request failure:', err);
      }
      if (!res.headersSent) {
        res.status(555).send(`Stream target offline (${err.code || 'OFFLINE'}): ${err.message}`);
      }
    });

    proxyReq.end();
  } catch (err: any) {
    console.error('Proxy setup error:', err);
    if (!res.headersSent) {
      res.status(500).send(`Proxy setup failure: ${err.message}`);
    }
  }
});

// Single point checker API
app.post('/api/verify-channel', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing stream URL' });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500); // Fail fast

    const checkRes = await tlsSafeFetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Stream Tester)' }
    });
    clearTimeout(timer);

    return res.json({
      working: checkRes.ok || checkRes.status === 403 || checkRes.status === 405, // fine if forbidden (CORS/referrers blocking plain scans)
      status: checkRes.status
    });
  } catch (e) {
    return res.json({ working: false, error: 'Unreachable stream' });
  }
});

// GET currently available app version for dynamic OTA update checking
app.get('/api/version', (req, res) => {
  res.json({ version: 'v1.1.0' });
});

// Cache for live/upcoming sports schedule from Google Search Grounding with Gemini
let sportsCache: any = null;
let sportsCacheTime = 0;

app.get('/api/sports/schedule', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  // Extend cache duration to 15 minutes to guarantee quota safety
  if (sportsCache && (Date.now() - sportsCacheTime < 900000)) {
    return res.json(sportsCache);
  }

  try {
    const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' });
    const prompt = `Search the web for today's dynamic LIVE and upcoming Cricket and Football match schedules (IPL 2026, T25, Champions League, local or international matches) on this date: ${today}. 
    Provide the response strictly as a JSON array of objects with this schema:
    [
      {
        "id": "match_1 (or sequential)",
        "sport": "cricket" | "football",
        "tournament": "Tournament or League Name (e.g. IPL 2026, Champions League, BAN vs SL)",
        "team1": "Team 1 Name (e.g. Bangladesh)",
        "team2": "Team 2 Name (e.g. Sri Lanka)",
        "status": "live" | "upcoming",
        "time": "Scheduled Time or Live status in Bengali language (e.g. 'সকাল ১০:৩০ মি:', 'সন্ধ্যা ৭:৩০ মি:', 'চলছে (লাইভি)')",
        "score": "Current Live Score if active (e.g. BAN 180/3 (32 Ov)), otherwise empty string",
        "liveChannelId": "tsports (or a suggest keyword for search like 'somoy_tv' / 'gazi_tv' / 'sony_ten' / 'sports')"
      }
    ]
    Format only the JSON array of objects inside standard markdown fences or raw code. Do not output conversational preamble.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    let text = response.text || '';
    if (text.includes('```')) {
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const matches = JSON.parse(text);
    if (Array.isArray(matches)) {
      sportsCache = { success: true, matches };
      sportsCacheTime = Date.now();
      return res.json(sportsCache);
    }
    throw new Error('Response is not a valid array');
  } catch (err: any) {
    const isQuotaError = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('exhausted'));
    if (isQuotaError) {
      console.warn('[Sports Schedule Loader] Gemini API quota limit exceeded (429 RESOURCE_EXHAUSTED) - activating resilient cached fallback channels.');
    } else {
      console.warn('[Sports Schedule Loader] Gemini API execution returned warning:', err.message);
    }
    // Serve previously populated cache even if old to shield users from rate limits
    if (sportsCache) {
      console.warn('[Sports Schedule Loader] Re-using previous cached sports schedule due to rate limits.');
      return res.json(sportsCache);
    }
    const fallbackMatches = [
      {
        id: "fb_match_101",
        sport: "cricket",
        tournament: "IPL 2026 (আজকের ম্যাচ)",
        team1: "Kolkata Knight Riders",
        team2: "Chennai Super Kings",
        status: "upcoming",
        time: "রাত ৮:০০ টায়",
        score: "",
        liveChannelId: "tsports"
      },
      {
        id: "fb_match_102",
        sport: "football",
        tournament: "UEFA Champions League Semifinal",
        team1: "Real Madrid",
        team2: "Manchester City",
        status: "upcoming",
        time: "রাত ১২:৪৫ মিনিটে",
        score: "",
        liveChannelId: "sony_ten"
      },
      {
        id: "fb_match_103",
        sport: "cricket",
        tournament: "বাংলাদেশ বনাম শ্রীলঙ্কা ৩য় ওয়ানডে",
        team1: "Bangladesh",
        team2: "Sri Lanka",
        status: "live",
        time: "চলছে (লাইভ)",
        score: "BAN 214/4 (38.4 Ov)",
        liveChannelId: "gazi_tv"
      },
      {
        id: "fb_match_104",
        sport: "football",
        tournament: "Spain La Liga Live Match",
        team1: "Barcelona",
        team2: "Real Betis",
        status: "upcoming",
        time: "রাত ১০:১৫ মিনিটে",
        score: "",
        liveChannelId: "somoy_tv"
      }
    ];
    return res.json({ success: true, matches: fallbackMatches, source: 'fallback' });
  }
});

// BRAND CONFIG & REAL-TIME PRESENCE STORAGE FOR MULTIPLE USERS
const BRAND_CONFIG_FILE = path.join(process.cwd(), 'brand_config.json');

// STATS PERSISTENCE
const STATS_FILE = path.join(process.cwd(), 'site_stats.json');

// GET brand settings (persisted server-side on disk)
app.get('/api/branding', (req, res) => {
  const s = readSiteSettings();
  return res.json({
    siteLogoUrl: s.siteLogoUrl,
    siteNameBangla: s.siteNameBangla,
    siteNameEnglish: s.siteNameEnglish,
    marqueeText: s.marqueeText
  });
});

// GET site stats
app.get('/api/stats', (req, res) => {
  try {
    let stats = { totalRegistrations: 0, totalLogins: 0 };
    if (fs.existsSync(STATS_FILE)) {
      stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
    
    // Also include active users count from memory
    const now = Date.now();
    const activeUsers = Object.values(activePresences).filter(u => now - u.lastSeen < 15000).length;

    return res.json({ ...stats, activeUsers });
  } catch (e) {
    console.error('Error reading stats:', e);
    return res.json({ totalRegistrations: 0, totalLogins: 0, activeUsers: 0 });
  }
});

// POST increment registration
app.post('/api/stats/register', (req, res) => {
  try {
    let stats = { totalRegistrations: 0, totalLogins: 0 };
    if (fs.existsSync(STATS_FILE)) {
      stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
    stats.totalRegistrations++;
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
    return res.json({ success: true, stats });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST increment login
app.post('/api/stats/login', (req, res) => {
  try {
    let stats = { totalRegistrations: 0, totalLogins: 0 };
    if (fs.existsSync(STATS_FILE)) {
      stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
    stats.totalLogins++;
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
    return res.json({ success: true, stats });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST save brand settings onto the server globally
app.post('/api/branding', (req, res) => {
  try {
    const { siteLogoUrl, siteNameBangla, siteNameEnglish, marqueeText } = req.body;
    const current = readSiteSettings();
    const updated = {
      ...current,
      siteLogoUrl: siteLogoUrl !== undefined ? siteLogoUrl : current.siteLogoUrl,
      siteNameBangla: siteNameBangla !== undefined ? siteNameBangla : current.siteNameBangla,
      siteNameEnglish: siteNameEnglish !== undefined ? siteNameEnglish : current.siteNameEnglish,
      marqueeText: marqueeText !== undefined ? marqueeText : current.marqueeText,
    };
    writeSiteSettings(updated);
    
    // Backup helper sync
    fs.writeFileSync(BRAND_CONFIG_FILE, JSON.stringify({ siteLogoUrl, siteNameBangla, siteNameEnglish, marqueeText }, null, 2), 'utf-8');
    
    return res.json({ success: true, config: updated });
  } catch (e: any) {
    console.error('Error writing branding config:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Heartbeat real-time user presence dictionary
interface ActivePresence {
  username: string;
  name: string;
  lastSeen: number;
  watchingChannel?: string;
  watchingChannelId?: string;
}
let activePresences: Record<string, ActivePresence> = {};

// POST register or update user presence heartbeat
app.post('/api/presence', (req, res) => {
  const { username, name, watchingChannel, watchingChannelId } = req.body;
  if (username) {
    activePresences[username] = {
      username,
      name: name || username,
      lastSeen: Date.now(),
      watchingChannel: watchingChannel || '',
      watchingChannelId: watchingChannelId || ''
    };
  }
  return res.json({ success: true });
});

// GET query currently active users in the last 15 seconds
app.get('/api/presence', (req, res) => {
  const now = Date.now();
  // Clear any inactive elements over 15 seconds
  const list = Object.values(activePresences).filter(u => now - u.lastSeen < 15000);
  return res.json({
    count: list.length,
    users: list.map(u => ({ 
      username: u.username, 
      name: u.name,
      watchingChannel: u.watchingChannel || '',
      watchingChannelId: u.watchingChannelId || ''
    }))
  });
});

// --- SESSION-BASED CUSTOMER SUPPORT TICKETING ENGINE ---
const SUPPORT_FILE = path.join(process.cwd(), 'site_support_sessions.json');

interface TicketMessage {
  id: string;
  sender: string; // "user" or "admin" or username
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
  lastMessageAt: string;
  messages: TicketMessage[];
}

// Read support sessions helper
function readSupportSessions(): TicketSession[] {
  try {
    if (fs.existsSync(SUPPORT_FILE)) {
      const data = fs.readFileSync(SUPPORT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading support sessions file:', e);
  }
  return [];
}

// Write support sessions helper
function writeSupportSessions(sessions: TicketSession[]) {
  try {
    fs.writeFileSync(SUPPORT_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing support sessions file:', e);
  }
}

// Global background worker helper for AI live support assistant auto-replies
function triggerAISupportReply(sessionId: string) {
  setTimeout(async () => {
    try {
      const freshSessions = readSupportSessions();
      const activeSession = freshSessions.find(s => s.id === sessionId);
      if (!activeSession || activeSession.status === 'closed') return;

      // Ensure last message is from user to avoid duplicate loops
      const lastMsg = activeSession.messages[activeSession.messages.length - 1];
      if (lastMsg.sender === 'support_agent' || lastMsg.sender === 'system') return;

      // Gather non-system messages to pass to active history context
      const conversationSnippet = activeSession.messages
        .filter(m => m.sender !== 'system')
        .slice(-12) // last 12 messages for richer context window
        .map(m => `${m.senderName} (${m.sender === 'support_agent' ? 'Agent' : 'User'}): ${m.text}`)
        .join('\n');

      const userPrompt = `System instructions require you to politely, warmly reply to the user.
Here is the recent support chat transcript:
${conversationSnippet}

Generate the agent message responding to the User politely, naturally, in their language, in under 2 sentences. DO NOT prefix with "Agent:" or "Bongo Support Agent:".`;

      const imgContent = lastMsg.attachmentUrl ? parseDataUrl(lastMsg.attachmentUrl) : null;
      let replyText = '';
      try {
        let modelResponse;
        if (imgContent && lastMsg.attachmentType === 'image') {
          const imgPart = {
            inlineData: {
              mimeType: imgContent.mimeType,
              data: imgContent.data
            }
          };
          const txtPart = {
            text: `${userPrompt}\n\n[Note: Please inspect the attached user screenshot above and handle their streaming/app error visually.]`
          };
          modelResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: { parts: [imgPart, txtPart] },
            config: {
              systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
              temperature: 0.7
            }
          });
        } else {
          modelResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: userPrompt,
            config: {
              systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
              temperature: 0.7
            }
          });
        }
        replyText = modelResponse.text || 'ধন্যবাদ! আমি আপনার বার্তাটি পেয়েছি। আমাদের লাইভ টিম বিষয়টি দেখছে।';
      } catch (gemIniErr: any) {
        console.warn('Gemini live support reply engine hit an error (falling back to automatic rule response):', gemIniErr?.message || gemIniErr);
        
        // High-quality Bengali rule-based support bot fallback
        const userText = (lastMsg.text || '').toLowerCase();
        if (userText.includes('চ্যানেল') || userText.includes('ভিডিও') || userText.includes('বাফারিং') || userText.includes('চলছে না') || userText.includes('সমস্যা')) {
          replyText = 'জি, চ্যানেলটি লোড হতে কিছুটা সময় লাগার জন্য আন্তরিকভাবে দুঃখিত। অনুগ্রহ করে আপনার ইন্টারনেট কানেকশন চেক করুন, অথবা পেজটি একবার রিফ্রেশ/রিলোড করে নিন।';
        } else if (userText.includes('টাকা') || userText.includes('পেমেন্ট') || userText.includes('বিকাশ') || userText.includes('রকেট') || userText.includes('নগদ') || userText.includes('ভিআইপি') || userText.includes('অ্যাকাউন্ট')) {
          replyText = 'ভিআইপি সাবস্ক্রিপশন এবং পেমেন্ট সংক্রান্ত যেকোনো তথ্যের জন্য অনুগ্রহ করে আমাদের হেল্পডেস্কে এবং এডমিন প্যানেলে যোগাযোগ করুন। আমরা সাহায্য করতে প্রস্তুত।';
        } else if (userText.includes('এডমিন') || userText.includes('হেল্প') || userText.includes('hello') || userText.includes('হাই') || userText.includes('হ্যালো')) {
          replyText = 'হ্যালো! ফ্রী ওয়ার্ল্ড কাপ বিডি সাপোর্ট সেন্টারে আপনাকে স্বাগতম। আপনার টিভি সার্ভিস বা চ্যানেল নিয়ে কোনো প্রশ্ন থাকলে এখানে লিখে পাঠান, আমি সাহায্য করছি।';
        } else {
          replyText = 'ধন্যবাদ! আপনার বার্তাটি আমরা পেয়েছি। আমাদের একজন লাইভ টেকনিক্যাল সাপোর্ট স্পেশালিস্ট খুব দ্রুত বিষয়টি দেখে আপনাকে জানাবেন।';
        }
      }

      // Read and push AI response safely
      const latestSessions = readSupportSessions();
      const targetSession = latestSessions.find(s => s.id === sessionId);
      if (targetSession && targetSession.status !== 'closed') {
        const aiTimeStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
        targetSession.messages.push({
          id: 'msg_ai_reply_' + Date.now(),
          sender: 'support_agent',
          senderName: 'সাপোর্ট এজেন্ট (AI)',
          text: replyText,
          time: aiTimeStr
        });
        targetSession.lastMessageAt = new Date().toISOString();
        if (targetSession.status === 'pending') {
          targetSession.status = 'accepted';
        }
        writeSupportSessions(latestSessions);
      }
    } catch (outerErr) {
      console.error('Outer error in triggerAISupportReply:', outerErr);
    }
  }, 900); // Instant & snappy 900ms feel
}

// GET all customer support sessions
app.get('/api/support/sessions', (req, res) => {
  const sessions = readSupportSessions();
  return res.json(sessions);
});

// POST to create a support session or restore an active one
app.post('/api/support/sessions', (req, res) => {
  const { username, name, problem } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const sessions = readSupportSessions();
  
  // Look for any existing pending or accepted session
  let existingSession = sessions.find(s => s.username === username && s.status !== 'closed');
  
  if (existingSession) {
    // If the problem shifted, let's append it as an update message
    if (problem && existingSession.problem !== problem) {
      existingSession.problem = problem;
      const timeStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
      existingSession.messages.push({
        id: 'msg_prob_upd_' + Date.now(),
        sender: 'system',
        senderName: 'সিস্টেম নোটিশ',
        text: `ইউজার সমস্যা বিবরণ আপডেট করেছেন: "${problem}"`,
        time: timeStr
      });
      existingSession.lastMessageAt = new Date().toISOString();
      writeSupportSessions(sessions);
    }
    return res.json(existingSession);
  }

  // Create a brand new session
  const timeStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  const newSession: TicketSession = {
    id: 'session_' + username + '_' + Math.floor(Math.random() * 1000000),
    username,
    name: name || username,
    problem: problem || 'অন্যান্য সমস্যা',
    status: 'pending',
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg_sys_init_' + Date.now(),
        sender: 'system',
        senderName: 'হেল্পডেস্ক নোটিশ',
        text: 'স্বাগতম! আপনার অ্যাকাউন্ট থেকে সাপোর্ট রিকোয়েস্ট সফলভাবে সাবমিট করা হয়েছে। আমাদের একজন এজেন্ট দ্রুত আপনার সাথে কথা বলবেন। অনুগ্রহ করে লাইনে যুক্ত থাকুন।',
        time: timeStr
      },
      {
        id: 'msg_user_sys_problem_' + Date.now(),
        sender: username,
        senderName: name || username,
        text: `[রিপোর্টেড সমস্যা]: ${problem || 'অন্যান্য সমস্যা'}`,
        time: timeStr
      }
    ]
  };

  sessions.unshift(newSession); // New sessions show at top of admin view
  writeSupportSessions(sessions);
  
  // Instantly trigger initial support AI answer to reported problem on session creation
  if (supportConfig.supportEnabled) {
    triggerAISupportReply(newSession.id);
  }

  return res.json(newSession);
});

// POST accept a support session
app.post('/api/support/sessions/accept', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const sessions = readSupportSessions();
  const session = sessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'accepted';
  const timeStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  session.messages.push({
    id: 'msg_sys_accept_' + Date.now(),
    sender: 'system',
    senderName: 'সিস্টেম নোটিশ',
    text: 'আপনার একাউন্ট এজেন্টের সাথে কানেক্ট হয়েছে, অনুগ্রহ করে আপনার সমস্যা তুলে ধরুন। আমাদের এজেন্ট সাহায্য করতে প্রস্তুত আছেন।',
    time: timeStr
  });
  session.lastMessageAt = new Date().toISOString();

  writeSupportSessions(sessions);
  return res.json(session);
});

// POST close a support session
app.post('/api/support/sessions/close', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const sessions = readSupportSessions();
  const session = sessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'closed';
  const timeStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  session.messages.push({
    id: 'msg_sys_close_' + Date.now(),
    sender: 'system',
    senderName: 'সিস্টেম নোটিশ',
    text: 'এই সাপোর্ট চ্যাট সেশনটি এডমিন বা এজেন্টের অনুরোধে সফলভাবে ক্লোজড করা হয়েছে। ধন্যবাদ!',
    time: timeStr
  });
  session.lastMessageAt = new Date().toISOString();

  writeSupportSessions(sessions);
  return res.json(session);
});

// GET messages of a support session (long polling friendly)
app.get('/api/support/messages/:id', (req, res) => {
  const { id } = req.params;
  const sessions = readSupportSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  return res.json(session.messages);
});

// Support Configuration File persistence
const SUPPORT_CONFIG_FILE = path.join(process.cwd(), 'support_config.json');
let supportConfig = { supportEnabled: true };
try {
  if (fs.existsSync(SUPPORT_CONFIG_FILE)) {
    supportConfig = JSON.parse(fs.readFileSync(SUPPORT_CONFIG_FILE, 'utf-8'));
  }
} catch (e) {
  // Use default
}

// GET currently active support availability status
app.get('/api/support/status', (req, res) => {
  res.json(supportConfig);
});

// POST to toggle support status globally (Online / Offline)
app.post('/api/support/status', (req, res) => {
  const { supportEnabled } = req.body;
  if (typeof supportEnabled === 'boolean') {
    supportConfig.supportEnabled = supportEnabled;
    try {
      fs.writeFileSync(SUPPORT_CONFIG_FILE, JSON.stringify(supportConfig, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving support config:', e);
    }
  }
  res.json(supportConfig);
});

// POST a message to an active support session
app.post('/api/support/messages', (req, res) => {
  const { id, sender, senderName, text, attachmentUrl, attachmentType } = req.body;
  if (!id || !sender || !text) {
    return res.status(400).json({ error: 'Session ID, sender, and text are required' });
  }

  // Handle support temp closing block for users
  const isInternalSender = sender === 'admin' || sender === 'support_agent' || sender === 'system';
  if (!supportConfig.supportEnabled && !isInternalSender) {
    return res.status(403).json({ error: 'আমাদের এজেন্ট সাপোর্ট এখন সাময়িকভাবে বন্ধ আছে।' });
  }

  const sessions = readSupportSessions();
  const session = sessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or already closed' });
  }

  const timeStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  const newMessage: TicketMessage = {
    id: 'msg_user_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
    sender,
    senderName: senderName || sender,
    text,
    time: timeStr,
    attachmentUrl,
    attachmentType
  };

  session.messages.push(newMessage);
  session.lastMessageAt = new Date().toISOString();

  // If user sends a message, set ticket back to pending if closed/accepted to notify admin
  if (!isInternalSender && session.status === 'closed') {
    session.status = 'pending';
  }

  writeSupportSessions(sessions);

  // Trigger Gemini Auto-Reply in the background for users
  if (!isInternalSender && supportConfig.supportEnabled) {
    triggerAISupportReply(id);
  }

  return res.json(session);
});

// ABUSE REPORTS FILE ON SERVER
const REPORTS_FILE = path.join(process.cwd(), 'abuse_reports.json');

// GET all abuse reports
app.get('/api/reports', (req, res) => {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
  } catch (e) {
    console.error('Error reading reports:', e);
  }
  return res.json([]);
});

// POST to insert a new abuse report
app.post('/api/reports', (req, res) => {
  try {
    const newReport = req.body;
    let reports = [];
    if (fs.existsSync(REPORTS_FILE)) {
      const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
      reports = JSON.parse(data);
    }
    reports.push(newReport);
    if (reports.length > 200) {
      reports.shift(); // Keep last 200
    }
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
    return res.json({ success: true, reports });
  } catch (e: any) {
    console.error('Error writing report:', e);
    return res.status(500).json({ error: e.message });
  }
});

// POST to delete a specific report
app.post('/api/reports/delete', (req, res) => {
  try {
    const { id } = req.body;
    if (fs.existsSync(REPORTS_FILE)) {
      const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
      let reports = JSON.parse(data);
      reports = reports.filter((r: any) => r.id !== id);
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// SERVER-BACKED SITE SETTINGS ENGINE FOR CONFIG, ADS, & MAINTENANCE MODE
interface CustomAd {
  id: string;
  title: string;
  placement: 'top' | 'bottom' | 'popunder' | 'floating' | 'sidebar';
  code: string;
  active: boolean;
}

interface SiteSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  telegramUrl: string;
  siteNameEnglish: string;
  siteNameBangla: string;
  marqueeText: string;
  siteLogoUrl: string;
  customAds: CustomAd[];
}

const SETTINGS_FILE = path.join(process.cwd(), 'site_settings.json');
const USERS_FILE = path.join(process.cwd(), 'users_database.json');
const MODERATION_FILE = path.join(process.cwd(), 'moderation_database.json');
const PARTNERS_FILE = path.join(process.cwd(), 'partner_members.json');

function readSiteSettings(): SiteSettings {
  const defaultSettings: SiteSettings = {
    maintenanceMode: false,
    maintenanceMessage: 'সাময়িকভাবে আমাদের ওয়েবসাইট এখন বন্ধ আছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, দ্রুতই আবার চালু করা হবে!',
    telegramUrl: 'https://t.me/FIFAWorldCupbd1',
    siteNameEnglish: 'Free World Cup BD',
    siteNameBangla: 'ফ্রী ওয়ার্ল্ড কাপ বিডি',
    marqueeText: 'স্বাগতম Free World Cup BD-তে! 📺 সম্পুর্ণ ফ্রিতে স্পোর্টস প্লেয়ারে উপভোগ করুন প্রিয় সব লাইভ ওয়ার্ল্ড কাপ, ঘরোয়া ও আন্তর্জাতিক খেলাধুলা এবং বিনোদন চ্যানেল।',
    siteLogoUrl: '',
    customAds: [
      {
        id: 'ad_init_1',
        title: 'প্রথম ব্যানার বিজ্ঞাপন (বিজ্ঞাপন ১)',
        placement: 'top',
        code: '<div style="text-align:center; padding: 12px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.25); color: #38bdf8; font-weight: bold; font-family: sans-serif; border-radius: 12px; font-size: 11px;">🏆 স্পন্সরড অফার: আমাদের অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করতে আমাদের টেলিগ্রাম চ্যানেলে যুক্ত হোন!</div>',
        active: true
      }
    ]
  };

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading site settings:', e);
  }
  return defaultSettings;
}

function writeSiteSettings(settings: SiteSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing site settings:', e);
  }
}

// Helper functions for Users Database
function readUsersDb(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading users database:', e);
  }
  return [];
}

function writeUsersDb(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing users database:', e);
  }
}

// Helper functions for Moderation Stats (Verifications, Bans, Mutes)
interface ModerationData {
  verifiedUsers: string[];
  bannedUsers: string[];
  mutedUsers: string[];
}

function readModDb(): ModerationData {
  const defaultMod: ModerationData = { verifiedUsers: [], bannedUsers: [], mutedUsers: [] };
  try {
    if (fs.existsSync(MODERATION_FILE)) {
      return { ...defaultMod, ...JSON.parse(fs.readFileSync(MODERATION_FILE, 'utf-8')) };
    }
  } catch (e) {
    console.error('Error reading mod database:', e);
  }
  return defaultMod;
}

function writeModDb(mod: ModerationData) {
  try {
    fs.writeFileSync(MODERATION_FILE, JSON.stringify(mod, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing mod database:', e);
  }
}

// Helper functions for Partner Program
function readPartnersDb(): any[] {
  try {
    if (fs.existsSync(PARTNERS_FILE)) {
      return JSON.parse(fs.readFileSync(PARTNERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading partners database:', e);
  }
  return [];
}

function writePartnersDb(partners: any[]) {
  try {
    fs.writeFileSync(PARTNERS_FILE, JSON.stringify(partners, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing partners database:', e);
  }
}

// GET site settings
app.get('/api/settings', (req, res) => {
  res.json(readSiteSettings());
});

// POST to update site settings
app.post('/api/settings', (req, res) => {
  try {
    const currentSettings = readSiteSettings();
    const updated = { ...currentSettings, ...req.body };
    writeSiteSettings(updated);
    res.json({ success: true, settings: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// User DB API routes
app.get('/api/users', (req, res) => {
  res.json({ users: readUsersDb() });
});

app.post('/api/users/signup', (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.email) {
      return res.status(400).json({ error: 'Missing user object or email field' });
    }
    const currentList = readUsersDb();
    const lowerEmail = user.email.toLowerCase().trim();
    // Exclude duplicates
    const filtered = currentList.filter(u => u.email.toLowerCase().trim() !== lowerEmail);
    filtered.push(user);
    writeUsersDb(filtered);
    res.json({ success: true, users: filtered });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users/sync', (req, res) => {
  try {
    const { users } = req.body;
    if (Array.isArray(users)) {
      const currentList = readUsersDb();
      // Merge unique entries by email
      const mergedMap = new Map();
      currentList.forEach(u => mergedMap.set(u.email.toLowerCase().trim(), u));
      users.forEach(u => {
        if (u && u.email) {
          mergedMap.set(u.email.toLowerCase().trim(), u);
        }
      });
      const merged = Array.from(mergedMap.values());
      writeUsersDb(merged);
      return res.json({ success: true, users: merged });
    }
    res.status(400).json({ error: 'Payload must be an array of users' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Moderation API routes
app.get('/api/moderation/status', (req, res) => {
  res.json(readModDb());
});

app.post('/api/moderation/update', (req, res) => {
  try {
    const current = readModDb();
    const { verifiedUsers, bannedUsers, mutedUsers } = req.body;
    const updated = {
      verifiedUsers: verifiedUsers !== undefined ? verifiedUsers : current.verifiedUsers,
      bannedUsers: bannedUsers !== undefined ? bannedUsers : current.bannedUsers,
      mutedUsers: mutedUsers !== undefined ? mutedUsers : current.mutedUsers,
    };
    writeModDb(updated);
    res.json({ success: true, ...updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Partner Program API routes
app.get('/api/partner/list', (req, res) => {
  res.json({ members: readPartnersDb() });
});

app.post('/api/partner/join', (req, res) => {
  try {
    const { name, username, email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email address' });
    }
    const currentList = readPartnersDb();
    const newMember = {
      name: name || 'Anonymous Guest',
      username: username || 'guest_user',
      email: email,
      timestamp: new Date().toISOString()
    };
    // Exclude duplicates
    const filtered = currentList.filter(m => m.email.toLowerCase().trim() !== email.toLowerCase().trim());
    filtered.push(newMember);
    writePartnersDb(filtered);
    res.json({ success: true, members: filtered });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- GLOBAL PERSISTENT STADIUM LIVE CHAT STORAGE ---
interface StadiumChatMessage {
  id: string;
  name: string;
  username: string;
  avatar: string;
  flag: string;
  text: string;
  time: string;
  isAdmin?: boolean;
  replyTo?: {
    id: string;
    text: string;
    username: string;
  };
}

let stadiumChatMessages: Record<string, StadiumChatMessage[]> = {};
const STADIUM_CHAT_FILE = path.join(process.cwd(), 'stadium_chat.json');

// Bootstrap stadium chat on startup
try {
  if (fs.existsSync(STADIUM_CHAT_FILE)) {
    const rawData = fs.readFileSync(STADIUM_CHAT_FILE, 'utf-8');
    stadiumChatMessages = JSON.parse(rawData);
  }
} catch (e) {
  console.error('Error bootstrapping stadium live chat database:', e);
}

// Helper to persist stadium live chat safely
void function loadDefaultChats() {
  // Ensure we have arrays ready for at least the baseline channels
  const defaults = ["fb_somoy_tv", "fb_jamuna_tv", "fb_tsports", "fb_gtv", "fb_channel24", "fb_btv_national", "fb_btv_world", "fb_sangshad_tv"];
  defaults.forEach(chan => {
    if (!stadiumChatMessages[chan]) {
      stadiumChatMessages[chan] = [];
    }
  });
}();

function saveStadiumChats() {
  try {
    fs.writeFileSync(STADIUM_CHAT_FILE, JSON.stringify(stadiumChatMessages, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error persisting stadium chat db to disk:', e);
  }
}

// Get messages for a channel
app.get('/api/stadium-chat/:channelId', (req, res) => {
  const { channelId } = req.params;
  const msgs = stadiumChatMessages[channelId] || [];
  return res.json(msgs);
});

// Post a message in stadium live chat
app.post('/api/stadium-chat/:channelId', (req, res) => {
  const { channelId } = req.params;
  const { id, name, username, avatar, flag, text, time, isAdmin, replyTo } = req.body;

  if (!username || !text) {
    return res.status(400).json({ error: 'Username and message text are required.' });
  }

  const cleanMessage: StadiumChatMessage = {
    id: id || `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: name || username,
    username,
    avatar: avatar || '',
    flag: flag || '🇧🇩',
    text: text.trim(),
    time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isAdmin: !!isAdmin,
    replyTo
  };

  if (!stadiumChatMessages[channelId]) {
    stadiumChatMessages[channelId] = [];
  }

  stadiumChatMessages[channelId].push(cleanMessage);

  // Maintain sliding window of last 60 messages to optimize memory/payload footprint
  if (stadiumChatMessages[channelId].length > 60) {
    stadiumChatMessages[channelId].shift();
  }

  saveStadiumChats();
  return res.json({ success: true, messages: stadiumChatMessages[channelId] });
});

// Delete a message by ID from stadium chat (Moderation action)
app.post('/api/stadium-chat/:channelId/delete', (req, res) => {
  const { channelId } = req.params;
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing message ID' });
  }

  if (stadiumChatMessages[channelId]) {
    stadiumChatMessages[channelId] = stadiumChatMessages[channelId].filter(m => m.id !== id);
    saveStadiumChats();
  }
  return res.json({ success: true, messages: stadiumChatMessages[channelId] || [] });
});

// Ban/Mute support: Delete all messages by user (Extreme moderation action)
app.post('/api/stadium-chat/:channelId/delete-user', (req, res) => {
  const { channelId } = req.params;
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Missing username parameter' });
  }

  if (stadiumChatMessages[channelId]) {
    stadiumChatMessages[channelId] = stadiumChatMessages[channelId].filter(m => m.username !== username);
    saveStadiumChats();
  }
  return res.json({ success: true, messages: stadiumChatMessages[channelId] || [] });
});


// --- REAL-TIME TV CASTING AND SECURE REMOTE PAIRING API ---
interface CastSession {
  pairingCode: string;
  createdAt: number;
  lastActive: number;
  receiverDeviceName?: string;
  controllerDeviceName?: string;
  activeChannel?: any;
  playbackState?: {
    isPlaying: boolean;
    currentTime?: number;
    volume?: number;
    aspectRatio?: string;
  };
  commands: any[];
}

let tvCastSessions: Record<string, CastSession> = {};

// 1. Create a TV Session (TV generates or gets assigned a pairing code)
app.post('/api/tv/register', (req, res) => {
  try {
    const { deviceName, requestedCode } = req.body;
    let pairingCode = requestedCode;
    
    if (!pairingCode) {
      // Generate a 6-digit atomic pairing pin
      pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    const now = Date.now();
    // Clean up expired casting sessions older than 4 hours
    Object.keys(tvCastSessions).forEach(key => {
      if (now - tvCastSessions[key].createdAt > 4 * 60 * 60 * 1000) {
        delete tvCastSessions[key];
      }
    });

    tvCastSessions[pairingCode] = {
      pairingCode,
      createdAt: now,
      lastActive: now,
      receiverDeviceName: deviceName || 'Smart TV Browser',
      controllerDeviceName: undefined,
      activeChannel: undefined,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        volume: 100,
        aspectRatio: 'video-contain'
      },
      commands: []
    };

    return res.json({ success: true, session: tvCastSessions[pairingCode] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 2. Connect client (Phone Controller) to TV with code
app.post('/api/tv/pair', (req, res) => {
  try {
    const { pairingCode, deviceName } = req.body;
    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }
    
    const cleanCode = pairingCode.toString().trim().toUpperCase();
    const session = tvCastSessions[cleanCode];
    if (!session) {
      return res.status(404).json({ error: 'অবৈধ কোড! দয়া করে সঠিক ৬ সংখ্যার কোড প্রবেশ করান বা নতুন কোড জেনারেট করুন।' });
    }

    session.controllerDeviceName = deviceName || 'Mobile Remote';
    session.lastActive = Date.now();

    return res.json({ success: true, session });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 3. Get Status / Fetch commands (Poll pattern mimicking real-time sync with high frequency client side)
app.get('/api/tv/status/:code', (req, res) => {
  try {
    const code = req.params.code.toString().trim().toUpperCase();
    const session = tvCastSessions[code];
    if (!session) {
      return res.status(404).json({ error: 'সেশন পাওয়া যায়নি বা এটি মেয়াদোত্তীর্ণ হয়ে গেছে।' });
    }

    session.lastActive = Date.now();

    // Copy commands to send, then flush them
    const pendingCommands = [...session.commands];
    session.commands = [];

    return res.json({
      success: true,
      paired: !!session.controllerDeviceName,
      session,
      commands: pendingCommands
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 4. Send command from controller to receiver TV
app.post('/api/tv/command', (req, res) => {
  try {
    const { pairingCode, commandType, payload } = req.body;
    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const cleanCode = pairingCode.toString().trim().toUpperCase();
    const session = tvCastSessions[cleanCode];
    if (!session) {
      return res.status(404).json({ error: 'টিভি সেশন খুঁজে পাওয়া যায়নি। অনুগ্রহ করে আবার পেয়ার করুন।' });
    }

    session.lastActive = Date.now();
    
    const newCommand = {
      id: Math.random().toString(36).substring(7),
      type: commandType, // e.g. "play_channel", "set_volume", "toggle_play", "set_aspect"
      payload,
      timestamp: Date.now()
    };
    session.commands.push(newCommand);

    return res.json({ success: true, command: newCommand });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 5. Update receiver TV player current state (for remote state feedback reflection)
app.post('/api/tv/update-state', (req, res) => {
  try {
    const { pairingCode, activeChannel, playbackState } = req.body;
    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const cleanCode = pairingCode.toString().trim().toUpperCase();
    const session = tvCastSessions[cleanCode];
    if (!session) {
      return res.status(404).json({ error: 'TV pair session not active' });
    }

    session.lastActive = Date.now();
    if (activeChannel !== undefined) session.activeChannel = activeChannel;
    if (playbackState !== undefined) {
      session.playbackState = {
        ...session.playbackState,
        ...playbackState
      };
    }

    return res.json({ success: true, session });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// Vite server startup config
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);

    // Asynchronously pre-heat channel list and clean offline streams
    setTimeout(async () => {
      try {
        console.log('[System Start] Loading first-time channels and pre-heating health cache...');
        const initialChannels = await fetchAllChannels();
        runBackgroundChannelHealthCheck(initialChannels).catch(console.error);
      } catch (err) {
        console.error('Error in initial health preheat:', err);
      }
    }, 4000); // 4s delay to keep bootstrapping clean and fast
  });
}

startServer();

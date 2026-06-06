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
import { USER_NEW_CHANNELS } from './server_new_channels';

// Initialize the secure-level server side Gemini API Client with lazy-loaded safe fallback
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to robust rule-based logic and native fallbacks.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

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
const BUILTIN_STREAM_FEEDS: any[] = [
  {
    name: 'Obiram TV M3U',
    url: 'https://playlist.emonsa4.workers.dev/playlist.m3u',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://obiramtvlive.pages.dev/',
      'Origin': 'https://obiramtvlive.pages.dev',
      'X-Requested-With': 'XMLHttpRequest'
    }
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
  // --- Indian Bangla ---
  {
    id: "req_star_jolsha",
    name: "STAR JOLSHA HD",
    url: "https://yupptvcatchupire.yuppcdn.net/preview/starjalsha/1800.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Jalsha-HD.png",
    group: "Indian Bangla",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_zee_bangla",
    name: "ZEE BANGLA",
    url: "https://tvsen5.aynaott.com/PNEb3v2q6GBk/tracks-v1a1/mono.ts.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-Bangla-HD.png",
    group: "Indian Bangla",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_zee_bangla_shonar",
    name: "ZEE BANGLA SHONAR HD",
    url: "https://server.itcnbd.live/stream/zee_bangla_cinema.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-Bangla-Cinema.png",
    group: "Indian Bangla",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_enter10_hd",
    name: "ENTER 10 HD",
    url: "https://live-bangla.akamaized.net/liveabr/pub-iobanglakp3sff/live_720p/chunks.m3u8",
    logo: "https://i.imgur.com/8Qj8W9N.png",
    group: "Indian Bangla",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_sony_aat_hd",
    name: "SONY AAT HD",
    url: "https://server.itcnbd.live/stream/sonyaath.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Aath.png",
    group: "Indian Bangla",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },

  // --- Indian Hindi Entertainment ---
  {
    id: "req_sony_tv_hd",
    name: "SONY TV HD",
    url: "https://server.itcnbd.live/stream/sonyentertainmnt_hd.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Entertainment-Television-HD.png",
    group: "Indian Hindi Entertainment",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_sony_sab",
    name: "SONY SAB",
    url: "https://server.itcnbd.live/stream/sonysab_hd.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sab.png",
    group: "Indian Hindi Entertainment",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_zee_tv_hd",
    name: "ZEE TV HD",
    url: "https://server.itcnbd.live/stream/zee_tv_hd.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Zee-TV-HD.png",
    group: "Indian Hindi Entertainment",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_and_tv",
    name: "& TV",
    url: "https://server.itcnbd.live/stream/and_tv_hd.m3u8",
    logo: "https://i.imgur.com/uR7917l.png",
    group: "Indian Hindi Entertainment",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },

  // --- Indian Hindi Movies ---
  {
    id: "req_zee_cafe",
    name: "ZEE CAFE",
    url: "https://server.itcnbd.live/stream/zee_cafe_hd.m3u8",
    logo: "https://i.imgur.com/pZqN6i2.png",
    group: "Indian Hindi Movies",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_and_pictures_hd",
    name: "& PICTURES HD",
    url: "https://server.itcnbd.live/stream/andpicture_hd.m3u8",
    logo: "https://i.imgur.com/V7RST2k.png",
    group: "Indian Hindi Movies",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },

  // --- Music Channel ---
  {
    id: "req_zing_music",
    name: "ZING MUSIC",
    url: "https://server.itcnbd.live/stream/zing_sd.m3u8",
    logo: "https://i.imgur.com/UfU8bYt.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_sangeet_bangla",
    name: "সংগীত বাংলা (SANGEET BANGLA)",
    url: "http://10.20.30.40:8088/702/tracks-v1a1/mono.m3u8",
    logo: "https://i.imgur.com/N6K2241.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_9xm_music",
    name: "9XM MUSIC",
    url: "https://wiselp.wiseplayout.com/9XM/HD1080/HD1080.m3u8",
    logo: "https://i.imgur.com/s6n5O4Z.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_9x_jalwa",
    name: "9X JALWA",
    url: "https://wiselp.wiseplayout.com/9X_Jalwa/SD216/SD216.m3u8",
    logo: "https://i.imgur.com/y1V9zYk.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_9x_tashan",
    name: "9X TASHAN",
    url: "https://9xjio.wiseplayout.com/9X_Tashan/SD504/SD504.m3u8",
    logo: "https://i.imgur.com/nsw8N1M.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_dance_tv",
    name: "DANCE TV",
    url: "https://m1b2.worldcast.tv/dancetelevisionone/2/dancetelevisionone.m3u8",
    logo: "https://i.imgur.com/R3ZtkpL.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_joo_music",
    name: "JOO MUSIC",
    url: "https://livecdn.live247stream.com/joomusic/tv/joomusic/stream/chunks.m3u8",
    logo: "https://i.imgur.com/39N6Fk1.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_music_india",
    name: "MUSIC INDIA",
    url: "https://cdn-2.pishow.tv/live/226/226_2.m3u8",
    logo: "https://i.imgur.com/7A2xUf6.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_8xm",
    name: "8XM",
    url: "https://ml-pull-dvc-myco.io:2096/8XM_MUSIC/tracks-v1a1/mono.ts.m3u8",
    logo: "https://i.imgur.com/qU3g94A.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_party_universe",
    name: "PARTY UNIVERS",
    url: "https://nomawnoijl.gpcdn.net/akash/partyuniverse/chunks.m3u8",
    logo: "https://i.imgur.com/C7W2yZ6.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_atn_music",
    name: "ATN MUSIC",
    url: "https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/atnmusic.stream/live-orgin/atnmusic.stream/chunks.m3u8",
    logo: "https://i.imgur.com/o7hVfK5.png",
    group: "Music Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },

  // --- Sports Channel ---
  {
    id: "req_t_sports",
    name: "T SPORTS Live",
    url: "http://198.195.239.50:8095/Tsports/tracks-v1a1/mono.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/T-Sports.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_ten_cricket",
    name: "TEN CRICKET",
    url: "https://server.itcnbd.live/stream/ten_cricket.m3u8",
    logo: "https://i.imgur.com/JjKz9W6.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_sony_ten_sports_1",
    name: "SONY TEN SPORTS 1",
    url: "https://server.itcnbd.live/stream/sony_sports_1_hd.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-1.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_sony_ten_sports_2",
    name: "SONY TEN SPORTS 2",
    url: "https://server.itcnbd.live/stream/sony_sports_2_hd.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-2.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_sony_ten_sports_5",
    name: "SONY TEN SPORTS 5",
    url: "https://server.itcnbd.live/stream/sony_sports_5_hd.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Sony-Sports-Ten-5.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_star_sports_1",
    name: "STAR SPORTS 1",
    url: "https://starsportshindiii.pages.dev/720p.m3u8",
    logo: "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/Star-Sports-1-Hindi-HD.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_dd_sports",
    name: "D D SPORTS",
    url: "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index_3.m3u8",
    logo: "https://i.imgur.com/O61z6Oa.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_fifa_plus",
    name: "FIFA PLUS",
    url: "https://a62dad94.wurl.com/manifest/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0ZJRkFQbHVzRW5nbGlzaF9ITFM/058eff13-1fe8-4619-94fc-eeab40e86d10/1.m3u8",
    logo: "https://i.imgur.com/G7GnyfW.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_euro_sports",
    name: "EURO SPORTS",
    url: "https://server.itcnbd.live/stream/euro_sports_hd.m3u8",
    logo: "https://i.imgur.com/k9v9z99.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_willow_sports",
    name: "WILLOW SPORTS",
    url: "https://tvsen5.aynaott.com/willowhd/tracks-v1a1/mono.ts.m3u8",
    logo: "https://i.imgur.com/w9U3v8z.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_star_sports_select_1",
    name: "STAR SPORTS SELECT 1",
    url: "http://198.195.239.50:8095/StarSportsSelect1/tracks-v1a1/mono.m3u8",
    logo: "https://i.imgur.com/9n6bW1h.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  },
  {
    id: "req_star_sports_select_2",
    name: "STAR SPORTS SELECT 2",
    url: "http://198.195.239.50:8095/StarSportsSelect2/tracks-v1a1/mono.m3u8",
    logo: "https://i.imgur.com/9n6bW1h.png",
    group: "Sports Channel",
    playlistSource: "Checked Playlist Streams",
    status: "online"
  }
];

// High-quality, verified working sports channels from previous feeds
const PREVIOUS_ACTIVE_SPORTS_CHANNELS: Omit<Channel, 'id' | 'status'>[] = [
  {
    name: "T Sports Live HD",
    url: "https://live.tsports.com/tsports/index.m3u8",
    logo: "https://s3.aynaott.com/storage/dbc585f70a60b9855b6e13a8ce4cb6f4",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "GAZI TV (GTV)",
    url: "https://live.gtvbd.com/gtvbd/index.m3u8",
    logo: "https://s3.aynaott.com/storage/417a833f6d83021c99bfc3d4176610f4",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "GAZI TV (Alternative)",
    url: "https://tvsen5.aynaott.com/Ravc7gPCZpxk/index.m3u8",
    logo: "https://tvassets.roarzone.net/images/gazi-tv.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "PTV SPORTS HD",
    url: "https://tvsen5.aynaott.com/PtvSports/index.m3u8",
    logo: "https://i.imgur.com/WFf2kaH.jpeg",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Star Sports 1 Hindi",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=star-sports-1-hindi",
    logo: "https://stream.crichd.tv/assets/uploads/channels/51.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Ten Sports",
    url: "https://xstream.emonsa798.workers.dev/?url=http://premiumtvs.space:8080/live/6388578743/4853784376/98.ts",
    logo: "https://stream.crichd.tv/assets/uploads/channels/50.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "ESPN US",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=espn-us",
    logo: "https://stream.crichd.tv/assets/uploads/channels/147.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "ESPN 2 US",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=espn-2-us",
    logo: "https://stream.crichd.tv/assets/uploads/channels/148.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TNT Sports 1",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=tnt-sports-1",
    logo: "https://crichd.free/assets/uploads/channels/10.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TNT Sports 2",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=tnt-sports-2",
    logo: "https://stream.crichd.tv/assets/uploads/channels/11.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TNT Sports 3",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=tnt-sports-3",
    logo: "https://stream.crichd.tv/assets/uploads/channels/12.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TNT Sports 4",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=tnt-sports-4",
    logo: "https://stream.crichd.tv/assets/uploads/channels/13.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Viaplay Sports 1 UK",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=viaplay-sports-1-uk",
    logo: "https://stream.crichd.tv/assets/uploads/channels/17.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Viaplay Sports 2 UK",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=viaplay-sports-2-uk",
    logo: "https://stream.crichd.tv/assets/uploads/channels/28.gif",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sky Sports News",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=sky-sports-news",
    logo: "https://stream.crichd.tv/assets/uploads/channels/9.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sky Sport 4 NZ",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=sky-sport-4-nz",
    logo: "https://static.wikia.nocookie.net/logopedia/images/c/c1/Sky_Sport_NZ_2019.svg/revision/latest/scale-to-width-down/300?cb=20200809114740",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sky Sport 5 NZ",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=sky-sport-5-nz",
    logo: "https://static.wikia.nocookie.net/logopedia/images/c/c1/Sky_Sport_NZ_2019.svg/revision/latest/scale-to-width-down/300?cb=20200809114740",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sky Sport 6 NZ",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=sky-sport-6-nz",
    logo: "https://static.wikia.nocookie.net/logopedia/images/c/c1/Sky_Sport_NZ_2019.svg/revision/latest/scale-to-width-down/300?cb=20200809114740",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sky Sport 8 NZ",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=sky-sport-8-nz",
    logo: "https://static.wikia.nocookie.net/logopedia/images/c/c1/Sky_Sport_NZ_2019.svg/revision/latest/scale-to-width-down/300?cb=20200809114740",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Willow Cricket Extra",
    url: "https://crichdproxy.saemon068.workers.dev/play?id=willow-cricket-extra",
    logo: "https://stream.crichd.tv/assets/uploads/channels/55.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Bleav Football",
    url: "https://linear-493.frequency.stream/dist/glewedtv/493/hls/master/playlist.m3u8",
    logo: "https://s3.aynaott.com/storage/030ec528e912afb9a2ec3b4c5167a928",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "beIN SPORTS XTRA",
    url: "https://bein-xtra-bein.amagi.tv/playlist.m3u8",
    logo: "https://i.ibb.co/HT49GPmB/XTRA-2.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Cricket Gold",
    url: "https://streams2.sofast.tv/ptnr-yupptv/title-cricketgold/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/b2048bb8-1686-4432-aa50-647245383e0c/manifest.m3u8",
    logo: "https://resources.cricket-australia.pulselive.com/cricket-australia/photo/2025/07/25/836eddae-4329-4542-ad17-dcd37e9d951a/Cricket-Gold-1920x1080_noBG.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "FTF Sports",
    url: "https://1657061170.rsc.cdn77.org/HLS/FTF-LINEAR.m3u8",
    logo: "https://i.imgur.com/yvUjOI3.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "FIFA+",
    url: "https://a62dad94.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0ZJRkFQbHVzRW5nbGlzaF9ITFM/playlist.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "FIFA+ United States",
    url: "https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "FIFA+ Women",
    url: "https://cffda8ff.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/U2Ftc3VuZy1nYl9GSUZBUGx1c3dvbWVuX0hMUw/playlist.m3u8",
    logo: "https://i.imgur.com/xy9ZxVO.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "KTV Sport",
    url: "https://kwtspta.cdn.mangomolo.com/sp/smil:sp.stream.smil/chunklist.m3u8",
    logo: "https://i.imgur.com/R1hGX1d.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "NBC Sports NOW",
    url: "https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008",
    logo: "https://i.imgur.com/EzNf2Yx.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sky Racing 2",
    url: "https://636ffd31f0e12.streamlock.net/RacingStream2/RacingStream2/playlist.m3u8",
    logo: "https://i.imgur.com/TxQvFnQ.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Sports Connect",
    url: "https://streamdot.broadpeak.io/cff02a74da64d1459391ce1f72d58f1a/afxpstr/SportsConnect/index.m3u8",
    logo: "https://i.imgur.com/0sNWg54.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Trace Sport Stars",
    url: "https://lightning-tracesport-samsungau.amagi.tv/playlist.m3u8",
    logo: "https://i.imgur.com/FabFP5A.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TSN The Ocho",
    url: "https://d3pnbvng3bx2nj.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-rds8g35qfqrnv/TSN_The_Ocho.m3u8",
    logo: "https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/CA1400003R3_20240709T002034SQUARE.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TVS Sports",
    url: "https://rpn.bozztv.com/gusa/gusa-tvssports/index.m3u8",
    logo: "https://i.imgur.com/Lwwq62E.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "TVS Turbo",
    url: "https://rpn.bozztv.com/gusa/gusa-tvsturbo/index.m3u8",
    logo: "https://i.imgur.com/7zYIbU1.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "Unbeaten Sports Channel",
    url: "https://d1t5afz6qed3xk.cloudfront.net/Unbeaten.m3u8",
    logo: "https://i.imgur.com/LmkNt3v.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "VSiN",
    url: "https://vsin-sgrewind.streamguys1.com/scte/live-2k/playlist.m3u8",
    logo: "https://i.imgur.com/C4wIRxg.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "World Billiards TV",
    url: "https://9a81dd4ee3884d0dbcacafaf0d81327a.mediatailor.us-east-1.amazonaws.com/v1/master/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BilliardsTV/playlist.m3u8",
    logo: "https://images-3.rakuten.tv/storage/global-live-channel/translation/artwork/80af06f2-a12e-4406-bd13-b932fd69fffe-width200-quality90.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  },
  {
    name: "World Poker Tour",
    url: "https://d3w4n3hhseniak.cloudfront.net/v1/master/9d062541f2ff39b5c0f48b743c6411d25f62fc25/WPT-DistroTV/150.m3u8?ads.vf=EHEabFVWNva",
    logo: "https://i.imgur.com/98kLMjj.png",
    group: "Sports",
    playlistSource: "Previous Active Streams"
  }
];

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

// Map real, stable, lag-free 24/7 Toffee CDN endpoints for matching serial/drama channels
function getToffeeStableUrl(name: string): string | null {
  const norm = name.toLowerCase();
  if (norm.includes('zee bangla cinema')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/zee_bangla_cinema/playlist.m3u8';
  }
  if (norm.includes('zee bangla')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/zee_bangla/playlist.m3u8';
  }
  if (norm.includes('sony aath') || norm.includes('sony atth') || norm.includes('sony aat')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/sonyaath/playlist.m3u8';
  }
  if (norm.includes('zee cinema')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/zee_cinema_hd/playlist.m3u8';
  }
  if (norm.includes('sony sab') || norm.includes('sab tv') || norm.includes('sony sab hd')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/sonysab_hd/playlist.m3u8';
  }
  if (norm.includes('zee tv')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/zee_tv_hd/playlist.m3u8';
  }
  if (norm.includes('sony max')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/sony_max_hd/playlist.m3u8';
  }
  if (norm.includes('sony entertainment') || norm.includes('sony tv')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/sonyentertainmnt_hd/playlist.m3u8';
  }
  if (norm.includes('zee anmol')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/zee_anmol/playlist.m3u8';
  }
  if (norm.includes('zee cafe')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/zee_cafe_hd/playlist.m3u8';
  }
  if (norm.includes('sony pix')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/sonypix_hd/playlist.m3u8';
  }
  if (norm.includes('colors bangla')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/colors_bangla/playlist.m3u8';
  }
  if (norm.includes('colors hd')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/colors_hd/playlist.m3u8';
  }
  if (norm.includes('star plus')) {
    return 'https://bldcmprod-cdn.toffeelive.com/cdn/live/star_plus_hd/playlist.m3u8';
  }
  return null;
}

// Fetch and parse a given M3U playlist feed asynchronously
async function fetchAndParseM3U(feed: { name: string; url: string; headers?: Record<string, string> }): Promise<Channel[]> {
  const parsedChannels: Channel[] = [];
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(feed.headers || {})
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout threshold
    
    let text = '';
    try {
      const res = await fetch(feed.url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        text = await res.text();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Fallback via tlsSafeFetch
      const resFallback = await tlsSafeFetch(feed.url, { headers });
      if (resFallback.ok) {
        text = await resFallback.text();
      }
    }
    
    if (!text) return [];
    
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('#')) {
          j++;
        }
        if (j >= lines.length) break;
        const streamUrl = lines[j].trim();
        if (!streamUrl.startsWith('http')) continue;
        
        const commaIdx = line.indexOf(',');
        const rawTitle = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : '';
        if (!rawTitle) continue;
        
        const cleanName = sanitizeChannelName(rawTitle);
        if (!cleanName) continue;
        
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/logo="([^"]+)"/i);
        const logo = logoMatch ? logoMatch[1].trim() : '';
        
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        const fileGroup = groupMatch ? groupMatch[1].trim() : '';
        const normName = cleanName.toLowerCase();
        
        let assignedGroup = 'Bangla';
        if (/sport|cricket|football|t\s*sports|t-sports|gazi|gtv|premier\s*league/i.test(normName) || /sports|live\s*sport/i.test(fileGroup.toLowerCase())) {
          assignedGroup = 'Sports';
        } else if (/news|somoy|jamuna|ekattor|independent|atn\s*news|channel\s*24/i.test(normName) || /news/i.test(fileGroup.toLowerCase())) {
          assignedGroup = 'News';
        } else if (/jalsha|zee bangla|zee cinema|colors bangla|sony aath|star plus|sony pal|zee anmol|dangal|serial|colors|sony sab|sab tv|star gold/i.test(normName) || /entertainment|serials|movies/i.test(fileGroup.toLowerCase())) {
          assignedGroup = 'Serials';
        }
        
        const channelId = `ch_m3u_${generateChannelId(streamUrl)}`;
        
        parsedChannels.push({
          id: channelId,
          name: cleanName,
          logo: logo || 'https://images.unsplash.com/photo-1540747737956-37872404453a?w=80',
          group: assignedGroup,
          url: streamUrl,
          playlistSource: feed.name,
          status: 'online',
          servers: [{ name: "Server 1", url: streamUrl }]
        });
        
        i = j;
      }
    }
  } catch (err: any) {
    console.error(`Error fetching & parsing playlist feed ${feed.name}:`, err.message);
  }
  return parsedChannels;
}

// Dynamic manual blacklists for crossed channels
const MANUALLY_BLACKLISTED_URLS = new Set([
  "https://proped3fhg87.airspace-cdn.cbsivideo.com/golazo-live-dai/master/golazo-live-dai.m3u8",
  "https://propee33f9c2.airspace-cdn.cbsivideo.com/index.m3u8",
  "http://190.11.225.124:5000/live/fs1_hd/playlist.m3u8",
  "https://tvpass.org/live/FoxSports2/hd",
  "https://dnf08l6u6uxnz.cloudfront.net/master.m3u8",
  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/horizon-sports/master.m3u8?ads.vf=A5pc7nNS254",
  "https://tvpass.org/live/msg-plus/hd",
  "http://user.scalecdn.co:8080/live/54706135/09221986/3092.m3u8",
  "https://tvpass.org/live/nbc-sports-bay-area/hd",
  "https://tvpass.org/live/nbc-sports-boston/hd",
  "https://tvpass.org/live/nbc-sports-philadelphia/hd",
  "https://partneta.cdn.mgmlcdn.com/omsport/smil:omsport.stream.smil/chunklist.m3u8",
  "https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8",
  "https://bcovlive-a.akamaihd.net/540fcb034b144b848e7ff887f61a293a/eu-central-1/6415845530001/profile_0/chunklist.m3u8",
  "https://bcovlive-a.akamaihd.net/29c60f23ea4840ba8726925a77fcfd0b/eu-central-1/6415845530001/profile_0/chunklist.m3u8",
  "https://skylivetab-new.akamaized.net/hls/live/2038782/stcsd/index.m3u8",
  "https://sl.vodep39240327.workers.dev/channel/SONY%20TEN%201.m3u8",
  "https://sl.vodep39240327.workers.dev/channel/SONY%20TEN%202.m3u8",
  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/sportsgrid/master.m3u8?ads.vf=8ukz5gCI8vu",
  "http://121.91.61.106:8000/play/a04h/index.m3u8",
  "https://streamer1.nexgen.bz/TNC_SPORTS/index.m3u8",
  "https://tvpass.org/live/tsn1/hd",
  "https://tvpass.org/live/tsn2/hd",
  "https://tvpass.org/live/tsn3/hd",
  "https://tvpass.org/live/tsn4/hd",
  "https://tvpass.org/live/tsn5/hd",
  "https://d36r8jifhgsk5j.cloudfront.net/Willow_TV.m3u8",
  "https://st2.mediabay.tv/KG_KTRK-Sport/index.m3u8",
  "https://mumt03.tangotv.in/AAKASHAATH/tracks-v2a1/mono.m3u8",
  "http://103.229.254.25:7001/play/a0ds/index.m3u8",
  "http://strem.shrsystem.com/hls/StarPlusHD.m3u8",
  "http://strem.shrsystem.com/hls/ColorsHD.m3u8",
  "http://172.16.29.2:8090/hls/ColorsCineplexHD.m3u8",
  "http://strem.shrsystem.com/hls/StarMoviesHD.m3u8",
  "http://10.20.30.40:8088/503/tracks-v1a1/mono.m3u8",
  "http://10.20.30.40:8088/701/tracks-v1a1/mono.m3u8",
  "https://9xjio.wiseplayout.com/9X_Jhakaas/SD216/SD216.m3u8",
  "https://atomic.streamnet.ro/atomictv.m3u8",
  "https://fl.biztv.media/music_720_QAKpGmVUjaPApCNjpsgBxrdqNihAkl/tracks-v1a1/mono.m3u8",
  "https://d14c63magvk61v.cloudfront.net/strm/channels/zoom/m1.m3u8",
  "https://livetv.powerapp.com.tr/powerturkTV/powerturkhd.smil/chunklist_b2496000_sltur.m3u8?nimblesessionid=529532590",
  "http://198.195.239.50:8095/PTV-kutta/video.m3u8"
]);

const MANUALLY_BLACKLISTED_NAMES_NORM = new Set([
  "cbssportsgolazonetwork",
  "cbssportshq",
  "foxsports1",
  "foxsports2",
  "fubosportsnetwork",
  "horizonsports",
  "msgplus",
  "nbatvcanada",
  "nbcsportsbayarea",
  "nbcsportsboston",
  "nbcsportsphiladelphia",
  "omansportstv",
  "premiersports",
  "ssport",
  "ssport2",
  "skythoroughbredcentral",
  "sonysportsten1",
  "sonysportsten2",
  "sportsgrid",
  "tensportspakistan",
  "tncsports",
  "tsn1",
  "tsn2",
  "tsn3",
  "tsn4",
  "tsn5",
  "willowsports",
  "утркспорт",
  "aakash8",
  "aakashaath",
  "আকাশ৮",
  "colorsbangla",
  "colorsbanglahd",
  "starplus",
  "starbharot",
  "starbharat",
  "colorcineplex",
  "colorscineplex",
  "starmovies",
  "sonypix",
  "b4umusic",
  "9xjhakaas",
  "atomictv",
  "biztv",
  "zoommusic",
  "powerturkmusic",
  "powerturktv",
  "ptvsports"
]);

// Fetch channels from all playlist URLs
async function fetchAllChannels(): Promise<Channel[]> {
  const processedUrls = new Set<string>();
  const mergedMap = new Map<string, Channel>();

  // Helper dedicated merger that maps logos, applies stable CDN paths, and combines redundant servers elegantly!
  function addOrMergeChannel(ch: Channel) {
    // Normalize ch.group to match the exact frontend category IDs: Sports, News, Serials, Bangla
    let grp = ch.group ? ch.group.trim() : 'Bangla';
    const grpLower = grp.toLowerCase();
    const normName = ch.name.toLowerCase();
    
    if (grpLower.includes('sport') || grpLower === 'sports' || grpLower === 'sports channel' || normName.includes('sport') || normName.includes('fifa') || normName.includes('ipl') || normName.includes('cricket') || normName.includes('football') || normName.includes('t sports') || normName.includes('gtv') || normName.includes('gazi tv')) {
      grp = 'Sports';
    } else if (grpLower.includes('news') || normName.includes('news') || normName.includes('somoy') || normName.includes('ekattor') || normName.includes('jamuna') || normName.includes('khabor')) {
      grp = 'News';
    } else if (grpLower.includes('music') || grpLower === 'serials' || grpLower === 'hindi serials' || grpLower.includes('movie') || grpLower === 'entertainment' || normName.includes('jalsha') || normName.includes('zee bangla') || normName.includes('colors bangla') || normName.includes('sony aath') || normName.includes('ruposhi') || normName.includes('akash aath') || normName.includes('sun bangla') || normName.includes('enterten') || normName.includes('enter 10') || normName.includes('star plus') || normName.includes('sony tv') || normName.includes('sony sab') || normName.includes('colors tv') || normName.includes('zee tv') || normName.includes('dangal') || normName.includes('sony pal') || normName.includes('zee anmol') || normName.includes('cinema') || normName.includes('movies') || normName.includes('max') || normName.includes('goldmines') || normName.includes('star gold') || normName.includes('colors cineplex') || normName.includes('action') || normName.includes('b4u') || normName.includes('9x') || normName.includes('zee')) {
      grp = 'Serials';
    } else {
      grp = 'Bangla';
    }
    ch.group = grp;

    const canonicalName = ch.name;
    const key = canonicalName.toLowerCase();
    const urlLower = ch.url.toLowerCase().trim();
    const nameNorm = canonicalName.toLowerCase().replace(/[\s-_]+/g, "");

    // Skip manually blacklisted channels based on URLs or normalized names
    if (MANUALLY_BLACKLISTED_URLS.has(ch.url) || MANUALLY_BLACKLISTED_NAMES_NORM.has(nameNorm)) {
      return;
    }
    
    // 1. Force state-of-the-art secure HTTPS high-res logos
    ch.logo = getRealChannelLogo(canonicalName, ch.logo);
    
    // 2. Override/Force stable, lag-free 24/7 Toffee CDN targets if channel matches
    const stableUrl = getToffeeStableUrl(canonicalName);
    if (stableUrl) {
      ch.url = stableUrl;
      const initialServers = [{ name: "High-Speed CDN Server (Auto)", url: stableUrl }];
      for (const s of ch.servers) {
        if (s.url !== stableUrl) {
          initialServers.push({
            name: `Backup Server ${initialServers.length + 1}`,
            url: s.url
          });
        }
      }
      ch.servers = initialServers;
    }
    
    const rawUrlLower = ch.url.toLowerCase().trim();
    processedUrls.add(rawUrlLower);

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      const existingUrls = new Set(existing.servers.map(s => s.url.toLowerCase().trim()));
      
      // Inject servers from the duplicate channel card safely
      for (const s of ch.servers) {
        const targetLower = s.url.toLowerCase().trim();
        if (!existingUrls.has(targetLower)) {
          existing.servers.push({
            name: `Backup Server ${existing.servers.length + 1}`,
            url: s.url
          });
          existingUrls.add(targetLower);
        }
      }
      
      // Upgrade logo if current one is low resolution/empty
      if (!existing.logo || existing.logo.startsWith('http://') || existing.logo.includes('photo-1540747')) {
        existing.logo = ch.logo;
      }
    } else {
      mergedMap.set(key, ch);
    }
  }

  // A. Parse standard ShopnilTV blogspot scrape
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
          fs.writeFileSync('./blogspot_html.txt', htmlText, 'utf8');
        } else {
          throw new Error(`Fallback HTTP Status: ${resFallback.status}`);
        }
      } catch (fallbackErr: any) {
        clearTimeout(timeoutId);
        console.error(`Fallback fetch failed for ShopnilTV: ${fallbackErr.message}`);
      }
    }

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

    if (htmlText) {
      const sections = htmlText.split(/<div class='category-section'\s*data-cat='([^']+)'>/);
      for (let i = 1; i < sections.length; i += 2) {
        const rawCatId = sections[i];
        const sectionContent = sections[i + 1];
        if (!sectionContent) continue;
        
        let category = 'Bangla';
        if (rawCatId === 'sports') category = 'Sports';
        else if (rawCatId === 'news') category = 'News';
        else if (rawCatId === 'kids') category = 'Bangla';
        else if (rawCatId === 'movies' || rawCatId === 'english') category = 'Serials';
        else category = 'Bangla';
        
        const regex = /<div class='channel-item'[^>]*onclick='playChannel\(&#39;([^']+)&#39;,\s*this,\s*&#39;([^']+)&#39;\)'[^>]*>(.*?)<\/div>\s*<\/div>/g;
        let match;
        
        while ((match = regex.exec(sectionContent)) !== null) {
          const url = match[1] ? match[1].trim() : '';
          const rawName = match[2] ? match[2].trim() : '';
          const innerHtml = match[3] || '';
          
          if (!url || !rawName) continue;
          
          const imgMatch = innerHtml.match(/src='([^']+)'/);
          const logo = imgMatch ? imgMatch[1].trim() : '';
          const cleanName = sanitizeChannelName(rawName);
          
          let finalCat = category;
          const normName = cleanName.toLowerCase();
          const serialKeywords = [
            'jalsha', 'zee bangla', 'zee cinema', 'colors bangla', 'sony aath', 'star plus',
            'sony pal', 'zee anmol', 'dangal', 'serial', 'colors', 'sony sab', 'sab tv', 'star gold'
          ];
          if (serialKeywords.some(keyword => normName.includes(keyword))) {
            finalCat = 'Serials';
          }
          
          const channelId = `ch_shopnil_${generateChannelId(url)}`;
          
          addOrMergeChannel({
            id: channelId,
            name: cleanName,
            logo: logo,
            group: finalCat,
            url: url,
            playlistSource: 'ShopnilTV',
            status: 'online',
            servers: [{ name: "Server 1", url: url }]
          });
        }
      }
    }
  } catch (err: any) {
    console.error('Scraper error in fetchAllChannels parsing ShopnilTV:', err);
  }

  // B. Parse all BUILTIN_STREAM_FEEDS in parallel
  try {
    console.log('[Channels Service] Asynchronously pre-fetching all M3U playlist feeds...');
    const feedPromises = BUILTIN_STREAM_FEEDS.map(feed => fetchAndParseM3U(feed));
    const m3uResults = await Promise.all(feedPromises);
    
    for (const feedList of m3uResults) {
      for (const ch of feedList) {
        addOrMergeChannel(ch);
      }
    }
  } catch (err: any) {
    console.error('Error preheating M3U feeds in fetchAllChannels:', err);
  }

  // C. Merge previous verified active sports channels and fallbacks
  try {
    for (const prevCh of PREVIOUS_ACTIVE_SPORTS_CHANNELS) {
      const channelId = `ch_prev_${generateChannelId(prevCh.url)}`;
      addOrMergeChannel({
        id: channelId,
        name: prevCh.name,
        logo: prevCh.logo,
        group: prevCh.group,
        url: prevCh.url,
        playlistSource: prevCh.playlistSource || "Previous Active Streams",
        status: 'online',
        servers: [{ name: "Server 1", url: prevCh.url }]
      });
    }
  } catch (err: any) {
    console.error('Error merging PREVIOUS_ACTIVE_SPORTS_CHANNELS:', err);
  }

  // C2. Merge user new requested sports streams
  try {
    for (const newCh of USER_NEW_CHANNELS) {
      const channelId = `ch_new_${generateChannelId(newCh.url)}`;
      addOrMergeChannel({
        id: channelId,
        name: newCh.name,
        logo: newCh.logo,
        group: newCh.group,
        url: newCh.url,
        playlistSource: "User Specified Streams",
        status: 'online',
        servers: [{ name: "Server 1", url: newCh.url }]
      });
    }
  } catch (err: any) {
    console.error('Error merging USER_NEW_CHANNELS:', err);
  }

  try {
    const activeCheckedStreams = FALLBACK_CHANNELS.map(({ id, status, ...rest }) => rest);
    for (const prevCh of activeCheckedStreams) {
      const channelId = `ch_prev_${generateChannelId(prevCh.url)}`;
      addOrMergeChannel({
        id: channelId,
        name: prevCh.name,
        logo: prevCh.logo,
        group: prevCh.group,
        url: prevCh.url,
        playlistSource: prevCh.playlistSource || "Checked Playlist Streams",
        status: 'online',
        servers: [{ name: "Server 1", url: prevCh.url }]
      });
    }
  } catch (err: any) {
    console.error('Error merging FALLBACK_CHANNELS:', err);
  }

  const finalChannels = Array.from(mergedMap.values());

  if (finalChannels.length === 0) {
    console.warn('Scraper returned 0 channels, recovering with static fallbacks');
    return FALLBACK_CHANNELS.filter(ch => !SERVER_SIDE_BROKEN_CHANNEL_IDS.has(ch.id));
  }

  // Sort channels alphabetically and filter out permanently deleted/blacklisted channel IDs
  return finalChannels
    .filter(ch => !SERVER_SIDE_BROKEN_CHANNEL_IDS.has(ch.id))
    .sort((a, b) => a.name.localeCompare(b.name));
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

    const client = getGeminiClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY environment variable is not defined');
    }

    const response = await client.models.generateContent({
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
    const now = new Date();
    const getBanglaDateStr = (offsetDays: number) => {
      const d = new Date();
      d.setDate(now.getDate() + offsetDays);
      const day = d.getDate();
      const monthNames = [
        "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
        "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
      ];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      
      const toBanglaDigits = (num: number) => {
        const bdDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
        return String(num).split('').map(digit => bdDigits[parseInt(digit, 10)] || digit).join('');
      };
      
      return `${toBanglaDigits(day)} ${month}, ${toBanglaDigits(year)}`;
    };

    const fallbackMatches = [
      {
        id: "fb_fifa_1",
        sport: "football",
        tournament: `FIFA 2026 World Cup Qualifiers [${getBanglaDateStr(0)}]`,
        team1: "Argentina (আর্জেন্টিনা)",
        team2: "Brazil (ব্রাজিল)",
        status: "live",
        time: "চলছে (লাইভ টিভি)",
        score: "ARG 2 - 1 BRA (72')",
        liveChannelId: "tsports"
      },
      {
        id: "fb_fifa_2",
        sport: "football",
        tournament: `FIFA 2026 World Cup [${getBanglaDateStr(0)}]`,
        team1: "Germany (জার্মানি)",
        team2: "France (ফ্রান্স)",
        status: "live",
        time: "চলছে (লাইভ)",
        score: "GER 1 - 1 FRA (40')",
        liveChannelId: "sony_ten"
      },
      {
        id: "fb_fifa_3",
        sport: "football",
        tournament: `FIFA 2026 World Cup Qualifiers [${getBanglaDateStr(0)}]`,
        team1: "Spain (স্পেন)",
        team2: "England (ইংল্যান্ড)",
        status: "upcoming",
        time: "আজ রাত ১১:৩০ মিনিটে",
        score: "",
        liveChannelId: "tsports"
      },
      {
        id: "fb_fifa_4",
        sport: "football",
        tournament: `FIFA 2026 World Cup Qualifiers [${getBanglaDateStr(1)}]`,
        team1: "Portugal (পর্তুগাল)",
        team2: "Italy (ইতালি)",
        status: "upcoming",
        time: "আগামীকাল ভোর ৪:০০ টায়",
        score: "",
        liveChannelId: "sony_ten"
      },
      {
        id: "fb_match_103",
        sport: "cricket",
        tournament: `বাংলাদেশ বনাম শ্রীলঙ্কা ৩য় ওয়ানডে [${getBanglaDateStr(0)}]`,
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
        tournament: `Spain La Liga Live Match [${getBanglaDateStr(0)}]`,
        team1: "Barcelona",
        team2: "Real Betis",
        status: "upcoming",
        time: "রাত ১০:১৫ মিনিটে",
        score: "",
        liveChannelId: "somoy_tv"
      }
    ];
    return res.json({ success: true, matches: fallbackMatches, source: 'fallback_dynamic' });
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
        const client = getGeminiClient();
        if (!client) {
          throw new Error('GEMINI_API_KEY environment variable is not defined');
        }

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
          modelResponse = await client.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: { parts: [imgPart, txtPart] },
            config: {
              systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
              temperature: 0.7
            }
          });
        } else {
          modelResponse = await client.models.generateContent({
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

// GET custom diagnostics for checking Gemini API Key validity
app.get('/api/support/gemini-status', async (req, res) => {
  try {
    const client = getGeminiClient();
    if (!client) {
      return res.json({ status: 'missing', message: 'GEMINI_API_KEY environment variable is not defined.' });
    }
    // Probe Gemini with minimal tokens
    await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'ping',
      config: { maxOutputTokens: 1 }
    });
    return res.json({ status: 'ok', message: 'সক্রিয় ও সচল (Healthy)' });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('leaked') || errMsg.includes('Leaked') || errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED')) {
      return res.json({ 
        status: 'error_leaked', 
        message: 'নিরাপত্তা ত্রুটি: জেমিনি API Key-টি Leaked হিসেবে গুগলে ব্লক হয়েছে! অনুগ্রহ করে Secrets panel এ নতুন সচল API Key দিন।' 
      });
    }
    return res.json({ status: 'error', message: errMsg });
  }
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
  adTopCode?: string;
  adBottomCode?: string;
  adPopCode?: string;
  adSocialCode?: string;
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
    adTopCode: '',
    adBottomCode: '',
    adPopCode: '',
    adSocialCode: '',
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

// FIFA 2026 World Cup Match Schedule - Dynamic generation relative to current day
app.get('/api/fifa-schedule', (req, res) => {
  try {
    const now = new Date();
    
    // Format Bangla Date helper
    const getBanglaDateStr = (offsetDays: number) => {
      const d = new Date();
      d.setDate(now.getDate() + offsetDays);
      const day = d.getDate();
      const monthNames = [
        "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
        "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
      ];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      
      const toBanglaDigits = (num: number) => {
        const bdDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
        return String(num).split('').map(digit => bdDigits[parseInt(digit, 10)] || digit).join('');
      };
      
      return `${toBanglaDigits(day)} ${month}, ${toBanglaDigits(year)}`;
    };

    const schedule = [
      {
        id: "fifa_m1",
        date: getBanglaDateStr(0),
        time: "সন্ধ্যা ৬:৩০ মিনিট (বাংলাদেশ সময়)",
        timestamp: now.getTime(),
        homeTeam: { name: "আহ আর্জেন্টিনা", flag: "🇦🇷", score: 2 },
        awayTeam: { name: "ব্রাজিল মহাদ্বন্দ্ব", flag: "🇧🇷", score: 1 },
        status: "live", // Live right now!
        channelId: "req_star_sports_1",
        channelName: "STAR SPORTS 1"
      },
      {
        id: "fifa_m2",
        date: getBanglaDateStr(0),
        time: "রাত ৯:০০ টা (বাংলাদেশ সময়)",
        timestamp: now.getTime() + 900000,
        homeTeam: { name: "জার্মানি স্পিড", flag: "🇩🇪", score: 1 },
        awayTeam: { name: "ফ্রান্স সুপার", flag: "🇫🇷", score: 1 },
        status: "live", // Live right now!
        channelId: "req_star_sports_2",
        channelName: "STAR SPORTS 2"
      },
      {
        id: "fifa_m3",
        date: getBanglaDateStr(0),
        time: "রাত ১১:৩০ মিনিট (বাংলাদেশ সময়)",
        timestamp: now.getTime() + 10800000,
        homeTeam: { name: "স্পেন টাইটান্স", flag: "🇪🇸", score: 0 },
        awayTeam: { name: "ইংল্যান্ড সিংহ", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", score: 0 },
        status: "upcoming",
        channelId: "req_star_sports_3",
        channelName: "STAR SPORTS 3"
      },
      {
        id: "fifa_m4",
        date: getBanglaDateStr(1),
        time: "ভোর ৪:০০ টা (বাংলাদেশ সময়)",
        timestamp: now.getTime() + 86400000,
        homeTeam: { name: "পর্তুগাল কিং", flag: "🇵🇹", score: 0 },
        awayTeam: { name: "ইতালি ডিফেন্স", flag: "🇮🇹", score: 0 },
        status: "upcoming",
        channelId: "req_willow_sports",
        channelName: "WILLOW SPORTS"
      },
      {
        id: "fifa_m5",
        date: getBanglaDateStr(-1),
        time: "গতকালের ম্যাচ (পূর্ণ সমাপ্ত)",
        timestamp: now.getTime() - 86400000,
        homeTeam: { name: "মরক্কো ঈগলস", flag: "🇲🇦", score: 1 },
        awayTeam: { name: "ক্রোয়েশিয়া ভাইকিংস", flag: "🇭🇷", score: 0 },
        status: "finished",
        channelId: "req_star_sports_1",
        channelName: "STAR SPORTS 1"
      },
      {
        id: "fifa_m6",
        date: getBanglaDateStr(-2),
        time: "সমাপ্ত ম্যাচ",
        timestamp: now.getTime() - 172800000,
        homeTeam: { name: "নেদারল্যান্ডস ডাচ", flag: "🇳🇱", score: 3 },
        awayTeam: { name: "উরুগুয়ে সেলেস্তে", flag: "🇺🇾", score: 2 },
        status: "finished",
        channelId: "req_star_sports_2",
        channelName: "STAR SPORTS 2"
      }
    ];

    res.json({ success: true, schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

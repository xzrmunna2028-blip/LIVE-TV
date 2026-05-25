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
}

const app = express();
const PORT = 3000;

// Enable JSON middleware
app.use(express.json());

// Built-in stream feeds to fetch and parse
const BUILTIN_STREAM_FEEDS = [
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
    .replace(/\b(hd|sd|fhd|uhd|4k|stream|server\s*\d+|backup|direct|link\s*\d+)\b/gi, '') // Strip typical suffix qualities
    .replace(/\s+/g, ' ')     // Normalize whitespaces
    .trim();

  // Normalize common duplicate channel display names
  const upper = cleaned.toUpperCase();
  if (upper === 'SOMOY TV' || upper === 'SOMOY NEWS TV' || upper === 'SOMOY NEWS' || upper === 'SOMOY') {
    return 'Somoy TV';
  }
  if (upper === 'JAMUNA TV' || upper === 'JAMUNA NEWS' || upper === 'JAMUNA') {
    return 'Jamuna TV';
  }
  if (upper === 'GAZI TV' || upper === 'GTV' || upper === 'GTV HD' || upper === 'GAZI TV HD' || upper === 'GAZI') {
    return 'GTV';
  }
  if (upper === 'INDEPENDENT' || upper === 'INDEPENDENT TV') {
    return 'Independent TV';
  }
  if (upper === 'CHANNEL 24' || upper === 'CHANNEL 24 HD' || upper === 'CHANNEL24') {
    return 'Channel 24';
  }
  if (upper === 'ATN NEWS' || upper === 'ATN NEWS BD') {
    return 'ATN News';
  }
  if (upper === 'ATN BANGLA' || upper === 'ATN BANGLA HD') {
    return 'ATN Bangla';
  }
  if (upper === 'ZEE BANLA' || upper === 'ZEE BANGLA' || upper === 'ZEE BANGLA HD' || upper === 'ZEE BANGLA TV') {
    return 'Zee Bangla';
  }
  if (upper === 'STAR JALSHA' || upper === 'STAR JALSHA HD') {
    return 'Star Jalsha';
  }
  if (upper === 'SONY AATH' || upper === 'SONY ATTH' || upper === 'SONY AATH HD') {
    return 'Sony Aath';
  }
  if (upper === 'T SPORTS' || upper === 'TSPORTS' || upper === 'T SPORTS HD' || upper === 'T SPORTS LIVE 01' || upper === 'TSPORTS HD') {
    return 'T Sports';
  }
  if (upper === 'EKATTOR TV' || upper === 'EKATTOR' || upper === '71 TV' || upper === '71' || upper === 'SHOMOY TV' || upper === 'EKATTOR NEWS') {
    return 'Ekattor TV';
  }
  if (upper === 'NTV' || upper === 'NTV BD' || upper === 'NTV HD') {
    return 'NTV';
  }
  if (upper === 'RTV' || upper === 'RTV HD' || upper === 'RTV BD') {
    return 'RTV';
  }
  if (upper === 'BTV' || upper === 'BTV NATIONAL' || upper === 'BTV NATIONAL HD') {
    return 'BTV National';
  }
  if (upper === 'CHANNEL I' || upper === 'CHANNEL I HD' || upper === 'CHANNEL-I') {
    return 'Channel i';
  }
  if (upper === 'DEEPTO TV' || upper === 'DEEPTO') {
    return 'Deepto TV';
  }
  if (upper === 'MAASRANGA' || upper === 'MAASRANGA HD' || upper === 'MAASRANGA TV' || upper === 'MASRANGA TV') {
    return 'Maasranga TV';
  }
  if (upper === 'EKUSHEY TV' || upper === 'ETV' || upper === 'EKUSHEY') {
    return 'Ekushey TV';
  }

  return cleaned;
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
    normName.includes('star jalsha') || 
    normName.includes('zee bangla') || 
    normName.includes('colors bangla') || 
    normName.includes('sun bangla') || 
    normName.includes('sony aath') || 
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
  let currentMeta: { name: string; logo: string; group: string } | null = null;

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

      // Get readable display text after comma
      const commaIndex = line.indexOf(',');
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
        group: assignedGroup
      };
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      const parts = line.split('#'); // Strip comments from lines
      const streamUrl = parts[0].trim();

      if (currentMeta) {
        results.push({
          id: generateChannelId(streamUrl),
          name: sanitizeChannelName(currentMeta.name),
          url: streamUrl,
          logo: currentMeta.logo,
          group: currentMeta.group,
          playlistSource: playlistName,
          status: 'unknown'
        });
        currentMeta = null;
      } else {
        // Discovered URL without preceding EXTINF information
        const urlParts = streamUrl.split('/');
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
          status: 'unknown'
        });
      }
    }
  }

  return results;
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
  },
  {
    id: "fb_btv_national",
    name: "BTV National Live",
    url: "https://live.btv.com.bd/btvnational/index.m3u8",
    logo: "https://s3.aynaott.com/storage/9b6f35f73a099b7a5885a970523c5f78",
    group: "Bangla",
    playlistSource: "Built-in fallbacks",
    status: "online"
  },
  {
    id: "fb_btv_world",
    name: "BTV World Live",
    url: "https://live.btv.com.bd/btvworld/index.m3u8",
    logo: "https://s3.aynaott.com/storage/b30147b97d86754e4b97fc2989628391",
    group: "Bangla",
    playlistSource: "Built-in fallbacks",
    status: "online"
  },
  {
    id: "fb_sangshad_tv",
    name: "Sangshad TV Live",
    url: "https://live.btv.com.bd/sangshadtv/index.m3u8",
    logo: "https://s3.aynaott.com/storage/ffd7ba9b76ad555933f94bcb7ff26b44",
    group: "Bangla",
    playlistSource: "Built-in fallbacks",
    status: "online"
  }
];

// Fetch channels from all playlist URLs
async function fetchAllChannels(): Promise<Channel[]> {
  const allChannels: Channel[] = [];
  const processedUrls = new Set<string>();
  const processedNames = new Set<string>();

  // Parallel list fetches with native fetch first (to bypass GitHub TLS blocks)
  const fetchPromises = BUILTIN_STREAM_FEEDS.map(async (playlist) => {
    try {
      let text = '';
      
      try {
        const res = await fetch(playlist.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (res.ok) {
          text = await res.text();
        } else {
          throw new Error(`HTTP status code ${res.status}`);
        }
      } catch (nativeErr: any) {
        console.warn(`Native fetch dropped for [${playlist.name}]: ${nativeErr.message}. Trying tlsSafeFetch...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s safety timeout

        const resFallback = await tlsSafeFetch(playlist.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        clearTimeout(timeoutId);

        if (!resFallback.ok) {
          throw new Error(`Fallback HTTP rejection status: ${resFallback.status}`);
        }

        text = await resFallback.text();
      }

      if (text) {
        return parseM3UContent(text, playlist.name);
      }
      return [];
    } catch (err: any) {
      console.error(`Playlist loading skipped for [${playlist.name}]: ${err.message}`);
      return [];
    }
  });

  const resolvedLists = await Promise.all(fetchPromises);
  const fetchedChannels = resolvedLists.flat();

  // Combine with curated high-quality, guaranteed working fallback channels to never show 0 results
  const mergedRawList = [...FALLBACK_CHANNELS, ...fetchedChannels];

  // Smart De-duplication Process
  mergedRawList.forEach((ch) => {
    // Standardize name first
    ch.name = sanitizeChannelName(ch.name);

    const rawUrl = ch.url.toLowerCase().trim();
    // Unique key on canonical name (all lowercase, no spaces, no special characters)
    const cleanNameKey = ch.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Skip empty streams, advertisements, and non-channel placeholders
    const lowercaseName = ch.name.toLowerCase();
    if (
      !rawUrl || 
      rawUrl.includes('example.com') || 
      rawUrl.length < 10 ||
      lowercaseName.includes('welcome') ||
      lowercaseName.includes('playz') ||
      lowercaseName.includes('test') ||
      lowercaseName.includes('dummy') ||
      lowercaseName.includes('offline') ||
      lowercaseName.includes('coming soon')
    ) {
      return;
    }

    // Skip duplicates by URL
    if (processedUrls.has(rawUrl)) return;

    // Skip duplicates by canonicalized name
    if (cleanNameKey && processedNames.has(cleanNameKey)) return;

    processedUrls.add(rawUrl);
    if (cleanNameKey) {
      processedNames.add(cleanNameKey);
    }
    allChannels.push(ch);
  });

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

// Stream CORS proxy bypass for channels that block standard origins
app.get('/api/proxy', async (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send('Parameters url matches required properties');
  }

  try {
    const parsedUrl = new URL(streamUrl);
    const origin = parsedUrl.origin;

    // Direct stream routing with mock browser header + referer/origin spoofing of local CDN
    const streamRes = await tlsSafeFetch(streamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': origin + '/',
        'Origin': origin
      }
    });

    if (!streamRes.ok) {
      return res.status(streamRes.status).send(`Bypass proxy could not fetch stream (status: ${streamRes.status})`);
    }

    const contentType = streamRes.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL') || streamUrl.split('?')[0].endsWith('.m3u8');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    if (isM3U8) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      const text = await streamRes.text();
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Metadata line
        if (trimmed.startsWith('#')) {
          // If it contains a URI attribute, e.g. EXT-X-KEY or EXT-X-MEDIA, rewrite the key target
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

      return res.send(rewrittenLines.join('\n'));
    } else {
      // Direct binary pipe for chunks or key assets
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      const arrayBuffer = await streamRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
      console.warn(`[Proxy Warning] Remote host unreachable (ENOTFOUND): ${req.query.url}`);
    } else {
      console.error('Proxy request failure:', err);
    }
    res.status(502).send(`Stream target offline (ENOTFOUND): ${err.message}`);
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

// BRAND CONFIG & REAL-TIME PRESENCE STORAGE FOR MULTIPLE USERS
const BRAND_CONFIG_FILE = path.join(process.cwd(), 'brand_config.json');

// STATS PERSISTENCE
const STATS_FILE = path.join(process.cwd(), 'site_stats.json');

// GET brand settings (persisted server-side on disk)
app.get('/api/branding', (req, res) => {
  try {
    if (fs.existsSync(BRAND_CONFIG_FILE)) {
      const data = fs.readFileSync(BRAND_CONFIG_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
  } catch (e) {
    console.error('Error reading branding config:', e);
  }
  return res.json({
    siteLogoUrl: '',
    siteNameBangla: 'বিডি লাইভ টিভি',
    siteNameEnglish: 'BD LIVE TV',
    marqueeText: 'স্বাগতম Free World Cup BD-তে! 📺 সম্পুর্ণ ফ্রিতে স্পোর্টস প্লেয়ারে উপভোগ করুন প্রিয় সব লাইভ ওয়ার্ল্ড কাপ, ঘরোয়া ও আন্তর্জাতিক খেলাধুলা এবং বিনোদন চ্যানেল। কোনো চ্যানেল সাময়িকভাবে বন্ধ থাকলে রিফ্রেশ বাটনে ক্লিক করুন অথবা প্লেয়ারে অন্য লিংক অপশন সিলেক্ট করুন। আমরা নিয়মিত নতুন নতুন লাইভ চ্যানেল ও ফিড এড করছি। আমাদের সাথেই থাকুন!'
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
    const config = { siteLogoUrl, siteNameBangla, siteNameEnglish, marqueeText };
    fs.writeFileSync(BRAND_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return res.json({ success: true, config });
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
}
let activePresences: Record<string, ActivePresence> = {};

// POST register or update user presence heartbeat
app.post('/api/presence', (req, res) => {
  const { username, name } = req.body;
  if (username) {
    activePresences[username] = {
      username,
      name: name || username,
      lastSeen: Date.now()
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
    users: list.map(u => ({ username: u.username, name: u.name }))
  });
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
  });
}

startServer();

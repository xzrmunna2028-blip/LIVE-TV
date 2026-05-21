/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

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

// Playlists to fetch and parse
const IPTV_PLAYLISTS = [
  {
    name: 'Free IPTV Global Guide',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'
  },
  {
    name: 'T-Sports Auto-Update',
    url: 'https://raw.githubusercontent.com/abusaeeidx/T-Sports-Playlist-Auto-Update/main/ns_player.m3u'
  },
  {
    name: 'BDIX IPTV Premium',
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

// Fetch channels from all playlist URLs
async function fetchAllChannels(): Promise<Channel[]> {
  const allChannels: Channel[] = [];
  const processedUrls = new Set<string>();
  const processedNames = new Set<string>();

  // Fetch online playlists in parallel with timeout safety
  const fetchPromises = IPTV_PLAYLISTS.map(async (playlist) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout per playlist for better reliability

      const res = await fetch(playlist.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP rejection status: ${res.status}`);
      }

      const text = await res.text();
      return parseM3UContent(text, playlist.name);
    } catch (err: any) {
      console.error(`Playlist loading skipped for [${playlist.name}]: ${err.message}`);
      return [];
    }
  });

  const resolvedLists = await Promise.all(fetchPromises);
  const fetchedChannels = resolvedLists.flat();

  // Smart De-duplication Process
  fetchedChannels.forEach((ch) => {
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
    const streamRes = await fetch(streamUrl, {
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
    console.error('Proxy request failure:', err);
    res.status(500).send(`Stream proxy error: ${err.message}`);
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

    const checkRes = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (IPTV Tester)' }
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

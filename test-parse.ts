import https from 'https';
import http from 'http';
import { URL } from 'url';

// Copy functions from server.ts to be absolutely sure
function sanitizeChannelName(name: string): string {
  let cleaned = name
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\{.*?\}/g, '')
    .replace(/♛/g, '')
    .replace(/\|/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\bw\s*300\s*q\b/gi, '')
    .replace(/\bw300q\b/gi, '')
    .replace(/\b(hd|sd|fhd|uhd|4k|stream|server\s*\d+|backup|direct|link\s*\d+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const upper = cleaned.toUpperCase().trim();
  if (upper === 'SOMOY TV' || upper === 'SOMOY NEWS TV' || upper === 'SOMOY NEWS' || upper === 'SOMOY' || upper === 'SOMOY NEWS LIVE') {
    return 'Somoy TV';
  }
  if (upper === 'JAMUNA TV' || upper === 'JAMUNA NEWS' || upper === 'JAMUNA' || upper === 'JAMUNA NEWS LIVE') {
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

  if (!cleaned || /^\d+$/.test(cleaned) || cleaned.toLowerCase() === 'stream' || cleaned.toLowerCase() === 'live') {
    if (/^\d+$/.test(cleaned)) {
      return `IPTV Channel ${cleaned}`;
    }
    return 'Live IPTV Channel';
  }

  return cleaned;
}

function parseM3UContent(content: string, playlistName: string): any[] {
  const lines = content.replace(/\r/g, '').split('\n');
  const results: any[] = [];
  let currentMeta: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const nameAttrMatch = line.match(/tvg-name="([^"]+)"/i);

      const logo = logoMatch ? logoMatch[1] : '';
      let group = groupMatch ? groupMatch[1] : '';
      let nameAttr = nameAttrMatch ? nameAttrMatch[1] : '';

      const commaIndex = line.indexOf(',');
      let displayName = '';
      if (commaIndex !== -1) {
        displayName = line.substring(commaIndex + 1).trim();
      }

      if (!displayName) {
        displayName = nameAttr || 'Unknown Channel';
      }

      currentMeta = {
        name: displayName,
        logo,
        group: group || 'Other',
        servers: []
      };
    } else if (line.startsWith('#EXT-X-MEDIA:') && currentMeta) {
      const nameMatch = line.match(/NAME="([^"]*)"/); 
      const urlMatch = line.match(/URI="([^"]*)"/);
      if (nameMatch && urlMatch) {
        currentMeta.servers.push({ name: nameMatch[1], url: urlMatch[1] });
      }
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      const parts = line.split('#');
      const streamUrl = parts[0].trim();

      if (currentMeta) {
        currentMeta.servers.unshift({ name: "Server 1", url: streamUrl });
        results.push({
          name: currentMeta.name,
          url: streamUrl,
          logo: currentMeta.logo,
          group: currentMeta.group,
          servers: currentMeta.servers
        });
        currentMeta = null;
      } else {
        results.push({
          name: 'Stream Channel',
          url: streamUrl,
          logo: '',
          group: 'Other',
          servers: [{ name: "Server 1", url: streamUrl }]
        });
      }
    }
  }

  return results;
}

function tlsSafeFetch(urlStr: string, options: any = {}): Promise<any> {
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
        (reqOptions as https.RequestOptions).rejectUnauthorized = false;
        (reqOptions as https.RequestOptions).ciphers = 'ALL:DEFAULT:@SECLEVEL=0';
        (reqOptions as https.RequestOptions).minVersion = 'TLSv1';
      }

      let req = lib.request(parsedUrl, reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 200,
            headers: res.headers,
            async text() { return bodyBuffer.toString('utf8'); }
          });
        });
      });

      req.on('error', reject);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function run() {
  const res = await tlsSafeFetch('https://playlist.emonsa4.workers.dev/playlist.m3u', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://obiramtvlive.pages.dev/',
      'Origin': 'https://obiramtvlive.pages.dev'
    }
  });
  const text = await res.text();
  const parsed = parseM3UContent(text, 'Obiram');
  console.log('Total parsed channels from Obiram playlist (before de-duplication):', parsed.length);
  
  // Group counts before de-duplication
  const groups: Record<string, number> = {};
  parsed.forEach(p => {
    groups[p.group] = (groups[p.group] || 0) + 1;
  });
  console.log('Groups in parsed list:', groups);

  // Let's test the deduplication logic used in server.ts
  const processedUrls = new Set<string>();
  const processedNames = new Set<string>();
  const keptChannels: any[] = [];
  const rejectedCountByName: Record<string, string[]> = {};

  parsed.forEach(ch => {
    const rawUrl = ch.url.toLowerCase().trim();
    const sName = sanitizeChannelName(ch.name);
    const cleanNameKey = sName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (processedUrls.has(rawUrl)) {
      return;
    }

    if (cleanNameKey && processedNames.has(cleanNameKey)) {
      if (!rejectedCountByName[cleanNameKey]) {
        rejectedCountByName[cleanNameKey] = [];
      }
      rejectedCountByName[cleanNameKey].push(ch.name);
      return;
    }

    processedUrls.add(rawUrl);
    processedNames.add(cleanNameKey);
    keptChannels.push(ch);
  });

  console.log('Total kept channels after de-duplication:', keptChannels.length);
  console.log('Rejected due to duplicate names:', Object.keys(rejectedCountByName).length);
  console.log('Sample rejected name keys and their original names:');
  Object.keys(rejectedCountByName).slice(0, 20).forEach(key => {
     console.log(`- ${key}:`, rejectedCountByName[key]);
  });
}

run();

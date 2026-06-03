import { GoogleGenAI } from '@google/genai';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Simple tlsSafeFetch definition to match server.ts
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

async function test() {
  const url = 'https://playlist.emonsa4.workers.dev/playlist.m3u';
  try {
    console.log('Fetching', url);
    const res = await tlsSafeFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://obiramtvlive.pages.dev/',
        'Origin': 'https://obiramtvlive.pages.dev'
      }
    });
    console.log('Status:', res.status);
    console.log('Headers:', res.headers);
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Sample text first 1500 chars:\n', text.substring(0, 1500));
    
    // Parse sample lines
    console.log('\nParsing sample channels:');
    const lines = text.replace(/\r/g, '').split('\n');
    let extinfCount = 0;
    let urlCount = 0;
    for (let i = 0; i < lines.length && urlCount < 10; i++) {
       const line = lines[i].trim();
       if (line.startsWith('#EXTINF:')) {
         extinfCount++;
         console.log('EXTINF:', line);
       } else if (line.startsWith('http://') || line.startsWith('https://')) {
         urlCount++;
         console.log('URL:', line);
       }
    }
  } catch (err: any) {
    console.error('Test Error:', err.message);
  }
}

test();

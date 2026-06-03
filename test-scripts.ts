import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

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
  const url = 'https://obiramtvlive.pages.dev/script.js';
  try {
    const res = await tlsSafeFetch(url);
    const code = await res.text();
    
    let pos = 0;
    while (true) {
       pos = code.indexOf('corsProxy', pos);
       if (pos === -1) break;
       console.log(`\nOccurrence of 'corsProxy' at index ${pos}:\n`, code.substring(pos - 150, pos + 300));
       pos += 9;
    }
  } catch (err: any) {
    console.error(err.message);
  }
}

run();

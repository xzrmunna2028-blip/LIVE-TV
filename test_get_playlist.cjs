const https = require('https');

const options = {
  hostname: 'playlist.emonsa4.workers.dev',
  port: 443,
  path: '/playlist.m3u',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://obiramtvlive.pages.dev/',
    'Origin': 'https://obiramtvlive.pages.dev',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('playlist.m3u content (first 500 characters):');
    console.log(data.slice(0, 500));
    console.log('Total length:', data.length);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();

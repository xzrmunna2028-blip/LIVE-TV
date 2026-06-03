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
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const lines = data.split('\n');
    let totalInPlaylist = 0;
    const names = [];
    lines.forEach(line => {
      if (line.startsWith('#EXTINF:')) {
        totalInPlaylist++;
        const parts = line.split(',');
        const name = parts[parts.length - 1].trim();
        names.push(name);
      }
    });
    console.log(`Total channels found in playlist M3U: ${totalInPlaylist}`);
    console.log('Sample names:');
    console.log(names.slice(0, 40));
    
    // Check duplicates in names
    const nameMap = {};
    names.forEach(n => {
      const canonical = n.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!nameMap[canonical]) nameMap[canonical] = [];
      nameMap[canonical].push(n);
    });
    
    const duplicates = Object.keys(nameMap).filter(k => nameMap[k].length > 1);
    console.log(`Total unique canonical names: ${Object.keys(nameMap).length}`);
    console.log(`Duplicate name counts (canonicalized):`);
    duplicates.forEach(d => {
      console.log(`- ${d}: ${nameMap[d].join(', ')}`);
    });
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();

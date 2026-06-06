import https from 'https';

const ProspectivePaths = [
  'colors_bangla',
  'colorsbangla',
  'star_jalsha',
  'starjalsha',
  'jalsha',
  'jalshabangla',
  'star_plus',
  'starplus',
  'star_jalsha_hd',
  'starjalshahd'
];

async function checkPath(path: string) {
  const url = `https://bldcmprod-cdn.toffeelive.com/cdn/live/${path}/playlist.m3u8`;
  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      resolve({ path, statusCode: res.statusCode });
    });
    req.on('error', () => {
      resolve({ path, statusCode: null });
    });
    req.end();
  });
}

async function run() {
  console.log("Checking prospective Toffee streams...");
  const results = await Promise.all(ProspectivePaths.map(p => checkPath(p)));
  console.log("RESULTS:");
  console.log(results);
}

run();

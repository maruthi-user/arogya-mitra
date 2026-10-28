/* Tiny static server for local development. No dependencies: `npm start` or `node server.js [port]`. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const root = __dirname;
const args = process.argv.slice(2);
const openBrowser = args.includes('--open');
const firstPort = Number(args.find(a => /^\d+$/.test(a)) || process.env.PORT || 3000);
const maxTries = 20;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400);
    return res.end('bad request');
  }
  if (urlPath === '/') urlPath = '/index.html';

  const file = path.join(root, path.normalize(urlPath));
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end('forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

/* Another app can hold only the IPv4 or only the IPv6 side of "localhost", and the OS still lets us bind the
   other side. Then http://localhost:PORT would open the other app. So probe both sides before choosing a port. */
function answers(host, p) {
  return new Promise(resolve => {
    const s = net.connect({ host, port: p });
    s.setTimeout(400);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

async function isBusy(p) {
  const [v4, v6] = await Promise.all([answers('127.0.0.1', p), answers('::1', p)]);
  return v4 || v6;
}

server.on('error', err => {
  if (err.code === 'EACCES') {
    console.error('Not allowed to use that port. Ports below 1024 may need an administrator terminal.');
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

server.on('listening', () => {
  const url = 'http://localhost' + (port === 80 ? '' : ':' + port);
  console.log('Arogya Mitra running at ' + url);
  console.log('Press Ctrl+C to stop.');
  if (openBrowser) require('child_process').exec('start "" ' + url);
});

let port = firstPort;
(async () => {
  for (let i = 0; i < maxTries && await isBusy(port); i++) {
    console.log('Port ' + port + ' is already in use, trying ' + (port + 1) + '...');
    port += 1;
  }
  server.listen(port);
})();

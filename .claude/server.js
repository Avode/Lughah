// Minimal zero-dependency static file server for previewing the Lughah site.
// Uses an explicit absolute root so it does not depend on process.cwd().
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/nikumar/Documents/SoftwareProjects/Lughah';
const PORT = 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath.endsWith('/')) urlPath += 'index.html';

    // Resolve within ROOT and block path traversal.
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stat) => {
      let target = filePath;
      if (!err && stat.isDirectory()) target = path.join(filePath, 'index.html');
      fs.readFile(target, (e, data) => {
        if (e) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 Not Found</h1><p>' + urlPath + '</p>');
          return;
        }
        const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        res.end(data);
      });
    });
  } catch (err) {
    res.writeHead(500); res.end('Server error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Lughah preview server running at http://127.0.0.1:' + PORT + '/');
  console.log('Serving: ' + ROOT);
});

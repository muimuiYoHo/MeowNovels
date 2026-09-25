const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { url = req.url.split('?')[0]; }
  if (url === '/') url = '/index.html';
  const file = path.join(root, url.replace(/^\/+/, ''));
  if (!fs.existsSync(file) || !file.startsWith(root)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 not found: ' + req.url);
    return;
  }
  const ext = path.extname(file);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
});
server.listen(8787, () => console.log('preview server ready at http://localhost:8787'));

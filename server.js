const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const PRODUCTS_FILE = path.join(__dirname, 'products.json');

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const query = new URL(req.url, `http://${req.headers.host}`).searchParams;

  if (urlPath.startsWith('/api/')) {
    handleApi(urlPath, query, res);
    return;
  }

  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Доступ запрещён');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
      fs.stat(filePath, (err2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 — Страница не найдена');
          return;
        }
        serveFile(filePath, res);
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function handleApi(urlPath, query, res) {
  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  fs.readFile(PRODUCTS_FILE, 'utf8', (err, raw) => {
    if (err) {
      sendJson(500, { error: 'Не удалось загрузить каталог' });
      return;
    }
    const products = JSON.parse(raw);

    if (urlPath === '/api/products') {
      let result = products;
      const category = query.get('category');
      const search = (query.get('search') || '').toLowerCase();

      if (category) result = result.filter((p) => p.categorySlug === category);
      if (search) result = result.filter((p) => p.name.toLowerCase().includes(search));

      sendJson(200, result);
      return;
    }

    const singleMatch = urlPath.match(/^\/api\/products\/(\d+)$/);
    if (singleMatch) {
      const product = products.find((p) => p.id === Number(singleMatch[1]));
      if (product) {
        sendJson(200, product);
      } else {
        sendJson(404, { error: 'Товар не найден' });
      }
      return;
    }

    sendJson(404, { error: 'Неизвестный API-эндпоинт' });
  });
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 — Ошибка сервера');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log(`МиниМаркет запущен: http://localhost:${PORT}`);
});

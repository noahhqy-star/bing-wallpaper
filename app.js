const { createServer } = require('http');
const next = require('next');
const { getDb } = require('./db');
const crawl = require('./lib/crawler');

const dev = process.argv.slice(2)[0] === 'dev';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = 3002;

app.prepare().then(() => {
  // 初始化 SQLite 数据库
  getDb();
  console.log('✅ SQLite 数据库已初始化');

  createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/') {
      app.render(req, res, '/index', Object.fromEntries(url.searchParams));
    } else {
      handle(req, res);
    }
  }).listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error('Server failed to start:', err);
      process.exit(1);
    }

    // 启动爬虫定时任务
    crawl(true);
    console.log(`> Ready on http://0.0.0.0:${port}`);
  });
}).catch((err) => {
  console.error('Failed to prepare app:', err);
  process.exit(1);
});

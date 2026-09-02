const http = require('http');
const httpProxy = require('http-proxy');

const BRIDGE_PORT = 4789;
const BRIDGE_HOST = '127.0.0.1';

function isAllowedTarget(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch { return false; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Cache-Control', 'no-store');
}

function createLyricDisplayLocalBridge({ getDefaultTarget, port = BRIDGE_PORT } = {}) {
  let configuredTarget = '';
  const target = () => configuredTarget || String(getDefaultTarget?.() || 'http://localhost:4000').replace(/\/+$/, '');
  const proxy = httpProxy.createProxyServer({ ws: true, changeOrigin: true, xfwd: true });
  proxy.on('proxyRes', (_proxyRes, _req, res) => cors(res));
  proxy.on('error', (error, _req, res) => {
    if (res && !res.headersSent) { cors(res); res.writeHead(502, { 'Content-Type': 'application/json' }); }
    if (res && !res.writableEnded) res.end(JSON.stringify({ error: `Local bridge: ${error.message}` }));
  });
  const server = http.createServer((req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.url === '/bridge/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, target: target(), port })); }
    if (req.url === '/bridge/config' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { if (body.length < 4096) body += chunk; });
      req.on('end', () => {
        try {
          const nextTarget = JSON.parse(body || '{}').target;
          if (!isAllowedTarget(nextTarget)) throw new Error('Разрешены только локальные/private HTTP адреса LyricDisplay.');
          configuredTarget = String(nextTarget).replace(/\/+$/, '');
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, target: configuredTarget }));
        } catch (error) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
      });
      return;
    }
    const nextTarget = target();
    if (!isAllowedTarget(nextTarget)) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Некорректный HTTP target LyricDisplay.' })); }
    proxy.web(req, res, { target: nextTarget });
  });
  server.on('upgrade', (req, socket, head) => {
    const nextTarget = target();
    if (!isAllowedTarget(nextTarget)) return socket.destroy();
    proxy.ws(req, socket, head, { target: nextTarget });
  });
  server.on('error', (error) => console.warn(`[LocalBridge] ${error.message}`));
  server.listen(port, BRIDGE_HOST, () => console.log(`[LocalBridge] ready on ${BRIDGE_HOST}:${port}`));
  return { port, close: () => { proxy.close(); server.close(); } };
}

module.exports = { BRIDGE_PORT, createLyricDisplayLocalBridge, isAllowedTarget };

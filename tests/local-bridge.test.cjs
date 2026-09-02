const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createLyricDisplayLocalBridge, isAllowedTarget } = require('../shared/lyricdisplay-local-bridge');

test('local bridge allows only loopback/private HTTP targets', () => {
  assert.equal(isAllowedTarget('http://localhost:4000'), true);
  assert.equal(isAllowedTarget('http://192.168.1.198:4000'), true);
  assert.equal(isAllowedTarget('https://192.168.1.198:4000'), false);
  assert.equal(isAllowedTarget('http://example.com:4000'), false);
});

test('local bridge configures and proxies LyricDisplay HTTP with CORS', async () => {
  const targetPort = 4899;
  const bridgePort = 4898;
  const target = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: req.url }));
  });
  await new Promise((resolve) => target.listen(targetPort, '127.0.0.1', resolve));
  const bridge = createLyricDisplayLocalBridge({ getDefaultTarget: () => `http://127.0.0.1:${targetPort}`, port: bridgePort });
  await new Promise((resolve) => setTimeout(resolve, 30));
  try {
    const status = await fetch(`http://127.0.0.1:${bridgePort}/bridge/health`).then((response) => response.json());
    assert.equal(status.ok, true);
    const configResponse = await fetch(`http://127.0.0.1:${bridgePort}/bridge/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: `http://127.0.0.1:${targetPort}` }) });
    assert.equal(configResponse.status, 200);
    const proxied = await fetch(`http://127.0.0.1:${bridgePort}/api/health`);
    assert.equal(proxied.status, 200);
    assert.equal(proxied.headers.get('access-control-allow-origin'), '*');
    assert.equal(proxied.headers.get('access-control-allow-private-network'), 'true');
    assert.deepEqual(await proxied.json(), { ok: true, path: '/api/health' });
  } finally {
    bridge.close();
    await new Promise((resolve) => target.close(resolve));
  }
});

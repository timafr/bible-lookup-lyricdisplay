const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadPreferences, savePreferences, yandexKeyStore, asioStatus } = require('../shared/lyricdisplay-platform');

test('preferences are normalized and persisted with safe defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lyricdisplay-'));
  const app = { getPath: () => dir };
  const saved = savePreferences(app, { serverUrl: 'http://example.test///', joinCode: '  1234  ', listenerMode: 'invalid', listenerThreshold: 120 });
  assert.equal(saved.serverUrl, 'http://example.test');
  assert.equal(saved.joinCode, '1234');
  assert.equal(saved.listenerMode, 'auto');
  assert.equal(saved.listenerThreshold, 98);
  assert.deepEqual(loadPreferences(app), saved);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Yandex key store reports configuration without exposing key contents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lyricdisplay-'));
  const app = { getPath: () => dir };
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: (value) => Buffer.from(value, 'utf8'), decryptString: (value) => Buffer.from(value).toString('utf8') };
  const store = yandexKeyStore(app, safeStorage);
  assert.equal(store.status().configured, false);
  assert.equal(store.saveKey('secret'), true);
  assert.equal(store.status().configured, true);
  assert.equal(store.saveKey(''), false);
  assert.equal(store.status().configured, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ASIO diagnostic returns a stable shape on every platform', () => {
  const status = asioStatus();
  assert.equal(typeof status.available, 'boolean');
  assert.equal(typeof status.xAirDetected, 'boolean');
  assert.ok(Array.isArray(status.devices));
});

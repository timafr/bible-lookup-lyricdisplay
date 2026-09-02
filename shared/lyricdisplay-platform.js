const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_PREFERENCES = Object.freeze({
  serverUrl: 'http://localhost:4000',
  joinCode: '',
  listenerMode: 'auto',
  listenerThreshold: 78,
  speechProvider: 'auto',
  microphoneDeviceId: '',
  audioBackend: 'standard',
  asioDriver: '',
});

function preferencesPath(app) { return path.join(app.getPath('userData'), 'preferences.json'); }
function loadPreferences(app) {
  try { return { ...DEFAULT_PREFERENCES, ...JSON.parse(fs.readFileSync(preferencesPath(app), 'utf8')) }; } catch { return { ...DEFAULT_PREFERENCES }; }
}
function savePreferences(app, preferences) {
  const next = { ...DEFAULT_PREFERENCES, ...(preferences || {}) };
  next.serverUrl = String(next.serverUrl || DEFAULT_PREFERENCES.serverUrl).trim().replace(/\/+$/, '');
  next.joinCode = String(next.joinCode || '').trim();
  next.listenerMode = next.listenerMode === 'suggest' ? 'suggest' : 'auto';
  next.listenerThreshold = Math.min(98, Math.max(50, Number(next.listenerThreshold) || 78));
  fs.mkdirSync(path.dirname(preferencesPath(app)), { recursive: true });
  fs.writeFileSync(preferencesPath(app), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function yandexKeyStore(app, safeStorage) {
  const keyPath = path.join(app.getPath('userData'), 'yandex-speechkit.key');
  const hasKey = () => { try { return fs.existsSync(keyPath) && fs.statSync(keyPath).size > 0; } catch { return false; } };
  const readKey = () => { try { return hasKey() && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(fs.readFileSync(keyPath)) : ''; } catch { return ''; } };
  const saveKey = (value) => { const key = String(value || '').trim(); if (!key) { fs.rmSync(keyPath, { force: true }); return false; } if (!safeStorage.isEncryptionAvailable()) throw new Error('Защищённое хранилище Windows недоступно.'); fs.mkdirSync(path.dirname(keyPath), { recursive: true }); fs.writeFileSync(keyPath, safeStorage.encryptString(key)); return true; };
  const testKey = async () => { const key = readKey(); if (!key) return { ok: false, message: 'API-ключ Yandex не сохранён.' }; const response = await fetch('https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=lpcm&sampleRateHertz=16000', { method: 'POST', headers: { Authorization: `Api-Key ${key}`, 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(0) }); if ([401, 403].includes(response.status)) return { ok: false, message: 'Yandex отклонил API-ключ или у него нет права SpeechKit.' }; return response.status >= 500 ? { ok: false, message: `Yandex временно недоступен (${response.status}).` } : { ok: true, message: 'API-ключ принят Yandex SpeechKit. Folder ID не требуется.' }; };
  const recognize = async (payload) => { const key = readKey(); if (!key) throw new Error('API-ключ Yandex не сохранён.'); const audio = Buffer.from(String(payload?.base64 || ''), 'base64'); if (!audio.length) return { text: '', confidence: 0 }; const response = await fetch('https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=lpcm&sampleRateHertz=16000', { method: 'POST', headers: { Authorization: `Api-Key ${key}`, 'Content-Type': 'application/octet-stream' }, body: audio }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error_message || `Yandex SpeechKit HTTP ${response.status}`); return { text: body.result || '', confidence: 0 }; };
  return { status: () => ({ configured: hasKey(), authMode: 'api-key', folderIdRequired: false }), saveKey, testKey, recognize };
}

function asioStatus() {
  const registered = [];
  if (process.platform === 'win32') for (const [root, architecture, registryView] of [['HKLM\\SOFTWARE\\ASIO', '64-bit', '/reg:64'], ['HKLM\\SOFTWARE\\WOW6432Node\\ASIO', '32-bit', '/reg:32'], ['HKCU\\Software\\ASIO', 'user', '']]) { try { const output = execFileSync('reg.exe', ['query', root, '/s', ...(registryView ? [registryView] : [])], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }); let current; for (const line of output.split(/\r?\n/)) { const key = line.match(/^HKEY[^\s]+/i); if (key) { current = { registryPath: key[0], architecture, name: key[0].split('\\').pop(), description: '' }; if (/\\ASIO\\[^\\]+$/i.test(key[0])) registered.push(current); continue; } const value = line.match(/^\s*(Description|CLSID)\s+REG_\w+\s+(.+)$/i); if (value && current) current[value[1].toLowerCase()] = value[2].trim(); } } catch {} }
  let native = []; try { const portAudio = require('naudiodon'); const devices = typeof portAudio.getDevices === 'function' ? portAudio.getDevices() : []; native = devices.filter((device) => /asio/i.test(`${device.hostAPIName || ''} ${device.name || ''}`)).map((device) => ({ id: device.id, name: device.name, hostAPIName: device.hostAPIName, source: 'portaudio' })); } catch {}
  const devices = [...registered.map((driver) => ({ id: `registry:${driver.registryPath}`, name: driver.description || driver.name, hostAPIName: 'ASIO', source: 'registry', architecture: driver.architecture, clsid: driver.clsid })), ...native];
  return { available: devices.length > 0, xAirDetected: devices.some((device) => /x[- ]?air/i.test(`${device.name} ${device.description || ''}`)), devices, reason: devices.length ? '' : 'ASIO driver is not registered or native bridge is unavailable' };
}

module.exports = { DEFAULT_PREFERENCES, loadPreferences, savePreferences, yandexKeyStore, asioStatus };

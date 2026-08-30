const { app, BrowserWindow, ipcMain, session, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('enable-media-stream');

let mainWindow;
let bibleDataCache;

function loadBibleData() {
  if (!bibleDataCache) {
    const dataPath = path.join(__dirname, 'data', 'synodal-ru.json');
    bibleDataCache = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
  return bibleDataCache;
}

function preferencesPath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function readPreferences() {
  try {
    const saved = JSON.parse(fs.readFileSync(preferencesPath(), 'utf8'));
    return typeof saved === 'object' && saved ? saved : {};
  } catch {
    return {};
  }
}

function writePreferences(preferences) {
  const destination = preferencesPath();
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(preferences, null, 2), 'utf8');
}


function yandexKeyPath() { return path.join(app.getPath('userData'), 'yandex-speechkit.key'); }
function hasYandexKey() { try { return fs.existsSync(yandexKeyPath()) && fs.statSync(yandexKeyPath()).size > 0; } catch { return false; } }
function readYandexKey() { try { if (!hasYandexKey()) return ''; const encrypted = fs.readFileSync(yandexKeyPath()); return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(encrypted) : ''; } catch { return ''; } }
function saveYandexKey(value) { const key = String(value || '').trim(); if (!key) { try { fs.rmSync(yandexKeyPath(), { force: true }); } catch {} return false; } if (!safeStorage.isEncryptionAvailable()) throw new Error('Защищённое хранилище Windows недоступно.'); fs.mkdirSync(path.dirname(yandexKeyPath()), { recursive: true }); fs.writeFileSync(yandexKeyPath(), safeStorage.encryptString(key)); return true; }
async function testYandexKey() {
  const key = readYandexKey();
  if (!key) return { ok: false, message: 'API-ключ Yandex не сохранён.' };
  const response = await fetch('https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=lpcm&sampleRateHertz=16000', { method: 'POST', headers: { Authorization: `Api-Key ${key}`, 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(0) });
  if (response.status === 401 || response.status === 403) return { ok: false, message: 'Yandex отклонил API-ключ или у него нет права SpeechKit.' };
  if (response.status >= 500) return { ok: false, message: `Yandex временно недоступен (${response.status}).` };
  return { ok: true, message: 'API-ключ принят Yandex SpeechKit. Folder ID не требуется.' };
}
async function recognizeYandexAudio(payload) {
  const key = readYandexKey();
  if (!key) throw new Error('API-ключ Yandex не сохранён.');
  const audio = Buffer.from(String(payload?.base64 || ''), 'base64');
  if (!audio.length) return { text: '', confidence: 0 };
  const response = await fetch('https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=lpcm&sampleRateHertz=16000', { method: 'POST', headers: { Authorization: `Api-Key ${key}`, 'Content-Type': 'application/octet-stream' }, body: audio });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_message || `Yandex SpeechKit HTTP ${response.status}`);
  return { text: body.result || '', confidence: 0 };
}

function getAsioStatus() {
  const registered = [];
  if (process.platform === 'win32') {
    const { execFileSync } = require('child_process');
    const roots = [
      ['HKLM\\SOFTWARE\\ASIO', '64-bit', '/reg:64'],
      ['HKLM\\SOFTWARE\\WOW6432Node\\ASIO', '32-bit', '/reg:32'],
      ['HKCU\\Software\\ASIO', 'user', ''],
    ];
    for (const [root, architecture, registryView] of roots) {
      try {
        const output = execFileSync('reg.exe', ['query', root, '/s', ...(registryView ? [registryView] : [])], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
        let current;
        for (const line of output.split(/\r?\n/)) {
          const key = line.match(/^HKEY[^\s]+/i);
          if (key) { current = { registryPath: key[0], architecture, name: key[0].split('\\').pop(), description: '' }; if (/\\ASIO\\[^\\]+$/i.test(key[0])) registered.push(current); continue; }
          const value = line.match(/^\s*(Description|CLSID)\s+REG_\w+\s+(.+)$/i);
          if (value && current) current[value[1].toLowerCase()] = value[2].trim();
        }
      } catch { /* missing registry branch or non-Windows environment */ }
    }
  }
  let portAudioDevices = [];
  try {
    const portAudio = require('naudiodon');
    const devices = typeof portAudio.getDevices === 'function' ? portAudio.getDevices() : [];
    portAudioDevices = devices.filter((device) => /asio/i.test(`${device.hostAPIName || ''} ${device.name || ''}`)).map((device) => ({ id: device.id, name: device.name, hostAPIName: device.hostAPIName, source: 'portaudio' }));
  } catch { /* optional native bridge */ }
  const devices = [...registered.map((driver) => ({ id: `registry:${driver.registryPath}`, name: driver.description || driver.name, hostAPIName: 'ASIO', source: 'registry', architecture: driver.architecture, clsid: driver.clsid })), ...portAudioDevices];
  return { available: devices.length > 0, xAirDetected: devices.some((device) => /x[- ]?air/i.test(`${device.name} ${device.description || ''}`)), devices, reason: devices.length ? '' : 'ASIO driver is not registered or native bridge is unavailable' };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: 'Bible Lookup for LyricDisplay',
    backgroundColor: '#0b1324',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((_contents, permission) => permission === 'media');
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'media'));

  ipcMain.handle('bible:load', () => loadBibleData());
  ipcMain.handle('preferences:load', () => readPreferences());
  ipcMain.handle('preferences:save', (_event, preferences) => {
    writePreferences(preferences);
    return true;
  });
  ipcMain.handle('audio:asio-status', () => getAsioStatus());
  ipcMain.handle('yandex:status', () => ({ configured: hasYandexKey(), authMode: 'api-key', folderIdRequired: false }));
  ipcMain.handle('yandex:save-key', (_event, value) => ({ configured: saveYandexKey(value), authMode: 'api-key', folderIdRequired: false }));
  ipcMain.handle('yandex:test-key', () => testYandexKey());
  ipcMain.handle('yandex:recognize', (_event, payload) => recognizeYandexAudio(payload));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

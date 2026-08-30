const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

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

function getAsioStatus() {
  const registered = [];
  if (process.platform === 'win32') {
    const { execFileSync } = require('child_process');
    const roots = [
      ['HKLM\\SOFTWARE\\ASIO', '64-bit'],
      ['HKLM\\SOFTWARE\\WOW6432Node\\ASIO', '32-bit'],
      ['HKCU\\Software\\ASIO', 'user'],
    ];
    for (const [root, architecture] of roots) {
      try {
        const output = execFileSync('reg.exe', ['query', root, '/s'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
        let current;
        for (const line of output.split(/\r?\n/)) {
          const key = line.match(/^HKEY[^\s]+/i);
          if (key) { current = { registryPath: key[0], architecture, name: key[0].split('\\').pop(), description: '' }; if (/\\ASIO(?:\\|$)/i.test(key[0])) registered.push(current); continue; }
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
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  ipcMain.handle('bible:load', () => loadBibleData());
  ipcMain.handle('preferences:load', () => readPreferences());
  ipcMain.handle('preferences:save', (_event, preferences) => {
    writePreferences(preferences);
    return true;
  });
  ipcMain.handle('audio:asio-status', () => getAsioStatus());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

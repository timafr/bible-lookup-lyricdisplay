const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

function preferencesPath() { return path.join(app.getPath('userData'), 'preferences.json'); }
function readPreferences() {
  try { return JSON.parse(fs.readFileSync(preferencesPath(), 'utf8')); } catch { return {}; }
}
function writePreferences(preferences) {
  fs.mkdirSync(path.dirname(preferencesPath()), { recursive: true });
  fs.writeFileSync(preferencesPath(), JSON.stringify(preferences, null, 2), 'utf8');
}
function getAsioStatus() {
  try {
    const portAudio = require('naudiodon');
    const devices = typeof portAudio.getDevices === 'function' ? portAudio.getDevices() : [];
    const asioDevices = devices.filter((device) => /asio/i.test(`${device.hostAPIName || ''} ${device.name || ''}`));
    return { available: asioDevices.length > 0, devices: asioDevices.map((device) => ({ id: device.id, name: device.name, hostAPIName: device.hostAPIName })) };
  } catch (error) {
    return { available: false, devices: [], reason: error.message || 'ASIO module unavailable' };
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1080, height: 720, minWidth: 860, minHeight: 560,
    title: 'LyricDisplay Song Controller', backgroundColor: '#091321',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.removeMenu();
  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'media'));
  ipcMain.handle('preferences:load', () => readPreferences());
  ipcMain.handle('preferences:save', (_event, preferences) => { writePreferences(preferences); return true; });
  ipcMain.handle('audio:asio-status', () => getAsioStatus());
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

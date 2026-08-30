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
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

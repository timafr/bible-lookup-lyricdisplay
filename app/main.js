const { app, BrowserWindow, ipcMain } = require('electron');
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
  ipcMain.handle('bible:load', () => loadBibleData());
  ipcMain.handle('preferences:load', () => readPreferences());
  ipcMain.handle('preferences:save', (_event, preferences) => {
    writePreferences(preferences);
    return true;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

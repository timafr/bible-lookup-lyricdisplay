const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  loadBible: () => ipcRenderer.invoke('bible:load'),
  loadPreferences: () => ipcRenderer.invoke('preferences:load'),
  savePreferences: (preferences) => ipcRenderer.invoke('preferences:save', preferences),
  getAsioStatus: () => ipcRenderer.invoke('audio:asio-status'),
});

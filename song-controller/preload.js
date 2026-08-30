const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  loadPreferences: () => ipcRenderer.invoke('preferences:load'),
  savePreferences: (preferences) => ipcRenderer.invoke('preferences:save', preferences),
  getAsioStatus: () => ipcRenderer.invoke('audio:asio-status'),
});

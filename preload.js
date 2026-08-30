const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  loadBible: () => ipcRenderer.invoke('bible:load'),
  loadPreferences: () => ipcRenderer.invoke('preferences:load'),
  savePreferences: (preferences) => ipcRenderer.invoke('preferences:save', preferences),
  getAsioStatus: () => ipcRenderer.invoke('audio:asio-status'),
  refreshAsioDrivers: () => ipcRenderer.invoke('audio:asio-status'),
  getYandexStatus: () => ipcRenderer.invoke('yandex:status'),
  saveYandexKey: (value) => ipcRenderer.invoke('yandex:save-key', value),
  testYandexKey: () => ipcRenderer.invoke('yandex:test-key'),
  recognizeYandex: (payload) => ipcRenderer.invoke('yandex:recognize', payload),
});

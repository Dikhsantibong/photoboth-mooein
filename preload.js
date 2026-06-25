const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  restartApp: () => ipcRenderer.send('restart-app'),
  closeApp: () => ipcRenderer.send('close-app'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateMessage: (callback) => {
    ipcRenderer.on('updater-message', (_event, data) => callback(data));
  },
});

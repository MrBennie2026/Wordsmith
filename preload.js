const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  speak: (text, voiceName) => ipcRenderer.invoke('speak', text, voiceName),
  stopSpeak: () => ipcRenderer.invoke('stop-speak')
});

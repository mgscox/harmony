import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    searchQuery: (query: string) => ipcRenderer.invoke('search-query', query),
    onStreamData: (callback: (data: string) => void) => {
        ipcRenderer.on('stream-data', (_, data) => callback(data));
    },
    onStreamEnd: (callback: () => void) => {
        ipcRenderer.on('stream-end', () => callback());
    },
    onWebResults: (callback: (results: string) => void) => {
        ipcRenderer.on('web-results', (_, data) => callback(data));
    },
    removeStreamListeners: () => {
        ipcRenderer.removeAllListeners('stream-data');
        ipcRenderer.removeAllListeners('stream-end');
        ipcRenderer.removeAllListeners('web-results');
    },
    cancelQuery: () => ipcRenderer.invoke('cancel-query')
});

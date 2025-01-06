import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { parseQuery } from './server';
import { llmService } from './server/sercices/llm.service';
import { searchService } from './server/sercices/search.service';

let mainWindow: BrowserWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('search-query', async (event, query: string) => {
    const dataHandler = (chunk: string) => {
        mainWindow.webContents.send('stream-data', chunk);
    };
    const endHandler = () => {
        mainWindow.webContents.send('stream-end');
    };

    llmService.on('data', dataHandler);
    llmService.on('end', endHandler);
    searchService.on('web-results', (result: string) => {
        mainWindow.webContents.send('web-results', result);
    });

    try {
        const response = await parseQuery(query);
        return response;
    } finally {
        llmService.off('data', dataHandler);
        llmService.off('end', endHandler);
    }
});
ipcMain.handle('cancel-query', () => {
    llmService.cancel();
});
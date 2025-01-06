export {};

declare global {
    interface Window {
        electronAPI: {
            cancelQuery: () => void;
            searchQuery: (query: string) => Promise<string>;
            onStreamData: (callback: (data: string) => void) => void;
            onStreamEnd: (callback: () => void) => void;
            onWebResults: (callback: (data: string) => void) => void;
            removeStreamListeners: () => void;
        }
        marked: any;
    }
}

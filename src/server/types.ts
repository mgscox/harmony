export type Level = 'trace' | 'debug' | 'log' | 'info' | 'warn' | 'error' | 'panic';

export interface Log {
    id?: string;
    level: Level;
    pid: number;
    timestamp: number;
    message: string;
    data: any;
    stack?: string[];
    _internal?: boolean;
}

export const LogLevel: Record<Level, number> = {
    trace: 0,
    debug: 1,
    log: 2,
    info: 3,
    warn: 4,
    error: 5,
    panic: 6,
};

export interface Log {
    id?: string;
    level: Level;
    pid: number;
    timestamp: number;
    message: string;
    data: any;
    stack?: string[];
}
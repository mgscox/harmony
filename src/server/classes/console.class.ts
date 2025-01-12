import { EventEmitter } from 'events';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import sqlite3 from 'sqlite3';
import { Log, Level } from '../types';

const FLUSH_LOGS_COUNT = 100;

export type CfgParam = {
    filename?: string,
    filter?: (log: Log) => boolean,
    extra?: () => Record<string, any>,
    logDir?: string,
}

export class ConsoleClass extends EventEmitter {
    private logs: Log[];
    private debounce: any;
    private filename: string;
    private filter: (log: Log) => boolean;
    private extra: () => Record<string, any>;
    private cfg: CfgParam;

    constructor(cfg?: CfgParam) {
        super();
        this.cfg = cfg || {};
        this.logs = [];
        this.filter = this.cfg.filter || (() => true);
        this.extra = this.cfg.extra || (() => ({}));
        this.filename = this.cfg.filename || join(process.cwd(), 'logs', 'console-%Y%M%D.log');

        // Handle unhandled errors
        process.on('uncaughtException', (error) => {
            this.panic('Uncaught Exception', error);
            this.writeLogSync();
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.panic('Unhandled Promise Rejection', { reason, promise });
            this.writeLogSync();
        });

        // Handle normal exit
        process.on('exit', (code) => {

            if (code !== 0) {
                this.panic('Process exited with non-zero code', { code });
            }
            else {
                this.log('Process exited normally', { code });
            }

            this.writeLogSync();
        });

        // Handle SIGTERM
        process.on('SIGTERM', () => {
            this.warn('Process received SIGTERM');
            this.writeLogSync();
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            this.warn('Process received SIGINT');
            this.writeLogSync();
            process.exit(0);
        });

        this.log(`Console initialized, ${this.filename}`);
        this.writeLog();
    }

    init(cfg: CfgParam) {

        if (cfg.filename) {
            this.filename = cfg.filename;
        }
        if (cfg.filter) {
            this.filter = cfg.filter;
        }
        if (cfg.extra) {
            this.extra = cfg.extra;
        }

    }

    trace(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.trace(message, ...data.slice(1));
        this.doLog({ level: 'trace', message, data });
    }

    debug(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.debug(message, ...data.slice(1));
        this.doLog({ level: 'debug', message, data });
    }

    log(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.log(message, ...data.slice(1));
        this.doLog({ level: 'log', message, data });
    }

    info(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.info(message, ...data.slice(1));
        this.doLog({ level: 'info', message, data });
    }

    warn(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.warn(message, ...data.slice(1));
        this.doLog({ level: 'warn', message, data });
    }

    error(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.error(message, ...data.slice(1));
        const error = data.find(d => d instanceof Error);
        this.doLog({ level: 'error', message, data, stack: this.stack(error) });
    }

    panic(...data: any[]) {
        const message = 'string' === typeof data[0] ? data[0] : JSON.stringify(data[0]);
        console.error(message, ...data.slice(1));
        const error = data.find(d => d instanceof Error);
        const payload = { level: 'panic' as Level, message, data, stack: this.stack(error) };
        this.doLog(payload);
        this.emit('panic', payload);
    }

    private stack(error?: Error): string[] {
        const stack = (error || new Error()).stack || '';
        return stack.split('\n').map(line => line.trim());
    }

    private doLog(param: { level: Level, message: string, data: any[], stack?: string[] }) {
        let payload: Log = {
            level: param.level,
            pid: process.pid,
            timestamp: Date.now() + Number(process.hrtime.bigint() % BigInt(1000000)) / 1000000,
            message: param.message,
            data: {
                param: JSON.parse(JSON.stringify(param.data)),
                _extra: this.extra(),
            },
            stack: param.stack,
        };
        this.store(payload);
    }

    private store(log: Log) {
        this.logs.push(log);
        this.emit('change', log);

        if (this.logs.length > FLUSH_LOGS_COUNT) {
            this.writeLog();
        }
        else {
            this.debounce = setTimeout(() => this.writeLog(), 1000);
        }
    }

    private getProcessedFilename(): string {
        const now = new Date();
        return this.filename
            .replace(/%Y/g, now.getFullYear().toString())
            .replace(/%M/g, (now.getMonth() + 1).toString().padStart(2, '0'))
            .replace(/%D/g, now.getDate().toString().padStart(2, '0'))
            .replace(/%h/g, now.getHours().toString().padStart(2, '0'))
            .replace(/%m/g, now.getMinutes().toString().padStart(2, '0'))
            .replace(/%s/g, now.getSeconds().toString().padStart(2, '0'))
            .replace(/%ms/g, now.getMilliseconds().toString().padStart(3, '0'));
    }

    private prepareLogsForWrite(): { logs: Log[], logData: string, processedFilename: string } | null {
        const logs = this.logs.filter(this.filter);
        this.logs = [];

        if (logs.length === 0) {
            return null;
        }

        const logData = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
        const processedFilename = this.getProcessedFilename();

        return { logs, logData, processedFilename };
    }

    private ensureDirectoryExists(filepath: string): void {
        const dir = dirname(filepath);

        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

    }

    private async writeToSqlite(logs: Log[], dbPath: string): Promise<void> {
        const db = new sqlite3.Database(dbPath);

        try {
            // Create table if it doesn't exist
            await new Promise((resolve, reject) => {
                db.run(`
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT,
    pid INTEGER,
    timestamp FLOAT,
    message TEXT,
    data JSON,
    stack JSON
)
                `,
                    (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(null);
                        }
                    });
            });
            // Insert logs
            const stmt = db.prepare(`
INSERT INTO logs (level, pid, timestamp, message, data, stack)
VALUES (?, ?, ?, ?, ?, ?)`
            );

            for (const log of logs) {
                stmt.run([
                    log.level,
                    log.pid,
                    log.timestamp,
                    log.message,
                    JSON.stringify(log.data),
                    log.stack ? JSON.stringify(log.stack) : null,
                ]);
            }

            stmt.finalize();
        }
        finally {
            db.close();
        }

    }

    private async writeLog() {
        clearTimeout(this.debounce);

        try {
            const prepared = this.prepareLogsForWrite();

            if (prepared === null) {
                return;
            }

            const { logs, logData, processedFilename } = prepared;
            this.ensureDirectoryExists(processedFilename);
            appendFileSync(processedFilename, logData, 'utf8');

            // Write to SQLite database
            const dbPath = join(dirname(processedFilename), 'logs.db');
            await this.writeToSqlite(logs, dbPath);
        }
        catch (error) {
            console.error('Failed to write logs:', error);
        }

    }

    private writeLogSync() {

        try {
            const prepared = this.prepareLogsForWrite();

            if (prepared === null) {
                return;
            }

            const { logs, logData, processedFilename } = prepared;
            this.ensureDirectoryExists(processedFilename);
            appendFileSync(processedFilename, logData, 'utf8');

            // Write to SQLite database
            const dbPath = join(dirname(processedFilename), 'logs.db');
            return this.writeToSqlite(logs, dbPath);
        }
        catch (error) {
            // Last resort error logging to stderr
            console.error('Failed to write logs synchronously:', error);
        }

    }
}


import { config } from "dotenv";
import { dirname, join, resolve } from "node:path";

class ConfigService {
    __rootDir = resolve( join(__dirname, '..', '..', '..') );
    constructor() {
        config({override: false})
    }
    get(key: string) {
        return `${process.env[key]}`;
    }
}

export const configService = new ConfigService();
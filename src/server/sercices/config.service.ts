import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { console } from "./console.service";
import { platform, arch } from "os";
import { execFile } from "node:child_process";

class ConfigService {
    __rootDir = process.cwd();
    constructor() {
        const envFile = join(this.__rootDir, '.env');
        
        if (!existsSync(envFile)) {
            throw new Error('.env file not found: ' + this.__rootDir);
        }

        console.log(`Loading .env file from ${envFile}`); 
        config({override: false});
        process.env.SYSTEM = platform();
        process.env.ARCHITECTURE = arch();
        
        if (process.env.SYSTEM === 'win32') {
            process.env.PATH += `;C:\\Windows\\System32`;
        }
        
    }
    installVC() {
        return new Promise((resolve, reject) => {
            const vcInstallerPath = join(this.__rootDir, "redist", `vc_redist.${process.env.ARCHITECTURE}.exe`);
            console.log(`Installing VC++ Runtime from ${vcInstallerPath}`);
            execFile(vcInstallerPath, ['/quiet', '/norestart'], (error) => {
                
                if (error) {
                    return reject(error); 
                }
                else {
                    return resolve(null);
                }

            });
        });
    }
    get(key: string) {
        return `${process.env[key]}`;
    }
}

export const configService = new ConfigService();
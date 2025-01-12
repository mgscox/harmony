const fs = require('node:fs');
const path = require('node:path');

const __rootDir = path.join(__dirname, '..');

fs.mkdirSync(path.join(__rootDir, 'dist', 'renderer'), { recursive: true });
fs.mkdirSync(path.join(__rootDir, 'dist', 'redist'), { recursive: true });
fs.mkdirSync(path.join(__rootDir, 'dist', 'models'), { recursive: true });

const list = [
    'redist/vc_redist.x64.exe',
    'redist/vc_redist.x86.exe',
    'redist/vc_redist.arm64.exe',
    'models/llama-3.2-1b-instruct-385.pllm',
];

list.forEach(file => {
    fs.copyFileSync(path.join(__rootDir, file), path.join(__rootDir, 'dist', file));
});

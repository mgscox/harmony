const fs = require('fs');
const path = require('path');

// Create renderer directory in dist if it doesn't exist
const rendererDistPath = path.join(__dirname, 'dist', 'renderer');
if (!fs.existsSync(rendererDistPath)) {
    fs.mkdirSync(rendererDistPath, { recursive: true });
}

// Copy HTML and CSS files
const files = ['index.html'];
files.forEach(file => {
    fs.copyFileSync(
        path.join(__dirname, 'src', 'renderer', file),
        path.join(rendererDistPath, file)
    );
});

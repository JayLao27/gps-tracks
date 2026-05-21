const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../assets/images');

// Ensure directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Minimal valid 1x1 transparent PNG base64
const minPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(minPngBase64, 'base64');

const requiredFiles = [
    'icon.png',
    'android-icon-foreground.png',
    'android-icon-background.png',
    'android-icon-monochrome.png',
    'splash-icon.png',
    'favicon.png'
];

console.log("Writing placeholder PNG assets to satisfy prebuild...");

for (const file of requiredFiles) {
    const filePath = path.join(targetDir, file);
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`✅ Saved ${file}`);
}

console.log("\nAll placeholder assets written successfully!");

const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modified = 0;
walkDir('app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Replace fetch("/api/..."` with fetch(`/api/..."`
    content = content.replace(/fetch\(\"(\/api\/[^\`]*)\`/g, 'fetch(`$1`');
    
    // Check for fetch('/api/..."`
    content = content.replace(/fetch\(\'(\/api\/[^\`]*)\`/g, 'fetch(`$1`');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed syntax in:', filePath);
      modified++;
    }
  }
});
console.log('Total files fixed:', modified);

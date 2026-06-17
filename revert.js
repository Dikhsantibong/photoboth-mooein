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

    // The string added was: `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}` inside template literals for fetch
    // Example: fetch(`${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}/api/...`)
    // We want to revert it to fetch("/api/...") or fetch(`/api/...`) depending on what it is.
    
    // Pattern to remove: ${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\//$/, "") || ""}
    const regex = /\$\{process\.env\.NEXT_PUBLIC_BASE_URL\?\.replace\(\/\\\\\/\\$\/, ""\) \|\| ""\}/g;
    
    // In code it looks exactly like this literally:
    // fetch(`${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}/api/generate-qris`
    
    // The exact string injected:
    // ${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\//$/, "") || ""}
    // Wait, the injected string was `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}`
    
    const searchStr = '`${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\\/$/, "") || ""}/api/';
    const replaceStr = '"/api/';
    
    // A simpler way:
    content = content.split('`${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\\/$/, "") || ""}/api/').join('"/api/');
    
    // For cases where the original was already a template literal:
    // It might be fetch(`${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}/api/check-status?order_id=${...}`);
    // Which means the split above turns it into fetch("/api/check-status?order_id=${...}"); which breaks interpolation!
    // We should turn it into fetch(`/api/check-status?order_id=${...}`);
    
    // Instead of replacing blindly with "/api/, let's just remove the `${process.env... || ""}` part.
    // wait, if we remove `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}`, the rest of the template literal remains a valid template literal!
    const exactStrToRemove = '${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\\/$/, "") || ""}';
    content = content.split(exactStrToRemove).join('');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Modified:', filePath);
      modified++;
    }
  }
});
console.log('Total files modified:', modified);

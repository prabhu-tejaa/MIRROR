const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      content = content.replace(/^\s*<!--\s*eslint-disable-next-line\s+@angular-eslint\/template\/no-call-expression\s*-->\s*\n/gm, '');
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log('Cleaned:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done removing eslint disables from HTML templates.');

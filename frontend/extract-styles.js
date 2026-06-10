const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let totalExtracted = 0;

walkDir('src/app', function(filePath) {
  if (!filePath.endsWith('.html')) return;
  
  let html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes('style="') && !html.includes("style='")) return;
  
  const scssPath = filePath.replace('.html', '.scss').replace('.ts', '.scss');
  let scss = fs.existsSync(scssPath) ? fs.readFileSync(scssPath, 'utf8') : '';
  
  let extractedCount = 0;
  
  // Replace style="..." with class="extracted-style-..."
  const styleRegex = /style=(["'])(.*?)\1/g;
  html = html.replace(styleRegex, (match, quote, styleContent) => {
    extractedCount++;
    totalExtracted++;
    const className = `extracted-style-${Date.now()}-${extractedCount}`;
    scss += `\n\n.${className} {\n  ${styleContent.split(';').map(s => s.trim()).filter(Boolean).join(';\n  ')};\n}`;
    return `class="${className}"`;
  });
  
  if (extractedCount > 0) {
    // Merge multiple class attributes on the same element
    const doubleClassRegex = /class=(["'])(.*?)\1(\s+[^>]*)class=(["'])(.*?)\4/g;
    while(doubleClassRegex.test(html)) {
      html = html.replace(doubleClassRegex, 'class=$1$2 $5$1$3');
    }
    
    fs.writeFileSync(filePath, html);
    fs.writeFileSync(scssPath, scss);
    console.log(`Extracted ${extractedCount} inline styles from ${path.basename(filePath)}`);
  }
});

console.log(`Successfully extracted ${totalExtracted} inline styles globally.`);

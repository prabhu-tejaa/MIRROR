const fs = require('fs');
const errors = JSON.parse(fs.readFileSync('html-call-errors.json', 'utf8'));

// Group by file
const fileMap = {};
errors.forEach(e => {
  if (!fileMap[e.file]) fileMap[e.file] = [];
  fileMap[e.file].push(e);
});

for (const file of Object.keys(fileMap)) {
  let content = fs.readFileSync(file, 'utf8').split('\n');
  const fileErrors = fileMap[file];
  
  const lineSet = new Set();
  const uniqueErrors = fileErrors.filter(e => {
    if (lineSet.has(e.line)) return false;
    lineSet.add(e.line);
    return true;
  });
  
  for (const err of uniqueErrors) {
    const lineIndex = err.line - 1;
    let lineText = content[lineIndex].trim();
    if (!lineText) {
        lineText = content[lineIndex - 1].trim();
    }
    console.log(`${file}:${err.line}`);
    console.log(`  ${lineText}`);
  }
}

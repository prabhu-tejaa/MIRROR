const fs = require('fs');
const errors = JSON.parse(fs.readFileSync('html-call-errors.json', 'utf8'));

// Group by file
const fileMap = {};
errors.forEach(e => {
  if (!fileMap[e.file]) fileMap[e.file] = [];
  fileMap[e.file].push(e);
});

let manualRefactorCount = 0;
let signalFixCount = 0;

for (const file of Object.keys(fileMap)) {
  let content = fs.readFileSync(file, 'utf8').split('\n');
  const fileErrors = fileMap[file];
  
  // Sort errors descending by line so insertions don't offset earlier lines
  // Also get unique lines
  const lineSet = new Set();
  const uniqueErrors = fileErrors.filter(e => {
    if (lineSet.has(e.line)) return false;
    lineSet.add(e.line);
    return true;
  });
  
  uniqueErrors.sort((a, b) => b.line - a.line);
  
  for (const err of uniqueErrors) {
    const lineIndex = err.line - 1;
    const lineText = content[lineIndex];
    
    // Simple heuristic: check if there's a call with arguments like `someFunc(xyz)`
    // By looking for `(` followed by anything other than `)`
    const hasArgs = /\w+\([^)]+\)/.test(lineText);
    
    if (hasArgs) {
      console.log(`MANUAL REFACTOR NEEDED (has args): ${file}:${err.line}`);
      console.log(`  ${lineText.trim()}`);
      manualRefactorCount++;
    } else {
      const indentMatch = lineText.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      const disableComment = `${indent}<!-- eslint-disable-next-line @angular-eslint/template/no-call-expression -->`;
      
      content.splice(lineIndex, 0, disableComment);
      signalFixCount++;
    }
  }
  
  fs.writeFileSync(file, content.join('\n'));
}

console.log(`\nCompleted! Added ${signalFixCount} signal disables. ${manualRefactorCount} method calls require manual refactoring.`);

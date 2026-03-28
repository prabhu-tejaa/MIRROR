const fs = require('fs');
const path = require('path');

function cleanFile(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Remove schematic comments and overloads
    // Using a more robust regex to handle multiple line endings and spaces
    let newContent = content.replace(/\s*\/\*\* Inserted by Angular inject.*?\*\/\s*constructor\(\.\.\.args: unknown\[\]\);/g, '');
    
    // Remove truly empty constructors
    // Matches constructor() {} followed by an optional blank line
    newContent = newContent.replace(/\n\s*constructor\(\) \{\}\s*\n+/g, '\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filepath, newContent, 'utf8');
      console.log(`Cleaned ${filepath}`);
    }
  } catch (err) {
    console.error(`Error cleaning ${filepath}: ${err}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.ts')) {
      cleanFile(fullPath);
    }
  }
}

const appDir = path.join(__dirname, 'src', 'app');
walk(appDir);

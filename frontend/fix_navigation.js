const fs = require('fs');
const path = require('path');

function fixFile(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    // Replace all possible old tab route references
    let newContent = content.replace(/\/tabs\/tab1/g, '/tabs/you');
    newContent = newContent.replace(/\/tabs\/tab2/g, '/tabs/chat');
    newContent = newContent.replace(/\/tabs\/tab3/g, '/tabs/profile');
    
    if (newContent !== content) {
      fs.writeFileSync(filepath, newContent, 'utf8');
      console.log(`Updated navigation in ${filepath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filepath}: ${err}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.html')) {
      fixFile(fullPath);
    }
  }
}

const appDir = path.join(__dirname, 'src', 'app');
walk(appDir);

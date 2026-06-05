const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx cross-env ESLINT_USE_FLAT_CONFIG=false eslint "src/**/*.html" --format json', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
  parse(output);
} catch (e) {
  if (e.stdout) {
    parse(e.stdout);
  } else {
    console.error(e);
  }
}

function parse(output) {
  const start = output.indexOf('[');
  if (start === -1) {
    console.log("No JSON found");
    return;
  }
  const jsonStr = output.substring(start);
  const data = JSON.parse(jsonStr);
  const errors = [];
  data.forEach(r => {
    r.messages.forEach(m => {
      if (m.ruleId === '@angular-eslint/template/no-call-expression') {
        errors.push({ file: r.filePath, line: m.line, column: m.column, message: m.message });
      }
    });
  });
  
  // Write to a JSON file so I can process it later
  fs.writeFileSync('html-call-errors.json', JSON.stringify(errors, null, 2));
  console.log(`Found ${errors.length} no-call-expression errors. Saved to html-call-errors.json`);
}

const { execSync } = require('child_process');
try {
  const output = execSync('npx cross-env ESLINT_USE_FLAT_CONFIG=false eslint "src/**/*.ts" --format json', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
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
  if (start === -1) return;
  const jsonStr = output.substring(start);
  const data = JSON.parse(jsonStr);
  let count = 0;
  data.forEach(r => {
    r.messages.forEach(m => {
      if (m.ruleId === '@typescript-eslint/typedef') {
        if (count < 10) {
          console.log(`${r.filePath}:${m.line} - ${m.message}`);
          count++;
        }
      }
    });
  });
}

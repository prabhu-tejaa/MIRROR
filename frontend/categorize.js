const { execSync } = require('child_process');
try {
  console.log('Running ESLint...');
  const output = execSync('npx cross-env ESLINT_USE_FLAT_CONFIG=false eslint "src/**/*.ts" "src/**/*.html" --format json', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
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
    console.error('No JSON output found.');
    return;
  }
  const jsonStr = output.substring(start);
  const data = JSON.parse(jsonStr);
  const counts = {};
  let total = 0;
  data.forEach(r => {
    r.messages.forEach(m => {
      const rule = m.ruleId || 'syntax-error';
      counts[rule] = (counts[rule] || 0) + 1;
      total++;
    });
  });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  console.log(`\nTotal Errors: ${total}\n`);
  sorted.forEach(([k,v]) => console.log(`${k}: ${v}`));
}

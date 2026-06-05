const { Project } = require('ts-morph');

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' });

let count = 0;
project.getSourceFiles().forEach(file => {
  if (file.getFilePath().includes('node_modules')) return;

  file.getInterfaces().forEach(iface => {
    const name = iface.getName();
    if (name.match(/^I[A-Z]/)) {
      const newName = name.substring(1);
      try {
        iface.rename(newName);
        count++;
      } catch (e) {}
    }
  });
});

console.log('Fixed ' + count + ' interface names.');
project.saveSync();

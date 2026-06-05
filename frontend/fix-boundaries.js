const { Project } = require('ts-morph');

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' });

let count = 0;
project.getSourceFiles().forEach(file => {
  if (file.getFilePath().includes('node_modules')) return;

  file.getClasses().forEach(cls => {
    cls.getMethods().forEach(method => {
      if (!method.getReturnTypeNode()) {
        try {
          const type = method.getReturnType().getText(method);
          if (type && type.length < 50 && !type.includes('import(')) {
            method.setReturnType(type);
            count++;
          } else if (type === 'void') {
             method.setReturnType('void');
             count++;
          }
        } catch (e) {}
      }
    });
  });
  
  file.getFunctions().forEach(func => {
    if (!func.getReturnTypeNode()) {
        try {
          const type = func.getReturnType().getText(func);
          if (type && type.length < 50 && !type.includes('import(')) {
            func.setReturnType(type);
            count++;
          }
        } catch (e) {}
      }
  })
});

console.log('Fixed ' + count + ' explicit module boundary types.');
project.saveSync();

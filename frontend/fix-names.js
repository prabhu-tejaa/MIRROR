const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' });

let count = 0;

project.getSourceFiles().forEach(file => {
  if (file.getFilePath().includes('node_modules') || file.getFilePath().includes('zone-flags')) return;

  file.getClasses().forEach(cls => {
    // Fix Properties
    cls.getProperties().forEach(prop => {
      const name = prop.getName();
      if (name.startsWith('_')) {
        let newName = name.replace(/^_+/, '');
        if (cls.getProperty(newName) || cls.getGetter(newName) || cls.getSetter(newName) || cls.getMethod(newName)) {
          newName = newName + 'Internal';
        }
        try {
          prop.rename(newName);
          count++;
        } catch (e) {}
      }
    });

    // Fix Methods
    cls.getMethods().forEach(method => {
      const name = method.getName();
      if (name.startsWith('_')) {
        let newName = name.replace(/^_+/, '');
        if (cls.getProperty(newName) || cls.getGetter(newName) || cls.getSetter(newName) || cls.getMethod(newName)) {
          newName = newName + 'Internal';
        }
        try {
          method.rename(newName);
          count++;
        } catch(e) {}
      }
    });
  });

  // Fix Variables outside classes
  file.getVariableDeclarations().forEach(decl => {
    const name = decl.getName();
    if (name.startsWith('_') && !name.includes('__')) {
      let newName = name.replace(/^_+/, '');
      try {
        decl.rename(newName);
        count++;
      } catch(e) {}
    }
  });

  // Fix Parameters (including constructor properties)
  file.getDescendantsOfKind(SyntaxKind.Parameter).forEach(param => {
    const name = param.getName();
    if (name.startsWith('_') && !name.includes('__')) {
      let newName = name.replace(/^_+/, '');
      try {
        param.rename(newName);
        count++;
      } catch(e) {}
    }
  });

});

console.log('Fixed ' + count + ' names.');
project.saveSync();

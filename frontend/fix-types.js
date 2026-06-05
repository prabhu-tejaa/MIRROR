const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'tsconfig.spec.json',
});

const sourceFiles = project.getSourceFiles();

let fixedCount = 0;

sourceFiles.forEach(file => {
  if (file.getFilePath().includes('node_modules')) return;

  function fixNode(node) {
    if (!node.getTypeNode()) {
      const type = node.getType();
      let typeText = type.getText(node);
      
      // Heuristics for clean types
      if (typeText === 'any') {
        // If the type is genuinely any, skip or add any. Let's add any.
        typeText = 'any';
      } else if (typeText.includes('import(')) {
        // We could simplify import(...) by removing it, but that's complex
        // Let's just fallback to any or omit
        return;
      } else if (typeText.length > 100) {
        return;
      }

      try {
        node.setType(typeText);
        fixedCount++;
      } catch (e) {
        // ignore setType failures
      }
    }
  }

  // Variable Declarations
  file.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(fixNode);

  // Parameters
  file.getDescendantsOfKind(SyntaxKind.Parameter).forEach(fixNode);

  // Property Declarations
  file.getDescendantsOfKind(SyntaxKind.PropertyDeclaration).forEach(fixNode);
});

console.log(`Saving changes... Fixed ${fixedCount} type definitions.`);
project.saveSync();
console.log('Done.');

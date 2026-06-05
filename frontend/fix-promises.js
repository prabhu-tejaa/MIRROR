const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' });

let count = 0;
project.getSourceFiles().forEach(file => {
  if (file.getFilePath().includes('node_modules')) return;

  const stmts = file.getDescendantsOfKind(SyntaxKind.ExpressionStatement);
  for (let i = stmts.length - 1; i >= 0; i--) {
    const stmt = stmts[i];
    try {
      const expr = stmt.getExpression();
      
      // Ignore already awaited or voided expressions
      if (expr.getKind() === SyntaxKind.AwaitExpression || expr.getKind() === SyntaxKind.VoidExpression) {
        continue;
      }
      
      const type = expr.getType();
      const typeText = type.getText();
      
      // Check if it's a Promise
      if (typeText && (typeText.startsWith('Promise<') || typeText === 'Promise')) {
        // Find enclosing function
        const func = stmt.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) || 
                     stmt.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
                     stmt.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
                     
        if (func && func.isAsync()) {
          expr.replaceWithText(`await ${expr.getText()}`);
        } else {
          expr.replaceWithText(`void ${expr.getText()}`);
        }
        count++;
      }
    } catch (e) {
      // Ignore types that can't be resolved
    }
  }
});

console.log('Fixed ' + count + ' floating promises.');
project.saveSync();

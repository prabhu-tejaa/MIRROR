const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Naming conventions
  content = content.replace(/ChatActions/g, 'chatActions');
  content = content.replace(/ChatSelectors/g, 'chatSelectors');
  
  // Store and Actions any
  content = content.replace(/Store<any>/g, 'Store');
  content = content.replace(/Actions<any>/g, 'Actions');

  // Specific to chat.effects.ts
  if (filePath.includes('chat.effects.ts')) {
    content = content.replace(/import \{ Actions, createEffect, ofType \} from '@ngrx\/effects';/g, "import { Actions, createEffect, ofType, CreateEffectMetadata } from '@ngrx/effects';");
    
    // Add return types for effects
    content = content.replace(/public (\w+\$) = createEffect/g, "public $1: Observable<Action> & CreateEffectMetadata = createEffect");
    
    // Fix anys in chat.effects.ts
    content = content.replace(/catchError\(\(err: any\) =>/g, "catchError((err: any) =>"); // Wait, keeping 'any' for err might trigger typedef. Let's change to 'any' with eslint disable or 'unknown' or 'Error'
    content = content.replace(/switchMap\(\(\[_, email\]: \[any, any\]\)/g, "switchMap(([_, email]: [Action, string | null])");
    content = content.replace(/const targetEmail: any =/g, "const targetEmail: string =");
    content = content.replace(/const \{ emotion, primary, secondary \}: any =/g, "const { emotion, primary, secondary } =");
    content = content.replace(/concatMap\(\(\[\{ text \}, email\]: \[\{ text: any; \}, any\]\)/g, "concatMap(([{ text }, email]: [{ text: string; }, string | null])");
    content = content.replace(/const detailedMsg: any =/g, "const detailedMsg: string =");
    content = content.replace(/mergeMap\(\(\[\{ typingId, errorMsg \}, messages\]: \[\{ typingId: any; errorMsg: any; \}, any\]\)/g, "mergeMap(([{ typingId, errorMsg }, messages]: [{ typingId: string; errorMsg: string; }, Message[]])");
    content = content.replace(/const filteredMessages: any =/g, "const filteredMessages: Message[] =");
    content = content.replace(/\(m: any\)/g, "(m: Message)");
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

fixFile('src/app/domains/chat/data-access/store/chat.effects.ts');
fixFile('src/app/domains/chat/data-access/store/chat.reducer.ts');
fixFile('src/app/domains/chat/feature/chat.page.ts');

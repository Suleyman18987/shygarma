const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/app', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check if it's a client component
    if (content.includes("'use client'") || content.includes('"use client"')) {
      // Replace const supabase = createClient()
      if (content.includes('const supabase = createClient()')) {
        content = content.replace(/const supabase = createClient\(\)/g, 'const [supabase] = useState(() => createClient())');
        changed = true;

        // Ensure useState is imported
        if (!content.includes('useState') || !content.match(/import.*useState.*from ['"]react['"]/)) {
          // Find the first import and add it before it, or add it at the top after "use client"
          content = content.replace(/(['"]use client['"][;]?\n)/, "$1import { useState } from 'react'\n");
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed', filePath);
    }
  }
});

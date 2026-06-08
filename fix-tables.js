const fs = require('fs');
const path = require('path');
const glob = require('fs').promises;

async function walk(dir, fileList = []) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const stat = await fs.promises.stat(path.join(dir, file));
    if (stat.isDirectory()) {
      if (!['.agents', '.claude', 'graphify-out', 'scratch', 'node_modules', '.next'].includes(file)) {
        await walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

async function fixTables() {
  const docsFiles = await walk('docs');
  const rootFiles = (await fs.promises.readdir('.')).filter(f => f.endsWith('.md'));
  const allFiles = [...docsFiles, ...rootFiles];

  for (const file of allFiles) {
    let content = await fs.promises.readFile(file, 'utf8');
    let newContent = content.replace(/\|(\s*):?-+:?(\s*)\|/g, (match) => {
      return match.replace(/:/g, '');
    });
    
    // specifically target table separators
    const lines = newContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\|[\s\-:|]+\|$/)) {
        lines[i] = lines[i].replace(/:-+/g, '---').replace(/-+:/g, '---').replace(/-+/g, '---');
        // ensure compact style: | --- | --- |
        lines[i] = lines[i].replace(/\|\s*---\s*/g, '| --- ').trim();
        if (lines[i].endsWith('--- |')) {
           // already fine
        } else if (lines[i].endsWith('---')) {
           lines[i] += ' |';
        }
      }
    }
    
    await fs.promises.writeFile(file, lines.join('\n'), 'utf8');
  }
  console.log('Done fixing tables.');
}

fixTables().catch(console.error);

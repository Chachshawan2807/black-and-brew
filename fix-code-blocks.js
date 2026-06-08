const fs = require('fs');
const path = require('path');

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

async function fix() {
  const docsFiles = await walk('docs');
  const rootFiles = (await fs.promises.readdir('.')).filter(f => f.endsWith('.md'));
  const allFiles = [...docsFiles, ...rootFiles];

  for (const file of allFiles) {
    let content = await fs.promises.readFile(file, 'utf8');
    let lines = content.split('\n');
    let newLines = [];
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
            newLines.push('');
          }
          newLines.push(lines[i]);
          inCodeBlock = true;
        } else {
          // Ending a code block
          newLines.push(lines[i]);
          if (i < lines.length - 1 && lines[i+1].trim() !== '') {
            newLines.push('');
          }
          inCodeBlock = false;
        }
      } else {
        newLines.push(lines[i]);
      }
    }
    
    await fs.promises.writeFile(file, newLines.join('\n'), 'utf8');
  }
  console.log('Done fixing code blocks.');
}

fix().catch(console.error);

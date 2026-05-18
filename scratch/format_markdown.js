const fs = require('fs');
const path = require('path');

function getMdFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', '.git', '.antigravity', '.aider.tags.cache.v3', 'archived-modules'].includes(file)) {
        continue;
      }
      getMdFiles(filePath, filesList);
    } else if (file.endsWith('.md')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

function formatMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    // 1. Remove trailing whitespaces
    let line = lines[i].trimEnd();

    // 2. Ensure heading spaces: e.g. "##Heading" -> "## Heading"
    const headingMatch = line.match(/^(#{1,6})([^#\s].*)$/);
    if (headingMatch) {
      line = `${headingMatch[1]} ${headingMatch[2]}`;
    }

    // 3. Ensure a blank line before headings (if not first line and previous line is not already blank)
    if (/^#{1,6}\s/.test(line) && i > 0 && formattedLines.length > 0) {
      const prevLine = formattedLines[formattedLines.length - 1];
      if (prevLine.trim() !== '') {
        formattedLines.push('');
      }
    }

    formattedLines.push(line);
  }

  // Trim trailing empty lines at the end of the file
  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
    formattedLines.pop();
  }
  // Ensure a single trailing newline
  formattedLines.push('');

  const newContent = formattedLines.join('\n');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`[Formatted] ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

const mdFiles = getMdFiles(process.cwd());
console.log(`Found ${mdFiles.length} markdown files.`);
let formattedCount = 0;
for (const file of mdFiles) {
  if (formatMarkdown(file)) {
    formattedCount++;
  }
}
console.log(`Formatted ${formattedCount} markdown files successfully.`);

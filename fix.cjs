const fs = require('fs');
const path = require('path');

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) walk(file);
    else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(file, 'utf8');
      let orig = content;
      // Replace known ANSI-mangled UTF-8 bytes
      content = content.replace(/â€œ/g, '"')
                       .replace(/â€\x9D/g, '"')
                       .replace(/â€/g, '"')
                       .replace(/âœ•/g, '&times;')
                       .replace(/ðŸ’³/g, '💳')
                       .replace(/â†’/g, '→')
                       .replace(/â€™/g, '\'')
                       .replace(/â€“/g, '-');
      if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
      }
    }
  });
}
walk('src');

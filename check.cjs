const fs = require('fs');
const path = require('path');

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) walk(file);
    else if (file.endsWith('.jsx')) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        const match = l.match(/â|€|œ|ð|Ÿ|’|³|•|†|’|–/);
        if (match) {
          console.log(file, 'line', i+1, ':', l.trim());
        }
      });
    }
  });
}
walk('src');

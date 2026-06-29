const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk(path.join(__dirname, 'frontend/src'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (content.includes('http://${window.location.hostname}:5001/api')) {
    content = content.replace(/`http\:\/\/\$\{window\.location\.hostname\}\:5001\/api/g, '`${import.meta.env.VITE_API_URL}');
    changed = true;
    console.log('Updated API URL in ' + file);
  }
  if (content.includes('http://${window.location.hostname}:5001')) {
    content = content.replace(/`http\:\/\/\$\{window\.location\.hostname\}\:5001`/g, 'import.meta.env.VITE_API_URL.replace("/api", "")');
    changed = true;
    console.log('Updated SOCKET URL in ' + file);
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

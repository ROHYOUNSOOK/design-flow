const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

function read(filename) {
  const filePath = path.join(dataDir, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function write(filename, data) {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { read, write };

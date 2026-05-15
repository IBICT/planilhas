const fs = require('fs');
const path = require('path');

const mediaDir = path.join(__dirname, '..', 'media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const copies = [
  ['x-data-spreadsheet/dist/xspreadsheet.js',      'x-spreadsheet.js'],
  ['x-data-spreadsheet/dist/xspreadsheet.css',     'x-spreadsheet.css'],
  ['xlsx/dist/xlsx.full.min.js',                   'xlsx.full.min.js'],
];

copies.forEach(([src, dest]) => {
  const from = path.join(__dirname, '..', 'node_modules', src);
  const to   = path.join(mediaDir, dest);
  fs.copyFileSync(from, to);
  console.log(`Copied ${dest}`);
});

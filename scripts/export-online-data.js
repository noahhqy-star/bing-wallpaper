const fs = require('fs');
const path = require('path');

const SOURCE_URL = process.env.SOURCE_URL || 'https://hulanlan.com/api/list?date=0&count=10000';
const OUTPUT_FILE = path.join(__dirname, '..', 'db', 'd1-seed.sql');

function sqlString(value) {
  if (value === null || value === undefined) return "''";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function imageRowSql(img) {
  const values = [
    Number(img.date),
    sqlString(img.url),
    sqlString(img.urlbase),
    sqlString(img.copyright || img.cp),
    sqlString(img.copyright_link || img.cpl),
    sqlString(img.title),
    sqlString(img.imgdetail),
    sqlString(img.created_at),
    sqlString(img.updated_at),
  ];

  return `INSERT INTO images (date, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at) VALUES (${values.join(', ')});`;
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
  }

  const payload = await response.json();
  const images = payload.data || [];
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No image data returned from source API');
  }

  const lines = [
    'DROP TABLE IF EXISTS images;',
    'CREATE TABLE images (',
    '  date INTEGER PRIMARY KEY,',
    "  url TEXT NOT NULL,",
    "  urlbase TEXT NOT NULL,",
    "  copyright TEXT DEFAULT '',",
    "  copyright_link TEXT DEFAULT '',",
    "  title TEXT DEFAULT '',",
    "  imgdetail TEXT DEFAULT '',",
    "  created_at TEXT DEFAULT '',",
    "  updated_at TEXT DEFAULT ''",
    ');',
    'CREATE INDEX IF NOT EXISTS idx_images_date ON images(date);',
    ...images.slice().reverse().map(imageRowSql),
    '',
  ];

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));

  const dates = images.map((img) => Number(img.date)).filter(Boolean);
  console.log(`Exported ${images.length} records to ${OUTPUT_FILE}`);
  console.log(`Date range: ${Math.min(...dates)} - ${Math.max(...dates)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'db', 'bing.db');

let db = null;

/**
 * 获取数据库连接（单例）
 */
function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema();
    }
    return db;
}

/**
 * 初始化数据库表结构
 */
function initSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      date        INTEGER PRIMARY KEY,
      url         TEXT NOT NULL,
      urlbase     TEXT NOT NULL,
      copyright   TEXT DEFAULT '',
      copyright_link TEXT DEFAULT '',
      title       TEXT DEFAULT '',
      imgdetail   TEXT DEFAULT '',
      created_at  TEXT DEFAULT '',
      updated_at  TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_images_date ON images(date);
  `);
}

/**
 * 关闭数据库连接
 */
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = { getDb, closeDb, DB_PATH };

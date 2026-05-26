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
    const exists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'images'"
    ).get();

    if (exists) {
        const columns = db.prepare('PRAGMA table_info(images)').all();
        const hasLocale = columns.some((column) => column.name === 'locale');
        const primaryKeys = columns
            .filter((column) => column.pk > 0)
            .sort((a, b) => a.pk - b.pk)
            .map((column) => column.name);

        if (!hasLocale || primaryKeys.join(',') !== 'date,locale') {
            const localeSelect = hasLocale
                ? "CASE WHEN locale IS NULL OR locale = '' THEN 'zh-CN' ELSE locale END"
                : "'zh-CN'";
            db.exec(`
        CREATE TABLE images_next (
          date        INTEGER NOT NULL,
          locale      TEXT NOT NULL DEFAULT 'zh-CN',
          url         TEXT NOT NULL,
          urlbase     TEXT NOT NULL,
          copyright   TEXT DEFAULT '',
          copyright_link TEXT DEFAULT '',
          title       TEXT DEFAULT '',
          imgdetail   TEXT DEFAULT '',
          created_at  TEXT DEFAULT '',
          updated_at  TEXT DEFAULT '',
          PRIMARY KEY (date, locale)
        );

        INSERT OR REPLACE INTO images_next (
          date, locale, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at
        )
        SELECT
          date,
          ${localeSelect},
          url,
          urlbase,
          copyright,
          copyright_link,
          title,
          imgdetail,
          created_at,
          updated_at
        FROM images;

        DROP TABLE images;
        ALTER TABLE images_next RENAME TO images;
      `);
        }
    }

    db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      date        INTEGER NOT NULL,
      locale      TEXT NOT NULL DEFAULT 'zh-CN',
      url         TEXT NOT NULL,
      urlbase     TEXT NOT NULL,
      copyright   TEXT DEFAULT '',
      copyright_link TEXT DEFAULT '',
      title       TEXT DEFAULT '',
      imgdetail   TEXT DEFAULT '',
      created_at  TEXT DEFAULT '',
      updated_at  TEXT DEFAULT '',
      PRIMARY KEY (date, locale)
    );

    CREATE INDEX IF NOT EXISTS idx_images_locale_date ON images(locale, date);
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

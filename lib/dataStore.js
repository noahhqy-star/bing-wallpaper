const { getDb } = require('../db');

/**
 * 数据访问层 - 基于 SQLite
 * 替代原来的 global.imgArr 全局变量
 */

/**
 * 获取图片列表，按日期倒序，支持分页
 * @param {Object} options
 * @param {number} options.beforeDate - 取此日期之前的数据（不含），0 表示从最新开始
 * @param {number} options.count - 返回条数
 * @returns {Array} 图片列表（从新到旧）
 */
function getImageList({ beforeDate = 0, count = 10 } = {}) {
    const db = getDb();
    if (beforeDate && beforeDate > 0) {
        return db.prepare(
            'SELECT * FROM images WHERE date < ? ORDER BY date DESC LIMIT ?'
        ).all(beforeDate, count);
    }
    return db.prepare(
        'SELECT * FROM images ORDER BY date DESC LIMIT ?'
    ).all(count);
}

/**
 * 按日期获取单张图片
 * @param {number} date - 日期 YYYYMMDD
 * @returns {Object|null}
 */
function getImageByDate(date) {
    const db = getDb();
    return db.prepare('SELECT * FROM images WHERE date = ?').get(Number(date)) || null;
}

/**
 * 获取某张图片的上一张和下一张的日期
 * @param {number} date
 * @returns {{ prev: number|null, next: number|null }}
 */
function getAdjacentDates(date) {
    const db = getDb();
    const dateNum = Number(date);
    const prev = db.prepare('SELECT date FROM images WHERE date < ? ORDER BY date DESC LIMIT 1').get(dateNum);
    const next = db.prepare('SELECT date FROM images WHERE date > ? ORDER BY date ASC LIMIT 1').get(dateNum);
    return {
        prev: prev ? prev.date : null,
        next: next ? next.date : null,
    };
}

/**
 * 获取随机一张图片
 * @returns {Object|null}
 */
function getRandomImage() {
    const db = getDb();
    return db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1').get() || null;
}

/**
 * 新增或更新一张图片
 * @param {Object} img - 图片数据
 */
function upsertImage(img) {
    const db = getDb();
    db.prepare(`
    INSERT INTO images (date, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (@date, @url, @urlbase, @copyright, @copyright_link, @title, @imgdetail, @created_at, @updated_at)
    ON CONFLICT(date) DO UPDATE SET
      url = @url,
      urlbase = @urlbase,
      copyright = @copyright,
      copyright_link = @copyright_link,
      title = @title,
      imgdetail = CASE WHEN @imgdetail != '' THEN @imgdetail ELSE images.imgdetail END,
      updated_at = @updated_at
  `).run({
        date: Number(img.date),
        url: img.url || '',
        urlbase: img.urlbase || '',
        copyright: img.copyright || img.cp || '',
        copyright_link: img.copyright_link || img.cpl || '',
        title: img.title || '',
        imgdetail: img.imgdetail || '',
        created_at: img.created_at || img.createdAt || '',
        updated_at: img.updated_at || img.updatedAt || '',
    });
}

/**
 * 批量插入图片（用于迁移）
 * @param {Array} images
 */
function bulkInsert(images) {
    const db = getDb();
    const insert = db.prepare(`
    INSERT OR REPLACE INTO images (date, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (@date, @url, @urlbase, @copyright, @copyright_link, @title, @imgdetail, @created_at, @updated_at)
  `);

    const insertMany = db.transaction((imgs) => {
        for (const img of imgs) {
            insert.run({
                date: Number(img.date),
                url: img.url || '',
                urlbase: img.urlbase || '',
                copyright: img.cp || img.copyright || '',
                copyright_link: img.cpl || img.copyright_link || '',
                title: img.title || '',
                imgdetail: img.imgdetail || '',
                created_at: img.createdAt || img.created_at || '',
                updated_at: img.updatedAt || img.updated_at || '',
            });
        }
    });

    insertMany(images);
}

/**
 * 获取图片总数
 * @returns {number}
 */
function getImageCount() {
    const db = getDb();
    return db.prepare('SELECT COUNT(*) as count FROM images').get().count;
}

/**
 * 获取最新图片的日期
 * @returns {number|null}
 */
function getLatestDate() {
    const db = getDb();
    const row = db.prepare('SELECT date FROM images ORDER BY date DESC LIMIT 1').get();
    return row ? row.date : null;
}

module.exports = {
    getImageList,
    getImageByDate,
    getAdjacentDates,
    getRandomImage,
    upsertImage,
    bulkInsert,
    getImageCount,
    getLatestDate,
};

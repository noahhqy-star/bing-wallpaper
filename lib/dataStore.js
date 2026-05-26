/**
 * 数据访问层
 * - 本地开发：读取 db/bing.db
 * - Cloudflare：读取绑定名为 DB 的 D1 数据库
 */

const { DEFAULT_LOCALE, normalizeLocale } = require('./locale');

let d1ForTests = null;

function _setD1ForTests(db) {
    d1ForTests = db;
}

function _clearD1ForTests() {
    d1ForTests = null;
}

async function getD1() {
    if (d1ForTests) return d1ForTests;

    try {
        const { getCloudflareContext } = await import('@opennextjs/cloudflare');
        const context = await getCloudflareContext({ async: true });
        return context && context.env ? context.env.DB : null;
    } catch (_err) {
        return null;
    }
}

function getLocalDb() {
    // Keep this require out of the module top level so Cloudflare builds do not
    // bundle the native better-sqlite3 dependency into the Worker.
    const modulePath = '../db';
    return require(modulePath).getDb();
}

async function getImageList({ beforeDate = 0, count = 10, locale = DEFAULT_LOCALE } = {}) {
    const normalizedLocale = normalizeLocale(locale);
    const d1 = await getD1();
    if (d1) {
        if (beforeDate && beforeDate > 0) {
            const { results } = await d1.prepare(
                'SELECT * FROM images WHERE locale = ? AND date < ? ORDER BY date DESC LIMIT ?'
            ).bind(normalizedLocale, beforeDate, count).all();
            return results || [];
        }

        const { results } = await d1.prepare(
            'SELECT * FROM images WHERE locale = ? ORDER BY date DESC LIMIT ?'
        ).bind(normalizedLocale, count).all();
        return results || [];
    }

    const db = getLocalDb();
    if (beforeDate && beforeDate > 0) {
        return db.prepare(
            'SELECT * FROM images WHERE locale = ? AND date < ? ORDER BY date DESC LIMIT ?'
        ).all(normalizedLocale, beforeDate, count);
    }
    return db.prepare(
        'SELECT * FROM images WHERE locale = ? ORDER BY date DESC LIMIT ?'
    ).all(normalizedLocale, count);
}

async function getImageByDate(date, locale = DEFAULT_LOCALE) {
    const normalizedLocale = normalizeLocale(locale);
    const d1 = await getD1();
    if (d1) {
        return await d1.prepare('SELECT * FROM images WHERE date = ? AND locale = ?')
            .bind(Number(date), normalizedLocale)
            .first() || null;
    }

    const db = getLocalDb();
    return db.prepare('SELECT * FROM images WHERE date = ? AND locale = ?')
        .get(Number(date), normalizedLocale) || null;
}

async function getAdjacentDates(date, locale = DEFAULT_LOCALE) {
    const d1 = await getD1();
    const dateNum = Number(date);
    const normalizedLocale = normalizeLocale(locale);
    if (d1) {
        const prev = await d1.prepare(
            'SELECT date FROM images WHERE locale = ? AND date < ? ORDER BY date DESC LIMIT 1'
        ).bind(normalizedLocale, dateNum).first();
        const next = await d1.prepare(
            'SELECT date FROM images WHERE locale = ? AND date > ? ORDER BY date ASC LIMIT 1'
        ).bind(normalizedLocale, dateNum).first();
        return {
            prev: prev ? prev.date : null,
            next: next ? next.date : null,
        };
    }

    const db = getLocalDb();
    const prev = db.prepare(
        'SELECT date FROM images WHERE locale = ? AND date < ? ORDER BY date DESC LIMIT 1'
    ).get(normalizedLocale, dateNum);
    const next = db.prepare(
        'SELECT date FROM images WHERE locale = ? AND date > ? ORDER BY date ASC LIMIT 1'
    ).get(normalizedLocale, dateNum);
    return {
        prev: prev ? prev.date : null,
        next: next ? next.date : null,
    };
}

async function getRandomImage(locale = DEFAULT_LOCALE) {
    const normalizedLocale = normalizeLocale(locale);
    const d1 = await getD1();
    if (d1) {
        return await d1.prepare('SELECT * FROM images WHERE locale = ? ORDER BY RANDOM() LIMIT 1')
            .bind(normalizedLocale)
            .first() || null;
    }

    const db = getLocalDb();
    return db.prepare('SELECT * FROM images WHERE locale = ? ORDER BY RANDOM() LIMIT 1')
        .get(normalizedLocale) || null;
}

async function upsertImage(img) {
    const params = {
        date: Number(img.date),
        locale: normalizeLocale(img.locale),
        url: img.url || '',
        urlbase: img.urlbase || '',
        copyright: img.copyright || img.cp || '',
        copyright_link: img.copyright_link || img.cpl || '',
        title: img.title || '',
        imgdetail: img.imgdetail || '',
        created_at: img.created_at || img.createdAt || '',
        updated_at: img.updated_at || img.updatedAt || '',
    };

    const d1 = await getD1();
    if (d1) {
        await d1.prepare(`
    INSERT INTO images (date, locale, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date, locale) DO UPDATE SET
      url = excluded.url,
      urlbase = excluded.urlbase,
      copyright = excluded.copyright,
      copyright_link = excluded.copyright_link,
      title = excluded.title,
      imgdetail = CASE WHEN excluded.imgdetail != '' THEN excluded.imgdetail ELSE images.imgdetail END,
      updated_at = excluded.updated_at
  `).bind(
            params.date,
            params.locale,
            params.url,
            params.urlbase,
            params.copyright,
            params.copyright_link,
            params.title,
            params.imgdetail,
            params.created_at,
            params.updated_at
        ).run();
        return;
    }

    const db = getLocalDb();
    db.prepare(`
    INSERT INTO images (date, locale, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (@date, @locale, @url, @urlbase, @copyright, @copyright_link, @title, @imgdetail, @created_at, @updated_at)
    ON CONFLICT(date, locale) DO UPDATE SET
      url = @url,
      urlbase = @urlbase,
      copyright = @copyright,
      copyright_link = @copyright_link,
      title = @title,
      imgdetail = CASE WHEN @imgdetail != '' THEN @imgdetail ELSE images.imgdetail END,
      updated_at = @updated_at
  `).run(params);
}

async function bulkInsert(images) {
    const d1 = await getD1();
    if (d1) {
        const statements = images.map((img) => d1.prepare(`
    INSERT OR REPLACE INTO images (date, locale, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
            Number(img.date),
            normalizeLocale(img.locale),
            img.url || '',
            img.urlbase || '',
            img.cp || img.copyright || '',
            img.cpl || img.copyright_link || '',
            img.title || '',
            img.imgdetail || '',
            img.createdAt || img.created_at || '',
            img.updatedAt || img.updated_at || ''
        ));
        await d1.batch(statements);
        return;
    }

    const db = getLocalDb();
    const insert = db.prepare(`
    INSERT OR REPLACE INTO images (date, locale, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (@date, @locale, @url, @urlbase, @copyright, @copyright_link, @title, @imgdetail, @created_at, @updated_at)
  `);

    const insertMany = db.transaction((imgs) => {
        for (const img of imgs) {
            insert.run({
                date: Number(img.date),
                locale: normalizeLocale(img.locale),
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

async function getImageCount(locale = null) {
    const normalizedLocale = locale ? normalizeLocale(locale) : null;
    const d1 = await getD1();
    if (d1) {
        if (normalizedLocale) {
            const row = await d1.prepare('SELECT COUNT(*) as count FROM images WHERE locale = ?')
                .bind(normalizedLocale)
                .first();
            return row.count;
        }
        const row = await d1.prepare('SELECT COUNT(*) as count FROM images').first();
        return row.count;
    }

    const db = getLocalDb();
    if (normalizedLocale) {
        return db.prepare('SELECT COUNT(*) as count FROM images WHERE locale = ?')
            .get(normalizedLocale).count;
    }
    return db.prepare('SELECT COUNT(*) as count FROM images').get().count;
}

async function getLatestDate(locale = DEFAULT_LOCALE) {
    const normalizedLocale = normalizeLocale(locale);
    const d1 = await getD1();
    if (d1) {
        const row = await d1.prepare('SELECT date FROM images WHERE locale = ? ORDER BY date DESC LIMIT 1')
            .bind(normalizedLocale)
            .first();
        return row ? row.date : null;
    }

    const db = getLocalDb();
    const row = db.prepare('SELECT date FROM images WHERE locale = ? ORDER BY date DESC LIMIT 1')
        .get(normalizedLocale);
    return row ? row.date : null;
}

module.exports = {
    _clearD1ForTests,
    _setD1ForTests,
    getImageList,
    getImageByDate,
    getAdjacentDates,
    getRandomImage,
    upsertImage,
    bulkInsert,
    getImageCount,
    getLatestDate,
};

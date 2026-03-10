const axios = require('axios');
const dayjs = require('dayjs');
const { upsertImage, getImageByDate } = require('./dataStore');

const BING_API_URL = 'http://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&nc=1553500237029&pid=hp';
const STORY_API_URL = 'https://bing.ee123.net/img/';

// 重试间隔（毫秒）
const RETRY_INTERVAL = 60 * 1000; // 1 分钟

/**
 * 获取指定日期的图片故事
 * @param {string|number} date - YYYYMMDD 格式日期
 * @returns {string} imgdetail HTML 或空字符串
 */
async function fetchStory(date) {
    try {
        const { data } = await axios.get(`${STORY_API_URL}?date=${date}&size=1920x1080&imgtype=jpg&type=json`, {
            timeout: 10000,
        });
        if (data && data.imgdetail) {
            return data.imgdetail;
        }
    } catch (err) {
        console.warn(`[故事] 获取 ${date} 故事失败: ${err.message}`);
    }
    return '';
}

/**
 * 从必应 API 获取最新壁纸数据并写入数据库
 */
async function crawl() {
    let success = false;

    try {
        const { data } = await axios(BING_API_URL, { timeout: 15000 });
        const now = dayjs();
        const nowStr = now.format('YYYY-MM-DD HH:mm:ss');

        if (!data || !data.images || !Array.isArray(data.images)) {
            throw new Error('API 返回数据格式异常');
        }

        for (const img of data.images) {
            upsertImage({
                date: Number(img.enddate),
                url: img.url,
                urlbase: img.urlbase,
                copyright: img.copyright,
                copyright_link: img.copyrightlink,
                title: img.title || '',
                imgdetail: '',
                created_at: nowStr,
                updated_at: nowStr,
            });
        }

        console.log(`[${nowStr}] 数据更新成功，共 ${data.images.length} 张图片`);

        // 异步获取缺少故事的图片（不阻塞主流程）
        fetchMissingStories().catch(err => {
            console.error('[故事] 批量获取故事失败:', err.message);
        });

        success = true;
    } catch (err) {
        console.error(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 数据更新失败: ${err.message}`);
    }

    // 下次执行时间：成功 → 等到明天 00:15，失败 → 1 分钟后重试
    scheduleNext(success);
}

/**
 * 批量获取缺少故事的图片（最近 10 天）
 */
async function fetchMissingStories() {
    const { getDb } = require('../db');
    const db = getDb();

    // 查找最近没有 imgdetail 的图片
    const rows = db.prepare(
        "SELECT date FROM images WHERE (imgdetail IS NULL OR imgdetail = '') ORDER BY date DESC LIMIT 10"
    ).all();

    if (rows.length === 0) return;

    console.log(`[故事] 发现 ${rows.length} 张图片缺少故事，开始获取...`);

    for (const row of rows) {
        const story = await fetchStory(row.date);
        if (story) {
            db.prepare('UPDATE images SET imgdetail = ?, updated_at = ? WHERE date = ?')
                .run(story, dayjs().format('YYYY-MM-DD HH:mm:ss'), row.date);
            console.log(`[故事] ${row.date} 故事获取成功`);
        } else {
            console.log(`[故事] ${row.date} 暂无故事数据`);
        }
        // 间隔 1 秒避免请求过快
        await new Promise(r => setTimeout(r, 1000));
    }
}

/**
 * 调度下次爬取
 * @param {boolean} success - 本次是否成功
 */
function scheduleNext(success) {
    let delay;

    if (success) {
        // 成功：等到明天 00:15（留余量确保 Bing API 和故事 API 数据已更新）
        const now = dayjs();
        const nextRun = now.add(1, 'day').startOf('day').add(15, 'minute');
        delay = nextRun.diff(now);
        console.log(`[调度] 下次更新: ${nextRun.format('YYYY-MM-DD HH:mm:ss')}（${Math.round(delay / 60000)} 分钟后）`);
    } else {
        // 失败：1 分钟后重试
        delay = RETRY_INTERVAL;
        console.log(`[调度] 更新失败，${delay / 1000} 秒后重试`);
    }

    setTimeout(() => crawl(), delay);
}

module.exports = crawl;

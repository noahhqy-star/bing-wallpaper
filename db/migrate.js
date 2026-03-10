/**
 * 数据迁移脚本：从 allData.json 导入到 SQLite
 *
 * 用法：node db/migrate.js
 */

const path = require('path');
const { getDb, closeDb } = require('./index');
const { bulkInsert, getImageCount } = require('../lib/dataStore');

const DATA_FILE = path.join(__dirname, '..', 'bing_data', 'allData.json');

async function migrate() {
    console.log('========================================');
    console.log('必应壁纸数据迁移: JSON → SQLite');
    console.log('========================================\n');

    // 读取 JSON 数据
    let jsonData;
    try {
        jsonData = require(DATA_FILE);
    } catch (err) {
        console.error(`❌ 无法读取 ${DATA_FILE}`);
        console.error(err.message);
        process.exit(1);
    }

    const images = jsonData.imgs;
    if (!Array.isArray(images) || images.length === 0) {
        console.error('❌ allData.json 中没有找到 imgs 数组');
        process.exit(1);
    }

    console.log(`📦 源数据: ${images.length} 条记录`);

    // 初始化数据库
    getDb();

    // 批量插入
    console.log('⏳ 正在导入数据...');
    bulkInsert(images);

    // 验证
    const count = getImageCount();
    console.log(`\n✅ 迁移完成！SQLite 中共 ${count} 条记录`);

    if (count === images.length) {
        console.log('✅ 记录数一致，迁移成功！');
    } else {
        console.warn(`⚠️ 记录数不一致：JSON ${images.length} 条，SQLite ${count} 条`);
        console.warn('   可能存在重复日期的数据被合并');
    }

    // 随机抽查 5 条
    const db = getDb();
    console.log('\n📋 随机抽查 5 条记录:');
    const samples = db.prepare('SELECT date, title, copyright FROM images ORDER BY RANDOM() LIMIT 5').all();
    samples.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.date} | ${s.title || '(无标题)'} | ${s.copyright.substring(0, 40)}...`);
    });

    closeDb();
    console.log('\n🎉 迁移脚本执行结束');
}

migrate().catch(err => {
    console.error('迁移失败:', err);
    process.exit(1);
});

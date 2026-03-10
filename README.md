# 🌄 Bing Wallpaper

每日自动抓取必应 (Bing) 首页壁纸，提供高清图片浏览、下载和图片故事阅读。

> 在线预览：[hulanlan.com](https://hulanlan.com)

## ✨ 功能特性

- 📸 **每日壁纸** — 自动抓取必应每日精选壁纸
- 🎲 **随机浏览** — 随机查看历史壁纸
- 📖 **图片故事** — 阅读每张壁纸背后的故事
- 📥 **多尺寸下载** — 支持 UHD / 1920×1080 / 手机尺寸等多种分辨率
- 🖥️ **全屏模式** — 沉浸式壁纸浏览体验
- ⌨️ **键盘导航** — 左右方向键快速切换壁纸

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + React 18 |
| UI 组件 | Ant Design 5 |
| 样式 | SCSS + Google Fonts (Inter) |
| 数据库 | SQLite (better-sqlite3) |
| 数据来源 | Bing Image API |
| 日期处理 | Day.js |

## 🚀 本地开发

```bash
# 安装依赖
npm install

# 如有历史数据需要迁移
npm run migrate

# 开发模式
npm run dev

# 访问 http://localhost:3002
```

## 📦 部署

```bash
# 构建
npm run build

# 生产模式运行
npm run start

# 使用 pm2 守护进程（推荐）
pm2 start app.js --name bing-wallpaper
```

### Nginx 反向代理配置

```nginx
location ^~ / {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_http_version 1.1;
}
```

## 📁 项目结构

```
├── app.js              # 服务入口 & HTTP 服务器
├── db/
│   ├── index.js        # SQLite 数据库初始化
│   └── migrate.js      # JSON → SQLite 数据迁移脚本
├── lib/
│   ├── crawler.js      # 壁纸数据爬虫 & 图片故事获取
│   └── dataStore.js    # 数据访问层 (CRUD)
├── pages/
│   ├── index.js        # 首页 - 壁纸瀑布流
│   ├── [date].js       # 详情页 - 壁纸大图 & 信息
│   └── api/            # API 路由
├── components/
│   ├── DownDialog.js   # 下载弹框
│   └── StoryDialog.js  # 图片故事弹框
└── styles/             # SCSS 样式文件
```

## 📄 License

MIT

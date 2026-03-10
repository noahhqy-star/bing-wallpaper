---
description: 提交代码并推送到 GitHub
---
// turbo-all

1. 查看当前改动
```bash
git status
```

2. 添加所有改动
```bash
git add .
```

3. 根据改动内容自动生成 commit message 并提交。commit message 使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，格式为 `type: description`，常用 type：
   - `feat` — 新功能
   - `fix` — 修复 Bug
   - `docs` — 文档变更
   - `style` — 样式调整
   - `refactor` — 重构
   - `chore` — 配置/依赖/清理等杂项

```bash
git commit -m "<根据 git status 的内容自动生成>"
```

4. 推送到远程仓库
```bash
git push
```

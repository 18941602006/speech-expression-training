<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目身份（言语表达训练 / speech-expression-training）

- 管理员/作者：Trollhunter；GitHub：18941602006
- 远程：`git@github.com:18941602006/speech-expression-training.git`
- 个人 AI 言语表达练习工具（出题 / 评分 / 陪练 / 历史），DeepSeek 驱动，SQLite 本地存储。
- 必读顺序：本文件 → `docs/PRODUCT_REQUIREMENTS.md` → 源码。
- 开工/收尾硬规则：不提交 `.env*` 与 `*.db`；不 force push；开发前建备份分支并 push；服务端调用 DeepSeek 与 SQLite，key 不进浏览器。
- 当前阶段：v1（全功能已落地）。

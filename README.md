# 言语表达训练（speech-expression-training）

一个个人 AI 言语表达练习工具：选场景 → AI 出题 → 你表达（打字/语音）→ AI 评分并教更好的说法 → 还能陪你对话演练 → 自动保存练习历史与进步曲线。

技术栈：Next.js 16（App Router）+ TypeScript + Tailwind v4，DeepSeek 驱动，SQLite 本地存储。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 DeepSeek API Key
cp .env.example .env.local
# 然后编辑 .env.local，填入 DEEPSEEK_API_KEY=sk-xxx（仅服务端使用）

# 3. 本地运行
npm run dev
# 打开 http://localhost:3000
```

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（必填，服务端） | 无 |
| `DEEPSEEK_MODEL` | 模型名 | `deepseek-chat` |
| `DATABASE_FILE` | 本地 SQLite 文件路径 | `file:./speech.db` |

## 常用命令

```bash
npm run dev        # 本地开发
npm run build      # 生产构建
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## 结构

```
src/
  lib/
    types.ts        # 类型与中文标签
    topics.ts       # 预设中文主题库
    db.ts           # SQLite（@libsql/client）
    llm.ts          # DeepSeek 服务端调用
  app/
    api/ai/route.ts       # 出题 / 评分 / 陪练
    api/exercises/route.ts# 练习记录存取
    page.tsx              # 训练主页（场景选择 + 练习 + 陪练）
    history/page.tsx      # 历史与进步曲线
  components/
    ProgressChart.tsx     # 进步曲线 SVG
```

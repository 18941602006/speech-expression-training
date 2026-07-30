# 产品需求文档（PRODUCT_REQUIREMENTS）

> 言语表达训练（speech-expression-training）—— 个人 AI 言语表达练习工具。
> 本文档记录与用户三 Batch 问答后锁定的需求（置信度 ≈ 90%+），作为施工依据。

## 1. 目标与定位
- 一个**个人**言语表达训练 Web 应用，帮助用户在各场景下练习表达，并由 AI 给出反馈。
- 当前仅作者（Trollhunter）本人使用，先本地运行（localhost），后续可部署线上。

## 2. 训练场景（SCENE）
覆盖综合场景，不限定单一：
- `speech` 公众演讲（上台 / 汇报 / 宣讲）
- `communication` 日常沟通（聊天 / 表达 / 化解冲突）
- `interview` 面试职场（面试 / 向上沟通 / 谈判）
- `debate` 辩论逻辑（立论 / 反驳 / 攻防）

## 3. 用户输入方式
- **打字** 与 **语音转文字** 都支持（两者都要）。
- 语音识别用**浏览器 Web Speech API**（`zh-CN`，免费，需 Chrome/Edge + 麦克风权限），前端实现，不依赖服务端 ASR。

## 4. AI 角色（大模型驱动）
大模型在练习中同时承担：
1. **出题**：根据场景生成练习题目（预设主题库 + AI 扩展）。
2. **评分**：对用户表达打分并给出改进建议、示范更好说法。
3. **陪练对话**：扮演听众/对手，与用户实时对话演练。
4. **教方法**：在反馈中直接指出更好的说话方式。

- 模型：**DeepSeek**（`deepseek-chat`），API key 仅服务端使用（`.env.local` 的 `DEEPSEEK_API_KEY`），不暴露给浏览器。

## 5. 评分维度（DIMENSIONS，每项 1–10）
- `structure` 结构与逻辑
- `wording` 用词与精准
- `filler` 填充词控制（越高=越少“嗯/啊”）
- `fit` 场景贴合
- `fluency` 流畅与节奏
- `verbose` 啰嗦词控制（特别留意“那个”、重复词等）

返回：综合分 `overall` + 各维度分 + 3–5 条建议 + 一段更好示范表达 `betterVersion`。

## 6. 题目来源
- 预设中文主题库（`src/lib/topics.ts`，每场景 3 题）作为基础。
- 支持「AI 出题」在基础上扩展/生成新题。

## 7. v1 功能范围（全功能）
- [x] 场景选择首页
- [x] 出题 + 评分建议
- [x] 语音 + 打字输入
- [x] 陪练对话
- [x] 历史记录（SQLite 持久化 + 进步曲线）

## 8. 数据存储
- **SQLite**（本地文件 `speech.db`，通过 `@libsql/client`）。
- 表 `exercises`：场景 / 题目 / 用户输入 / 转写 / 综合分 / 维度分(JSON) / 建议(JSON) / 示范 / 时间。
- 用记录保存进度，历史页展示列表与综合分进步曲线。

## 9. 身份与工程约定
- 管理员/作者：Trollhunter；GitHub：18941602006；仓库：`speech-expression-training`。
- 远程：`git@github.com:18941602006/speech-expression-training.git`。
- 技术栈：Next.js 16（App Router）+ TypeScript + Tailwind v4；服务端 Route Handler 调用 DeepSeek 与 SQLite；前端 Client Component 通过 fetch 调用。
- 安全：不提交 `.env*`、不提交 `*.db`、不 force push、开发前建备份分支。

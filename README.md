# 言语表达训练（speech-expression-training）

一个个人 AI 言语表达练习工具：选场景 → AI 出题 → 你表达（打字 / 语音）→ AI 评分并教更好的说法 → 还能陪你对话演练 → 自动保存练习历史、进步曲线与常见问题总结。

技术栈：Next.js 16（App Router）+ React 19 + TypeScript + Tailwind v4，AI 驱动（默认 DeepSeek，可网页自助切换任意 OpenAI 兼容服务商），SQLite 本地存储（可切换 Turso 云库）。

## 功能亮点

- **五大练习场景**：公众演讲、日常沟通、面试职场、辩论逻辑、自定义方向（自由设定场景内容）。
- **AI 出题 / 评分 / 陪练**：AI 生成贴近生活的题目；对你每段表达实时评分（结构、用词、填充词、场景贴合、流畅、啰嗦控制），标出可省略的废话并给出更好的说法；还能切换不同「角色变体」（如面试分 HR 面 / 技术面 / 压力面）陪你对话演练。
- **语音输入**：基于浏览器 Web Speech API，点 🎤 直接说（Chrome / Edge 体验最佳）。
- **教练系统**：根据你历史练习数据，动态调整难度、生成个性化每周训练方案。
- **常见问题总结**：自动归集你反复出现的表达问题，按日 / 周 / 月做周期性总结（Top 榜 + 趋势 + 分析），可导出 Markdown / JSON。
- **每日灵感**：首页两个每日轮换方块——「每日高情商学习」与「读书名言」。
- **AI 设置（自助接入 API）**：在网页里就能接入你自己的 AI——填 Endpoint / API Key / 模型，一键测试连接、自动拉取模型列表、加密保存；配置后全站出题 / 评分 / 陪练自动改用你的 Key。支持任意 OpenAI 兼容服务商（DeepSeek、OpenAI、硅基流动、本地 Ollama 等）。
- **数据本地化**：练习记录、方案、问题归集全部存在你本机，完全私有。

## 配置 AI（两种方式）

本工具的 AI 出题、评分、陪练、教练等功能依赖一个大模型。**每位使用者都需要自备一个 API Key**（DeepSeek、OpenAI 等任意 OpenAI 兼容服务商均可）。

推荐在网页内直接配置（无需碰环境变量）：

- 启动后进入左侧「**AI 设置**」，填写：
  - **API 地址（Endpoint）**：如 DeepSeek `https://api.deepseek.com/v1`、OpenAI `https://api.openai.com/v1`、硅基流动 `https://api.siliconflow.cn/v1`、本地 Ollama `http://localhost:11434/v1` 等。
  - **API Key**：在该服务商后台免费申请（DeepSeek 注册即送额度，个人练习完全够用）。
  - **模型名称**：点「测试连接」会自动拉取该服务商的模型列表并帮你选中第一个。
- 保存后全站出题 / 评分 / 陪练自动改用你配置的 Key；可保存多条、随时「设为当前使用」、编辑或删除。
- 你填的 Key 经 HTTPS 传到服务端后用 **AES-256-GCM 加密**存入本地数据库，页面上只显示掩码（如 `sk-****xxxx`），调用 AI 时才解密。

开发者也可继续用环境变量（见下方「环境变量」）：在 `.env.local` 填 `DEEPSEEK_API_KEY`。**网页配置优先级高于环境变量**——只要配过网页，就以网页为准；都没配则会提示先去「AI 设置」配置。

> 想做「点链接即用、不用自己申请 Key」的公网共享版，需部署者提供 Key 并承担费用——详见 [docs/MULTI_USER_PLAN.md](docs/MULTI_USER_PLAN.md)。

## 环境要求

- **Node.js** ≥ 18.18（建议使用 20 或 22 LTS）。
- **包管理器**：npm（项目用 `package-lock.json` 锁定）。
- **浏览器**：语音输入需要 Chrome / Edge 桌面端；其他现代浏览器可正常打字使用全部功能。
- **AI API Key**：AI 功能必需，需自行免费申请（DeepSeek / OpenAI 等任意 OpenAI 兼容服务商均可，见下方「配置 AI」）。

## 快速开始（本地运行）

```bash
# 1. 获取代码（克隆自己的 fork 或本仓库）
git clone https://github.com/18941602006/speech-expression-training.git
cd speech-expression-training

# 2. 安装依赖
npm install

# 3. 配置 AI（二选一）
#   方式 A（推荐普通用户）：启动后打开网页左侧「AI 设置」，填入你的 Endpoint / Key / 模型即可。
#   方式 B（开发者）：cp .env.example .env.local，编辑填入 DEEPSEEK_API_KEY=sk-xxx（仅服务端使用）
#   申请地址：https://platform.deepseek.com （注册后「API keys」页面创建，免费额度足够个人练习）

# 4. 本地运行
npm run dev
# 打开 http://localhost:3000
```

首次保存练习时会自动创建本地数据库文件 `speech.db`。

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（仅服务端使用；网页「AI 设置」配置后可不填） | 无 |
| `DEEPSEEK_MODEL` | 模型名 | `deepseek-chat` |
| `DATABASE_FILE` | 数据库连接串。本地文件默认 `file:./speech.db`；部署到云端时可改为 Turso 的 `libsql://...` 地址（详见下方「部署到公网」） | `file:./speech.db` |
| `TURSO_AUTH_TOKEN` | 仅在使用 Turso 云库时需要 | 无 |
| `API_CONFIG_SECRET` | 加密「网页 AI 设置」里保存的 API Key 所用的主密钥（**可选**）。本地未设置时使用内置默认密钥（仅本地运行足够）；公网 / 多人部署务必设一个强随机值，否则拿到库文件仍可解密 | 内置默认值 |

> `.env.local` 已被 `.gitignore` 排除，**不会进入仓库**；仓库里只包含 `.env.example` 模板。

## 给别人用：两种方式

### 方式一 · 本地各自运行（推荐，零成本、数据私有）

最适合「几个朋友各自使用」：**不需要任何改动**，每个人按上面的「快速开始」在自己电脑上 clone + 安装 + 配置自己的 AI Key（网页「AI 设置」或 `.env.local`）即可。

- 每个人的练习数据只存在自己电脑的 `speech.db` 里，互不干扰。
- 你自己不需要承担任何服务器费用或 API 费用。
- 前提：把仓库设为 **Public**（GitHub 仓库 Settings → Visibility），或在私有仓库里把对方加为 Collaborator，对方才能 clone。

### 方式二 · 部署为公网实例（多人共享一个地址）

如果你想让朋友「点链接即用、无需装环境」，可部署到 Vercel 等平台。注意：

- 数据库需改用 **Turso**（云端 libSQL）：注册 https://turso.tech 建库，把 `DATABASE_FILE` 设为 `libsql://...`、`TURSO_AUTH_TOKEN` 填上（**代码无需改动**，已支持）。
- 必须加上**登录与访问限制**，否则任何人都能白嫖你的 DeepSeek Key；并建议加请求限流。
- 多人共用一个数据库时，练习记录会混在一起，需要「每用户数据隔离」才能真正多人使用。

完整的多用户改造评估（鉴权方案对比、工作量、风险）见 **[docs/MULTI_USER_PLAN.md](docs/MULTI_USER_PLAN.md)**。

## 常用命令

```bash
npm run dev        # 本地开发（webpack）
npm run build      # 生产构建
npm run start      # 运行生产构建
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## 项目结构

```
src/
  lib/
    types.ts          # 类型与中文标签（场景 / 维度 / 问题类型）
    topics.ts         # 预设中文主题库 + 角色变体专属题
    roles.ts          # 各场景默认角色 + 角色变体库
    crypto.ts         # API Key 加密存储（AES-256-GCM）+ 掩码
    db.ts             # SQLite（@libsql/client），支持本地文件或 Turso；含 api_configs 用户配置表
    llm.ts            # AI 服务端调用（支持自定义 endpoint / key / model，回退 env 默认 DeepSeek）
    issues.ts         # 常见问题提取与聚合
    daily.ts          # 每日灵感（情商技巧 / 读书名言）本地预设
  app/
    api/ai/route.ts             # 出题 / 评分 / 陪练（自动使用网页配置或 env Key）
    api/apisettings/route.ts    # AI 配置：增删改查 + 设为当前
    api/apisettings/test/route.ts # 连接测试 + 动态模型列表
    api/exercises/route.ts      # 练习记录存取（自动归集常见问题）
    api/coach/route.ts          # 教练方案生成与历史
    api/issues/summary/route.ts # 常见问题周期总结
    api/stats/route.ts          # 侧栏进度统计
    apisettings/page.tsx        # AI 设置（表单 / 测试 / 模型下拉 / 状态 / 删除）
    page.tsx                    # 落地页（场景入口 + 每日灵感）
    scene/[scene]/page.tsx      # 各场景练习页（角色选择 + 自定义方向）
    coach/page.tsx              # 教练系统
    issues/page.tsx             # 常见问题总结
    history/page.tsx            # 练习历史与进步曲线
    layout.tsx                  # 全局布局 + 玻璃侧栏
  components/
    AppShell.tsx      # 左侧栏导航 + 进度环
    PracticeView.tsx  # 陪练双栏（对话 + 实时分析）
    DailyBlock.tsx    # 每日灵感方块
    ProgressChart.tsx # 进步曲线 SVG
```

## 隐私与分享说明

- 你的 **API Key**（无论是 `.env.local` 还是网页「AI 设置」里填的）都只存在你本机：`.env.local` 永不入库；网页填的经 AES-256-GCM 加密后存入本地 `speech.db`，页面只显示掩码，永不进 git。
- 你的**练习记录、方案、问题归集**只存在你本机的 `speech.db`，已被 `.gitignore` 排除。
- 仓库本身不含任何密钥与个人隐私数据，可安全分享。

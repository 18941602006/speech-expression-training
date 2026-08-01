# 多用户 / 数据隔离 改造评估

> 背景：用户希望让别人也能使用「言语表达训练」工具。本文评估「加登录 + 每用户数据隔离」的改动范围与工作量，并给出鉴权方案对比。
> 评估日期：2026-08-01

---

## 一、现状盘点（关键发现）

- **数据库层**（`src/lib/db.ts`）：三张表 `exercises`、`coach_plans`、`issue_records` 均**无 `user_id` 字段**。
- **读取函数**：`listExercises()`、`listCoachPlans()`、`listAllIssues()` 全部「**全量返回、不过滤用户**」。
- **写入函数**：`saveExercise`、`saveCoachPlan`、`saveIssueRecords` 均**不带任何用户标识**。
- **API 路由**（5 个）：`/api/ai`、`/api/coach`、`/api/exercises`、`/api/issues/summary`、`/api/stats` **均无鉴权**。
- **前端**：`layout.tsx`（纯服务端组件）→ 包裹客户端 `AppShell`；`PracticeView` 直接 `fetch` 上述 API，`/api/ai` 为「无状态」出题/评分。全链路**无任何登录态概念**。
- **密钥安全**：`DEEPSEEK_API_KEY` 仅服务端使用，`.env.local` 已被 gitignore，仓库不含密钥；但「**API 无鉴权**」意味着一旦公网部署，任何人都能免费调用你的 DeepSeek key。

---

## 二、最先要澄清的一点（避免做无用功）

「加登录 + 数据隔离」**只有在一种场景下才必要**：把项目部署成一个**公网共享实例**、给多个互不相识/不想共享数据的人用。

如果真实需求只是「几个朋友各自用、数据不混」，**让每人本地 clone 自己跑（方案①）即可**——零改动、数据天然隔离、且根本不用操心鉴权与费用。

→ 第一步请先确认部署形态：公网共享实例，还是本地各自跑？若为后者，本文所述功能**不需要做**。

---

## 三、若要做「公网共享 + 多用户」，必做的「数据隔离层」（与鉴权方案无关）

1. **`db.ts`**：
   - 三张表各加 `user_id` 列（建议直接加列；`issue_records` 不靠 join `exercises` 取 user，单独存更简单）。
   - 新增按用户查询：`listExercisesByUser(userId)`、`listCoachPlansByUser(userId)`、`listIssuesByUser(userId)`；`save*` 全部接收 `userId` 参数。
2. **API 改造**：
   - `exercises`（GET/POST）、`coach`（POST 生成方案时用 `listExercisesByUser`、GET 用 `listCoachPlansByUser`）、`issues/summary`（`listIssuesByUser`）、`stats`（`listExercisesByUser`）。
   - `ai` 路由本身是「无状态」出题/评分，**不读写用户数据**，但**必须加登录校验**（否则白嫖 key）。
   - 所有接口从会话取 `userId` 后传入查询。
3. **中间件**：保护所有 `/api/*` 与页面（未登录 → `/login`）。

---

## 四、鉴权方案对比（核心决策）

| 方案 | 说明 | 改动量 | 安全性 | 使用者门槛 | 推荐度 |
|---|---|---|---|---|---|
| **A 单一口令** | 部署时设 `APP_PASSWORD`，所有人输同一口令进入；数据仍共享，**非真多用户** | 最小（~3 文件：中间件+登录页+cookie 校验） | 低（口令泄露=全员可用） | 极低 | ❌ 解决不了数据隔离 |
| **B 自研账号密码** | `users` 表 + 注册/登录页 + bcrypt 哈希 + 会话(sessions) | 中（~10 文件） | 中（密码存储/会话/CSRF 易出错） | 低（邮箱+密码） | ⚠️ 可用但需谨慎 |
| **C GitHub OAuth (Auth.js)** | 用 GitHub 登录，免密码、天然多用户 | 中（~8 文件） | 高（由 GitHub 与 Auth.js 负责） | 需有 GitHub 账号 | ✅ 推荐（项目本就在 GitHub） |
| **D 其他 OAuth**（Google 等） | 同 C，换 provider | 中 | 高 | 需有对应账号 | 视用户群 |

**推荐方案 C**：项目本来就托管在 GitHub，让朋友用 GitHub 登录最自然；你不用自己存储密码、避免密码安全坑；Auth.js 统一处理会话与 CSRF。唯一前提是使用者有 GitHub 账号（对开发者朋友无门槛，对非技术朋友有门槛——此时需考虑 D 或仍走「本地各自跑」）。

---

## 五、工作量估算

- 数据隔离层：~6-8 文件（`db.ts` + 4 个 API）。
- 鉴权（方案 C）：~6-8 文件（Auth 配置、GitHub OAuth App 回调、中间件、登录页、`AppShell` 登出口）。
- 前端登录态：~2-3 文件（登录页、`auth` 客户端辅助、`AppShell` 显示用户/登出）。
- 验证：`typecheck` + 手动验证「登录 / 不同用户数据互不可见 / 登出」。

**合计约 15-22 个文件改动**，中等规模功能迭代；AI 执行约数十次工具调用，人工约 1-3 天。

---

## 六、风险与前置依赖（硬性）

1. **DeepSeek key 安全（必须）**：公网部署必须鉴权 + 建议加**限流**（每用户每日请求上限），否则被刷爆额度。
2. **数据库并发**：本地 SQLite 在 serverless 多用户下有写锁问题 → 必须切 **Turso**（云 libSQL）；代码已支持 `DATABASE_FILE` 环境变量切换，**无需改代码**。
3. **密码安全（若选 B）**：哈希/会话/CSRF 不能马虎，优先用成熟库。
4. **Next 16 + Auth.js 兼容性**：需验证 Auth.js 在 Next 16 App Router 下的运行。

---

## 七、建议下一步

1. 先确认部署形态：**公网共享实例** vs **本地各自跑**。
2. 若公网共享：选定鉴权方案（推荐 C-GitHub OAuth），再出详细实施计划。
3. 配套动作：申请 Turso 数据库、创建 GitHub OAuth App、加请求限流。

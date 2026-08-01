import { createClient, type Client } from "@libsql/client";
import { encryptSecret, decryptSecret, maskSecret } from "./crypto";
import type {
  ExerciseRecord,
  ScoreDimensions,
  Scene,
  SentenceAnalysis,
  CoachPlan,
  CoachPlanRecord,
  IssueRecordRow,
  RawIssue,
} from "./types";

let client: Client | null = null;
let initialized = false;

function getClient(): Client {
  if (!client) {
    const url = process.env.DATABASE_FILE || "file:./speech.db";
    client = createClient({ url });
  }
  return client;
}

export async function initDb(): Promise<void> {
  if (initialized) return;
  const c = getClient();
  await c.execute(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      topic_prompt TEXT NOT NULL,
      user_input TEXT NOT NULL,
      transcript TEXT,
      overall INTEGER NOT NULL,
      dimensions TEXT NOT NULL,
      suggestions TEXT NOT NULL,
      better_version TEXT NOT NULL,
      sentences TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  // 旧库可能还没有 sentences 列，幂等补列（已存在则忽略报错）
  try {
    await c.execute(
      `ALTER TABLE exercises ADD COLUMN sentences TEXT NOT NULL DEFAULT '[]'`,
    );
  } catch {
    /* 列已存在 */
  }
  await c.execute(`
    CREATE TABLE IF NOT EXISTS coach_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      goal TEXT NOT NULL,
      level TEXT NOT NULL,
      summary TEXT NOT NULL,
      plan TEXT NOT NULL
    );
  `);
  // 常见问题原始记录：每次练习自动归集用户反复出现的表达问题
  await c.execute(`
    CREATE TABLE IF NOT EXISTS issue_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      scene TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      example TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  // 用户自主接入的 AI 配置：密钥加密存储，仅返回掩码
  await c.execute(`
    CREATE TABLE IF NOT EXISTS api_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      api_key_enc TEXT NOT NULL,
      api_key_mask TEXT NOT NULL,
      model TEXT,
      models TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'untested',
      last_error TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  initialized = true;
}

export interface NewExercise {
  scene: Scene;
  topicTitle: string;
  topicPrompt: string;
  userInput: string;
  transcript?: string | null;
  overall: number;
  dimensions: ScoreDimensions;
  suggestions: string[];
  betterVersion: string;
  sentences: SentenceAnalysis[];
}

export async function saveExercise(rec: NewExercise): Promise<number> {
  await initDb();
  const c = getClient();
  const createdAt = new Date().toISOString();
  const result = await c.execute({
    sql: `INSERT INTO exercises
      (scene, topic_title, topic_prompt, user_input, transcript, overall, dimensions, suggestions, better_version, sentences, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      rec.scene,
      rec.topicTitle,
      rec.topicPrompt,
      rec.userInput,
      rec.transcript ?? null,
      rec.overall,
      JSON.stringify(rec.dimensions),
      JSON.stringify(rec.suggestions),
      rec.betterVersion,
      JSON.stringify(rec.sentences),
      createdAt,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function listExercises(): Promise<ExerciseRecord[]> {
  await initDb();
  const c = getClient();
  const rows = await c.execute(
    `SELECT * FROM exercises ORDER BY created_at DESC LIMIT 200`,
  );
  return rows.rows.map((r) => mapRow(r as Record<string, unknown>));
}

function mapRow(r: Record<string, unknown>): ExerciseRecord {
  return {
    id: Number(r.id),
    scene: r.scene as Scene,
    topicTitle: String(r.topic_title),
    topicPrompt: String(r.topic_prompt),
    userInput: String(r.user_input),
    transcript: (r.transcript as string | null) ?? null,
    overall: Number(r.overall),
    dimensions: JSON.parse(String(r.dimensions)) as ScoreDimensions,
    suggestions: JSON.parse(String(r.suggestions)) as string[],
    betterVersion: String(r.better_version),
    sentences: r.sentences
      ? (JSON.parse(String(r.sentences)) as SentenceAnalysis[])
      : [],
    createdAt: String(r.created_at),
  };
}

export async function saveCoachPlan(rec: {
  goal: string;
  level: string;
  summary: string;
  plan: CoachPlan;
}): Promise<number> {
  await initDb();
  const c = getClient();
  const createdAt = new Date().toISOString();
  const result = await c.execute({
    sql: `INSERT INTO coach_plans (created_at, goal, level, summary, plan) VALUES (?, ?, ?, ?, ?)`,
    args: [
      createdAt,
      rec.goal,
      rec.level,
      rec.summary,
      JSON.stringify(rec.plan),
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function listCoachPlans(): Promise<CoachPlanRecord[]> {
  await initDb();
  const c = getClient();
  const rows = await c.execute(
    `SELECT * FROM coach_plans ORDER BY created_at DESC LIMIT 100`,
  );
  return rows.rows.map((r) => mapCoachRow(r as Record<string, unknown>));
}

function mapCoachRow(r: Record<string, unknown>): CoachPlanRecord {
  return {
    id: Number(r.id),
    createdAt: String(r.created_at),
    goal: String(r.goal),
    level: String(r.level),
    summary: String(r.summary),
    plan: JSON.parse(String(r.plan)) as CoachPlan,
  };
}

// ===== 常见问题记录 =====
// ===== 用户自主接入的 AI 配置 =====
export interface ApiConfigView {
  id: number;
  name: string;
  endpoint: string;
  apiKeyMask: string;
  model: string | null;
  models: string[];
  status: "untested" | "connected" | "error";
  lastError: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 解密后的可用配置（仅服务端内部使用，绝不返回前端） */
export interface ResolvedApiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export async function getActiveConfig(): Promise<ResolvedApiConfig | null> {
  await initDb();
  const c = getClient();
  const rows = await c.execute(`SELECT * FROM api_configs WHERE is_active = 1 LIMIT 1`);
  if (rows.rows.length === 0) return null;
  const r = rows.rows[0] as Record<string, unknown>;
  return {
    endpoint: String(r.endpoint),
    apiKey: decryptSecret(String(r.api_key_enc)),
    model: String(r.model || ""),
  };
}

export async function saveApiConfig(input: {
  name?: string;
  endpoint: string;
  apiKey: string;
  model?: string;
  models?: string[];
}): Promise<number> {
  await initDb();
  const c = getClient();
  const now = new Date().toISOString();
  const cnt = await c.execute(`SELECT COUNT(*) as n FROM api_configs`);
  const noRows = Number((cnt.rows[0] as Record<string, unknown>).n) === 0;
  const enc = encryptSecret(input.apiKey);
  const mask = maskSecret(input.apiKey);
  const res = await c.execute({
    sql: `INSERT INTO api_configs
      (name, endpoint, api_key_enc, api_key_mask, model, models, status, last_error, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'untested', NULL, ?, ?, ?)`,
    args: [
      input.name?.trim() || "自定义配置",
      input.endpoint.trim(),
      enc,
      mask,
      input.model?.trim() || null,
      JSON.stringify(input.models ?? []),
      noRows ? 1 : 0,
      now,
      now,
    ],
  });
  const id = Number(res.lastInsertRowid);
  if (noRows) {
    await c.execute({ sql: `UPDATE api_configs SET is_active = 1 WHERE id = ?`, args: [id] });
  }
  return id;
}

export async function updateApiConfig(
  id: number,
  patch: {
    name?: string;
    endpoint?: string;
    apiKey?: string;
    model?: string;
    models?: string[];
    status?: "untested" | "connected" | "error";
    lastError?: string | null;
  },
): Promise<void> {
  await initDb();
  const c = getClient();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    args.push(patch.name.trim() || "自定义配置");
  }
  if (patch.endpoint !== undefined) {
    sets.push("endpoint = ?");
    args.push(patch.endpoint.trim());
  }
  if (patch.apiKey !== undefined && patch.apiKey !== "") {
    sets.push("api_key_enc = ?");
    sets.push("api_key_mask = ?");
    args.push(encryptSecret(patch.apiKey));
    args.push(maskSecret(patch.apiKey));
  }
  if (patch.model !== undefined) {
    sets.push("model = ?");
    args.push(patch.model.trim() || null);
  }
  if (patch.models !== undefined) {
    sets.push("models = ?");
    args.push(JSON.stringify(patch.models));
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    args.push(patch.status);
  }
  if (patch.lastError !== undefined) {
    sets.push("last_error = ?");
    args.push(patch.lastError);
  }
  sets.push("updated_at = ?");
  args.push(now);
  args.push(id);
  await c.execute({
    sql: `UPDATE api_configs SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function setActiveApiConfig(id: number): Promise<void> {
  await initDb();
  const c = getClient();
  await c.execute(`UPDATE api_configs SET is_active = 0`);
  await c.execute({ sql: `UPDATE api_configs SET is_active = 1 WHERE id = ?`, args: [id] });
}

export async function deleteApiConfig(id: number): Promise<void> {
  await initDb();
  const c = getClient();
  const target = await c.execute({
    sql: `SELECT is_active FROM api_configs WHERE id = ?`,
    args: [id],
  });
  const wasActive =
    target.rows.length > 0 &&
    Number((target.rows[0] as Record<string, unknown>).is_active) === 1;
  await c.execute({ sql: `DELETE FROM api_configs WHERE id = ?`, args: [id] });
  if (wasActive) {
    const recent = await c.execute(
      `SELECT id FROM api_configs ORDER BY updated_at DESC LIMIT 1`,
    );
    if (recent.rows.length > 0) {
      const nid = Number((recent.rows[0] as Record<string, unknown>).id);
      await c.execute({
        sql: `UPDATE api_configs SET is_active = 1 WHERE id = ?`,
        args: [nid],
      });
    }
  }
}

export async function listApiConfigs(): Promise<ApiConfigView[]> {
  await initDb();
  const c = getClient();
  const rows = await c.execute(
    `SELECT * FROM api_configs ORDER BY is_active DESC, updated_at DESC`,
  );
  return rows.rows.map((r) => {
    const rr = r as Record<string, unknown>;
    return {
      id: Number(rr.id),
      name: String(rr.name),
      endpoint: String(rr.endpoint),
      apiKeyMask: String(rr.api_key_mask),
      model: rr.model ? String(rr.model) : null,
      models: rr.models ? (JSON.parse(String(rr.models)) as string[]) : [],
      status: (String(rr.status) as ApiConfigView["status"]) || "untested",
      lastError: rr.last_error ? String(rr.last_error) : null,
      isActive: Number(rr.is_active) === 1,
      createdAt: String(rr.created_at),
      updatedAt: String(rr.updated_at),
    };
  });
}

export async function saveIssueRecords(
  exerciseId: number,
  issues: RawIssue[],
): Promise<void> {
  if (!issues.length) return;
  await initDb();
  const c = getClient();
  for (const it of issues) {
    await c.execute({
      sql: `INSERT INTO issue_records (exercise_id, scene, category, text, example, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        exerciseId,
        it.scene,
        it.category,
        it.text,
        it.example,
        it.source,
        it.createdAt,
      ],
    });
  }
}

export async function listAllIssues(): Promise<IssueRecordRow[]> {
  await initDb();
  const c = getClient();
  const rows = await c.execute(
    `SELECT * FROM issue_records ORDER BY created_at ASC`,
  );
  return rows.rows.map((r) => mapIssueRow(r as Record<string, unknown>));
}

function mapIssueRow(r: Record<string, unknown>): IssueRecordRow {
  return {
    id: Number(r.id),
    exerciseId: Number(r.exercise_id),
    scene: String(r.scene),
    category: String(r.category),
    text: String(r.text),
    example: String(r.example ?? ""),
    source: String(r.source),
    createdAt: String(r.created_at),
  };
}

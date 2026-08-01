import { createClient, type Client } from "@libsql/client";
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

import { createClient, type Client } from "@libsql/client";
import type { ExerciseRecord, ScoreDimensions, Scene } from "./types";

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
}

export async function saveExercise(rec: NewExercise): Promise<number> {
  await initDb();
  const c = getClient();
  const createdAt = new Date().toISOString();
  const result = await c.execute({
    sql: `INSERT INTO exercises
      (scene, topic_title, topic_prompt, user_input, transcript, overall, dimensions, suggestions, better_version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    createdAt: String(r.created_at),
  };
}

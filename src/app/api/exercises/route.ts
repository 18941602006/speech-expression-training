import { initDb, listExercises, saveExercise, saveIssueRecords, type NewExercise } from "@/lib/db";
import { extractIssues } from "@/lib/issues";
import type { ScoreDimensions, Scene, SentenceAnalysis } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const list = await listExercises();
    return Response.json({ exercises: list });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "读取失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const scene = body.scene as Scene;
  const dimensions = body.dimensions as ScoreDimensions;
  if (!scene || !dimensions || typeof body.overall !== "number") {
    return Response.json({ error: "缺少必要字段（scene / dimensions / overall）" }, { status: 400 });
  }

  const rec: NewExercise = {
    scene,
    topicTitle: String(body.topicTitle || ""),
    topicPrompt: String(body.topicPrompt || ""),
    userInput: String(body.userInput || ""),
    transcript: body.transcript ? String(body.transcript) : null,
    overall: Number(body.overall),
    dimensions,
    suggestions: Array.isArray(body.suggestions) ? (body.suggestions as string[]) : [],
    betterVersion: String(body.betterVersion || ""),
    sentences: Array.isArray(body.sentences)
      ? (body.sentences as SentenceAnalysis[])
      : [],
  };

  try {
    await initDb();
    const id = await saveExercise(rec);
    // 自动归集：把本次练习暴露出的表达问题写入 issue_records，供「常见问题总结」使用
    try {
      const issues = extractIssues({
        scene: rec.scene,
        dimensions: rec.dimensions,
        sentences: rec.sentences,
        suggestions: rec.suggestions,
        createdAt: new Date().toISOString(),
      });
      await saveIssueRecords(id, issues);
    } catch {
      // 问题归集失败不影响练习本身的保存
    }
    return Response.json({ id, ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

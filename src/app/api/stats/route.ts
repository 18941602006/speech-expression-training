import { listExercises } from "@/lib/db";

export const runtime = "nodejs";

// 侧栏进度环与统计：总练习次数、连续练习天数（按 UTC 日连续）、最近一次综合得分
export async function GET() {
  try {
    const list = await listExercises();
    const total = list.length;
    const days = new Set(list.map((e) => String(e.createdAt).slice(0, 10)));
    let streak = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) {
        streak += 1;
        d.setUTCDate(d.getUTCDate() - 1);
      } else {
        break;
      }
    }
    const lastOverall = total > 0 ? Number(list[0].overall) : null;
    return Response.json({ total, streak, lastOverall });
  } catch {
    return Response.json({ total: 0, streak: 0, lastOverall: null });
  }
}

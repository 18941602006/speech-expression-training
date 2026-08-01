import { listAllIssues } from "@/lib/db";
import { callLLM, type ChatMessage } from "@/lib/llm";
import {
  aggregateIssues,
  applyClusters,
  assembleSummary,
  heuristicBrief,
  type IssueGroup,
} from "@/lib/issues";

export const runtime = "nodejs";

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return t;
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(stripFences(s)) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "week";

  try {
    const rows = await listAllIssues();
    const { groups, currentTotal, prevTotal } = aggregateIssues(rows, range);

    // 语义聚合（LLM）：把语义高度相似的聚类再合并为规范化条目
    let merged: IssueGroup[] = groups;
    let brief = "";
    try {
      const payload = groups.map((g, i) => ({
        id: i,
        summary: g.summary,
        count: g.count,
        category: g.category,
      }));
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "你是表达训练的问题聚类助手。下面是一批用户常见问题的初步归并结果（已按相同文本精确合并）。" +
            "请将语义高度相似、本质上是同一类问题的条目合并，给出合并后的规范化摘要（简洁、可操作）。\n" +
            "只返回一个 JSON 对象，不要任何解释，格式：{" +
            '"clusters": [{"label": "规范化后的问题摘要", "memberIds": [id,...]}],' +
            '"brief": "对本期问题的总体点评与改进优先级（2-4 句中文）"' +
            "}。memberIds 使用我给出的 id（整数）。若没有明显可合并项，clusters 可为空数组。",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ];
      const raw = await callLLM(messages, { json: true, temperature: 0.3 });
      const parsed = safeParse<{
        clusters?: { label: string; memberIds: number[] }[];
        brief?: string;
      }>(raw, {});
      if (parsed.clusters && parsed.clusters.length) {
        merged = applyClusters(groups, parsed.clusters);
      }
      brief = parsed.brief || "";
    } catch {
      // 语义聚合失败：退回确定性合并，brief 用启发式
    }

    if (!brief) {
      brief = heuristicBrief(currentTotal, merged, prevTotal);
    }

    const summary = assembleSummary(range, merged, currentTotal, prevTotal, brief);
    return Response.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "问题汇总失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

import { callLLM, MissingKeyError, type ChatMessage } from "@/lib/llm";
import { listExercises, saveCoachPlan, listCoachPlans } from "@/lib/db";
import {
  SCENE_LABELS,
  DIMENSION_ORDER,
  DIMENSION_LABELS,
  type Scene,
  type ExerciseRecord,
  type CoachPlan,
  type CoachStats,
  type CoachPlanDay,
} from "@/lib/types";

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

function computeStats(list: ExerciseRecord[]): CoachStats {
  const total = list.length;
  const byScene: Record<Scene, number> = {
    speech: 0,
    communication: 0,
    interview: 0,
    debate: 0,
    custom: 0,
  };
  const dimSum: Record<string, number> = {};
  DIMENSION_ORDER.forEach((k) => (dimSum[k] = 0));
  let overallSum = 0;
  const waste: Record<string, number> = {};

  list.forEach((rec) => {
    byScene[rec.scene] = (byScene[rec.scene] || 0) + 1;
    overallSum += rec.overall;
    DIMENSION_ORDER.forEach((k) => (dimSum[k] += rec.dimensions[k] || 0));
    (rec.sentences || []).forEach((s) =>
      (s.segments || []).forEach((seg) => {
        if (seg.isWaste && seg.text) {
          const w = seg.text.trim();
          if (w) waste[w] = (waste[w] || 0) + 1;
        }
      }),
    );
  });

  const overallAvg = total ? Math.round((overallSum / total) * 10) / 10 : 0;
  const dimensionAvgs: Record<string, number> = {};
  DIMENSION_ORDER.forEach((k) => {
    dimensionAvgs[DIMENSION_LABELS[k]] = total ? Math.round((dimSum[k] / total) * 10) / 10 : 0;
  });

  const sceneDist: Record<string, number> = {};
  (Object.keys(byScene) as Scene[]).forEach((s) => {
    if (byScene[s] > 0) sceneDist[SCENE_LABELS[s]] = byScene[s];
  });

  const topWaste = Object.entries(waste)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  let trend = "暂无足够数据判断趋势";
  if (total >= 3) {
    const asc = [...list].reverse(); // 早 -> 晚
    const mid = Math.floor(total / 2);
    const early = asc.slice(0, mid);
    const late = asc.slice(mid);
    const avg = (arr: ExerciseRecord[]) =>
      arr.reduce((s, r) => s + r.overall, 0) / arr.length;
    const e = Math.round(avg(early) * 10) / 10;
    const l = Math.round(avg(late) * 10) / 10;
    const diff = Math.round((l - e) * 10) / 10;
    trend =
      diff > 0
        ? `整体呈上升趋势（近 ${late.length} 次平均 ${l}，早期 ${early.length} 次平均 ${e}，+${diff}）`
        : diff < 0
          ? `整体略有回落（近 ${late.length} 次平均 ${l}，早期 ${early.length} 次平均 ${e}，${diff}）`
          : `基本平稳（前后平均均为 ${l}）`;
  }

  return { total, overallAvg, dimensionAvgs, sceneDist, topWaste, trend };
}

// 本地兜底方案：当 AI 返回异常或不稳定时使用，仍基于统计做难度/重点判断
function fallbackPlan(stats: CoachStats, goal: string): CoachPlan {
  const dims = Object.entries(stats.dimensionAvgs).sort((a, b) => a[1] - b[1]);
  const weak = dims.slice(0, 2).map(([k]) => k);
  const focus = weak.length ? weak : ["结构与逻辑", "填充词控制"];
  const startDiff: "基础" | "标准" | "挑战" =
    stats.total === 0
      ? "基础"
      : stats.overallAvg >= 8
        ? "挑战"
        : stats.overallAvg >= 5
          ? "标准"
          : "基础";
  const scenes =
    Object.keys(stats.sceneDist).length > 0
      ? Object.keys(stats.sceneDist)
      : (Object.values(SCENE_LABELS) as string[]);
  const order: ("基础" | "标准" | "挑战")[] = ["基础", "标准", "挑战"];
  const baseIdx = startDiff === "挑战" ? 1 : 0;
  const tasks = [
    "用 1 分钟做一段即兴自我介绍，刻意减少填充词。",
    "围绕一个观点做 2 分钟陈述，先搭结构再展开。",
    "模拟一次正式场景对话，重点提升用词精准度。",
    "针对一个辩题立论 2 分钟，强化逻辑链条。",
    "综合演练：连续表达 3 分钟，兼顾结构与流畅。",
    "挑战即兴抽题，30 秒准备后做 2 分钟演讲。",
  ];
  const weeklyPlan: CoachPlanDay[] = [];
  for (let i = 0; i < 6; i++) {
    const diffIdx = Math.min(order.length - 1, baseIdx + Math.floor(i / 3));
    weeklyPlan.push({
      day: `第${i + 1}阶段`,
      scene: scenes[i % scenes.length],
      focus: focus[i % focus.length],
      task: tasks[i],
      difficulty: order[diffIdx],
    });
  }
  const level =
    stats.total === 0
      ? "入门"
      : stats.overallAvg >= 8
        ? "熟练"
        : stats.overallAvg >= 5
          ? "进阶"
          : "入门";
  const summary =
    stats.total === 0
      ? "暂无练习记录，已为你生成基础入门方案，先完成几次练习后再来生成更精准的方案。"
      : `已完成 ${stats.total} 次练习，整体平均 ${stats.overallAvg} 分。已优先安排你的薄弱维度，并据此选择起步难度。`;
  return {
    level,
    summary,
    focusDimensions: focus,
    weeklyPlan,
    dynamicNote:
      "（AI 服务暂不可用，展示默认方案）默认依据整体平均分选择起步难度，薄弱维度优先排期。",
    tips: [
      "每次练习后回顾 AI 标注的废话并刻意减少",
      "用录音自查流畅度与节奏",
      "开口前先搭结构（观点-论据-结论）",
      "用计时器逼出表达密度，避免拖沓",
    ],
  };
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // 允许空 body：无目标也行
  }
  const goal = String(body.goal || "").trim();

  try {
    const list = await listExercises();
    const stats = computeStats(list);

    const statsText = JSON.stringify(
      {
        ...stats,
        note: "以上为基于用户历史练习记录的统计；若 total 为 0 表示用户尚无练习记录。",
      },
      null,
      2,
    );

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "你是一位资深的语言表达训练总教练，擅长根据学员的练习数据制定个性化训练方案。" +
          "你会收到一份『历史练习统计』（可能为空）和学员的『训练目标』。请据此生成一份训练方案，" +
          "并依据历史数据『动态调整训练难度』：若学员整体评分偏低或记录很少，则从基础难度起步、循序渐进；" +
          "若评分较高，则直接给到标准/挑战难度；重点应放在历史数据中较弱的维度上。\n" +
          "只返回一个 JSON 对象，不要任何解释，格式：{" +
          '"level": 当前水平档位(如"入门/进阶/熟练"),' +
          '"summary": 基于历史数据的一句话水平概述,' +
          '"focusDimensions": [2-4个应重点提升的中文维度标签],' +
          '"weeklyPlan": [{' +
          '"day": 阶段标识(如"第1阶段"),' +
          '"scene": 场景(公众演讲/日常沟通/面试职场/辩论逻辑之一),' +
          '"focus": 本次训练重点,' +
          '"task": 具体可执行的练习任务描述,' +
          '"difficulty": 难度(基础/标准/挑战)' +
          "}]," +
          '"dynamicNote": 说明你是如何根据历史数据动态调整难度与内容的,' +
          '"tips": [3-5条通用训练建议]' +
          "}。weeklyPlan 给出 5-7 个阶段，覆盖不同场景并逐步加码难度。",
      },
      {
        role: "user",
        content:
          `【历史练习统计】\n${statsText}\n\n【学员训练目标】\n${
            goal || "（未填写，请基于现有数据给出通用入门提升方案）"
          }`,
      },
    ];

    const raw = await callLLM(messages, { json: true, temperature: 0.7 });
    const plan = safeParse<CoachPlan>(raw, fallbackPlan(stats, goal));
    if (!Array.isArray(plan.weeklyPlan) || plan.weeklyPlan.length === 0) {
      plan.weeklyPlan = fallbackPlan(stats, goal).weeklyPlan;
    }

    // 落库保存为一条历史记录（名称=时间+需求简要，由前端/接口使用）
    let savedId: number | null = null;
    try {
      savedId = await saveCoachPlan({
        goal,
        level: plan.level,
        summary: plan.summary,
        plan,
      });
    } catch {
      // 保存失败不影响方案展示
    }

    return Response.json({ plan, stats, savedId });
  } catch (e) {
    if (e instanceof MissingKeyError) {
      return Response.json(
        { error: "缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置后重启服务。" },
        { status: 500 },
      );
    }
    const msg = e instanceof Error ? e.message : "教练系统生成失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// 获取历史方案列表（名称=时间+需求简要，由 createdAt + goal 组成）
export async function GET() {
  try {
    const plans = await listCoachPlans();
    return Response.json({ plans });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "读取教练历史失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

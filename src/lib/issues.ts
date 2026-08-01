import {
  DIMENSION_LABELS,
  ISSUE_CATEGORIES,
  SCENE_LABELS,
  type IssueCategory,
  type IssueRecordRow,
  type RawIssue,
  type Scene,
  type ScoreDimensions,
  type SentenceAnalysis,
} from "./types";

export type { IssueCategory, IssueRecordRow, RawIssue };

// 维度 → 问题类型的映射（用于把「维度偏弱」归到对应问题类型）
const DIM_TO_CAT: Record<string, IssueCategory> = {
  structure: "结构逻辑",
  wording: "用词精准",
  filler: "口头禅/废话",
  fit: "场景贴合",
  fluency: "流畅节奏",
  verbose: "口头禅/废话",
};

/**
 * 从一次练习的评分结果中提取「常见问题」原始记录。
 * 三类来源：
 *  1. 废话/口头禅片段（isWaste）
 *  2. 偏弱维度（score < 6，视作反复出现的短板）
 *  3. 整体改进建议（suggestions，常跨练习重复出现）
 */
export function extractIssues(opts: {
  scene: Scene;
  dimensions: ScoreDimensions;
  sentences: SentenceAnalysis[];
  suggestions: string[];
  createdAt: string;
}): RawIssue[] {
  const out: RawIssue[] = [];
  const sceneLabel = SCENE_LABELS[opts.scene];

  opts.sentences.forEach((s) => {
    s.segments.forEach((seg) => {
      if (seg.isWaste && seg.text && seg.text.trim()) {
        out.push({
          scene: sceneLabel,
          category: "口头禅/废话",
          text: (seg.reason && seg.reason.trim()) || "冗余的口头禅/废话表达",
          example: seg.text.trim(),
          source: "filler",
          createdAt: opts.createdAt,
        });
      }
    });
    if (s.comment && s.comment.trim()) {
      out.push({
        scene: sceneLabel,
        category: "其他",
        text: s.comment.trim(),
        example: "",
        source: "comment",
        createdAt: opts.createdAt,
      });
    }
  });

  (Object.keys(opts.dimensions) as (keyof ScoreDimensions)[]).forEach((k) => {
    const v = opts.dimensions[k];
    if (typeof v === "number" && v < 6) {
      out.push({
        scene: sceneLabel,
        category: DIM_TO_CAT[k] ?? "其他",
        text: `${DIMENSION_LABELS[k]}偏弱（${v}/10）`,
        example: "",
        source: "dimension",
        createdAt: opts.createdAt,
      });
    }
  });

  opts.suggestions.forEach((sug) => {
    if (sug && sug.trim()) {
      out.push({
        scene: sceneLabel,
        category: "其他",
        text: sug.trim(),
        example: "",
        source: "suggestion",
        createdAt: opts.createdAt,
      });
    }
  });

  return out;
}

// ===== 聚合 / 总结 =====
export interface RelatedExercise {
  id: number;
  at: string;
}

export interface IssueGroup {
  key: string;
  category: IssueCategory;
  summary: string;
  count: number;
  firstAt: string;
  lastAt: string;
  examples: string[];
  relatedExercises: RelatedExercise[];
  scenes: string[];
}

export interface IssueSummary {
  range: string;
  generatedAt: string;
  total: number;
  typeCount: number;
  topCategories: { category: string; count: number }[];
  trend: {
    currentTotal: number;
    prevTotal: number;
    delta: number;
    topNow: string | null;
    topPrev: string | null;
  };
  brief: string;
  groups: IssueGroup[];
}

// 归一化文本用于去重（去除标点/空白/大小写）
export function normalizeText(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(
      /[\s，。、！？!?.,;；:：'"“”‘’()（）\[\]【】…—\-_/\\|~`+*=@#%&^$]/g,
      "",
    );
}

const RANGE_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

// 计算周期起点（本地时间）：日=今天0点，周=本周一0点，月=本月1号0点
function rangeStart(range: string): Date | null {
  if (!range || range === "all") return null;
  const d = new Date();
  if (range === "day") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "week") {
    const day = d.getDay(); // 0=周日
    const diff = (day + 6) % 7; // 距本周一的天数
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

function inRange(iso: string, start: Date | null): boolean {
  if (!start) return true;
  return new Date(iso).getTime() >= start.getTime();
}

/**
 * 对原始问题记录做确定性聚合：
 *  - 当前周期按「类型 + 归一化文本」精确去重合并
 *  - 同时统计上一等长周期用于趋势对比
 */
export function aggregateIssues(
  rows: IssueRecordRow[],
  range: string,
): { groups: IssueGroup[]; currentTotal: number; prevTotal: number } {
  const start = rangeStart(range);
  const current = rows.filter((r) => inRange(r.createdAt, start));

  let prev: IssueRecordRow[] = [];
  if (start) {
    const days = RANGE_DAYS[range] ?? 7;
    const prevStart = new Date(start.getTime() - days * 86_400_000);
    prev = rows.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= prevStart.getTime() && t < start.getTime();
    });
  }

  const map = new Map<string, IssueGroup>();
  for (const r of current) {
    const key = `${r.category}::${normalizeText(r.text)}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        category: (ISSUE_CATEGORIES.includes(r.category as IssueCategory)
          ? r.category
          : "其他") as IssueCategory,
        summary: r.text,
        count: 0,
        firstAt: r.createdAt,
        lastAt: r.createdAt,
        examples: [],
        relatedExercises: [],
        scenes: [],
      };
      map.set(key, g);
    }
    g.count += 1;
    if (new Date(r.createdAt) < new Date(g.firstAt)) g.firstAt = r.createdAt;
    if (new Date(r.createdAt) > new Date(g.lastAt)) g.lastAt = r.createdAt;
    if (r.example && !g.examples.includes(r.example) && g.examples.length < 3) {
      g.examples.push(r.example);
    }
    if (!g.relatedExercises.some((e) => e.id === r.exerciseId)) {
      g.relatedExercises.push({ id: r.exerciseId, at: r.createdAt });
    }
    if (r.scene && !g.scenes.includes(r.scene)) g.scenes.push(r.scene);
  }

  const groups = [...map.values()].sort((a, b) => b.count - a.count);
  const prevTotal = prev.length;
  return { groups, currentTotal: current.length, prevTotal };
}

/**
 * 语义聚合：用 LLM 把语义高度相似的聚类再合并为规范化条目。
 * clusters[i].memberIds 对应输入 groups 的下标；合并后重算次数/时间/关联。
 */
export function applyClusters(
  groups: IssueGroup[],
  clusters: { label: string; memberIds: number[] }[],
): IssueGroup[] {
  const byId = new Map<number, IssueGroup>();
  groups.forEach((g, i) => byId.set(i, g));
  const used = new Set<number>();
  const out: IssueGroup[] = [];

  clusters.forEach((c, ci) => {
    const members: IssueGroup[] = [];
    (c.memberIds || []).forEach((id) => {
      const m = byId.get(id);
      if (m) {
        members.push(m);
        used.add(id);
      }
    });
    if (!members.length) return;
    out.push({
      key: `cluster-${ci}`,
      category: members[0].category,
      summary: c.label || members[0].summary,
      count: members.reduce((s, m) => s + m.count, 0),
      firstAt: members.reduce(
        (a, m) => (new Date(m.firstAt) < new Date(a) ? m.firstAt : a),
        members[0].firstAt,
      ),
      lastAt: members.reduce(
        (a, m) => (new Date(m.lastAt) > new Date(a) ? m.lastAt : a),
        members[0].lastAt,
      ),
      examples: Array.from(
        new Set(members.flatMap((m) => m.examples)),
      ).slice(0, 3),
      relatedExercises: Array.from(
        new Map(
          members.flatMap((m) =>
            m.relatedExercises.map((e) => [e.id, e] as const),
          ),
        ).values(),
      ).sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
      scenes: Array.from(new Set(members.flatMap((m) => m.scenes))),
    });
  });

  groups.forEach((g, i) => {
    if (!used.has(i)) out.push(g);
  });
  return out.sort((a, b) => b.count - a.count);
}

export function assembleSummary(
  range: string,
  groups: IssueGroup[],
  currentTotal: number,
  prevTotal: number,
  brief: string,
): IssueSummary {
  const catCount = new Map<string, number>();
  groups.forEach((g) =>
    catCount.set(g.category, (catCount.get(g.category) || 0) + g.count),
  );
  const topCategories = [...catCount.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    range,
    generatedAt: new Date().toISOString(),
    total: currentTotal,
    typeCount: topCategories.length,
    topCategories,
    trend: {
      currentTotal,
      prevTotal,
      delta: currentTotal - prevTotal,
      topNow: groups[0]?.summary ?? null,
      topPrev: null,
    },
    brief,
    groups,
  };
}

// 无 LLM 时的启发式简要分析
export function heuristicBrief(
  total: number,
  groups: IssueGroup[],
  prevTotal: number,
): string {
  if (!total) {
    return "本期暂无问题记录。多练习几轮，系统会自动归集你反复出现的表达问题。";
  }
  const top = groups[0];
  let trendTxt: string;
  if (prevTotal === 0) {
    trendTxt = "暂无上一周期数据可供对比。";
  } else if (total > prevTotal) {
    trendTxt = `问题总数较上一周期（${prevTotal}）有所上升，建议保持关注并针对性训练。`;
  } else if (total < prevTotal) {
    trendTxt = `问题总数较上一周期（${prevTotal}）有所下降，进步明显，继续巩固。`;
  } else {
    trendTxt = `问题总数与上一周期（${prevTotal}）持平。`;
  }
  return `本期共归集 ${total} 条问题记录，涵盖 ${groups.length} 个聚类。最高频的是「${top.summary}」（出现 ${top.count} 次），建议优先针对性训练。${trendTxt}`;
}

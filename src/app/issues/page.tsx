"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IssueGroup, IssueSummary } from "@/lib/issues";

const RANGES = [
  { key: "day", label: "日" },
  { key: "week", label: "周" },
  { key: "month", label: "月" },
  { key: "all", label: "全部" },
];
const RANGE_MS: Record<string, number> = {
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  all: 604_800_000,
};
const RANGE_LABEL: Record<string, string> = {
  day: "今日",
  week: "本周",
  month: "本月",
  all: "全部",
};

const CAT_STYLE: Record<string, string> = {
  "口头禅/废话": "bg-danger/15 text-danger",
  "结构逻辑": "bg-brand/15 text-brand",
  "用词精准": "bg-accent/15 text-[#0e7490]",
  "流畅节奏": "bg-emerald-500/15 text-emerald-600",
  "场景贴合": "bg-amber-500/15 text-amber-600",
  "其他": "bg-brand-sec/15 text-brand-sec",
};
function catStyle(cat: string) {
  return CAT_STYLE[cat] || "bg-brand-sec/15 text-brand-sec";
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function IssuesPage() {
  const [range, setRange] = useState("week");
  const [data, setData] = useState<IssueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"count" | "last" | "first">("count");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [reminderOn, setReminderOn] = useState(false);

  async function load(r: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/summary?range=${r}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d as IssueSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
  }, [range]);

  // ===== 周期结束提醒（本地 Notification 最佳努力） =====
  useEffect(() => {
    const on = localStorage.getItem("issueReminder") === "1";
    setReminderOn(on);
    if (on) {
      const last = Number(localStorage.getItem("issueReminderLast") || "0");
      const r = localStorage.getItem("issueReminderRange") || "week";
      const due = Date.now() - last >= RANGE_MS[r];
      if (due && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("言语表达训练 · 问题总结提醒", {
          body: `该生成本${RANGE_LABEL[r] || "周"}的「常见问题总结」啦，看看高频问题有没有改善。`,
        });
        localStorage.setItem("issueReminderLast", String(Date.now()));
      }
    }
  }, []);

  function toggleReminder() {
    const next = !reminderOn;
    setReminderOn(next);
    localStorage.setItem("issueReminder", next ? "1" : "0");
    localStorage.setItem("issueReminderRange", range);
    if (next && typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      } else if (Notification.permission !== "granted") {
        alert("浏览器未授予通知权限，提醒将以应用内方式记录（下次打开本页时按周期提示）。");
      }
    }
  }

  function testReminder() {
    if (typeof Notification === "undefined") {
      alert("当前环境不支持系统通知，已记录提醒偏好，将在应用内按周期提示。");
      return;
    }
    if (Notification.permission === "granted") {
      new Notification("言语表达训练 · 提醒测试", {
        body: "这是一条周期提醒示例：及时查看你的常见问题总结。",
      });
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") {
          new Notification("言语表达训练 · 提醒测试", { body: "授权成功，后续将按时提醒。" });
        } else {
          alert("未授予通知权限，已改为应用内提醒记录。");
        }
      });
    } else {
      alert("通知权限被拒绝，已改为应用内提醒记录。");
    }
  }

  // ===== 筛选 + 排序 =====
  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.groups.map((g) => g.category)));
  }, [data]);

  const displayGroups = useMemo(() => {
    if (!data) return [];
    let arr = data.groups;
    if (catFilter.size > 0) arr = arr.filter((g) => catFilter.has(g.category));
    const sorted = [...arr];
    if (sort === "count") sorted.sort((a, b) => b.count - a.count);
    else if (sort === "last")
      sorted.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    else sorted.sort((a, b) => new Date(a.firstAt).getTime() - new Date(b.firstAt).getTime());
    return sorted;
  }, [data, catFilter, sort]);

  function toggleCat(cat: string) {
    setCatFilter((prev) => {
      const s = new Set(prev);
      if (s.has(cat)) s.delete(cat);
      else s.add(cat);
      return s;
    });
  }

  // ===== 导出 =====
  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportMarkdown() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`# 常见问题总结（${RANGE_LABEL[data.range] || data.range}）`);
    lines.push("");
    lines.push(`- 生成时间：${fmt(data.generatedAt)}`);
    lines.push(`- 本期问题总数：${data.total}`);
    lines.push(`- 问题类型数：${data.typeCount}`);
    lines.push(
      `- 较上一周期：${data.trend.prevTotal === 0 ? "无对比数据" : `${data.trend.delta >= 0 ? "+" : ""}${data.trend.delta}（上期 ${data.trend.prevTotal}）`}`,
    );
    lines.push("");
    lines.push("## AI 小结");
    lines.push("");
    lines.push(data.brief);
    lines.push("");
    lines.push("## 高频问题 Top");
    lines.push("");
    data.groups.forEach((g, i) => {
      lines.push(`${i + 1}. 【${g.category}】${g.summary} —— 出现 ${g.count} 次`);
      lines.push(`   - 首次：${fmt(g.firstAt)}　末次：${fmt(g.lastAt)}`);
      lines.push(`   - 关联练习：${g.relatedExercises.length} 次　场景：${g.scenes.join("、") || "—"}`);
      if (g.examples.length) lines.push(`   - 示例：${g.examples.join(" / ")}`);
    });
    download(`常见问题总结_${data.range}.md`, lines.join("\n"), "text/markdown;charset=utf-8");
  }

  function exportJson() {
    if (!data) return;
    download(
      `常见问题总结_${data.range}.json`,
      JSON.stringify(data, null, 2),
      "application/json;charset=utf-8",
    );
  }

  const total = data?.total ?? 0;
  const top = data?.groups[0] ?? null;
  const trend = data?.trend;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      {/* 头图 */}
      <header className="hero-grad anim-rise mb-6 rounded-[22px] p-8 shadow-[0_18px_50px_rgba(124,92,255,0.28)]">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          📊 常见问题总结
        </h1>
        <p className="t-body mt-3 text-sm text-white/85">
          自动归集你反复出现的表达问题，按周期生成高频问题 Top 榜、趋势变化与改进建议。
        </p>
      </header>

      {/* 控制条：周期 / 筛选 / 排序 / 导出 / 提醒 */}
      <section className="glass anim-rise mb-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* 周期切换 */}
          <div className="inline-flex rounded-xl bg-white/60 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/60 ${
                  range === r.key
                    ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-[0_4px_12px_rgba(124,92,255,0.35)]"
                    : "text-brand-sec/80 hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="text-sm text-brand-sec/70">
              排序
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "count" | "last" | "first")}
                className="input ml-1 inline-block w-auto py-1.5"
              >
                <option value="count">频率</option>
                <option value="last">最近出现</option>
                <option value="first">最早出现</option>
              </select>
            </label>
            <button onClick={exportMarkdown} className="btn btn-ghost" disabled={!data}>
              导出 MD
            </button>
            <button onClick={exportJson} className="btn btn-ghost" disabled={!data}>
              导出 JSON
            </button>
          </div>
        </div>

        {/* 类型筛选 chips */}
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCatFilter(new Set())}
              className={`chip outline-none transition ${
                catFilter.size === 0
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white"
                  : "bg-white/60 text-brand-sec hover:bg-white/80"
              }`}
            >
              全部类型
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`chip outline-none transition ${
                  catFilter.has(c)
                    ? "bg-gradient-to-r from-brand to-brand-2 text-white"
                    : `bg-white/60 ${catStyle(c)} hover:brightness-95`
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* 提醒开关 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-sec/80">
            <input
              type="checkbox"
              checked={reminderOn}
              onChange={toggleReminder}
              className="h-4 w-4 accent-[#7c5cff]"
            />
            周期结束提醒（本{RANGE_LABEL[range] || "周"}结束后推送通知）
          </label>
          <button onClick={testReminder} className="btn btn-ghost py-1.5 text-sm">
            测试提醒
          </button>
        </div>
      </section>

      {/* 统计卡 */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="本期问题数" value={String(total)} />
        <StatCard label="问题类型" value={String(data?.typeCount ?? 0)} />
        <StatCard
          label="最高频问题"
          value={top ? `${top.count} 次` : "—"}
          sub={top?.summary}
        />
        <StatCard
          label="较上期"
          value={
            trend
              ? trend.prevTotal === 0
                ? "—"
                : `${trend.delta >= 0 ? "▲" : "▼"} ${Math.abs(trend.delta)}`
              : "—"
          }
          sub={trend ? `上期 ${trend.prevTotal}` : ""}
          tone={trend && trend.delta < 0 ? "good" : trend && trend.delta > 0 ? "warn" : "neutral"}
        />
      </section>

      {/* AI 小结 */}
      {data && (
        <section className="glass-soft mb-6 p-5">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-accent px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(34,211,238,0.3)]">
            AI 小结 · {RANGE_LABEL[data.range] || data.range}
          </div>
          <p className="t-body text-ink/90">{data.brief}</p>
        </section>
      )}

      {/* 高频问题列表 */}
      <section>
        {loading && <p className="t-body text-sm text-brand-sec/50">加载中…</p>}
        {error && <p className="t-body text-sm font-medium text-danger">{error}</p>}
        {!loading && !error && total === 0 && (
          <p className="t-body text-sm text-brand-sec/50">
            本{RANGE_LABEL[range] || "周期"}还没有归集到问题。去首页练几轮，系统会自动记录你反复出现的表达问题。
          </p>
        )}

        <div className="space-y-3">
          {displayGroups.map((g, i) => (
            <GroupCard
              key={g.key}
              g={g}
              rank={i + 1}
              expanded={expanded.has(g.key)}
              onToggle={() =>
                setExpanded((prev) => {
                  const s = new Set(prev);
                  if (s.has(g.key)) s.delete(g.key);
                  else s.add(g.key);
                  return s;
                })
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneCls =
    tone === "good"
      ? "text-success"
      : tone === "warn"
        ? "text-warning"
        : "text-ink";
  return (
    <div className="glass-soft card-hover p-4">
      <div className="t-label text-brand-sec/60">{label}</div>
      <div className={`mt-1.5 text-2xl font-extrabold ${toneCls}`}>{value}</div>
      {sub && <div className="t-label mt-1 truncate text-brand-sec/50">{sub}</div>}
    </div>
  );
}

function GroupCard({
  g,
  rank,
  expanded,
  onToggle,
}: {
  g: IssueGroup;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const showAll = expanded || g.relatedExercises.length <= 3;
  const shown = showAll
    ? g.relatedExercises
    : g.relatedExercises.slice(0, 3);
  return (
    <div className="glass card-hover anim-pop p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
              {rank}
            </span>
            <span className={`chip ${catStyle(g.category)}`}>{g.category}</span>
          </div>
          <p className="t-h3 mt-2 text-ink">{g.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="bg-gradient-to-br from-brand to-brand-2 bg-clip-text text-3xl font-extrabold text-transparent">
            {g.count}
          </div>
          <div className="t-label text-brand-sec/50">次</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-brand-sec/70 sm:grid-cols-2">
        <span>首次出现：{fmt(g.firstAt)}</span>
        <span>末次出现：{fmt(g.lastAt)}</span>
      </div>

      {g.examples.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {g.examples.map((ex, k) => (
            <span key={k} className="chip bg-danger/10 text-danger">
              {ex}
            </span>
          ))}
        </div>
      )}

      {g.scenes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {g.scenes.map((s, k) => (
            <span key={k} className="chip bg-white/60 text-brand-sec/80">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* 关联练习链接 */}
      <div className="mt-4 border-t border-white/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-sec/70">
            关联练习（{g.relatedExercises.length}）
          </span>
          {g.relatedExercises.length > 3 && (
            <button
              onClick={onToggle}
              className="text-xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {expanded ? "收起" : `展开全部 ${g.relatedExercises.length} 条`}
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {shown.map((e) => (
            <Link
              key={e.id}
              href="/history"
              className="chip bg-white/60 text-brand-sec/80 outline-none transition hover:bg-white/90 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/60"
              title={`练习 #${e.id} · ${fmt(e.at)}`}
            >
              #{e.id} · {fmt(e.at).slice(5, 16)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

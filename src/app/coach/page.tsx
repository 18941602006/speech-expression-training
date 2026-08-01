"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CoachPlan, CoachStats, CoachPlanRecord } from "@/lib/types";

// 难度色标：统一使用设计令牌（success / warning / danger）
const DIFF_STYLE: Record<string, string> = {
  基础: "bg-success/10 text-success",
  标准: "bg-warning/10 text-warning",
  挑战: "bg-danger/10 text-danger",
};

const TREND_BADGE: Record<string, string> = {
  上升: "↑ 上升",
  回落: "↓ 回落",
  平稳: "→ 平稳",
};

function fmtTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 历史记录名称：时间 + 需求简要
function recordName(rec: CoachPlanRecord): string {
  const brief = rec.goal.trim()
    ? rec.goal.trim().length > 18
      ? rec.goal.trim().slice(0, 18) + "…"
      : rec.goal.trim()
    : "未填目标";
  return `${fmtTime(rec.createdAt)} · ${brief}`;
}

export default function CoachPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<CoachPlanRecord[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  async function loadHistory() {
    try {
      const res = await fetch("/api/coach", { method: "GET" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.plans)) setHistory(data.plans);
    } catch {
      /* 忽略读取失败 */
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setPlan(data.plan as CoachPlan);
      setStats(data.stats as CoachStats);
      setActiveId(null);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  function viewRecord(rec: CoachPlanRecord) {
    setPlan(rec.plan);
    setStats(null); // 历史方案不展示当时数据洞察，仅展示方案
    setActiveId(rec.id);
  }

  const trendKey = stats
    ? Object.keys(TREND_BADGE).find((k) => stats.trend.includes(k)) || ""
    : "";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <header className="mb-6">
        <h1 className="t-h1 text-ink">🎯 教练系统</h1>
        <p className="t-body mt-3 text-brand-sec/80">
          基于你过往的练习记录，自动分析强弱项并生成个性化训练方案，动态匹配难度。
        </p>
      </header>

      {/* 目标输入 */}
      <section className="glass p-6">
        <label className="text-sm font-semibold text-ink">
          你的训练目标 / 当前诉求（可选）
        </label>
        <p className="t-body mb-3 mt-2 text-xs text-brand-sec/60">
          例如：想提升面试表达、减少口头禅、增强辩论逻辑；留空则按历史数据给通用方案。
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="例如：我马上要参加一场技术面试，希望表达更专业、少说废话。"
          className="input resize-none"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="btn btn-primary mt-4"
        >
          {loading ? "教练分析中…" : "生成我的专属训练方案"}
        </button>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
      </section>

      {/* 概览数据（仅刚生成的方案展示） */}
      {stats && (
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="练习次数" value={String(stats.total)} />
          <Stat
            label="平均总分"
            value={stats.total ? stats.overallAvg.toFixed(1) : "—"}
          />
          <Stat
            label="覆盖场景"
            value={String(Object.keys(stats.sceneDist).length || 0)}
          />
          <Stat label="趋势" value={trendKey ? TREND_BADGE[trendKey] : "—"} />
        </section>
      )}

      {/* 数据洞察（仅刚生成的方案展示） */}
      {stats && stats.total > 0 && (
        <section className="glass mt-4 p-6">
          <h3 className="t-label mb-4 text-brand-sec/70">数据洞察</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="t-label mb-3 text-brand-sec/60">
                各维度平均（满分 10）
              </p>
              <div className="space-y-3">
                {Object.entries(stats.dimensionAvgs).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-brand-sec/80">
                      <span>{k}</span>
                      <span className="font-semibold text-ink">{v.toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/40">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${Math.max(2, v * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="t-label mb-3 text-brand-sec/60">
                高频废话 / 填充词
              </p>
              {stats.topWaste.length ? (
                <div className="flex flex-wrap gap-2">
                  {stats.topWaste.map((w) => (
                    <span
                      key={w.word}
                      className="chip bg-danger/10 text-danger"
                    >
                      「{w.word}」×{w.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="t-body text-xs text-brand-sec/50">暂无明显废话记录</p>
              )}
              <p className="t-label mb-2 mt-4 text-brand-sec/60">难度动态调整依据</p>
              <p className="t-body text-xs text-brand-sec/80">{stats.trend}</p>
            </div>
          </div>
        </section>
      )}

      {/* 当前/查看的方案 */}
      {plan && <PlanCard plan={plan} />}

      {/* 历史方案列表 */}
      <section className="mt-8">
        <h3 className="t-h3 mb-3 text-ink">
          历史方案
          <span className="ml-2 text-xs font-normal text-brand-sec/50">
            （名称 = 时间 + 需求简要，点击可回看）
          </span>
        </h3>
        {history.length === 0 ? (
          <p className="t-body text-xs text-brand-sec/50">
            还没有历史方案，生成一次后会出现在这里。
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((rec) => (
              <button
                key={rec.id}
                onClick={() => viewRecord(rec)}
                className={`glass-soft flex w-full items-center justify-between p-4 text-left outline-none transition hover:border-white focus-visible:ring-2 focus-visible:ring-brand/60 ${
                  activeId === rec.id ? "border-brand bg-white/60" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">
                    {recordName(rec)}
                  </div>
                  <div className="truncate text-xs text-brand-sec/70">
                    {rec.plan.summary}
                  </div>
                </div>
                <span className="chip ml-3 shrink-0 bg-white/60 text-brand-sec">
                  {rec.level}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlanCard({ plan }: { plan: CoachPlan }) {
  return (
    <section className="glass mt-6 p-6">
      <h2 className="t-h2 text-ink">
        {plan.level} · 专属训练方案
      </h2>
      <p className="t-body mt-3 text-brand-sec/80">{plan.summary}</p>

      {plan.focusDimensions?.length > 0 && (
        <div className="mt-4">
          <span className="t-label text-brand-sec/60">重点提升：</span>
          {plan.focusDimensions.map((d) => (
            <span
              key={d}
              className="chip ml-2 bg-white/60 text-brand"
            >
              {d}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {plan.weeklyPlan?.map((d, i) => (
          <div
            key={i}
            className="glass-soft flex gap-3 p-4"
          >
            <div className="w-16 shrink-0 text-sm font-semibold text-brand-sec">
              {d.day}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">
                  {d.scene}
                </span>
                <span
                  className={`chip ${DIFF_STYLE[d.difficulty] || "bg-white/50 text-brand-sec"}`}
                >
                  {d.difficulty}
                </span>
              </div>
              <p className="t-body mt-2 text-xs text-brand-sec/70">重点：{d.focus}</p>
              <p className="t-body text-sm text-ink">{d.task}</p>
            </div>
          </div>
        ))}
      </div>

      {plan.dynamicNote && (
        <div className="mt-5 rounded-lg bg-white/40 p-3">
          <span className="t-label text-brand-sec/70">难度动态调整：</span>
          <span className="t-body text-xs text-brand-sec/80">{plan.dynamicNote}</span>
        </div>
      )}

      {plan.tips?.length > 0 && (
        <div className="mt-4">
          <p className="t-label text-brand-sec/70">训练建议</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-sec/80">
            {plan.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/"
          className="btn btn-secondary"
        >
          去练习 →
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft p-4 text-center">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="t-label mt-2 text-brand-sec/60">{label}</div>
    </div>
  );
}

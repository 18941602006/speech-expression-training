"use client";

import { useState } from "react";
import Link from "next/link";
import type { CoachPlan, CoachStats } from "@/lib/types";

const DIFF_STYLE: Record<string, string> = {
  基础: "bg-emerald-100 text-emerald-700",
  标准: "bg-amber-100 text-amber-700",
  挑战: "bg-rose-100 text-rose-700",
};

const TREND_BADGE: Record<string, string> = {
  上升: "↑ 上升",
  回落: "↓ 回落",
  平稳: "→ 平稳",
};

export default function CoachPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  const trendKey = stats
    ? Object.keys(TREND_BADGE).find((k) => stats.trend.includes(k)) || ""
    : "";

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← 返回首页
      </Link>
      <header className="mb-6 mt-3">
        <h1 className="text-3xl font-bold text-zinc-900">🎯 教练系统</h1>
        <p className="mt-2 text-zinc-500">
          基于你过往的练习记录，自动分析强弱项并生成个性化训练方案，动态匹配难度。
        </p>
      </header>

      {/* 目标输入 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-zinc-800">
          你的训练目标 / 当前诉求（可选）
        </label>
        <p className="mb-2 text-xs text-zinc-400">
          例如：想提升面试表达、减少口头禅、增强辩论逻辑；留空则按历史数据给通用方案。
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="例如：我马上要参加一场技术面试，希望表达更专业、少说废话。"
          className="w-full resize-none rounded-lg border border-zinc-300 p-3 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="mt-3 rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "教练分析中…" : "生成我的专属训练方案"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {/* 概览数据 */}
      {stats && (
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* 数据洞察 */}
      {stats && stats.total > 0 && (
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-zinc-800">数据洞察</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">
                各维度平均（满分 10）
              </p>
              <div className="space-y-2">
                {Object.entries(stats.dimensionAvgs).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>{k}</span>
                      <span>{v.toFixed(1)}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-zinc-100">
                      <div
                        className="h-1.5 rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(2, v * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">
                高频废话 / 填充词
              </p>
              {stats.topWaste.length ? (
                <div className="flex flex-wrap gap-2">
                  {stats.topWaste.map((w) => (
                    <span
                      key={w.word}
                      className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-600"
                    >
                      「{w.word}」×{w.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">暂无明显废话记录</p>
              )}
              <p className="mb-1 mt-4 text-xs font-medium text-zinc-500">
                难度动态调整依据
              </p>
              <p className="text-xs text-zinc-600">{stats.trend}</p>
            </div>
          </div>
        </section>
      )}

      {/* 训练方案 */}
      {plan && (
        <section className="mt-6 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900">
            {plan.level} · 专属训练方案
          </h2>
          <p className="mt-2 text-sm text-zinc-600">{plan.summary}</p>

          {plan.focusDimensions?.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-medium text-zinc-500">重点提升：</span>
              {plan.focusDimensions.map((d) => (
                <span
                  key={d}
                  className="ml-1.5 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700"
                >
                  {d}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {plan.weeklyPlan?.map((d, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-zinc-200 p-3"
              >
                <div className="w-16 shrink-0 text-sm font-semibold text-zinc-700">
                  {d.day}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800">
                      {d.scene}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        DIFF_STYLE[d.difficulty] || "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {d.difficulty}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">重点：{d.focus}</p>
                  <p className="mt-0.5 text-sm text-zinc-700">{d.task}</p>
                </div>
              </div>
            ))}
          </div>

          {plan.dynamicNote && (
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
              <span className="font-medium text-zinc-700">难度动态调整：</span>
              {plan.dynamicNote}
            </div>
          )}

          {plan.tips?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-zinc-500">训练建议</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-zinc-600">
                {plan.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <Link
              href="/"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              去练习 →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
      <div className="text-lg font-bold text-zinc-900">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

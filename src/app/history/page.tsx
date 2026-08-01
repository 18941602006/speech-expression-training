"use client";

import { useEffect, useState } from "react";
import { SCENE_LABELS, type ExerciseRecord } from "@/lib/types";
import ProgressChart from "@/components/ProgressChart";

export default function HistoryPage() {
  const [list, setList] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setList(d.exercises as ExerciseRecord[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <header className="hero-grad anim-rise mb-6 rounded-[22px] p-8 shadow-[0_18px_50px_rgba(124,92,255,0.28)]">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          练习历史
        </h1>
        <p className="t-body mt-3 text-sm text-white/85">
          回顾你的每一次练习，看见表达的进步轨迹。
        </p>
      </header>

      <section className="glass card-hover p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(124,92,255,0.3)]">
          进步曲线 · 综合评分
        </div>
        <ProgressChart data={list} />
      </section>

      <section className="mt-6">
        {loading && <p className="t-body text-sm text-brand-sec/50">加载中…</p>}
        {error && <p className="t-body text-sm font-medium text-danger">{error}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="t-body text-sm text-brand-sec/50">还没有练习记录，去练一题吧。</p>
        )}
        <div className="space-y-3">
          {list.map((ex) => (
            <div key={ex.id} className="glass-soft card-hover p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">{ex.topicTitle}</span>
                <span className="chip shrink-0 bg-white/60 text-brand">
                  {SCENE_LABELS[ex.scene]}
                </span>
              </div>
              <p className="t-body mt-2 line-clamp-2 text-sm text-brand-sec/70">{ex.userInput}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-brand-sec/50">
                <span>综合 {ex.overall} / 10</span>
                <span>{new Date(ex.createdAt).toLocaleString("zh-CN")}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

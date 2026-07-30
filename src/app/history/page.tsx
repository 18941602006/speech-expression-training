"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">练习历史</h1>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← 返回训练
        </Link>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-800">进步曲线（综合评分）</h2>
        <ProgressChart data={list} />
      </section>

      <section className="mt-6">
        {loading && <p className="text-sm text-zinc-400">加载中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="text-sm text-zinc-400">还没有练习记录，去练一题吧。</p>
        )}
        <div className="space-y-3">
          {list.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900">{ex.topicTitle}</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                  {SCENE_LABELS[ex.scene]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{ex.userInput}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
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

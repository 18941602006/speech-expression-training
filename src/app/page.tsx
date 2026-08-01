"use client";

import Link from "next/link";
import { SCENE_LABELS, type Scene } from "@/lib/types";
import { PRESET_TOPICS } from "@/lib/topics";
import DailyBlock from "@/components/DailyBlock";
import { EQ_TIPS, BOOK_QUOTES } from "@/lib/daily";

const SCENE_DESC: Record<Scene, string> = {
  speech: "上台、汇报、宣讲",
  communication: "聊天、表达、化解冲突",
  interview: "面试、向上沟通、谈判",
  debate: "立论、反驳、攻防",
  custom: "自由设定你的练习场景",
};

// 场景图标（活力点缀）
const SCENE_ICON: Record<Scene, string> = {
  speech: "🎤",
  communication: "💬",
  interview: "🧑‍💼",
  debate: "⚖️",
  custom: "✏️",
};

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      {/* 活力头图 */}
      <header className="hero-grad anim-rise mb-6 rounded-[22px] p-8 shadow-[0_18px_50px_rgba(124,92,255,0.28)]">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          用 AI 陪你，练出更有力的表达
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
          选一个场景进入陪练。AI 扮演角色与你对话、引导表达，右侧实时分析你的每句话，标出废话并给出更好的说法。
        </p>
      </header>

      {/* 教练系统入口（通栏卡片） */}
      <section
        className="glass card-hover anim-rise mb-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center"
        style={{ animationDelay: "60ms" }}
      >
        <div>
          <h2 className="t-h3 text-ink">🎯 教练系统</h2>
          <p className="t-body mt-2 max-w-xl text-brand-sec/80">
            根据你的历史练习数据，自动分析强弱项、动态调整难度，生成专属训练方案。
          </p>
        </div>
        <Link href="/coach" className="btn btn-gradient shrink-0">
          进入教练系统 →
        </Link>
      </section>

      {/* 常见问题总结入口（通栏卡片） */}
      <section
        className="glass card-hover anim-rise mb-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center"
        style={{ animationDelay: "120ms" }}
      >
        <div>
          <h2 className="t-h3 text-ink">📊 常见问题总结</h2>
          <p className="t-body mt-2 max-w-xl text-brand-sec/80">
            自动归集你反复出现的表达问题，按日 / 周 / 月生成高频问题 Top 榜、趋势变化与改进建议。
          </p>
        </div>
        <Link href="/issues" className="btn btn-gradient shrink-0">
          查看问题总结 →
        </Link>
      </section>

      {/* 每日灵感：两个对称正方形小版块（每日按日期自动轮换） */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="t-h3 text-ink">✨ 每日灵感</h2>
          <span className="t-label text-brand-sec/50">每天自动更新</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DailyBlock
            title="每日高情商学习"
            emoji="🌟"
            accent="from-accent to-brand"
            items={EQ_TIPS}
          />
          <DailyBlock
            title="读书名言"
            emoji="📖"
            accent="from-brand-2 to-accent"
            items={BOOK_QUOTES}
          />
        </div>
      </section>

      {/* 场景选择：显式网格系统（移动 2 列 → 桌面 5 列；所有方向均为可点击导航，跳转至对应详情页） */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {(Object.keys(SCENE_LABELS) as Scene[]).map((s, i) => (
          <Link
            key={s}
            href={`/scene/${s}`}
            className="glass card-hover anim-rise p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            style={{ animationDelay: `${120 + i * 60}ms` }}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-xl shadow-[0_6px_16px_rgba(124,92,255,0.35)]">
              {SCENE_ICON[s]}
            </div>
            <div className="t-h3 text-ink">{SCENE_LABELS[s]}</div>
            <div className="t-body mt-2 text-sm text-brand-sec/80">{SCENE_DESC[s]}</div>
            <div className="t-label mt-4 text-brand-sec/50">
              {s === "custom" ? "✏️ 自由设定场景" : `内置 ${PRESET_TOPICS[s].length} 题 · 可 AI 扩展`}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  itemForDate,
  formatCNDate,
  type DailyItem,
} from "@/lib/daily";

interface Props {
  title: string;
  emoji: string;
  /** 渐变类名，如 "from-accent to-brand"，用于标题图标底色 */
  accent: string;
  items: DailyItem[];
}

export default function DailyBlock({ title, emoji, accent, items }: Props) {
  // 默认按当天日期选一条（服务端/客户端同为本地时区，避免水合不一致）
  const init = itemForDate(items);
  const [index, setIndex] = useState(init.index);
  const [now, setNow] = useState(() => new Date());

  // 每日自动刷新机制：跨过本地午夜时自动切换到新的一天内容
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const t = new Date();
      setNow(t);
      setIndex(itemForDate(items, t).index);
      const nextMidnight = new Date(t);
      nextMidnight.setHours(24, 0, 0, 0); // 当天 24:00 = 次日 00:00
      timer = setTimeout(arm, nextMidnight.getTime() - t.getTime());
    };
    const first = new Date();
    const nextMidnight = new Date(first);
    nextMidnight.setHours(24, 0, 0, 0);
    timer = setTimeout(arm, nextMidnight.getTime() - first.getTime());
    return () => clearTimeout(timer);
  }, [items]);

  // 手动换一条（当天内临时浏览其它条目，不影响每日轮换）
  function shuffle() {
    setIndex((prev) => {
      if (items.length <= 1) return prev;
      let n = prev;
      while (n === prev) n = Math.floor(Math.random() * items.length);
      return n;
    });
  }

  const item = items[index];

  return (
    <div className="glass card-hover anim-pop flex aspect-square flex-col p-5">
      {/* 标题区域 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-lg shadow-[0_6px_16px_rgba(124,92,255,0.3)]`}
          >
            {emoji}
          </span>
          <span className="t-h3 truncate leading-tight text-ink">{title}</span>
        </div>
        <span className="t-label shrink-0 rounded-full bg-white/60 px-2 py-1 text-brand-sec/60">
          {formatCNDate(now)}
        </span>
      </div>

      {/* 内容展示区域 */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
        <p className="text-[0.95rem] font-medium leading-relaxed text-ink">
          {item.text}
        </p>
        {item.source && (
          <p className="mt-3 text-xs text-brand-sec/70">—— {item.source}</p>
        )}
      </div>

      {/* 底部：刷新状态 + 换一条 */}
      <div className="mt-3 flex items-center justify-between">
        <span className="t-label text-brand-sec/40">每日自动更新</span>
        <button
          onClick={shuffle}
          className="btn btn-ghost px-3 py-1.5 text-xs"
          aria-label="换一条"
        >
          换一条
        </button>
      </div>
    </div>
  );
}

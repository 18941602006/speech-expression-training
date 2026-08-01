"use client";

import type { ExerciseRecord } from "@/lib/types";

export default function ProgressChart({ data }: { data: ExerciseRecord[] }) {
  // 按时间升序绘制综合评分曲线
  const points = [...data].reverse();
  const w = 600;
  const h = 200;
  const pad = 30;
  const maxScore = 10;

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
        暂无数据，去练一题吧
      </div>
    );
  }

  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + (points.length > 1 ? i * stepX : (w - pad * 2) / 2);
    const y = pad + (1 - p.overall / maxScore) * (h - pad * 2);
    return { x, y, p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="进步曲线">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(58,52,78,0.35)" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="rgba(58,52,78,0.35)" />
      {[0, 5, 10].map((v) => {
        const y = pad + (1 - v / maxScore) * (h - pad * 2);
        return (
          <g key={v}>
            <text x={pad - 8} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(58,52,78,0.55)">
              {v}
            </text>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(58,52,78,0.12)" />
          </g>
        );
      })}
      <path d={path} fill="none" stroke="#1856FF" strokeWidth={2} />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={4} fill="#1856FF" />
          <title>{`${new Date(c.p.createdAt).toLocaleString("zh-CN")}：综合 ${c.p.overall}`}</title>
        </g>
      ))}
    </svg>
  );
}

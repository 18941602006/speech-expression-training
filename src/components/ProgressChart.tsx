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
      <div className="flex h-40 items-center justify-center text-sm text-brand-sec/50">
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

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${h - pad} L${coords[0].x.toFixed(1)},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="进步曲线">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#FF5E9C" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(91,84,112,0.25)" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="rgba(91,84,112,0.25)" />
      {[0, 5, 10].map((v) => {
        const y = pad + (1 - v / maxScore) * (h - pad * 2);
        return (
          <g key={v}>
            <text x={pad - 8} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(91,84,112,0.6)">
              {v}
            </text>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(91,84,112,0.1)" />
          </g>
        );
      })}
      <path d={area} fill="url(#areaGrad)" />
      <path
        d={line}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={4.5} fill="#fff" stroke="url(#lineGrad)" strokeWidth={2.5} />
          <title>{`${new Date(c.p.createdAt).toLocaleString("zh-CN")}：综合 ${c.p.overall}`}</title>
        </g>
      ))}
    </svg>
  );
}

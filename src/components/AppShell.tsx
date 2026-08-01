"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "首页", mark: "◇" },
  { href: "/coach", label: "教练系统", mark: "◎" },
  { href: "/issues", label: "常见问题", mark: "▦" },
  { href: "/history", label: "练习历史", mark: "▤" },
];

type Stats = { total: number; streak: number; lastOverall: number | null };

function ProgressRing({ streak, goal = 7 }: { streak: number; goal?: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.min(streak / goal, 1);
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" role="img" aria-label={`连续练习 ${streak} 天`}>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#FF5E9C" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(91,84,112,0.14)" strokeWidth="7" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 40 40)"
        style={{ transition: "stroke-dashoffset 0.9s var(--ease)" }}
      />
      <text x="40" y="38" textAnchor="middle" fontSize="18" fontWeight={700} fill="#5B3FD6">
        {streak}
      </text>
      <text x="40" y="54" textAnchor="middle" fontSize="9" fill="#5B5470">
        连续天
      </text>
    </svg>
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((n) => {
        const active =
          n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/60 ${
              active
                ? "bg-gradient-to-r from-brand to-brand-2 font-semibold text-white shadow-[0_6px_16px_rgba(124,92,255,0.35)]"
                : "text-brand-sec/80 hover:bg-white/60"
            }`}
          >
            <span className="text-base leading-none">{n.mark}</span>
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stats, setStats] = useState<Stats>({ total: 0, streak: 0, lastOverall: null });

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* 桌面端：左侧固定玻璃侧栏 */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/60 bg-white/55 px-5 py-6 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-sm font-bold text-white shadow-[0_6px_16px_rgba(124,92,255,0.4)]">
            语
          </span>
          <span className="t-h3 text-ink">言语表达训练</span>
        </div>

        <nav className="mt-9 flex flex-col gap-1">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="mt-8 rounded-xl bg-white/50 p-4">
          <p className="t-label text-brand-sec/60">练习进度</p>
          <div className="mt-2 flex items-center gap-3">
            <ProgressRing streak={stats.streak} />
            <div className="text-sm">
              <p className="text-brand-sec/70">
                总练习{" "}
                <span className="t-h3 text-ink">{stats.total}</span>
              </p>
              <p className="mt-1 text-brand-sec/70">
                最近得分{" "}
                <span className="font-semibold text-success">
                  {stats.lastOverall ?? "—"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2 pt-6 text-xs text-brand-sec/50">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="block outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            回到顶部 ↑
          </button>
          <p>v1 · 本地运行</p>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 移动端：顶部导航条 */}
        <header className="flex items-center justify-between border-b border-white/40 bg-white/40 px-4 py-3 backdrop-blur-xl lg:hidden">
          <span className="t-h3 text-ink">言语表达训练</span>
          <nav className="flex gap-4 text-sm">
            {NAV.map((n) => {
              const active =
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={active ? "font-semibold text-brand" : "text-brand-sec/80"}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

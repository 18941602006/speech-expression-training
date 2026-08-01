"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SCENE_LABELS, type Scene, type Topic } from "@/lib/types";
import { ROLE_VARIANTS } from "@/lib/roles";
import { randomTopicForVariant } from "@/lib/topics";
import PracticeView from "@/components/PracticeView";

const VALID_SCENES = Object.keys(SCENE_LABELS) as Scene[];

interface CustomTemplate {
  name: string;
  desc: string;
}

function loadTemplates(): CustomTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("set-custom-templates") || "[]");
  } catch {
    return [];
  }
}

export default function ScenePage() {
  const params = useParams();
  const router = useRouter();
  const sceneParam = String(params.scene ?? "");
  const scene = (VALID_SCENES as string[]).includes(sceneParam)
    ? (sceneParam as Scene)
    : null;

  // 角色变体选择（非 custom 场景）
  const [variantId, setVariantId] = useState<string | null>(null);

  // 自定义方向：先收集用户设定的场景内容，再进入陪练
  const [started, setStarted] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [templates, setTemplates] = useState<CustomTemplate[]>(() =>
    loadTemplates(),
  );

  if (!scene) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="t-h2 text-ink">未找到该练习方向</h1>
        <p className="t-body mt-3 text-brand-sec/80">
          你访问的场景不存在，返回首页重新选择一个方向吧。
        </p>
        <Link href="/" className="btn btn-gradient mt-6 inline-block">
          ← 返回首页
        </Link>
      </main>
    );
  }

  // 自定义方向：渲染设定表单（含常用模板）
  if (scene === "custom" && !started) {
    function saveTemplate() {
      const n = customName.trim();
      const d = customDesc.trim();
      if (!n) {
        alert("先填写方向名称，再保存为常用方向。");
        return;
      }
      const next = [...templates.filter((t) => t.name !== n), { name: n, desc: d }];
      try {
        localStorage.setItem("set-custom-templates", JSON.stringify(next));
      } catch {
        /* localStorage 不可用时静默 */
      }
      setTemplates(next);
    }

    return (
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <button
          onClick={() => router.push("/")}
          className="mb-4 text-sm font-medium text-brand-sec/70 hover:text-ink"
        >
          ← 返回场景选择
        </button>

        {/* 活力头图 */}
        <header className="hero-grad anim-rise mb-6 rounded-[22px] p-8 shadow-[0_18px_50px_rgba(124,92,255,0.28)]">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ✏️ 自定义练习方向
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            设定你想练习的方向名称和具体场景，即可开启专属陪练。AI 会代入你描述的场景，引导你表达并实时分析。
          </p>
        </header>

        <section className="glass card-hover anim-rise p-6">
          <h2 className="t-h3 text-ink">开始设定你的方向</h2>
          <p className="t-body mt-2 text-sm text-brand-sec/80">
            填写后点击「开始练习」，即可进入与该方向匹配的陪练对话。
          </p>

          {/* 常用方向（本地模板，点击快速填充） */}
          {templates.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">常用方向</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCustomName(t.name);
                      setCustomDesc(t.desc);
                    }}
                    className="chip bg-white/60 text-brand transition hover:bg-white"
                    title={t.desc || "点击填充"}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="mt-4 block text-sm font-semibold text-ink">方向名称</label>
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="例如：销售谈判、相亲破冰、家长会发言…"
            className="input mt-2"
          />
          <label className="mt-4 block text-sm font-semibold text-ink">场景描述</label>
          <textarea
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            rows={3}
            placeholder="描述一下这个场景：你在哪、面对谁、想达成什么…"
            className="input mt-2 resize-none"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => setStarted(true)} className="btn btn-primary">
              开始练习 →
            </button>
            <button onClick={saveTemplate} className="btn btn-ghost">
              存为常用方向
            </button>
            <button onClick={() => router.push("/")} className="btn btn-ghost">
              取消
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 自定义方向：已设定 → 用用户内容构建题目并进入陪练
  if (scene === "custom") {
    const name = customName.trim();
    const desc = customDesc.trim();
    const customTopic: Topic = {
      title: name || "自定义练习",
      scenario: desc || "请围绕你设定的方向自由发挥。",
      prompt: `围绕「${name || "你设定的方向"}」展开一段表达，注意逻辑清晰、减少废话、贴合场景。`,
      focus: "把你描述的场景讲清楚，并保持自然的表达节奏。",
    };
    return (
      <PracticeView scene="custom" topic={customTopic} onBack={() => setStarted(false)} />
    );
  }

  // 非自定义场景：先选择角色变体
  if (!variantId) {
    const variants = ROLE_VARIANTS[scene];
    const label = SCENE_LABELS[scene];
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <button
          onClick={() => router.push("/")}
          className="mb-4 text-sm font-medium text-brand-sec/70 hover:text-ink"
        >
          ← 返回场景选择
        </button>

        {/* 活力头图 */}
        <header className="hero-grad anim-rise mb-6 rounded-[22px] p-8 shadow-[0_18px_50px_rgba(124,92,255,0.28)]">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {label} · 选择陪练角色
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            该方向下有 {variants.length} 种角色设定，挑一个最贴合你想练习的情境开始。
          </p>
        </header>

        <section className="glass card-hover anim-rise p-6">
          <h2 className="t-h3 text-ink">选择你的陪练角色</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className="glass-soft card-hover anim-rise flex flex-col p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                style={{ animationDelay: `${80 + i * 60}ms` }}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-xl shadow-[0_6px_16px_rgba(124,92,255,0.35)]">
                  {v.emoji}
                </div>
                <div className="t-h3 text-ink">{v.name}</div>
                <div className="t-body mt-2 flex-1 text-sm text-brand-sec/80">
                  {v.desc}
                </div>
                <div className="t-label mt-4 text-brand-sec/50">随机抽题开始 →</div>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  // 已选角色变体 → 进入陪练
  const initialTopic = randomTopicForVariant(scene, variantId);
  return (
    <PracticeView
      scene={scene}
      topic={initialTopic}
      roleVariantId={variantId}
      onBack={() => setVariantId(null)}
    />
  );
}

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SCENE_LABELS, type Scene, type Topic } from "@/lib/types";
import { randomPresetTopic } from "@/lib/topics";
import PracticeView from "@/components/PracticeView";

const VALID_SCENES = Object.keys(SCENE_LABELS) as Scene[];

export default function ScenePage() {
  const params = useParams();
  const router = useRouter();
  const sceneParam = String(params.scene ?? "");
  const scene = (VALID_SCENES as string[]).includes(sceneParam)
    ? (sceneParam as Scene)
    : null;

  // 自定义方向：先收集用户设定的场景内容，再进入陪练
  const [started, setStarted] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

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

  // 自定义方向：渲染设定表单
  if (scene === "custom" && !started) {
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
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStarted(true)}
              className="btn btn-primary"
            >
              开始练习 →
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

  // 其余四个方向：随机抽一题，直接进入陪练
  const initialTopic = randomPresetTopic(scene);
  return (
    <PracticeView scene={scene} topic={initialTopic} onBack={() => router.push("/")} />
  );
}

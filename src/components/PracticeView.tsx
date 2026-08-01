"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  SCENE_LABELS,
  type Scene,
  type Topic,
  type ScoreResult,
} from "@/lib/types";
import { ROLE_NAME, getRoleVariant } from "@/lib/roles";
import { randomTopicForVariant, PRESET_TOPICS } from "@/lib/topics";

type Msg = { role: "user" | "assistant"; content: string };

// 输入框高度上下限（px）：底边固定、顶边可拖，限制在一个合理范围内
const INPUT_MIN = 56;
const INPUT_MAX = 260;

// 问题编号的彩色圈数字：①红 ②琥珀 ③蓝 ④紫 ⑤青 ⑥粉 ⑦绿 ⑧橙 ⑨靛 ⑩青蓝
const CIRCLE_COLORS = [
  "bg-red-500",
  "bg-amber-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

function CircleNum({ n }: { n: number }) {
  const color = CIRCLE_COLORS[n % CIRCLE_COLORS.length];
  return (
    <sup
      className={`ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ${color} text-[10px] font-bold leading-none text-white align-super`}
    >
      {n + 1}
    </sup>
  );
}

export default function PracticeView({
  scene,
  topic: initialTopic,
  onBack,
  roleVariantId,
}: {
  scene: Scene;
  topic: Topic;
  onBack: () => void;
  roleVariantId?: string;
}) {
  const [topic, setTopic] = useState<Topic>(initialTopic);
  // 角色变体：选中后替换默认角色名与陪练设定
  const variant = getRoleVariant(scene, roleVariantId);
  const roleName = variant?.name ?? ROLE_NAME[scene];

  const [chat, setChat] = useState<Msg[]>([
    { role: "assistant", content: greetingFor(scene, initialTopic) },
  ]);
  // 与主对话等长的分析数组：下标 i 对应 chat[i]；仅用户消息有分析，其余为 null
  const [analyses, setAnalyses] = useState<(ScoreResult | null)[]>([null]);
  const [chatInput, setChatInput] = useState("");
  const [listening, setListening] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const [loadingTopic, setLoadingTopic] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputH, setInputH] = useState(72);

  // 自动滚动到最新：两栏都跟随内容底部
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);
  useEffect(() => {
    const el = analysisScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [analyses]);
  // 输入框：内容新增时自动滚动到底部，始终显示最新文字（与拖拽改高度互不干扰）
  useEffect(() => {
    const el = inputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatInput]);

  function greetingFor(s: Scene, t: Topic | null): string {
    const role = getRoleVariant(s, roleVariantId)?.name ?? ROLE_NAME[s];
    return (
      `我们开始陪练吧。我是今天的${role}。\n` +
      `题目：「${t?.title ?? "即兴练习"}」\n` +
      `情境：${t?.scenario ?? "请围绕该场景自由发挥"}\n\n` +
      `我会陪你对话、并引导你练习表达；每当你发一段话，右侧会实时分析你的表达、标出可省略的废话，并给出更好的说法。\n` +
      `你可以打字，也可以点 🎤 用语音说。先开口试试？`
    );
  }

  function resetPractice() {
    setChatInput("");
    setSavedOk(false);
    setSaveError(null);
    stopListen();
  }

  function loadTopic(t: Topic) {
    setTopic(t);
    setChat([{ role: "assistant", content: greetingFor(scene, t) }]);
    setAnalyses([null]);
    setSavedOk(false);
    resetPractice();
  }

  async function aiTopic() {
    if (chatBusy) return;
    setLoadingTopic(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "topic", scene }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "出题失败");
      loadTopic(data.topic as Topic);
    } catch (e) {
      alert(e instanceof Error ? e.message : "出题失败");
    } finally {
      setLoadingTopic(false);
    }
  }

  function newPresetTopic() {
    loadTopic(randomTopicForVariant(scene, roleVariantId));
  }

  // 拖拽调整输入框高度：输入框位于面板底部、底边固定，仅顶部手柄可拖（向上拉变高、向下拉变矮），并限制上下限
  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = inputH;
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startY; // 向下拖为正
      // 顶边手柄：向下拖变矮、向上拖变高（startH - dy）
      setInputH(Math.max(INPUT_MIN, Math.min(INPUT_MAX, startH - dy)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function toggleListen() {
    if (listening) {
      stopListen();
      return;
    }
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("当前浏览器不支持语音输入，请使用 Chrome / Edge，或改用打字。");
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev: any) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      setChatInput(text);
    };
    rec.onerror = () => stopListen();
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopListen() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    }
    setListening(false);
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatBusy) return;

    const userMsg: Msg = { role: "user", content: text };
    const next = [...chat, userMsg];
    const nextAnalyses: (ScoreResult | null)[] = [...analyses, null];
    const userIndex = next.length - 1;

    setChat(next);
    setAnalyses(nextAnalyses);
    setChatInput("");
    setChatBusy(true);

    try {
      const [chatData, scoreData] = await Promise.all([
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "chat", scene, topic, messages: next, rolePrompt: variant?.prompt }),
        }).then((r) => r.json()),
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "score", scene, topic, userInput: text, rolePrompt: variant?.prompt }),
        }).then((r) => r.json()),
      ]);

      const reply =
        (chatData.reply as string) || (chatData.error as string) || "（陪练无响应）";
      const result = (scoreData.result as ScoreResult | undefined) ?? null;

      setChat([...next, { role: "assistant", content: reply }]);
      setAnalyses((prev) => {
        const c = [...prev];
        c[userIndex] = result;
        c.push(null); // 对应即将追加的 AI 回复
        return c;
      });
    } catch {
      setChat([...next, { role: "assistant", content: "（连接出错，请重试）" }]);
      setAnalyses((prev) => {
        const c = [...prev];
        c[userIndex] = null;
        c.push(null);
        return c;
      });
    } finally {
      setChatBusy(false);
    }
  }

  async function saveExercise() {
    const last = [...analyses].reverse().find((a) => a) ?? null;
    if (!last) {
      setSaveError("还没有可保存的分析，先陪练几轮吧。");
      return;
    }
    const transcript = chat
      .map((m) => `${m.role === "user" ? "我" : "AI"}：${m.content}`)
      .join("\n");
    const userText = chat
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
    setSaveError(null);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          topicTitle: topic.title,
          topicPrompt: topic.prompt,
          userInput: userText,
          transcript,
          overall: last.overall,
          dimensions: last.dimensions,
          suggestions: last.suggestions,
          betterVersion: last.betterVersion,
          sentences: last.sentences,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setSavedOk(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-medium text-brand-sec/70 hover:text-ink"
      >
        ← 返回场景选择
      </button>

      <section className="glass anim-rise p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="t-h3 text-ink">{topic.title}</h2>
          <span className="chip bg-gradient-to-r from-brand to-brand-2 text-white">
            {SCENE_LABELS[scene]}
            {` · ${roleName}`}
          </span>
        </div>
        <p className="t-body mt-3 text-sm text-brand-sec/80">{topic.scenario}</p>
        <p className="t-body mt-2 text-sm text-ink">
          <span className="font-semibold">练习要求：</span>
          {topic.prompt}
        </p>
        <p className="t-body mt-2 text-sm text-brand-sec/80">
          <span className="font-semibold">关注点：</span>
          {topic.focus}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_TOPICS[scene].length > 0 && (
            <button onClick={newPresetTopic} className="btn btn-ghost">
              换一题（题库）
            </button>
          )}
          <button
            onClick={aiTopic}
            disabled={loadingTopic}
            className="btn btn-primary"
          >
            {loadingTopic ? "出题中…" : "AI 出题"}
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左栏：陪练对话 */}
        <section className="glass anim-rise flex h-[74vh] flex-col p-4" style={{ animationDelay: "40ms" }}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(124,92,255,0.3)]">
            陪练对话{` · ${roleName}`}
          </div>
          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg bg-white/40 p-3"
          >
            {chat.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_4px_12px_rgba(124,92,255,0.25)]"
                      : "bg-white/80 text-ink"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div className="flex items-center gap-2 text-xs text-brand-sec/70">
                <span className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                对方正在输入…
              </div>
            )}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <div className="group relative flex-1">
              {/* 顶部拖拽手柄：向上拉变高、向下拉变矮（底边固定，符合「顶部可调、下部无用」的预期） */}
              <div
                onMouseDown={(e) => startResize(e)}
                title="拖拽调整输入框高度（底边固定）"
                className="absolute -top-2 left-0 right-0 z-10 flex h-3 cursor-ns-resize items-center justify-center"
              >
                <span className="h-1 w-12 rounded-full bg-white/70 transition-colors group-hover:bg-brand" />
              </div>
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                style={{ height: inputH }}
                placeholder="说点什么，或点 🎤 语音输入（Enter 发送，Shift+Enter 换行）"
                className="input resize-none overflow-auto"
              />
            </div>
            <button
              onClick={toggleListen}
              className={`btn relative ${listening ? "btn-danger pulse-ring" : "btn-secondary"}`}
            >
              {listening ? "■ 停止" : "🎤 语音"}
            </button>
            <button
              onClick={sendChat}
              disabled={chatBusy || !chatInput.trim()}
              className="btn btn-primary"
            >
              发送
            </button>
          </div>
        </section>

        {/* 右栏：实时表达分析 */}
        <section className="glass anim-rise flex h-[74vh] flex-col p-4" style={{ animationDelay: "80ms" }}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-2 to-accent px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(255,94,156,0.3)]">
            实时表达分析
          </div>
          {/* 颜色图例：一眼区分原句 / 废话 / 建议 / 问题编号 */}
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-brand-sec/70">
              <span className="inline-block h-3 w-3 rounded bg-white/60 ring-1 ring-white/70" />
              原句
            </span>
            <span className="inline-flex items-center gap-1.5 text-danger">
              <span className="inline-block h-3 w-3 rounded bg-danger/15 ring-1 ring-danger/40" />
              废话（红色删除线）
            </span>
            <span className="inline-flex items-center gap-1.5 text-success">
              <span className="inline-block h-3 w-3 rounded bg-success/15 ring-1 ring-success/40" />
              建议说法（绿底）
            </span>
            <span className="inline-flex items-center gap-1.5 text-brand-sec/70">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                1
              </span>
              问题编号（彩色圈，对应下方建议）
            </span>
          </div>
          <div
            ref={analysisScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg bg-white/30 p-3"
          >
            {chat.map((m, i) => {
              if (m.role !== "user") return null;
              const turn = chat.slice(0, i + 1).filter((x) => x.role === "user").length;
              const a = analyses[i];
              return (
                <div key={i} className="glass-soft anim-pop p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-sec">
                      第 {turn} 轮 · 你的表达
                    </span>
                    {a && <span className="text-xs font-semibold text-brand">{a.overall}/10</span>}
                  </div>
                  {!a ? (
                    <p className="mt-2 text-xs text-brand-sec/50">分析中…</p>
                  ) : (
                    <>
                      {a.sentences.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {a.sentences.map((s, si) => {
                            const wastes = s.segments.filter((x) => x.isWaste);
                            const hasWaste = wastes.length > 0;
                            const clean = s.segments
                              .filter((x) => !x.isWaste)
                              .map((x) => x.text)
                              .join("");
                            // 给每个废话片段分配连续编号（句内从 0 开始），用于原句与建议一一对应
                            const wasteOrder = new Map<number, number>();
                            let wi = 0;
                            s.segments.forEach((seg, j) => {
                              if (seg.isWaste) {
                                wasteOrder.set(j, wi);
                                wi += 1;
                              }
                            });
                            return (
                              <div key={si} className="rounded-lg border border-white/50 bg-white/40 p-2">
                                {/* 原句：废话红色删除线，右上角彩色圈数字标出问题编号 */}
                                <p className="t-label mb-1 text-brand-sec/50">原句</p>
                                <p className="flex flex-wrap gap-0 text-sm leading-relaxed text-ink">
                                  {s.segments.map((seg, j) =>
                                    seg.isWaste ? (
                                      <span key={j}>
                                        <span
                                          title={seg.reason || "可省略"}
                                          className="rounded bg-danger/10 px-0.5 text-danger line-through decoration-danger decoration-2"
                                        >
                                          {seg.text}
                                        </span>
                                        {wasteOrder.has(j) && (
                                          <CircleNum n={wasteOrder.get(j)!} />
                                        )}
                                      </span>
                                    ) : (
                                      <span key={j}>{seg.text}</span>
                                    ),
                                  )}
                                </p>
                                {/* 建议说法：去掉废话后的干净版本，绿底对照 */}
                                {hasWaste && (
                                  <div className="mt-2 rounded-lg bg-success/10 p-2">
                                    <p className="t-label mb-1 text-success">建议说法（去掉废话）</p>
                                    <p className="text-sm leading-relaxed text-ink">
                                      {clean}
                                    </p>
                                  </div>
                                )}
                                {s.comment && (
                                  <p className="mt-2 text-xs text-brand-sec/80">
                                    点评：{s.comment}
                                  </p>
                                )}
                                {/* 逐条建议：彩色圈数字与上方原句一一对应 */}
                                {hasWaste && (
                                  <ul className="mt-2 space-y-1 text-xs">
                                    {wastes.map((seg, j) => (
                                      <li key={j} className="flex items-start gap-1.5">
                                        <CircleNum n={j} />
                                        <span className="text-brand-sec/90">
                                          <span className="font-semibold text-danger">
                                            可省略「{seg.text}」
                                          </span>
                                          {seg.reason ? (
                                            <span className="text-brand-sec/60"> — {seg.reason}</span>
                                          ) : null}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {a.suggestions.length > 0 && (
                        <div className="mt-3">
                          <p className="t-label text-warning">💡 整体改进建议</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-sec/80">
                            {a.suggestions.map((s, i2) => (
                              <li key={i2}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {a.betterVersion && (
                        <div className="mt-3">
                          <p className="t-h3 text-success">更好的说法（整体重写）</p>
                          <p className="t-body mt-2 rounded-lg bg-success/10 p-3 text-ink">
                            {a.betterVersion}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {savedOk ? (
          <span className="text-sm font-medium text-success">✓ 已保存到练习历史</span>
        ) : (
          <button onClick={saveExercise} className="btn btn-secondary">
            结束并保存本次练习
          </button>
        )}
        {saveError && <span className="text-sm font-medium text-danger">{saveError}</span>}
      </div>
    </main>
  );
}

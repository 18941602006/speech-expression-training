"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import {
  SCENE_LABELS,
  type Scene,
  type Topic,
  type ScoreResult,
} from "@/lib/types";
import { ROLE_NAME } from "@/lib/roles";
import { randomPresetTopic, PRESET_TOPICS } from "@/lib/topics";

type View = "home" | "practice";
type Msg = { role: "user" | "assistant"; content: string };

const SCENE_DESC: Record<Scene, string> = {
  speech: "上台、汇报、宣讲",
  communication: "聊天、表达、化解冲突",
  interview: "面试、向上沟通、谈判",
  debate: "立论、反驳、攻防",
};

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

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [scene, setScene] = useState<Scene | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);

  const [chat, setChat] = useState<Msg[]>([]);
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
    const role = ROLE_NAME[s];
    return (
      `我们开始陪练吧。我是今天的${role}。\n` +
      `题目：「${t?.title ?? "即兴练习"}」\n` +
      `情境：${t?.scenario ?? "请围绕该场景自由发挥"}\n\n` +
      `我会陪你对话、并引导你练习表达；每当你发一段话，右侧会实时分析你的表达、标出可省略的废话，并给出更好的说法。\n` +
      `你可以打字，也可以点 🎤 用语音说。先开口试试？`
    );
  }

  function pickScene(s: Scene) {
    const t = randomPresetTopic(s);
    setScene(s);
    setTopic(t);
    setChat([{ role: "assistant", content: greetingFor(s, t) }]);
    setAnalyses([null]);
    setChatInput("");
    setSavedOk(false);
    setSaveError(null);
    stopListen();
    setView("practice");
  }

  function resetPractice() {
    setChat([]);
    setAnalyses([null]);
    setChatInput("");
    setSavedOk(false);
    setSaveError(null);
    stopListen();
  }

  function backHome() {
    setView("home");
    setScene(null);
    setTopic(null);
    resetPractice();
  }

  async function aiTopic() {
    if (!scene) return;
    setLoadingTopic(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "topic", scene }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "出题失败");
      const t = data.topic as Topic;
      setTopic(t);
      setChat([{ role: "assistant", content: greetingFor(scene, t) }]);
      setAnalyses([null]);
      setSavedOk(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "出题失败");
    } finally {
      setLoadingTopic(false);
    }
  }

  function newPresetTopic() {
    if (!scene) return;
    const t = randomPresetTopic(scene);
    setTopic(t);
    setChat([{ role: "assistant", content: greetingFor(scene, t) }]);
    setAnalyses([null]);
    setSavedOk(false);
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
    if (!text || !scene || !topic || chatBusy) return;

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
          body: JSON.stringify({ mode: "chat", scene, topic, messages: next }),
        }).then((r) => r.json()),
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "score", scene, topic, userInput: text }),
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
    if (!scene || !topic || !last) {
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

  if (view === "home") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#141414]">言语表达训练</h1>
          <p className="mt-3 text-zinc-600">
            选一个场景，进入陪练。AI 扮演角色与你对话、引导你表达，右侧实时分析你的每句话。
          </p>
          <Link href="/history" className="mt-3 inline-block text-sm text-[#1856FF] hover:underline">
            查看练习历史 →
          </Link>
        </header>

        {/* 教练系统入口 */}
        <section className="glass mb-8 rounded-3xl p-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-[#141414]">🎯 教练系统</h2>
              <p className="mt-1 max-w-xl text-sm text-zinc-600">
                根据你的历史练习数据，自动分析强弱项、动态调整难度，生成专属训练方案。
              </p>
            </div>
            <Link
              href="/coach"
              className="shrink-0 rounded-lg bg-[#1856FF] px-4 py-2 text-sm text-white transition hover:bg-[#0f3fd6]"
            >
              进入教练系统 →
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(Object.keys(SCENE_LABELS) as Scene[]).map((s) => (
            <button
              key={s}
              onClick={() => pickScene(s)}
              className="glass rounded-3xl p-6 text-left transition hover:border-white hover:shadow-lg"
            >
              <div className="text-lg font-semibold text-[#141414]">{SCENE_LABELS[s]}</div>
              <div className="mt-1 text-sm text-zinc-500">{SCENE_DESC[s]}</div>
              <div className="mt-3 text-xs text-zinc-400">
                内置 {PRESET_TOPICS[s].length} 道预设题，可 AI 扩展
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <button onClick={backHome} className="mb-4 text-sm text-zinc-500 hover:text-zinc-800">
        ← 返回场景选择
      </button>

      {topic && (
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#141414]">{topic.title}</h2>
            <span className="rounded-full bg-white/60 px-3 py-1 text-xs text-[#1856FF]">
              {scene ? SCENE_LABELS[scene] : ""}
              {scene ? ` · ${ROLE_NAME[scene]}` : ""}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">{topic.scenario}</p>
          <p className="mt-1 text-sm text-zinc-800">
            <span className="font-medium">练习要求：</span>
            {topic.prompt}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="font-medium">关注点：</span>
            {topic.focus}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={newPresetTopic}
              className="rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-white/70"
            >
              换一题（题库）
            </button>
            <button
              onClick={aiTopic}
              disabled={loadingTopic}
              className="rounded-lg bg-[#1856FF] px-3 py-1.5 text-sm text-white transition hover:bg-[#0f3fd6] disabled:opacity-50"
            >
              {loadingTopic ? "出题中…" : "AI 出题"}
            </button>
          </div>
        </section>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左栏：陪练对话 */}
        <section className="glass flex h-[74vh] flex-col rounded-3xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-800">
            陪练对话{scene ? ` · ${ROLE_NAME[scene]}` : ""}
          </h3>
          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/30 p-3"
          >
            {chat.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-[#1856FF] text-white"
                      : "bg-white/70 text-zinc-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatBusy && <div className="text-xs text-zinc-500">对方正在输入…</div>}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <div className="group relative flex-1">
              {/* 顶部拖拽手柄：向上拉变高、向下拉变矮（底边固定，符合「顶部可调、下部无用」的预期） */}
              <div
                onMouseDown={(e) => startResize(e)}
                title="拖拽调整输入框高度（底边固定）"
                className="absolute -top-2 left-0 right-0 z-10 flex h-3 cursor-ns-resize items-center justify-center"
              >
                <span className="h-1 w-12 rounded-full bg-white/70 transition-colors group-hover:bg-[#1856FF]" />
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
                className="w-full resize-none overflow-auto rounded-lg border border-white/60 bg-white/40 p-2 text-sm text-zinc-800 outline-none focus:border-[#1856FF]"
              />
            </div>
            <button
              onClick={toggleListen}
              className={`rounded-lg px-3 py-2 text-sm text-white transition ${
                listening ? "bg-[#EA2143] hover:bg-[#c01a39]" : "bg-[#3A344E] hover:bg-[#2a2638]"
              }`}
            >
              {listening ? "■ 停止" : "🎤 语音"}
            </button>
            <button
              onClick={sendChat}
              disabled={chatBusy || !chatInput.trim()}
              className="rounded-lg bg-[#1856FF] px-4 py-2 text-sm text-white transition hover:bg-[#0f3fd6] disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </section>

        {/* 右栏：实时表达分析 */}
        <section className="glass flex h-[74vh] flex-col rounded-3xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-800">实时表达分析</h3>
          {/* 颜色图例：一眼区分原句 / 废话 / 建议 / 问题编号 */}
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <span className="inline-block h-3 w-3 rounded bg-white/60 ring-1 ring-white/70" />
              原句
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#EA2143]">
              <span className="inline-block h-3 w-3 rounded bg-red-100 ring-1 ring-red-300" />
              废话（红色删除线）
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#07CA6B]">
              <span className="inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />
              建议说法（绿底）
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                1
              </span>
              问题编号（彩色圈，对应下方建议）
            </span>
          </div>
          <div
            ref={analysisScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/30 p-3"
          >
            {chat.map((m, i) => {
              if (m.role !== "user") return null;
              const turn = chat.slice(0, i + 1).filter((x) => x.role === "user").length;
              const a = analyses[i];
              return (
                <div
                  key={i}
                  className="glass-soft rounded-2xl p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-700">
                      第 {turn} 轮 · 你的表达
                    </span>
                    {a && <span className="text-xs text-[#1856FF]">{a.overall}/10</span>}
                  </div>
                  {!a ? (
                    <p className="mt-2 text-xs text-zinc-400">分析中…</p>
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
                              <div key={si} className="rounded-2xl border border-white/50 bg-white/40 p-2">
                                {/* 原句：废话红色删除线，右上角彩色圈数字标出问题编号 */}
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                  原句
                                </p>
                                <p className="flex flex-wrap gap-0 text-sm leading-relaxed text-zinc-800">
                                  {s.segments.map((seg, j) =>
                                    seg.isWaste ? (
                                      <span key={j}>
                                        <span
                                          title={seg.reason || "可省略"}
                                          className="rounded bg-red-100 px-0.5 text-[#EA2143] line-through decoration-red-400 decoration-2"
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
                                  <div className="mt-2 rounded-xl bg-emerald-100/70 p-2">
                                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                      建议说法（去掉废话）
                                    </p>
                                    <p className="text-sm leading-relaxed text-emerald-900">
                                      {clean}
                                    </p>
                                  </div>
                                )}
                                {s.comment && (
                                  <p className="mt-1.5 text-xs text-zinc-500">
                                    点评：{s.comment}
                                  </p>
                                )}
                                {/* 逐条建议：彩色圈数字与上方原句一一对应 */}
                                {hasWaste && (
                                  <ul className="mt-1.5 space-y-1 text-xs">
                                    {wastes.map((seg, j) => (
                                      <li key={j} className="flex items-start gap-1.5">
                                        <CircleNum n={j} />
                                        <span className="text-zinc-700">
                                          <span className="font-medium text-[#EA2143]">
                                            可省略「{seg.text}」
                                          </span>
                                          {seg.reason ? (
                                            <span className="text-zinc-500"> — {seg.reason}</span>
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
                        <div className="mt-2">
                          <p className="text-xs font-medium text-amber-700">💡 整体改进建议</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-zinc-600">
                            {a.suggestions.map((s, i2) => (
                              <li key={i2}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {a.betterVersion && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-emerald-700">更好的说法（整体重写）</p>
                          <p className="mt-1 rounded-xl bg-emerald-100/70 p-2 text-sm leading-relaxed text-emerald-900">
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
          <span className="text-sm text-[#07CA6B]">✓ 已保存到练习历史</span>
        ) : (
          <button
            onClick={saveExercise}
            className="rounded-lg bg-[#3A344E] px-4 py-1.5 text-sm text-white transition hover:bg-[#2a2638]"
          >
            结束并保存本次练习
          </button>
        )}
        {saveError && <span className="text-sm text-[#EA2143]">{saveError}</span>}
      </div>
    </main>
  );
}

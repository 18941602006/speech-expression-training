"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  SCENE_LABELS,
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  type Scene,
  type Topic,
  type ScoreResult,
} from "@/lib/types";
import { randomPresetTopic, PRESET_TOPICS } from "@/lib/topics";

type View = "home" | "practice";

const SCENE_DESC: Record<Scene, string> = {
  speech: "上台、汇报、宣讲",
  communication: "聊天、表达、化解冲突",
  interview: "面试、向上沟通、谈判",
  debate: "立论、反驳、攻防",
};

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [scene, setScene] = useState<Scene | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);

  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [chatMode, setChatMode] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function pickScene(s: Scene) {
    setScene(s);
    setTopic(randomPresetTopic(s));
    setView("practice");
    resetPractice();
  }

  function resetPractice() {
    setInputText("");
    setScore(null);
    setScoreError(null);
    setChatMode(false);
    setChat([]);
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
      setTopic(data.topic as Topic);
      resetPractice();
    } catch (e) {
      alert(e instanceof Error ? e.message : "出题失败");
    } finally {
      setLoadingTopic(false);
    }
  }

  function newPresetTopic() {
    if (!scene) return;
    setTopic(randomPresetTopic(scene));
    resetPractice();
  }

  function toggleListen() {
    if (listening) {
      stopListen();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      setInputText(text);
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

  async function submitScore() {
    if (!scene || !topic) return;
    if (!inputText.trim()) {
      alert("请先输入或语音录入你的表达。");
      return;
    }
    setLoadingScore(true);
    setScoreError(null);
    setScore(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "score",
          scene,
          topic,
          userInput: inputText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "评分失败");
      setScore(data.result as ScoreResult);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "评分失败");
    } finally {
      setLoadingScore(false);
    }
  }

  function enterChat() {
    setChatMode(true);
    setScore(null);
    setChat([
      {
        role: "assistant",
        content: `我们开始陪练吧。题目是「${topic?.title}」，情境：${topic?.scenario}。先说说你的想法？`,
      },
    ]);
  }

  async function sendChat() {
    if (!chatInput.trim() || !scene || !topic) return;
    const next = [...chat, { role: "user" as const, content: chatInput.trim() }];
    setChat(next);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          scene,
          topic,
          messages: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "陪练失败");
      setChat([...next, { role: "assistant", content: data.reply as string }]);
    } catch (e) {
      setChat([
        ...next,
        { role: "assistant", content: e instanceof Error ? e.message : "陪练失败" },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function saveExercise() {
    if (!scene || !topic || !score) return;
    setSaveError(null);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          topicTitle: topic.title,
          topicPrompt: topic.prompt,
          userInput: inputText,
          overall: score.overall,
          dimensions: score.dimensions,
          suggestions: score.suggestions,
          betterVersion: score.betterVersion,
          sentences: score.sentences,
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">言语表达训练</h1>
          <p className="mt-3 text-zinc-500">选一个场景，开始练习。AI 出题、评分、陪练，还能教你更好的说法。</p>
          <Link href="/history" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
            查看练习历史 →
          </Link>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(Object.keys(SCENE_LABELS) as Scene[]).map((s) => (
            <button
              key={s}
              onClick={() => pickScene(s)}
              className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md"
            >
              <div className="text-lg font-semibold text-zinc-900">{SCENE_LABELS[s]}</div>
              <div className="mt-1 text-sm text-zinc-500">{SCENE_DESC[s]}</div>
              <div className="mt-3 text-xs text-zinc-400">内置 {PRESET_TOPICS[s].length} 道预设题，可 AI 扩展</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <button onClick={backHome} className="mb-4 text-sm text-zinc-500 hover:text-zinc-800">
        ← 返回场景选择
      </button>

      {topic && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900">{topic.title}</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
              {scene ? SCENE_LABELS[scene] : ""}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">{topic.scenario}</p>
          <p className="mt-2 text-sm text-zinc-800">
            <span className="font-medium">练习要求：</span>
            {topic.prompt}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            <span className="font-medium">关注点：</span>
            {topic.focus}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={newPresetTopic}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              换一题（题库）
            </button>
            <button
              onClick={aiTopic}
              disabled={loadingTopic}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingTopic ? "出题中…" : "AI 出题"}
            </button>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-zinc-700">你的表达</label>
        <textarea
          ref={taRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={6}
          placeholder="在这里输入你的表达，或点下方麦克风语音输入…"
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm text-zinc-800 outline-none focus:border-indigo-400"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={toggleListen}
            className={`rounded-lg px-3 py-1.5 text-sm text-white ${
              listening ? "bg-red-500 hover:bg-red-600" : "bg-zinc-700 hover:bg-zinc-800"
            }`}
          >
            {listening ? "■ 停止录音" : "🎤 语音输入"}
          </button>
          <span className="text-xs text-zinc-400">{inputText.length} 字</span>
          {!chatMode && (
            <button
              onClick={submitScore}
              disabled={loadingScore}
              className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingScore ? "评分中…" : "提交评分"}
            </button>
          )}
          {!chatMode && (
            <button
              onClick={enterChat}
              className="rounded-lg border border-indigo-300 px-4 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"
            >
              进入陪练 →
            </button>
          )}
        </div>
        {scoreError && <p className="mt-3 text-sm text-red-600">{scoreError}</p>}
      </section>

      {score && !chatMode && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-indigo-600">{score.overall}</span>
            <span className="text-sm text-zinc-500">/ 10 综合评分</span>
          </div>
          <div className="mt-4 space-y-2">
            {DIMENSION_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-zinc-600">{DIMENSION_LABELS[k]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${score.dimensions[k] * 10}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm text-zinc-700">{score.dimensions[k]}</span>
              </div>
            ))}
          </div>
          {score.sentences && score.sentences.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-zinc-800">逐句分析</h3>
              <p className="mt-1 text-xs text-zinc-400">
                橙色高亮为可省略的废话 / 填充词，鼠标悬停看原因。
              </p>
              <div className="mt-3 space-y-3">
                {score.sentences.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div className="flex gap-2">
                      <span className="mt-0.5 text-xs font-medium text-zinc-400">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm leading-relaxed text-zinc-800">
                        {s.segments.map((seg, j) =>
                          seg.isWaste ? (
                            <span
                              key={j}
                              title={seg.reason || "可省略"}
                              className="rounded bg-orange-100 px-0.5 text-orange-700"
                            >
                              {seg.text}
                            </span>
                          ) : (
                            <span key={j}>{seg.text}</span>
                          ),
                        )}
                      </p>
                    </div>
                    {s.comment && (
                      <p className="mt-1 pl-5 text-xs text-zinc-500">点评：{s.comment}</p>
                    )}
                    {s.segments.some((seg) => seg.isWaste) && (
                      <ul className="mt-1 space-y-0.5 pl-5 text-xs text-orange-600">
                        {s.segments
                          .filter((seg) => seg.isWaste)
                          .map((seg, j) => (
                            <li key={j}>
                              ⚠ 可省略「{seg.text}」{seg.reason ? ` — ${seg.reason}` : ""}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-zinc-800">改进建议</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {score.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          {score.betterVersion && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-zinc-800">更好的示范表达</h3>
              <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                {score.betterVersion}
              </p>
            </div>
          )}
          <div className="mt-5">
            {savedOk ? (
              <span className="text-sm text-emerald-600">✓ 已保存到练习历史</span>
            ) : (
              <button
                onClick={saveExercise}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                保存本次练习
              </button>
            )}
            {saveError && <span className="ml-3 text-sm text-red-600">{saveError}</span>}
          </div>
        </section>
      )}

      {chatMode && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-800">陪练对话</h3>
            <button
              onClick={() => setChatMode(false)}
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              退出陪练
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-zinc-50 p-3">
            {chat.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-zinc-800 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatBusy && <div className="text-xs text-zinc-400">对方正在输入…</div>}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder="说点什么…"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={sendChat}
              disabled={chatBusy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

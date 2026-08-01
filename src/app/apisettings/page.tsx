"use client";

import { useEffect, useState } from "react";

type Status = "untested" | "connected" | "error";
interface ConfigView {
  id: number;
  name: string;
  endpoint: string;
  apiKeyMask: string;
  model: string | null;
  models: string[];
  status: Status;
  lastError: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EMPTY = { id: null as number | null, name: "", endpoint: "", apiKey: "", model: "" };

const statusStyle: Record<Status, { label: string; cls: string }> = {
  connected: { label: "已连接", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  error: { label: "连接异常", cls: "bg-rose-50 text-rose-600 border-rose-200" },
  untested: { label: "未测试", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ApiSettingsPage() {
  const [configs, setConfigs] = useState<ConfigView[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [models, setModels] = useState<string[]>([]);
  const [test, setTest] = useState<{ loading: boolean; ok?: boolean; msg: string }>({ loading: false, msg: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = form.id !== null;

  async function load() {
    const r = await fetch("/api/apisettings");
    const d = await r.json();
    setConfigs(d.configs || []);
  }
  useEffect(() => {
    load();
  }, []);

  function startEdit(c: ConfigView) {
    setForm({ id: c.id, name: c.name, endpoint: c.endpoint, apiKey: "", model: c.model || "" });
    setModels(c.models || []);
    setTest({ loading: false, msg: "" });
    setError("");
  }
  function resetForm() {
    setForm(EMPTY);
    setModels([]);
    setTest({ loading: false, msg: "" });
    setError("");
  }

  async function runTest() {
    if (!form.endpoint || !form.apiKey) {
      setError("测试前请先填写 Endpoint 与 API Key");
      return;
    }
    setTest({ loading: true, msg: "" });
    setError("");
    try {
      const r = await fetch("/api/apisettings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: form.endpoint,
          apiKey: form.apiKey,
          model: form.model || undefined,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        const ms: string[] = d.models || [];
        setModels(ms);
        setForm((f) => ({ ...f, model: f.model || ms[0] || "" }));
        setTest({
          loading: false,
          ok: true,
          msg: ms.length
            ? `连接成功，发现 ${ms.length} 个可用模型，已帮你选中第一个`
            : "连接成功，但该接口未返回模型列表（可手动填写模型名）",
        });
      } else {
        setTest({ loading: false, ok: false, msg: d.error || "连接失败" });
      }
    } catch (e) {
      setTest({ loading: false, ok: false, msg: e instanceof Error ? e.message : "请求异常" });
    }
  }

  async function save() {
    if (!form.endpoint || !form.apiKey) {
      setError("Endpoint 与 API Key 均为必填");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      endpoint: form.endpoint,
      apiKey: form.apiKey,
      model: form.model,
      models,
    };
    let targetId = form.id;
    try {
      const r = form.id
        ? await fetch("/api/apisettings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: form.id, ...payload }),
          })
        : await fetch("/api/apisettings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "保存失败");
        setSaving(false);
        return;
      }
      const data = await r.json().catch(() => ({}));
      if (targetId == null && data.id) targetId = data.id;
      if (targetId != null) {
        await fetch("/api/apisettings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetId,
            models,
            status: test.ok ? "connected" : "untested",
            lastError: test.ok ? null : test.msg || null,
          }),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存异常");
      setSaving(false);
      return;
    }
    setSaving(false);
    resetForm();
    load();
  }

  async function activate(id: number) {
    await fetch("/api/apisettings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }
  async function remove(id: number) {
    if (!window.confirm("确定删除该 AI 配置？删除后若它是当前使用的配置，将自动切换到最近一条。")) return;
    await fetch("/api/apisettings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const inputCls =
    "w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 focus:ring-brand/50 placeholder:text-brand-sec/40";
  const btnPrimary =
    "rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(124,92,255,0.35)] outline-none transition hover:opacity-90 disabled:opacity-50";
  const btnGhost =
    "rounded-xl border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-brand-sec outline-none transition hover:bg-white/80";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="t-h3 text-ink">AI 设置</h1>
        <p className="mt-1 text-sm text-brand-sec/70">
          在这里接入你自己的 AI API。配置仅保存在<strong>你本机</strong>的数据库中，密钥以加密形式存储，页面上只显示掩码。配置后全站出题、评分、陪练将自动使用你的 Key。
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-white/60 bg-white/55 p-5 backdrop-blur-xl shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-brand">
          {editing ? "编辑配置" : "新增配置"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-brand-sec/70">配置名称（可选）</span>
            <input
              className={inputCls}
              placeholder="如：我的 DeepSeek"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-brand-sec/70">API 地址（Endpoint）</span>
            <input
              className={inputCls}
              placeholder="https://api.deepseek.com/v1"
              value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-brand-sec/70">API 密钥（API Key）</span>
            <input
              className={inputCls}
              type="password"
              autoComplete="off"
              placeholder={editing ? "留空则保留原密钥" : "sk-..."}
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-brand-sec/70">
              模型名称（可选，点测试可自动拉取）
            </span>
            <input
              className={inputCls}
              placeholder="deepseek-chat"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              list="model-list"
            />
            {models.length > 0 && (
              <datalist id="model-list">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
        )}
        {test.msg && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              test.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {test.loading ? "正在测试连接…" : test.msg}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={runTest} disabled={test.loading}>
            {test.loading ? "测试中…" : "测试连接"}
          </button>
          <button className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? "保存中…" : editing ? "保存修改" : "保存配置"}
          </button>
          {editing && (
            <button className={btnGhost} onClick={resetForm}>
              取消编辑
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-brand">已保存的配置</h2>
        {configs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/60 bg-white/40 px-4 py-6 text-center text-sm text-brand-sec/50">
            还没有任何配置。在上方填写并保存你的第一个 AI 配置吧。
          </p>
        ) : (
          <div className="space-y-3">
            {configs.map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 backdrop-blur-xl shadow-sm ${
                  c.isActive ? "border-brand/50 bg-white/70" : "border-white/60 bg-white/45"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{c.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${statusStyle[c.status].cls}`}
                    >
                      {statusStyle[c.status].label}
                    </span>
                    {c.isActive && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand">
                        当前使用
                      </span>
                    )}
                  </div>
                  {c.lastError && c.status === "error" && (
                    <span className="text-[11px] text-rose-500">{c.lastError}</span>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-xs text-brand-sec/70">
                  <p>
                    <span className="text-brand-sec/50">地址：</span>
                    {c.endpoint}
                  </p>
                  <p>
                    <span className="text-brand-sec/50">密钥：</span>
                    <code className="rounded bg-white/60 px-1">{c.apiKeyMask}</code>
                  </p>
                  <p>
                    <span className="text-brand-sec/50">模型：</span>
                    {c.model || "（未指定）"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!c.isActive && (
                    <button className={btnGhost} onClick={() => activate(c.id)}>
                      设为当前使用
                    </button>
                  )}
                  <button className={btnGhost} onClick={() => startEdit(c)}>
                    编辑
                  </button>
                  <button className={btnGhost} onClick={() => remove(c.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

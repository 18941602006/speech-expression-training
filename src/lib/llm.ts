import { getActiveConfig, type ResolvedApiConfig } from "./db";

const ENV_ENDPOINT = "https://api.deepseek.com/v1";
const ENV_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class MissingKeyError extends Error {
  constructor() {
    super("MISSING_API_KEY");
    this.name = "MissingKeyError";
  }
}

/** 把用户填写的 base URL 规范化为 chat/completions 完整地址 */
function normalizeEndpoint(endpoint: string): string {
  const u = endpoint.trim();
  if (!u) return `${ENV_ENDPOINT}/chat/completions`;
  if (u.endsWith("/chat/completions")) return u;
  return u.replace(/\/+$/, "") + "/chat/completions";
}

/**
 * 调用 AI。优先级：cfgOverride > 数据库中的「当前使用」配置 > 环境变量默认（DeepSeek）。
 * 这样用户只要在「AI 设置」里配置过，全站出题/评分/陪练就自动改用他的 Key。
 */
export async function callLLM(
  messages: ChatMessage[],
  opts?: { json?: boolean; temperature?: number },
  cfgOverride?: ResolvedApiConfig,
): Promise<string> {
  const cfg: ResolvedApiConfig =
    cfgOverride ??
    (await getActiveConfig()) ??
    {
      endpoint: ENV_ENDPOINT,
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      model: ENV_MODEL,
    };

  const key = cfg.apiKey;
  if (!key) throw new MissingKeyError();

  const url = normalizeEndpoint(cfg.endpoint);
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: opts?.temperature ?? 0.7,
  };
  if (opts?.json) body.response_format = { type: "json_object" };

  let lastErr: unknown;
  // 偶发传输/编码损坏会让回复里混入 U+FFFD 替换符，重试一次可规避
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI API ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const content = data.choices[0].message.content;
      if (content.includes("�") && attempt === 0) continue;
      return content;
    } catch (e) {
      if (e instanceof MissingKeyError) throw e;
      lastErr = e;
      if (attempt === 0) continue;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AI 调用失败");
}

/**
 * 连接测试：优先请求 OpenAI 兼容的 /models 接口拉取模型列表；
 * 若该接口不可用，则发一个最小的 chat 请求验证 key 是否有效。
 */
export async function testConnection(
  endpoint: string,
  apiKey: string,
  model?: string,
): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const base = endpoint.trim().replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: { id?: string }[] };
      const models = (data.data || [])
        .map((m) => m.id)
        .filter(Boolean) as string[];
      return { ok: true, models };
    }
  } catch {
    /* 忽略，走兜底 */
  }

  const guess = model?.trim()
    ? model.trim()
    : base.includes("deepseek")
      ? "deepseek-chat"
      : base.includes("openai")
        ? "gpt-3.5-turbo"
        : "default";
  try {
    const res = await fetch(normalizeEndpoint(base), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: guess,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
    });
    if (res.ok) return { ok: true, models: [] };
    const text = await res.text();
    return { ok: false, error: `连接失败 ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "连接异常" };
  }
}

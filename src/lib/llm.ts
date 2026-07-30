const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class MissingKeyError extends Error {
  constructor() {
    super("MISSING_DEEPSEEK_KEY");
    this.name = "MissingKeyError";
  }
}

export async function callDeepSeek(
  messages: ChatMessage[],
  opts?: { json?: boolean; temperature?: number },
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new MissingKeyError();

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: opts?.temperature ?? 0.7,
  };
  if (opts?.json) body.response_format = { type: "json_object" };

  let lastErr: unknown;
  // 偶发传输/编码损坏会让回复里混入 U+FFFD 替换符，重试一次可规避
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 300)}`);
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
  throw lastErr instanceof Error ? lastErr : new Error("DeepSeek 调用失败");
}

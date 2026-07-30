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
  return data.choices[0].message.content;
}

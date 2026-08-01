import { callDeepSeek, MissingKeyError, type ChatMessage } from "@/lib/llm";
import { SCENE_LABELS, type Scene, type Topic, type ScoreResult } from "@/lib/types";
import { ROLE_PROMPT } from "@/lib/roles";

export const runtime = "nodejs";

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return t;
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(stripFences(s)) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const mode = body.mode;
  try {
    if (mode === "topic") {
      const scene = (body.scene as Scene) || "speech";
      const label = SCENE_LABELS[scene] || scene;
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "你是一位语言表达训练教练。请根据指定场景，生成一个具体的练习题目。" +
            "只返回一个 JSON 对象，不要任何解释，格式：{" +
            '"title": 题目名, "scenario": 场景描述, "prompt": 给用户的具体练习指令, "focus": 本次练习应关注的要点}',
        },
        {
          role: "user",
          content: `场景：${label}。请生成一个有挑战性、贴近真实生活的练习题目。`,
        },
      ];
      const raw = await callDeepSeek(messages, { json: true, temperature: 0.9 });
      const topic = safeParse<Topic>(raw, {
        title: "即兴练习",
        scenario: "请围绕该场景自由发挥。",
        prompt: "用 1-2 分钟进行一段表达练习。",
        focus: "结构与逻辑、用词、场景贴合",
      });
      return Response.json({ topic });
    }

    if (mode === "score") {
      const scene = (body.scene as Scene) || "speech";
      const label = SCENE_LABELS[scene] || scene;
      const topic = (body.topic as Topic) || ({} as Topic);
      const userInput = String(body.userInput || "");
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "你是一位严格且善于鼓励的表达训练教练。请对用户的一段表达进行评分与反馈。" +
            "只返回一个 JSON 对象，不要任何解释，格式：{" +
            '"overall": 总体评分(1-10的整数),' +
            '"dimensions": {' +
            '"structure": 结构与逻辑(1-10),' +
            '"wording": 用词与精准(1-10),' +
            '"filler": 填充词控制(1-10，越高表示越少“嗯/啊/那个”等),' +
            '"fit": 场景贴合(1-10),' +
            '"fluency": 流畅与节奏(1-10),' +
            '"verbose": 啰嗦词控制(1-10，越高表示越少“那个”、重复词等啰嗦表达)' +
            "}," +
            '"sentences": [{' +
            '"index": 句序号(从1开始),' +
            '"segments": [{"text": 片段原文, "isWaste": 布尔(该片段是否为可省略的废话、填充词或啰嗦重复表达), "reason": 若该片段是废话则说明为何可省略, 不是废话则为空字符串}],' +
            '"comment": 对该句的整体点评(可选, 没有则空字符串)}],' +
            '"suggestions": [3-5条具体可操作的改进建议],' +
            '"betterVersion": 一段明显更好的示范表达}' +
            "。请按语义把用户的表达拆成若干“句”，每句再切成片段，把可以省略的填充词（如“那个”“然后”“就是说”“其实”“呃”“这个”）、口头禅、以及啰嗦重复的表达标记为 isWaste=true 并说明原因；保留必要的连接词、语义词和停顿。",
        },
        {
          role: "user",
          content:
            `场景：${label}\n题目：${topic.title || ""}\n情境：${topic.scenario || ""}\n练习要求：${topic.prompt || ""}\n\n用户的表达：\n${userInput}`,
        },
      ];
      const raw = await callDeepSeek(messages, { json: true, temperature: 0.5 });
      const result = safeParse<ScoreResult>(raw, {
        overall: 5,
        dimensions: {
          structure: 5,
          wording: 5,
          filler: 5,
          fit: 5,
          fluency: 5,
          verbose: 5,
        },
        suggestions: ["（AI 返回格式异常，建议重试）"],
        betterVersion: "",
        sentences: [],
      });
      // 数值兜底
      const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n || 5)));
      result.overall = clamp(result.overall);
      (Object.keys(result.dimensions) as (keyof ScoreResult["dimensions"])[]).forEach(
        (k) => {
          result.dimensions[k] = clamp(result.dimensions[k]);
        },
      );
      return Response.json({ result });
    }

    if (mode === "chat") {
      const scene = (body.scene as Scene) || "speech";
      const label = SCENE_LABELS[scene] || scene;
      const topic = (body.topic as Topic) || ({} as Topic);
      const incoming = (body.messages as ChatMessage[]) || [];
      // 若前端传入角色变体 prompt，则以其覆盖该场景默认角色设定
      const rolePrompt = (body.rolePrompt as string) || ROLE_PROMPT[scene] || "";
      const system: ChatMessage = {
        role: "system",
        content:
          rolePrompt +
          `\n\n当前练习题目：${topic.title || ""}；情境：${topic.scenario || ""}；要求：${topic.prompt || ""}。` +
          "全程用中文。你不是在给用户打分，而是陪用户练习——既要入戏扮演，又要在每一轮用一两句话引导用户" +
          "「接下来可以试着说 / 注意…」。不要一次性替用户把整段讲完，保持对话的推进与张力。",
      };
      const messages: ChatMessage[] = [system, ...incoming];
      const reply = await callDeepSeek(messages, { temperature: 0.85 });
      return Response.json({ reply });
    }

    return Response.json({ error: "未知的 mode，应为 topic / score / chat" }, { status: 400 });
  } catch (e) {
    if (e instanceof MissingKeyError) {
      return Response.json(
        { error: "缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置后重启服务。" },
        { status: 500 },
      );
    }
    const msg = e instanceof Error ? e.message : "AI 调用失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

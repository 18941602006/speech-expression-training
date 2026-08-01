import { testConnection } from "@/lib/llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const endpoint = String(body.endpoint || "").trim();
  const apiKey = String(body.apiKey || "").trim();
  if (!endpoint || !apiKey) {
    return Response.json({ error: "Endpoint 与 API Key 均为必填" }, { status: 400 });
  }
  const result = await testConnection(
    endpoint,
    apiKey,
    body.model ? String(body.model) : undefined,
  );
  return Response.json(result);
}

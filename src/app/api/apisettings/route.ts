import {
  listApiConfigs,
  saveApiConfig,
  updateApiConfig,
  deleteApiConfig,
  setActiveApiConfig,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const configs = await listApiConfigs();
  return Response.json({ configs });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const endpoint = String(body.endpoint || "").trim();
  const apiKey = String(body.apiKey || "").trim();
  if (!endpoint || !apiKey) {
    return Response.json({ error: "Endpoint 与 API Key 均为必填" }, { status: 400 });
  }
  const id = await saveApiConfig({
    name: body.name ? String(body.name) : undefined,
    endpoint,
    apiKey,
    model: body.model ? String(body.model) : undefined,
    models: Array.isArray(body.models) ? (body.models as string[]) : undefined,
  });
  return Response.json({ id }, { status: 201 });
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
  await updateApiConfig(id, {
    name: body.name !== undefined ? String(body.name) : undefined,
    endpoint: body.endpoint !== undefined ? String(body.endpoint) : undefined,
    apiKey: body.apiKey !== undefined ? String(body.apiKey) : undefined,
    model: body.model !== undefined ? String(body.model) : undefined,
    models: Array.isArray(body.models) ? (body.models as string[]) : undefined,
    status: body.status as "untested" | "connected" | "error" | undefined,
    lastError: body.lastError !== undefined ? (body.lastError as string | null) : undefined,
  });
  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
  await setActiveApiConfig(id);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
  await deleteApiConfig(id);
  return Response.json({ ok: true });
}

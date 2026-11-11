import { json, requireAdmin } from "../lib/auth.js";
import { normalize } from "../lib/schema.js";
import { readContent, writeContent, HttpError } from "../lib/store.js";

const MAX_BYTES = 2_000_000;

export async function GET(request) {
  try {
    const content = await readContent();
    const fresh = new URL(request.url).searchParams.has("fresh");
    return json({ content }, 200, {
      "cache-control": fresh ? "no-store" : "public, max-age=0, s-maxage=5, stale-while-revalidate=60",
    });
  } catch (err) {
    console.error(err);
    return json({ error: "콘텐츠를 불러오지 못했습니다." }, 500);
  }
}

export async function PUT(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return json({ error: "콘텐츠가 너무 큽니다." }, 413);
    const content = normalize(JSON.parse(text));
    await writeContent(content);
    return json({ ok: true, content });
  } catch (err) {
    if (err instanceof SyntaxError) return json({ error: "JSON 형식이 올바르지 않습니다." }, 400);
    console.error(err);
    return json({ error: err instanceof HttpError ? err.message : "저장에 실패했습니다." }, err.status || 500);
  }
}

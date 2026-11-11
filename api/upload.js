import { json, requireAdmin } from "../lib/auth.js";
import { saveUpload, useRequestOidc, HttpError } from "../lib/store.js";

// Vercel 함수 요청 본문 한도(4.5MB) 안쪽. 큰 이미지는 브라우저에서 줄여서 보냅니다.
const MAX_BYTES = 4_400_000;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(request) {
  useRequestOidc(request);
  const denied = requireAdmin(request);
  if (denied) return denied;

  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!ALLOWED.includes(type)) return json({ error: "지원하지 않는 이미지 형식입니다." }, 415);

  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length) return json({ error: "빈 파일입니다." }, 400);
  if (buffer.length > MAX_BYTES) return json({ error: "이미지가 너무 큽니다 (최대 4MB)." }, 413);

  const filename = new URL(request.url).searchParams.get("name") || "image";
  try {
    const url = await saveUpload(filename, buffer, type);
    return json({ url });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof HttpError ? err.message : "업로드에 실패했습니다." }, err.status || 500);
  }
}

import { checkPassword, clearCookie, isAuthed, json, passwordConfigured, sessionCookie } from "../lib/auth.js";

// GET: 로그인 여부 / POST: 로그인 / DELETE: 로그아웃
export function GET(request) {
  return json({ authed: isAuthed(request), configured: passwordConfigured() });
}

export async function POST(request) {
  if (!passwordConfigured()) {
    return json({ error: "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다." }, 500);
  }
  let password = "";
  try {
    ({ password = "" } = await request.json());
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 600)); // 무차별 대입 지연
    return json({ error: "비밀번호가 올바르지 않습니다." }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(request) });
}

export function DELETE(request) {
  return json({ ok: true }, 200, { "set-cookie": clearCookie(request) });
}

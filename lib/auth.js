// 관리자 인증: ADMIN_PASSWORD 환경변수 하나로 로그인, HMAC 서명된 HttpOnly 쿠키로 세션 유지.
import crypto from "node:crypto";

const COOKIE = "yeol_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7일

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = (value) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");
const hash = (value) => crypto.createHash("sha256").update(String(value)).digest();

export const passwordConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

export function checkPassword(input) {
  if (!passwordConfigured()) return false;
  return crypto.timingSafeEqual(hash(input), hash(process.env.ADMIN_PASSWORD));
}

function isHttps(request) {
  const proto = request.headers.get("x-forwarded-proto");
  return proto ? proto === "https" : new URL(request.url).protocol === "https:";
}

export function sessionCookie(request) {
  const exp = String(Date.now() + MAX_AGE * 1000);
  const secure = isHttps(request) ? "; Secure" : "";
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie(request) {
  const secure = isHttps(request) ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function isAuthed(request) {
  if (!passwordConfigured()) return false;
  const raw = (request.headers.get("cookie") || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// 쓰기 요청 보호: 로그인 + 같은 사이트에서 보낸 요청(커스텀 헤더)만 허용
export function requireAdmin(request) {
  if (request.headers.get("x-admin-request") !== "1") return json({ error: "잘못된 요청입니다." }, 400);
  if (!isAuthed(request)) return json({ error: "로그인이 필요합니다." }, 401);
  return null;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

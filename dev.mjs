// 로컬 개발 서버: 정적 파일 + /api/* 함수 실행 (Vercel 동작 흉내).
// 사용: npm run dev  → http://localhost:3000
// 환경변수는 .env.local 에서 읽습니다 (ADMIN_PASSWORD 등).
import http from "node:http";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);

if (existsSync(path.join(ROOT, ".env.local"))) {
  for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

async function sendFile(res, file) {
  const body = await fs.readFile(file);
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store", // 개발 중 수정한 파일이 바로 반영되게
  });
  res.end(body);
}

async function handleApi(req, res, url) {
  const name = url.pathname.slice("/api/".length).replace(/\/$/, "");
  const file = path.join(ROOT, "api", `${name}.js`);
  if (!/^[a-z-]+$/.test(name) || !existsSync(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const handler = mod[req.method];
  if (!handler) {
    res.writeHead(405).end("Method not allowed");
    return;
  }
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: "half",
  });
  const response = await handler(request);
  const headers = Object.fromEntries(response.headers);
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);

      if (url.pathname.startsWith("/local-uploads/")) {
        const file = path.join(ROOT, ".data", "uploads", path.basename(url.pathname));
        return existsSync(file) ? await sendFile(res, file) : res.writeHead(404).end();
      }

      const rel = decodeURIComponent(url.pathname);
      if (rel.split("/").some((seg) => seg.startsWith("."))) return res.writeHead(404).end();
      const file = path.join(ROOT, rel);
      if (rel !== "/" && existsSync(file) && (await fs.stat(file)).isFile()) return await sendFile(res, file);
      if (existsSync(`${file}.html`)) return await sendFile(res, `${file}.html`); // cleanUrls
      return await sendFile(res, path.join(ROOT, "index.html")); // SPA fallback
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end("Server error");
    }
  })
  .listen(PORT, () => {
    console.log(`dev server → http://localhost:${PORT}  (admin: /admin)`);
    if (!process.env.ADMIN_PASSWORD) console.log("⚠ ADMIN_PASSWORD 가 없습니다. .env.local 에 추가하세요.");
  });

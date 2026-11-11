// 콘텐츠(JSON)와 업로드 이미지 저장소.
// - Vercel: BLOB_READ_WRITE_TOKEN 이 있으면 Vercel Blob 사용
// - 로컬 개발: 토큰이 없으면 .data/ 폴더에 파일로 저장
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CONTENT_PATH = "site/content.json";
const LOCAL_DIR = path.join(process.cwd(), ".data");

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function assertWritable() {
  if (!useBlob() && process.env.VERCEL) {
    throw new HttpError(500, "Vercel Blob 스토어가 연결되지 않았습니다 (BLOB_READ_WRITE_TOKEN 없음).");
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function readContent() {
  if (useBlob()) {
    const { get } = await import("@vercel/blob");
    const res = await get(CONTENT_PATH, { access: "public", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return JSON.parse(await new Response(res.stream).text());
  }
  try {
    return JSON.parse(await fs.readFile(path.join(LOCAL_DIR, "content.json"), "utf8"));
  } catch {
    return null;
  }
}

export async function writeContent(data) {
  assertWritable();
  const body = JSON.stringify(data);
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    await put(CONTENT_PATH, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, "content.json"), body);
}

export async function saveUpload(filename, buffer, contentType) {
  assertWritable();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "image";
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${safe}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });
    return blob.url;
  }
  const dir = path.join(LOCAL_DIR, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(6).toString("hex")}-${safe}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return `/local-uploads/${name}`;
}

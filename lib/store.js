// 콘텐츠(JSON)와 업로드 이미지 저장소.
// - Vercel: BLOB_READ_WRITE_TOKEN 이 있으면 Vercel Blob 사용
// - 로컬 개발: 토큰이 없으면 .data/ 폴더에 파일로 저장
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CONTENT_PATH = "site/content.json";
const LOCAL_DIR = path.join(process.cwd(), ".data");

// Vercel 에서는 항상 Blob 사용 (토큰 또는 OIDC + BLOB_STORE_ID 를 SDK 가 알아서 찾음).
// 로컬에서는 자격 증명이 있을 때만 Blob, 없으면 .data/ 폴더.
const hasBlobCredentials = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const useBlob = () => Boolean(process.env.VERCEL) || hasBlobCredentials();

function assertWritable() {
  if (process.env.VERCEL && !hasBlobCredentials()) {
    throw new HttpError(
      500,
      "Vercel Blob 스토어가 이 프로젝트에 연결되지 않았습니다. Storage 탭에서 Blob 스토어를 연결한 뒤 Redeploy 하세요.",
    );
  }
}

// OIDC 연결(BLOB_STORE_ID) 시 Vercel 이 요청마다 넣어주는 토큰을 SDK 가 확실히 찾도록 보강
export function useRequestOidc(request) {
  const token = request.headers.get("x-vercel-oidc-token");
  if (token) process.env.VERCEL_OIDC_TOKEN = token;
}

function blobError(err) {
  console.error(err);
  if (err?.name?.startsWith("Blob") || /blob/i.test(err?.message || "")) {
    return new HttpError(500, `Vercel Blob 오류: ${err.message}`);
  }
  return err;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function readContent() {
  if (useBlob()) {
    if (!hasBlobCredentials()) return null; // 아직 스토어 미연결 → 기본값 사용
    try {
      const { get } = await import("@vercel/blob");
      const res = await get(CONTENT_PATH, { access: "public", useCache: false });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      return JSON.parse(await new Response(res.stream).text());
    } catch (err) {
      if (err?.name === "BlobNotFoundError") return null;
      throw blobError(err);
    }
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
    try {
      const { put } = await import("@vercel/blob");
      await put(CONTENT_PATH, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    } catch (err) {
      throw blobError(err);
    }
    return;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, "content.json"), body);
}

export async function saveUpload(filename, buffer, contentType) {
  assertWritable();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "image";
  if (useBlob()) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${safe}`, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType,
      });
      return blob.url;
    } catch (err) {
      throw blobError(err);
    }
  }
  const dir = path.join(LOCAL_DIR, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(6).toString("hex")}-${safe}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return `/local-uploads/${name}`;
}

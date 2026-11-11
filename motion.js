// Motion 라이브러리를 한 번만 불러와서 공유
const MOTION_URL = "https://cdn.jsdelivr.net/npm/motion@14.7.1/+esm";

let promise = null;

export function loadMotion() {
  promise ||= import(MOTION_URL).catch((err) => {
    promise = null; // 다음에 다시 시도
    throw err;
  });
  return promise;
}

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

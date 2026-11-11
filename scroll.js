// Lenis 부드러운 스크롤 (마우스 휠/트랙패드). 터치는 기기 기본 스크롤 그대로.
// 모션 줄이기 설정이면 켜지 않고, 불러오지 못하면 기본 스크롤로 동작.
import { prefersReducedMotion } from "./motion.js";

const LENIS_URL = "https://cdn.jsdelivr.net/npm/lenis@1.3.27/+esm";

let lenis = null;

export async function initSmoothScroll() {
  if (lenis || prefersReducedMotion()) return;
  try {
    const { default: Lenis } = await import(LENIS_URL);
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      allowNestedScroll: true, // 안쪽 스크롤 영역(메인 글 등)은 그 영역이 스크롤
      stopInertiaOnNavigate: true,
    });
  } catch {
    lenis = null;
  }
}

// 페이지 이동 시 맨 위로 (부드럽게 말고 즉시)
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

// 시트 같은 오버레이가 열린 동안 뒤 페이지 스크롤 멈춤
export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();

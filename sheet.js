// iOS App Store 스타일: 목록의 카드를 누르면 이미지가 그대로 커지면서 상세 시트가 열리고,
// 닫으면 원래 카드 자리로 줄어들어 돌아갑니다. (Motion animateLayout + data-layout-id)
import { loadMotion, prefersReducedMotion } from "./motion.js";
import { stopScroll, startScroll } from "./scroll.js";

const LAYOUT_ID = "sheet-media";
const SPRING = { type: "spring", bounce: 0.12, visualDuration: 0.5 };
const closeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

let open = null;

export const isSheetOpen = () => Boolean(open);

function onKey(e) {
  if (!open) return;
  if (e.key === "Escape") {
    e.preventDefault();
    open.onRequestClose();
  } else if (e.key === "Tab") {
    // 포커스를 시트 안에 가두기
    const items = [...open.root.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

async function motionOrNull() {
  if (prefersReducedMotion()) return null;
  try {
    return await loadMotion();
  } catch {
    return null;
  }
}

/**
 * @param {object} o
 * @param {HTMLElement} o.tile   목록의 카드(링크). 안의 .media 가 시트 이미지로 커집니다.
 * @param {string} o.html        시트 본문. `.sheet__media > *` 가 공유 요소, `[data-sheet-fade]` 는 페이드인.
 * @param {string} o.labelId     시트 제목 요소의 id
 * @param {() => void} o.onRequestClose  닫기 요청(버튼/Esc/바깥 클릭)
 */
export async function openSheet({ tile, html, labelId, onRequestClose }) {
  if (open) await closeSheet({ instant: true });

  const root = document.createElement("div");
  root.className = "sheet";
  root.innerHTML = `
    <div class="sheet__backdrop"></div>
    <div class="sheet__scroll" data-lenis-prevent>
      <article class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="${labelId}" tabindex="-1">
        <button class="sheet__close" type="button" data-sheet-close data-sheet-fade aria-label="닫기">${closeIcon}</button>
        ${html}
      </article>
    </div>`;

  const fromMedia = tile.querySelector(".media");
  const toMedia = root.querySelector(".sheet__media > *");
  const scroller = root.querySelector(".sheet__scroll");

  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-sheet-close]") || e.target === scroller) onRequestClose();
  });

  open = { root, tile, fromMedia, toMedia, onRequestClose, prevFocus: document.activeElement };
  document.addEventListener("keydown", onKey);

  const mount = () => {
    stopScroll();
    document.documentElement.classList.add("sheet-open");
    tile.classList.add("is-sheet-source");
    document.body.append(root);
  };

  const M = await motionOrNull();
  if (open?.root !== root) return; // 기다리는 사이 닫힘

  if (!M || !fromMedia || !toMedia) {
    mount();
    root.querySelector(".sheet__close").focus({ preventScroll: true });
    return;
  }

  const fades = [...root.querySelectorAll("[data-sheet-fade]")];
  const backdrop = root.querySelector(".sheet__backdrop");
  fades.forEach((el) => (el.style.opacity = "0"));
  backdrop.style.opacity = "0";

  fromMedia.setAttribute("data-layout-id", LAYOUT_ID);
  toMedia.setAttribute("data-layout-id", LAYOUT_ID);

  M.animate(backdrop, { opacity: 1 }, { duration: 0.3, ease: "easeOut" });
  M.animate(fades, { opacity: [0, 1], y: [16, 0] }, { duration: 0.35, delay: 0.15, ease: "easeOut" });
  // animateLayout 은 애니메이션 "시작" 시점에 resolve → 끝은 controls.finished
  const controls = await M.animateLayout(() => {
    fromMedia.removeAttribute("data-layout-id");
    mount();
  }, SPRING);
  await controls?.finished;

  if (open?.root === root) root.querySelector(".sheet__close").focus({ preventScroll: true });
}

export async function closeSheet({ instant = false } = {}) {
  if (!open) return;
  const o = open;
  open = null;
  document.removeEventListener("keydown", onKey);

  const finish = () => {
    o.root.remove();
    document.documentElement.classList.remove("sheet-open");
    startScroll();
    o.tile.classList.remove("is-sheet-source");
    o.fromMedia?.removeAttribute("data-layout-id");
    if (o.tile.isConnected) o.tile.focus({ preventScroll: true });
    else o.prevFocus?.focus?.({ preventScroll: true });
  };

  const M = instant ? null : await motionOrNull();
  if (!M || !o.fromMedia?.isConnected || !o.toMedia) {
    finish();
    return;
  }

  o.root.style.pointerEvents = "none";
  const fades = [...o.root.querySelectorAll("[data-sheet-fade]")];
  M.animate(fades, { opacity: 0 }, { duration: 0.15, ease: "easeIn" });
  M.animate(o.root.querySelector(".sheet__backdrop"), { opacity: 0 }, { duration: 0.35, ease: "easeOut" });

  // 열 때 이미 레이아웃 애니메이션에 쓰인 요소를 다시 쓰면 Motion 이 애니메이션을 건너뛰고
  // 시작 위치에 멈춰 버림 → 같은 모양의 새 요소로 바꿔서 그쪽으로 돌아가게 함
  const fresh = o.fromMedia.cloneNode(true);
  fresh.removeAttribute("data-layout-id");
  const controls = await M.animateLayout(() => {
    o.toMedia.removeAttribute("data-layout-id");
    o.toMedia.style.visibility = "hidden";
    o.fromMedia.replaceWith(fresh);
    fresh.setAttribute("data-layout-id", LAYOUT_ID);
    document.documentElement.classList.remove("sheet-open");
    o.tile.classList.remove("is-sheet-source");
  }, SPRING);
  o.fromMedia = fresh;
  await controls?.finished;

  finish();
}

// 메인 화면 카드 스택 (Motion drag + spring)
// - 맨 위 카드를 좌우로 던지면 다음 카드, 탭/클릭해도 다음 카드
// - 이전/다음 버튼, 키보드 ←/→ 지원
// - Motion 을 못 불러오면 애니메이션 없이 버튼으로만 동작
const MOTION_URL = "https://cdn.jsdelivr.net/npm/motion@14.7.1/+esm";

const ROTATE = [0, -3, 2.5, -1.5];
const VISIBLE = 4; // 보이는 카드 수 (나머지는 투명하게 뒤에)
const SPRING = { type: "spring", bounce: 0.2, visualDuration: 0.45 };

export async function mountStack(root, { onChange } = {}) {
  const els = [...root.querySelectorAll(".stack__card")];
  const n = els.length;
  if (!n) return () => {};

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let destroyed = false;
  let M = null;
  try {
    M = await import(MOTION_URL);
  } catch {
    M = null; // 오프라인/차단 → 정적 모드
  }
  if (!root.isConnected) return () => {}; // 불러오는 사이 다른 페이지로 이동함

  const cleanups = [];
  const cards = els.map((el) => {
    const inner = el.querySelector(".stack__inner");
    if (!M) return { el, inner };
    const x = M.motionValue(0);
    const y = M.motionValue(0);
    cleanups.push(M.styleEffect(inner, { x, y, rotate: M.mapValue(x, [-400, 0, 400], [-14, 0, 14]) }));
    return { el, inner, x, y };
  });

  let order = cards.map((_, i) => i);
  let stopDrag = null;

  function target(depth) {
    return {
      y: -depth * 18,
      scale: 1 - depth * 0.045,
      rotate: ROTATE[depth] ?? 0,
      opacity: depth < VISIBLE ? 1 : 0,
    };
  }

  function place(card, depth, instant = false) {
    card.el.style.zIndex = String(n - depth);
    card.el.toggleAttribute("data-top", depth === 0);
    card.el.setAttribute("aria-hidden", depth === 0 ? "false" : "true");
    const t = target(depth);
    if (!M) {
      card.el.style.transform = `translateY(${t.y}px) scale(${t.scale}) rotate(${t.rotate}deg)`;
      card.el.style.opacity = String(t.opacity);
      return;
    }
    M.animate(card.el, t, instant || reduce ? { duration: 0 } : { ...SPRING, opacity: { duration: 0.25 } });
  }

  function layout(instant = false, skip = -1) {
    order.forEach((idx, depth) => {
      if (idx !== skip) place(cards[idx], depth, instant);
    });
    onChange?.(order[0], n);
  }

  function arm() {
    stopDrag?.();
    stopDrag = null;
    if (!M || n < 2) return;
    const card = cards[order[0]];
    stopDrag = M.drag(card.inner, {
      momentum: false,
      onStart: () => root.classList.add("is-dragging"),
      onEnd: (_e, info) => {
        root.classList.remove("is-dragging");
        const { offset, velocity } = info;
        if (Math.hypot(offset.x, offset.y) < 6) return go(1); // 탭 → 다음
        if (Math.abs(offset.x) > 110 || Math.abs(velocity.x) > 600) {
          return go(Math.sign(offset.x || velocity.x) || 1, true);
        }
        M.animate(card.x, 0, SPRING);
        M.animate(card.y, 0, SPRING);
      },
    });
  }

  // dir: 1 = 다음, -1 = 이전. thrown: 드래그로 던진 경우 (던진 방향으로 날아감)
  function go(dir, thrown = false) {
    if (n < 2) return;
    if (dir > 0 || thrown) {
      // 맨 위 카드를 날려 보내고 맨 뒤로
      const idx = order.shift();
      order.push(idx);
      const card = cards[idx];
      if (M && !reduce) {
        const side = thrown ? dir : 1;
        card.el.style.zIndex = String(n + 1);
        const away = root.clientWidth * 0.6 + card.el.offsetWidth;
        M.animate(card.x, side * away, { duration: 0.32, ease: "easeIn" });
        M.animate(card.el, { opacity: 0 }, { duration: 0.32, ease: "easeIn" }).then(() => {
          if (destroyed) return;
          card.x.jump(0);
          card.y.jump(0);
          place(card, order.indexOf(idx), true);
          M.animate(card.el, { opacity: target(order.indexOf(idx)).opacity }, { duration: 0.2 });
        });
        layout(false, idx);
      } else {
        if (M) {
          card.x.jump(0);
          card.y.jump(0);
        }
        layout(true);
      }
    } else {
      // 맨 뒤 카드를 맨 위로 가져오기
      const idx = order.pop();
      order.unshift(idx);
      const card = cards[idx];
      if (M && !reduce) {
        const from = -(root.clientWidth * 0.6 + card.el.offsetWidth);
        card.x.jump(from);
        card.y.jump(0);
        place(card, 0, true);
        M.animate(card.el, { opacity: [0, 1] }, { duration: 0.25 });
        M.animate(card.x, 0, SPRING);
        layout(false, idx);
        onChange?.(order[0], n);
      } else {
        layout(true);
      }
    }
    arm();
  }

  const onKey = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };
  root.addEventListener("keydown", onKey);

  const controls = root.parentElement.querySelector(".stack__controls");
  const onClick = (e) => {
    const btn = e.target.closest("[data-stack]");
    if (btn) go(btn.dataset.stack === "next" ? 1 : -1);
  };
  controls?.addEventListener("click", onClick);

  root.classList.add("is-ready");
  layout(true);
  arm();

  return () => {
    destroyed = true;
    stopDrag?.();
    cleanups.forEach((fn) => fn?.());
    root.removeEventListener("keydown", onKey);
    controls?.removeEventListener("click", onClick);
  };
}

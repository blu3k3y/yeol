import * as defaults from "./data.js";

// 관리자 페이지에서 저장한 콘텐츠(/api/content)를 우선 사용, 없으면 data.js 기본값
let site = defaults.site;
let gallery = defaults.gallery;
let projects = defaults.projects;

async function loadContent() {
  try {
    const res = await fetch("/api/content");
    if (!res.ok) return;
    const { content } = await res.json();
    if (content) ({ site, gallery, projects } = content);
  } catch {
    /* API 없음(정적 미리보기 등) → 기본값 유지 */
  }
}

const main = document.getElementById("main");
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ───────── Shell ───────── */

function initShell() {
  const logo = document.getElementById("logo");
  logo.innerHTML = site.logo ? `<img src="${esc(site.logo)}" alt="${esc(site.name)}" />` : esc(site.name);

  const contact = document.getElementById("contact");
  contact.href = `mailto:${site.email}`;
}

/* ───────── Pieces ───────── */

function media(src, alt, ratio, { eager = false, label = "IMAGE" } = {}) {
  const style = `aspect-ratio:${esc(ratio || "4/3")}`;
  if (!src) {
    return `<div class="media media--empty" style="${style}" data-label="${esc(label)}" role="img" aria-label="${esc(alt)}"></div>`;
  }
  return `<div class="media" style="${style}">
    <img src="${esc(src)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />
  </div>`;
}

// 자르지 않은 원본 비율 그대로 (화면 높이를 넘으면 전체가 보이게 축소)
function original(src, alt, ratio, label, eager = true) {
  if (!src) return media("", alt, ratio || "4/3", { label });
  const [w, h] = String(ratio || "").split("/").map(Number);
  // 로딩 전에도 자리를 확보해서 화면이 튀지 않게
  const size = w && h ? `width="${Math.round(w)}" height="${Math.round(h)}" style="--ar:${w / h}"` : "";
  return `<figure class="original">
    <img src="${esc(src)}" alt="${esc(alt)}" ${size} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />
  </figure>`;
}

function tags(list = []) {
  if (!list.length) return "";
  return `<ul class="tags" aria-label="태그">${list.map((t) => `<li class="tag">${esc(t)}</li>`).join("")}</ul>`;
}

const arrowLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

const ratioValue = (r = "1/1") => {
  const [w, h] = String(r).split("/").map(Number);
  return h && w ? h / w : 1;
};

/* ───────── Views ───────── */

function mainImages(m = {}) {
  if (Array.isArray(m.images)) return m.images.filter((im) => im && im.src);
  return m.image ? [{ src: m.image, alt: m.alt, ratio: m.ratio }] : []; // 예전 단일 이미지 형식
}

const arrowL = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
const arrowR = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>`;

function viewMain() {
  document.title = `${site.name} 포트폴리오`;
  const m = site.main || {};
  const text = (m.text || "").trim();
  const images = mainImages(m);
  // 이미지가 없으면 자리표시 카드 3장
  const list = images.length ? images : [{}, {}, {}];

  const cards = list
    .map((im, i) => {
      const ar = ratioValue(im.ratio || "4/5");
      const body = im.src
        ? `<img src="${esc(im.src)}" alt="${esc(im.alt || "")}" draggable="false" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`
        : `<span class="stack__empty">MAIN</span>`;
      return `<div class="stack__card" style="--ar:${1 / ar}" data-index="${i}">
        <div class="stack__inner">${body}</div>
      </div>`;
    })
    .join("");

  const many = list.length > 1;
  return `<section class="page page--main" aria-label="메인">
    <div class="stack" tabindex="${many ? 0 : -1}" aria-roledescription="carousel" aria-label="대표 작품${many ? " — 카드를 옆으로 넘기거나 ←/→ 키로 넘길 수 있습니다" : ""}">
      ${cards}
    </div>
    ${
      many
        ? `<div class="stack__controls">
      <button type="button" class="stack__btn" data-stack="prev" aria-label="이전 작품">${arrowL}</button>
      <span class="stack__count" aria-live="polite"><span data-current>1</span> / ${list.length}</span>
      <button type="button" class="stack__btn" data-stack="next" aria-label="다음 작품">${arrowR}</button>
    </div>`
        : ""
    }
    ${text ? `<p class="main-text">${esc(text)}</p>` : ""}
  </section>`;
}

function viewGallery() {
  document.title = `GALLERY — ${site.name}`;
  // 높이가 낮은 쪽 컬럼에 차례로 배치 (읽는 순서 유지)
  const cols = [[], []];
  const heights = [0, 0];
  const titleCell = `<div class="masonry__title"><h1 class="page-title">GALLERY</h1></div>`;

  gallery.forEach((item, i) => {
    const target = heights[0] <= heights[1] ? 0 : 1;
    cols[target].push(`<a class="tile" href="/gallery/${esc(item.id)}" data-link aria-label="${esc(item.title)}">
      ${media(item.image, item.title, item.ratio, { eager: i < 2, label: item.title })}
    </a>`);
    heights[target] += ratioValue(item.ratio);
    // 와이어프레임처럼 오른쪽 첫 작품 아래에 제목 배치
    if (target === 1 && cols[1].length === 1) {
      cols[1].push(titleCell);
      heights[1] += 0.25;
    }
  });
  if (!cols[1].includes(titleCell)) cols[1].unshift(titleCell);

  return `<section class="page page--gallery">
    ${gallery.length ? `<div class="masonry">
      <div class="masonry__col">${cols[0].join("")}</div>
      <div class="masonry__col">${cols[1].join("")}</div>
    </div>` : `<h1 class="page-title">GALLERY</h1><p class="empty">아직 등록된 작품이 없습니다.</p>`}
  </section>`;
}

function viewProjects() {
  document.title = `PROJECT — ${site.name}`;
  const card = (p, i) => `<a class="tile" href="/projects/${esc(p.id)}" data-link style="--i:${i}">
    ${media(p.cover, p.title, p.coverRatio || "350/520", { eager: i < 2, label: p.title })}
    <span class="tile__caption"><span>${esc(p.title)}</span><span>${esc(p.year || "")}</span></span>
  </a>`;

  const left = projects.filter((_, i) => i % 2 === 0).map((p, k) => card(p, k * 2));
  const right = projects.filter((_, i) => i % 2 === 1).map((p, k) => card(p, k * 2 + 1));

  return `<section class="page page--projects">
    <div class="stagger">
      <div class="stagger__col">${left.join("")}</div>
      <div class="stagger__col stagger__col--right">
        <div class="stagger__head">
          <h1 class="page-title">PROJECTS</h1>
        </div>
        ${right.join("")}
      </div>
    </div>
    ${projects.length ? "" : `<p class="empty">아직 등록된 프로젝트가 없습니다.</p>`}
  </section>`;
}

function pager(list, index, base) {
  const prev = list[index - 1];
  const next = list[index + 1];
  if (!prev && !next) return "";
  return `<nav class="pager" aria-label="이전/다음">
    ${prev ? `<a href="${base}/${esc(prev.id)}" data-link><small>PREV</small>${esc(prev.title)}</a>` : ""}
    ${next ? `<a href="${base}/${esc(next.id)}" data-link><small>NEXT</small>${esc(next.title)}</a>` : ""}
  </nav>`;
}

function viewGalleryDetail(id) {
  const i = gallery.findIndex((g) => g.id === id);
  if (i < 0) return viewNotFound();
  const g = gallery[i];
  document.title = `${g.title} — ${site.name}`;
  return `<article class="page page--detail">
    <a class="detail__back" href="/gallery" data-link>${arrowLeft}GALLERY</a>
    <div class="detail__media">${original(g.image, g.title, g.ratio, g.title)}</div>
    <h1 class="detail__title">${esc(g.title)}</h1>
    ${tags(g.tags)}
    ${g.description ? `<p class="detail__desc">${esc(g.description)}</p>` : ""}
    ${pager(gallery, i, "/gallery")}
  </article>`;
}

function viewProjectDetail(id) {
  const i = projects.findIndex((p) => p.id === id);
  if (i < 0) return viewNotFound();
  const p = projects[i];
  document.title = `${p.title} — ${site.name}`;
  // 위: 표지 → 제목/태그/설명 → 아래: 상세 이미지
  const images = (p.images || []).filter((im) => im.src);
  const gallery = images
    .map((im) => original(im.src, im.alt || p.title, im.ratio, p.title, false))
    .join("");
  return `<article class="page page--detail">
    <a class="detail__back" href="/projects" data-link>${arrowLeft}PROJECT</a>
    <div class="detail__media">${original(p.cover, p.title, p.coverRatio, p.title)}</div>
    <h1 class="detail__title">${esc(p.title)}</h1>
    ${tags(p.tags)}
    ${p.description ? `<p class="detail__desc">${esc(p.description)}</p>` : ""}
    ${gallery ? `<div class="detail__media detail__media--after">${gallery}</div>` : ""}
    ${pager(projects, i, "/projects")}
  </article>`;
}

function viewNotFound() {
  document.title = `404 — ${site.name}`;
  return `<section class="page">
    <h1 class="page-title">404</h1>
    <p class="empty">페이지를 찾을 수 없습니다. <a href="/" data-link style="text-decoration:underline">홈으로</a></p>
  </section>`;
}

/* ───────── Router ───────── */

function resolve(path) {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { view: viewMain(), section: null };
  if (parts[0] === "gallery") {
    return { view: parts[1] ? viewGalleryDetail(parts[1]) : viewGallery(), section: "gallery" };
  }
  if (parts[0] === "projects" || parts[0] === "project") {
    return { view: parts[1] ? viewProjectDetail(parts[1]) : viewProjects(), section: "projects" };
  }
  return { view: viewNotFound(), section: null };
}

let stackCleanup = null;

function render({ focus = false } = {}) {
  const { view, section } = resolve(location.pathname);
  stackCleanup?.then((fn) => fn());
  stackCleanup = null;
  main.innerHTML = view;

  const stack = main.querySelector(".stack");
  if (stack) {
    const current = main.querySelector("[data-current]");
    stackCleanup = import("./stack.js").then(({ mountStack }) =>
      mountStack(stack, {
        onChange: (idx) => {
          if (current) current.textContent = String(idx + 1);
        },
      }),
    );
  }

  document.querySelectorAll(".nav__link").forEach((a) => {
    if (a.dataset.section === section) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  main.querySelectorAll(".media img").forEach((img) => {
    const done = () => img.classList.add("is-loaded");
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener("load", done, { once: true });
  });

  if (focus) main.focus({ preventScroll: true });
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  if (url.pathname !== location.pathname) {
    history.pushState(null, "", url.pathname);
    render({ focus: true });
    window.scrollTo(0, 0);
  }
});

window.addEventListener("popstate", () => render());

await loadContent();
initShell();
render();

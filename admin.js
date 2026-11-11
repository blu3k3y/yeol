import * as defaults from "./data.js";

const root = document.getElementById("admin");
const toastEl = document.getElementById("toast");
const ADMIN_HEADERS = { "x-admin-request": "1" };

let state = null;
let dirty = false;
let tab = "main";
let saving = false;

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ───────── State helpers ───────── */

function getPath(path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), state);
}
function setPath(path, value) {
  const keys = path.split(".");
  let o = state;
  keys.slice(0, -1).forEach((k) => {
    if (o[k] == null) o[k] = {};
    o = o[k];
  });
  o[keys.at(-1)] = value;
}
function markDirty(value = true) {
  dirty = value;
  const status = root.querySelector(".bar__status");
  const save = root.querySelector('[data-action="save"]');
  if (status) {
    status.textContent = dirty ? "저장하지 않은 변경 사항이 있습니다" : "모든 변경 사항이 저장됨";
    status.classList.toggle("bar__status--dirty", dirty);
  }
  if (save) save.disabled = !dirty || saving;
}

function toast(message, { error = false } = {}) {
  toastEl.textContent = message;
  toastEl.classList.toggle("toast--error", error);
  toastEl.classList.add("is-visible");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove("is-visible"), error ? 4500 : 2200);
}

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `요청 실패 (${res.status})`), { status: res.status });
  return data;
}

/* ───────── Login ───────── */

function renderLogin(configured) {
  root.innerHTML = `<main class="login">
    <form class="login__card" id="login-form">
      <h1>관리자 로그인</h1>
      <p>포트폴리오 내용을 편집하려면 로그인하세요.</p>
      <label class="field">
        <span class="field__label">비밀번호</span>
        <input type="password" name="password" autocomplete="current-password" required autofocus />
      </label>
      ${configured ? "" : `<p class="form-error">서버에 ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.</p>`}
      <p class="form-error" id="login-error" hidden></p>
      <button class="btn btn--primary" type="submit">로그인</button>
      <a class="btn btn--ghost" href="/" style="margin-top:8px;width:100%">사이트로 돌아가기</a>
    </form>
  </main>`;

  const form = root.querySelector("#login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const err = form.querySelector("#login-error");
    btn.disabled = true;
    btn.textContent = "확인 중…";
    err.hidden = true;
    try {
      await api("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: form.password.value }),
      });
      await startEditor();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = "로그인";
      form.password.select();
    }
  });
}

/* ───────── Editor ───────── */

async function startEditor() {
  const { content } = await api("/api/content?fresh=1");
  state = content || {
    site: { ...structuredClone(defaults.site), main: { text: "", ...structuredClone(defaults.site.main) } },
    gallery: structuredClone(defaults.gallery),
    projects: structuredClone(defaults.projects),
  };
  state.site.main ||= {};
  render();
  markDirty(false);
}

const TABS = [
  ["main", "메인"],
  ["gallery", "갤러리"],
  ["projects", "프로젝트"],
  ["settings", "설정"],
];

function render() {
  const scrollY = window.scrollY;
  root.innerHTML = `
    <header class="bar">
      <h1 class="bar__title">관리자</h1>
      <span class="bar__status"></span>
      <a class="btn btn--sm btn--ghost" href="/" target="_blank" rel="noopener">사이트 보기</a>
      <button class="btn btn--sm" type="button" data-action="logout">로그아웃</button>
      <button class="btn btn--sm btn--primary" type="button" data-action="save">${saving ? "저장 중…" : "저장"}</button>
    </header>
    <nav class="tabs" role="tablist" aria-label="편집 영역">
      ${TABS.map(([key, label]) => `<button class="tab" role="tab" type="button" data-action="tab" data-tab="${key}" aria-selected="${tab === key}">${label}</button>`).join("")}
    </nav>
    <main class="panel" role="tabpanel">${panel()}</main>`;
  markDirty(dirty);
  window.scrollTo(0, scrollY);
}

function panel() {
  if (tab === "main") return panelMain();
  if (tab === "gallery") return panelGallery();
  if (tab === "projects") return panelProjects();
  return panelSettings();
}

/* ───────── Field templates ───────── */

function input(label, path, { type = "text", placeholder = "", kind = "" } = {}) {
  let value = getPath(path) ?? "";
  if (kind === "tags") value = (value || []).join(", ");
  return `<label class="field">
    <span class="field__label">${label}</span>
    <input type="${type}" data-path="${path}" ${kind ? `data-kind="${kind}"` : ""} value="${esc(value)}" placeholder="${esc(placeholder)}" />
  </label>`;
}

function textarea(label, path, { tall = false, placeholder = "" } = {}) {
  return `<label class="field">
    <span class="field__label">${label}</span>
    <textarea data-path="${path}" class="${tall ? "tall" : ""}" placeholder="${esc(placeholder)}">${esc(getPath(path) ?? "")}</textarea>
  </label>`;
}

function picker(path, ratioPath, label = "이미지") {
  const src = getPath(path);
  return `<div class="picker">
    <span class="field__label">${label}</span>
    <div class="picker__box" data-box="${path}">${src ? `<img src="${esc(src)}" alt="" />` : "이미지 없음"}</div>
    <div class="picker__row">
      <button class="btn btn--sm" type="button" data-action="pick" data-path="${path}" data-ratio="${ratioPath}">${src ? "교체" : "이미지 선택"}</button>
      ${src ? `<button class="btn btn--sm btn--danger" type="button" data-action="clear" data-path="${path}">삭제</button>` : ""}
    </div>
  </div>`;
}

function itemActions(list, i, total) {
  return `<div class="card__actions">
    <span class="card__num">${i + 1} / ${total}</span>
    <button class="btn btn--sm btn--icon" type="button" data-action="move" data-list="${list}" data-index="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="위로 이동">↑</button>
    <button class="btn btn--sm btn--icon" type="button" data-action="move" data-list="${list}" data-index="${i}" data-dir="1" ${i === total - 1 ? "disabled" : ""} aria-label="아래로 이동">↓</button>
    <button class="btn btn--sm btn--danger" type="button" data-action="remove" data-list="${list}" data-index="${i}">삭제</button>
  </div>`;
}

/* ───────── Panels ───────── */

function panelMain() {
  return `<div class="panel__head"><h2>메인 화면</h2></div>
    <p class="panel__hint">메인 화면의 큰 박스에 보이는 글과 이미지입니다. 이미지가 있으면 글이 이미지 위에 겹쳐 보입니다.</p>
    <section class="card">
      ${picker("site.main.image", "site.main.ratio", "배경 이미지 (선택)")}
      <div class="fields">
        ${textarea("박스 안 글", "site.main.text", { tall: true, placeholder: "메인 화면에 보여줄 글을 입력하세요.\n줄바꿈도 그대로 보입니다." })}
        ${input("이미지 대체 텍스트", "site.main.alt", { placeholder: "이미지를 설명하는 짧은 문장" })}
      </div>
    </section>`;
}

function panelGallery() {
  const list = state.gallery || [];
  return `<div class="panel__head">
      <h2>갤러리 <span class="card__num">${list.length}개</span></h2>
      <button class="btn btn--primary btn--sm" type="button" data-action="add" data-list="gallery">+ 작품 추가</button>
    </div>
    <p class="panel__hint">위에 있는 작품부터 갤러리에 차례로 배치됩니다.</p>
    ${list.length ? "" : `<div class="empty">아직 작품이 없습니다. “작품 추가”를 눌러 시작하세요.</div>`}
    ${list
      .map(
        (_, i) => `<section class="card">
      ${picker(`gallery.${i}.image`, `gallery.${i}.ratio`)}
      <div class="fields">
        ${input("제목", `gallery.${i}.title`)}
        ${input("태그 (쉼표로 구분)", `gallery.${i}.tags`, { kind: "tags", placeholder: "드로잉, 2026" })}
        ${textarea("설명", `gallery.${i}.description`)}
      </div>
      ${itemActions("gallery", i, list.length)}
    </section>`,
      )
      .join("")}`;
}

function panelProjects() {
  const list = state.projects || [];
  return `<div class="panel__head">
      <h2>프로젝트 <span class="card__num">${list.length}개</span></h2>
      <button class="btn btn--primary btn--sm" type="button" data-action="add" data-list="projects">+ 프로젝트 추가</button>
    </div>
    <p class="panel__hint">표지는 목록 카드에, 상세 이미지는 프로젝트 상세 화면에 차례로 보입니다.</p>
    ${list.length ? "" : `<div class="empty">아직 프로젝트가 없습니다. “프로젝트 추가”를 눌러 시작하세요.</div>`}
    ${list
      .map((p, i) => {
        const images = p.images || [];
        return `<section class="card">
      ${picker(`projects.${i}.cover`, `projects.${i}.coverRatio`, "표지 이미지")}
      <div class="fields">
        <div class="fields fields--2">
          ${input("제목", `projects.${i}.title`)}
          ${input("연도", `projects.${i}.year`, { placeholder: "2026" })}
        </div>
        ${input("태그 (쉼표로 구분)", `projects.${i}.tags`, { kind: "tags", placeholder: "브랜딩, 그래픽" })}
        ${textarea("설명", `projects.${i}.description`, { tall: true })}
        <div class="field">
          <span class="field__label">상세 이미지 (${images.length}장)</span>
          <div class="thumbs">
            ${images
              .map(
                (im, k) => `<div class="thumb">
              <div class="picker__box">${im.src ? `<img src="${esc(im.src)}" alt="" />` : "이미지 없음"}</div>
              <div class="thumb__row">
                <button class="btn btn--sm btn--icon" type="button" data-action="move" data-list="projects.${i}.images" data-index="${k}" data-dir="-1" ${k === 0 ? "disabled" : ""} aria-label="앞으로">←</button>
                <button class="btn btn--sm btn--icon" type="button" data-action="move" data-list="projects.${i}.images" data-index="${k}" data-dir="1" ${k === images.length - 1 ? "disabled" : ""} aria-label="뒤로">→</button>
                <button class="btn btn--sm btn--danger" type="button" data-action="remove" data-list="projects.${i}.images" data-index="${k}" data-silent="1">삭제</button>
              </div>
            </div>`,
              )
              .join("")}
          </div>
          <div><button class="btn btn--sm" type="button" data-action="pick-many" data-list="projects.${i}.images">+ 이미지 추가</button></div>
        </div>
      </div>
      ${itemActions("projects", i, list.length)}
    </section>`;
      })
      .join("")}`;
}

function panelSettings() {
  return `<div class="panel__head"><h2>설정</h2></div>
    <section class="card">
      ${picker("site.logo", "", "로고 이미지 (비우면 이름 표시)")}
      <div class="fields">
        ${input("이름", "site.name")}
        ${input("연락 이메일 (CONTACT ME)", "site.email", { type: "email", placeholder: "you@example.com" })}
      </div>
    </section>`;
}

/* ───────── Image upload ───────── */

async function prepareImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name}: 이 형식은 열 수 없습니다. JPG/PNG/WebP로 바꿔서 올려주세요.`);
  }
  const { width, height } = bitmap;
  const ratio = `${width}/${height}`;
  const base = file.name.replace(/\.[^.]+$/, "") || "image";

  // GIF 는 애니메이션 유지를 위해 원본 그대로
  if (file.type === "image/gif") {
    if (file.size > 4_000_000) throw new Error(`${file.name}: GIF는 4MB 이하만 올릴 수 있습니다.`);
    return { blob: file, ratio, name: file.name };
  }

  const MAX = 2400;
  const scale = Math.min(1, MAX / Math.max(width, height));
  const passthrough = ["image/jpeg", "image/webp"].includes(file.type) && scale === 1 && file.size <= 1_500_000;
  if (passthrough) return { blob: file, ratio, name: file.name };

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type, q) => new Promise((r) => canvas.toBlob(r, type, q));
  let blob = await encode("image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return { blob, ratio, name: `${base}.${ext}` };
}

async function uploadFile(file) {
  const { blob, ratio, name } = await prepareImage(file);
  const { url } = await api(`/api/upload?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { ...ADMIN_HEADERS, "content-type": blob.type },
    body: blob,
  });
  return { url, ratio };
}

function choose(multiple) {
  return new Promise((resolve) => {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
    el.multiple = multiple;
    el.addEventListener("change", () => resolve([...el.files]), { once: true });
    el.click();
  });
}

async function pickSingle(path, ratioPath) {
  const [file] = await choose(false);
  if (!file) return;
  root.querySelector(`[data-box="${CSS.escape(path)}"]`)?.classList.add("is-busy");
  try {
    const { url, ratio } = await uploadFile(file);
    setPath(path, url);
    if (ratioPath) setPath(ratioPath, ratio);
    markDirty();
    render();
    toast("이미지를 올렸습니다. 저장을 눌러 반영하세요.");
  } catch (ex) {
    root.querySelector(`[data-box="${CSS.escape(path)}"]`)?.classList.remove("is-busy");
    handleError(ex);
  }
}

async function pickMany(listPath) {
  const files = await choose(true);
  if (!files.length) return;
  toast(`${files.length}장 업로드 중…`);
  const list = getPath(listPath) || [];
  let ok = 0;
  for (const file of files) {
    try {
      const { url, ratio } = await uploadFile(file);
      list.push({ src: url, alt: "", ratio });
      ok += 1;
    } catch (ex) {
      handleError(ex);
    }
  }
  setPath(listPath, list);
  if (ok) {
    markDirty();
    render();
    toast(`${ok}장을 추가했습니다. 저장을 눌러 반영하세요.`);
  }
}

/* ───────── Actions ───────── */

function handleError(ex) {
  if (ex.status === 401) {
    toast("로그인이 만료되었습니다. 다시 로그인하세요.", { error: true });
    renderLogin(true);
    return;
  }
  toast(ex.message || "오류가 발생했습니다.", { error: true });
}

async function save() {
  if (saving) return;
  saving = true;
  markDirty(dirty);
  const btn = root.querySelector('[data-action="save"]');
  if (btn) btn.textContent = "저장 중…";
  try {
    const { content } = await api("/api/content", {
      method: "PUT",
      headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    state = content;
    saving = false;
    dirty = false;
    render();
    toast("저장했습니다.");
  } catch (ex) {
    saving = false;
    if (btn) btn.textContent = "저장";
    markDirty(dirty);
    handleError(ex);
  }
}

root.addEventListener("input", (e) => {
  const el = e.target.closest("[data-path]");
  if (!el || !("value" in el) || el.dataset.action) return;
  const value = el.dataset.kind === "tags" ? el.value.split(",").map((t) => t.trim()).filter(Boolean) : el.value;
  setPath(el.dataset.path, value);
  markDirty();
});

root.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  const { action, list: listPath, path } = btn.dataset;
  const index = Number(btn.dataset.index);

  if (action === "tab") {
    tab = btn.dataset.tab;
    render();
    window.scrollTo(0, 0);
  } else if (action === "save") {
    save();
  } else if (action === "logout") {
    if (dirty && !confirm("저장하지 않은 변경 사항이 사라집니다. 로그아웃할까요?")) return;
    await fetch("/api/session", { method: "DELETE" });
    dirty = false;
    renderLogin(true);
  } else if (action === "add") {
    const item =
      listPath === "gallery"
        ? { id: newId(), title: "새 작품", image: "", ratio: "1/1", tags: [], description: "" }
        : { id: newId(), title: "새 프로젝트", year: String(new Date().getFullYear()), cover: "", coverRatio: "350/520", images: [], tags: [], description: "" };
    state[listPath] = [item, ...(state[listPath] || [])];
    markDirty();
    render();
    window.scrollTo(0, 0);
    root.querySelector(".card input")?.focus();
  } else if (action === "move") {
    const list = getPath(listPath);
    const to = index + Number(btn.dataset.dir);
    if (!list || to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    markDirty();
    render();
  } else if (action === "remove") {
    const list = getPath(listPath);
    if (!btn.dataset.silent && !confirm(`“${list[index]?.title || "이 항목"}”을(를) 삭제할까요?`)) return;
    list.splice(index, 1);
    markDirty();
    render();
  } else if (action === "clear") {
    setPath(path, "");
    markDirty();
    render();
  } else if (action === "pick") {
    pickSingle(path, btn.dataset.ratio);
  } else if (action === "pick-many") {
    pickMany(listPath);
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && state) {
    e.preventDefault();
    if (dirty) save();
  }
});

window.addEventListener("beforeunload", (e) => {
  if (dirty) e.preventDefault();
});

/* ───────── Boot ───────── */

(async () => {
  try {
    const { authed, configured } = await api("/api/session");
    if (authed) await startEditor();
    else renderLogin(configured);
  } catch (ex) {
    root.innerHTML = `<p class="admin__loading">관리자 API에 연결할 수 없습니다. (${esc(ex.message)})</p>`;
  }
})();

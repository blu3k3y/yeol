// 저장 전에 콘텐츠 모양을 정리하고 검증합니다.
import crypto from "node:crypto";

const str = (v, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const arr = (v, max = 500) => (Array.isArray(v) ? v.slice(0, max) : []);
const url = (v) => {
  const s = str(v, 2000).trim();
  return /^https:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : "";
};
const ratio = (v, fallback) => (/^\d{1,5}(\.\d+)?\/\d{1,5}(\.\d+)?$/.test(str(v, 40)) ? v : fallback);
const tags = (v) => arr(v, 20).map((t) => str(t, 40).trim()).filter(Boolean);

function ids(list) {
  const seen = new Set();
  return list.map((item) => {
    let id = /^[a-z0-9-]{1,60}$/.test(item.id) ? item.id : crypto.randomBytes(5).toString("hex");
    while (seen.has(id)) id = `${id}-${crypto.randomBytes(2).toString("hex")}`;
    seen.add(id);
    return { ...item, id };
  });
}

export function normalize(input) {
  const d = input && typeof input === "object" ? input : {};
  const s = d.site && typeof d.site === "object" ? d.site : {};
  const m = s.main && typeof s.main === "object" ? s.main : {};

  return {
    site: {
      name: str(s.name, 100),
      logo: url(s.logo),
      email: str(s.email, 200),
      main: {
        // 카드 스택에 보일 대표 작품들 (예전 단일 image 필드는 첫 장으로 옮김)
        images: (Array.isArray(m.images) ? m.images : m.image ? [{ src: m.image, alt: m.alt, ratio: m.ratio }] : [])
          .slice(0, 20)
          .map((im = {}) => ({ src: url(im.src), alt: str(im.alt, 200), ratio: ratio(im.ratio, "4/5") }))
          .filter((im) => im.src),
        text: str(m.text, 5000),
      },
    },
    gallery: ids(
      arr(d.gallery).map((g = {}) => ({
        id: str(g.id, 60),
        title: str(g.title, 200),
        image: url(g.image),
        ratio: ratio(g.ratio, "1/1"),
        tags: tags(g.tags),
        description: str(g.description),
      })),
    ),
    projects: ids(
      arr(d.projects).map((p = {}) => ({
        id: str(p.id, 60),
        title: str(p.title, 200),
        year: str(p.year, 20),
        cover: url(p.cover),
        coverRatio: ratio(p.coverRatio, "350/520"),
        images: arr(p.images, 50)
          .map((im = {}) => ({ src: url(im.src), alt: str(im.alt, 200), ratio: ratio(im.ratio, "940/542") }))
          .filter((im) => im.src),
        tags: tags(p.tags),
        description: str(p.description, 20000),
      })),
    ),
  };
}

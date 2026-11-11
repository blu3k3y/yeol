// ─────────────────────────────────────────────────────────────
// 사이트 콘텐츠는 전부 이 파일에서 수정합니다.
// 이미지는 /images 폴더에 넣고 경로를 "/images/파일명.jpg" 처럼 적으세요.
// image 가 비어 있으면("") 회색 자리표시자가 대신 보입니다.
// ratio 는 자리표시자/로딩 중 비율입니다 (가로/세로). 실제 이미지 비율과 맞추면 깜빡임이 없습니다.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "열겸",
  logo: "", // 예: "/images/logo.png" (비우면 이름 텍스트 표시)
  email: "hello@example.com", // CONTACT ME 클릭 시 메일 주소
  main: {
    // 메인 카드 스택에 보일 대표 작품들. 예: { src: "/images/a.jpg", alt: "작품 설명", ratio: "4/5" }
    images: [],
    text: "", // 카드 아래에 보이는 글
  },
};

// GALLERY — 2단 메이슨리 그리드로 배치됩니다.
export const gallery = [
  {
    id: "work-01",
    title: "작업 01",
    image: "",
    ratio: "1/1",
    tags: ["드로잉", "2026", "디지털"],
    description: "작업에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "work-02",
    title: "작업 02",
    image: "",
    ratio: "431/691",
    tags: ["페인팅", "2026"],
    description: "작업에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "work-03",
    title: "작업 03",
    image: "",
    ratio: "431/383",
    tags: ["스케치"],
    description: "작업에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "work-04",
    title: "작업 04",
    image: "",
    ratio: "4/5",
    tags: ["일러스트"],
    description: "작업에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "work-05",
    title: "작업 05",
    image: "",
    ratio: "3/2",
    tags: ["사진"],
    description: "작업에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "work-06",
    title: "작업 06",
    image: "",
    ratio: "1/1",
    tags: ["드로잉"],
    description: "작업에 대한 설명을 여기에 적어주세요.",
  },
];

// PROJECT — 지그재그 2단 카드로 배치됩니다.
// cover: 목록 카드 이미지 / images: 상세 페이지에 차례로 보이는 이미지들
export const projects = [
  {
    id: "project-01",
    title: "프로젝트 01",
    year: "2026",
    cover: "",
    coverRatio: "350/520",
    images: [{ src: "", alt: "프로젝트 01 이미지", ratio: "940/542" }],
    tags: ["브랜딩", "그래픽", "2026"],
    description: "프로젝트에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "project-02",
    title: "프로젝트 02",
    year: "2026",
    cover: "",
    coverRatio: "350/520",
    images: [{ src: "", alt: "프로젝트 02 이미지", ratio: "940/542" }],
    tags: ["편집", "포스터"],
    description: "프로젝트에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "project-03",
    title: "프로젝트 03",
    year: "2025",
    cover: "",
    coverRatio: "350/520",
    images: [{ src: "", alt: "프로젝트 03 이미지", ratio: "940/542" }],
    tags: ["웹", "UI"],
    description: "프로젝트에 대한 설명을 여기에 적어주세요.",
  },
  {
    id: "project-04",
    title: "프로젝트 04",
    year: "2025",
    cover: "",
    coverRatio: "350/520",
    images: [{ src: "", alt: "프로젝트 04 이미지", ratio: "940/542" }],
    tags: ["패키지"],
    description: "프로젝트에 대한 설명을 여기에 적어주세요.",
  },
];

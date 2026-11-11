# yeol

열겸 포트폴리오 백업 사이트. 빌드 없는 정적 사이트(HTML/CSS/JS)라 Vercel에 그대로 배포됩니다.

## 페이지

| 경로 | 화면 |
| --- | --- |
| `/` | MAIN — 대표 이미지 |
| `/gallery` | GALLERY — 2단 메이슨리 |
| `/gallery/:id` | 갤러리 상세 — 이미지 + 태그 + 설명 |
| `/projects` | PROJECT — 지그재그 2단 카드 |
| `/projects/:id` | 프로젝트 상세 — 이미지(여러 장) + 태그 + 설명 |

## 콘텐츠 수정

- 모든 텍스트/이미지는 `data.js` 에서 수정합니다.
- 이미지는 `images/` 폴더에 넣고 `"/images/파일명.jpg"` 로 적습니다.
- `image` 가 비어 있으면 회색 자리표시자가 보입니다.

## 로컬 미리보기

```bash
npx serve -s . -l 3000
```

## 배포

Vercel에서 이 저장소를 Import → Framework Preset `Other` → Deploy.
`vercel.json` 이 모든 경로를 `index.html` 로 연결합니다.

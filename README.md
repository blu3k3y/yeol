# yeol

열겸 포트폴리오 백업 사이트. 정적 HTML/CSS/JS + Vercel 함수(`api/`)로 된 관리자 편집 기능.

## 페이지

| 경로 | 화면 |
| --- | --- |
| `/` | MAIN — 대표 이미지 |
| `/gallery` | GALLERY — 2단 메이슨리 |
| `/gallery/:id` | 갤러리 상세 — 이미지 + 태그 + 설명 |
| `/projects` | PROJECT — 지그재그 2단 카드 |
| `/projects/:id` | 프로젝트 상세 — 이미지(여러 장) + 태그 + 설명 |
| `/admin` | 관리자 — 로그인 후 메인 글/이미지, 갤러리, 프로젝트, 설정 편집 |

## 콘텐츠 수정

- `/admin` 에 로그인해서 편집하고 **저장**(Ctrl/Cmd+S)을 누르면 바로 사이트에 반영됩니다.
- 저장된 내용은 Vercel Blob 의 `site/content.json`, 이미지는 `uploads/` 에 들어갑니다.
- 아직 한 번도 저장하지 않았으면 `data.js` 의 기본값이 보입니다.
- 이미지는 업로드 시 브라우저에서 긴 변 2400px 이하로 줄여 올립니다 (GIF는 원본, 4MB 이하).

## 배포 (Vercel)

1. 저장소 Import → Application Preset `Other` → Deploy
2. 프로젝트 → **Storage** → **Create** → **Blob** (접근 권한 Public) → 이 프로젝트에 연결
   → `BLOB_READ_WRITE_TOKEN` 이 자동으로 추가됩니다.
3. **Settings → Environment Variables** 에 추가
   - `ADMIN_PASSWORD`: 관리자 비밀번호 (길고 추측하기 어렵게)
   - `SESSION_SECRET`: 아무 긴 임의 문자열 (선택, 바꾸면 모든 로그인 해제)
4. **Redeploy** (환경변수는 새 배포부터 적용)

## 로컬 개발

`.env.local` 에 `ADMIN_PASSWORD=...` 를 적고:

```bash
npm install
npm run dev
```

http://localhost:3000 — Blob 토큰이 없으면 `.data/` 폴더에 저장됩니다.

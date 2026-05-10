# NEAF Amazon Dashboard

Vercel 정적 호스팅 + Serverless Function (Google Sheets API + 서비스 계정).
`https://rejuall-amz-us.vercel.app/` 와 동일한 형식 — Overview + 제품별 대시보드 두 뷰만.

## 구조
```
dashboard-neaf/
├── index.html         # 프론트 (Vercel 정적 서빙)
├── api/data.js        # Serverless Function — 시트에서 JSON 반환
├── package.json       # googleapis 의존성
└── vercel.json        # Vercel 설정
```

## 데이터 소스
- 스프레드시트 ID: `1K13KEhv4hkHZsfg78Zh5WrdO4QdYcvUkVqEA6TJqxRI`
- 자동 감지되는 탭: Date / Sessions / Child ASIN 헤더가 모두 있는 시트 (예: gid=1307679662)
- 선택 사항: `목표 매출` 탭 (월별 매출 목표 KRW), `ASIN-INFO` 탭 (제품명 매핑)

## 배포 절차

### 1. Google Cloud — 서비스 계정
rejuall에서 사용 중인 서비스 계정 그대로 재사용 가능.
새로 만들 경우:
1. [console.cloud.google.com](https://console.cloud.google.com) → 프로젝트 → **API 및 서비스 > 라이브러리**
2. "Google Sheets API" → **사용 설정**
3. **사용자 인증 정보 만들기 > 서비스 계정** → JSON 키 다운로드

### 2. 시트 공유
Google Sheets 열기 → **공유** → 서비스 계정 이메일 (`xxx@xxx.iam.gserviceaccount.com`)을 **뷰어** 권한으로 추가.

### 3. GitHub & Vercel
```bash
cd C:\Users\USER\Desktop\MD\dashboard-neaf
git init
git add .
git commit -m "NEAF dashboard initial"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<REPO>.git
git push -u origin main
```
→ Vercel: Add New → Project → Import → 환경변수 `GOOGLE_SERVICE_ACCOUNT_JSON` 추가 → Deploy.

## 브랜드/제품 커스터마이징

- `api/data.js` 상단 `PRODUCT_NAMES` / `PRODUCT_COLORS` 매핑
- `index.html`
  - `<title>` — 브라우저 탭 제목
  - `.logo` — 헤더 로고 텍스트
  - `STATE.hardcodedGoalsKRW` — 월별 목표 매출 (KRW). 비어 있으면 시트 `목표 매출` 탭 또는 localStorage fallback.
  - `CAL_EVENTS` — 캘린더에 강조할 프로모션 이벤트 (Brand Day, Prime Day 등).

## 캐시 강제 갱신
URL 끝에 `?fresh=1` → 캐시 무시.

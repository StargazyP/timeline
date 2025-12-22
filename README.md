# Google Timeline 위치 기록 시각화

Google Takeout에서 다운로드한 위치 기록을 시각화하는 웹 애플리케이션입니다.

## 기능

- 📤 Google Takeout ZIP 파일 업로드
- 📊 위치 기록 통계 미리보기
- 🗺️ 인터랙티브 지도 시각화
- ⏯️ 타임라인 재생/정지 기능
- 🎨 세련된 UI/UX

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 서버 실행

```bash
npm start
```

또는 개발 모드 (nodemon 사용):

```bash
npm run dev
```

### 3. 브라우저에서 접속

- 업로드 페이지: http://localhost:3000/upload.html
- 지도 페이지: http://localhost:3000/index.html

## 사용 방법

1. **Google Takeout에서 데이터 다운로드**
   - https://takeout.google.com 접속
   - 위치 기록(Location History) 선택
   - ZIP 파일 다운로드

2. **ZIP 파일 업로드**
   - 업로드 페이지에서 ZIP 파일 선택
   - 데이터 미리보기 확인
   - 동의 후 업로드

3. **지도에서 확인**
   - 업로드 완료 후 지도 페이지로 이동
   - 타임라인 슬라이더로 시간대별 이동 확인
   - 재생 버튼으로 자동 재생

## 프로젝트 구조

```
timeline/
├── server.js          # Express 서버
├── package.json       # 프로젝트 설정 및 의존성
├── upload.html        # 업로드 페이지
├── index.html         # 지도 시각화 페이지
├── public/            # 정적 파일 디렉토리
│   └── visits.json    # 업로드된 위치 기록 데이터
└── uploads/           # 임시 업로드 파일 저장소
```

## API 엔드포인트

- `POST /api/upload/preview` - ZIP 파일 미리보기 (통계만 반환)
- `POST /api/upload` - ZIP 파일 업로드 및 저장
- `GET /api/stats` - 저장된 데이터 통계 조회

## 기술 스택

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **라이브러리**:
  - Leaflet (지도 시각화)
  - JSZip (ZIP 파일 처리)
  - Multer (파일 업로드)

## 라이선스

MIT


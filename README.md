# Google Timeline 위치 기록 시각화 애플리케이션

Google Takeout에서 다운로드한 위치 기록 데이터를 인터랙티브 지도에 시각화하는 웹 애플리케이션입니다.

## 📋 목차

- [프로젝트 소개](#프로젝트-소개)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [사용 방법](#사용-방법)
- [API 명세서](#api-명세서)
- [배포](#배포)
- [성능 최적화](#성능-최적화)

---

## 프로젝트 소개

이 프로젝트는 Google Takeout에서 내보낸 위치 기록 데이터를 시각화하는 웹 애플리케이션입니다. 사용자가 Google 위치 기록 ZIP 파일을 업로드하면, 데이터를 파싱하고 최적화하여 인터랙티브 지도에 표시합니다.

### 핵심 특징

-  **ZIP 파일 업로드**: Google Takeout ZIP 파일 직접 업로드 지원
-  **데이터 미리보기**: 업로드 전 통계 정보 미리 확인
-  **인터랙티브 지도**: MapLibre GL JS 기반 고성능 지도 시각화
-  **타임라인 재생**: 시간대별 위치 기록 자동 재생 기능
-  **세련된 UI/UX**: 모던한 그라디언트 디자인과 반응형 레이아웃
-  **자동 배포**: GitHub Webhook을 통한 자동 배포 지원
-  **Docker 지원**: Docker Compose를 통한 컨테이너화된 배포

---

## 주요 기능

### 1. 데이터 업로드 및 처리

- **ZIP 파일 업로드**
  - Google Takeout ZIP 파일 업로드 (최대 500MB)
  - 파일 형식 검증 (ZIP 파일만 허용)
  - 업로드 진행률 표시

- **데이터 파싱 및 최적화**
  - Semantic Location History JSON 파일 자동 탐지
  - 필요한 필드만 추출하여 메모리 사용량 최적화 (30-40% 감소)
  - 대용량 파일 처리 지원 (청크 단위 처리)
  - 메모리 사용량 모니터링

- **통계 정보 제공**
  - 전체 방문 기록 수
  - 집(Home), 직장(Work), 기타 장소별 분류
  - 날짜 범위 (시작일 ~ 종료일)
  - 연도별 통계

### 2. 지도 시각화

- **인터랙티브 지도**
  - MapLibre GL JS 기반 고성능 지도 렌더링
  - 줌 인/아웃, 팬(이동) 기능
  - 위치 마커 표시
  - 클러스터링 지원 (많은 마커 효율적 표시)

- **타임라인 컨트롤**
  - 시간대별 슬라이더
  - 현재 날짜/시간 표시
  - 현재 위치 정보 표시
  - 재생/정지 기능
  - 재생 속도 조절 (1x, 2x, 4x, 8x)

- **데이터 필터링**
  - 날짜 범위 선택
  - 장소 유형별 필터링 (집, 직장, 기타)
  - 실시간 필터 적용

### 3. 데이터 관리

- **데이터 저장**
  - 업로드된 데이터를 `visits.json` 파일로 저장
  - JSON 형식으로 최적화된 데이터 저장
  - 영구 저장 (Docker 볼륨 마운트)

- **데이터 다운로드**
  - 독립 실행 가능한 HTML 파일 다운로드
  - 데이터가 인라인으로 포함되어 CORS 문제 해결
  - 오프라인에서도 실행 가능

### 4. 자동 배포 시스템

- **GitHub Webhook 통합**
  - GitHub push 이벤트 수신
  - 자동 Docker 이미지 빌드 및 배포
  - Docker Compose를 통한 컨테이너 관리
  - 배포 상태 확인 및 로그 출력

---

## 기술 스택

### Backend
- **Runtime**: Node.js 18 LTS
- **Framework**: Express.js 4.18.2
- **파일 처리**: Multer 1.4.5 (파일 업로드)
- **ZIP 처리**: JSZip 3.10.1
- **CORS**: cors 2.8.5

### Frontend
- **지도 라이브러리**: MapLibre GL JS 3.6.2
- **스타일링**: 순수 CSS (그라디언트 디자인)
- **JavaScript**: Vanilla JavaScript (ES6+)

### 배포 및 인프라
- **컨테이너화**: Docker, Docker Compose
- **프로세스 관리**: PM2
- **웹 서버**: Express.js (정적 파일 서빙)
- **자동 배포**: GitHub Webhook 서버

### 개발 도구
- **개발 서버**: nodemon 3.0.1
- **메모리 관리**: Node.js --max-old-space-size=4096

---

## 프로젝트 구조

```
timeline/
├── server.js              # Express 서버 메인 파일
├── webhook-server.js      # GitHub Webhook 서버 (자동 배포)
├── webhook-setup.sh       # Webhook 서버 설정 스크립트
├── package.json           # 프로젝트 설정 및 의존성
├── package-lock.json      # 의존성 잠금 파일
├── ecosystem.config.js    # PM2 설정 파일
├── Dockerfile             # Docker 이미지 빌드 설정
├── docker-compose.yml     # Docker Compose 설정
├── nginx.conf.example     # Nginx 설정 예제
├── .gitignore             # Git 제외 파일 목록
├── .dockerignore          # Docker 빌드 제외 파일 목록
│
├── public/                 # 정적 파일 디렉토리
│   ├── index.html         # 지도 시각화 페이지
│   ├── upload.html         # 업로드 페이지
│   └── visits.json        # 업로드된 위치 기록 데이터
│
├── uploads/                # 임시 업로드 파일 저장소
├── data/                   # 데이터 파일 저장소
└── logs/                   # 로그 파일 저장소
```

---

## 설치 및 실행

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- (선택) Docker 및 Docker Compose (컨테이너 배포 시)

### 로컬 개발 환경 설정

#### 1. 저장소 클론

```bash
git clone <repository-url>
cd timeline
```

#### 2. 의존성 설치

```bash
npm install
```

#### 3. 서버 실행

**개발 모드** (nodemon 사용, 파일 변경 시 자동 재시작):
```bash
npm run dev
```

**프로덕션 모드**:
```bash
npm start
```

#### 4. 브라우저에서 접속

- **업로드 페이지**: http://localhost:3004/
- **지도 페이지**: http://localhost:3004/index

### Docker를 사용한 실행

#### 1. Docker 이미지 빌드

```bash
docker compose build
```

#### 2. 컨테이너 실행

```bash
docker compose up -d
```

#### 3. 로그 확인

```bash
docker compose logs -f timeline-app
```

#### 4. 컨테이너 중지

```bash
docker compose down
```

### PM2를 사용한 프로덕션 실행

#### 1. PM2로 애플리케이션 시작

```bash
npm run pm2:start
```

#### 2. PM2 상태 확인

```bash
npm run pm2:status
# 또는
pm2 status
```

#### 3. 로그 확인

```bash
npm run pm2:logs
# 또는
pm2 logs
```

#### 4. 애플리케이션 재시작

```bash
npm run pm2:restart
```

#### 5. 애플리케이션 중지

```bash
npm run pm2:stop
```

---

## 사용 방법

### 1. Google Takeout에서 데이터 다운로드

1. **Google Takeout 접속**
   - https://takeout.google.com 접속
   - Google 계정으로 로그인

2. **위치 기록 선택**
   - "위치 기록" 또는 "Location History" 선택
   - 형식: JSON
   - 기간: 원하는 기간 선택 (전체 또는 특정 기간)

3. **ZIP 파일 다운로드**
   - "다음 단계" 클릭
   - "아카이브 만들기" 클릭
   - 다운로드 완료 대기 (시간이 걸릴 수 있음)

### 2. ZIP 파일 업로드

1. **업로드 페이지 접속**
   - http://localhost:3004/ 접속
   - 또는 배포된 서버 주소 접속

2. **파일 선택 및 미리보기**
   - "ZIP 파일 선택" 버튼 클릭
   - 다운로드한 ZIP 파일 선택
   - 통계 정보 확인 (전체 기록 수, 날짜 범위 등)

3. **데이터 업로드**
   - "업로드하기" 버튼 클릭
   - 업로드 완료 대기
   - 성공 메시지 확인

### 3. 지도에서 확인

1. **지도 페이지 접속**
   - 업로드 완료 후 "지도 보기" 버튼 클릭
   - 또는 http://localhost:3004/index 직접 접속

2. **타임라인 탐색**
   - 상단 슬라이더로 시간대 이동
   - 재생 버튼으로 자동 재생
   - 재생 속도 조절 (1x, 2x, 4x, 8x)

3. **지도 조작**
   - 마우스 휠로 줌 인/아웃
   - 드래그로 지도 이동
   - 마커 클릭으로 위치 정보 확인

### 4. 데이터 다운로드

- 지도 페이지에서 "다운로드" 버튼 클릭
- 독립 실행 가능한 HTML 파일 다운로드
- 오프라인에서도 실행 가능 (인터넷 연결 필요: MapLibre GL JS 로드)

---

## API 명세서

### 페이지 라우트

#### 1. 업로드 페이지
- **Method**: `GET`
- **Endpoint**: `/`
- **Response**: `upload.html` 파일 반환

#### 2. 지도 페이지
- **Method**: `GET`
- **Endpoint**: `/index`
- **Response**: `index.html` 파일 반환

### REST API

#### 1. ZIP 파일 미리보기
- **Method**: `POST`
- **Endpoint**: `/api/upload/preview`
- **Content-Type**: `multipart/form-data`
- **Request**:
  - `zipfile` (File): ZIP 파일
- **Response**:
```json
{
  "success": true,
  "stats": {
    "total": 1000,
    "home": 200,
    "work": 150,
    "other": 650,
    "dateRange": {
      "start": "2020-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z",
      "startYear": 2020,
      "endYear": 2024
    }
  },
  "totalRecords": 1000
}
```

#### 2. ZIP 파일 업로드 및 저장
- **Method**: `POST`
- **Endpoint**: `/api/upload`
- **Content-Type**: `multipart/form-data`
- **Request**:
  - `zipfile` (File): ZIP 파일
- **Response**:
```json
{
  "success": true,
  "message": "업로드가 완료되었습니다.",
  "stats": {
    "total": 1000,
    "home": 200,
    "work": 150,
    "other": 650,
    "dateRange": {
      "start": "2020-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z",
      "startYear": 2020,
      "endYear": 2024
    }
  }
}
```

#### 3. 통계 조회
- **Method**: `GET`
- **Endpoint**: `/api/stats`
- **Response**:
```json
{
  "success": true,
  "stats": {
    "total": 1000,
    "home": 200,
    "work": 150,
    "other": 650,
    "dateRange": {
      "start": "2020-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z",
      "startYear": 2020,
      "endYear": 2024
    }
  }
}
```

#### 4. 독립 실행 가능한 HTML 다운로드
- **Method**: `GET`
- **Endpoint**: `/api/download`
- **Response**: HTML 파일 다운로드 (Content-Type: `text/html`)
- **설명**: `visits.json` 데이터가 인라인으로 포함된 HTML 파일

#### 5. 타일 프록시 (CORS 문제 해결)
- **Method**: `GET`
- **Endpoint**: `/api/tiles/:z/:x/:y.png`
- **Path Parameters**:
  - `z`: 줌 레벨
  - `x`: 타일 X 좌표
  - `y`: 타일 Y 좌표
- **Response**: PNG 타일 이미지
- **설명**: OpenStreetMap 타일을 프록시하여 CORS 문제 해결

---

## 배포

### Docker Compose를 사용한 배포

#### 1. 환경 변수 설정

`.env` 파일 생성 (선택사항):
```env
PORT=3004
NODE_ENV=production
```

#### 2. Docker Compose 실행

```bash
docker compose up -d --build
```

#### 3. 헬스 체크 확인

```bash
docker compose ps
```

#### 4. 로그 확인

```bash
docker compose logs -f timeline-app
```

### GitHub Webhook을 통한 자동 배포

#### 1. Webhook 서버 설정

```bash
chmod +x webhook-setup.sh
./webhook-setup.sh
```

#### 2. GitHub Webhook 설정

1. GitHub 저장소 → Settings → Webhooks
2. "Add webhook" 클릭
3. 설정:
   - **Payload URL**: `http://your-server:3005/webhook`
   - **Content type**: `application/json`
   - **Secret**: 환경 변수 `WEBHOOK_SECRET`에 설정한 값
   - **Events**: "Just the push event" 선택
   - **Active**: 체크

#### 3. Webhook 서버 관리

```bash
# Webhook 서버 시작
npm run webhook:pm2:start

# Webhook 서버 중지
npm run webhook:pm2:stop

# Webhook 서버 재시작
npm run webhook:pm2:restart

# Webhook 로그 확인
npm run webhook:pm2:logs
```

#### 4. 자동 배포 동작

- GitHub에 push 이벤트 발생 시
- Webhook 서버가 이벤트 수신
- Docker Compose를 사용하여 자동 빌드 및 배포
- 배포 상태 및 로그 출력

### Nginx 리버스 프록시 설정 (선택사항)

`nginx.conf.example` 파일을 참고하여 Nginx 설정:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 성능 최적화

### 메모리 최적화

1. **데이터 최적화**
   - 필요한 필드만 추출 (startTime, endTime, placeLocation, semanticType)
   - 원본 데이터 대비 30-40% 메모리 사용량 감소

2. **청크 단위 처리**
   - 대용량 파일을 청크 단위로 처리
   - 메모리 사용량 모니터링
   - 주기적인 가비지 컬렉션 힌트

3. **Node.js 메모리 설정**
   - `--max-old-space-size=4096` 옵션으로 힙 메모리 4GB 제한
   - PM2 메모리 제한 설정 (3GB)

### 파일 처리 최적화

1. **스트리밍 처리**
   - ZIP 파일을 스트리밍으로 읽기
   - JSON 파일을 청크 단위로 파싱

2. **임시 파일 관리**
   - 업로드 후 임시 파일 자동 삭제
   - 에러 발생 시에도 임시 파일 정리

### 지도 렌더링 최적화

1. **클러스터링**
   - 많은 마커를 효율적으로 표시
   - 줌 레벨에 따라 자동 클러스터링

2. **타일 프록시**
   - CORS 문제 해결
   - 타일 캐싱 가능

---

## 문제 해결

### 일반적인 문제

#### 1. 메모리 부족 오류
- **증상**: "JavaScript heap out of memory" 오류
- **해결**: `--max-old-space-size=4096` 옵션 사용 확인
- **PM2 설정**: `ecosystem.config.js`에서 메모리 제한 확인

#### 2. ZIP 파일 파싱 실패
- **증상**: "위치 기록 JSON 파일을 찾을 수 없습니다" 오류
- **해결**: 
  - Google Takeout에서 올바른 형식으로 다운로드했는지 확인
  - ZIP 파일 내부에 JSON 파일이 있는지 확인

#### 3. 지도가 표시되지 않음
- **증상**: 지도가 비어있거나 로드되지 않음
- **해결**:
  - 브라우저 콘솔에서 오류 확인
  - `visits.json` 파일이 존재하는지 확인
  - 네트워크 연결 확인 (MapLibre GL JS 로드 필요)

#### 4. 업로드 실패
- **증상**: 파일 업로드 시 오류 발생
- **해결**:
  - 파일 크기 확인 (500MB 제한)
  - 파일 형식 확인 (ZIP 파일만 허용)
  - 서버 로그 확인

---

## 라이선스

MIT License

---

## 기여

이슈 리포트 및 풀 리퀘스트를 환영합니다!

---

## 작성자

개인 포트폴리오 프로젝트

# GitHub 저장소 설정 가이드

## 📋 단계별 설정 순서

### 1단계: GitHub에서 새 저장소 생성

1. GitHub에 로그인
2. 우측 상단의 `+` 버튼 클릭 → `New repository` 선택
3. 저장소 정보 입력:
   - **Repository name**: `timeline` (또는 원하는 이름)
   - **Description**: `Google Timeline 위치 기록 시각화 애플리케이션`
   - **Visibility**: Public 또는 Private 선택
   - **⚠️ 중요**: `Add a README file`, `Add .gitignore`, `Choose a license`는 **체크하지 마세요** (이미 파일이 있으므로)
4. `Create repository` 클릭

### 2단계: 로컬 Git 저장소 초기화 및 설정

```bash
# 프로젝트 디렉토리로 이동
cd /home/jangdonggun/포트폴리오/timeline

# Git 저장소 초기화
git init

# 기본 브랜치를 main으로 설정
git branch -M main

# 모든 파일 추가 (node_modules 등은 .gitignore에 의해 제외됨)
git add .

# 첫 커밋
git commit -m "Initial commit: Timeline visualization app with CI/CD"

# GitHub 저장소를 remote로 추가 (YOUR_USERNAME을 실제 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/timeline.git

# 또는 SSH 사용 시:
# git remote add origin git@github.com:YOUR_USERNAME/timeline.git

# GitHub에 push
git push -u origin main
```

### 3단계: GitHub Secrets 설정 (push 후 설정 가능)

GitHub 저장소가 생성되고 push가 완료된 후:

1. GitHub 저장소 페이지로 이동
2. `Settings` → `Secrets and variables` → `Actions` 클릭
3. `New repository secret` 버튼 클릭
4. 다음 secrets 추가:

#### 필수 Secrets:
- `SSH_HOST`: 서버 주소 (예: `jangdonggun.iptime.org`)
- `SSH_USERNAME`: 서버 사용자명 (예: `jangdonggun`)
- `SSH_PRIVATE_KEY`: SSH 개인키 전체 내용

#### 선택적 Secrets:
- `SSH_PORT`: SSH 포트 (기본값: 22)
- `DOCKERHUB_USERNAME`: Docker Hub 사용자명 (Docker Hub 사용 시)
- `DOCKERHUB_TOKEN`: Docker Hub 토큰
- `WEBHOOK_URL`: Webhook URL (빠른 배포용)

### 4단계: 첫 배포 테스트

Secrets 설정 후:

1. 코드를 약간 수정하거나
2. GitHub Actions 탭에서 `Deploy Timeline App` 워크플로우를 수동 실행 (`Run workflow`)

## ⚠️ 주의사항

### .gitignore 확인

다음 파일들이 제외되는지 확인:
- `node_modules/`
- `uploads/`
- `data/`
- `logs/`
- `public/visits.json`
- `.env`

### 첫 push 전 체크리스트

- [ ] `.gitignore` 파일이 올바르게 설정되어 있는지 확인
- [ ] 민감한 정보(비밀번호, API 키 등)가 코드에 하드코딩되지 않았는지 확인
- [ ] `.github/workflows/` 디렉토리가 포함되어 있는지 확인
- [ ] `package.json`과 `package-lock.json`이 포함되어 있는지 확인

## 🚀 빠른 시작 명령어

```bash
cd /home/jangdonggun/포트폴리오/timeline

# Git 초기화
git init
git branch -M main

# 파일 추가 및 커밋
git add .
git commit -m "Initial commit: Timeline app with GitHub Actions CI/CD"

# Remote 추가 (YOUR_USERNAME 변경 필요)
git remote add origin https://github.com/YOUR_USERNAME/timeline.git

# Push
git push -u origin main
```

## 📝 다음 단계

1. ✅ GitHub 저장소 생성
2. ✅ 코드 push
3. ✅ Secrets 설정
4. ✅ 첫 배포 테스트
5. ✅ 배포 성공 확인

## 🔍 문제 해결

### push 실패 시
```bash
# Remote URL 확인
git remote -v

# Remote URL 수정
git remote set-url origin https://github.com/YOUR_USERNAME/timeline.git
```

### 이미 다른 remote가 있는 경우
```bash
# 기존 remote 확인
git remote -v

# 기존 remote 제거 후 새로 추가
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/timeline.git
```


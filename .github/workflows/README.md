# GitHub Actions CI/CD 설정 가이드

## 필요한 GitHub Secrets 설정

이 워크플로우를 사용하려면 다음 Secrets를 GitHub 저장소에 설정해야 합니다:

### 1. SSH 배포 정보 (필수)
- `SSH_HOST`: 배포 서버 호스트 주소 (예: `jangdonggun.iptime.org`)
- `SSH_USERNAME`: SSH 사용자명 (예: `ubuntu` 또는 `jangdonggun`)
- `SSH_PRIVATE_KEY`: SSH 개인 키
- `SSH_PORT`: SSH 포트 (기본값: 22, 선택사항)

### 2. Docker Hub 인증 정보 (선택사항)
- `DOCKERHUB_USERNAME`: Docker Hub 사용자명
- `DOCKERHUB_TOKEN`: Docker Hub 비밀번호 또는 Access Token

### 3. Webhook 배포 (선택사항)
- `WEBHOOK_URL`: Webhook URL (예: `http://jangdonggun.iptime.org:3000/webhook`)

## Secrets 설정 방법

1. GitHub 저장소로 이동
2. Settings → Secrets and variables → Actions 클릭
3. "New repository secret" 버튼 클릭
4. 위의 각 Secret을 추가

### SSH Secrets 설정 예시

- `SSH_HOST`: `jangdonggun.iptime.org`
- `SSH_USERNAME`: `jangdonggun` (또는 실제 사용자명)
- `SSH_PRIVATE_KEY`: SSH 개인 키 전체 내용 (-----BEGIN OPENSSH PRIVATE KEY----- 부터 끝까지)
- `SSH_PORT`: `22` (또는 사용하는 포트)

### SSH 개인 키 생성 방법 (없는 경우)

```bash
# 서버에서 SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "github-actions"

# 공개 키를 서버의 authorized_keys에 추가
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# 개인 키 내용 복사 (GitHub Secrets에 추가)
cat ~/.ssh/id_rsa
```

## 워크플로우 설명

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**트리거:**
- Pull Request 생성 시
- main/master/develop 브랜치에 push 시

**작업:**
- 코드 체크아웃
- Node.js 18 설정
- 의존성 설치 및 코드 품질 검사
- Docker 이미지 빌드 (push 시 Docker Hub에 푸시)

### 2. Deploy Pipeline (`.github/workflows/deploy.yml`)

**트리거:**
- main/master 브랜치에 push 시
- 수동 실행 (workflow_dispatch)

**작업:**
1. Webhook을 통한 빠른 배포 시도 (선택사항)
2. 실패 시 SSH를 통한 서버 배포
3. docker-compose를 사용한 컨테이너 재시작
4. 헬스 체크로 배포 확인

## Secrets 설정 방법

1. GitHub 저장소로 이동
2. Settings > Secrets and variables > Actions 클릭
3. "New repository secret" 버튼 클릭
4. Name에 위의 secret 이름 입력
5. Secret에 값 입력
6. "Add secret" 클릭

## 배포 프로세스

### 자동 배포
- main 또는 master 브랜치에 코드를 push하면 자동으로 배포가 시작됩니다.

### 수동 배포
1. GitHub 저장소의 Actions 탭으로 이동
2. "Deploy Timeline App" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 후 "Run workflow" 클릭

## 서버 준비 사항

배포 전에 서버에 다음이 설치되어 있어야 합니다:

1. **Docker**: 
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

2. **Docker Compose**:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **디렉토리 구조**:
   ```bash
   mkdir -p ~/포트폴리오/timeline
   ```

4. **SSH 키 인증 설정**:
   ```bash
   # GitHub Actions에서 사용할 공개키를 authorized_keys에 추가
   echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

## 트러블슈팅

### SSH 연결 실패
- SSH_PRIVATE_KEY가 올바르게 설정되었는지 확인
- 서버의 SSH 설정 확인 (`/etc/ssh/sshd_config`)
- 방화벽에서 SSH 포트(22)가 열려있는지 확인

### Docker 이미지 빌드 실패
- Dockerfile이 올바른지 확인
- package.json의 의존성이 올바른지 확인

### 배포 실패
- 서버에 Docker와 Docker Compose가 설치되어 있는지 확인
- 서버의 디스크 공간 확인
- docker-compose.yml 파일이 올바른지 확인

### 헬스 체크 실패
- 애플리케이션이 정상적으로 시작되었는지 확인
- 포트 3004가 열려있는지 확인
- 서버 로그 확인: `docker-compose logs`

## 보안 고려사항

1. **SSH 키 보안**: SSH_PRIVATE_KEY는 절대 공개하지 마세요
2. **Secrets 관리**: 모든 민감한 정보는 GitHub Secrets에 저장하세요
3. **서버 접근 제어**: SSH 키 기반 인증만 허용하도록 설정하세요
4. **방화벽 설정**: 필요한 포트만 열어두세요

## 참고 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)


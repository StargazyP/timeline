# GitHub Actions CI/CD 설정 가이드

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [워크플로우 설명](#워크플로우-설명)
3. [필수 Secrets 설정](#필수-secrets-설정)
4. [서버 준비 사항](#서버-준비-사항)
5. [배포 프로세스](#배포-프로세스)
6. [트러블슈팅](#트러블슈팅)

## 프로젝트 개요

**Timeline Visits Map** 프로젝트는 Google Timeline 위치 기록을 시각화하는 Node.js 애플리케이션입니다.

- **런타임**: Node.js 18
- **프레임워크**: Express.js
- **프로세스 관리**: PM2
- **컨테이너화**: Docker + Docker Compose
- **포트**: 3004

## 워크플로우 설명

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**목적**: 코드 품질 검사 및 빌드 테스트

**트리거**:
- Pull Request 생성 시
- main/master 브랜치에 push 시

**실행 단계**:
1. 코드 체크아웃
2. Node.js 18 환경 설정
3. npm 의존성 설치 (`npm ci`)
4. 코드 문법 검사
5. Docker 이미지 빌드 테스트

### 2. Deploy Pipeline (`.github/workflows/deploy.yml`)

**목적**: 자동 배포

**트리거**:
- main/master 브랜치에 push 시
- 수동 실행 (GitHub Actions UI에서)

**실행 단계**:
1. ✅ 코드 체크아웃
2. ✅ Node.js 18 환경 설정
3. ✅ 의존성 설치
4. ✅ Docker 이미지 빌드
5. ✅ 이미지를 tar.gz로 저장
6. ✅ SSH 키 설정
7. ✅ 파일 전송 (docker-compose.yml, Docker 이미지)
8. ✅ 서버에서 배포 실행
9. ✅ 헬스 체크

## 필수 Secrets 설정

GitHub 저장소에서 다음 secrets를 설정해야 합니다:

**경로**: `Settings` > `Secrets and variables` > `Actions` > `New repository secret`

### 1. SSH_PRIVATE_KEY (필수)

**설명**: 서버에 SSH 접속하기 위한 개인키

**생성 방법**:

```bash
# 로컬 또는 서버에서 SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "github-actions-timeline" -f ~/.ssh/github_actions_timeline

# 공개키를 서버의 authorized_keys에 추가
cat ~/.ssh/github_actions_timeline.pub >> ~/.ssh/authorized_keys

# 개인키 내용 확인 (전체 내용을 복사)
cat ~/.ssh/github_actions_timeline
```

**값 예시**:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(전체 키 내용)
...
-----END RSA PRIVATE KEY-----
```

**주의사항**:
- 개인키 전체 내용을 복사해야 합니다
- 줄바꿈도 포함해야 합니다
- 공백이나 추가 문자 없이 정확히 복사하세요

### 2. SSH_HOST (필수)

**설명**: 배포할 서버의 호스트 주소

**값 예시**:
- `jangdonggun.iptime.org`
- `192.168.1.100`
- `example.com`

**확인 방법**:
```bash
# 서버의 호스트명 확인
hostname -f

# 또는 IP 주소 확인
hostname -I
```

### 3. SSH_USER (필수)

**설명**: 서버의 사용자명

**값 예시**:
- `jangdonggun`
- `ubuntu`
- `root` (권장하지 않음)

**확인 방법**:
```bash
# 현재 사용자 확인
whoami
```

## 서버 준비 사항

배포 전에 서버에 다음을 설치하고 설정해야 합니다:

### 1. Docker 설치

```bash
# Docker 설치 스크립트 실행
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 설치 확인
docker --version
```

### 2. Docker Compose 설치

```bash
# 최신 버전 다운로드
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 실행 권한 부여
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker-compose --version
```

### 3. 디렉토리 구조 생성

```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/포트폴리오/timeline

# 필요한 하위 디렉토리 생성
cd ~/포트폴리오/timeline
mkdir -p uploads data logs public

# 권한 설정
chmod 755 uploads data logs public
```

### 4. SSH 키 인증 설정

```bash
# .ssh 디렉토리 생성 (없는 경우)
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# authorized_keys 파일 생성/수정
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# GitHub Actions 공개키 추가
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# SSH 설정 확인
cat ~/.ssh/authorized_keys
```

### 5. 방화벽 설정

```bash
# 포트 3004 열기 (필요한 경우)
sudo ufw allow 3004/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw reload
```

## 배포 프로세스

### 자동 배포

1. 코드 변경 후 main/master 브랜치에 push:
   ```bash
   git add .
   git commit -m "Update: 변경 사항"
   git push origin main
   ```

2. GitHub Actions가 자동으로 실행됩니다.

3. Actions 탭에서 진행 상황 확인:
   - GitHub 저장소 > `Actions` 탭
   - `Deploy Timeline App` 워크플로우 확인

### 수동 배포

1. GitHub 저장소의 `Actions` 탭으로 이동
2. 왼쪽 사이드바에서 `Deploy Timeline App` 선택
3. `Run workflow` 버튼 클릭
4. 브랜치 선택 (main 또는 master)
5. `Run workflow` 클릭

### 배포 확인

배포가 완료되면 다음 명령어로 확인할 수 있습니다:

```bash
# 서버에 SSH 접속
ssh 사용자명@서버주소

# 컨테이너 상태 확인
cd ~/포트폴리오/timeline
docker-compose ps

# 로그 확인
docker-compose logs -f

# 애플리케이션 접속 테스트
curl http://localhost:3004/
```

## 트러블슈팅

### ❌ SSH 연결 실패

**증상**: `Permission denied (publickey)` 오류

**해결 방법**:
1. SSH_PRIVATE_KEY가 올바르게 설정되었는지 확인
2. 공개키가 서버의 `~/.ssh/authorized_keys`에 추가되었는지 확인
3. SSH 키 권한 확인:
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```
4. 서버의 SSH 설정 확인:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # 다음 설정 확인:
   # PubkeyAuthentication yes
   # AuthorizedKeysFile .ssh/authorized_keys
   ```

### ❌ Docker 이미지 빌드 실패

**증상**: `docker build` 단계에서 실패

**해결 방법**:
1. Dockerfile이 올바른지 확인
2. package.json의 의존성 확인
3. 로컬에서 빌드 테스트:
   ```bash
   docker build -t timeline-test .
   ```

### ❌ 배포 실패

**증상**: 서버에서 docker-compose 실행 실패

**해결 방법**:
1. 서버에 Docker와 Docker Compose가 설치되어 있는지 확인
2. 디스크 공간 확인:
   ```bash
   df -h
   ```
3. docker-compose.yml 파일 확인
4. 서버 로그 확인:
   ```bash
   docker-compose logs
   ```

### ❌ 헬스 체크 실패

**증상**: 배포 후 애플리케이션이 응답하지 않음

**해결 방법**:
1. 컨테이너 상태 확인:
   ```bash
   docker-compose ps
   ```
2. 컨테이너 로그 확인:
   ```bash
   docker-compose logs timeline-app
   ```
3. 포트가 열려있는지 확인:
   ```bash
   netstat -tulpn | grep 3004
   ```
4. 방화벽 설정 확인:
   ```bash
   sudo ufw status
   ```

### ❌ 타일 로딩 실패

**증상**: 지도 타일이 로드되지 않음

**해결 방법**:
1. 서버의 타일 프록시 엔드포인트 확인:
   ```bash
   curl http://localhost:3004/api/tiles/13/4000/2000.png
   ```
2. 서버 로그에서 타일 프록시 오류 확인
3. 네트워크 연결 확인

## 보안 고려사항

1. **SSH 키 보안**
   - SSH_PRIVATE_KEY는 절대 공개하지 마세요
   - GitHub Secrets에만 저장하세요
   - 정기적으로 키를 교체하세요

2. **Secrets 관리**
   - 모든 민감한 정보는 GitHub Secrets에 저장
   - 코드에 하드코딩하지 마세요
   - Secrets는 암호화되어 저장됩니다

3. **서버 보안**
   - SSH 키 기반 인증만 허용
   - 비밀번호 인증 비활성화
   - 불필요한 포트는 닫기

4. **방화벽 설정**
   - 필요한 포트만 열기 (22, 3004)
   - DDoS 방어 설정 고려

## 추가 리소스

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [SSH 키 생성 가이드](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

## 요약: 필요한 Secrets

| Secret 이름 | 설명 | 예시 값 |
|------------|------|---------|
| `SSH_PRIVATE_KEY` | SSH 개인키 (전체 내용) | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SSH_HOST` | 서버 호스트 주소 | `jangdonggun.iptime.org` |
| `SSH_USER` | 서버 사용자명 | `jangdonggun` |

이 세 가지 secrets만 설정하면 자동 배포가 가능합니다! 🚀


# Docker 가이드

## 빠른 시작

### 1. Docker 이미지 빌드 및 실행

```bash
# Docker Compose 사용 (권장)
docker-compose up -d

# 또는 직접 빌드 및 실행
docker build -t timeline-app .
docker run -d -p 3001:3001 --name timeline-app timeline-app
```

### 2. 서비스 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만
docker-compose logs -f timeline-app
```

### 3. 서비스 중지

```bash
# 서비스 중지
docker-compose down

# 볼륨까지 삭제 (데이터 보존)
docker-compose down -v
```

## Docker Compose 명령어

### 기본 명령어

```bash
# 서비스 시작 (백그라운드)
docker-compose up -d

# 서비스 시작 (포그라운드, 로그 확인)
docker-compose up

# 서비스 재시작
docker-compose restart

# 서비스 중지
docker-compose stop

# 서비스 중지 및 컨테이너 제거
docker-compose down

# 서비스 중지 및 볼륨까지 제거
docker-compose down -v
```

### 로그 및 모니터링

```bash
# 모든 서비스 로그
docker-compose logs

# 실시간 로그
docker-compose logs -f

# 최근 100줄 로그
docker-compose logs --tail=100

# 특정 서비스 로그
docker-compose logs timeline-app
```

### 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 컨테이너 내부 접속
docker-compose exec timeline-app sh

# 컨테이너 재빌드
docker-compose build

# 컨테이너 재빌드 및 재시작
docker-compose up -d --build
```

## 볼륨 (데이터 영구 저장)

다음 디렉토리들이 호스트에 마운트되어 데이터가 영구 저장됩니다:

- `./uploads` - 업로드된 ZIP 파일
- `./data` - 데이터 파일
- `./logs` - 로그 파일
- `./public/visits.json` - 위치 기록 데이터

## 환경 변수

`docker-compose.yml`에서 환경 변수를 설정할 수 있습니다:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
```

`.env` 파일을 사용하여 환경 변수를 관리할 수도 있습니다:

```bash
# .env 파일 생성
echo "NODE_ENV=production" > .env
echo "PORT=3001" >> .env
```

## 프로덕션 배포

### 1. 이미지 빌드

```bash
docker build -t timeline-app:latest .
```

### 2. 이미지 태그 지정

```bash
docker tag timeline-app:latest your-registry/timeline-app:v1.0.0
```

### 3. 이미지 푸시

```bash
docker push your-registry/timeline-app:v1.0.0
```

### 4. 프로덕션 서버에서 실행

```bash
# docker-compose.prod.yml 생성 후
docker-compose -f docker-compose.prod.yml up -d
```

## 멀티 스테이지 빌드 (선택사항)

더 작은 이미지 크기를 원한다면:

```dockerfile
# 빌드 스테이지
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 프로덕션 스테이지
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pm2
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
EXPOSE 3001
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

## 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 포트 변경
# docker-compose.yml에서
ports:
  - "3002:3001"  # 호스트:컨테이너
```

### 메모리 부족

```bash
# docker-compose.yml에서 리소스 제한 조정
deploy:
  resources:
    limits:
      memory: 4G  # 증가
```

### 컨테이너가 계속 재시작되는 경우

```bash
# 로그 확인
docker-compose logs timeline-app

# 컨테이너 내부 접속하여 디버깅
docker-compose exec timeline-app sh
```

### 볼륨 권한 문제

```bash
# 호스트 디렉토리 권한 확인
chmod -R 755 ./uploads ./data ./logs
```

## Docker Swarm (선택사항)

여러 서버에 배포하려면 Docker Swarm 사용:

```bash
# Swarm 초기화
docker swarm init

# 서비스 배포
docker stack deploy -c docker-compose.yml timeline

# 서비스 확인
docker service ls

# 서비스 스케일링
docker service scale timeline_timeline-app=3
```

## 헬스체크

컨테이너는 자동으로 헬스체크를 수행합니다:

```bash
# 헬스체크 상태 확인
docker inspect --format='{{.State.Health.Status}}' timeline-app
```

## 성능 최적화

### 1. 멀티 코어 활용

PM2 클러스터 모드가 자동으로 CPU 코어를 활용합니다.

### 2. 리소스 제한

`docker-compose.yml`에서 리소스 제한을 설정할 수 있습니다.

### 3. 네트워크 최적화

```yaml
networks:
  timeline-network:
    driver: bridge
```

## 보안 고려사항

1. **비밀번호/키는 환경 변수로 관리**
2. **루트 사용자로 실행하지 않기** (현재 alpine 이미지 사용)
3. **불필요한 포트 노출하지 않기**
4. **이미지 취약점 스캔**

```bash
# 이미지 스캔 (Trivy 사용)
trivy image timeline-app:latest
```

## 체크리스트

- [ ] Dockerfile 생성 완료
- [ ] docker-compose.yml 생성 완료
- [ ] .dockerignore 설정 완료
- [ ] 볼륨 마운트 확인
- [ ] 환경 변수 설정
- [ ] 헬스체크 확인
- [ ] 로그 확인
- [ ] 프로덕션 배포 테스트


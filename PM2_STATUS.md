# PM2 클러스터 모드 현재 상태

## 현재 실행 상태

✅ **16개 인스턴스 실행 중** (CPU 코어 수에 맞춰 자동 생성)
- 모든 인스턴스가 정상 작동 중 (status: online)
- 각 인스턴스 메모리 사용량: 약 90MB
- 총 메모리 사용량: 약 1.4GB
- 재시작 횟수: 0 (안정적)

## PM2 클러스터 모드 작동 원리

PM2 클러스터 모드는 Node.js의 내장 `cluster` 모듈을 사용합니다:
- **마스터 프로세스**: 포트 3001에서 리스닝
- **워커 프로세스**: 마스터가 요청을 분산
- **로드 밸런싱**: 라운드 로빈 방식으로 자동 분산

모든 인스턴스가 같은 포트(3001)를 공유하는 것이 **정상**입니다.

## 성능 모니터링 명령어

### 기본 모니터링
```bash
# 프로세스 목록 확인
pm2 list

# 실시간 모니터링 (CPU, 메모리)
pm2 monit

# 로그 확인
pm2 logs

# 특정 인스턴스 로그만
pm2 logs timeline-app --lines 100
```

### 상세 정보
```bash
# 상세 정보 확인
pm2 show timeline-app

# 프로세스 정보
pm2 describe timeline-app

# 메트릭 확인
pm2 prettylist
```

### 성능 통계
```bash
# CPU/메모리 사용량 통계
pm2 status

# 리소스 사용량 그래프
pm2 monit
```

## 최적화 권장사항

### 1. 인스턴스 수 조정 (필요시)

현재 16개 인스턴스가 실행 중입니다. CPU 코어 수에 따라 조정 가능:

```bash
# 특정 개수로 조정 (예: 8개)
pm2 scale timeline-app 8

# 또는 ecosystem.config.js 수정
# instances: 8  (고정 개수)
# instances: 'max'  (CPU 코어 수만큼)
```

### 2. 메모리 제한 확인

현재 설정: `max_memory_restart: '500M'`
- 각 인스턴스가 500MB 초과 시 자동 재시작
- 현재 각 인스턴스는 약 90MB 사용 중 (여유 있음)

### 3. 로그 관리

```bash
# 로그 로테이션 모듈 설치
pm2 install pm2-logrotate

# 로그 설정
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 4. 자동 재시작 설정

현재 설정:
- `autorestart: true` ✅
- `max_restarts: 10` ✅
- `min_uptime: '10s'` ✅

## 부하 테스트

### 간단한 부하 테스트

```bash
# Apache Bench 설치 (Windows)
# Chocolatey: choco install apache-httpd

# 또는 PowerShell에서
# Invoke-WebRequest 사용

# 1000명 동시 사용자 시뮬레이션
# (다른 터미널에서)
for ($i=1; $i -le 1000; $i++) {
    Start-Job -ScriptBlock {
        Invoke-WebRequest -Uri "http://localhost:3001/" -UseBasicParsing
    }
}
```

### PM2 모니터링으로 확인

부하 테스트 중 `pm2 monit` 실행하여:
- CPU 사용률 확인
- 메모리 사용량 확인
- 응답 시간 확인

## 예상 성능

현재 구성 (16개 인스턴스):
- **동시 연결**: 약 1000-2000개 처리 가능
- **요청 처리량**: 초당 500-1000 요청
- **메모리 여유**: 충분 (각 90MB / 500MB 제한)

## 다음 단계 (선택사항)

### 1. Nginx 로드 밸런서 추가
- PM2 클러스터 + Nginx 조합으로 더 높은 성능
- 정적 파일 직접 서빙으로 부하 감소
- `nginx.conf.example` 참고

### 2. Redis 캐싱 추가
- 통계 데이터 캐싱
- 세션 공유 (필요시)

### 3. 모니터링 도구
- PM2 Plus (유료)
- New Relic
- Datadog

## 문제 해결

### 인스턴스가 너무 많다면
```bash
# 인스턴스 수 줄이기
pm2 scale timeline-app 8
```

### 메모리 부족 시
```bash
# 메모리 제한 낮추기 (ecosystem.config.js)
max_memory_restart: '300M'
pm2 restart ecosystem.config.js
```

### 특정 인스턴스 재시작
```bash
# ID로 재시작
pm2 restart 0

# 모든 인스턴스 재시작
pm2 restart all
```

## 체크리스트

- [x] PM2 클러스터 모드 실행 중
- [x] 16개 인스턴스 정상 작동
- [x] 메모리 사용량 정상 범위
- [ ] 로그 로테이션 설정 (권장)
- [ ] 부하 테스트 수행 (권장)
- [ ] Nginx 로드 밸런서 추가 (선택)
- [ ] 모니터링 도구 설정 (선택)


# Node.js 18 LTS 기반 이미지
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# PM2 전역 설치
RUN npm install -g pm2

# package.json과 package-lock.json 복사 (의존성 캐싱 최적화)
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --only=production && npm cache clean --force

# 애플리케이션 파일 복사
COPY . .

# 로그 디렉토리 생성
RUN mkdir -p logs uploads data

# 포트 노출
EXPOSE 3004

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# PM2를 사용하여 클러스터 모드로 실행
CMD ["pm2-runtime", "start", "ecosystem.config.js"]


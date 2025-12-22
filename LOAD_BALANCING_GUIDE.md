# 로드 밸런싱 가이드 - 1000명 동시 사용자 대응

## 현재 애플리케이션 구조 분석

현재 애플리케이션은:
- Node.js Express 서버
- 파일 업로드 처리 (ZIP 파일)
- 정적 파일 서빙
- 메모리 기반 세션 없음 (상태 비저장)

## 로드 밸런싱 전략

### 1. 애플리케이션 레벨 클러스터링

#### PM2를 사용한 클러스터 모드

```bash
npm install -g pm2
```

`ecosystem.config.js` 생성:

```javascript
module.exports = {
  apps: [{
    name: 'timeline-app',
    script: './server.js',
    instances: 'max', // CPU 코어 수만큼 인스턴스 생성
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

실행:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. Nginx 로드 밸런서 설정

#### 설치
```bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### 설정 파일: `/etc/nginx/sites-available/timeline`

```nginx
upstream timeline_backend {
    # 로드 밸런싱 방법: least_conn (연결 수가 적은 서버로)
    least_conn;
    
    # 여러 Node.js 인스턴스 (같은 서버 또는 다른 서버)
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
    
    # 헬스 체크
    keepalive 32;
}

# 파일 업로드 크기 제한 증가
client_max_body_size 500M;
client_body_timeout 300s;

server {
    listen 80;
    server_name your-domain.com;

    # 정적 파일은 직접 서빙 (성능 향상)
    location / {
        root /path/to/timeline/public;
        try_files $uri $uri/ @nodejs;
    }

    # API 및 동적 콘텐츠는 Node.js로
    location @nodejs {
        proxy_pass http://timeline_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # 버퍼 설정
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # 파일 업로드 엔드포인트
    location /api/upload {
        proxy_pass http://timeline_backend;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### 3. Redis를 사용한 세션 공유 (필요시)

세션을 사용한다면 Redis로 공유:

```bash
npm install express-session connect-redis redis
```

`server.js` 수정:

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // HTTPS 사용 시 true
}));
```

### 4. 파일 업로드 최적화

#### 공유 스토리지 사용

여러 서버 인스턴스가 같은 파일을 접근할 수 있도록:

**옵션 1: NFS (Network File System)**
```bash
# 서버 1 (NFS 서버)
sudo apt-get install nfs-kernel-server
sudo mkdir -p /shared/uploads
sudo chown nobody:nogroup /shared/uploads
sudo echo "/shared/uploads *(rw,sync,no_subtree_check)" >> /etc/exports
sudo exportfs -a

# 서버 2, 3... (NFS 클라이언트)
sudo apt-get install nfs-common
sudo mount -t nfs server1:/shared/uploads /path/to/app/uploads
```

**옵션 2: AWS S3 / Google Cloud Storage**

`server.js` 수정:

```javascript
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'your-bucket-name',
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 }
});
```

### 5. 데이터베이스 사용 (현재는 파일 기반)

현재 `visits.json` 파일 기반이지만, 확장성을 위해:

**MongoDB 사용 예시:**

```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timeline', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const VisitSchema = new mongoose.Schema({
  userId: String,
  visits: [Object],
  createdAt: { type: Date, default: Date.now }
});

const Visit = mongoose.model('Visit', VisitSchema);

// 저장
app.post('/api/upload', upload.single('zipfile'), async (req, res) => {
  // ... ZIP 처리 ...
  await Visit.create({ userId: req.session.userId, visits: visits });
});
```

### 6. 캐싱 전략

#### Redis 캐싱

```javascript
const redis = require('redis');
const client = redis.createClient();

// 통계 캐싱
app.get('/api/stats', async (req, res) => {
  const cacheKey = 'stats:all';
  
  // 캐시 확인
  const cached = await client.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // 데이터 계산
  const stats = calculateStats(visits);
  
  // 캐시 저장 (5분)
  await client.setex(cacheKey, 300, JSON.stringify(stats));
  
  res.json({ success: true, stats });
});
```

### 7. CDN 사용

정적 파일(HTML, CSS, JS)을 CDN으로:

- Cloudflare
- AWS CloudFront
- Google Cloud CDN

### 8. 모니터링 및 로깅

#### PM2 모니터링

```bash
pm2 monit
pm2 logs
```

#### Nginx 로그 분석

```nginx
access_log /var/log/nginx/timeline_access.log;
error_log /var/log/nginx/timeline_error.log;
```

#### APM 도구

- New Relic
- Datadog
- PM2 Plus

### 9. 전체 아키텍처

```
                    ┌─────────────┐
                    │   CloudFlare│
                    │     (CDN)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Nginx     │
                    │ Load Balancer│
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Node.js │       │ Node.js │       │ Node.js │
   │  :3001  │       │  :3002  │       │  :3003  │
   │ (PM2)   │       │ (PM2)   │       │ (PM2)   │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │  Redis  │       │ MongoDB │       │   S3     │
   │ (Cache) │       │  (DB)   │       │(Storage) │
   └─────────┘       └─────────┘       └─────────┘
```

### 10. 서버 리소스 추정

**1000명 동시 사용자 기준:**

- **CPU**: 4-8 코어
- **RAM**: 8-16GB
- **네트워크**: 100Mbps 이상
- **스토리지**: SSD 100GB 이상

**서버 구성 예시:**

- **로드 밸런서**: 2코어, 4GB RAM (Nginx)
- **앱 서버**: 4코어, 8GB RAM × 2-3대 (Node.js)
- **캐시 서버**: 2코어, 4GB RAM (Redis)
- **DB 서버**: 4코어, 16GB RAM (MongoDB, 선택사항)

### 11. 실제 구현 단계

#### Step 1: PM2 클러스터 모드 설정

```bash
npm install -g pm2
pm2 start server.js -i max
pm2 save
pm2 startup
```

#### Step 2: Nginx 설정

위의 Nginx 설정 파일 적용 후:

```bash
sudo ln -s /etc/nginx/sites-available/timeline /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 3: Redis 설치 및 실행

```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Step 4: 모니터링 설정

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 12. 성능 테스트

#### Apache Bench 테스트

```bash
# 1000명 동시 사용자, 10000 요청
ab -n 10000 -c 1000 http://your-domain.com/
```

#### Artillery (더 정교한 테스트)

```bash
npm install -g artillery
```

`artillery-config.yml`:

```yaml
config:
  target: 'http://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 100
      name: "Warm up"
    - duration: 300
      arrivalRate: 1000
      name: "Sustained load"
scenarios:
  - name: "Upload and view"
    flow:
      - get:
          url: "/"
      - post:
          url: "/api/upload/preview"
          multipart:
            - name: "zipfile"
              file: "./test.zip"
```

실행:
```bash
artillery run artillery-config.yml
```

### 13. 자동 스케일링 (클라우드 환경)

#### AWS Auto Scaling Group

```json
{
  "MinSize": 2,
  "MaxSize": 10,
  "DesiredCapacity": 4,
  "TargetTrackingScalingPolicies": [{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    }
  }]
}
```

### 14. 보안 고려사항

- **Rate Limiting**: 
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});
app.use('/api/', limiter);
```

- **HTTPS**: Let's Encrypt 사용
- **DDoS 방어**: CloudFlare 사용

### 15. 체크리스트

- [ ] PM2 클러스터 모드 설정
- [ ] Nginx 로드 밸런서 구성
- [ ] Redis 캐싱 구현
- [ ] 공유 스토리지 설정 (NFS 또는 S3)
- [ ] 모니터링 도구 설정
- [ ] 로그 관리 설정
- [ ] 성능 테스트 수행
- [ ] 자동 백업 설정
- [ ] 장애 복구 계획 수립

## 예상 성능

적절한 설정 시:
- **동시 사용자**: 1000명 이상
- **요청 처리량**: 초당 500-1000 요청
- **응답 시간**: 평균 100-200ms
- **가용성**: 99.9% 이상


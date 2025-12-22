// webhook-server.js - Timeline 프로젝트용 Webhook 서버
const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3005; // timeline은 3005 포트 사용
// 환경 변수에서 시크릿 가져오기 (없으면 기본값 사용)
const SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_here';

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({
  verify: (req, res, buf) => {
    // 시크릿이 설정되지 않았으면 검증 건너뛰기
    if (SECRET === 'your_webhook_secret_here') {
      console.log('Webhook secret이 설정되지 않았습니다. 검증을 건너뜁니다.');
      return;
    }
    
    const signature = req.headers['x-hub-signature-256'];
    if (signature) {
      const hmac = crypto.createHmac('sha256', SECRET);
      const digest = 'sha256=' + hmac.update(buf).digest('hex');
      if (signature !== digest) {
        console.error('Invalid signature');
        throw new Error('Invalid signature');
      }
      console.log('Signature verified');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'timeline-webhook',
    port: PORT
  });
});

// Webhook status endpoint
app.get('/webhook/status', (req, res) => {
  res.json({
    status: 'ok',
    webhook_secret_configured: SECRET !== 'your_webhook_secret_here',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.post('/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;
    const ref = payload.ref || '';
    
    console.log(`📦 Webhook 이벤트 수신: ${event}, 브랜치: ${ref}`);
    
    if (event === 'push' && (ref === 'refs/heads/main' || ref === 'refs/heads/master')) {
      console.log('🚀 배포 시작...');
      
      // 프로젝트 디렉토리 경로
      const projectDir = path.join(__dirname);
      
      try {
        // Docker Compose를 사용한 배포
        console.log('📥 Docker 이미지 pull 또는 로컬 이미지 로드...');
        
        // timeline-app.tar.gz 파일이 있는지 확인
        const tarPath = path.join(projectDir, 'timeline-app.tar.gz');
        const fs = require('fs');
        
        if (fs.existsSync(tarPath)) {
          console.log('📦 로컬 Docker 이미지 로드 중...');
          await execAsync(`cd ${projectDir} && docker load < timeline-app.tar.gz`);
        } else {
          console.log('📥 Docker Hub에서 이미지 pull 시도 중...');
          await execAsync(`cd ${projectDir} && docker compose pull timeline-app || echo "이미지가 없거나 로컬 빌드 사용!"`);
        }

        console.log('🛑 기존 컨테이너 중지...');
        await execAsync(`cd ${projectDir} && docker compose down || true`);

        console.log('🚀 새 컨테이너 시작...');
        await execAsync(`cd ${projectDir} && docker compose up -d --build`);

        console.log('🧹 불필요한 이미지 정리...');
        await execAsync(`docker image prune -f --filter "until=24h" || true`);

        // 배포 완료 확인
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const { stdout: psOutput } = await execAsync(`cd ${projectDir} && docker compose ps`);
        console.log('=== Container Status ===');
        console.log(psOutput);

        const { stdout: logsOutput } = await execAsync(`cd ${projectDir} && docker compose logs --tail=50 timeline-app || true`);
        console.log('=== Container Logs (last 50 lines) ===');
        console.log(logsOutput);

        console.log('✅ 배포 완료!');
        res.status(200).json({ 
          success: true, 
          message: '배포가 성공적으로 완료되었습니다.',
          branch: ref,
          commit: payload.head_commit?.id || 'unknown',
          output: psOutput
        });
      } catch (error) {
        console.error('❌ 배포 오류:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          stderr: error.stderr || ''
        });
      }
    } else {
      console.log(`ℹ️ 이벤트 무시됨: ${event}, 브랜치: ${ref}`);
      res.status(200).json({ 
        success: true, 
        message: '이벤트가 처리되지 않았습니다 (main/master 브랜치가 아님)',
        event,
        ref
      });
    }
  } catch (error) {
    console.error('❌ Webhook 처리 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Timeline Webhook 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 Webhook 엔드포인트: http://0.0.0.0:${PORT}/webhook`);
  console.log(`💚 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Status: http://0.0.0.0:${PORT}/webhook/status`);
  console.log(`🔐 Webhook secret 설정: ${SECRET !== 'your_webhook_secret_here' ? '✅ 설정됨' : '⚠️ 미설정'}`);
});


#!/bin/bash

# Timeline Webhook 서버 설정 스크립트

set -e

echo "=========================================="
echo "Timeline Webhook 서버 설정"
echo "=========================================="

# 1. Node.js 설치 확인
echo "1. Node.js 확인 중..."
if ! command -v node &> /dev/null; then
    echo "Node.js가 설치되어 있지 않습니다. 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js 버전: $(node --version)"
echo "npm 버전: $(npm --version)"

# 2. 필요한 패키지 설치
echo "2. 필요한 패키지 설치 중..."
if [ -f package.json ]; then
    npm install
else
    echo "❌ package.json을 찾을 수 없습니다."
    exit 1
fi
echo "패키지 설치 완료"

# 3. Webhook 서버 시작 (PM2 사용)
echo "3. Webhook 서버 시작 중..."
if ! command -v pm2 &> /dev/null; then
    echo "PM2 설치 중..."
    sudo npm install -g pm2
fi

# 기존 프로세스 중지
pm2 stop timeline-webhook 2>/dev/null || true
pm2 delete timeline-webhook 2>/dev/null || true

# Webhook 서버 시작
cd "$(dirname "$0")"
pm2 start webhook-server.js --name timeline-webhook
pm2 save
pm2 startup

echo "✅ Timeline Webhook 서버가 시작되었습니다"
echo ""
echo "서버 상태 확인:"
pm2 status
echo ""
echo "📡 Webhook URL: http://jangdonggun.iptime.org:3005/webhook"
echo "💚 Health check: http://jangdonggun.iptime.org:3005/health"
echo ""
echo "유용한 명령어:"
echo "  로그 확인: pm2 logs timeline-webhook"
echo "  서버 중지: pm2 stop timeline-webhook"
echo "  서버 재시작: pm2 restart timeline-webhook"
echo "  상태 확인: pm2 status"


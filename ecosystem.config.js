module.exports = {
  apps: [{
    name: 'timeline-app',
    script: './server.js',
    instances: 1, // 메모리 사용량을 고려하여 단일 인스턴스로 변경
    exec_mode: 'fork', // cluster 모드 대신 fork 모드 사용 (메모리 절약)
    node_args: '--max-old-space-size=4096', // 4GB 메모리 제한
    env: {
      NODE_ENV: 'production',
      PORT: 3004
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3004
    },
    max_memory_restart: '3G', // 메모리 제한 증가 (3GB)
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 3, // 최대 재시작 횟수 감소 (5 -> 3)
    min_uptime: '10s',
    restart_delay: 10000, // 재시작 전 대기 시간 (10초로 증가)
    exp_backoff_restart_delay: 100 // 지수 백오프 재시작 지연
  }]
};


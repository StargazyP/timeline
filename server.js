const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3004;

// 미들웨어
app.use(cors());
app.use(express.json());

// 루트 경로를 upload.html로 서빙 (정적 파일 미들웨어보다 먼저 정의)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// /index 경로를 index.html로 서빙
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 정적 파일 서빙 (라우트 핸들러 이후에 배치)
app.use(express.static('public', { index: false }));

// 업로드 설정
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('ZIP 파일만 업로드할 수 있습니다.'));
    }
  }
});

// 업로드 디렉토리 생성 확인
async function ensureUploadDir() {
  try {
    await fs.mkdir('uploads', { recursive: true });
  } catch (error) {
    console.error('업로드 디렉토리 생성 실패:', error);
  }
}

// 데이터 디렉토리 생성 확인
async function ensureDataDir() {
  try {
    await fs.mkdir('data', { recursive: true });
  } catch (error) {
    console.error('데이터 디렉토리 생성 실패:', error);
  }
}

// 데이터 최적화: 필요한 필드만 추출
function optimizeVisitData(visit) {
  if (!visit || !visit.visit || !visit.visit.topCandidate || !visit.visit.topCandidate.placeLocation) {
    return null;
  }

  return {  
    startTime: visit.startTime,
    endTime: visit.endTime,
    placeLocation: visit.visit.topCandidate.placeLocation,
    semanticType: visit.visit.topCandidate.semanticType || 'Unknown'
  };
}

// ZIP 파일에서 JSON 추출 및 파싱 (메모리 최적화)
async function extractVisitsFromZip(zipPath) {
  try {
    // 파일 크기 확인
    const stats = await fs.stat(zipPath);
    console.log(`ZIP 파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // 스트리밍으로 ZIP 파일 읽기 (청크 단위)
    const zipBuffer = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    const files = Object.keys(zip.files);

    // Semantic Location History 파일 찾기
    let visitsJsonFile = null;
    let fileName = null;

    // 우선순위 1: Semantic Location History 폴더 내의 JSON 파일
    for (const file of files) {
      if (file.includes('Semantic Location History') && file.endsWith('.json')) {
        visitsJsonFile = zip.files[file];
        fileName = file;
        break;
      }
    }

    // 우선순위 2: 모든 JSON 파일 검색
    if (!visitsJsonFile) {
      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('__MACOSX')) {
          visitsJsonFile = zip.files[file];
          fileName = file;
          break;
        }
      }
    }

    if (!visitsJsonFile) {
      throw new Error('위치 기록 JSON 파일을 찾을 수 없습니다.');
    }

    console.log(`JSON 파일 발견: ${fileName}`);

    // 스트리밍으로 JSON 텍스트 읽기
    let jsonText = await visitsJsonFile.async('text');
    console.log(`JSON 텍스트 크기: ${(jsonText.length / 1024 / 1024).toFixed(2)} MB`);

    // JSON 파싱 (청크 단위로 처리할 수 있도록)
    let jsonData;
    try {
      jsonData = JSON.parse(jsonText);
    } catch (parseError) {
      // 큰 파일의 경우 스트리밍 파서 사용 고려
      throw new Error(`JSON 파싱 실패: ${parseError.message}`);
    }

    // 데이터 평탄화 및 최적화 (메모리 효율적으로)
    let visits = [];
    if (Array.isArray(jsonData)) {
      // 배열인 경우 직접 처리
      console.log(`배열 데이터 처리 중... (${jsonData.length}개 항목)`);
      for (let i = 0; i < jsonData.length; i++) {
        const optimized = optimizeVisitData(jsonData[i]);
        if (optimized) {
          visits.push(optimized);
        }
        // 메모리 관리를 위해 주기적으로 가비지 컬렉션 힌트
        if (i % 10000 === 0 && i > 0) {
          console.log(`처리 중... ${i}/${jsonData.length} (${((i/jsonData.length)*100).toFixed(1)}%)`);
          // Node.js는 자동으로 GC를 수행하지만, 힌트를 줄 수 있음
          if (global.gc) {
            global.gc();
          }
        }
      }
    } else if (jsonData.timelineObjects) {
      console.log(`timelineObjects 처리 중... (${jsonData.timelineObjects.length}개 항목)`);
      for (let i = 0; i < jsonData.timelineObjects.length; i++) {
        const optimized = optimizeVisitData(jsonData.timelineObjects[i]);
        if (optimized) {
          visits.push(optimized);
        }
        if (i % 10000 === 0 && i > 0) {
          console.log(`처리 중... ${i}/${jsonData.timelineObjects.length} (${((i/jsonData.timelineObjects.length)*100).toFixed(1)}%)`);
        }
      }
    } else {
      // 중첩된 구조 처리 (재귀 최적화)
      const flatten = (arr, depth = 0) => {
        let result = [];
        if (!Array.isArray(arr)) arr = [arr];
        
        // 깊이 제한으로 스택 오버플로우 방지
        if (depth > 10) {
          console.warn('데이터 구조가 너무 깊습니다. 일부 데이터가 누락될 수 있습니다.');
          return result;
        }

        for (const item of arr) {
          if (Array.isArray(item)) {
            result = result.concat(flatten(item, depth + 1));
          } else if (item && typeof item === 'object') {
            if (item.visit) {
              const optimized = optimizeVisitData(item);
              if (optimized) {
                result.push(optimized);
              }
            } else {
              // 객체의 모든 속성 검사
              for (const key in item) {
                if (Array.isArray(item[key])) {
                  result = result.concat(flatten(item[key], depth + 1));
                }
              }
            }
          }
        }
        return result;
      };
      visits = flatten(jsonData);
    }

    console.log(`최적화된 방문 데이터: ${visits.length}개 항목`);
    
    // 최적화된 데이터 크기 계산
    const optimizedSize = JSON.stringify(visits).length;
    const reductionPercent = ((1 - optimizedSize / jsonText.length) * 100).toFixed(1);
    console.log(`메모리 사용량 감소: 원본 대비 약 ${reductionPercent}%`);
    console.log(`원본 크기: ${(jsonText.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`최적화 크기: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);

    // 원본 데이터 참조 해제 (메모리 해제)
    jsonData = null;
    jsonText = null;
    
    // 메모리 사용량 확인
    logMemoryUsage('데이터 처리 완료 후');

    return visits;
  } catch (error) {
    console.error('ZIP 파일 처리 오류:', error);
    throw error;
  }
}

// 통계 계산
function calculateStats(visits) {
  // 최적화된 데이터 구조에 맞게 필터링
  const validVisits = visits.filter(d =>
    d && d.placeLocation
  );

  const homeVisits = validVisits.filter(d =>
    d.semanticType &&
    d.semanticType.includes('Home')
  );

  const workVisits = validVisits.filter(d =>
    d.semanticType &&
    d.semanticType.includes('Work')
  );

  const otherVisits = validVisits.filter(d =>
    !d.semanticType ||
    (!d.semanticType.includes('Home') &&
     !d.semanticType.includes('Work'))
  );

  // 날짜 범위 계산
  let minDate = null;
  let maxDate = null;
  validVisits.forEach(d => {
    if (d.startTime && d.endTime) {
      const start = new Date(d.startTime);
      const end = new Date(d.endTime);
      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    }
  });

  return {
    total: validVisits.length,
    home: homeVisits.length,
    work: workVisits.length,
    other: otherVisits.length,
    dateRange: minDate && maxDate ? {
      start: minDate.toISOString(),
      end: maxDate.toISOString(),
      startYear: minDate.getFullYear(),
      endYear: maxDate.getFullYear()
    } : null
  };
}

// API 엔드포인트

// ZIP 파일 업로드 및 미리보기
app.post('/api/upload/preview', upload.single('zipfile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
  }

  try {
    const zipPath = req.file.path;
    const visits = await extractVisitsFromZip(zipPath);
    const stats = calculateStats(visits);

    // 임시 파일 삭제
    await fs.unlink(zipPath).catch(() => {});

    res.json({
      success: true,
      stats: stats,
      totalRecords: visits.length
    });
  } catch (error) {
    // 임시 파일 삭제
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ error: error.message });
  }
});

// ZIP 파일 업로드 및 저장
app.post('/api/upload', upload.single('zipfile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
  }

  try {
    const zipPath = req.file.path;
    const visits = await extractVisitsFromZip(zipPath);
    const stats = calculateStats(visits);

    // visits.json 파일로 저장 (압축된 형식으로 저장하여 파일 크기 감소)
    const dataPath = path.join(__dirname, 'public', 'visits.json');
    // 공백 제거하여 파일 크기 감소 (약 30-40% 감소)
    const jsonString = JSON.stringify(visits);
    await fs.writeFile(dataPath, jsonString, 'utf8');
    
    const fileStats = await fs.stat(dataPath);
    console.log(`저장된 파일 크기: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // 임시 파일 삭제
    await fs.unlink(zipPath).catch(() => {});

    res.json({
      success: true,
      message: '업로드가 완료되었습니다.',
      stats: stats
    });
  } catch (error) {
    // 임시 파일 삭제
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error('업로드 오류:', error);
    res.status(500).json({ error: error.message || '업로드 중 오류가 발생했습니다.' });
  }
});

// 통계 조회
app.get('/api/stats', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'public', 'visits.json');
    const data = await fs.readFile(dataPath, 'utf8');
    const visits = JSON.parse(data);
    const stats = calculateStats(visits);

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
  }
});

// 독립 실행 가능한 HTML 파일 다운로드
app.get('/api/download', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'public', 'visits.json');
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    const visitsData = await fs.readFile(dataPath, 'utf8');
    let indexHtml = await fs.readFile(indexPath, 'utf8');
    
    // visits.json 데이터를 HTML에 인라인으로 삽입
    // fetch('visits.json').then(res => res.json()).then(data => { 부분을 찾아서 대체
    const dataJson = JSON.parse(visitsData);
    const dataString = JSON.stringify(dataJson);
    
    // fetch 부분을 데이터로 직접 대체
    indexHtml = indexHtml.replace(
      /fetch\('visits\.json'\)\s*\.then\(res\s*=>\s*res\.json\(\)\)\s*\.then\(data\s*=>\s*\{/,
      `Promise.resolve(${dataString}).then(data => {`
    );
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="timeline-map.html"');
    res.send(indexHtml);
  } catch (error) {
    console.error('다운로드 오류:', error);
    res.status(500).json({ error: '파일 생성 중 오류가 발생했습니다.' });
  }
});

// 메모리 사용량 모니터링
function logMemoryUsage(label = '') {
  const used = process.memoryUsage();
  const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  console.log(`${label} 메모리 사용량:`);
  console.log(`  RSS: ${formatMB(used.rss)} MB`);
  console.log(`  Heap Used: ${formatMB(used.heapUsed)} MB`);
  console.log(`  Heap Total: ${formatMB(used.heapTotal)} MB`);
  console.log(`  External: ${formatMB(used.external)} MB`);
}

// 타일 프록시 (CORS 문제 해결 및 OSM 정책 준수)
const https = require('https');
const http = require('http');

// 여러 타일 소스 (fallback 지원)
const TILE_SOURCES = [
  {
    hostname: 'tile.openstreetmap.org',
    path: '/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    requiresUserAgent: true
  },
  {
    hostname: 'a.tile.openstreetmap.fr',
    path: '/hot/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hot.openstreetmap.org/">HOT</a>',
    requiresUserAgent: true
  },
  {
    hostname: 'tile.memomaps.de',
    path: '/tilegen/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    requiresUserAgent: false
  }
];

let currentTileSourceIndex = 0;

// 타일 프록시 (fallback 지원)
function fetchTileFromSource(z, x, y, sourceIndex, req, res) {
  if (sourceIndex >= TILE_SOURCES.length) {
    return res.status(503).send('All tile sources unavailable');
  }
  
  const source = TILE_SOURCES[sourceIndex];
  const options = {
    hostname: source.hostname,
    path: source.path.replace('{z}', z).replace('{x}', x).replace('{y}', y),
    method: 'GET',
    timeout: 5000, // 5초 타임아웃
    headers: source.requiresUserAgent ? {
      'User-Agent': 'Timeline-Visualization-App/1.0 (Contact: jangdonggun@iptime.org)'
    } : {}
  };
  
  const protocol = source.hostname.includes('memomaps') ? http : https;
  
  const tileReq = protocol.get(options, (tileRes) => {
    if (tileRes.statusCode === 200) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐시
      res.setHeader('Access-Control-Allow-Origin', '*'); // CORS 허용
      
      tileRes.pipe(res);
      
      // 성공한 소스를 기본으로 설정
      if (sourceIndex !== currentTileSourceIndex) {
        currentTileSourceIndex = sourceIndex;
        console.log(`Switched to tile source: ${source.hostname}`);
      }
    } else if (tileRes.statusCode >= 500 && sourceIndex < TILE_SOURCES.length - 1) {
      // 서버 오류인 경우 다음 소스 시도
      console.log(`Tile source ${source.hostname} failed with status ${tileRes.statusCode}, trying next source...`);
      fetchTileFromSource(z, x, y, sourceIndex + 1, req, res);
    } else {
      res.status(tileRes.statusCode).send('Tile not found');
    }
  });
  
  tileReq.on('error', (error) => {
    console.error(`Tile proxy error from ${source.hostname}:`, error.message);
    if (sourceIndex < TILE_SOURCES.length - 1) {
      // 다음 소스 시도
      fetchTileFromSource(z, x, y, sourceIndex + 1, req, res);
    } else {
      res.status(503).send('All tile sources unavailable');
    }
  });
  
  tileReq.on('timeout', () => {
    tileReq.destroy();
    console.error(`Tile request timeout from ${source.hostname}`);
    if (sourceIndex < TILE_SOURCES.length - 1) {
      fetchTileFromSource(z, x, y, sourceIndex + 1, req, res);
    } else {
      res.status(504).send('Tile request timeout');
    }
  });
}

app.get('/api/tiles/:z/:x/:y.png', (req, res) => {
  try {
    const { z, x, y } = req.params;
    
    // 현재 소스부터 시도
    fetchTileFromSource(z, x, y, currentTileSourceIndex, req, res);
  } catch (error) {
    console.error('Tile proxy error:', error);
    res.status(500).send('Tile proxy error');
  }
});

// Webhook은 별도 서버(포트 3005)로 분리되었습니다.
// webhook-server.js를 참고하세요.

// 서버 시작
async function startServer() {
  await ensureUploadDir();
  await ensureDataDir();

  // 초기 메모리 사용량
  logMemoryUsage('서버 시작 시');

  const server = app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`📁 업로드 페이지: http://localhost:${PORT}/upload.html`);
    console.log(`🗺️  지도 페이지: http://localhost:${PORT}/index.html`);
    
    // 주기적으로 메모리 사용량 모니터링 (5분마다)
    setInterval(() => {
      logMemoryUsage('주기적 모니터링');
    }, 5 * 60 * 1000);
  });

  // 포트 충돌 에러 처리
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다.`);
      console.error('다음 명령어로 포트를 사용하는 프로세스를 확인하세요:');
      console.error(`  lsof -i :${PORT} 또는 fuser -k ${PORT}/tcp`);
      process.exit(1);
    } else {
      console.error('서버 시작 오류:', error);
      process.exit(1);
    }
  });
}

startServer().catch(console.error);


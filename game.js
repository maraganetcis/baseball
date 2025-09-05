// 컴프야-like Web Sim (Prototype)
// 단일 파일로 MVP 제공: 그래픽은 Phaser 그래픽으로 처리, 별도 에셋 불필요.

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1730',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  // 폰트 대체용 (브라우저 기본 사용)
}

let state = {
  team: [],
  bench: [],
  nextPlayerId: 1,
  inning: 1,
  half: 'top', // top/bottom
  outs: 0,
  bases: [false,false,false],
  score: { home:0, away:0 },
  offenseIsHome: false,
  log: []
};

function create() {
  this.cameras.main.setBackgroundColor('#0b1730');
  // UI 레이아웃
  drawBackground(this);
  createUI(this);
  loadOrInitState();
  renderTeamList(this);
  renderScoreboard(this);
  renderLog(this);
}

function update() {
  // nothing per-frame for now
}

/* ---------------------------
   Helper: drawBg & UI setup
   --------------------------- */
function drawBackground(scene) {
  const { width, height } = scene.scale;
  // 간단한 경기장 그래픽
  const g = scene.add.graphics();
  g.fillStyle(0x07304a, 1);
  g.fillRect(0,0, width, height);

  // 경기장 원형(더미)
  g.fillStyle(0x123c26, 1);
  g.fillEllipse(width*0.65, height*0.55, 520, 300);

  // 관중 영역
  g.fillStyle(0x1b2b42, 1);
  g.fillRect(0,0, width*0.32, height);
}

/* ---------------------------
   UI Components
   --------------------------- */
let ui = {};

function createUI(scene) {
  const { width, height } = scene.scale;

  ui.title = scene.add.text(18, 12, '컴프야-like Web Sim (Prototype)', { fontSize: '20px', color:'#fff' });

  // 팀/카드 영역 (왼쪽)
  ui.teamTitle = scene.add.text(24, 48, '내 팀(선발 9명)', { fontSize:'16px' });
  ui.teamContainer = scene.add.container(24, 78);

  // 버튼: 선수 뽑기
  const btnWidth = 200;
  const btn = makeButton(scene, 24, height - 120, btnWidth, 44, '선수 뽑기 (Gacha)', () => {
    const p = createRandomPlayer();
    state.bench.push(p);
    saveState();
    renderTeamList(scene);
    addLog(`새 선수 획득: ${p.name} (P:${p.pitch || '-'} / B:${p.bat})`);
  });
  // 버튼: 경기 시작
  makeButton(scene, 24 + btnWidth + 12, height - 120, 160, 44, 'START ▶', () => {
    startMatch(scene);
  });

  // 스코어보드 (오른쪽)
  ui.scoreboard = scene.add.container(width*0.45, 16);
  ui.scoreText = scene.add.text(width*0.45, 20, '', { fontSize: '20px', color:'#fff' });

  // 경기장 애니 영역
  ui.playArea = scene.add.container(width*0.45, height*0.2);

  // 로그
  ui.logContainer = scene.add.container(24, height - 300);
  ui.logText = scene.add.text(24, height - 300, '', { fontSize:'14px', color:'#fff', wordWrap: { width: 380 } });

  // roster detail hint
  ui.hint = scene.add.text(24, height - 200, '카드를 클릭하면 교체/강화(미구현) 메뉴 예정', { fontSize:'13px', color:'#ddd' });
}

function makeButton(scene, x, y, w, h, label, cb) {
  const rect = scene.add.rectangle(x + w/2, y + h/2, w, h, 0x154d6f).setInteractive({useHandCursor:true});
  const txt = scene.add.text(x + 10, y + 8, label, { fontSize:'15px', color:'#fff' });
  rect.on('pointerdown', cb);
  return { rect, txt };
}

/* ---------------------------
   Team / Player logic
   --------------------------- */
function createRandomPlayer() {
  // 랜덤 이름, 능력치(간단)
  const names = ['김타자','박홈런','이패스','최강','정스윙','한파워','조컨택'];
  const name = names[Math.floor(Math.random()*names.length)] + '-' + state.nextPlayerId;
  const bat    = Phaser.Math.Between(40, 95); // 타격 능력
  const power  = Phaser.Math.Between(10, 95);
  const speed  = Phaser.Math.Between(20, 90);
  const pitch  = Phaser.Math.Between(10, 95); // 투수 능력 (0이면 주로 타자)
  state.nextPlayerId++;
  return { id: 'p' + Date.now() + Math.floor(Math.random()*1000), name, bat, power, speed, pitch };
}

function loadOrInitState() {
  const saved = localStorage.getItem('cpsim_state_v1');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      Object.assign(state,s);
      if (!state.team || state.team.length < 1) makeStarterTeam();
    } catch(e) { makeStarterTeam(); }
  } else {
    makeStarterTeam();
  }
  saveState();
}

function makeStarterTeam() {
  // 선발 9명 생성
  state.team = [];
  for (let i=0;i<9;i++) state.team.push(createRandomPlayer());
  state.bench = [];
  state.nextPlayerId = 1;
  state.score = { home:0, away:0 };
  state.inning = 1;
  state.half = 'top';
  state.outs = 0;
  state.bases = [false,false,false];
  state.log = [];
  addLog('초기 팀을 생성했습니다.');
}

function saveState(){ localStorage.setItem('cpsim_state_v1', JSON.stringify(state)); }

/* ---------------------------
   Render team list (left column)
   --------------------------- */
function renderTeamList(scene) {
  ui.teamContainer.removeAll(true);
  const startY = 0;
  const gapY = 36;
  const labelStyle = { fontSize:'14px', color:'#fff' };
  scene.add.text(24, 48+8, `선발 ${state.team.length}명`, { fontSize:'12px', color:'#ddd' });

  state.team.forEach((p, idx) => {
    const y = startY + idx * gapY;
    const bg = scene.add.rectangle(0, y, 360, 32, 0x112b3a).setOrigin(0);
    const txt = scene.add.text(8, y+4, `${idx+1}. ${p.name}  BAT:${p.bat} P:${p.pitch}`, { fontSize:'13px', color:'#fff' });
    bg.setInteractive({useHandCursor:true});
    bg.on('pointerdown', () => {
      // swap with bench if any
      if (state.bench.length>0) {
        const b = state.bench.shift();
        state.bench.push(p);
        state.team[idx] = b;
        addLog(`교체: ${p.name} → ${b.name}`);
        saveState();
        renderTeamList(scene);
        renderLog(scene);
      } else {
        addLog('교체 가능 선수가 없습니다. 뽑기 버튼으로 선수를 획득하세요.');
        renderLog(scene);
      }
    });
    ui.teamContainer.add([bg, txt]);
  });

  // 벤치 표시
  const benchY = startY + state.team.length * gapY + 8;
  scene.add.text(24, benchY, `벤치(${state.bench.length})`, { fontSize:'13px', color:'#ddd' });
  state.bench.forEach((p, i) => {
    const y = benchY + 20 + i * 28;
    const bg = scene.add.rectangle(24, y, 360, 26, 0x0d2740).setOrigin(0);
    const txt = scene.add.text(30, y+4, `· ${p.name} BAT:${p.bat}`, { fontSize:'12px', color:'#fff' });
    ui.teamContainer.add([bg, txt]);
  });
}

/* ---------------------------
   Scoreboard + Log rendering
   --------------------------- */
function renderScoreboard(scene) {
  const { width } = scene.scale;
  ui.scoreText.setText(`이닝: ${state.inning} ${state.half.toUpperCase()}   OUTS: ${state.outs}\nSCORE — HOME: ${state.score.home}  AWAY: ${state.score.away}`);
}

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  state.log.unshift(`[${time}] ${msg}`);
  if (state.log.length > 30) state.log.pop();
  saveState();
}

function renderLog(scene) {
  ui.logText.setText(state.log.slice(0,10).join('\n\n'));
}

/* ---------------------------
   Match Simulation
   --------------------------- */
let simRunning = false;
async function startMatch(scene) {
  if (simRunning) return;
  simRunning = true;
  addLog('매치 시작!');
  // 초기화
  state.score = { home:0, away:0 };
  state.inning = 1;
  state.half = 'top';
  state.outs = 0;
  state.bases = [false,false,false];
  saveState();
  renderScoreboard(scene); renderLog(scene);

  // 9이닝(간단): each half inning simulate until 3 outs
  for (let inning=1; inning<=9; inning++) {
    state.inning = inning;
    // top (away batting)
    state.half = 'top'; state.outs = 0; state.bases = [false,false,false];
    addLog(`=== ${inning}회초 시작 ===`);
    await simulateHalfInning(scene, { battingTeam: 'away', battingOrder: state.team });
    renderScoreboard(scene); renderLog(scene);
    // bottom (home batting)
    state.half = 'bottom'; state.outs = 0; state.bases = [false,false,false];
    addLog(`=== ${inning}회말 시작 ===`);
    await simulateHalfInning(scene, { battingTeam: 'home', battingOrder: state.team });
    renderScoreboard(scene); renderLog(scene);
  }

  simRunning = false;
  addLog('경기 종료!');
  renderScoreboard(scene); renderLog(scene);
}

/* Simulate half inning with simple AB loop */
async function simulateHalfInning(scene, { battingTeam, battingOrder }) {
  let outs = 0;
  let idx = 0;
  while (outs < 3) {
    const batter = battingOrder[idx % battingOrder.length];
    const pitcher = createRandomOpponentPitcher(); // opponent pitcher generator
    const res = atBatResult(pitcher, batter);
    await playAtBatAnimation(scene, res, batter);
    if (res === 'strikeout' || res === 'out') {
      outs++;
      addLog(`${batter.name} : ${res.toUpperCase()}`);
    } else if (res === 'single') {
      advanceRunners(1);
      addLog(`${batter.name} : 안타(1루)`);
    } else if (res === 'double') {
      advanceRunners(2);
      addLog(`${batter.name} : 2루타`);
    } else if (res === 'homerun') {
      const runs = scoreHomeRun();
      addLog(`${batter.name} : 홈런! ${runs}득점`);
    }
    // update outs/score to state
    state.outs = outs;
    renderScoreboard(scene);
    saveState();
    idx++;
    await sleep(500); // 짧은 간격
  }
}

/* ---------------------------
   Simple baseball mechanics
   --------------------------- */
function atBatResult(pitcher, batter) {
  // 능력치 기반 가중치. 단순 확률.
  const contact = batter.bat;   // 40..95
  const power   = batter.power; // 10..95
  const pitchEffect = (pitcher.pitch || 50); // 10..95

  // base probabilities
  let baseStrikeChance = 20 + (pitchEffect * 0.2); // 투수 성능 ↑ => 스트라이크 증가
  let baseHitChance = Math.max(5, contact * 0.5 - pitchEffect * 0.2);
  let baseHRchance = Math.max(0, (power - pitchEffect*0.2) * 0.05);

  // random roll
  const r = Math.random() * 100;
  if (r < baseStrikeChance) return 'strikeout';
  const r2 = Math.random() * 100;
  if (r2 < baseHRchance) return 'homerun';
  if (r2 < baseHitChance + baseHRchance) {
    // single vs double
    return Math.random() < 0.85 ? 'single' : 'double';
  }
  return Math.random() < 0.6 ? 'out' : 'out'; // 나머지는 아웃
}

function createRandomOpponentPitcher() {
  return { pitch: Phaser.Math.Between(30, 85) };
}

function advanceRunners(shift) {
  // 단순: 루에 따라 점수 처리
  // bases: [1루,2루,3루]
  // shift = 1 for single, 2 for double
  for (let i=2;i>=0;i--) {
    if (state.bases[i]) {
      const newPos = i + shift;
      if (newPos >= 3) {
        // 득점
        if (state.half === 'top') state.score.away++;
        else state.score.home++;
        state.bases[i] = false;
      } else {
        state.bases[newPos] = true;
        state.bases[i] = false;
      }
    }
  }
  // batter occupies base shift-1 (e.g., single -> 0)
  state.bases[Math.min(2, shift-1)] = true;
}

function scoreHomeRun() {
  let runs = 1;
  for (let i=0;i<3;i++) if (state.bases[i]) { runs++; state.bases[i]=false; }
  if (state.half === 'top') state.score.away += runs;
  else state.score.home += runs;
  return runs;
}

/* ---------------------------
   Simple animation for at-bat
   --------------------------- */
async function playAtBatAnimation(scene, result, batter) {
  // 간단한 텍스트 + 원으로 공 이동
  ui.playArea.removeAll(true);
  const text = scene.add.text(0, 0, `${batter.name} 타석`, { fontSize:'22px', color:'#fff' });
  ui.playArea.add(text);

  // 공
  const ball = scene.add.circle(350, 180, 10, 0xffffff);
  ui.playArea.add(ball);

  // animate: 던지는 듯한 움직임
  await tweenPromise(scene, ball, { x: 600, y: 240 }, 300);

  // 결과별 연출
  if (result === 'homerun') {
    // 공 빠르게 날아가고 파란 원(관중 환호)
    await tweenPromise(scene, ball, { x: 900, y: 80 }, 600);
    const boom = scene.add.circle(900,80,40,0xffd54f,0.9);
    ui.playArea.add(boom);
    await sleep(400);
  } else if (result === 'single' || result === 'double') {
    await tweenPromise(scene, ball, { x: 800, y: 260 }, 500);
  } else {
    // 땅볼/삼진: 공이 포수쪽으로
    await tweenPromise(scene, ball, { x: 620, y: 300 }, 250);
  }

  ball.destroy();
  renderScoreboard(scene);
}

/* ---------------------------
   Utilities
   --------------------------- */
function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }
function tweenPromise(scene, obj, props, duration=400) {
  return new Promise(resolve => {
    scene.tweens.add(Object.assign({}, { targets: obj, duration, onComplete: resolve }, props));
  });
}
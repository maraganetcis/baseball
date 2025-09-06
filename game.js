// 단순 도형 + 텍스트 기반 컴프야-like 시뮬
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1730',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 600 },
  scene: { preload, create, update }
};
const game = new Phaser.Game(config);

let state = {
  team: [],
  nextPlayerId: 1,
  inning: 1,
  half: 'top', // top/bottom
  outs: 0,
  bases: [false,false,false],
  score: { home:0, away:0 },
  log: [],
  currentBatterIdx: 0
};

let ui = {};

function preload() {
  // 도형 + 텍스트 기반이라 이미지 없음
}

function create() {
  drawField(this);
  createUI(this);
  makeStarterTeam();
  renderTeamCard(this);
  renderScoreboard(this);

  // 다음 타석 버튼
  document.getElementById('btnNext').addEventListener('click', ()=>nextAtBat(this));
}

function update(){}

/* ---------------------- 배경 그리기 ---------------------- */
function drawField(scene) {
  const { width, height } = scene.scale;
  // 외야
  scene.add.rectangle(width/2, height/2, 800, 600, 0x006600);
  // 내야 다이아몬드
  scene.add.polygon(width/2, height*0.55, [
    width*0.5, height*0.45,
    width*0.7, height*0.55,
    width*0.5, height*0.65,
    width*0.3, height*0.55
  ], 0xc2a676);
  // 베이스
  [[0.5,0.45],[0.7,0.55],[0.5,0.65],[0.3,0.55]].forEach(([fx, fy])=>{
    scene.add.rectangle(width*fx, height*fy, 10, 10, 0xffffff);
  });
  // 투수 마운드
  scene.add.circle(width/2, height*0.55, 15, 0xffffff);
}

/* ---------------------- UI ---------------------- */
function createUI(scene){
  ui.scoreText = scene.add.text(10,10,"", {fontSize:'18px', color:'#fff'});
  ui.logText = scene.add.text(10,450,"", {fontSize:'14px', color:'#fff', wordWrap:{width:380}});
  ui.playerCardContainer = scene.add.container(600,100);
}

/* ---------------------- 팀/선수 ---------------------- */
function createRandomPlayer(){
  const names = ['김타자','박홈런','이패스','최강','정스윙','한파워','조컨택'];
  const name = names[Math.floor(Math.random()*names.length)] + '-' + state.nextPlayerId;
  state.nextPlayerId++;
  return { id: 'p'+Date.now(), name, team: '블루드래곤', bat: Phaser.Math.Between(40,95) };
}

function makeStarterTeam(){
  state.team = [];
  for(let i=0;i<9;i++) state.team.push(createRandomPlayer());
  addLog("초기 팀 생성 완료");
}

function renderTeamCard(scene){
  ui.playerCardContainer.removeAll(true);
  const batter = state.team[state.currentBatterIdx];
  const card = scene.add.rectangle(0,0,150,80,0x222222).setStrokeStyle(2,0xffffff);
  const nameText = scene.add.text(-65,-20, batter.name, {fontSize:'16px', color:'#fff'});
  const teamText = scene.add.text(-65,5, `팀: ${batter.team}`, {fontSize:'14px', color:'#0ff'});
  ui.playerCardContainer.add([card,nameText,teamText]);
}

/* ---------------------- 점수판 / 로그 ---------------------- */
function renderScoreboard(scene){
  ui.scoreText.setText(`이닝: ${state.inning} ${state.half.toUpperCase()}   OUTS: ${state.outs}\nSCORE — HOME: ${state.score.home}  AWAY: ${state.score.away}`);
}

function addLog(msg){
  const time = new Date().toLocaleTimeString();
  state.log.unshift(`[${time}] ${msg}`);
  if(state.log.length>10) state.log.pop();
  ui.logText.setText(state.log.join("\n"));
}

/* ---------------------- 타석 진행 ---------------------- */
function nextAtBat(scene){
  const batter = state.team[state.currentBatterIdx];
  addLog(`${batter.name} 타석`);

  // 간단 확률 시뮬
  const r = Math.random()*100;
  let res = '';
  if(r<20) res='strikeout';
  else if(r<40) res='out';
  else if(r<75) res='single';
  else res='homerun';

  addLog(`${batter.name} 결과: ${res.toUpperCase()}`);
  // 점수/루 처리 단순
  if(res==='homerun'){
    state.score.home++;
    // 간단 홈런 애니
    const boom = scene.add.circle(400,200,40,0xffd54f,0.7);
    scene.tweens.add({targets:boom,alpha:{from:0.7,to:0},duration:800,onComplete:()=>boom.destroy()});
  }

  // 다음 타자
  state.currentBatterIdx = (state.currentBatterIdx+1)%state.team.length;
  renderTeamCard(scene);
  renderScoreboard(scene);

  // 시점 전환
  if(state.currentBatterIdx%2===0){
    scene.cameras.main.pan(400,180,500); // 투수 시점
  } else {
    scene.cameras.main.pan(400,520,500); // 타자 시점
  }
}

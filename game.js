const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const pitchBtn = document.getElementById('pitch-btn');
const swingBtn = document.getElementById('swing-btn');
const resetBtn = document.getElementById('reset-btn');
const inningSpan = document.getElementById('inning');
const scoreSpan = document.getElementById('score');
const strikesSpan = document.getElementById('strikes');
const outsSpan = document.getElementById('outs');
const messageDiv = document.getElementById('message');

// Game state
let game = {
  inning: 1,
  score: 0,
  strikes: 0,
  outs: 0,
  ballX: 400,
  ballY: 120,
  ballVX: 0,
  ballVY: 0,
  ballActive: false,
  batterSwing: false,
  gameActive: true,
  bases: [false, false, false], // 1st, 2nd, 3rd
};

function drawField() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw bases
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#333';
  let baseCoords = [
    [400, 420], // Home
    [540, 340], // 1st
    [400, 260], // 2nd
    [260, 340], // 3rd
  ];
  for (let i = 0; i < baseCoords.length; i++) {
    ctx.beginPath();
    ctx.arc(baseCoords[i][0], baseCoords[i][1], 16, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    if (i > 0 && game.bases[i - 1]) {
      ctx.fillStyle = '#ffc107';
      ctx.beginPath();
      ctx.arc(baseCoords[i][0], baseCoords[i][1], 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
    }
  }
  // Draw pitcher's mound
  ctx.fillStyle = '#8d5524';
  ctx.beginPath();
  ctx.arc(400, 200, 22, 0, 2 * Math.PI);
  ctx.fill();

  // Draw batter
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(380, 440, 40, 20);

  // Draw ball
  if (game.ballActive || game.batterSwing) {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(game.ballX, game.ballY, 10, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function updateScoreboard() {
  inningSpan.textContent = game.inning;
  scoreSpan.textContent = game.score;
  strikesSpan.textContent = game.strikes;
  outsSpan.textContent = game.outs;
}

function showMessage(msg, color = '#d9534f') {
  messageDiv.textContent = msg;
  messageDiv.style.color = color;
}

function resetBall() {
  game.ballX = 400;
  game.ballY = 120;
  game.ballVX = 0;
  game.ballVY = 0;
  game.ballActive = false;
  game.batterSwing = false;
}

function nextBatter() {
  game.strikes = 0;
  resetBall();
  showMessage('');
}

function resetGame() {
  game = {
    inning: 1,
    score: 0,
    strikes: 0,
    outs: 0,
    ballX: 400,
    ballY: 120,
    ballVX: 0,
    ballVY: 0,
    ballActive: false,
    batterSwing: false,
    gameActive: true,
    bases: [false, false, false],
  };
  updateScoreboard();
  drawField();
  showMessage('Game Reset!', '#337ab7');
}

pitchBtn.onclick = function () {
  if (!game.ballActive && game.gameActive) {
    // Randomize pitch direction
    game.ballVX = (Math.random() - 0.5) * 5;
    game.ballVY = 3 + Math.random() * 2;
    game.ballActive = true;
    game.batterSwing = false;
    showMessage('Pitch thrown! Press Swing as ball crosses home plate.', '#5bc0de');
  }
};

swingBtn.onclick = function () {
  if (game.ballActive && game.gameActive) {
    game.batterSwing = true;
    // Check if swing timing is good
    const swingZoneY = 420;
    if (Math.abs(game.ballY - swingZoneY) < 32 && Math.abs(game.ballX - 400) < 40) {
      // HIT!
      const hitType = Math.random();
      if (hitType < 0.5) {
        // Single
        advanceBases(1);
        showMessage('Single! Runner on base.', '#5cb85c');
      } else if (hitType < 0.8) {
        // Double
        advanceBases(2);
        showMessage('Double! Two bases advanced.', '#5cb85c');
      } else if (hitType < 0.97) {
        // Triple
        advanceBases(3);
        showMessage('Triple! Three bases advanced.', '#5cb85c');
      } else {
        // Home run!
        advanceBases(4);
        showMessage('Home Run! All runners score!', '#f39c12');
      }
      nextBatter();
    } else {
      // Missed
      game.strikes++;
      if (game.strikes >= 3) {
        game.outs++;
        showMessage('Strike Out!', '#d9534f');
        if (game.outs >= 3) {
          // Next inning
          game.inning++;
          game.outs = 0;
          game.bases = [false, false, false];
          showMessage('Side retired! Next inning.', '#337ab7');
        }
        nextBatter();
        if (game.inning > 9) {
          game.gameActive = false;
          showMessage('Game Over! Final score: ' + game.score, '#5e5e5e');
        }
      } else {
        showMessage('Strike ' + game.strikes + '!', '#d9534f');
      }
      resetBall();
    }
    updateScoreboard();
  }
};

resetBtn.onclick = function () {
  resetGame();
};

function advanceBases(basesAdvanced) {
  let runnersScored = 0;
  // Move runners
  for (let i = 2; i >= 0; i--) {
    if (game.bases[i]) {
      if (i + basesAdvanced >= 3) {
        runnersScored++;
        game.bases[i] = false;
      } else {
        game.bases[i + basesAdvanced] = true;
        game.bases[i] = false;
      }
    }
  }
  // Batter to base
  if (basesAdvanced === 4) {
    runnersScored++; // Batter scores
  } else if (basesAdvanced <= 3) {
    game.bases[basesAdvanced - 1] = true;
  }
  game.score += runnersScored;
  updateScoreboard();
}

function updateBall() {
  if (game.ballActive) {
    game.ballX += game.ballVX;
    game.ballY += game.ballVY;
    // Ball reaches home plate
    if (game.ballY >= 420) {
      game.ballActive = false;
      // If no swing, it's a strike
      if (!game.batterSwing) {
        game.strikes++;
        if (game.strikes >= 3) {
          game.outs++;
          showMessage('Strike Out!', '#d9534f');
          if (game.outs >= 3) {
            game.inning++;
            game.outs = 0;
            game.bases = [false, false, false];
            showMessage('Side retired! Next inning.', '#337ab7');
          }
          nextBatter();
          if (game.inning > 9) {
            game.gameActive = false;
            showMessage('Game Over! Final score: ' + game.score, '#5e5e5e');
          }
        } else {
          showMessage('Strike ' + game.strikes + '!', '#d9534f');
        }
        resetBall();
        updateScoreboard();
      }
    }
    drawField();
  }
}

function gameLoop() {
  updateBall();
  requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();

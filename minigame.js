const gameArea = document.getElementById('game-area');
const startBtn = document.getElementById('start-btn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('game-status');

let score = 0;
let timeLeft = 30;
let gameInterval, spawnInterval;
const stars = ['🐻', '🍒', '🐉', '🦊', '🍊'];

function startGame() {
    score = 0;
    timeLeft = 30;
    scoreEl.textContent = score;
    timeEl.textContent = timeLeft;
    statusEl.textContent = "Catch 'em!";
    startBtn.style.display = 'none';

    gameInterval = setInterval(() => {
        timeLeft--;
        timeEl.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);

    spawnInterval = setInterval(spawnStar, 700);
}

function spawnStar() {
    const star = document.createElement('div');
    star.className = 'falling-star';
    star.textContent = stars[Math.floor(Math.random() * stars.length)];
    star.style.left = Math.random() * 90 + '%';
    star.style.animationDuration = (Math.random() * 1.5 + 1.8) + 's';

    star.addEventListener('click', () => {
        score++;
        scoreEl.textContent = score;
        star.remove();
    });

    star.addEventListener('animationend', () => star.remove());

    gameArea.appendChild(star);
}

function endGame() {
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    document.querySelectorAll('.falling-star').forEach(s => s.remove());
    statusEl.textContent = `Time's up! Final score: ${score} ⭐`;
    startBtn.textContent = 'Play Again';
    startBtn.style.display = 'inline-block';
}

startBtn.addEventListener('click', startGame);
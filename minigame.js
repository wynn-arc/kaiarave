const gameArea = document.getElementById('game-area');
const startBtn = document.getElementById('start-btn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('game-status');
const postgameEl = document.getElementById('catch-postgame');
const leaderboardEl = document.getElementById('catch-leaderboard');

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
    if (postgameEl) postgameEl.innerHTML = '';

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

    if (score > 0) showScoreForm();
}

startBtn.addEventListener('click', startGame);

// ===== Leaderboard =====

function showScoreForm() {
    if (!postgameEl) return;
    const db = getSupabaseClient();
    if (!db) return;

    postgameEl.innerHTML = `
        <form class="score-form" id="catch-score-form">
            <input class="form-input" id="catch-player-name" type="text" placeholder="Your name for the leaderboard" maxlength="30" required>
            <button type="submit" class="pill-btn">Save score: ${score}</button>
        </form>
    `;

    document.getElementById('catch-score-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('catch-player-name');
        const name = nameInput.value.trim();
        if (!name) return;

        const submitBtn = e.target.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const { error } = await db.from('scores').insert({ game: 'catch', player_name: name, score: score });

        if (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Try again';
            console.error('Score save failed:', error);
            return;
        }

        postgameEl.innerHTML = '<p class="score-saved">Saved! 🎉</p>';
        loadCatchLeaderboard();
    });
}

async function loadCatchLeaderboard() {
    if (!leaderboardEl) return;
    const db = getSupabaseClient();
    if (!db) return;

    const { data, error } = await db
        .from('scores')
        .select('player_name, score')
        .eq('game', 'catch')
        .order('score', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Could not load leaderboard:', error);
        return;
    }

    renderLeaderboard(leaderboardEl, data, (row) => `${row.score} ⭐`);
}

function renderLeaderboard(container, rows, formatRight) {
    if (!rows || rows.length === 0) {
        container.innerHTML = '<p class="leaderboard-empty">No scores yet — be the first!</p>';
        return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML =
        '<ol class="leaderboard-list">' +
        rows.map((row, i) => `
            <li class="leaderboard-item">
                <span class="leaderboard-rank">${medals[i] || (i + 1)}</span>
                <span class="leaderboard-name"></span>
                <span class="leaderboard-score">${formatRight(row)}</span>
            </li>
        `).join('') +
        '</ol>';

    // set names via textContent to avoid any HTML injection from player_name
    container.querySelectorAll('.leaderboard-name').forEach((el, i) => {
        el.textContent = rows[i].player_name;
    });
}

document.addEventListener('DOMContentLoaded', loadCatchLeaderboard);
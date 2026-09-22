// ===== Memory Match minigame =====
const mmBoard = document.getElementById('mm-board');
const mmStartBtn = document.getElementById('mm-start-btn');
const mmMovesEl = document.getElementById('mm-moves');
const mmTimeEl = document.getElementById('mm-time');
const mmStatusEl = document.getElementById('mm-status');
const mmPostgameEl = document.getElementById('mm-postgame');
const mmLeaderboardEl = document.getElementById('mm-leaderboard');

const mmEmojis = ['🐻', '🍒', '🐉', '🦊', '🍊', '✨'];

let mmFirstCard = null;
let mmSecondCard = null;
let mmLockBoard = false;
let mmMoves = 0;
let mmMatched = 0;
let mmTimeElapsed = 0;
let mmTimerInterval = null;

function mmShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function mmBuildBoard() {
    mmBoard.innerHTML = '';
    const deck = mmShuffle([...mmEmojis, ...mmEmojis]);

    deck.forEach((emoji) => {
        const card = document.createElement('div');
        card.className = 'mm-card';
        card.dataset.emoji = emoji;
        card.innerHTML = `
            <div class="mm-card-inner">
                <div class="mm-card-front">❓</div>
                <div class="mm-card-back">${emoji}</div>
            </div>
        `;
        card.addEventListener('click', () => mmFlipCard(card));
        mmBoard.appendChild(card);
    });
}

function mmFlipCard(card) {
    if (mmLockBoard) return;
    if (card === mmFirstCard) return;
    if (card.classList.contains('mm-matched')) return;

    card.classList.add('mm-flipped');

    if (!mmFirstCard) {
        mmFirstCard = card;
        return;
    }

    mmSecondCard = card;
    mmLockBoard = true;
    mmMoves++;
    mmMovesEl.textContent = mmMoves;

    mmCheckMatch();
}

function mmCheckMatch() {
    const isMatch = mmFirstCard.dataset.emoji === mmSecondCard.dataset.emoji;

    if (isMatch) {
        mmFirstCard.classList.add('mm-matched');
        mmSecondCard.classList.add('mm-matched');
        mmMatched++;
        mmResetTurn();

        if (mmMatched === mmEmojis.length) {
            mmEndGame(true);
        }
    } else {
        setTimeout(() => {
            mmFirstCard.classList.remove('mm-flipped');
            mmSecondCard.classList.remove('mm-flipped');
            mmResetTurn();
        }, 800);
    }
}

function mmResetTurn() {
    [mmFirstCard, mmSecondCard] = [null, null];
    mmLockBoard = false;
}

function mmStartGame() {
    clearInterval(mmTimerInterval);
    mmMoves = 0;
    mmMatched = 0;
    mmTimeElapsed = 0;
    mmFirstCard = null;
    mmSecondCard = null;
    mmLockBoard = false;
    mmMovesEl.textContent = '0';
    mmTimeEl.textContent = '0';
    mmStatusEl.textContent = 'Find all the matching pairs!';
    mmStartBtn.style.display = 'none';
    if (mmPostgameEl) mmPostgameEl.innerHTML = '';

    mmBuildBoard();

    mmTimerInterval = setInterval(() => {
        mmTimeElapsed++;
        mmTimeEl.textContent = mmTimeElapsed;
    }, 1000);
}

function mmEndGame(won) {
    clearInterval(mmTimerInterval);
    if (won) {
        mmStatusEl.textContent = `You matched them all in ${mmMoves} moves and ${mmTimeElapsed}s! 🎉`;
        mmShowScoreForm();
    }
    mmStartBtn.textContent = 'Play Again';
    mmStartBtn.style.display = 'inline-block';
}

mmStartBtn.addEventListener('click', mmStartGame);

// ===== Leaderboard =====

function mmShowScoreForm() {
    if (!mmPostgameEl) return;
    const db = getSupabaseClient();
    if (!db) return;

    mmPostgameEl.innerHTML = `
        <form class="score-form" id="mm-score-form">
            <input class="form-input" id="mm-player-name" type="text" placeholder="Your name for the leaderboard" maxlength="30" required>
            <button type="submit" class="pill-btn">Save: ${mmMoves} moves, ${mmTimeElapsed}s</button>
        </form>
    `;

    document.getElementById('mm-score-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('mm-player-name');
        const name = nameInput.value.trim();
        if (!name) return;

        const submitBtn = e.target.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const { error } = await db.from('scores').insert({
            game: 'memory', player_name: name, moves: mmMoves, time_seconds: mmTimeElapsed
        });

        if (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Try again';
            console.error('Score save failed:', error);
            return;
        }

        mmPostgameEl.innerHTML = '<p class="score-saved">Saved! 🎉</p>';
        mmLoadLeaderboard();
    });
}

async function mmLoadLeaderboard() {
    if (!mmLeaderboardEl) return;
    const db = getSupabaseClient();
    if (!db) return;

    const { data, error } = await db
        .from('scores')
        .select('player_name, moves, time_seconds')
        .eq('game', 'memory')
        .order('moves', { ascending: true })
        .order('time_seconds', { ascending: true })
        .limit(10);

    if (error) {
        console.error('Could not load leaderboard:', error);
        return;
    }

    renderLeaderboard(mmLeaderboardEl, data, (row) => `${row.moves} moves · ${row.time_seconds}s`);
}

// renderLeaderboard() is shared with minigame.js (loaded on the same page)
document.addEventListener('DOMContentLoaded', mmLoadLeaderboard);
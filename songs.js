document.addEventListener('DOMContentLoaded', function () {
    loadAlbums();
});

/* ---------- Small helpers ---------- */
function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function clamp01(n) {
    return Math.max(0, Math.min(1, n));
}

function makeDisc() {
    const disc = h('div', 'vs-disc');
    const spin = h('div', 'vs-disc-spin');
    spin.appendChild(h('div', 'vs-label'));
    disc.appendChild(spin);
    return disc;
}

/* ---------- Load data (same Supabase queries as before) ---------- */
async function loadAlbums() {
    const grid = document.getElementById('albums-grid');
    const db = getSupabaseClient();

    if (!db) {
        grid.innerHTML = '<p class="songs-loading">Discography isn\'t connected yet — check supabase-config.js.</p>';
        return;
    }

    const { data: albums, error: albumsError } = await db
        .from('albums')
        .select('id, title, color, cover_image, sort_order')
        .order('sort_order', { ascending: true });

    if (albumsError) {
        console.error('Could not load albums:', albumsError);
        grid.innerHTML = '<p class="songs-loading">Could not load the discography right now.</p>';
        return;
    }

    if (!albums || albums.length === 0) {
        grid.innerHTML = '<p class="songs-loading">No albums yet — check back soon!</p>';
        return;
    }

    const { data: tracks, error: tracksError } = await db
        .from('tracks')
        .select('id, album_id, title, url, sort_order')
        .order('sort_order', { ascending: true });

    if (tracksError) {
        console.error('Could not load tracks:', tracksError);
    }

    const tracksByAlbum = {};
    (tracks || []).forEach(function (t) {
        (tracksByAlbum[t.album_id] = tracksByAlbum[t.album_id] || []).push(t);
    });

    grid.innerHTML = '';
    let groupNo = 0;
    grid.appendChild(buildBooks(groupNo++, false));
    albums.forEach(function (album, i) {
        grid.appendChild(buildSlot(album, tracksByAlbum[album.id] || []));
        const isLast = i === albums.length - 1;
        if (isLast) {
            grid.appendChild(buildBooks(groupNo++, false));
        } else if ((i + 1) % 3 === 0) {
            grid.appendChild(buildBooks(groupNo++, true));
        }
    });
}

/* ---------- Decorative (non-clickable) books ---------- */
const BOOK_COLORS = ['#3f6b5e', '#8a4b3d', '#c9a45c', '#4a5d8a', '#7a3e55', '#d8c9a8', '#2f4a4a', '#b5654a', '#5b4a7a', '#6f7f4a'];

// Seeded so the arrangement is the same on every visit
function seededRandom(seed) {
    let a = (seed + 1) * 2654435761;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildBooks(seed, isMid) {
    const rand = seededRandom(seed * 7 + 3);
    const slot = h('div', 'vs-slot vs-deco' + (isMid ? ' vs-books-mid' : ''));
    slot.setAttribute('aria-hidden', 'true');

    const wrap = h('div', 'vs-books');
    const count = 3 + Math.floor(rand() * 4); // 3-6 books
    for (let i = 0; i < count; i++) {
        const book = h('i', 'vs-book v' + (1 + Math.floor(rand() * 3)));
        book.style.setProperty('--c', BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)]);
        book.style.setProperty('--h', (0.7 + rand() * 0.36).toFixed(2));
        book.style.setProperty('--w', (0.1 + rand() * 0.07).toFixed(3));
        if (i === count - 1 && count >= 4 && rand() > 0.45) book.classList.add('lean');
        wrap.appendChild(book);
    }

    slot.appendChild(wrap);
    slot.appendChild(h('div', 'vs-plank'));
    return slot;
}

/* ---------- One record on the shelf ---------- */
function buildSlot(album, tracks) {
    const slot = h('div', 'vs-slot');
    slot.style.setProperty('--album-color', album.color || '#a78bfa');

    const pick = h('button', 'vs-pick');
    pick.type = 'button';
    pick.setAttribute('aria-label', 'Play ' + album.title);

    const disc = makeDisc();
    disc.classList.add('vs-disc-shelf');

    const sleeve = h('div', 'vs-sleeve');
    if (album.cover_image) {
        sleeve.style.backgroundImage = 'url("' + String(album.cover_image).replace(/"/g, '%22') + '")';
    } else {
        sleeve.appendChild(h('span', 'vs-sleeve-title', album.title));
    }

    pick.appendChild(disc);
    pick.appendChild(sleeve);

    const plank = h('div', 'vs-plank');
    plank.appendChild(h('span', '', album.title));

    slot.appendChild(pick);
    slot.appendChild(plank);

    pick.addEventListener('click', function () {
        openPlayer(album, tracks, slot);
    });

    return slot;
}

/* ---------- The turntable ---------- */
function openPlayer(album, tracks, slot) {
    if (document.querySelector('.vs-player')) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const color = album.color || '#a78bfa';
    const pick = slot.querySelector('.vs-pick');
    const shelfDisc = slot.querySelector('.vs-disc');
    const sleeve = slot.querySelector('.vs-sleeve');

    // Needle angles (degrees). Rest = parked, LEAD = outer edge of the record,
    // tracks are spread from FIRST (outer groove) to LAST (inner groove).
    const ARM_REST = 3;
    const ARM_LEAD = 23;
    const ARM_FIRST = 27;
    const ARM_LAST = 41;

    function armFor(i) {
        if (tracks.length <= 1) return 32;
        return ARM_FIRST + (ARM_LAST - ARM_FIRST) * (i / (tracks.length - 1));
    }

    /* Build overlay */
    const overlay = h('div', 'vs-player');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', album.title);
    overlay.style.setProperty('--album-color', color);

    const backdrop = h('div', 'vs-backdrop');

    const closeBtn = h('button', 'vs-close vs-fade', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Put the record back');

    const stage = h('div', 'vs-stage');

    const frame = h('div', 'vs-deck-frame');
    const deck = h('div', 'vs-deck');

    const fadeParts = ['vs-plinth', 'vs-platter'];
    fadeParts.forEach(function (c) { deck.appendChild(h('div', c + ' vs-fade')); });

    const holder = h('div', 'vs-record');
    holder.appendChild(makeDisc());
    deck.appendChild(holder);

    ['vs-spindle', 'vs-rest', 'vs-arm-base', 'vs-arm'].forEach(function (c) {
        deck.appendChild(h('div', c + ' vs-fade'));
    });
    frame.appendChild(deck);

    /* Track list */
    const info = h('div', 'vs-info vs-fade');
    info.appendChild(h('div', 'vs-info-title', album.title));
    info.appendChild(h('p', 'vs-info-count', tracks.length === 1 ? '1 track' : tracks.length + ' tracks'));

    let current = -1;
    let armed = false;
    const trackLinks = [];

    function applyArm() {
        let deg = ARM_REST;
        if (armed) deg = current >= 0 ? armFor(current) : ARM_LEAD;
        deck.style.setProperty('--arm', deg + 'deg');
    }

    if (tracks.length === 0) {
        info.appendChild(h('p', 'vs-empty', 'No tracks have been added to this album yet.'));
    } else {
        const list = h('ol', 'vs-tracklist');
        tracks.forEach(function (t, i) {
            const li = document.createElement('li');
            const a = h('a', 'vs-track');
            if (t.url) {
                a.href = t.url;
                a.target = '_blank';
                a.rel = 'noopener';
            }
            a.appendChild(h('span', 'vs-track-num', String(i + 1)));
            a.appendChild(h('span', 'vs-track-title', t.title));
            a.addEventListener('click', function () {
                current = i;
                trackLinks.forEach(function (l, j) { l.classList.toggle('is-active', j === i); });
                applyArm();
            });
            trackLinks.push(a);
            li.appendChild(a);
            list.appendChild(li);
        });
        info.appendChild(list);
        info.appendChild(h('p', 'vs-info-hint', 'Pick a track to move the needle and open it in a new tab.'));
    }

    stage.appendChild(frame);
    stage.appendChild(info);
    overlay.appendChild(backdrop);
    overlay.appendChild(closeBtn);
    overlay.appendChild(stage);

    /* Scale the deck to fit narrow screens */
    function fit() {
        const s = Math.min(1, (window.innerWidth - 40) / 440);
        frame.style.setProperty('--s', s.toFixed(3));
    }

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    fit();
    window.addEventListener('resize', fit);

    /* Lift the record off the shelf and onto the platter */
    const fromRect = shelfDisc.getBoundingClientRect();
    const sleeveRect = sleeve.getBoundingClientRect();
    const peek = clamp01((sleeveRect.top - fromRect.top) / fromRect.height);
    const toRect = holder.getBoundingClientRect();

    function moveTransform(from, to) {
        const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + (from.width / to.width) + ')';
    }

    slot.classList.add('is-out');
    requestAnimationFrame(function () { overlay.classList.add('is-in'); });

    let flight = holder.animate(
        [
            { transform: moveTransform(fromRect, toRect), clipPath: 'inset(0 0 ' + (1 - peek) * 100 + '% 0)' },
            { transform: 'none', clipPath: 'inset(0 0 0% 0)' }
        ],
        { duration: reduce ? 1 : 850, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }
    );

    let closing = false;
    let timers = [];

    flight.finished.then(function () {
        if (closing) return;
        overlay.classList.add('is-spinning');
        timers.push(setTimeout(function () {
            if (closing) return;
            armed = true;
            applyArm();
        }, reduce ? 0 : 350));
    }).catch(function () {});

    closeBtn.focus({ preventScroll: true });

    /* Close: lift the needle, then send the record back to its sleeve */
    function finish() {
        overlay.remove();
        slot.classList.remove('is-out');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', fit);
        pick.focus({ preventScroll: true });
    }

    function close() {
        if (closing) return;
        closing = true;
        timers.forEach(clearTimeout);
        if (flight && flight.playState === 'running') flight.finish();

        armed = false;
        applyArm();
        overlay.classList.remove('is-spinning');
        overlay.classList.remove('is-in');

        timers.push(setTimeout(function () {
            const back = shelfDisc.getBoundingClientRect();
            const sl = sleeve.getBoundingClientRect();
            const backPeek = clamp01((sl.top - back.top) / back.height);
            const here = holder.getBoundingClientRect();

            const homeFlight = holder.animate(
                [
                    { transform: 'none', clipPath: 'inset(0 0 0% 0)' },
                    { transform: moveTransform(back, here), clipPath: 'inset(0 0 ' + (1 - backPeek) * 100 + '% 0)' }
                ],
                { duration: reduce ? 1 : 800, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' }
            );
            homeFlight.finished.then(finish).catch(finish);
        }, reduce ? 0 : 650));
    }

    function onKey(e) {
        if (e.key === 'Escape') close();
    }

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
}
const CHANNEL_NAME = 'KAIA';
const CHANNEL_AVATAR = 'assets/KAIA.jpg';

let statsData = [];
let monthsByStat = {};

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', route);

// ---------- small helpers ----------

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
}

function fmt(n) {
    return Number(n || 0).toLocaleString();
}

function fmtSigned(n) {
    n = Number(n || 0);
    return (n < 0 ? '-' : '+') + Math.abs(n).toLocaleString();
}

function parseMonth(iso) {
    const p = String(iso).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, 1);
}

function monthLabel(iso) {
    return parseMonth(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function monthShort(iso) {
    return parseMonth(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function safeUrl(u) {
    return /^https?:\/\//i.test(u || '') ? u : '';
}

function videoId(url) {
    try {
        const u = new URL(url);
        let id = '';
        if (u.hostname === 'youtu.be') {
            id = u.pathname.slice(1).split('/')[0];
        } else if (/(^|\.)youtube\.com$/.test(u.hostname)) {
            id = u.searchParams.get('v') || '';
            if (!id) {
                const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);
                if (m) id = m[1];
            }
        }
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    } catch (e) {
        return '';
    }
}

function thumbFor(stat) {
    if (stat.thumbnail) return stat.thumbnail;
    const id = videoId(stat.video_url);
    return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '';
}

// The newest snapshot is the "current month": views gained since its start.
function periodInfo(stat) {
    const snaps = monthsByStat[stat.id] || [];
    if (snaps.length === 0) return null;
    const cur = snaps[snaps.length - 1];
    return {
        month: cur.month,
        startViews: Number(cur.start_views),
        startAdded: Number(cur.start_added),
        gained: Number(stat.yt_views) - Number(cur.start_views),
        addedGained: Number(stat.added_views) - Number(cur.start_added)
    };
}

// Older snapshots: each month's gain = next month's start minus this month's start.
function previousMonths(stat) {
    const snaps = monthsByStat[stat.id] || [];
    const out = [];
    for (let i = 0; i < snaps.length - 1; i++) {
        out.push({
            month: snaps[i].month,
            startViews: Number(snaps[i].start_views),
            gained: Number(snaps[i + 1].start_views) - Number(snaps[i].start_views),
            addedGained: Number(snaps[i + 1].start_added) - Number(snaps[i].start_added)
        });
    }
    return out.reverse(); // newest first
}

// ---------- loading ----------

async function init() {
    const list = document.getElementById('stats-list');
    const db = getSupabaseClient();

    if (!db) {
        list.innerHTML = '<p class="songs-loading">Stats aren\'t connected yet — check supabase-config.js.</p>';
        return;
    }

    const statsRes = await db
        .from('stats')
        .select('id, title, yt_views, added_views, goal, video_url, thumbnail, updated_at')
        .order('sort_order', { ascending: true });

    if (statsRes.error) {
        console.error('Could not load stats:', statsRes.error);
        list.innerHTML = '<p class="songs-loading">Could not load stats right now.</p>';
        return;
    }

    const monthsRes = await db
        .from('stat_months')
        .select('stat_id, month, start_views, start_added')
        .order('month', { ascending: true });

    if (monthsRes.error) console.error('Could not load monthly data:', monthsRes.error);

    statsData = statsRes.data || [];
    monthsByStat = {};
    (monthsRes.data || []).forEach(function (m) {
        (monthsByStat[m.stat_id] = monthsByStat[m.stat_id] || []).push(m);
    });

    renderGrid();
    route();
}

// ---------- grid view ----------

function renderGrid() {
    const list = document.getElementById('stats-list');
    const summary = document.getElementById('stats-summary');
    const updatedEl = document.getElementById('stats-updated');

    if (statsData.length === 0) {
        list.innerHTML = '<p class="songs-loading">No videos yet — check back soon!</p>';
        return;
    }

    const totalYt = statsData.reduce(function (s, r) { return s + Number(r.yt_views || 0); }, 0);
    const totalAdded = statsData.reduce(function (s, r) { return s + Number(r.added_views || 0); }, 0);

    summary.innerHTML = '';
    [['Total YouTube views', fmt(totalYt)], ['Views added by ZAIA ST', fmt(totalAdded)]].forEach(function (pair) {
        const box = el('div', 'stats-box');
        box.appendChild(el('div', 'stats-box-num', pair[1]));
        box.appendChild(el('div', 'stats-box-label', pair[0]));
        summary.appendChild(box);
    });

    list.innerHTML = '';
    statsData.forEach(function (stat) { list.appendChild(buildCard(stat)); });

    const latest = statsData.reduce(function (m, r) {
        return new Date(r.updated_at) > m ? new Date(r.updated_at) : m;
    }, new Date(0));
    updatedEl.textContent = 'Last updated ' + latest.toLocaleString();
}

function buildCard(stat) {
    const card = el('a', 'vid-card');
    card.href = '#' + stat.id;

    const thumbWrap = el('div', 'vid-thumb');
    thumbWrap.appendChild(el('div', 'vid-placeholder', '▶'));
    const src = thumbFor(stat);
    if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = stat.title;
        img.loading = 'lazy';
        img.addEventListener('error', function () { img.style.display = 'none'; });
        thumbWrap.appendChild(img);
    }
    const period = periodInfo(stat);
    if (period) {
        thumbWrap.appendChild(el('span', 'vid-badge', fmtSigned(period.gained) + ' since ' + monthShort(period.month)));
    }
    card.appendChild(thumbWrap);

    const meta = el('div', 'vid-meta');
    const avatar = document.createElement('img');
    avatar.src = CHANNEL_AVATAR;
    avatar.alt = '';
    avatar.className = 'vid-ch-avatar';
    meta.appendChild(avatar);

    const text = el('div', 'vid-meta-text');
    text.appendChild(el('div', 'vid-card-title', stat.title));
    text.appendChild(el('div', 'vid-card-sub', CHANNEL_NAME));
    text.appendChild(el('div', 'vid-card-sub', fmt(stat.yt_views) + ' views · +' + fmt(stat.added_views) + ' added'));
    meta.appendChild(text);

    card.appendChild(meta);
    return card;
}

// ---------- detail ("watch") view ----------

function route() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    const stat = statsData.find(function (s) { return s.id === id; });
    const gridView = document.getElementById('stats-grid-view');
    const detailView = document.getElementById('stats-detail-view');

    if (stat) {
        renderDetail(stat);
        gridView.style.display = 'none';
        detailView.style.display = '';
    } else {
        detailView.style.display = 'none';
        gridView.style.display = '';
    }
    window.scrollTo(0, 0);
}

function statBox(label, value) {
    const box = el('div', 'stats-box');
    box.appendChild(el('div', 'stats-box-num', value));
    box.appendChild(el('div', 'stats-box-label', label));
    return box;
}

function renderDetail(stat) {
    const root = document.getElementById('stats-detail-view');
    root.innerHTML = '';
    document.title = stat.title + ' — Stats — ZAIA ST';

    const main = el('div', 'watch-main');

    const back = el('a', 'watch-back', '← Back to videos');
    back.href = '#';
    main.appendChild(back);

    // thumbnail / player
    const url = safeUrl(stat.video_url);
    const src = thumbFor(stat);
    const player = el('div', 'vid-player');
    player.appendChild(el('div', 'vid-placeholder', '▶'));
    if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = stat.title;
        img.className = 'watch-main-img';
        img.addEventListener('error', function () { img.style.display = 'none'; });
        player.appendChild(img);
    }
    if (url) {
        const link = el('a', 'vid-play');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.setAttribute('aria-label', 'Watch on YouTube');
        link.textContent = '▶';
        player.appendChild(link);
    }
    main.appendChild(player);

    main.appendChild(el('h1', 'watch-title', stat.title));

    // channel row
    const row = el('div', 'watch-channel-row');
    const avatar = document.createElement('img');
    avatar.src = CHANNEL_AVATAR;
    avatar.alt = '';
    avatar.className = 'vid-ch-avatar lg';
    row.appendChild(avatar);
    const rowText = el('div', 'watch-channel-text');
    rowText.appendChild(el('p', 'watch-role', CHANNEL_NAME));
    rowText.appendChild(el('p', 'watch-socials', fmt(stat.yt_views) + ' views'));
    row.appendChild(rowText);
    if (url) {
        const btn = el('a', 'vid-yt-btn', 'Watch on YouTube');
        btn.href = url;
        btn.target = '_blank';
        btn.rel = 'noopener';
        row.appendChild(btn);
    }
    main.appendChild(row);

    // all-time numbers
    const totals = el('div', 'stats-summary');
    totals.appendChild(statBox('Total YouTube views', fmt(stat.yt_views)));
    totals.appendChild(statBox('Views added by ZAIA ST', fmt(stat.added_views)));
    main.appendChild(totals);

    // current month
    const box = el('div', 'watch-desc-box');
    const period = periodInfo(stat);
    if (period) {
        box.appendChild(el('p', 'vid-box-title', 'Views from the start of ' + monthLabel(period.month)));
        const gains = el('div', 'stats-summary');
        gains.appendChild(statBox('YouTube views gained', fmtSigned(period.gained)));
        gains.appendChild(statBox('Views added by the team', fmtSigned(period.addedGained)));
        box.appendChild(gains);
        box.appendChild(el('p', 'vid-box-note',
            'Started the month at ' + fmt(period.startViews) + ' views, now at ' + fmt(stat.yt_views) + '.'));
    } else {
        box.appendChild(el('p', 'vid-box-note', 'No monthly numbers have been recorded for this video yet.'));
    }

    if (stat.goal && Number(stat.goal) > 0) {
        const pct = Math.min(100, Math.round((Number(stat.yt_views) / Number(stat.goal)) * 100));
        const bar = el('div', 'stats-bar');
        const fill = el('div', 'stats-bar-fill');
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        box.appendChild(bar);
        box.appendChild(el('div', 'stats-goal', pct + '% of ' + fmt(stat.goal) + ' goal'));
    }
    main.appendChild(box);

    // sidebar: previous months
    const side = el('aside', 'watch-sidebar');
    side.appendChild(el('h3', 'sidebar-heading', 'Previous months'));
    const prev = previousMonths(stat);
    const list = el('div', 'vid-month-list');
    if (prev.length === 0) {
        list.appendChild(el('p', 'vid-box-note', 'No previous months yet.'));
    }
    prev.forEach(function (m) {
        const card = el('div', 'vid-month-card');
        card.appendChild(el('div', 'vid-month-name', monthLabel(m.month)));
        card.appendChild(el('div', 'vid-month-gain', fmtSigned(m.gained) + ' views'));
        card.appendChild(el('div', 'vid-month-line', fmtSigned(m.addedGained) + ' added by the team'));
        card.appendChild(el('div', 'vid-month-line', 'Started at ' + fmt(m.startViews) + ' views'));
        list.appendChild(card);
    });
    side.appendChild(list);

    root.appendChild(main);
    root.appendChild(side);
}
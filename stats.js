document.addEventListener('DOMContentLoaded', loadStats);

function fmt(n) {
    return Number(n || 0).toLocaleString();
}

async function loadStats() {
    const list = document.getElementById('stats-list');
    const summary = document.getElementById('stats-summary');
    const updatedEl = document.getElementById('stats-updated');
    const db = getSupabaseClient();

    if (!db) {
        list.innerHTML = '<p class="songs-loading">Stats aren\'t connected yet — check supabase-config.js.</p>';
        return;
    }

    const { data, error } = await db
        .from('stats')
        .select('id, title, yt_views, added_views, goal, updated_at')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Could not load stats:', error);
        list.innerHTML = '<p class="songs-loading">Could not load stats right now.</p>';
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = '<p class="songs-loading">No stats yet — check back soon!</p>';
        return;
    }

    const totalYt = data.reduce(function (s, r) { return s + Number(r.yt_views || 0); }, 0);
    const totalAdded = data.reduce(function (s, r) { return s + Number(r.added_views || 0); }, 0);

    summary.innerHTML = '';
    [
        ['Total YouTube views', fmt(totalYt)],
        ['Views added by ZAIA ST', fmt(totalAdded)]
    ].forEach(function (pair) {
        const box = document.createElement('div');
        box.className = 'stats-box';
        const num = document.createElement('div');
        num.className = 'stats-box-num';
        num.textContent = pair[1];
        const label = document.createElement('div');
        label.className = 'stats-box-label';
        label.textContent = pair[0];
        box.appendChild(num);
        box.appendChild(label);
        summary.appendChild(box);
    });

    list.innerHTML = '';
    data.forEach(function (r) {
        const row = document.createElement('div');
        row.className = 'stats-row';

        const title = document.createElement('div');
        title.className = 'stats-title';
        title.textContent = r.title;

        const nums = document.createElement('div');
        nums.className = 'stats-nums';
        nums.textContent = fmt(r.yt_views) + ' views · +' + fmt(r.added_views) + ' added';

        row.appendChild(title);
        row.appendChild(nums);

        if (r.goal && Number(r.goal) > 0) {
            const pct = Math.min(100, Math.round((Number(r.yt_views) / Number(r.goal)) * 100));
            const bar = document.createElement('div');
            bar.className = 'stats-bar';
            const fill = document.createElement('div');
            fill.className = 'stats-bar-fill';
            fill.style.width = pct + '%';
            bar.appendChild(fill);
            const goalText = document.createElement('div');
            goalText.className = 'stats-goal';
            goalText.textContent = pct + '% of ' + fmt(r.goal) + ' goal';
            row.appendChild(bar);
            row.appendChild(goalText);
        }

        list.appendChild(row);
    });

    const latest = data.reduce(function (m, r) {
        return new Date(r.updated_at) > m ? new Date(r.updated_at) : m;
    }, new Date(0));
    updatedEl.textContent = 'Last updated ' + latest.toLocaleString();
}
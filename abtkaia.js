document.addEventListener('DOMContentLoaded', loadMembersGrid);

async function loadMembersGrid() {
    const grid = document.getElementById('members-grid');
    const db = getSupabaseClient();

    if (!db) {
        grid.innerHTML = '<p class="songs-loading">Members aren\'t connected yet — check supabase-config.js.</p>';
        return;
    }

    const { data, error } = await db
        .from('members')
        .select('id, name, role, img')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Could not load members:', error);
        grid.innerHTML = '<p class="songs-loading">Could not load the members right now.</p>';
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<p class="songs-loading">No members yet — check back soon!</p>';
        return;
    }

    grid.innerHTML = '';
    data.forEach(function (m) {
        const card = document.createElement('a');
        card.href = 'abtmember.html?member=' + encodeURIComponent(m.id);
        card.className = 'member-card';

        const thumb = document.createElement('img');
        thumb.src = m.img;
        thumb.alt = m.name;
        thumb.className = 'member-thumb-img';

        const row = document.createElement('div');
        row.className = 'member-row';

        const avatar = document.createElement('img');
        avatar.src = 'assets/KAIA.jpg';
        avatar.alt = m.name + ' avatar';
        avatar.className = 'member-avatar-sm';

        const text = document.createElement('div');
        text.className = 'member-text';
        const nameEl = document.createElement('p');
        nameEl.className = 'member-name';
        nameEl.textContent = m.name;
        const roleEl = document.createElement('p');
        roleEl.className = 'member-role';
        roleEl.textContent = m.role;
        text.appendChild(nameEl);
        text.appendChild(roleEl);

        row.appendChild(avatar);
        row.appendChild(text);
        card.appendChild(thumb);
        card.appendChild(row);
        grid.appendChild(card);
    });
}
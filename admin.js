let db;

document.addEventListener('DOMContentLoaded', init);

function init() {
    db = getSupabaseClient();
    if (!db) {
        document.getElementById('login-error').textContent = 'Supabase is not configured yet — fill in supabase-config.js.';
        return;
    }

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    document.querySelectorAll('.admin-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });

    setupMembersTab();
    setupAlbumsTab();
    setupAdminsTab();
    setupStatsTab();
    setupProjectsTab();

    db.auth.getSession().then(function (res) {
        if (res.data.session) showAdmin();
    });
}

function switchTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.admin-section').forEach(function (s) {
        s.classList.toggle('active', s.id === 'tab-' + tab);
    });
}

// ===================== AUTH =====================

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';

    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
        errEl.textContent = error.message;
        return;
    }
    showAdmin();
}

async function handleLogout() {
    await db.auth.signOut();
    document.getElementById('admin-wrap').style.display = 'none';
    document.getElementById('login-box').style.display = 'block';
}

function showAdmin() {
    document.getElementById('login-box').style.display = 'none';
    document.getElementById('admin-wrap').style.display = 'block';
    loadMembers();
    loadAlbums();
    loadAdminsList();
    loadStatsList();
    loadProjectsList();
    loadComments();
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
}

// ===================== MEMBERS =====================

function setupMembersTab() {
    const form = document.getElementById('members-form');
    document.getElementById('members-add-btn').addEventListener('click', function () {
        openMemberForm(null);
    });
    document.getElementById('members-cancel-btn').addEventListener('click', function () {
        form.classList.add('hidden');
    });
    form.addEventListener('submit', saveMember);
}

function openMemberForm(member) {
    const form = document.getElementById('members-form');
    form.classList.remove('hidden');
    document.getElementById('members-form-error').textContent = '';
    const idField = document.getElementById('m-id');

    if (member) {
        document.getElementById('members-form-mode').value = 'edit';
        idField.value = member.id;
        idField.disabled = true;
        document.getElementById('m-name').value = member.name;
        document.getElementById('m-role').value = member.role;
        document.getElementById('m-img').value = member.img;
        document.getElementById('m-avatar').value = member.avatar;
        document.getElementById('m-socials').value = member.socials;
        document.getElementById('m-sort').value = member.sort_order;
        document.getElementById('m-desc').value = member.description;
    } else {
        document.getElementById('members-form-mode').value = 'create';
        idField.disabled = false;
        ['m-id', 'm-name', 'm-role', 'm-img', 'm-avatar', 'm-socials', 'm-desc'].forEach(function (id) {
            document.getElementById(id).value = '';
        });
        document.getElementById('m-sort').value = 0;
    }
}

async function saveMember(e) {
    e.preventDefault();
    const mode = document.getElementById('members-form-mode').value;
    const errEl = document.getElementById('members-form-error');
    const id = document.getElementById('m-id').value.trim();
    const row = {
        name: document.getElementById('m-name').value.trim(),
        role: document.getElementById('m-role').value.trim(),
        img: document.getElementById('m-img').value.trim(),
        avatar: document.getElementById('m-avatar').value.trim(),
        socials: document.getElementById('m-socials').value.trim(),
        sort_order: parseInt(document.getElementById('m-sort').value, 10) || 0,
        description: document.getElementById('m-desc').value.trim()
    };

    if (!id || !row.name) {
        errEl.textContent = 'Slug and name are required.';
        return;
    }

    const result = mode === 'create'
        ? await db.from('members').insert(Object.assign({ id }, row))
        : await db.from('members').update(row).eq('id', id);

    if (result.error) {
        errEl.textContent = result.error.message;
        return;
    }
    document.getElementById('members-form').classList.add('hidden');
    loadMembers();
}

async function loadMembers() {
    const list = document.getElementById('members-list');
    const { data, error } = await db.from('members').select('*').order('sort_order', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + escapeHtml(error.message) + '</p>'; return; }
    if (!data || data.length === 0) { list.innerHTML = '<p class="admin-empty">No members yet.</p>'; return; }

    list.innerHTML = data.map(function (m) {
        return '<div class="admin-row" data-id="' + escapeHtml(m.id) + '">' +
            '<img src="' + escapeHtml(m.img) + '" alt="">' +
            '<div class="admin-row-info">' +
                '<div class="admin-row-title">' + escapeHtml(m.name) + ' <span style="opacity:0.6;font-weight:400;">(' + escapeHtml(m.id) + ')</span></div>' +
                '<div class="admin-row-sub">' + escapeHtml(m.role) + '</div>' +
            '</div>' +
            '<div class="admin-row-actions">' +
                '<button class="admin-btn ghost" data-action="edit">Edit</button>' +
                '<button class="admin-btn danger" data-action="delete">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.admin-row').forEach(function (row) {
        const id = row.dataset.id;
        const member = data.find(function (m) { return m.id === id; });
        row.querySelector('[data-action="edit"]').addEventListener('click', function () { openMemberForm(member); });
        row.querySelector('[data-action="delete"]').addEventListener('click', function () { deleteMember(id); });
    });
}

async function deleteMember(id) {
    if (!confirm('Delete this member?')) return;
    const { error } = await db.from('members').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadMembers();
}

// ===================== DISCOGRAPHY =====================

let editingAlbumId = null;

function setupAlbumsTab() {
    const form = document.getElementById('albums-form');
    document.getElementById('albums-add-btn').addEventListener('click', function () { openAlbumForm(null); });
    document.getElementById('albums-cancel-btn').addEventListener('click', function () { form.classList.add('hidden'); });
    document.getElementById('al-add-track-btn').addEventListener('click', function () { addTrackRow('', ''); });
    form.addEventListener('submit', saveAlbum);
}

function addTrackRow(title, url) {
    const wrap = document.getElementById('al-tracks');
    const row = document.createElement('div');
    row.className = 'admin-track-row';
    row.innerHTML =
        '<input type="text" placeholder="Track title" class="al-track-title" value="' + escapeHtml(title) + '">' +
        '<input type="text" placeholder="YouTube/Spotify URL" class="al-track-url" value="' + escapeHtml(url) + '">' +
        '<button type="button" class="admin-btn danger">Remove</button>';
    row.querySelector('button').addEventListener('click', function () { row.remove(); });
    wrap.appendChild(row);
}

async function openAlbumForm(album) {
    const form = document.getElementById('albums-form');
    form.classList.remove('hidden');
    document.getElementById('albums-form-error').textContent = '';
    document.getElementById('al-tracks').innerHTML = '';

    if (album) {
        editingAlbumId = album.id;
        document.getElementById('al-title').value = album.title;
        document.getElementById('al-color').value = album.color;
        document.getElementById('al-cover').value = album.cover_image;
        document.getElementById('al-sort').value = album.sort_order;

        const { data: tracks } = await db.from('tracks').select('*').eq('album_id', album.id).order('sort_order', { ascending: true });
        (tracks || []).forEach(function (t) { addTrackRow(t.title, t.url); });
        if (!tracks || tracks.length === 0) addTrackRow('', '');
    } else {
        editingAlbumId = null;
        document.getElementById('al-title').value = '';
        document.getElementById('al-color').value = '#a78bfa';
        document.getElementById('al-cover').value = '';
        document.getElementById('al-sort').value = 0;
        addTrackRow('', '');
    }
}

async function saveAlbum(e) {
    e.preventDefault();
    const errEl = document.getElementById('albums-form-error');
    const row = {
        title: document.getElementById('al-title').value.trim(),
        color: document.getElementById('al-color').value.trim() || '#a78bfa',
        cover_image: document.getElementById('al-cover').value.trim(),
        sort_order: parseInt(document.getElementById('al-sort').value, 10) || 0
    };
    const trackRows = Array.from(document.querySelectorAll('#al-tracks .admin-track-row')).map(function (r) {
        return { title: r.querySelector('.al-track-title').value.trim(), url: r.querySelector('.al-track-url').value.trim() };
    }).filter(function (t) { return t.title && t.url; });

    if (!row.title) { errEl.textContent = 'Album title is required.'; return; }
    if (trackRows.length === 0) { errEl.textContent = 'Add at least one track.'; return; }

    let albumId = editingAlbumId;

    if (albumId) {
        const { error } = await db.from('albums').update(row).eq('id', albumId);
        if (error) { errEl.textContent = error.message; return; }
        await db.from('tracks').delete().eq('album_id', albumId);
    } else {
        const { data, error } = await db.from('albums').insert(row).select().single();
        if (error) { errEl.textContent = error.message; return; }
        albumId = data.id;
    }

    const { error: trackError } = await db.from('tracks').insert(
        trackRows.map(function (t, i) { return { album_id: albumId, title: t.title, url: t.url, sort_order: i }; })
    );
    if (trackError) { errEl.textContent = trackError.message; return; }

    document.getElementById('albums-form').classList.add('hidden');
    loadAlbums();
}

async function loadAlbums() {
    const list = document.getElementById('albums-list');
    const { data: albums, error } = await db.from('albums').select('*').order('sort_order', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + escapeHtml(error.message) + '</p>'; return; }
    if (!albums || albums.length === 0) { list.innerHTML = '<p class="admin-empty">No albums yet.</p>'; return; }

    const { data: allTracks } = await db.from('tracks').select('album_id');
    const countByAlbum = {};
    (allTracks || []).forEach(function (t) { countByAlbum[t.album_id] = (countByAlbum[t.album_id] || 0) + 1; });

    list.innerHTML = albums.map(function (al) {
        const n = countByAlbum[al.id] || 0;
        return '<div class="admin-row" data-id="' + al.id + '">' +
            '<div style="width:48px;height:48px;border-radius:50%;background:' + escapeHtml(al.color) + ';flex-shrink:0;"></div>' +
            '<div class="admin-row-info">' +
                '<div class="admin-row-title">' + escapeHtml(al.title) + '</div>' +
                '<div class="admin-row-sub">' + n + ' track' + (n === 1 ? '' : 's') + '</div>' +
            '</div>' +
            '<div class="admin-row-actions">' +
                '<button class="admin-btn ghost" data-action="edit">Edit</button>' +
                '<button class="admin-btn danger" data-action="delete">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.admin-row').forEach(function (row) {
        const id = row.dataset.id;
        const album = albums.find(function (a) { return a.id === id; });
        row.querySelector('[data-action="edit"]').addEventListener('click', function () { openAlbumForm(album); });
        row.querySelector('[data-action="delete"]').addEventListener('click', function () { deleteAlbum(id); });
    });
}

async function deleteAlbum(id) {
    if (!confirm('Delete this album and all its tracks?')) return;
    const { error } = await db.from('albums').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadAlbums();
}

// ===================== ADMINS =====================

function setupAdminsTab() {
    const form = document.getElementById('admins-form');
    document.getElementById('admins-add-btn').addEventListener('click', function () { openAdminForm(null); });
    document.getElementById('admins-cancel-btn').addEventListener('click', function () { form.classList.add('hidden'); });
    form.addEventListener('submit', saveAdminBio);
}

function openAdminForm(admin) {
    const form = document.getElementById('admins-form');
    form.classList.remove('hidden');
    document.getElementById('admins-form-error').textContent = '';

    if (admin) {
        document.getElementById('a-form-id').value = admin.id;
        document.getElementById('a-name').value = admin.name;
        document.getElementById('a-role').value = admin.role;
        document.getElementById('a-img').value = admin.img;
        document.getElementById('a-sort').value = admin.sort_order;
        document.getElementById('a-head').checked = admin.is_head;
        document.getElementById('a-desc').value = admin.description;
        document.getElementById('a-socials').value = admin.socials || '';
    } else {
        document.getElementById('a-form-id').value = '';
        document.getElementById('a-name').value = '';
        document.getElementById('a-role').value = 'Member';
        document.getElementById('a-img').value = '';
        document.getElementById('a-sort').value = 0;
        document.getElementById('a-head').checked = false;
        document.getElementById('a-desc').value = '';
        document.getElementById('a-socials').value = '';
    }
}

async function saveAdminBio(e) {
    e.preventDefault();
    const errEl = document.getElementById('admins-form-error');
    const id = document.getElementById('a-form-id').value;
    const row = {
        name: document.getElementById('a-name').value.trim(),
        role: document.getElementById('a-role').value.trim() || 'Member',
        img: document.getElementById('a-img').value.trim(),
        sort_order: parseInt(document.getElementById('a-sort').value, 10) || 0,
        is_head: document.getElementById('a-head').checked,
        description: document.getElementById('a-desc').value.trim(),
        socials: document.getElementById('a-socials').value.trim()
    };

    if (!row.name) { errEl.textContent = 'Name is required.'; return; }

    const result = id
        ? await db.from('admins').update(row).eq('id', id)
        : await db.from('admins').insert(row);

    if (result.error) { errEl.textContent = result.error.message; return; }
    document.getElementById('admins-form').classList.add('hidden');
    loadAdminsList();
}

async function loadAdminsList() {
    const list = document.getElementById('admins-list');
    const { data, error } = await db.from('admins').select('*').order('sort_order', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + escapeHtml(error.message) + '</p>'; return; }
    if (!data || data.length === 0) { list.innerHTML = '<p class="admin-empty">No admins yet.</p>'; return; }

    list.innerHTML = data.map(function (a) {
        return '<div class="admin-row" data-id="' + a.id + '">' +
            '<img src="' + escapeHtml(a.img) + '" alt="">' +
            '<div class="admin-row-info">' +
                '<div class="admin-row-title">' + escapeHtml(a.name) + (a.is_head ? ' 👑' : '') + '</div>' +
                '<div class="admin-row-sub">' + escapeHtml(a.role) + '</div>' +
                '<div class="admin-row-desc">' + escapeHtml(a.description) + '</div>' +
            '</div>' +
            '<div class="admin-row-actions">' +
                '<button class="admin-btn ghost" data-action="edit">Edit</button>' +
                '<button class="admin-btn danger" data-action="delete">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.admin-row').forEach(function (row) {
        const id = row.dataset.id;
        const admin = data.find(function (a) { return a.id === id; });
        row.querySelector('[data-action="edit"]').addEventListener('click', function () { openAdminForm(admin); });
        row.querySelector('[data-action="delete"]').addEventListener('click', function () { deleteAdminBio(id); });
    });
}

async function deleteAdminBio(id) {
    if (!confirm('Delete this admin?')) return;
    const { error } = await db.from('admins').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadAdminsList();
}

// ===================== COMMENTS =====================

async function loadComments() {
    const list = document.getElementById('comments-list');
    const { data, error } = await db.from('comments').select('*').order('created_at', { ascending: false });
    if (error) { list.innerHTML = '<p class="admin-error">' + escapeHtml(error.message) + '</p>'; return; }
    if (!data || data.length === 0) { list.innerHTML = '<p class="admin-empty">No comments yet.</p>'; return; }

    list.innerHTML = data.map(function (c) {
        return '<div class="admin-row admin-comment-row ' + (c.approved ? 'approved' : 'pending') + '" data-id="' + c.id + '">' +
            '<div class="admin-row-info">' +
                '<div class="admin-row-title">' + escapeHtml(c.name) + ' <span style="opacity:0.6;font-weight:400;">' + escapeHtml(c.email) + '</span></div>' +
                '<div class="admin-row-sub">' + (c.approved ? 'Approved' : 'Pending') + ' &middot; ' + new Date(c.created_at).toLocaleString() + '</div>' +
                '<div class="admin-row-desc" style="max-height:none;">' + escapeHtml(c.message) + '</div>' +
            '</div>' +
            '<div class="admin-row-actions">' +
                (c.approved
                    ? '<button class="admin-btn ghost" data-action="unapprove">Unapprove</button>'
                    : '<button class="admin-btn primary" data-action="approve">Approve</button>') +
                '<button class="admin-btn danger" data-action="delete">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.admin-row').forEach(function (row) {
        const id = row.dataset.id;
        const approveBtn = row.querySelector('[data-action="approve"]');
        const unapproveBtn = row.querySelector('[data-action="unapprove"]');
        const deleteBtn = row.querySelector('[data-action="delete"]');
        if (approveBtn) approveBtn.addEventListener('click', function () { setCommentApproved(id, true); });
        if (unapproveBtn) unapproveBtn.addEventListener('click', function () { setCommentApproved(id, false); });
        deleteBtn.addEventListener('click', function () { deleteComment(id); });
    });
}

async function setCommentApproved(id, approved) {
    const { error } = await db.from('comments').update({ approved: approved }).eq('id', id);
    if (error) { alert(error.message); return; }
    loadComments();
}

async function deleteComment(id) {
    if (!confirm('Delete this comment permanently?')) return;
    const { error } = await db.from('comments').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadComments();
}


// ===================== STATS =====================

function setupStatsTab() {
    const form = document.getElementById('stats-form');
    document.getElementById('stats-add-btn').addEventListener('click', function () { openStatForm(null); });
    document.getElementById('stats-cancel-btn').addEventListener('click', function () { form.classList.add('hidden'); });
    form.addEventListener('submit', saveStat);
}

function openStatForm(stat) {
    document.getElementById('stats-form').classList.remove('hidden');
    document.getElementById('stats-form-error').textContent = '';
    document.getElementById('st-form-id').value = stat ? stat.id : '';
    document.getElementById('st-title').value = stat ? stat.title : '';
    document.getElementById('st-yt').value = stat ? stat.yt_views : 0;
    document.getElementById('st-added').value = stat ? stat.added_views : 0;
    document.getElementById('st-goal').value = stat && stat.goal != null ? stat.goal : '';
    document.getElementById('st-sort').value = stat ? stat.sort_order : 0;
}

async function saveStat(e) {
    e.preventDefault();
    const errEl = document.getElementById('stats-form-error');
    const id = document.getElementById('st-form-id').value;
    const goalRaw = document.getElementById('st-goal').value.trim();
    const row = {
        title: document.getElementById('st-title').value.trim(),
        yt_views: Math.max(0, parseInt(document.getElementById('st-yt').value, 10) || 0),
        added_views: Math.max(0, parseInt(document.getElementById('st-added').value, 10) || 0),
        goal: goalRaw ? Math.max(0, parseInt(goalRaw, 10) || 0) : null,
        sort_order: parseInt(document.getElementById('st-sort').value, 10) || 0,
        updated_at: new Date().toISOString()
    };
    if (!row.title) { errEl.textContent = 'Title is required.'; return; }

    const result = id
        ? await db.from('stats').update(row).eq('id', id)
        : await db.from('stats').insert(row);

    if (result.error) { errEl.textContent = result.error.message; return; }
    document.getElementById('stats-form').classList.add('hidden');
    loadStatsList();
}

async function loadStatsList() {
    const list = document.getElementById('stats-admin-list');
    const { data, error } = await db.from('stats').select('*').order('sort_order', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + escapeHtml(error.message) + '</p>'; return; }
    if (!data || data.length === 0) { list.innerHTML = '<p class="admin-empty">No stats yet.</p>'; return; }

    list.innerHTML = data.map(function (r) {
        return '<div class="admin-row" data-id="' + r.id + '">' +
            '<div class="admin-row-info">' +
                '<div class="admin-row-title">' + escapeHtml(r.title) + '</div>' +
                '<div class="admin-row-sub">' + Number(r.yt_views).toLocaleString() + ' views &middot; +' +
                    Number(r.added_views).toLocaleString() + ' added' +
                    (r.goal ? ' &middot; goal ' + Number(r.goal).toLocaleString() : '') + '</div>' +
            '</div>' +
            '<div class="admin-row-actions">' +
                '<button class="admin-btn ghost" data-action="edit">Edit</button>' +
                '<button class="admin-btn danger" data-action="delete">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.admin-row').forEach(function (row) {
        const id = row.dataset.id;
        const stat = data.find(function (r) { return r.id === id; });
        row.querySelector('[data-action="edit"]').addEventListener('click', function () { openStatForm(stat); });
        row.querySelector('[data-action="delete"]').addEventListener('click', async function () {
            if (!confirm('Delete this stat row?')) return;
            const { error: delError } = await db.from('stats').delete().eq('id', id);
            if (delError) { alert(delError.message); return; }
            loadStatsList();
        });
    });
}


// ===================== PROJECTS =====================

function setupProjectsTab() {
    const form = document.getElementById('projects-form');
    document.getElementById('projects-add-btn').addEventListener('click', function () { openProjectForm(null); });
    document.getElementById('projects-cancel-btn').addEventListener('click', function () { form.classList.add('hidden'); });
    form.addEventListener('submit', saveProject);
}

function openProjectForm(p) {
    document.getElementById('projects-form').classList.remove('hidden');
    document.getElementById('projects-form-error').textContent = '';
    document.getElementById('pr-form-id').value = p ? p.id : '';
    document.getElementById('pr-title').value = p ? p.title : '';
    document.getElementById('pr-status').value = p ? p.status : 'upcoming';
    document.getElementById('pr-date').value = p && p.project_date ? p.project_date : '';
    document.getElementById('pr-link').value = p ? p.link : '';
    document.getElementById('pr-sort').value = p ? p.sort_order : 0;
    document.getElementById('pr-desc').value = p ? p.description : '';
}

async function saveProject(e) {
    e.preventDefault();
    const errEl = document.getElementById('projects-form-error');
    const id = document.getElementById('pr-form-id').value;
    const link = document.getElementById('pr-link').value.trim();
    const row = {
        title: document.getElementById('pr-title').value.trim(),
        status: document.getElementById('pr-status').value,
        project_date: document.getElementById('pr-date').value || null,
        link: link,
        sort_order: parseInt(document.getElementById('pr-sort').value, 10) || 0,
        description: document.getElementById('pr-desc').value.trim()
    };
    if (!row.title) { errEl.textContent = 'Title is required.'; return; }
    if (link && !/^https?:\/\//i.test(link)) { errEl.textContent = 'Link must start with http:// or https://'; return; }

    const result = id
        ? await db.from('projects').update(row).eq('id', id)
        : await db.from('projects').insert(row);

    if (result.error) { errEl.textContent = result.error.message; return; }
    document.getElementById('projects-form').classList.add('hidden');
    loadProjectsList();
}

async function loadProjectsList() {
    const list = document.getElementById('projects-admin-list');
    const { data, error } = await db.from('projects').select('*').order('sort_order', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + escapeHtml(error.message) + '</p>'; return; }
    if (!data || data.length === 0) { list.innerHTML = '<p class="admin-empty">No projects yet.</p>'; return; }

    list.innerHTML = data.map(function (p) {
        return '<div class="admin-row" data-id="' + p.id + '">' +
            '<div class="admin-row-info">' +
                '<div class="admin-row-title">' + escapeHtml(p.title) + '</div>' +
                '<div class="admin-row-sub">' + (p.status === 'done' ? 'Completed' : 'Upcoming') +
                    (p.project_date ? ' &middot; ' + escapeHtml(p.project_date) : '') + '</div>' +
                '<div class="admin-row-desc">' + escapeHtml(p.description) + '</div>' +
            '</div>' +
            '<div class="admin-row-actions">' +
                '<button class="admin-btn ghost" data-action="edit">Edit</button>' +
                '<button class="admin-btn danger" data-action="delete">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.admin-row').forEach(function (row) {
        const id = row.dataset.id;
        const proj = data.find(function (p) { return p.id === id; });
        row.querySelector('[data-action="edit"]').addEventListener('click', function () { openProjectForm(proj); });
        row.querySelector('[data-action="delete"]').addEventListener('click', async function () {
            if (!confirm('Delete this project?')) return;
            const { error: delError } = await db.from('projects').delete().eq('id', id);
            if (delError) { alert(delError.message); return; }
            loadProjectsList();
        });
    });
}
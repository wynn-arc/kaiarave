document.addEventListener('DOMContentLoaded', function () {
    loadAlbums();
});

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
    albums.forEach(function (album) {
        grid.appendChild(buildAlbumCard(album, tracksByAlbum[album.id] || []));
    });

    attachAlbumHandlers();
}

function buildAlbumCard(album, tracks) {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.style.setProperty('--album-color', album.color || '#a78bfa');

    const trackCount = tracks.length;
    const hint = trackCount === 1 ? '1 track' : trackCount + ' tracks';

    const coverBack = document.createElement('div');
    coverBack.className = 'album-cover-back';
    if (album.cover_image) coverBack.style.backgroundImage = "url('" + album.cover_image + "')";

    const coverWrap = document.createElement('div');
    coverWrap.className = 'album-cover-wrap';
    coverWrap.appendChild(coverBack);
    const cover = document.createElement('div');
    cover.className = 'album-cover';
    cover.textContent = '💿';
    coverWrap.appendChild(cover);

    const title = document.createElement('h3');
    title.className = 'album-title';
    title.textContent = album.title;

    const hintEl = document.createElement('span');
    hintEl.className = 'album-hint';
    hintEl.textContent = hint;

    const list = document.createElement('ul');
    list.className = 'album-songs';
    tracks.forEach(function (t) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = t.url;
        a.textContent = t.title;
        li.appendChild(a);
        list.appendChild(li);
    });

    card.appendChild(coverWrap);
    card.appendChild(title);
    card.appendChild(hintEl);
    card.appendChild(list);
    return card;
}

function attachAlbumHandlers() {
    const cards = document.querySelectorAll('.album-card');

    cards.forEach(function (card) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Open ' + card.querySelector('.album-title').textContent);

        card.addEventListener('click', function () {
            openAlbum(card);
        });

        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAlbum(card);
            }
        });
    });
}

function openAlbum(card) {
    const color = card.style.getPropertyValue('--album-color') || '#a78bfa';
    const icon = card.querySelector('.album-cover').textContent.trim();
    const title = card.querySelector('.album-title').textContent.trim();
    const songLinks = Array.from(card.querySelectorAll('.album-songs a'));

    const coverBack = card.querySelector('.album-cover-back');
    const coverImage = coverBack ? coverBack.style.backgroundImage : '';

    if (songLinks.length === 0) return;

    const stemLines = songLinks
        .map(function (a, i) {
            return '<div class="stem-line" style="--i:' + i + '"></div>';
        })
        .join('');

    const stemNodes = songLinks
        .map(function (a, i) {
            const href = a.getAttribute('href') || '#';
            const label = a.textContent.trim();
            return (
                '<div class="stem-node" style="--i:' + i + '">' +
                '<a href="' + href + '" target="_blank" rel="noopener">' + label + '</a>' +
                '</div>'
            );
        })
        .join('');

    const overlay = document.createElement('div');
    overlay.className = 'album-overlay';
    overlay.innerHTML =
        '<div class="album-overlay-backdrop"></div>' +
        '<div class="album-expanded" style="--album-color:' + color + '">' +
        '<button class="album-close" aria-label="Close">&times;</button>' +
        '<div class="stem-wrap" style="--total:' + songLinks.length + '">' +
        '<div class="album-cover-big-wrap">' +
        '<div class="album-cover-back-big"></div>' +
        '<div class="album-cover-big">' + icon + '</div>' +
        '</div>' +
        stemLines +
        stemNodes +
        '</div>' +
        '<h2 class="expanded-title">' + title + '</h2>' +
        '</div>';

    if (coverImage) {
        const backBig = overlay.querySelector('.album-cover-back-big');
        if (backBig) backBig.style.backgroundImage = coverImage;
    }

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function closeOverlay() {
        overlay.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape') closeOverlay();
    }

    overlay.querySelector('.album-overlay-backdrop').addEventListener('click', closeOverlay);
    overlay.querySelector('.album-close').addEventListener('click', closeOverlay);
    document.addEventListener('keydown', escHandler);
}
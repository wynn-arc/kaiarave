
document.addEventListener('DOMContentLoaded', function () {
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
});

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
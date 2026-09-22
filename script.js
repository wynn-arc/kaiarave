const songs = [
    { title: "Hulog", trackId: "3qIqMxhU45MJeXQ0mZVb7k?si=e85f110ced16485d" },
    { title: "Walang Biruan", trackId: "6ZYPdk1sGKUiM4pnliw72f?si=dc682d58a90d4804" },
    { title: "Tanga", trackId: "35XFkYrc5OH9pPlkIwzbJX?si=3d74c952834b48e3" },
    { title: "Walkie Talkie", trackId: "5NLNNJ8aAT4mCRUg2uZuOU?si=75a2b5837b834442" },
    { title: "You Did It", trackId: "4KgGZEpl6PHxiNJyvtnWE6?si=a493f733d60d44b9" },
    { title: "5678", trackId: "2hAoi72sQzqmRwj4eXRjeh?si=c56302adf40a4805" },
    { title: "Blah Blah", trackId: "3keEpyhWEE4FCAEHXZDcPb?si=126a438820f94ca6" },
];

let lastIndex = -1;

function loadRandomSong() {
    let index;
    do {
        index = Math.floor(Math.random() * songs.length);
    } while (index === lastIndex && songs.length > 1);

    lastIndex = index;

    const player = document.getElementById("spotify-player");
    const song = songs[index];

    player.src = `https://open.spotify.com/embed/track/${song.trackId}?utm_source=generator&theme=0`;
}

const logoContainer = document.querySelector(".logo-container");
if (logoContainer) {
    logoContainer.addEventListener("mouseenter", loadRandomSong);
}

//ABOUT US JS
const adminGrid = document.getElementById("admin-grid");
const modalOverlay = document.getElementById("admin-modal-overlay");

if (adminGrid && modalOverlay) {
    const modalImg = document.getElementById("admin-modal-img");
    const modalRole = document.getElementById("admin-modal-role");
    const modalName = document.getElementById("admin-modal-name");
    const modalDesc = document.getElementById("admin-modal-desc");
    const modalClose = document.getElementById("admin-modal-close");

    var openAdminModal = function (card) {
        modalImg.src = card.dataset.img;
        modalImg.alt = card.dataset.name;
        modalRole.textContent = card.dataset.role;
        modalName.textContent = card.dataset.name;
        modalDesc.textContent = card.dataset.desc;
        modalOverlay.classList.add("active");
    };

    modalClose.addEventListener("click", () => modalOverlay.classList.remove("active"));
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove("active");
    });

    loadAdmins();
}

async function loadAdmins() {
    const db = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (!db) {
        adminGrid.innerHTML = '<p class="songs-loading">Admins aren\'t connected yet — check supabase-config.js.</p>';
        return;
    }

    const { data, error } = await db
        .from('admins')
        .select('id, name, role, description, img, is_head')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Could not load admins:', error);
        adminGrid.innerHTML = '<p class="songs-loading">Could not load the admins right now.</p>';
        return;
    }

    if (!data || data.length === 0) {
        adminGrid.innerHTML = '<p class="songs-loading">No admins yet — check back soon!</p>';
        return;
    }

    adminGrid.innerHTML = '';
    data.forEach(function (a) {
        const card = document.createElement('div');
        card.className = 'admin-card' + (a.is_head ? ' head-admin' : '');
        card.dataset.name = a.name;
        card.dataset.role = a.role;
        card.dataset.desc = a.description;
        card.dataset.img = a.img;

        const img = document.createElement('img');
        img.src = a.img;
        img.alt = a.name;
        img.className = 'admin-thumb-img';

        const roleEl = document.createElement('p');
        roleEl.className = 'admin-role';
        roleEl.textContent = a.role;

        const nameEl = document.createElement('p');
        nameEl.className = 'admin-name';
        nameEl.textContent = a.name;

        card.appendChild(img);
        card.appendChild(roleEl);
        card.appendChild(nameEl);
        card.addEventListener('click', () => openAdminModal(card));

        adminGrid.appendChild(card);
    });
}
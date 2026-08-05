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
const adminCards = document.querySelectorAll(".admin-card");
const modalOverlay = document.getElementById("admin-modal-overlay");
const modalImg = document.getElementById("admin-modal-img");
const modalRole = document.getElementById("admin-modal-role");
const modalName = document.getElementById("admin-modal-name");
const modalDesc = document.getElementById("admin-modal-desc");
const modalClose = document.getElementById("admin-modal-close");

adminCards.forEach(card => {
    card.addEventListener("click", () => {
        modalImg.src = card.querySelector(".admin-thumb-img").src;
        modalImg.alt = card.dataset.name;
        modalRole.textContent = card.dataset.role;
        modalName.textContent = card.dataset.name;
        modalDesc.textContent = card.dataset.desc;
        modalOverlay.classList.add("active");
    });
});

modalClose.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
});

modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove("active");
    }
});
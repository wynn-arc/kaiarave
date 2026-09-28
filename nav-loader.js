fetch("nav.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("navbar-placeholder").innerHTML = data;
        initNav();
    })
    .catch(error => console.error("Nav failed to load:", error));

function initNav() {
    const toggle  = document.getElementById("nav-toggle");
    const drawer  = document.getElementById("nav-drawer");
    const overlay = document.getElementById("nav-overlay");
    const close   = document.getElementById("nav-close");
    if (!toggle || !drawer || !overlay) return;

    function setOpen(open) {
        drawer.classList.toggle("open", open);
        overlay.classList.toggle("open", open);
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open);
        drawer.setAttribute("aria-hidden", !open);
        document.body.classList.toggle("nav-locked", open);
        if (open) close.focus(); else toggle.focus();
    }

    toggle.addEventListener("click", () => setOpen(!drawer.classList.contains("open")));
    close.addEventListener("click", () => setOpen(false));
    overlay.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("open")) setOpen(false);
    });

    // Highlight the current page
    const current = location.pathname.split("/").pop() || "home.html";
    drawer.querySelectorAll(".nav-links a").forEach(a => {
        if (a.getAttribute("href") === current) a.classList.add("active");
    });
}
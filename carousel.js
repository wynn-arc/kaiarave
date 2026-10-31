// Auto-sliding carousels.
//  - Add class "carousel-coverflow" for the centered-photo-with-peeking-sides look.
//  - Optional data-interval="4500" (ms between slides).
//  - Optional <p class="carousel-caption"></p> shows the active slide's <figcaption> underneath.
// Includes arrows, dots, click-a-side-photo, swipe, and pause on hover/focus.

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.carousel').forEach(initCarousel);
});

function initCarousel(root) {
    const slides = Array.from(root.querySelectorAll('.carousel-slide'));
    if (slides.length === 0) return;

    const coverflow = root.classList.contains('carousel-coverflow');
    const interval = parseInt(root.dataset.interval, 10) || 4500;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dotsWrap = root.querySelector('.carousel-dots');
    const prevBtn = root.querySelector('.carousel-btn.prev');
    const nextBtn = root.querySelector('.carousel-btn.next');
    const captionEl = root.querySelector('.carousel-caption');
    let index = 0;
    let timer = null;

    // If a photo file is missing, hide the broken-image icon (the tinted slide still shows)
    slides.forEach(function (s) {
        const img = s.querySelector('img');
        if (img) img.addEventListener('error', function () { img.style.display = 'none'; });
    });

    const dots = slides.map(function (_, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'carousel-dot';
        b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        b.addEventListener('click', function () { go(i); restart(); });
        if (dotsWrap) dotsWrap.appendChild(b);
        return b;
    });

    slides.forEach(function (s, i) {
        s.addEventListener('click', function () {
            if (i !== index) { go(i); restart(); }
        });
    });

    function go(i) {
        const n = slides.length;
        index = (i + n) % n;

        slides.forEach(function (s, k) {
            s.classList.toggle('active', k === index);
            s.setAttribute('aria-hidden', String(k !== index));

            if (coverflow) {
                // signed shortest distance from the active slide, wrapping around
                let d = (k - index + n) % n;
                if (d > n / 2) d -= n;
                const abs = Math.abs(d);
                s.style.setProperty('--o', d);
                s.dataset.pos = abs > 2 ? 'far' : String(abs);
                s.style.zIndex = String(10 - abs);
            }
        });

        dots.forEach(function (d, k) { d.classList.toggle('active', k === index); });

        if (captionEl) {
            const fig = slides[index].querySelector('figcaption');
            captionEl.innerHTML = fig ? fig.innerHTML : '';
        }
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function start() {
        if (reduceMotion || slides.length < 2) return;
        stop();
        timer = setInterval(function () { go(index + 1); }, interval);
    }

    function restart() { stop(); start(); }

    if (slides.length < 2) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsWrap) dotsWrap.style.display = 'none';
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(index - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(index + 1); restart(); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    // Swipe on touch screens
    let touchX = null;
    root.addEventListener('touchstart', function (e) {
        touchX = e.touches[0].clientX;
        stop();
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
        if (touchX !== null) {
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
        }
        touchX = null;
        start();
    }, { passive: true });

    go(0);
    start();
}
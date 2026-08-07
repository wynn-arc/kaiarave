// contact-form.js
//
// IMPORTANT: this still doesn't send anywhere — there's no backend on this
// static site. On submit it just drops a new comment bubble onto the page
// so it *feels* like it posted, but that comment disappears on refresh and
// nobody actually receives it yet.
//
// To make it real, wire the fetch/AJAX call in the "TODO: send it" spot
// below to one of:
//   1. Formspree (easiest) — https://formspree.io
//   2. EmailJS — sends straight from the browser
//   3. Your own backend endpoint
// credits to dating assessment

$(function () {
    const $form = $('#contact-form');
    const $name = $('#cf-name');
    const $email = $('#cf-email');
    const $message = $('#cf-message');
    const $submit = $('#cf-submit');
    const $cancel = $('#cf-cancel');
    const $status = $('#form-status');
    const $avatar = $('#composer-avatar');
    const $list = $('#comment-list');
    const $count = $('#yt-comment-count');

    const defaultAvatarSVG = $avatar.html();

    // Auto-grow the textarea like YouTube's composer
    $message.on('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        toggleSubmit();
    });

    // Swap the composer avatar to the visitor's initial as they type their name
    $name.on('input', function () {
        const val = $name.val().trim();
        if (val) {
            $avatar.text(val.charAt(0).toUpperCase());
        } else {
            $avatar.html(defaultAvatarSVG);
        }
    });

    function toggleSubmit() {
        $submit.prop('disabled', $message.val().trim().length === 0);
    }

    $cancel.on('click', function () {
        resetForm();
    });

    function resetForm() {
        $form[0].reset();
        $message.css('height', 'auto');
        $avatar.html(defaultAvatarSVG);
        $status.text('').removeClass('success error');
        toggleSubmit();
    }

    function escapeHtml(str) {
        return $('<div>').text(str).html();
    }

    $form.on('submit', function (e) {
        e.preventDefault();

        const name = $name.val().trim();
        const email = $email.val().trim();
        const message = $message.val().trim();

        if (!name || !email || !message) {
            $status.text('Please fill out your name, email, and comment.')
                   .removeClass('success').addClass('error');
            return;
        }

        // TODO: send it — this is where POST { name, email, message } goes ^^
        // to Formspree / EmailJS / backend, Piru baka magemailjs nlungs

        const initial = name.charAt(0).toUpperCase();
        const $newComment = $(`
            <div class="yt-comment">
                <div class="yt-comment-row">
                    <div class="yt-avatar yt-avatar--fan">${escapeHtml(initial)}</div>
                    <div class="yt-comment-body">
                        <div class="yt-comment-header">
                            <span class="yt-comment-author">${escapeHtml(name)}</span>
                            <span class="yt-comment-time">Just now</span>
                        </div>
                        <p class="yt-comment-text">${escapeHtml(message)}</p>
                        <div class="yt-comment-actions">
                            <span class="yt-action">👍 0</span>
                            <span class="yt-action">Reply</span>
                        </div>
                    </div>
                </div>
            </div>
        `);

        $list.prepend($newComment.hide().fadeIn(200));

        const current = parseInt($count.text(), 10) || 0;
        $count.text(current + 1);

        $status.text("Posted! (Heads up — this demo form doesn't email us yet, see note in contact-form.js)")
               .removeClass('error').addClass('success');

        resetForm();
    });

    toggleSubmit();
});
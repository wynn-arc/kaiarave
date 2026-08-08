
const EMAILJS_CONFIG = {
    publicKey: 'lSq7sbsnnoHzzcTSJ',
    serviceId: 'kaiarave_vercel',
    templateId: 'template_bt111tm',
};

emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });

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

    $message.on('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        toggleSubmit();
    });

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

        $submit.prop('disabled', true);
        $status.text('Sending...').removeClass('success error');

        emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
            from_name: name,
            from_email: email,
            message: message,
        }).then(function () {
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

            $status.text('Posted! Thanks for reaching out — we\'ll get back to you soon.')
                   .removeClass('error').addClass('success');

            resetForm();
        }).catch(function (err) {
            console.error('EmailJS error:', err);
            $status.text('Something went wrong sending your message. Please try again or email us directly.')
                   .removeClass('success').addClass('error');
            $submit.prop('disabled', false);
        });
    });

    toggleSubmit();
});

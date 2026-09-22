
const FORMSPREE_URL = 'https://formspree.io/f/xjykwkjw'; // e.g. 'https://formspree.io/f/xxxxxxxx' (leave '' to skip emails)

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
    const COOLDOWN_MS = 30000;
    let lastSentAt = 0;

    // Match the limits in schema.sql
    $name.attr('maxlength', 50);
    $email.attr('maxlength', 254);
    $message.attr('maxlength', 1000);

    // Supabase client (null if not configured yet, so the page still works)
    const db = getSupabaseClient();

    // ---------- helpers ----------

    function escapeHtml(str) {
        return $('<div>').text(str).html();
    }

    function timeAgo(iso) {
        const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        const units = [
            ['year', 31536000], ['month', 2592000], ['day', 86400],
            ['hour', 3600], ['minute', 60]
        ];
        for (const [label, size] of units) {
            const n = Math.floor(seconds / size);
            if (n >= 1) return n + ' ' + label + (n > 1 ? 's' : '') + ' ago';
        }
        return 'Just now';
    }

    function renderComment(name, message, timeText) {
        const initial = name.charAt(0).toUpperCase();
        return $(`
            <div class="yt-comment">
                <div class="yt-comment-row">
                    <div class="yt-avatar yt-avatar--fan">${escapeHtml(initial)}</div>
                    <div class="yt-comment-body">
                        <div class="yt-comment-header">
                            <span class="yt-comment-author">${escapeHtml(name)}</span>
                            <span class="yt-comment-time">${escapeHtml(timeText)}</span>
                        </div>
                        <p class="yt-comment-text">${escapeHtml(message)}</p>
                        <div class="yt-comment-actions">
                            <span class="yt-action">Reply</span>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    function setStatus(text, kind) {
        $status.text(text).removeClass('success error');
        if (kind) $status.addClass(kind);
    }

    // ---------- load approved comments ----------

    async function loadComments() {
        if (!db) return;
        const { data, error } = await db
            .from('comments')
            .select('id, name, message, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Could not load comments:', error);
            return;
        }

        const base = parseInt($count.text(), 10) || 0;
        data.forEach(function (c) {
            $list.append(renderComment(c.name, c.message, timeAgo(c.created_at)));
        });
        $count.text(base + data.length);
    }

    // ---------- composer behaviour ----------

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

    $cancel.on('click', resetForm);

    function resetForm() {
        $form[0].reset();
        $message.css('height', 'auto');
        $avatar.html(defaultAvatarSVG);
        setStatus('');
        toggleSubmit();
    }

    // ---------- submit ----------

    $form.on('submit', async function (e) {
        e.preventDefault();

        // Honeypot: real people never see or fill this field, bots do.
        if ($('#cf-website').val()) return;

        const name = $name.val().trim();
        const email = $email.val().trim();
        const message = $message.val().trim();

        if (!name || !email || !message) {
            setStatus('Please fill out your name, email, and comment.', 'error');
            return;
        }

        if (Date.now() - lastSentAt < COOLDOWN_MS) {
            setStatus('Please wait a few seconds before sending another comment.', 'error');
            return;
        }

        if (!db && !FORMSPREE_URL) {
            setStatus('The backend is not configured yet (see CONFIG in contact-form.js).', 'error');
            return;
        }

        $submit.prop('disabled', true);
        setStatus('Sending...');

        const payload = { name: name, email: email, message: message };
        const jobs = [];
        let dbIndex = -1;

        if (db) {
            dbIndex = jobs.length;
            jobs.push(
                db.from('comments').insert(payload).then(function (res) {
                    if (res.error) throw res.error;
                })
            );
        }

        if (FORMSPREE_URL) {
            jobs.push(
                fetch(FORMSPREE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    if (!res.ok) throw new Error('Formspree responded ' + res.status);
                })
            );
        }

        const results = await Promise.allSettled(jobs);
        results.forEach(function (r) {
            if (r.status === 'rejected') console.error('Submit failed:', r.reason);
        });

        const anyOk = results.some(function (r) { return r.status === 'fulfilled'; });
        const savedComment = dbIndex >= 0 && results[dbIndex].status === 'fulfilled';

        if (!anyOk) {
            $submit.prop('disabled', false);
            setStatus('Something went wrong. Please try again in a bit.', 'error');
            return;
        }

        lastSentAt = Date.now();

        // Show the visitor their own comment, marked as pending. It disappears on
        // refresh and only becomes public once you approve it.
        if (savedComment) {
            const $pending = renderComment(name, message, 'Pending approval');
            $list.prepend($pending.hide().fadeIn(200));
        }

        resetForm();
        setStatus(
            savedComment
                ? 'Thanks! Your comment was sent and will appear once it is approved.'
                : 'Thanks! Your message was sent.',
            'success'
        );
    });

    toggleSubmit();
    loadComments();
});
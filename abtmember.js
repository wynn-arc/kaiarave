function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function loadMember() {
    const memberId = getQueryParam("member");
    const db = getSupabaseClient();

    if (!db) {
        document.querySelector(".watch-main").innerHTML = "<h1>Members aren't connected yet</h1><p>Check supabase-config.js.</p>";
        document.querySelector(".watch-sidebar").style.display = "none";
        return;
    }

    const { data: member, error } = await db
        .from('members')
        .select('id, name, role, img, avatar, description, socials, stage_name, birth_name, birthday, zodiac, chinese_zodiac, height, weight, blood_type, mbti')
        .eq('id', memberId)
        .maybeSingle();

    if (error || !member) {
        document.querySelector(".watch-main").innerHTML = "<h1>Member not found</h1><a href='abtkaia.html'>Back to Members</a>";
        document.querySelector(".watch-sidebar").style.display = "none";
        return;
    }

    document.getElementById("page-title").textContent = member.name + " - ZAIA ST!";
    document.getElementById("main-img").src = member.img;
    document.getElementById("main-img").alt = member.name;
    document.getElementById("member-name").textContent = member.name;
    document.getElementById("member-avatar").textContent = member.avatar;
    document.getElementById("member-role").textContent = member.role;
    document.getElementById("member-desc").textContent = member.description;

    // Profile facts (any field left blank in the admin panel is simply skipped)
    const facts = [
        ['Stage Name', member.stage_name],
        ['Birth Name', member.birth_name],
        ['Position', member.role],
        ['Birthday', member.birthday],
        ['Zodiac Sign', member.zodiac],
        ['Chinese Zodiac Sign', member.chinese_zodiac],
        ['Height', member.height],
        ['Weight', member.weight],
        ['Blood Type', member.blood_type],
        ['MBTI Type', member.mbti],
        ['Representative Emoji', member.avatar]
    ];
    const factsEl = document.getElementById("member-facts");
    factsEl.innerHTML = "";
    let shown = 0;
    facts.forEach(function (pair) {
        if (!pair[1]) return;
        const dt = document.createElement("dt");
        dt.textContent = pair[0];
        const dd = document.createElement("dd");
        dd.textContent = pair[1];
        factsEl.appendChild(dt);
        factsEl.appendChild(dd);
        shown++;
    });
    document.getElementById("member-facts-box").style.display = shown ? "block" : "none";

    // Follow card (one line per platform, e.g. "Instagram: @handle")
    renderFollowCard(member);

    buildSidebar(db, member.id);
}

async function buildSidebar(db, currentId) {
    const sidebarList = document.getElementById("sidebar-list");
    sidebarList.innerHTML = "";

    const { data: others, error } = await db
        .from('members')
        .select('id, name, role, img')
        .neq('id', currentId)
        .order('sort_order', { ascending: true });

    if (error || !others) return;

    others.forEach(function (m) {
        const card = document.createElement("a");
        card.href = `abtmember.html?member=${encodeURIComponent(m.id)}`;
        card.className = "sidebar-card";

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'sidebar-thumb-wrap';
        const thumb = document.createElement('img');
        thumb.src = m.img;
        thumb.alt = m.name;
        thumb.className = 'sidebar-thumb';
        thumbWrap.appendChild(thumb);

        const text = document.createElement('div');
        text.className = 'sidebar-card-text';
        const nameEl = document.createElement('p');
        nameEl.className = 'sidebar-name';
        nameEl.textContent = m.name;
        const roleEl = document.createElement('p');
        roleEl.className = 'sidebar-role';
        roleEl.textContent = m.role;
        text.appendChild(nameEl);
        text.appendChild(roleEl);

        card.appendChild(thumbWrap);
        card.appendChild(text);
        sidebarList.appendChild(card);
    });
}

// ----- Follow card -----

const SOCIAL_PLATFORMS = {
    instagram: { label: 'Instagram', icon: 'IG', url: function (h) { return 'https://instagram.com/' + h; } },
    ig: { label: 'Instagram', icon: 'IG', url: function (h) { return 'https://instagram.com/' + h; } },
    x: { label: 'X', icon: 'X', url: function (h) { return 'https://x.com/' + h; } },
    twitter: { label: 'Twitter/X', icon: 'X', url: function (h) { return 'https://x.com/' + h; } },
    twitterx: { label: 'Twitter/X', icon: 'X', url: function (h) { return 'https://x.com/' + h; } },
    tiktok: { label: 'TikTok', icon: 'TT', url: function (h) { return 'https://tiktok.com/@' + h; } },
    youtube: { label: 'YouTube', icon: 'YT', url: function (h) { return 'https://youtube.com/@' + h; } },
    yt: { label: 'YouTube', icon: 'YT', url: function (h) { return 'https://youtube.com/@' + h; } },
    facebook: { label: 'Facebook', icon: 'FB', url: function (h) { return 'https://facebook.com/' + h; } },
    fb: { label: 'Facebook', icon: 'FB', url: function (h) { return 'https://facebook.com/' + h; } }
};

// Turns one line of text into { label, icon, handle, href }.
// "@name" alone is treated as Instagram; a full https:// link is used as-is.
function parseSocialLine(line) {
    line = line.trim();
    if (!line) return null;

    if (/^https?:\/\//i.test(line)) {
        return { label: 'Link', icon: '\u2197', handle: line.replace(/^https?:\/\//i, ''), href: line };
    }

    let key = 'instagram';
    let handle = line;
    const m = line.match(/^([A-Za-z\/ ]+?)\s*:\s*(.+)$/);
    if (m) {
        key = m[1].toLowerCase().replace(/[^a-z]/g, '');
        handle = m[2].trim();
    }

    const platform = SOCIAL_PLATFORMS[key];
    const bare = handle.replace(/^@/, '');
    const linkable = platform && /^[A-Za-z0-9._]+$/.test(bare);

    if (platform) {
        return { label: platform.label, icon: platform.icon, handle: handle, href: linkable ? platform.url(bare) : '' };
    }
    // unknown platform name: show it as typed, no link
    const label = m ? m[1].trim() : 'Social';
    return { label: label, icon: label.slice(0, 2).toUpperCase(), handle: handle, href: '' };
}

function renderFollowCard(member) {
    const box = document.getElementById("member-follow-box");
    const list = document.getElementById("member-follow-list");
    list.innerHTML = "";

    const items = (member.socials || "").split("\n").map(parseSocialLine).filter(Boolean);
    if (items.length === 0) {
        box.style.display = "none";
        return;
    }

    document.getElementById("follow-heading").textContent = "Follow " + (member.stage_name || member.name) + " On Social Media";

    items.forEach(function (item) {
        const li = document.createElement("li");
        const pill = document.createElement(item.href ? "a" : "div");
        pill.className = "social-pill";
        if (item.href) {
            pill.href = item.href;
            pill.target = "_blank";
            pill.rel = "noopener";
        }

        const icon = document.createElement("span");
        icon.className = "social-icon";
        icon.textContent = item.icon;

        const text = document.createElement("span");
        text.className = "social-text";
        const platform = document.createElement("span");
        platform.className = "social-platform";
        platform.textContent = item.label;
        const handle = document.createElement("span");
        handle.className = "social-handle";
        handle.textContent = item.handle;
        text.appendChild(platform);
        text.appendChild(handle);

        pill.appendChild(icon);
        pill.appendChild(text);
        li.appendChild(pill);
        list.appendChild(li);
    });

    box.style.display = "block";
}

loadMember();
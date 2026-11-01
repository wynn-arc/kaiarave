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
    document.getElementById("member-socials").textContent = member.socials;
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
        ['Representative Emoji', member.avatar],
        ['Instagram', member.socials]
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

loadMember();
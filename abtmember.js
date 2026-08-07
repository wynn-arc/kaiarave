function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function loadMember() {
    const memberId = getQueryParam("member");
    const member = membersData[memberId];

    if (!member) {
        document.querySelector(".watch-main").innerHTML = "<h1>Member not found</h1><a href='members.html'>Back to Members</a>";
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

    buildSidebar(memberId);
}

function buildSidebar(currentId) {
    const sidebarList = document.getElementById("sidebar-list");
    sidebarList.innerHTML = "";

    for (const id in membersData) {
        if (id === currentId) continue;

        const m = membersData[id];
        const card = document.createElement("a");
        card.href = `abtmember.html?member=${id}`;
        card.className = "sidebar-card";
        card.innerHTML = `
    <div class="sidebar-thumb-wrap">
        <img src="${m.img}" alt="${m.name}" class="sidebar-thumb">
    </div>
    <div class="sidebar-card-text">
        <p class="sidebar-name">${m.name}</p>
        <p class="sidebar-role">${m.role}</p>
    </div>
`;
        sidebarList.appendChild(card);
    }
}

loadMember();
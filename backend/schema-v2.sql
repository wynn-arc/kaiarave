
-- ===================== SCORES (leaderboard) =====================

create table public.scores (
    id           uuid primary key default gen_random_uuid(),
    game         text not null check (game in ('catch', 'memory')),
    player_name  text not null check (char_length(player_name) between 1 and 30),
    score        int,   -- Catch the KAIAmojis: higher is better
    moves        int,   -- Memory Match: lower is better
    time_seconds int,   -- Memory Match: lower is better
    created_at   timestamptz not null default now()
);

alter table public.scores enable row level security;
revoke all on public.scores from anon, authenticated;

grant insert (game, player_name, score, moves, time_seconds) on public.scores to anon;
grant select on public.scores to anon;

create policy "anyone can submit a score"
    on public.scores for insert to anon
    with check (true);

create policy "anyone can read scores"
    on public.scores for select to anon
    using (true);

-- ===================== MEMBERS (KAIA) =====================

create table public.members (
    id          text primary key,   -- short slug, e.g. 'member1' or 'angela'
    name        text not null,
    role        text not null default '',
    img         text not null default '',
    avatar      text not null default '',
    description text not null default '',
    socials     text not null default '',
    sort_order  int  not null default 0
);

alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;

grant select on public.members to anon;
grant select, insert, update, delete on public.members to authenticated;

create policy "anyone can read members"
    on public.members for select to anon using (true);

create policy "admin can manage members"
    on public.members for all to authenticated using (true) with check (true);

-- ===================== DISCOGRAPHY (albums + tracks) =====================

create table public.albums (
    id           uuid primary key default gen_random_uuid(),
    title        text not null,
    color        text not null default '#a78bfa',
    cover_image  text not null default '',
    sort_order   int  not null default 0
);

create table public.tracks (
    id         uuid primary key default gen_random_uuid(),
    album_id   uuid not null references public.albums(id) on delete cascade,
    title      text not null,
    url        text not null,
    sort_order int  not null default 0
);

alter table public.albums enable row level security;
alter table public.tracks enable row level security;
revoke all on public.albums from anon, authenticated;
revoke all on public.tracks from anon, authenticated;

grant select on public.albums to anon;
grant select, insert, update, delete on public.albums to authenticated;
grant select on public.tracks to anon;
grant select, insert, update, delete on public.tracks to authenticated;

create policy "anyone can read albums"
    on public.albums for select to anon using (true);
create policy "admin can manage albums"
    on public.albums for all to authenticated using (true) with check (true);

create policy "anyone can read tracks"
    on public.tracks for select to anon using (true);
create policy "admin can manage tracks"
    on public.tracks for all to authenticated using (true) with check (true);

-- ===================== ADMINS (About Us bios) =====================

create table public.admins (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    role        text not null default 'Member',
    description text not null default '',
    img         text not null default '',
    is_head     boolean not null default false,
    sort_order  int not null default 0
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

grant select on public.admins to anon;
grant select, insert, update, delete on public.admins to authenticated;

create policy "anyone can read admins"
    on public.admins for select to anon using (true);
create policy "admin can manage admins"
    on public.admins for all to authenticated using (true) with check (true);

-- schema.sql already lets visitors insert/read approved comments.
-- This adds full access for your signed-in admin account so admin.html
-- can approve or delete comments.

grant select, update, delete on public.comments to authenticated;

create policy "admin can read all comments"
    on public.comments for select to authenticated using (true);

create policy "admin can update comments"
    on public.comments for update to authenticated using (true) with check (true);

create policy "admin can delete comments"
    on public.comments for delete to authenticated using (true);
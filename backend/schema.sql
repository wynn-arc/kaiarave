
create table public.comments (
    id         uuid primary key default gen_random_uuid(),
    name       text not null check (char_length(name) between 1 and 50),
    email      text not null check (char_length(email) between 3 and 254),
    message    text not null check (char_length(message) between 1 and 1000),
    approved   boolean not null default false,   -- you flip this to true to publish
    created_at timestamptz not null default now()
);

create index comments_approved_created_idx
    on public.comments (created_at desc) where approved;

-- Lock the table down: with RLS on and no policy, nobody can touch it.
alter table public.comments enable row level security;

-- Start from zero permissions for the public (browser) roles...
revoke all on public.comments from anon, authenticated;

-- ...then grant only what the website needs.
-- Visitors can INSERT name/email/message (never 'approved').
grant insert (name, email, message) on public.comments to anon;
-- Visitors can READ only these columns. The email column is never readable.
grant select (id, name, message, created_at) on public.comments to anon;

-- Row rules
create policy "anyone can submit a comment"
    on public.comments for insert to anon
    with check (approved = false);

create policy "anyone can read approved comments"
    on public.comments for select to anon
    using (approved = true);

create table if not exists public.tracks (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    date timestamptz not null,
    distance double precision not null,
    duration_minutes integer not null,
    pace text not null,
    icon text not null,
    color text not null,
    created_at timestamptz not null default now()
);

create index if not exists tracks_user_date_idx
    on public.tracks(user_id, date desc);

alter table public.tracks enable row level security;

drop policy if exists "Users can read own tracks" on public.tracks;
create policy "Users can read own tracks"
    on public.tracks
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own tracks" on public.tracks;
create policy "Users can insert own tracks"
    on public.tracks
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tracks" on public.tracks;
create policy "Users can delete own tracks"
    on public.tracks
    for delete
    using (auth.uid() = user_id);

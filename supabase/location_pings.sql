create extension if not exists pgcrypto;

create table if not exists public.location_pings (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    latitude double precision not null,
    longitude double precision not null,
    timestamp timestamptz not null,
    location_name text not null,
    category text not null check (category in ('study', 'work', 'gym', 'social', 'home', 'other')),
    created_at timestamptz not null default now()
);

create index if not exists location_pings_user_timestamp_idx
    on public.location_pings(user_id, timestamp desc);

alter table public.location_pings enable row level security;

drop policy if exists "Users can read own location pings" on public.location_pings;
create policy "Users can read own location pings"
    on public.location_pings
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own location pings" on public.location_pings;
create policy "Users can insert own location pings"
    on public.location_pings
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own location pings" on public.location_pings;
create policy "Users can delete own location pings"
    on public.location_pings
    for delete
    using (auth.uid() = user_id);

create table if not exists public.known_places (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    category text not null check (category in ('study', 'work', 'gym', 'social', 'home', 'other')),
    latitude double precision not null,
    longitude double precision not null,
    radius_meters integer not null check (radius_meters >= 10 and radius_meters <= 5000),
    created_at timestamptz not null default now()
);

create index if not exists known_places_user_created_idx
    on public.known_places(user_id, created_at desc);

alter table public.known_places enable row level security;

drop policy if exists "Users can read own known places" on public.known_places;
create policy "Users can read own known places"
    on public.known_places
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own known places" on public.known_places;
create policy "Users can insert own known places"
    on public.known_places
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own known places" on public.known_places;
create policy "Users can delete own known places"
    on public.known_places
    for delete
    using (auth.uid() = user_id);

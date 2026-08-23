-- traverse.news v1 schema
create extension if not exists "pgcrypto";

create table if not exists beats (
  id text primary key,
  name text not null,
  slug text not null unique,
  sort integer not null default 0
);

create table if not exists sources (
  id text primary key,
  name text not null,
  homepage text not null,
  feed_url text,
  pull_method text not null check (pull_method in ('rss','ics','html','facebook','original','none')),
  beat_id text not null references beats(id),
  enabled boolean not null default true,
  notes text not null default ''
);

create table if not exists stories (
  id text primary key,
  source_id text not null references sources(id),
  title text not null,
  dek text not null default '',
  url text not null,
  published_at timestamptz not null,
  is_original boolean not null default false,
  body text,
  image_url text,
  byline text,
  slug text unique
);

create table if not exists events (
  id text primary key,
  title text not null,
  starts_at timestamptz not null,
  place text not null default '',
  url text,
  source_id text not null references sources(id)
);

create table if not exists subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

create index if not exists stories_published_idx on stories (published_at desc);
create index if not exists events_starts_idx on events (starts_at);
create index if not exists sources_beat_idx on sources (beat_id);

-- Staff auth uses Supabase Auth. Create users in the dashboard.
-- Optional: map staff profiles later.

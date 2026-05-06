
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  kills int not null default 0,
  deaths int not null default 0,
  matches_played int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles viewable by authenticated"
  on public.profiles for select
  to authenticated using (true);

create policy "users update own profile"
  on public.profiles for update
  to authenticated using (auth.uid() = id);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Player' || substr(new.id::text, 1, 6))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'user');
create type public.match_stage as enum ('group','r16','qf','sf','third','final');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- ============ ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users can read own roles"
  on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins can manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ============ TOURNAMENT SETTINGS (singleton row id=1) ============
create table public.tournament_settings (
  id int primary key default 1,
  start_at timestamptz not null default '2026-06-11 18:00:00+00',
  actual_champion text,
  actual_runner_up text,
  actual_semi1 text,
  actual_semi2 text,
  actual_top_scorer text,
  constraint singleton check (id = 1)
);
insert into public.tournament_settings (id) values (1);
alter table public.tournament_settings enable row level security;

create policy "settings readable by authenticated"
  on public.tournament_settings for select to authenticated using (true);
create policy "admins can update settings"
  on public.tournament_settings for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ============ MATCHES ============
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number int unique not null,
  stage match_stage not null,
  kickoff timestamptz not null,
  home_team text not null default 'TBD',
  away_team text not null default 'TBD',
  home_score int,
  away_score int,
  finished boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.matches enable row level security;

create policy "matches readable by authenticated"
  on public.matches for select to authenticated using (true);
create policy "admins can insert matches"
  on public.matches for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admins can update matches"
  on public.matches for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins can delete matches"
  on public.matches for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ LONG TERM PICKS ============
create table public.long_term_picks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  champion text not null,
  runner_up text not null,
  semi1 text not null,
  semi2 text not null,
  top_scorer text not null,
  updated_at timestamptz not null default now()
);
alter table public.long_term_picks enable row level security;

create or replace function public.tournament_started()
returns boolean language sql stable as $$
  select now() >= (select start_at from public.tournament_settings where id = 1)
$$;

create policy "users see own longterm always"
  on public.long_term_picks for select to authenticated
  using (auth.uid() = user_id or public.tournament_started() or public.has_role(auth.uid(),'admin'));
create policy "users insert own longterm before start"
  on public.long_term_picks for insert to authenticated
  with check (auth.uid() = user_id and not public.tournament_started());
create policy "users update own longterm before start"
  on public.long_term_picks for update to authenticated
  using (auth.uid() = user_id and not public.tournament_started())
  with check (auth.uid() = user_id and not public.tournament_started());

-- ============ MATCH PICKS ============
create table public.match_picks (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score int not null check (home_score >= 0 and home_score <= 30),
  away_score int not null check (away_score >= 0 and away_score <= 30),
  joker boolean not null default false,
  submitted_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.match_picks enable row level security;

create or replace function public.match_kickoff_passed(_match_id uuid)
returns boolean language sql stable as $$
  select now() >= (select kickoff from public.matches where id = _match_id)
$$;

create policy "users see own picks or after kickoff"
  on public.match_picks for select to authenticated
  using (auth.uid() = user_id or public.match_kickoff_passed(match_id) or public.has_role(auth.uid(),'admin'));
create policy "users insert own pick before kickoff"
  on public.match_picks for insert to authenticated
  with check (auth.uid() = user_id and not public.match_kickoff_passed(match_id));
create policy "users update own pick before kickoff"
  on public.match_picks for update to authenticated
  using (auth.uid() = user_id and not public.match_kickoff_passed(match_id))
  with check (auth.uid() = user_id and not public.match_kickoff_passed(match_id));
create policy "users delete own pick before kickoff"
  on public.match_picks for delete to authenticated
  using (auth.uid() = user_id and not public.match_kickoff_passed(match_id));

-- Enforce max 2 jokers per user
create or replace function public.enforce_joker_limit()
returns trigger language plpgsql as $$
declare jc int;
begin
  if new.joker then
    select count(*) into jc from public.match_picks
      where user_id = new.user_id and joker = true
      and (tg_op = 'INSERT' or match_id <> new.match_id);
    if jc >= 2 then
      raise exception 'Du har redan satt 2 jokrar';
    end if;
  end if;
  return new;
end $$;

create trigger trg_joker_limit
  before insert or update on public.match_picks
  for each row execute function public.enforce_joker_limit();

-- ============ SCORING ============
create or replace function public.compute_match_points(
  p_home int, p_away int, a_home int, a_away int, p_stage match_stage
) returns int language plpgsql immutable as $$
declare correct_outcome boolean; correct_diff boolean; exact boolean;
begin
  if p_home is null or p_away is null or a_home is null or a_away is null then return 0; end if;
  exact := (p_home = a_home and p_away = a_away);
  correct_diff := ((p_home - p_away) = (a_home - a_away));
  correct_outcome := (sign(p_home - p_away) = sign(a_home - a_away));

  if p_stage = 'group' then
    if exact then return 4;
    elsif correct_diff then return 2;
    elsif correct_outcome then return 1;
    else return 0; end if;
  elsif p_stage = 'r16' then
    if exact then return 5; elsif correct_outcome then return 2; else return 0; end if;
  elsif p_stage = 'qf' then
    if exact then return 6; elsif correct_outcome then return 3; else return 0; end if;
  elsif p_stage in ('sf','third') then
    if exact then return 8; elsif correct_outcome then return 4; else return 0; end if;
  elsif p_stage = 'final' then
    if exact then return 12; elsif correct_outcome then return 5; else return 0; end if;
  end if;
  return 0;
end $$;

-- View: per-pick points
create or replace view public.pick_points as
select
  mp.user_id, mp.match_id, m.stage, m.kickoff, m.finished, mp.joker,
  case when m.finished then
    public.compute_match_points(mp.home_score, mp.away_score, m.home_score, m.away_score, m.stage)
    * (case when mp.joker then 2 else 1 end)
  else 0 end as points,
  case when m.finished then
    case when mp.home_score = m.home_score and mp.away_score = m.away_score then 'exact'
         when sign(mp.home_score - mp.away_score) = sign(m.home_score - m.away_score) then 'outcome'
         else 'miss' end
  else null end as result_class
from public.match_picks mp
join public.matches m on m.id = mp.match_id;

-- Long-term points per user
create or replace function public.longterm_points(_user_id uuid)
returns int language sql stable as $$
  with ltp as (select * from public.long_term_picks where user_id = _user_id),
       ts as (select * from public.tournament_settings where id = 1)
  select coalesce((
    select
      (case when ltp.champion = ts.actual_champion then 10 else 0 end) +
      (case when ltp.runner_up = ts.actual_runner_up then 5 else 0 end) +
      (case when ltp.semi1 in (ts.actual_semi1, ts.actual_semi2) then 3 else 0 end) +
      (case when ltp.semi2 in (ts.actual_semi1, ts.actual_semi2) and ltp.semi2 <> ltp.semi1 then 3 else 0 end) +
      (case when ltp.top_scorer = ts.actual_top_scorer then 5 else 0 end)
    from ltp, ts
  ), 0)
$$;

-- Leaderboard view
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  coalesce((select sum(points) from public.pick_points pp where pp.user_id = p.id), 0)::int as match_points,
  public.longterm_points(p.id) as longterm_points,
  (coalesce((select sum(points) from public.pick_points pp where pp.user_id = p.id), 0)
    + public.longterm_points(p.id))::int as total_points
from public.profiles p;

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ SEED MATCH SLOTS (104 matches) ============
-- Group stage: 72 matches over June 11 - June 27, 2026 (6 per day approx, simplified)
-- Knockout: R16 (16), QF (8), SF (4 incl third), Final (1) = need 16+8+2+1+1 = 28; total 100
-- We seed 104 placeholder slots with rough dates; admin can edit.
do $$
declare i int; d date := date '2026-06-11'; mn int := 0;
begin
  -- 72 group matches across 13 days (~5-6/day)
  for i in 1..72 loop
    mn := mn + 1;
    insert into public.matches(match_number, stage, kickoff)
      values (mn, 'group', (d + ((mn-1)/6) * interval '1 day') + interval '18 hours');
  end loop;
  -- 16 Round of 16 (June 28 - July 3)
  for i in 1..16 loop
    mn := mn + 1;
    insert into public.matches(match_number, stage, kickoff)
      values (mn, 'r16', (date '2026-06-28' + ((i-1)/4) * interval '1 day') + interval '20 hours');
  end loop;
  -- 8 QF (July 4-7)
  for i in 1..8 loop
    mn := mn + 1;
    insert into public.matches(match_number, stage, kickoff)
      values (mn, 'qf', (date '2026-07-04' + ((i-1)/2) * interval '1 day') + interval '20 hours');
  end loop;
  -- 2 SF (July 14-15)
  for i in 1..2 loop
    mn := mn + 1;
    insert into public.matches(match_number, stage, kickoff)
      values (mn, 'sf', (date '2026-07-14' + (i-1) * interval '1 day') + interval '20 hours');
  end loop;
  -- 3rd place (July 18)
  mn := mn + 1;
  insert into public.matches(match_number, stage, kickoff)
    values (mn, 'third', timestamptz '2026-07-18 18:00+00');
  -- Final (July 19)
  mn := mn + 1;
  insert into public.matches(match_number, stage, kickoff)
    values (mn, 'final', timestamptz '2026-07-19 19:00+00');
end $$;


alter view public.pick_points set (security_invoker = true);
alter view public.leaderboard set (security_invoker = true);

alter function public.tournament_started() set search_path = public;
alter function public.match_kickoff_passed(uuid) set search_path = public;
alter function public.enforce_joker_limit() set search_path = public;
alter function public.compute_match_points(int,int,int,int,match_stage) set search_path = public;
alter function public.longterm_points(uuid) set search_path = public;

-- Actual group standings set by admin after group stage ends
CREATE TABLE public.group_actuals (
  group_letter TEXT NOT NULL,
  position SMALLINT NOT NULL CHECK (position IN (1, 2, 3)),
  team_name TEXT NOT NULL,
  advances_as_third BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (group_letter, position)
);

ALTER TABLE public.group_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_actuals readable by authenticated"
  ON public.group_actuals FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins can manage group_actuals"
  ON public.group_actuals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Score r16_picks against group_actuals
-- 2p per team that actually advanced (pos 1 or 2 pick lands in actual top 2)
-- +1p bonus if group winner correctly picked
-- +1p bonus if 3rd-place pick is one of the 8 advancing best-3rds
CREATE OR REPLACE FUNCTION public.r16_points(_user_id UUID)
RETURNS INT LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(
    CASE WHEN pick.position IN (1,2) AND actual.position IN (1,2) THEN 2 ELSE 0 END
    + CASE WHEN pick.position = 1 AND actual.position = 1 THEN 1 ELSE 0 END
    + CASE WHEN pick.position = 3 AND actual.position = 3 AND actual.advances_as_third THEN 1 ELSE 0 END
  ), 0)::INT
  FROM r16_picks pick
  JOIN group_actuals actual
    ON actual.group_letter = pick.group_letter
    AND actual.team_name = pick.team_name
  WHERE pick.user_id = _user_id
$$;

-- Rebuild leaderboard view to include r16_points
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id AS user_id,
  p.display_name,
  COALESCE((SELECT SUM(points) FROM pick_points pp WHERE pp.user_id = p.id), 0)::INT AS match_points,
  public.longterm_points(p.id) AS longterm_points,
  public.r16_points(p.id) AS r16_points,
  (COALESCE((SELECT SUM(points) FROM pick_points pp WHERE pp.user_id = p.id), 0)
    + public.longterm_points(p.id)
    + public.r16_points(p.id))::INT AS total_points
FROM public.profiles p;

ALTER VIEW public.leaderboard SET (security_invoker = true);

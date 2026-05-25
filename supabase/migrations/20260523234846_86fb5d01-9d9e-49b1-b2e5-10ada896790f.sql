-- 1. Update compute_match_points: remove goal difference scoring
CREATE OR REPLACE FUNCTION public.compute_match_points(
  p_home int, p_away int, a_home int, a_away int, p_stage match_stage
) RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE correct_outcome boolean; exact boolean;
BEGIN
  IF p_home IS NULL OR p_away IS NULL OR a_home IS NULL OR a_away IS NULL THEN RETURN 0; END IF;
  exact := (p_home = a_home AND p_away = a_away);
  correct_outcome := (sign(p_home - p_away) = sign(a_home - a_away));

  IF p_stage = 'group' THEN
    IF exact THEN RETURN 4;
    ELSIF correct_outcome THEN RETURN 1;
    ELSE RETURN 0; END IF;
  ELSIF p_stage = 'r16' THEN
    IF exact THEN RETURN 5; ELSIF correct_outcome THEN RETURN 2; ELSE RETURN 0; END IF;
  ELSIF p_stage = 'qf' THEN
    IF exact THEN RETURN 6; ELSIF correct_outcome THEN RETURN 3; ELSE RETURN 0; END IF;
  ELSIF p_stage IN ('sf','third') THEN
    IF exact THEN RETURN 8; ELSIF correct_outcome THEN RETURN 4; ELSE RETURN 0; END IF;
  ELSIF p_stage = 'final' THEN
    IF exact THEN RETURN 12; ELSIF correct_outcome THEN RETURN 5; ELSE RETURN 0; END IF;
  END IF;
  RETURN 0;
END $$;

-- 2. Update joker limit from 2 to 3, and restrict to group stage only
CREATE OR REPLACE FUNCTION public.enforce_joker_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE jc int; match_stage_val match_stage;
BEGIN
  -- Only allow jokers on group stage matches
  IF new.joker THEN
    SELECT stage INTO match_stage_val FROM public.matches WHERE id = new.match_id;
    IF match_stage_val IS DISTINCT FROM 'group' THEN
      RAISE EXCEPTION 'Jokrar får endast användas på gruppspelsmatcher';
    END IF;

    SELECT count(*) INTO jc FROM public.match_picks
      WHERE user_id = new.user_id AND joker = true
      AND (tg_op = 'INSERT' OR match_id <> new.match_id);
    IF jc >= 3 THEN
      RAISE EXCEPTION 'Du har redan satt 3 jokrar';
    END IF;
  END IF;
  RETURN new;
END $$;

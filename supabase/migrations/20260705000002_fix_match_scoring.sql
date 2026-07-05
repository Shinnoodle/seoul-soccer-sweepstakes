-- Add r8 to match_stage enum if not already present (was added via dashboard)
ALTER TYPE match_stage ADD VALUE IF NOT EXISTS 'r8';

-- Fix compute_match_points to match the rules:
--   group / r16: exact=4p, correct=2p
--   r8 (Åttondelsfinal): exact=6p, correct=3p
--   qf (Kvartsfinal): exact=8p, correct=4p
--   sf / third: exact=10p, correct=5p
--   final: exact=12p, correct=6p
CREATE OR REPLACE FUNCTION public.compute_match_points(p_home integer, p_away integer, a_home integer, a_away integer, p_stage match_stage)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE correct_outcome boolean; exact boolean;
BEGIN
  IF p_home IS NULL OR p_away IS NULL OR a_home IS NULL OR a_away IS NULL THEN RETURN 0; END IF;
  exact := (p_home = a_home AND p_away = a_away);
  correct_outcome := (sign(p_home - p_away) = sign(a_home - a_away));

  IF p_stage IN ('group', 'r16') THEN
    IF exact THEN RETURN 4; ELSIF correct_outcome THEN RETURN 2; ELSE RETURN 0; END IF;
  ELSIF p_stage = 'r8' THEN
    IF exact THEN RETURN 6; ELSIF correct_outcome THEN RETURN 3; ELSE RETURN 0; END IF;
  ELSIF p_stage = 'qf' THEN
    IF exact THEN RETURN 8; ELSIF correct_outcome THEN RETURN 4; ELSE RETURN 0; END IF;
  ELSIF p_stage IN ('sf', 'third') THEN
    IF exact THEN RETURN 10; ELSIF correct_outcome THEN RETURN 5; ELSE RETURN 0; END IF;
  ELSIF p_stage = 'final' THEN
    IF exact THEN RETURN 12; ELSIF correct_outcome THEN RETURN 6; ELSE RETURN 0; END IF;
  END IF;
  RETURN 0;
END $function$;

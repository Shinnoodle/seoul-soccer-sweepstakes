-- Remove admin exception from long_term_picks visibility — tips should be hidden for everyone until tournament starts
DROP POLICY IF EXISTS "users see own longterm always" ON public.long_term_picks;

CREATE POLICY "users see own longterm always"
  ON public.long_term_picks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.tournament_started());

CREATE TABLE public.r16_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_letter TEXT NOT NULL,
  team_name TEXT NOT NULL,
  position SMALLINT NOT NULL CHECK (position IN (1,2)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_letter, position)
);

ALTER TABLE public.r16_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own r16 or after start"
  ON public.r16_picks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR tournament_started() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users insert own r16 before start"
  ON public.r16_picks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT tournament_started());

CREATE POLICY "users update own r16 before start"
  ON public.r16_picks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND NOT tournament_started())
  WITH CHECK (auth.uid() = user_id AND NOT tournament_started());

CREATE POLICY "users delete own r16 before start"
  ON public.r16_picks FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND NOT tournament_started());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER update_r16_picks_updated_at
  BEFORE UPDATE ON public.r16_picks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
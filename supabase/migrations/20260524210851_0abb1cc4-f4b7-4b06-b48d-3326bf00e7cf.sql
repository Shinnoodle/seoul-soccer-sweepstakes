ALTER TABLE public.r16_picks DROP CONSTRAINT r16_picks_position_check;
ALTER TABLE public.r16_picks ADD CONSTRAINT r16_picks_position_check CHECK (position IN (1,2,3));
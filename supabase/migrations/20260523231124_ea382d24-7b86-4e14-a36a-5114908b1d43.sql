
-- 1. Add approved column
ALTER TABLE public.profiles ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- 2. Approve all existing users + all admins
UPDATE public.profiles SET approved = true;

-- 3. Admin can update approved status (extend existing update policy)
DROP POLICY IF EXISTS "admins can update any profile" ON public.profiles;
CREATE POLICY "admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Helper: is current user approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT approved FROM public.profiles WHERE id = _user_id), false)
$$;

-- 5. Tighten chat insert: must be approved
DROP POLICY IF EXISTS "users insert own messages" ON public.chat_messages;
CREATE POLICY "approved users insert own messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

-- 6. Recreate leaderboard view filtering only approved users (plus self)
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker=on) AS
SELECT
  p.id AS user_id,
  p.display_name,
  public.longterm_points(p.id) AS longterm_points,
  COALESCE((SELECT SUM(points) FROM public.pick_points pp WHERE pp.user_id = p.id), 0)::int AS match_points,
  (public.longterm_points(p.id) + COALESCE((SELECT SUM(points) FROM public.pick_points pp WHERE pp.user_id = p.id), 0))::int AS total_points
FROM public.profiles p
WHERE p.approved = true OR p.id = auth.uid() OR public.has_role(auth.uid(), 'admin');

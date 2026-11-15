-- Each DA member can have their own panel login. Only the owner may set or clear that link.
ALTER TABLE public.board_members
  ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.guard_board_member_login()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER board_members_guard_login
  BEFORE INSERT OR UPDATE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_board_member_login();

-- Visitors do not receive the login link. Admins still read the full row.
REVOKE SELECT ON public.board_members FROM anon;
GRANT SELECT (id, name, role, photo_url, sector, instagram, sort_order, active, created_at, updated_at)
  ON public.board_members TO anon;

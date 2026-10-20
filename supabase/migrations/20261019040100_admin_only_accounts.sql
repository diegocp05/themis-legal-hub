-- Accounts are created only by the owner through the admin-users Edge Function; no self sign-up or self-promotion.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.claim_first_admin();
DROP FUNCTION IF EXISTS public.admin_exists();
DROP FUNCTION IF EXISTS public.set_board_member(text, boolean);
DROP FUNCTION IF EXISTS public.my_registrations();
DELETE FROM public.user_roles WHERE role = 'aluno';

DROP FUNCTION IF EXISTS public.list_board();
CREATE FUNCTION public.list_board()
RETURNS TABLE (user_id uuid, email text, since timestamptz, is_owner boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT r.user_id, u.email::text, r.created_at,
           EXISTS (SELECT 1 FROM public.user_roles o WHERE o.user_id = r.user_id AND o.role = 'owner')
    FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
    WHERE r.role = 'admin'
    ORDER BY 4 DESC, r.created_at;
END; $$;

REVOKE EXECUTE ON FUNCTION public.list_board() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_board() TO authenticated;

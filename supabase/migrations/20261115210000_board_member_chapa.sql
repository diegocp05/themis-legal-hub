-- Marks who belongs to the elected slate. Existing members stay on it.
ALTER TABLE public.board_members
  ADD COLUMN in_chapa boolean NOT NULL DEFAULT true;

GRANT SELECT (in_chapa) ON public.board_members TO anon;

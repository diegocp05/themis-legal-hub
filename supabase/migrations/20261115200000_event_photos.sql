-- Photos taken during an event. Students can see them once the event is published.
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_photos_event_idx ON public.event_photos (event_id, created_at);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published event photos" ON public.event_photos
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.published
  ));

CREATE POLICY "Admins read event photos" ON public.event_photos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins add event photos" ON public.event_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete event photos" ON public.event_photos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.event_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.event_photos TO authenticated;
GRANT ALL ON public.event_photos TO service_role;

CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  email text;
  act text;
  area text;
  entity uuid;
  summary text;
  label text;
  event_title text;
  fresh jsonb;
  previous jsonb;
BEGIN
  IF uid IS NULL OR auth.role() = 'service_role' OR auth.role() = 'anon' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  fresh := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  previous := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  IF TG_OP = 'UPDATE' AND (fresh - 'updated_at' - 'sort_order') = (previous - 'updated_at' - 'sort_order') THEN
    RETURN NEW;
  END IF;

  SELECT u.email::text INTO email FROM auth.users u WHERE u.id = uid;
  entity := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  act := CASE TG_OP WHEN 'INSERT' THEN 'criou' WHEN 'DELETE' THEN 'excluiu' ELSE 'editou' END;

  IF TG_TABLE_NAME = 'events' THEN
    area := 'evento'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    summary := act || ' o evento ' || label;
  ELSIF TG_TABLE_NAME = 'products' THEN
    area := 'produto'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    summary := act || ' o produto ' || label;
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    area := 'aviso'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    summary := act || ' o aviso ' || label;
  ELSIF TG_TABLE_NAME = 'board_members' THEN
    area := 'membro'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id
       AND (fresh - 'updated_at' - 'sort_order' - 'user_id') = (previous - 'updated_at' - 'sort_order' - 'user_id') THEN
      summary := CASE WHEN NEW.user_id IS NULL THEN 'removeu o acesso de ' ELSE 'vinculou um acesso a ' END || label;
    ELSE
      summary := act || ' o membro ' || label;
    END IF;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    area := 'pedido'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.code ELSE NEW.code END;
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      summary := 'alterou o pedido ' || label || ' para ' || public.order_status_label(NEW.status);
    ELSE
      summary := act || ' o pedido ' || label;
    END IF;
  ELSIF TG_TABLE_NAME = 'registrations' THEN
    area := 'inscricao';
    SELECT e.title INTO event_title FROM public.events e
      WHERE e.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
    label := CASE WHEN TG_OP = 'DELETE' THEN OLD.full_name ELSE NEW.full_name END;
    IF TG_OP = 'UPDATE' AND NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at THEN
      summary := CASE WHEN NEW.checked_in_at IS NULL THEN 'removeu a presença de ' ELSE 'marcou a presença de ' END
        || label || COALESCE(' em ' || event_title, '');
    ELSIF TG_OP = 'DELETE' THEN
      summary := 'removeu a inscrição de ' || label || COALESCE(' em ' || event_title, '');
    ELSE
      summary := act || ' a inscrição de ' || label || COALESCE(' em ' || event_title, '');
    END IF;
  ELSIF TG_TABLE_NAME = 'event_photos' THEN
    area := 'evento';
    SELECT e.title INTO event_title FROM public.events e
      WHERE e.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
    act := CASE WHEN TG_OP = 'DELETE' THEN 'excluiu' ELSE 'criou' END;
    summary := CASE WHEN TG_OP = 'DELETE' THEN 'removeu uma foto do evento ' ELSE 'adicionou uma foto ao evento ' END
      || COALESCE(event_title, '');
  ELSE
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  INSERT INTO public.activity_log (actor_id, actor_email, action, area, entity_id, summary)
  VALUES (uid, email, act, area, entity, left(summary, 300));

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER event_photos_audit AFTER INSERT OR DELETE ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

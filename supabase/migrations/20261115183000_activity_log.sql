-- Who changed what in the admin panel. Written by triggers, read by admins.
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL CHECK (action IN ('criou', 'editou', 'excluiu')),
  area text NOT NULL CHECK (area IN ('evento', 'produto', 'aviso', 'pedido', 'membro', 'acesso', 'inscricao')),
  entity_id uuid,
  summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 300)
);
CREATE INDEX activity_log_created_at_idx ON public.activity_log (created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read the activity log" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

CREATE OR REPLACE FUNCTION public.order_status_label(status public.order_status)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE status
    WHEN 'aguardando_pagamento' THEN 'Aguardando pagamento'
    WHEN 'pago' THEN 'Pago'
    WHEN 'em_producao' THEN 'Em produção'
    WHEN 'aguardando_retirada' THEN 'Aguardando retirada'
    WHEN 'entregue' THEN 'Entregue'
    WHEN 'cancelado' THEN 'Cancelado'
  END;
$$;

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
  ELSE
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  INSERT INTO public.activity_log (actor_id, actor_email, action, area, entity_id, summary)
  VALUES (uid, email, act, area, entity, left(summary, 300));

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_admin_change() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.audit_admin_change() TO authenticated;
REVOKE ALL ON FUNCTION public.order_status_label(public.order_status) FROM public, anon, authenticated;

CREATE TRIGGER events_audit AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER announcements_audit AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER board_members_audit AFTER INSERT OR UPDATE OR DELETE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER registrations_audit AFTER INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

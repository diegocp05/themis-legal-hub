import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const orderStatusLabel: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando Pagamento",
  pago: "Pago",
  em_producao: "Em Produção",
  aguardando_retirada: "Aguardando Retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const orderStatusBadge: Record<OrderStatus, string> = {
  aguardando_pagamento: "bg-muted text-muted-foreground",
  pago: "bg-navy-soft text-primary",
  em_producao: "bg-navy-soft text-primary",
  aguardando_retirada: "bg-gold/20 text-gold",
  entregue: "bg-success-soft text-success",
  cancelado: "bg-destructive/10 text-destructive",
};

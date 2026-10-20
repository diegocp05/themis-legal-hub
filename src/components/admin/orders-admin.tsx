import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Constants } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/catalog";
import { formatDateTime } from "@/lib/data";
import { type OrderStatus, orderStatusBadge, orderStatusLabel } from "@/lib/orders";
import { Panel } from "./form";

const statuses = Constants.public.Enums.order_status;

export function OrdersAdmin() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const visible = orders.filter((o) => filter === "todos" || o.status === filter);
  const setStatus = async (id: string, status: OrderStatus) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  return <Panel title="Pedidos" subtitle="Acompanhe a produção e dê baixa nas retiradas presenciais.">
    <p className="mx-5 mt-4 rounded-lg border border-gold/40 bg-background p-3 text-xs font-semibold text-muted-foreground">A loja online ainda não registra pedidos. Esta lista já está ligada ao banco e passa a ser preenchida quando as vendas forem ativadas.</p>
    <div className="-mx-1 flex gap-2 overflow-x-auto px-6 py-4">
      {(["todos", ...statuses] as const).map((s) => <button key={s} onClick={() => setFilter(s)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>{s === "todos" ? "Todos" : orderStatusLabel[s]}</button>)}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Pedido</th><th className="px-5 py-3">Aluno</th><th className="px-5 py-3">Itens</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th></tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={5} className="px-5 py-8"><div className="h-8 animate-pulse rounded bg-muted" /></td></tr>}
          {visible.map((o) => <tr key={o.id} className="border-t border-border">
            <td className="px-5 py-4 font-bold">{o.code}<p className="text-xs font-normal text-muted-foreground">{formatDateTime(o.created_at)}</p></td>
            <td className="px-5 py-4 font-semibold">{o.full_name}<p className="text-xs font-normal text-muted-foreground">{o.email}</p></td>
            <td className="px-5 py-4 text-muted-foreground">{o.order_items.map((it) => `${it.quantity}× ${it.product_name}${it.size ? ` · ${it.size}` : ""}`).join(", ")}</td>
            <td className="px-5 py-4 font-bold">{money(Number(o.total))}</td>
            <td className="px-5 py-4">
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)} className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-ring ${orderStatusBadge[o.status]}`}>
                {statuses.map((s) => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}
              </select>
            </td>
          </tr>)}
          {!isLoading && visible.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Nenhum pedido{filter === "todos" ? "" : " com este status"}.</td></tr>}
        </tbody>
      </table>
    </div>
  </Panel>;
}

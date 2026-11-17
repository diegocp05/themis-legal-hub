import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Constants } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/catalog";
import { formatDateTime } from "@/lib/data";
import { type OrderStatus, orderStatusBadge, orderStatusLabel } from "@/lib/orders";
import { Panel } from "./form";

// Remove "em_producao" dos filtros e do seletor, mantendo apenas os status úteis para o DA
const statuses = Constants.public.Enums.order_status.filter((s) => s !== "em_producao");

export function OrdersAdmin() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>(statuses[0] ?? "pago");
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const visible = orders.filter((o) => filter === "todos" || o.status === filter);
  const visibleIds = visible.map((o) => o.id);
  const allVisibleSelected = visible.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleOne = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelected((cur) => cur.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelected((cur) => Array.from(new Set([...cur, ...visibleIds])));
    }
  };

  const setStatus = async (id: string, status: OrderStatus) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const applyBulkStatus = async () => {
    if (!selected.length || bulkBusy) return;
    setBulkBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: bulkStatus })
      .in("id", selected);
    setBulkBusy(false);
    if (!error) {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    }
  };

  return (
    <Panel title="Pedidos" subtitle="Acompanhe os pedidos realizados e dê baixa nas retiradas presenciais.">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-6 py-4">
        {(["todos", ...statuses] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              setSelected([]);
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
              filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
            }`}
          >
            {s === "todos" ? "Todos" : orderStatusLabel[s]}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-muted/80 p-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare size={16} className="text-gold" />
            <span>
              {selected.length} pedido{selected.length === 1 ? "" : "s"} selecionado{selected.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
              aria-label="Novo status para pedidos selecionados"
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  Mudar para: {orderStatusLabel[s]}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={applyBulkStatus} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : "Aplicar em lote"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])} aria-label="Limpar seleção">
              <X size={15} />
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  disabled={visible.length === 0}
                  aria-label="Selecionar todos os pedidos visíveis"
                  className="size-4 accent-gold"
                />
              </th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-5 py-8">
                  <div className="h-8 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            )}
            {visible.map((o) => {
              const isChecked = selected.includes(o.id);
              return (
                <tr key={o.id} className={`border-t border-border transition-colors ${isChecked ? "bg-muted/50" : ""}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(o.id)}
                      aria-label={`Selecionar pedido ${o.code}`}
                      className="size-4 accent-gold"
                    />
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {o.code}
                    <p className="text-xs font-normal text-muted-foreground">{formatDateTime(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {o.full_name}
                    <p className="text-xs font-normal text-muted-foreground">{o.email}</p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {o.order_items.map((it) => `${it.quantity}× ${it.product_name}${it.size ? ` · ${it.size}` : ""}`).join(", ")}
                  </td>
                  <td className="px-4 py-4 font-bold">{money(Number(o.total))}</td>
                  <td className="px-4 py-4">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-ring ${orderStatusBadge[o.status]}`}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {orderStatusLabel[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!isLoading && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                  Nenhum pedido{filter === "todos" ? "" : " com este status"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
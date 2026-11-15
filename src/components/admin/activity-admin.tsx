import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/data";
import { Panel } from "./form";

const areas = [
  { id: "todas", label: "Tudo" },
  { id: "evento", label: "Eventos" },
  { id: "inscricao", label: "Inscrições" },
  { id: "produto", label: "Produtos" },
  { id: "aviso", label: "Avisos" },
  { id: "pedido", label: "Pedidos" },
  { id: "membro", label: "Membros" },
  { id: "acesso", label: "Acessos" },
  { id: "pagina", label: "Páginas" },
] as const;

export function ActivityAdmin() {
  const [area, setArea] = useState<(typeof areas)[number]["id"]>("todas");
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("id, created_at, actor_email, summary, area").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const visible = area === "todas" ? entries : entries.filter((entry) => entry.area === area);

  return <Panel title="Histórico" subtitle="Quem criou, editou ou excluiu alguma coisa no painel.">
    <div className="flex gap-2 overflow-x-auto border-b border-border p-4">
      {areas.map((item) => <button key={item.id} type="button" onClick={() => setArea(item.id)} className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold ${area === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item.label}</button>)}
    </div>
    <ul className="divide-y divide-border">
      {isLoading && <li className="p-6"><div className="h-10 animate-pulse rounded-lg bg-muted" /></li>}
      {visible.map((entry) => <li key={entry.id} className="px-5 py-4">
        <p className="text-sm font-bold">{entry.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">{entry.actor_email ?? "Conta removida"} · {formatDateTime(entry.created_at)}</p>
      </li>)}
      {!isLoading && visible.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</li>}
    </ul>
  </Panel>;
}

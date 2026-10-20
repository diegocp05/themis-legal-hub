import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/catalog";
import { type ProductRow, productStatusLabel } from "@/lib/data";

export function ProductCard({ product }: { product: Pick<ProductRow, "id" | "name" | "price" | "image_url" | "sizes" | "status"> }) {
  const available = product.status === "disponivel";
  return <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="relative">
      {product.image_url
        ? <img src={product.image_url} alt={product.name} loading="lazy" width={912} height={912} className={`aspect-square w-full object-cover grayscale ${available ? "" : "opacity-60"}`} />
        : <div className="grid aspect-square w-full place-items-center bg-muted text-muted-foreground"><Package size={40} /></div>}
      {!available && <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase ${product.status === "esgotado" ? "bg-primary text-primary-foreground" : "bg-gold text-gold-foreground"}`}>{productStatusLabel[product.status]}</span>}
    </div>
    <div className="p-4"><h3 className="text-base font-bold">{product.name}</h3><p className="mt-1 text-lg font-extrabold text-primary">{money(Number(product.price))}</p>
      {product.sizes.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tamanhos disponíveis">{product.sizes.map((size) => <span key={size} className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-bold">{size}</span>)}</div>}
      {available
        ? <Button asChild variant="gold" className="mt-4 h-11 w-full"><Link to="/checkout" search={{ item: product.id }}>Garantir no Lote Atual</Link></Button>
        : <Button variant="outline" className="mt-4 h-11 w-full" disabled>{product.status === "esgotado" ? "Esgotado" : "Disponível em breve"}</Button>}
    </div>
  </article>;
}

export function ProductCardSkeleton() {
  return <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"><div className="aspect-square w-full animate-pulse bg-muted" /><div className="space-y-3 p-4"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-5 w-1/3 animate-pulse rounded bg-muted" /><div className="h-11 animate-pulse rounded-lg bg-muted" /></div></div>;
}

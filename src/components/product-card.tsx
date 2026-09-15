import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/catalog";

export function ProductCard({ product }: { product: { id: string; name: string; price: number; image: string; sizes: string[] } }) {
  return <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <img src={product.image} alt={product.name} loading="lazy" width={912} height={912} className="aspect-square w-full object-cover" />
    <div className="p-4"><h3 className="text-base font-bold">{product.name}</h3><p className="mt-1 text-lg font-extrabold text-primary">{money(product.price)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tamanhos disponíveis">{product.sizes.map((size) => <span key={size} className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-bold">{size}</span>)}</div>
      <Button asChild variant="gold" className="mt-4 h-11 w-full"><Link to="/checkout" search={{ item: product.id }}>Garantir no Lote Atual</Link></Button>
    </div>
  </article>;
}
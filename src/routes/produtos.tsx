import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalog";

export const Route = createFileRoute("/produtos")({ head: () => ({ meta: [
  { title: "Produtos sob encomenda — Sistema Themis" }, { name: "description", content: "Produtos oficiais do Diretório Acadêmico de Direito." },
  { property: "og:title", content: "Produtos sob encomenda — Sistema Themis" }, { property: "og:description", content: "Garanta produtos oficiais no lote atual." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ProductsPage });

function ProductsPage() { return <div className="app-container py-8 sm:py-12"><p className="text-sm font-bold uppercase text-gold">Loja oficial</p><h1 className="mt-1 text-3xl font-bold">Produtos sob encomenda</h1><p className="mt-3 max-w-2xl text-muted-foreground">Escolha seu modelo e tamanho. Produzimos cada lote após o encerramento das encomendas.</p>
  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
  <aside className="mt-8 space-y-3 rounded-lg border border-gold/40 bg-card p-4 text-sm">
    <div><strong>Como funciona?</strong><p className="mt-1 text-muted-foreground">O lote atual encerra em 30 de setembro. Você acompanha toda a produção pela Área do Aluno.</p></div>
    <div><strong>Sem trocas ou devoluções</strong><p className="mt-1 text-muted-foreground">Os produtos são confeccionados sob encomenda (tamanhos PP ao GG). Confira a grade de tamanhos antes de finalizar — não há devolução por erro de escolha.</p></div>
    <div><strong>Entrega presencial</strong><p className="mt-1 text-muted-foreground">A retirada acontece exclusivamente na sede do DA, mediante apresentação do status do pedido e de um documento com foto.</p></div>
  </aside>
</div>; }

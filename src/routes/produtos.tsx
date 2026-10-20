import { createFileRoute } from "@tanstack/react-router";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { useActiveProducts } from "@/lib/data";

export const Route = createFileRoute("/produtos")({ head: () => ({ meta: [
  { title: "Produtos sob encomenda — Sistema Themis" }, { name: "description", content: "Produtos oficiais do Diretório Acadêmico de Direito." },
  { property: "og:title", content: "Produtos sob encomenda — Sistema Themis" }, { property: "og:description", content: "Garanta produtos oficiais no lote atual." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ProductsPage });

function ProductsPage() {
  const { data: products, isLoading } = useActiveProducts();
  return <div className="app-container py-8 sm:py-12"><p className="text-sm font-bold uppercase text-gold">Loja oficial</p><h1 className="mt-1 text-3xl font-bold">Produtos sob encomenda</h1><p className="mt-3 max-w-2xl text-muted-foreground">Escolha seu modelo e tamanho. Produzimos cada lote após o encerramento das encomendas.</p>
  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
    {isLoading && [0, 1, 2].map((i) => <ProductCardSkeleton key={i} />)}
    {products?.map((product) => <ProductCard key={product.id} product={product} />)}
  </div>
  {products?.length === 0 && <p className="mt-2 rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhum produto disponível no momento. Volte em breve!</p>}
  <aside className="mt-8 space-y-3 rounded-lg border border-gold/40 bg-card p-4 text-sm">
    <div><strong>Como funciona?</strong><p className="mt-1 text-muted-foreground">Cada lote é produzido após o encerramento das encomendas. Você acompanha toda a produção pela Área do Aluno.</p></div>
    <div><strong>Sem trocas ou devoluções</strong><p className="mt-1 text-muted-foreground">Os produtos são confeccionados sob encomenda. Confira a grade de tamanhos antes de finalizar — não há devolução por erro de escolha.</p></div>
    <div><strong>Entrega presencial</strong><p className="mt-1 text-muted-foreground">A retirada acontece exclusivamente na sede do DA, mediante apresentação do status do pedido e de um documento com foto.</p></div>
  </aside>
</div>; }

import camiseta from "@/assets/camiseta-themis.jpg";
import tirante from "@/assets/tirante-themis.jpg";
import copo from "@/assets/copo-themis.jpg";

export const products = [
  { id: "camiseta", name: "Camiseta Themis", price: 69.9, image: camiseta, sizes: ["P", "M", "G", "GG"] },
  { id: "tirante", name: "Tirante Institucional", price: 24.9, image: tirante, sizes: ["Único"] },
  { id: "copo", name: "Copo Térmico Themis", price: 49.9, image: copo, sizes: ["500 ml"] },
];

export const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
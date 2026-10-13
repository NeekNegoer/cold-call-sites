/// <reference types="vite/client" />
import type { ImageMetadata } from "astro";
import { indexarFotos, resolverImagens } from "./ficha/imagens.ts";
import { paginas } from "./ficha/paginas.ts";
import { modoAtual } from "./modo.ts";

// Só o Vite (dentro do build do Astro) resolve import.meta.glob: este arquivo nunca roda no node:test.
export function caminhosEstaticos() {
  const fichas = import.meta.glob("./fichas/*.json", { eager: true, import: "default" });
  const exemplos = import.meta.glob("./exemplos/*.json", { eager: true, import: "default" });
  const fotos = import.meta.glob<{ default: ImageMetadata }>(
    ["./fotos/*/*.{jpg,jpeg,png,webp}", "./exemplos/fotos/*/*.{jpg,jpeg,png,webp}"],
    { eager: true },
  );
  const indice = indexarFotos(fotos);
  return paginas(fichas, exemplos, modoAtual()).map(({ caminho, ficha }) => ({
    params: { previa: caminho },
    props: { ficha, imagens: resolverImagens(ficha, indice) },
  }));
}

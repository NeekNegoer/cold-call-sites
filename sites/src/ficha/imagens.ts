import type { Ficha, Foto, Profissional } from "./tipos.ts";

export interface FotoComImagem<T> extends Foto {
  imagem: T;
}
export interface ProfissionalComImagem<T> extends Profissional {
  imagem: T | null;
}
export interface Imagens<T> {
  fotos: FotoComImagem<T>[];
  profissionais: ProfissionalComImagem<T>[];
}

// Chave "<pasta>/<arquivo>", a partir do caminho que o import.meta.glob devolve.
export function indexarFotos<T>(modulos: Record<string, { default: T }>): Map<string, T> {
  return new Map(Object.entries(modulos).map(([caminho, m]) => [caminho.split("/").slice(-2).join("/"), m.default]));
}

export function resolverImagens<T>(ficha: Ficha, indice: ReadonlyMap<string, T>): Imagens<T> {
  const achar = (arquivo: string): T => {
    const imagem = indice.get(`${ficha.slug}/${arquivo}`);
    if (imagem === undefined) throw new Error(`${ficha.slug}: foto ${arquivo} não encontrada em sites/src/fotos/${ficha.slug}/`);
    return imagem;
  };
  return {
    fotos: ficha.fotos.map((f) => ({ ...f, imagem: achar(f.arquivo) })),
    profissionais: ficha.profissionais.map((p) => ({ ...p, imagem: p.foto ? achar(p.foto) : null })),
  };
}

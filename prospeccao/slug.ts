export function gerarSlug(nome: string, existentes: ReadonlySet<string>): string {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "lead";
  if (!existentes.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidato = `${base}-${i}`;
    if (!existentes.has(candidato)) return candidato;
  }
}

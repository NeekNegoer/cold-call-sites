import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function urlEmAltaResolucao(url: string): string {
  if (!url.includes("googleusercontent.com")) return url;
  const ultimaBarra = url.lastIndexOf("/");
  const igual = url.indexOf("=", ultimaBarra);
  return igual >= 0 ? `${url.slice(0, igual)}=w1200` : `${url}=w1200`;
}

export async function baixarFotos(
  urls: string[],
  destinoRelativo: string,
  raiz: string,
  f: typeof fetch = fetch,
): Promise<string[]> {
  mkdirSync(join(raiz, destinoRelativo), { recursive: true });
  const salvos: string[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const r = await f(urlEmAltaResolucao(url));
      const tipo = r.headers.get("content-type") ?? "";
      if (!r.ok || !tipo.startsWith("image/")) continue;
      const extensao = tipo.includes("png") ? "png" : tipo.includes("webp") ? "webp" : "jpg";
      const relativo = join(destinoRelativo, `${i + 1}.${extensao}`);
      writeFileSync(join(raiz, relativo), Buffer.from(await r.arrayBuffer()));
      salvos.push(relativo);
    } catch {
      // Foto indisponível: segue com as outras.
    }
  }
  return salvos;
}

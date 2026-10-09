import type { Classificacao } from "./tipos.ts";

const REDES = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linktr.ee",
  "linkme.bio",
  "beacons.ai",
  "bio.link",
  "wa.me",
  "api.whatsapp.com",
  "booksy.com",
  "trinks.com",
  "business.site",
  "appbarber.com.br",
  "cashbarber.com.br",
];

const CAMINHOS_INSTAGRAM_SEM_PERFIL = ["p", "reel", "reels", "explore", "stories", "accounts", "tv"];

export function classificarSite(
  site: string | null | undefined,
): { classificacao: Classificacao; instagram: string | null } {
  const bruto = site?.trim();
  if (!bruto) return { classificacao: "sem_site", instagram: null };
  let url: URL;
  try {
    url = new URL(bruto.includes("://") ? bruto : `https://${bruto}`);
  } catch {
    return { classificacao: "sem_site", instagram: null };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host) return { classificacao: "sem_site", instagram: null };
  const rede = REDES.find((d) => host === d || host.endsWith(`.${d}`));
  if (!rede) return { classificacao: "site_proprio", instagram: null };
  return { classificacao: "so_rede", instagram: rede === "instagram.com" ? extrairInstagram(url.pathname) : null };
}

function extrairInstagram(caminho: string): string | null {
  const primeiro = caminho.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!primeiro || CAMINHOS_INSTAGRAM_SEM_PERFIL.includes(primeiro)) return null;
  return `@${primeiro}`;
}

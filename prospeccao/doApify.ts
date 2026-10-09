import type { LeadBruto } from "./tipos.ts";
import { classificarSite } from "./classificar.ts";
import { ehCelular, linkWhatsApp } from "./telefone.ts";

type Bruto = Record<string, unknown>;

export const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function converterLugar(raw: unknown, nicho: string): LeadBruto | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Bruto;
  const placeId = texto(r.placeId);
  const nome = texto(r.title);
  if (!placeId || !nome) return null;
  const telefone = texto(r.phone) ?? texto(r.phoneUnformatted) ?? "";
  const telefoneParaTipo = texto(r.phoneUnformatted) ?? telefone;
  const site = texto(r.website);
  const { classificacao, instagram } = classificarSite(site);
  const nota = numero(r.totalScore);
  return {
    placeId,
    nome,
    nicho,
    termo: texto(r.searchString) ?? "",
    cidade: texto(r.city) ?? "",
    bairro: texto(r.neighborhood),
    endereco: texto(r.address) ?? "",
    telefone,
    celular: telefone ? ehCelular(telefoneParaTipo) : false,
    whatsapp: telefone ? linkWhatsApp(telefoneParaTipo) : null,
    instagram,
    site,
    classificacao,
    nota: nota && nota > 0 ? nota : null,
    avaliacoes: numero(r.reviewsCount) ?? 0,
    mapsUrl:
      texto(r.url) ??
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nome)}&query_place_id=${placeId}`,
    categoria: texto(r.categoryName),
    fechado: r.permanentlyClosed === true || r.temporarilyClosed === true,
  };
}

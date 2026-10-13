import { digitosNacionais } from "../../../prospeccao/telefone.ts";
import { DIAS, type Dia, type Horarios, type Intervalo } from "./tipos.ts";

export const NOMES_DIAS: Record<Dia, string> = {
  seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo",
};

export function formatarIntervalos(intervalos: Intervalo[] | null): string {
  if (intervalos === null) return "A confirmar";
  if (intervalos.length === 0) return "Fechado";
  if (intervalos.length === 1 && intervalos[0][0] === "00:00" && intervalos[0][1] === "24:00") return "24 horas";
  return intervalos.map(([a, b]) => `${a} – ${b}`).join(" · ");
}

export const linhasDeHorario = (h: Horarios) => DIAS.map((dia) => ({ dia, nome: NOMES_DIAS[dia], texto: formatarIntervalos(h[dia]) }));

export function rotuloDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

export const linkInstagram = (arroba: string) => `https://www.instagram.com/${arroba.replace(/^@/, "")}/`;

export function telefoneLegivel(telefone: string): string {
  if (telefone.replace(/\D/g, "").startsWith("0800")) return telefone;
  const d = digitosNacionais(telefone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

export function linkTelefone(telefone: string): string {
  const d = digitosNacionais(telefone);
  return d.length === 10 || d.length === 11 ? `tel:+55${d}` : `tel:${telefone.replace(/[^\d+]/g, "")}`;
}

export const formatarNota = (nota: number) => nota.toFixed(1).replace(".", ",");
export const rotuloAvaliacoes = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "avaliação" : "avaliações"}`;

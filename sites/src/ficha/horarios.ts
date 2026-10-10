import { DIAS, type Dia, type Horarios, type Intervalo } from "./tipos.ts";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const DIA_DO_GOOGLE: Record<string, Dia> = { seg: "seg", ter: "ter", qua: "qua", qui: "qui", sex: "sex", sab: "sab", dom: "dom" };
const PARTE = /^\s*(\d{1,2}:\d{2})\s*(?:to|às|as|-|–)\s*(\d{1,2}:\d{2})\s*$/i;

function normalizarHora(h: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 24 || mm > 59 || (hh === 24 && mm > 0)) return null;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

// O Google manda os dias em português e as horas em inglês ("09:00 to 20:00").
function converterDia(horas: string): Intervalo[] | null {
  const t = semAcento(horas);
  if (t === "fechado" || t === "closed") return [];
  if (t === "open 24 hours" || t === "aberto 24 horas") return [["00:00", "24:00"]];
  const intervalos: Intervalo[] = [];
  for (const parte of horas.split(",")) {
    const m = PARTE.exec(parte);
    if (!m) return null;
    const inicio = normalizarHora(m[1]);
    let fim = normalizarHora(m[2]);
    if (fim === "00:00") fim = "24:00";
    if (!inicio || !fim || fim <= inicio) return null;
    intervalos.push([inicio, fim]);
  }
  intervalos.sort((a, b) => a[0].localeCompare(b[0]));
  for (let i = 1; i < intervalos.length; i++) if (intervalos[i][0] < intervalos[i - 1][1]) return null;
  return intervalos;
}

export function converterHorarios(google: { dia: string; horas: string }[]): { horarios: Horarios; pendentes: string[] } | null {
  if (google.length === 0) return null;
  const horarios = Object.fromEntries(DIAS.map((d) => [d, null])) as Horarios;
  const pendentes: string[] = [];
  const vistos = new Set<Dia>();
  for (const { dia, horas } of google) {
    const d = DIA_DO_GOOGLE[semAcento(dia).slice(0, 3)];
    if (!d) continue;
    vistos.add(d);
    horarios[d] = converterDia(horas);
    if (!horarios[d]) pendentes.push(`${d}: horário não reconhecido ("${horas}")`);
  }
  for (const d of DIAS) if (!vistos.has(d)) pendentes.push(`${d}: sem horário no Google`);
  return { horarios, pendentes };
}

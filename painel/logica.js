export const STATUS = [
  { id: "novo", rotulo: "Novo" },
  { id: "sem_resposta", rotulo: "Sem resposta" },
  { id: "retornar", rotulo: "Retornar" },
  { id: "interessado", rotulo: "Interessado" },
  { id: "reuniao", rotulo: "Reunião" },
  { id: "fechou", rotulo: "Fechou" },
  { id: "perdeu", rotulo: "Perdeu" },
];
export const MOTIVOS = [
  { id: "preco", rotulo: "Preço" },
  { id: "sem_necessidade", rotulo: "Não vê necessidade" },
  { id: "ja_tem", rotulo: "Já tem sistema" },
  { id: "nao_decide", rotulo: "Não decide sozinho" },
  { id: "outro", rotulo: "Outro" },
];
export const PLANOS = [
  { id: "solo", rotulo: "Solo", profissionais: "1 profissional" },
  { id: "equipe", rotulo: "Equipe", profissionais: "2–5 profissionais" },
  { id: "casaCheia", rotulo: "Casa cheia", profissionais: "6+ profissionais" },
];
export const TABELA_PADRAO = { solo: 59, equipe: 89, casaCheia: 129 };

const NEGOCIACAO = ["interessado", "reuniao"];
const FINAIS = ["fechou", "perdeu"];
const PEDEM_PLANO = ["interessado", "reuniao", "fechou"];

export function hojeLocal(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(agora);
}

export function somarDias(dataISO, n) {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function visaoDe(lead, hoje) {
  if (lead.limpo || !lead.telefone) return "arquivados";
  if (lead.status === "fechou") return "fechados";
  if (lead.status === "perdeu") return "perdidos";
  if (NEGOCIACAO.includes(lead.status)) return "negociacao";
  if (lead.proximoContato && lead.proximoContato > hoje) return "depois";
  return "ligar";
}

export function filtrarLeads(leads, { visao, nicho, cidade }, hoje) {
  return leads.filter(
    (l) =>
      (visao === "todos" || visaoDe(l, hoje) === visao) &&
      (!nicho || l.nicho === nicho) &&
      (!cidade || l.cidade === cidade),
  );
}

function grupo(l, hoje) {
  if (FINAIS.includes(l.status) || l.limpo) return 3;
  if (l.proximoContato && l.proximoContato <= hoje) return 0;
  if (!l.proximoContato) return 1;
  return 2;
}

export function ordenarLeads(leads, hoje) {
  return [...leads].sort((a, b) => {
    const ga = grupo(a, hoje);
    const gb = grupo(b, hoje);
    if (ga !== gb) return ga - gb;
    if (ga === 0 || ga === 2) {
      return a.proximoContato.localeCompare(b.proximoContato) || (b.score ?? 0) - (a.score ?? 0);
    }
    if (ga === 1) return (b.score ?? 0) - (a.score ?? 0);
    return (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? "");
  });
}

export function contagens(leads, hoje) {
  const c = { ligar: 0, vencidos: 0, depois: 0, negociacao: 0, fechados: 0, perdidos: 0, arquivados: 0 };
  for (const l of leads) {
    const v = visaoDe(l, hoje);
    c[v]++;
    if (v !== "arquivados" && !FINAIS.includes(l.status) && l.proximoContato && l.proximoContato <= hoje) c.vencidos++;
  }
  return c;
}

export const precisaDeMotivo = (status) => status === "perdeu";
export const precisaDePlano = (status) => PEDEM_PLANO.includes(status);

// Monta o patch num único literal (sem acrescentar propriedades depois):
// o TypeScript 7 não infere propriedades adicionadas a objetos em arquivos .js.
export function mudarStatus(lead, novo, agoraISO, extras = {}) {
  if (!STATUS.some((s) => s.id === novo)) throw new Error(`Status desconhecido: ${novo}`);
  let motivoPerda = null;
  if (precisaDeMotivo(novo)) {
    if (!MOTIVOS.some((m) => m.id === extras.motivoPerda)) throw new Error("Escolha o motivo da perda.");
    motivoPerda = extras.motivoPerda;
  }
  let plano = null;
  let precoMensal = null;
  if (precisaDePlano(novo)) {
    plano = extras.plano ?? lead.plano;
    precoMensal = Number(extras.precoMensal ?? lead.precoMensal);
    if (!PLANOS.some((p) => p.id === plano) || !(precoMensal > 0)) throw new Error("Escolha o plano e o preço oferecidos.");
  }
  return {
    status: novo,
    historico: [...(lead.historico ?? []), { status: novo, em: agoraISO }],
    atualizadoEm: agoraISO,
    motivoPerda,
    ...(plano ? { plano, precoMensal } : {}),
    ...(novo === "perdeu" || novo === "fechou" ? { proximoContato: null } : {}),
  };
}

function ultimaMudanca(l) {
  const h = l.historico ?? [];
  return h.length ? h[h.length - 1].em : (l.atualizadoEm ?? "");
}

export function indicadorPreco(leads, tabela) {
  const decididos = leads
    .filter((l) => FINAIS.includes(l.status) && l.plano && l.precoMensal === tabela[l.plano])
    .sort((a, b) => ultimaMudanca(b).localeCompare(ultimaMudanca(a)))
    .slice(0, 10);
  const recusasPreco = decididos.filter((l) => l.status === "perdeu" && l.motivoPerda === "preco").length;
  let sugestao = "aguardar";
  if (decididos.length === 10) sugestao = recusasPreco === 0 ? "subir" : recusasPreco >= 2 ? "descer" : "manter";
  return { amostra: decididos.length, recusasPreco, sugestao };
}

export function ajustarTabela(tabela, delta) {
  return { solo: tabela.solo + delta, equipe: tabela.equipe + delta, casaCheia: tabela.casaCheia + delta };
}

export function formatarReais(n) {
  const v = Number(n);
  return Number.isInteger(v) ? `R$ ${v}` : `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export function dataCurta(dataISO) {
  const [, m, d] = dataISO.split("-");
  return `${d}/${m}`;
}

export function dataHora(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

const rotulo = (lista, id) => lista.find((x) => x.id === id)?.rotulo ?? id;
export const rotuloStatus = (id) => rotulo(STATUS, id);
export const rotuloMotivo = (id) => rotulo(MOTIVOS, id);
export const rotuloPlano = (id) => rotulo(PLANOS, id);

import { linkTelefone, rotuloDuracao } from "../ficha/exibir.ts";
import { resumoDoAgendamento, rotuloDia } from "./apresentar.ts";
import { agoraEmSaoPaulo, proximosDias } from "./horarios.ts";
import { elastico, parada, passoDaMola, projetar, type Mola } from "./mola.ts";
import type { DadosAgenda, FonteAgenda } from "./tipos.ts";

type Passo = "servico" | "profissional" | "dia" | "hora" | "dados" | "fim";

const TITULOS: Record<Passo, string> = {
  servico: "Escolha o serviço",
  profissional: "Com quem?",
  dia: "Escolha o dia",
  hora: "Escolha o horário",
  dados: "Seus dados",
  fim: "Tudo certo",
};
const ERROS = {
  ocupado: "Esse horário acabou de ser ocupado. Escolha outro.",
  limite: "Este celular já tem 2 agendamentos neste dia.",
  invalido: "Confira o nome e o celular com DDD.",
} as const;

const ABRIR: Mola = { amortecimento: 1, resposta: 0.35 };
const FECHAR: Mola = { amortecimento: 1, resposta: 0.3 };
const VOLTAR: Mola = { amortecimento: 0.8, resposta: 0.3 };

// Gaveta de agendamento. Tudo é montado com textContent: nenhum dado da ficha vira HTML.
// Movimento como no iOS: a gaveta segue o dedo, herda a velocidade ao soltar e entra e sai pelo mesmo caminho.
export function iniciarAgendamento(dialog: HTMLDialogElement, fonte: FonteAgenda, dados: DadosAgenda, agora: () => Date): void {
  const passos: Passo[] = dados.profissionais.length > 0
    ? ["servico", "profissional", "dia", "hora", "dados", "fim"]
    : ["servico", "dia", "hora", "dados", "fim"];
  const estado = { servico: "", profissional: null as string | null, data: "", hora: "" };
  let atual: Passo = "servico";

  const el = <T extends HTMLElement>(seletor: string): T => {
    const achado = dialog.querySelector<T>(seletor);
    if (!achado) throw new Error(`Agenda sem ${seletor}`);
    return achado;
  };
  const caixa = el(".agenda__caixa");
  const alca = el("[data-alca]");
  const titulo = el("[data-titulo]");
  const aviso = el("[data-aviso]");
  const voltar = el<HTMLButtonElement>("[data-voltar]");
  const form = el<HTMLFormElement>("[data-form]");
  const lista = (p: Passo) => el(`[data-lista="${p}"]`);
  const hoje = () => agoraEmSaoPaulo(agora()).data;

  // --- Movimento -----------------------------------------------------------
  const computador = () => matchMedia("(min-width: 720px)").matches;
  const reduzido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const altura = () => caixa.getBoundingClientRect().height;
  const distancia = () => (computador() ? 48 : altura());
  let posicao = 0;
  let velocidade = 0;
  let quadro = 0;
  const aplicar = () => {
    caixa.style.transform = posicao ? `translate3d(0, ${posicao}px, 0)` : "";
    caixa.style.opacity = computador() ? String(Math.max(0, 1 - posicao / 48)) : "";
  };

  // Parte sempre de onde a gaveta está agora: dá para pegá-la no meio do caminho.
  function animar(alvo: number, mola: Mola, aoTerminar?: () => void) {
    cancelAnimationFrame(quadro);
    if (reduzido()) {
      posicao = alvo;
      velocidade = 0;
      aplicar();
      aoTerminar?.();
      return;
    }
    let antes = performance.now();
    const passo = (agoraMs: number) => {
      const dt = Math.min(0.064, (agoraMs - antes) / 1000);
      antes = agoraMs;
      const n = Math.max(1, Math.round(dt * 240));
      for (let i = 0; i < n; i++) [posicao, velocidade] = passoDaMola(posicao, velocidade, alvo, mola, dt / n);
      if (parada(posicao, velocidade, alvo)) {
        posicao = alvo;
        velocidade = 0;
        aplicar();
        aoTerminar?.();
        return;
      }
      aplicar();
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
  }

  function abrirGaveta() {
    dialog.showModal();
    posicao = distancia();
    velocidade = 0;
    aplicar();
    animar(0, ABRIR);
  }

  function fechar() {
    if (!dialog.open) return;
    animar(distancia(), FECHAR, () => {
      dialog.close();
      posicao = 0;
      aplicar();
    });
  }

  let arrasto: { id: number; inicio: number; base: number; historico: [number, number][] } | null = null;
  alca.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("button")) return;
    cancelAnimationFrame(quadro);
    alca.setPointerCapture(e.pointerId);
    arrasto = { id: e.pointerId, inicio: e.clientY, base: posicao, historico: [[e.timeStamp, posicao]] };
  });
  alca.addEventListener("pointermove", (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const bruto = arrasto.base + e.clientY - arrasto.inicio;
    posicao = bruto < 0 ? elastico(bruto, altura()) : bruto;
    arrasto.historico = [...arrasto.historico.slice(-4), [e.timeStamp, posicao]];
    aplicar();
  });
  const soltar = (e: PointerEvent) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const [t0, y0] = arrasto.historico[0];
    const [t1, y1] = arrasto.historico[arrasto.historico.length - 1];
    velocidade = t1 > t0 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0;
    arrasto = null;
    // Decide pelo destino projetado, não por onde o dedo soltou: um puxão rápido fecha.
    if (posicao + projetar(velocidade) > altura() / 2) fechar();
    else animar(0, VOLTAR);
  };
  alca.addEventListener("pointerup", soltar);
  alca.addEventListener("pointercancel", soltar);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    fechar();
  });

  // --- Passos ----------------------------------------------------------------
  function mostrar(p: Passo) {
    atual = p;
    for (const s of dialog.querySelectorAll<HTMLElement>("[data-passo]")) s.hidden = s.dataset.passo !== p;
    titulo.textContent = TITULOS[p];
    voltar.hidden = p === "servico" || p === "fim";
    aviso.textContent = "";
    dialog.querySelector<HTMLElement>(`[data-passo="${p}"] :is(button, input):not([disabled])`)?.focus({ preventScroll: true });
  }
  const seguinte = () => passos[passos.indexOf(atual) + 1];

  function opcao(texto: string, detalhe: string, aoEscolher: () => void, desativada = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opcao";
    b.disabled = desativada;
    const t = document.createElement("span");
    t.className = "opcao__texto";
    t.textContent = texto;
    b.append(t);
    if (detalhe) {
      const d = document.createElement("span");
      d.className = "opcao__detalhe";
      d.textContent = detalhe;
      b.append(d);
    }
    b.addEventListener("click", aoEscolher);
    return b;
  }
  function paragrafo(texto: string) {
    const p = document.createElement("p");
    p.className = "agenda__vazio";
    p.textContent = texto;
    return p;
  }

  function montarListas() {
    lista("servico").replaceChildren(...dados.servicos.map((s) => opcao(s.nome, rotuloDuracao(s.duracaoMin), () => {
      estado.servico = s.nome;
      mostrar(seguinte());
    })));
    if (dados.profissionais.length > 0) {
      lista("profissional").replaceChildren(
        opcao("Sem preferência", "Primeiro horário livre", () => {
          estado.profissional = null;
          mostrar(seguinte());
        }),
        ...dados.profissionais.map((nome) => opcao(nome, "", () => {
          estado.profissional = nome;
          mostrar(seguinte());
        })),
      );
    }
    const h = hoje();
    lista("dia").replaceChildren(...proximosDias(dados.horarios, h).map((d) => opcao(rotuloDia(d.data, h), d.aberto ? "" : "Fechado", () => {
      estado.data = d.data;
      mostrar("hora");
      void carregarHoras();
    }, !d.aberto)));
  }

  function falhou() {
    const contato = dados.whatsapp ?? (dados.telefone ? linkTelefone(dados.telefone) : null);
    aviso.replaceChildren(document.createTextNode("Não foi possível falar com a agenda agora. "));
    if (contato) {
      const a = document.createElement("a");
      a.href = contato;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = dados.whatsapp ? "Chame no WhatsApp." : "Ligue para nós.";
      aviso.append(a);
    }
  }

  async function carregarHoras(mensagem = "") {
    const alvo = lista("hora");
    alvo.replaceChildren(paragrafo("Carregando horários…"));
    try {
      const horas = await fonte.horarios({ servico: estado.servico, profissional: estado.profissional, data: estado.data });
      alvo.replaceChildren(...(horas.length
        ? horas.map((hora) => opcao(hora, "", () => {
          estado.hora = hora;
          el("[data-resumo]").textContent = resumoDoAgendamento({ ...estado, hoje: hoje() });
          mostrar("dados");
        }))
        : [paragrafo("Sem horários livres neste dia. Volte e escolha outro dia.")]));
      aviso.textContent = mensagem;
      alvo.querySelector("button")?.focus({ preventScroll: true });
    } catch {
      falhou();
    }
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const campos = new FormData(form);
    const enviar = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (enviar) enviar.disabled = true;
    try {
      const r = await fonte.agendar({
        servico: estado.servico,
        profissional: estado.profissional,
        data: estado.data,
        hora: estado.hora,
        nome: String(campos.get("nome") ?? ""),
        celular: String(campos.get("celular") ?? ""),
        email: String(campos.get("email") ?? "").trim() || undefined,
        isca: String(campos.get("site") ?? ""),
      });
      if (r.ok) {
        el("[data-confirmacao]").textContent = resumoDoAgendamento({ ...estado, profissional: r.profissional, hoje: hoje() });
        form.reset();
        mostrar("fim");
      } else if (r.erro === "ocupado") {
        mostrar("hora");
        await carregarHoras(ERROS.ocupado);
      } else {
        aviso.textContent = ERROS[r.erro];
      }
    } catch {
      falhou();
    } finally {
      if (enviar) enviar.disabled = false;
    }
  });

  voltar.addEventListener("click", () => {
    const anterior = passos[passos.indexOf(atual) - 1];
    if (anterior) mostrar(anterior);
  });
  for (const b of dialog.querySelectorAll<HTMLButtonElement>("[data-fechar]")) b.addEventListener("click", fechar);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) fechar();
  });

  document.addEventListener("click", (e) => {
    const gatilho = (e.target as Element | null)?.closest<HTMLElement>("[data-agendar]");
    if (!gatilho) return;
    const servico = gatilho.dataset.agendar ?? "";
    Object.assign(estado, { servico: "", profissional: null, data: "", hora: "" });
    montarListas();
    abrirGaveta();
    if (servico && dados.servicos.some((s) => s.nome === servico)) {
      estado.servico = servico;
      mostrar(passos[1]);
    } else {
      mostrar("servico");
    }
  });
}

# Plano A — Prospecção + Painel — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buscar barbearias e estéticas sem site na Grande Florianópolis via Apify, priorizar, e entregar os leads num painel privado no claude.ai (mini-CRM com roteiro de ligação), pronto para ligar.

**Architecture:** Scripts Node 24 em TypeScript (rodando direto com type stripping, sem build) em `prospeccao/`: um cliente REST mínimo da Apify, funções puras (conversão, filtro, pontuação, slug) e CLIs (`buscar`, `lote`, `detalhar`, `limpar`) que gravam JSON em `leads/` (fora do git). O painel é uma página Artifact (`painel/`) com a capability `db`: a lógica pura fica em `painel/logica.js` (testada no Node) e é embutida na página por um build de uma linha. Claude grava os leads no banco do painel com o `ArtifactData`; você atualiza status e notas pelo celular.

**Tech Stack:** Node.js 24 (type stripping, `node:test`, `fetch`), TypeScript (só checagem, `tsc --noEmit`), API REST da Apify (ator `compass/crawler-google-places`), Artifact + capability `db`, HTML/CSS/JS sem framework.

**Spec:** `docs/superpowers/specs/2026-10-09-cold-call-sites-design.md` (seções 2, 4, 5, 7, 8, 9).

**Fatos da Apify confirmados no dry-run (2026-10-09):** `prospeccao/apify-notas.md`. A Task 4 já foi feita; a execução começa na Task 1 e pula a 4.

## Global Constraints

- Node.js 24+; TypeScript executado por type stripping: só sintaxe apagável (sem `enum`, `namespace`, parameter properties), imports relativos com extensão `.ts`, tipos importados com `import type`.
- Região: Florianópolis, São José, Palhoça, Biguaçu (Santa Catarina).
- Nichos v1: `barbearia`; `estetica` (sobrancelha, cílios, unhas, depilação, harmonização, salão de beleza).
- Fonte: ator `compass/crawler-google-places` da Apify. Descoberta **sem** página de detalhe, **sem** fotos, **sem** avaliações e **sem** filtros pagos do ator (`website`, `skipClosedPlaces`): lugares fechados e com site próprio são descartados no nosso código.
- Classificação `so_rede` para: instagram.com, facebook.com, fb.com, linktr.ee, linkme.bio, beacons.ai, bio.link, wa.me, api.whatsapp.com, booksy.com, trinks.com, business.site, appbarber.com.br, cashbarber.com.br, calendly.com, gendo.app, biolink.info, wa.link, tiktok.com, chat.whatsapp.com, g.page, linkin.bio, taplink.cc.
- Pontuação: avaliações `min(n,100)/100×50`; nota ≥4,5 → 25, ≥4,0 → 15, ≥3,5 → 5; celular → 15; Instagram → 10.
- Lote padrão: 25 leads. Teto de gasto por execução: padrão US$1,00, mínimo US$0,50 (exigência da Apify). Saldo conferido antes de rodar. O gasto gravado em `leads/_sistema/uso.json` é estimado (quantidades × `precosUsd` da config), porque a Apify registra o gasto real com atraso.
- Retenção: lead `perdeu`, ou `novo`/`sem_resposta` sem mudança há mais de 14 dias, tem os dados coletados apagados.
- Status do painel: `novo`, `sem_resposta`, `retornar`, `interessado`, `reuniao`, `fechou`, `perdeu`. Motivos de perda: `preco`, `sem_necessidade`, `ja_tem`, `nao_decide`, `outro`.
- Oferta (revisada em 2026-10-10): implantação de R$790 paga uma vez; manutenção mensal Solo (1 profissional) R$39 · Equipe (2–5) R$59 · Casa cheia (6+) R$89; sem fidelidade. Ajuste a cada 10 interessados decididos com a tabela atual: 0 recusas por preço → +R$10; 2 ou mais → −R$10.
- WhatsApp é só contato. Nada de agendamento por WhatsApp.
- `APIFY_TOKEN` só no `.env` (fora do git). `leads/` e `sites/public/fotos/` fora do git.
- Textos para quem usa: português do Brasil. Datas no fuso America/Sao_Paulo.
- Desvio deliberado da spec 5.1/5.6: arquivos de sistema ficam em `leads/_sistema/` (não em `leads/`), para um negócio chamado "Uso" ou "Vistos" nunca colidir com eles.

## Review Focus

- Item da Apify com campos faltando (sem `phoneUnformatted`, sem `city`, `totalScore` 0, sem `website`): converte sem quebrar, nota vira `null`, cidade sai do endereço. → teste na Task 5.
- Telefone em formatos variados (+55, (048), 0800, fixo, sem DDD, DDD 55 do RS): `celular` e link de WhatsApp corretos. → testes na Task 3.
- O mesmo lugar achado por dois termos na mesma busca, e a mesma busca repetida: nenhum lead duplicado, nenhum slug repetido. → testes nas Tasks 5 e 6.
- Execução da Apify que falha (ou bate no teto) no meio: nenhum lead nem "visto" gravado, erro claro. → testes na Task 6.
- Lead arquivado (dados apagados) ou sem telefone no painel: não aparece em "Para ligar" e o cartão não quebra. → testes na Task 8.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `tsconfig.json`, `.env.example` | projeto Node, scripts npm, checagem de tipos |
| `prospeccao/tipos.ts` | tipos `LeadBruto`, `Lead`, `Detalhes` |
| `prospeccao/slug.ts` | slug a partir do nome |
| `prospeccao/classificar.ts` | classificar o "site" e extrair o @ |
| `prospeccao/telefone.ts` | celular, dígitos nacionais, link do WhatsApp |
| `prospeccao/pontuacao.ts` | pontuação 0–100 |
| `prospeccao/datas.ts` | data de hoje em São Paulo |
| `prospeccao/doApify.ts` | converter item da Apify → lead; detalhes → `DetalhesBrutos` |
| `prospeccao/filtro.ts` | região, descartes, deduplicação |
| `prospeccao/config.json`, `prospeccao/config.ts` | termos, cidades, limites |
| `prospeccao/armazem.ts` | leitura e escrita em `leads/` |
| `prospeccao/apify.ts` | cliente REST da Apify (saldo, rodar ator) |
| `prospeccao/custo.ts` | regra de saldo antes de rodar |
| `prospeccao/buscar.ts` | orquestra a busca |
| `prospeccao/lote.ts` | escolhe o lote e monta os documentos do painel |
| `prospeccao/fotos.ts` | baixa fotos do lote |
| `prospeccao/detalhar.ts` | orquestra os detalhes do lote |
| `prospeccao/limpar.ts` | regra de retenção |
| `prospeccao/cli/*.ts` | linhas de comando |
| `prospeccao/fixtures/*.json` | itens de exemplo (dados fictícios) no formato da Apify |
| `prospeccao/apify-notas.md` | campos e custos confirmados na busca teste |
| `painel/logica.js` | regras do painel (puras, testadas no Node) |
| `painel/pagina.html` | página do painel |
| `painel/construir.ts` | embute `logica.js` na página → `painel/dist/caderno.html` |

---

### Task 1: Projeto Node + slug

**Files:**
- Create: `package.json`, `tsconfig.json`, `.env.example`
- Create: `prospeccao/tipos.ts`, `prospeccao/slug.ts`
- Test: `prospeccao/slug.test.ts`

**Interfaces:**
- Produces: `gerarSlug(nome: string, existentes: ReadonlySet<string>): string`; tipos `Classificacao`, `Fase`, `LeadBruto`, `Lead`, `Detalhes` (abaixo).

- [ ] **Step 1: Criar `package.json`, `tsconfig.json` e `.env.example`**

`package.json`:
```json
{
  "name": "cold",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "test": "node --test \"prospeccao/**/*.test.ts\"",
    "typecheck": "tsc --noEmit",
    "buscar": "node --env-file-if-exists=.env prospeccao/cli/buscar.ts",
    "lote": "node prospeccao/cli/lote.ts",
    "detalhar": "node --env-file-if-exists=.env prospeccao/cli/detalhar.ts",
    "limpar": "node prospeccao/cli/limpar.ts"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["prospeccao/**/*.ts", "painel/**/*.ts"]
}
```

`.env.example`:
```
APIFY_TOKEN=
```

- [ ] **Step 2: Instalar dependências de desenvolvimento**

Run: `npm install -D typescript @types/node`
Expected: cria `package-lock.json` e `node_modules/`, sem erros.

- [ ] **Step 3: Escrever `prospeccao/tipos.ts`**

```ts
export type Classificacao = "sem_site" | "so_rede" | "site_proprio";
export type Fase = "candidato" | "lote" | "detalhado";

export interface LeadBruto {
  placeId: string;
  nome: string;
  nicho: string;
  termo: string;
  cidade: string;
  bairro: string | null;
  endereco: string;
  telefone: string;
  celular: boolean;
  whatsapp: string | null;
  instagram: string | null;
  site: string | null;
  classificacao: Classificacao;
  nota: number | null;
  avaliacoes: number;
  mapsUrl: string;
  categoria: string | null;
  fechado: boolean;
}

export interface Detalhes {
  horarios: { dia: string; horas: string }[];
  coordenadas: { lat: number; lng: number } | null;
  reviews: { autor: string; texto: string; nota: number }[];
  fotos: string[];
  detalhadoEm: string;
}

export interface Lead extends LeadBruto {
  slug: string;
  score: number;
  fase: Fase;
  buscadoEm: string;
  lote: string | null;
  detalhes: Detalhes | null;
}
```

- [ ] **Step 4: Escrever o teste que falha — `prospeccao/slug.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarSlug } from "./slug.ts";

test("remove acentos e símbolos", () => {
  assert.equal(gerarSlug("Barbearia do Zé", new Set()), "barbearia-do-ze");
  assert.equal(gerarSlug("Estética & Cia.", new Set()), "estetica-cia");
});

test("colisão recebe sufixo numérico", () => {
  assert.equal(gerarSlug("Barbearia do Zé", new Set(["barbearia-do-ze"])), "barbearia-do-ze-2");
  assert.equal(
    gerarSlug("Barbearia do Zé", new Set(["barbearia-do-ze", "barbearia-do-ze-2"])),
    "barbearia-do-ze-3",
  );
});

test("nome sem letras nem números vira 'lead'", () => {
  assert.equal(gerarSlug("💈💈", new Set()), "lead");
});

test("nome longo fica com até 60 caracteres e sem hífen no fim", () => {
  const s = gerarSlug("Barbearia e Estética Masculina Dom Pedro Segundo Unidade Kobrasol São José", new Set());
  assert.ok(s.length <= 60);
  assert.ok(!s.endsWith("-"));
  assert.ok(s.startsWith("barbearia-e-estetica-masculina"));
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../prospeccao/slug.ts'`.

- [ ] **Step 6: Implementar `prospeccao/slug.ts`**

```ts
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
```

- [ ] **Step 7: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: 4 testes PASS; `tsc` sem erros.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json .env.example prospeccao/tipos.ts prospeccao/slug.ts prospeccao/slug.test.ts
git commit -m "feat(prospeccao): set up Node project and slug generator"
```

---

### Task 2: Classificar o "site" do Google

**Files:**
- Create: `prospeccao/classificar.ts`
- Test: `prospeccao/classificar.test.ts`

**Interfaces:**
- Consumes: `Classificacao` de `tipos.ts`.
- Produces: `classificarSite(site: string | null | undefined): { classificacao: Classificacao; instagram: string | null }`.

- [ ] **Step 1: Escrever o teste que falha — `prospeccao/classificar.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarSite } from "./classificar.ts";

test("sem site", () => {
  for (const v of [null, undefined, "", "   "]) {
    assert.deepEqual(classificarSite(v), { classificacao: "sem_site", instagram: null });
  }
});

test("Instagram vira so_rede e extrai o @", () => {
  assert.deepEqual(classificarSite("https://www.instagram.com/barbeariadoze/"), {
    classificacao: "so_rede",
    instagram: "@barbeariadoze",
  });
  assert.deepEqual(classificarSite("instagram.com/BarbeariaDoZe?igsh=abc"), {
    classificacao: "so_rede",
    instagram: "@barbeariadoze",
  });
});

test("link de post do Instagram é so_rede sem @", () => {
  assert.deepEqual(classificarSite("https://www.instagram.com/p/Cxyz123/"), {
    classificacao: "so_rede",
    instagram: null,
  });
});

test("redes, links de bio e apps de agenda são so_rede", () => {
  for (const url of [
    "https://linktr.ee/barbeariadoze",
    "https://booksy.com/pt-br/123_barbearia-do-ze",
    "https://www.trinks.com/barbearia-do-ze",
    "https://barbeariadoze.business.site/",
    "https://m.facebook.com/barbeariadoze",
    "https://wa.me/5548991234567",
    "https://api.whatsapp.com/send?phone=5548991234567",
  ]) {
    assert.equal(classificarSite(url).classificacao, "so_rede", url);
  }
});

test("domínio próprio é site_proprio, inclusive parecido com rede", () => {
  assert.equal(classificarSite("https://www.barbeariadoze.com.br").classificacao, "site_proprio");
  assert.equal(classificarSite("https://notinstagram.com/x").classificacao, "site_proprio");
});

test("URL quebrada conta como sem site", () => {
  assert.equal(classificarSite("http://").classificacao, "sem_site");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../prospeccao/classificar.ts'`.

- [ ] **Step 3: Implementar `prospeccao/classificar.ts`**

```ts
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
```

- [ ] **Step 4: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 5: Commit**

```bash
git add prospeccao/classificar.ts prospeccao/classificar.test.ts
git commit -m "feat(prospeccao): classify Google website field and extract Instagram handle"
```

---

### Task 3: Telefone e pontuação

**Files:**
- Create: `prospeccao/telefone.ts`, `prospeccao/pontuacao.ts`
- Test: `prospeccao/telefone.test.ts`, `prospeccao/pontuacao.test.ts`

**Interfaces:**
- Produces: `digitosNacionais(telefone: string): string`, `ehCelular(telefone: string): boolean`, `linkWhatsApp(telefone: string): string | null`, `pontuar(l: { avaliacoes: number; nota: number | null; celular: boolean; instagram: string | null }): number`.

- [ ] **Step 1: Escrever os testes que falham**

`prospeccao/telefone.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { digitosNacionais, ehCelular, linkWhatsApp } from "./telefone.ts";

test("celular em vários formatos", () => {
  for (const t of ["(48) 99123-4567", "+55 48 99123-4567", "+5548991234567", "(048) 99123-4567", "48 9 9123 4567"]) {
    assert.equal(digitosNacionais(t), "48991234567", t);
    assert.equal(ehCelular(t), true, t);
    assert.equal(linkWhatsApp(t), "https://wa.me/5548991234567", t);
  }
});

test("fixo, 0800 e número sem DDD não são celular", () => {
  for (const t of ["(48) 3241-1234", "+55 48 3241-1234", "0800 123 4567", "99123-4567", ""]) {
    assert.equal(ehCelular(t), false, t);
    assert.equal(linkWhatsApp(t), null, t);
  }
});

test("DDD 55 (RS) não é confundido com o código do país", () => {
  assert.equal(digitosNacionais("(55) 99123-4567"), "55991234567");
  assert.equal(ehCelular("(55) 99123-4567"), true);
});
```

`prospeccao/pontuacao.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { pontuar } from "./pontuacao.ts";

test("máximo é 100", () => {
  assert.equal(pontuar({ avaliacoes: 250, nota: 4.9, celular: true, instagram: "@x" }), 100);
});

test("mínimo é 0", () => {
  assert.equal(pontuar({ avaliacoes: 0, nota: null, celular: false, instagram: null }), 0);
});

test("faixas da nota", () => {
  const base = { avaliacoes: 0, celular: false, instagram: null };
  assert.equal(pontuar({ ...base, nota: 4.5 }), 25);
  assert.equal(pontuar({ ...base, nota: 4.49 }), 15);
  assert.equal(pontuar({ ...base, nota: 4.0 }), 15);
  assert.equal(pontuar({ ...base, nota: 3.5 }), 5);
  assert.equal(pontuar({ ...base, nota: 3.4 }), 0);
});

test("avaliações proporcionais e arredondamento", () => {
  assert.equal(pontuar({ avaliacoes: 37, nota: 4.2, celular: true, instagram: null }), 49);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — módulos `telefone.ts` e `pontuacao.ts` não encontrados.

- [ ] **Step 3: Implementar `prospeccao/telefone.ts`**

```ts
export function digitosNacionais(telefone: string): string {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return d;
}

export function ehCelular(telefone: string): boolean {
  const d = digitosNacionais(telefone);
  return d.length === 11 && d[2] === "9";
}

export function linkWhatsApp(telefone: string): string | null {
  return ehCelular(telefone) ? `https://wa.me/55${digitosNacionais(telefone)}` : null;
}
```

- [ ] **Step 4: Implementar `prospeccao/pontuacao.ts`**

```ts
export function pontuar(l: { avaliacoes: number; nota: number | null; celular: boolean; instagram: string | null }): number {
  const pontosAvaliacoes = (Math.min(l.avaliacoes, 100) / 100) * 50;
  const pontosNota =
    l.nota == null ? 0 : l.nota >= 4.5 ? 25 : l.nota >= 4.0 ? 15 : l.nota >= 3.5 ? 5 : 0;
  return Math.round(pontosAvaliacoes + pontosNota + (l.celular ? 15 : 0) + (l.instagram ? 10 : 0));
}
```

- [ ] **Step 5: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
git add prospeccao/telefone.ts prospeccao/telefone.test.ts prospeccao/pontuacao.ts prospeccao/pontuacao.test.ts
git commit -m "feat(prospeccao): detect mobile numbers and score leads"
```

---

### Task 4: Busca teste na Apify (confirmar campos e custo) — concluída

**Concluída no dry-run de 2026-10-09** (gasto: US$0,033). `prospeccao/fixtures/lugar-busca.json`, `prospeccao/fixtures/lugar-detalhe.json` e `prospeccao/apify-notas.md` já estão no repositório, com o formato real do ator e dados fictícios. **Pule para a Task 5.** Os passos ficam como registro; para repetir, mantenha `maxTotalChargeUsd` ≥ 0,5.

Pré-requisito: o arquivo `.env` tem `APIFY_TOKEN` (spec seção 9). Esta task gasta uns US$0,05 e não cria código de produção: confirma o formato real do ator e grava fixtures fictícias com esse formato.

**Files:**
- Create: `prospeccao/fixtures/lugar-busca.json`, `prospeccao/fixtures/lugar-detalhe.json`, `prospeccao/apify-notas.md`
- Gera (fora do git): `leads/_sistema/amostra-busca.json`, `leads/_sistema/amostra-detalhe.json`

**Interfaces:**
- Produces: fixtures com as chaves exatas que a Task 5 lê (`title`, `placeId`, `categoryName`, `address`, `neighborhood`, `city`, `phone`, `phoneUnformatted`, `website`, `totalScore`, `reviewsCount`, `url`, `searchString`, `location`, `openingHours[].day/hours`, `imageUrls[]`, `reviews[].name/text/stars`); a forma de pedir detalhes por ID (`placeIds` ou `startUrls`) usada na Task 11.

- [x] **Step 1: Conferir o token sem mostrar o valor**

Run: `grep -q '^APIFY_TOKEN=.\+' .env && echo "token ok" || echo "falta APIFY_TOKEN no .env"`
Expected: `token ok`. Se faltar, pare e peça para a pessoa criar a conta e colar o token no `.env`.

- [x] **Step 2: Ler o saldo do mês**

Run:
```bash
node --env-file=.env --input-type=module -e '
const r = await fetch("https://api.apify.com/v2/users/me/limits", { headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` } });
const j = await r.json();
console.log(r.status, JSON.stringify({ limits: j.data?.limits, current: j.data?.current }, null, 2));'
```
Expected: `200`, com `limits.maxMonthlyUsageUsd` (≈5) e `current.monthlyUsageUsd`. Anote os nomes exatos: a Task 6 lê esses dois campos.

- [x] **Step 3: Rodar uma descoberta pequena (5 lugares)**

Run:
```bash
mkdir -p leads/_sistema
node --env-file=.env --input-type=module -e '
const H = { Authorization: `Bearer ${process.env.APIFY_TOKEN}`, "Content-Type": "application/json" };
const B = "https://api.apify.com/v2";
const input = { searchStringsArray: ["barbearia"], locationQuery: "Kobrasol, São José, Santa Catarina, Brasil", maxCrawledPlacesPerSearch: 5, language: "pt-BR", scrapePlaceDetailPage: false, maxImages: 0, maxReviews: 0 };
let { data: run } = await (await fetch(`${B}/acts/compass~crawler-google-places/runs?maxTotalChargeUsd=0.5`, { method: "POST", headers: H, body: JSON.stringify(input) })).json();
console.log("run", run.id, run.status);
while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) ({ data: run } = await (await fetch(`${B}/actor-runs/${run.id}?waitForFinish=60`, { headers: H })).json());
console.log("fim", run.status);
const itens = await (await fetch(`${B}/datasets/${run.defaultDatasetId}/items?clean=true&format=json`, { headers: H })).json();
(await import("node:fs")).writeFileSync("leads/_sistema/amostra-busca.json", JSON.stringify(itens, null, 2));
console.log(itens.length, "itens; chaves:", [...new Set(itens.flatMap((i) => Object.keys(i)))].sort().join(", "));'
```
Expected: `fim SUCCEEDED`, até 5 itens, e a lista de chaves contendo pelo menos `title`, `placeId`, `address`, `city`, `phone`, `totalScore`, `reviewsCount`, `url`. Se o ator recusar `language: "pt-BR"`, troque por `"pt"` e anote.

- [x] **Step 4: Pedir detalhes de 1 lugar por ID**

Run:
```bash
node --env-file=.env --input-type=module -e '
const fs = await import("node:fs");
const H = { Authorization: `Bearer ${process.env.APIFY_TOKEN}`, "Content-Type": "application/json" };
const B = "https://api.apify.com/v2";
const id = JSON.parse(fs.readFileSync("leads/_sistema/amostra-busca.json", "utf8"))[0].placeId;
const input = { placeIds: [id], language: "pt-BR", scrapePlaceDetailPage: true, maxImages: 2, maxReviews: 2, reviewsSort: "mostRelevant" };
let { data: run } = await (await fetch(`${B}/acts/compass~crawler-google-places/runs?maxTotalChargeUsd=0.5`, { method: "POST", headers: H, body: JSON.stringify(input) })).json();
while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) ({ data: run } = await (await fetch(`${B}/actor-runs/${run.id}?waitForFinish=60`, { headers: H })).json());
console.log("fim", run.status);
const itens = await (await fetch(`${B}/datasets/${run.defaultDatasetId}/items?clean=true&format=json`, { headers: H })).json();
fs.writeFileSync("leads/_sistema/amostra-detalhe.json", JSON.stringify(itens, null, 2));
const d = itens[0] ?? {};
console.log({ chaves: Object.keys(d).sort(), horario: d.openingHours?.[0], review: d.reviews?.[0] && Object.keys(d.reviews[0]), imagens: d.imageUrls?.length });'
```
Expected: `fim SUCCEEDED`, `openingHours[0]` com `day`/`hours`, `reviews[0]` com `name`/`text`/`stars`, `imagens` = 2. Se o ator recusar `placeIds` (execução `FAILED` por entrada inválida), rode de novo trocando por `startUrls: [{ url: "https://www.google.com/maps/place/?q=place_id:" + id }]` e anote qual forma funcionou.

- [x] **Step 5: Medir o custo**

Repita o Step 2 e calcule `current.monthlyUsageUsd` depois − antes.

- [x] **Step 6: Gravar as fixtures fictícias**

Feito: os arquivos estão em `prospeccao/fixtures/` (formato real do ator, dados fictícios). A Task 5 lê exatamente as chaves deles.

- [x] **Step 7: Registrar o que foi confirmado em `prospeccao/apify-notas.md`**

Feito: `prospeccao/apify-notas.md`.

- [x] **Step 8: Commit**

```bash
git add prospeccao/fixtures prospeccao/apify-notas.md
git commit -m "test(prospeccao): add Apify fixtures and confirmed API notes"
```

---

### Task 5: Converter itens da Apify e filtrar candidatos

**Files:**
- Create: `prospeccao/doApify.ts`, `prospeccao/filtro.ts`
- Test: `prospeccao/doApify.test.ts`, `prospeccao/filtro.test.ts`

**Interfaces:**
- Consumes: `classificarSite` (Task 2); `ehCelular`, `linkWhatsApp` (Task 3); `LeadBruto` (Task 1); fixtures (Task 4).
- Produces:
  - `converterLugar(raw: unknown, nicho: string): LeadBruto | null`
  - `normalizar(s: string): string`
  - `naRegiao(l: LeadBruto, cidades: readonly string[]): string | null` (devolve o nome da cidade como está na config)
  - `type MotivoDescarte = "repetido" | "ja_visto" | "sem_telefone" | "fora_da_regiao" | "site_proprio" | "fechado"`
  - `selecionarCandidatos(brutos: LeadBruto[], vistos: ReadonlySet<string>, cidades: readonly string[]): { candidatos: LeadBruto[]; descartes: Record<MotivoDescarte, number> }`

- [ ] **Step 1: Escrever o teste que falha — `prospeccao/doApify.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { converterLugar } from "./doApify.ts";

const busca = JSON.parse(readFileSync(new URL("./fixtures/lugar-busca.json", import.meta.url), "utf8")) as unknown[];

test("converte barbearia com Instagram e celular", () => {
  const l = converterLugar(busca[0], "barbearia");
  assert.ok(l);
  assert.equal(l.placeId, "ChIJteste000000000000001");
  assert.equal(l.nome, "Barbearia Teste Kobrasol");
  assert.equal(l.termo, "barbearia");
  assert.equal(l.cidade, "São José");
  assert.equal(l.bairro, "Kobrasol");
  assert.equal(l.telefone, "+55 48 99999-0001");
  assert.equal(l.celular, true);
  assert.equal(l.whatsapp, "https://wa.me/5548999990001");
  assert.equal(l.classificacao, "so_rede");
  assert.equal(l.instagram, "@barbeariateste");
  assert.equal(l.nota, 4.8);
  assert.equal(l.avaliacoes, 132);
  assert.equal(l.categoria, "Barbearia");
  assert.equal(l.fechado, false);
});

test("sem website é sem_site; fixo não tem WhatsApp", () => {
  const l = converterLugar(busca[1], "estetica");
  assert.ok(l);
  assert.equal(l.classificacao, "sem_site");
  assert.equal(l.site, null);
  assert.equal(l.celular, false);
  assert.equal(l.whatsapp, null);
});

test("item sem placeId ou sem nome é ignorado", () => {
  assert.equal(converterLugar({ title: "Sem ID" }, "barbearia"), null);
  assert.equal(converterLugar({ placeId: "x" }, "barbearia"), null);
  assert.equal(converterLugar(null, "barbearia"), null);
});

test("item mínimo converte com valores padrão", () => {
  const l = converterLugar({ placeId: "ChIJmin", title: "Mínimo", totalScore: 0 }, "barbearia");
  assert.ok(l);
  assert.equal(l.telefone, "");
  assert.equal(l.celular, false);
  assert.equal(l.nota, null);
  assert.equal(l.avaliacoes, 0);
  assert.equal(l.cidade, "");
  assert.equal(l.bairro, null);
  assert.match(l.mapsUrl, /query_place_id=ChIJmin$/);
});

test("sem phoneUnformatted usa phone para decidir se é celular", () => {
  const l = converterLugar({ placeId: "ChIJp", title: "P", phone: "(48) 99888-7777" }, "barbearia");
  assert.ok(l);
  assert.equal(l.celular, true);
  assert.equal(l.whatsapp, "https://wa.me/5548998887777");
});

test("fechado temporária ou definitivamente vira fechado: true", () => {
  assert.equal(converterLugar({ placeId: "a", title: "A", permanentlyClosed: true }, "barbearia")?.fechado, true);
  assert.equal(converterLugar({ placeId: "b", title: "B", temporarilyClosed: true }, "barbearia")?.fechado, true);
});
```

- [ ] **Step 2: Escrever o teste que falha — `prospeccao/filtro.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { converterLugar } from "./doApify.ts";
import { selecionarCandidatos, naRegiao } from "./filtro.ts";
import type { LeadBruto } from "./tipos.ts";

const CIDADES = ["Florianópolis", "São José", "Palhoça", "Biguaçu"];
const busca = JSON.parse(readFileSync(new URL("./fixtures/lugar-busca.json", import.meta.url), "utf8")) as unknown[];
const brutos = busca.map((i) => converterLugar(i, "barbearia")).filter((b) => b !== null);

test("descarta site próprio e mantém sem site e só rede", () => {
  const { candidatos, descartes } = selecionarCandidatos(brutos, new Set(), CIDADES);
  assert.deepEqual(candidatos.map((c) => c.placeId), ["ChIJteste000000000000001", "ChIJteste000000000000002"]);
  assert.equal(descartes.site_proprio, 1);
});

test("mesmo lugar duas vezes na mesma busca entra uma vez só", () => {
  const { candidatos, descartes } = selecionarCandidatos([brutos[0], brutos[0]], new Set(), CIDADES);
  assert.equal(candidatos.length, 1);
  assert.equal(descartes.repetido, 1);
});

test("lugar já visto não volta", () => {
  const { candidatos, descartes } = selecionarCandidatos(brutos, new Set(["ChIJteste000000000000001"]), CIDADES);
  assert.deepEqual(candidatos.map((c) => c.placeId), ["ChIJteste000000000000002"]);
  assert.equal(descartes.ja_visto, 1);
});

test("sem telefone e fora da região são descartados", () => {
  const semTelefone: LeadBruto = { ...brutos[0], placeId: "a", telefone: "" };
  const curitiba: LeadBruto = { ...brutos[0], placeId: "b", cidade: "Curitiba", endereco: "R. X, 1 - Centro, Curitiba - PR" };
  const { candidatos, descartes } = selecionarCandidatos([semTelefone, curitiba], new Set(), CIDADES);
  assert.equal(candidatos.length, 0);
  assert.equal(descartes.sem_telefone, 1);
  assert.equal(descartes.fora_da_regiao, 1);
});

test("cidade vazia é resolvida pelo endereço, com o nome da config", () => {
  const l: LeadBruto = { ...brutos[0], cidade: "", endereco: "R. Y, 5 - Centro, Biguaçu - SC, 88160-000" };
  assert.equal(naRegiao(l, CIDADES), "Biguaçu");
  const { candidatos } = selecionarCandidatos([l], new Set(), CIDADES);
  assert.equal(candidatos[0].cidade, "Biguaçu");
});

test("São José dos Pinhais (PR) não conta como São José", () => {
  const l: LeadBruto = { ...brutos[0], cidade: "São José dos Pinhais", endereco: "R. Z, 9 - Centro, São José dos Pinhais - PR" };
  assert.equal(naRegiao(l, CIDADES), null);
});

test("lugar fechado é descartado", () => {
  const fechado: LeadBruto = { ...brutos[0], placeId: "f", fechado: true };
  const { candidatos, descartes } = selecionarCandidatos([fechado], new Set(), CIDADES);
  assert.equal(candidatos.length, 0);
  assert.equal(descartes.fechado, 1);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — módulos `doApify.ts` e `filtro.ts` não encontrados.

- [ ] **Step 4: Implementar `prospeccao/doApify.ts`**

```ts
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
```

- [ ] **Step 5: Implementar `prospeccao/filtro.ts`**

```ts
import type { LeadBruto } from "./tipos.ts";

export type MotivoDescarte = "repetido" | "ja_visto" | "sem_telefone" | "fora_da_regiao" | "site_proprio" | "fechado";

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function naRegiao(l: LeadBruto, cidades: readonly string[]): string | null {
  const alvo = cidades.map((c) => ({ c, n: normalizar(c) }));
  const porCampo = alvo.find((a) => a.n === normalizar(l.cidade));
  if (porCampo) return porCampo.c;
  const endereco = normalizar(l.endereco);
  return alvo.find((a) => endereco.includes(`${a.n} - sc`))?.c ?? null;
}

export function selecionarCandidatos(
  brutos: LeadBruto[],
  vistos: ReadonlySet<string>,
  cidades: readonly string[],
): { candidatos: LeadBruto[]; descartes: Record<MotivoDescarte, number> } {
  const candidatos: LeadBruto[] = [];
  const descartes: Record<MotivoDescarte, number> = {
    repetido: 0,
    ja_visto: 0,
    sem_telefone: 0,
    fora_da_regiao: 0,
    site_proprio: 0,
    fechado: 0,
  };
  const nestaBusca = new Set<string>();
  for (const b of brutos) {
    if (nestaBusca.has(b.placeId)) {
      descartes.repetido++;
      continue;
    }
    nestaBusca.add(b.placeId);
    if (vistos.has(b.placeId)) {
      descartes.ja_visto++;
      continue;
    }
    if (b.fechado) {
      descartes.fechado++;
      continue;
    }
    if (!b.telefone) {
      descartes.sem_telefone++;
      continue;
    }
    const cidade = naRegiao(b, cidades);
    if (!cidade) {
      descartes.fora_da_regiao++;
      continue;
    }
    if (b.classificacao === "site_proprio") {
      descartes.site_proprio++;
      continue;
    }
    candidatos.push({ ...b, cidade });
  }
  return { candidatos, descartes };
}
```

- [ ] **Step 6: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 7: Commit**

```bash
git add prospeccao/doApify.ts prospeccao/doApify.test.ts prospeccao/filtro.ts prospeccao/filtro.test.ts
git commit -m "feat(prospeccao): convert Apify places and filter candidates"
```

---

### Task 6: Comando `buscar` (cliente Apify, armazém, custo)

**Files:**
- Create: `prospeccao/config.json`, `prospeccao/config.ts`, `prospeccao/armazem.ts`, `prospeccao/apify.ts`, `prospeccao/custo.ts`, `prospeccao/buscar.ts`, `prospeccao/cli/buscar.ts`
- Test: `prospeccao/fixtures/lead.ts`, `prospeccao/armazem.test.ts`, `prospeccao/apify.test.ts`, `prospeccao/custo.test.ts`, `prospeccao/buscar.test.ts`

**Interfaces:**
- Consumes: `converterLugar` (Task 5), `selecionarCandidatos` (Task 5), `gerarSlug` (Task 1), `pontuar` (Task 3), nomes de campos de saldo confirmados na Task 4.
- Produces:
  - `interface Config { cidades: string[]; uf: string; nichos: Record<string, { termos: string[] }>; limites: { maxPorTermo: number; tetoUsdPorExecucao: number; lotePadrao: number }; precosUsd: { lugar: number; detalhe: number; avaliacao: number; imagem: number } }`, `carregarConfig(): Config`
  - `criarArmazem(raiz: string)` → `{ raiz, lerVistos(): Set<string>, salvarVistos(v), listarLeads(): Lead[], salvarLead(l: Lead), removerLead(slug), registrarUso(r: RegistroUso), lerUso(): RegistroUso[], gravarSistema(nome, valor), lerSistema<T>(nome, padrao: T): T }`; `type Armazem`; `interface RegistroUso { quando: string; comando: string; runId: string; gastoEstimadoUsd: number; lugares: number }`
  - `interface Saldo { limiteUsd: number; usadoUsd: number }`, `interface ClienteApify { saldo(): Promise<Saldo>; rodar(input: Record<string, unknown>, tetoUsd: number): Promise<{ runId: string; itens: unknown[] }> }`, `criarClienteApify(token: string, f?: typeof fetch): ClienteApify`
  - `podeRodar(s: Saldo, tetoUsd: number): boolean`, `mensagemSemSaldo(s: Saldo, tetoUsd: number): string`, `TETO_MINIMO_USD = 0.5`, `validarTeto(tetoUsd: number): void` (lança erro abaixo do mínimo)
  - `interface OpcoesBusca { nicho: string; cidade: string; bairro?: string; termos?: string[]; maxPorTermo?: number; tetoUsd?: number }`, `montarEntradaBusca(o, config)`, `executarBusca(o, deps: { cliente: ClienteApify; armazem: Armazem; config: Config; agora: () => Date })` → `{ lugares: number; descartes: Record<MotivoDescarte, number>; novos: Lead[] }`

- [ ] **Step 1: Criar `prospeccao/config.json` e `prospeccao/config.ts`**

`prospeccao/config.json`:
```json
{
  "cidades": ["Florianópolis", "São José", "Palhoça", "Biguaçu"],
  "uf": "Santa Catarina",
  "nichos": {
    "barbearia": { "termos": ["barbearia"] },
    "estetica": {
      "termos": [
        "design de sobrancelhas",
        "extensão de cílios",
        "esmalteria",
        "depilação",
        "harmonização facial",
        "clínica de estética",
        "salão de beleza"
      ]
    }
  },
  "limites": { "maxPorTermo": 40, "tetoUsdPorExecucao": 1.0, "lotePadrao": 25 },
  "precosUsd": { "lugar": 0.004, "detalhe": 0.002, "avaliacao": 0.0005, "imagem": 0.0005 }
}
```

`prospeccao/config.ts`:
```ts
import { readFileSync } from "node:fs";

export interface Config {
  cidades: string[];
  uf: string;
  nichos: Record<string, { termos: string[] }>;
  limites: { maxPorTermo: number; tetoUsdPorExecucao: number; lotePadrao: number };
  precosUsd: { lugar: number; detalhe: number; avaliacao: number; imagem: number };
}

export function carregarConfig(): Config {
  return JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8")) as Config;
}
```

- [ ] **Step 2: Escrever os testes que falham — armazém, custo e cliente**

`prospeccao/fixtures/lead.ts` (ajudante de teste, usado também nas Tasks 7, 11 e 12):
```ts
import type { Lead } from "../tipos.ts";

export function leadDeTeste(parcial: Partial<Lead> = {}): Lead {
  return {
    placeId: "ChIJx",
    nome: "Barbearia X",
    nicho: "barbearia",
    termo: "barbearia",
    cidade: "São José",
    bairro: "Kobrasol",
    endereco: "R. A, 1 - Kobrasol, São José - SC",
    telefone: "+55 48 99999-0001",
    celular: true,
    whatsapp: "https://wa.me/5548999990001",
    instagram: "@x",
    site: null,
    classificacao: "sem_site",
    nota: 4.7,
    avaliacoes: 80,
    mapsUrl: "https://maps.example/x",
    categoria: "Barbearia",
    fechado: false,
    slug: "barbearia-x",
    score: 80,
    fase: "candidato",
    buscadoEm: "2026-10-09T19:00:00.000Z",
    lote: null,
    detalhes: null,
    ...parcial,
  };
}
```

`prospeccao/armazem.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { leadDeTeste } from "./fixtures/lead.ts";

test("salva, lista e remove leads; ignora a pasta _sistema", () => {
  const a = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  a.salvarLead(leadDeTeste());
  a.salvarVistos(new Set(["b", "a"]));
  assert.deepEqual(a.listarLeads().map((l) => l.slug), ["barbearia-x"]);
  a.removerLead("barbearia-x");
  assert.deepEqual(a.listarLeads(), []);
});

test("vistos e uso persistem", () => {
  const a = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  assert.deepEqual([...a.lerVistos()], []);
  a.salvarVistos(new Set(["b", "a"]));
  assert.deepEqual([...a.lerVistos()], ["a", "b"]);
  a.registrarUso({ quando: "t1", comando: "buscar", runId: "r1", gastoEstimadoUsd: 0.2, lugares: 40 });
  a.registrarUso({ quando: "t2", comando: "buscar", runId: "r2", gastoEstimadoUsd: 0.1, lugares: 20 });
  assert.deepEqual(a.lerUso().map((u) => u.runId), ["r1", "r2"]);
});
```

`prospeccao/custo.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { podeRodar, mensagemSemSaldo, validarTeto } from "./custo.ts";

test("teto abaixo do mínimo da Apify é recusado", () => {
  assert.throws(() => validarTeto(0.2), /teto mínimo da Apify/);
  assert.doesNotThrow(() => validarTeto(0.5));
});

test("só roda se o saldo cobre o teto", () => {
  assert.equal(podeRodar({ limiteUsd: 5, usadoUsd: 1 }, 1), true);
  assert.equal(podeRodar({ limiteUsd: 5, usadoUsd: 4 }, 1), true);
  assert.equal(podeRodar({ limiteUsd: 5, usadoUsd: 4.5 }, 1), false);
});

test("mensagem diz quanto resta e o teto", () => {
  assert.match(mensagemSemSaldo({ limiteUsd: 5, usadoUsd: 4.5 }, 1), /restam US\$0\.50.*teto.*US\$1\.00/);
});
```

`prospeccao/apify.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { criarClienteApify } from "./apify.ts";

function fetchFalso(respostas: { url: RegExp; corpo: unknown; status?: number }[]) {
  const chamadas: { metodo: string; url: string; corpo?: string }[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    chamadas.push({ metodo: init?.method ?? "GET", url: u, corpo: init?.body as string | undefined });
    const i = respostas.findIndex((r) => r.url.test(u));
    if (i < 0) throw new Error(`URL inesperada: ${u}`);
    const [r] = respostas.splice(i, 1);
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { f, chamadas };
}

test("saldo lê limite e uso do mês", async () => {
  const { f } = fetchFalso([
    { url: /\/users\/me\/limits$/, corpo: { data: { limits: { maxMonthlyUsageUsd: 5 }, current: { monthlyUsageUsd: 1.25 } } } },
  ]);
  assert.deepEqual(await criarClienteApify("t", f).saldo(), { limiteUsd: 5, usadoUsd: 1.25 });
});

test("rodar inicia com teto, espera terminar e devolve os itens", async () => {
  const { f, chamadas } = fetchFalso([
    { url: /\/acts\/compass~crawler-google-places\/runs\?maxTotalChargeUsd=0\.5$/, corpo: { data: { id: "r1", status: "RUNNING", defaultDatasetId: "d1" } } },
    { url: /\/actor-runs\/r1\?waitForFinish=60$/, corpo: { data: { id: "r1", status: "RUNNING", defaultDatasetId: "d1" } } },
    { url: /\/actor-runs\/r1\?waitForFinish=60$/, corpo: { data: { id: "r1", status: "SUCCEEDED", defaultDatasetId: "d1" } } },
    { url: /\/datasets\/d1\/items\?clean=true&format=json$/, corpo: [{ placeId: "x" }] },
  ]);
  const r = await criarClienteApify("t", f).rodar({ searchStringsArray: ["barbearia"] }, 0.5);
  assert.deepEqual(r, { runId: "r1", itens: [{ placeId: "x" }] });
  assert.equal(chamadas[0].metodo, "POST");
  assert.deepEqual(JSON.parse(chamadas[0].corpo ?? "{}"), { searchStringsArray: ["barbearia"] });
});

test("execução que falha vira erro", async () => {
  const { f } = fetchFalso([
    { url: /\/runs\?/, corpo: { data: { id: "r2", status: "FAILED", defaultDatasetId: "d2" } } },
  ]);
  await assert.rejects(criarClienteApify("t", f).rodar({}, 1), /r2 terminou como FAILED/);
});

test("token inválido tem mensagem clara", async () => {
  const { f } = fetchFalso([{ url: /\/users\/me\/limits$/, corpo: { error: "x" }, status: 401 }]);
  await assert.rejects(criarClienteApify("t", f).saldo(), /Token da Apify inválido/);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `armazem.ts`, `custo.ts` e `apify.ts` não encontrados.

- [ ] **Step 4: Implementar `prospeccao/armazem.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Lead } from "./tipos.ts";

export interface RegistroUso {
  quando: string;
  comando: string;
  runId: string;
  gastoEstimadoUsd: number;
  lugares: number;
}

export function criarArmazem(raiz: string) {
  const pastaLeads = join(raiz, "leads");
  const pastaSistema = join(pastaLeads, "_sistema");
  const ler = <T>(arquivo: string, padrao: T): T =>
    existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, "utf8")) as T) : padrao;
  const gravar = (arquivo: string, valor: unknown) => {
    mkdirSync(dirname(arquivo), { recursive: true });
    writeFileSync(arquivo, JSON.stringify(valor, null, 2) + "\n");
  };
  return {
    raiz,
    lerVistos: () => new Set(ler<string[]>(join(pastaSistema, "vistos.json"), [])),
    salvarVistos: (v: ReadonlySet<string>) => gravar(join(pastaSistema, "vistos.json"), [...v].sort()),
    listarLeads: (): Lead[] =>
      existsSync(pastaLeads)
        ? readdirSync(pastaLeads)
            .filter((f) => f.endsWith(".json"))
            .sort()
            .map((f) => JSON.parse(readFileSync(join(pastaLeads, f), "utf8")) as Lead)
        : [],
    salvarLead: (l: Lead) => gravar(join(pastaLeads, `${l.slug}.json`), l),
    removerLead: (slug: string) => rmSync(join(pastaLeads, `${slug}.json`), { force: true }),
    registrarUso: (r: RegistroUso) =>
      gravar(join(pastaSistema, "uso.json"), [...ler<RegistroUso[]>(join(pastaSistema, "uso.json"), []), r]),
    lerUso: () => ler<RegistroUso[]>(join(pastaSistema, "uso.json"), []),
    gravarSistema: (nome: string, valor: unknown) => gravar(join(pastaSistema, nome), valor),
    lerSistema: <T>(nome: string, padrao: T): T => ler<T>(join(pastaSistema, nome), padrao),
  };
}

export type Armazem = ReturnType<typeof criarArmazem>;
```

- [ ] **Step 5: Implementar `prospeccao/custo.ts`**

```ts
import type { Saldo } from "./apify.ts";

export function podeRodar(s: Saldo, tetoUsd: number): boolean {
  return s.limiteUsd - s.usadoUsd >= tetoUsd;
}

export function mensagemSemSaldo(s: Saldo, tetoUsd: number): string {
  const resta = Math.max(0, s.limiteUsd - s.usadoUsd);
  return `Saldo da Apify insuficiente: restam US$${resta.toFixed(2)} e o teto desta execução é US$${tetoUsd.toFixed(2)}. Espere o próximo ciclo mensal ou use um --teto-usd menor (mínimo US$${TETO_MINIMO_USD.toFixed(2)}).`;
}

export const TETO_MINIMO_USD = 0.5;

export function validarTeto(tetoUsd: number): void {
  if (!(tetoUsd >= TETO_MINIMO_USD)) {
    throw new Error(`O teto mínimo da Apify por execução é US$${TETO_MINIMO_USD.toFixed(2)} (recebido: ${tetoUsd}).`);
  }
}
```

- [ ] **Step 6: Implementar `prospeccao/apify.ts`**

Se a Task 4 confirmou outros nomes para o saldo, use-os em `saldo()`.

```ts
const BASE = "https://api.apify.com/v2";
export const ATOR = "compass~crawler-google-places";
const FINAIS = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"];

export interface Saldo {
  limiteUsd: number;
  usadoUsd: number;
}

export interface ClienteApify {
  saldo(): Promise<Saldo>;
  rodar(input: Record<string, unknown>, tetoUsd: number): Promise<{ runId: string; itens: unknown[] }>;
}

export function criarClienteApify(token: string, f: typeof fetch = fetch): ClienteApify {
  async function pedir(caminho: string, init: RequestInit = {}): Promise<any> {
    const r = await f(`${BASE}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (r.status === 401) throw new Error("Token da Apify inválido. Confira APIFY_TOKEN no arquivo .env.");
    if (!r.ok) throw new Error(`Apify respondeu ${r.status} em ${caminho}: ${await r.text()}`);
    return r.json();
  }

  return {
    async saldo() {
      const { data } = await pedir("/users/me/limits");
      return { limiteUsd: data.limits.maxMonthlyUsageUsd, usadoUsd: data.current.monthlyUsageUsd };
    },
    async rodar(input, tetoUsd) {
      let { data: run } = await pedir(`/acts/${ATOR}/runs?maxTotalChargeUsd=${tetoUsd}`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      while (!FINAIS.includes(run.status)) {
        ({ data: run } = await pedir(`/actor-runs/${run.id}?waitForFinish=60`));
      }
      if (run.status !== "SUCCEEDED") throw new Error(`A execução ${run.id} terminou como ${run.status}.`);
      const itens = await pedir(`/datasets/${run.defaultDatasetId}/items?clean=true&format=json`);
      return { runId: run.id as string, itens: itens as unknown[] };
    },
  };
}
```

- [ ] **Step 7: Rodar os testes destes módulos**

Run: `npm test`
Expected: testes de armazém, custo e cliente PASS.

- [ ] **Step 8: Escrever o teste que falha — `prospeccao/buscar.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { executarBusca, montarEntradaBusca } from "./buscar.ts";
import type { ClienteApify, Saldo } from "./apify.ts";
import type { Config } from "./config.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/lugar-busca.json", import.meta.url), "utf8")) as unknown[];
const config: Config = {
  cidades: ["Florianópolis", "São José", "Palhoça", "Biguaçu"],
  uf: "Santa Catarina",
  nichos: { barbearia: { termos: ["barbearia"] } },
  limites: { maxPorTermo: 40, tetoUsdPorExecucao: 1, lotePadrao: 25 },
  precosUsd: { lugar: 0.004, detalhe: 0.002, avaliacao: 0.0005, imagem: 0.0005 },
};
const agora = () => new Date("2026-10-09T19:00:00.000Z");

function clienteFalso(saldos: Saldo[], itens: unknown[] | Error) {
  let rodou = 0;
  const cliente: ClienteApify = {
    saldo: async () => saldos.shift() ?? { limiteUsd: 5, usadoUsd: 1 },
    rodar: async () => {
      rodou++;
      if (itens instanceof Error) throw itens;
      return { runId: "r1", itens };
    },
  };
  return { cliente, rodou: () => rodou };
}

test("monta a entrada barata, sem filtro de website", () => {
  const e = montarEntradaBusca({ nicho: "barbearia", cidade: "São José", bairro: "Kobrasol" }, config);
  assert.equal(e.locationQuery, "Kobrasol, São José, Santa Catarina, Brasil");
  assert.deepEqual(e.searchStringsArray, ["barbearia"]);
  assert.equal(e.maxCrawledPlacesPerSearch, 40);
  assert.equal(e.scrapePlaceDetailPage, false);
  assert.equal(e.maxImages, 0);
  assert.equal(e.maxReviews, 0);
  assert.equal("website" in e, false);
  assert.equal("skipClosedPlaces" in e, false);
});

test("nicho ou cidade fora da config dão erro", () => {
  assert.throws(() => montarEntradaBusca({ nicho: "padaria", cidade: "São José" }, config), /Nicho desconhecido/);
  assert.throws(() => montarEntradaBusca({ nicho: "barbearia", cidade: "Curitiba" }, config), /Cidade fora da região/);
});

test("grava candidatos, vistos e gasto", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente } = clienteFalso([], fixture);
  const r = await executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente, armazem, config, agora });
  assert.equal(r.lugares, 3);
  assert.deepEqual(r.novos.map((l) => l.slug), ["barbearia-teste-kobrasol", "studio-teste-sobrancelhas"]);
  assert.equal(r.descartes.site_proprio, 1);
  assert.equal(armazem.listarLeads().length, 2);
  assert.equal(armazem.lerVistos().size, 3);
  const [uso] = armazem.lerUso();
  assert.ok(Math.abs(uso.gastoEstimadoUsd - 3 * 0.004) < 1e-9);
  assert.equal(uso.lugares, 3);
});

test("repetir a busca não duplica leads", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  await executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente: clienteFalso([], fixture).cliente, armazem, config, agora });
  const r = await executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente: clienteFalso([], fixture).cliente, armazem, config, agora });
  assert.equal(r.novos.length, 0);
  assert.equal(r.descartes.ja_visto, 3);
  assert.equal(armazem.listarLeads().length, 2);
});

test("sem saldo não roda o ator", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente, rodou } = clienteFalso([{ limiteUsd: 5, usadoUsd: 4.5 }], fixture);
  await assert.rejects(executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente, armazem, config, agora }), /Saldo da Apify insuficiente/);
  assert.equal(rodou(), 0);
});

test("teto abaixo de US$0,50 é recusado antes de chamar a Apify", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente, rodou } = clienteFalso([], fixture);
  await assert.rejects(
    executarBusca({ nicho: "barbearia", cidade: "São José", tetoUsd: 0.2 }, { cliente, armazem, config, agora }),
    /teto mínimo/,
  );
  assert.equal(rodou(), 0);
});

test("falha da Apify não grava nada", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente } = clienteFalso([], new Error("A execução r9 terminou como TIMED-OUT."));
  await assert.rejects(executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente, armazem, config, agora }), /TIMED-OUT/);
  assert.equal(armazem.listarLeads().length, 0);
  assert.equal(armazem.lerVistos().size, 0);
  assert.equal(armazem.lerUso().length, 0);
});
```

- [ ] **Step 9: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `buscar.ts` não encontrado.

- [ ] **Step 10: Implementar `prospeccao/buscar.ts`**

```ts
import type { ClienteApify } from "./apify.ts";
import type { Armazem } from "./armazem.ts";
import type { Config } from "./config.ts";
import type { Lead } from "./tipos.ts";
import { converterLugar } from "./doApify.ts";
import { selecionarCandidatos } from "./filtro.ts";
import { gerarSlug } from "./slug.ts";
import { pontuar } from "./pontuacao.ts";
import { mensagemSemSaldo, podeRodar, validarTeto } from "./custo.ts";

export interface OpcoesBusca {
  nicho: string;
  cidade: string;
  bairro?: string;
  termos?: string[];
  maxPorTermo?: number;
  tetoUsd?: number;
}

export function montarEntradaBusca(o: OpcoesBusca, config: Config) {
  const termos = o.termos?.length ? o.termos : config.nichos[o.nicho]?.termos;
  if (!termos) throw new Error(`Nicho desconhecido: ${o.nicho}. Use: ${Object.keys(config.nichos).join(", ")}.`);
  if (!config.cidades.includes(o.cidade)) {
    throw new Error(`Cidade fora da região: ${o.cidade}. Use: ${config.cidades.join(", ")}.`);
  }
  return {
    searchStringsArray: termos,
    locationQuery: [o.bairro, o.cidade, config.uf, "Brasil"].filter(Boolean).join(", "),
    maxCrawledPlacesPerSearch: o.maxPorTermo ?? config.limites.maxPorTermo,
    language: "pt-BR",
    scrapePlaceDetailPage: false,
    maxImages: 0,
    maxReviews: 0,
  };
}

export async function executarBusca(
  o: OpcoesBusca,
  deps: { cliente: ClienteApify; armazem: Armazem; config: Config; agora: () => Date },
) {
  const entrada = montarEntradaBusca(o, deps.config);
  const teto = o.tetoUsd ?? deps.config.limites.tetoUsdPorExecucao;
  validarTeto(teto);
  const antes = await deps.cliente.saldo();
  if (!podeRodar(antes, teto)) throw new Error(mensagemSemSaldo(antes, teto));

  const { runId, itens } = await deps.cliente.rodar(entrada, teto);

  const brutos = itens.map((i) => converterLugar(i, o.nicho)).filter((b) => b !== null);
  const vistos = deps.armazem.lerVistos();
  const { candidatos, descartes } = selecionarCandidatos(brutos, vistos, deps.config.cidades);
  const slugs = new Set(deps.armazem.listarLeads().map((l) => l.slug));
  const agoraISO = deps.agora().toISOString();
  const novos = candidatos.map((c): Lead => {
    const slug = gerarSlug(c.nome, slugs);
    slugs.add(slug);
    return { ...c, slug, score: pontuar(c), fase: "candidato", buscadoEm: agoraISO, lote: null, detalhes: null };
  });

  for (const l of novos) deps.armazem.salvarLead(l);
  for (const b of brutos) vistos.add(b.placeId);
  deps.armazem.salvarVistos(vistos);

  // Estimativa: a Apify só registra o gasto real alguns minutos depois da execução.
  deps.armazem.registrarUso({
    quando: agoraISO,
    comando: ["buscar", o.nicho, o.cidade, o.bairro].filter(Boolean).join(" "),
    runId,
    gastoEstimadoUsd: itens.length * deps.config.precosUsd.lugar,
    lugares: itens.length,
  });
  return { lugares: itens.length, descartes, novos: novos.sort((a, b) => b.score - a.score) };
}
```

- [ ] **Step 11: Implementar `prospeccao/cli/buscar.ts`**

```ts
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { criarClienteApify } from "../apify.ts";
import { executarBusca } from "../buscar.ts";

const USO =
  'Uso: npm run buscar -- --nicho barbearia --cidade "São José" [--bairro Kobrasol] [--termos "a,b"] [--max-por-termo 40] [--teto-usd 1]';

const { values } = parseArgs({
  options: {
    nicho: { type: "string" },
    cidade: { type: "string" },
    bairro: { type: "string" },
    termos: { type: "string" },
    "max-por-termo": { type: "string" },
    "teto-usd": { type: "string" },
  },
});

const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("Falta APIFY_TOKEN no arquivo .env (modelo em .env.example).");
  process.exit(1);
}
if (!values.nicho || !values.cidade) {
  console.error(USO);
  process.exit(1);
}

try {
  const r = await executarBusca(
    {
      nicho: values.nicho,
      cidade: values.cidade,
      bairro: values.bairro,
      termos: values.termos?.split(",").map((t) => t.trim()).filter(Boolean),
      maxPorTermo: values["max-por-termo"] ? Number(values["max-por-termo"]) : undefined,
      tetoUsd: values["teto-usd"] ? Number(values["teto-usd"]) : undefined,
    },
    {
      cliente: criarClienteApify(token),
      armazem: criarArmazem(fileURLToPath(new URL("../../", import.meta.url))),
      config: carregarConfig(),
      agora: () => new Date(),
    },
  );
  const descartes = Object.entries(r.descartes).filter(([, n]) => n > 0).map(([m, n]) => `${m}: ${n}`);
  console.log(`${r.lugares} lugares encontrados · ${r.novos.length} candidatos novos`);
  console.log(`Descartados: ${descartes.join(" · ") || "nenhum"}`);
  console.table(
    r.novos.slice(0, 15).map((l) => ({
      score: l.score,
      nome: l.nome,
      bairro: l.bairro ?? "",
      tipo: l.classificacao,
      nota: l.nota ?? "-",
      avaliacoes: l.avaliacoes,
      celular: l.celular ? "sim" : "não",
    })),
  );
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
```

- [ ] **Step 12: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 13: Rodar uma busca real pequena**

Run: `npm run buscar -- --nicho barbearia --cidade "São José" --bairro Kobrasol --max-por-termo 10 --teto-usd 0.5`
Expected: linha "N lugares encontrados · M candidatos novos", tabela com os candidatos, arquivos novos em `leads/` e uma entrada em `leads/_sistema/uso.json`.

- [ ] **Step 14: Commit**

```bash
git add prospeccao/config.json prospeccao/config.ts prospeccao/fixtures/lead.ts prospeccao/armazem.ts prospeccao/armazem.test.ts prospeccao/apify.ts prospeccao/apify.test.ts prospeccao/custo.ts prospeccao/custo.test.ts prospeccao/buscar.ts prospeccao/buscar.test.ts prospeccao/cli/buscar.ts
git commit -m "feat(prospeccao): add buscar command with Apify client and spend guard"
```

---

### Task 7: Comando `lote` e documentos do painel

**Files:**
- Create: `prospeccao/datas.ts`, `prospeccao/lote.ts`, `prospeccao/cli/lote.ts`
- Test: `prospeccao/datas.test.ts`, `prospeccao/lote.test.ts`

**Interfaces:**
- Consumes: `Lead` (Task 1), `criarArmazem`, `carregarConfig` (Task 6), `leadDeTeste` de `prospeccao/fixtures/lead.ts` (Task 6).
- Produces:
  - `hojeEmSaoPaulo(agora: Date): string` (formato `AAAA-MM-DD`)
  - `escolherLote(leads: Lead[], quantidade: number, filtro?: { nicho?: string; cidade?: string }): Lead[]`
  - `paraPainel(l: Lead, agoraISO: string): { id: string; data: DocumentoPainel }` e `interface DocumentoPainel` (formato de cada documento da coleção `leads` do painel — a Task 9 lê exatamente estes campos)
  - Arquivo `leads/_sistema/painel-lote.json`: array de `{ id, data }`.

- [ ] **Step 1: Escrever os testes que falham**

`prospeccao/datas.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { hojeEmSaoPaulo } from "./datas.ts";

test("usa o fuso de São Paulo", () => {
  assert.equal(hojeEmSaoPaulo(new Date("2026-10-10T01:30:00Z")), "2026-10-09");
  assert.equal(hojeEmSaoPaulo(new Date("2026-10-10T03:30:00Z")), "2026-10-10");
});
```

`prospeccao/lote.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { escolherLote, paraPainel } from "./lote.ts";
import { leadDeTeste } from "./fixtures/lead.ts";

const leads = [
  leadDeTeste({ slug: "a", score: 40 }),
  leadDeTeste({ slug: "b", score: 90 }),
  leadDeTeste({ slug: "c", score: 70, nicho: "estetica", cidade: "Florianópolis" }),
  leadDeTeste({ slug: "d", score: 99, fase: "lote", lote: "2026-10-08" }),
];

test("pega só candidatos, do maior score para o menor", () => {
  assert.deepEqual(escolherLote(leads, 2).map((l) => l.slug), ["b", "c"]);
});

test("respeita nicho e cidade", () => {
  assert.deepEqual(escolherLote(leads, 25, { nicho: "estetica" }).map((l) => l.slug), ["c"]);
  assert.deepEqual(escolherLote(leads, 25, { cidade: "São José" }).map((l) => l.slug), ["b", "a"]);
});

test("documento do painel começa como novo, com histórico e links", () => {
  const { id, data } = paraPainel(leadDeTeste({ slug: "b", instagram: "@barbeariab" }), "2026-10-09T19:00:00.000Z");
  assert.equal(id, "b");
  assert.equal(data.slug, "b");
  assert.equal(data.status, "novo");
  assert.deepEqual(data.historico, [{ status: "novo", em: "2026-10-09T19:00:00.000Z" }]);
  assert.equal(data.instagramUrl, "https://www.instagram.com/barbeariab/");
  assert.equal(data.previaUrl, null);
  assert.equal(data.notas, "");
  assert.equal(data.plano, null);
  assert.equal(data.precoMensal, null);
  assert.equal(data.motivoPerda, null);
  assert.equal(data.limpo, false);
});

test("sem Instagram, sem link", () => {
  assert.equal(paraPainel(leadDeTeste({ instagram: null }), "t").data.instagramUrl, null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `datas.ts` e `lote.ts` não encontrados.

- [ ] **Step 3: Implementar `prospeccao/datas.ts`**

```ts
export function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}
```

- [ ] **Step 4: Implementar `prospeccao/lote.ts`**

```ts
import type { Classificacao, Lead } from "./tipos.ts";

export interface DocumentoPainel {
  slug: string;
  placeId: string;
  nome: string | null;
  nicho: string;
  cidade: string;
  bairro: string | null;
  endereco: string | null;
  telefone: string | null;
  celular: boolean;
  whatsapp: string | null;
  instagram: string | null;
  instagramUrl: string | null;
  classificacao: Classificacao;
  nota: number | null;
  avaliacoes: number | null;
  mapsUrl: string | null;
  score: number;
  previaUrl: string | null;
  status: string;
  proximoContato: string | null;
  notas: string;
  historico: { status: string; em: string }[];
  plano: string | null;
  precoMensal: number | null;
  motivoPerda: string | null;
  limpo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export function escolherLote(
  leads: Lead[],
  quantidade: number,
  filtro: { nicho?: string; cidade?: string } = {},
): Lead[] {
  return leads
    .filter(
      (l) =>
        l.fase === "candidato" &&
        (!filtro.nicho || l.nicho === filtro.nicho) &&
        (!filtro.cidade || l.cidade === filtro.cidade),
    )
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, quantidade);
}

export function paraPainel(l: Lead, agoraISO: string): { id: string; data: DocumentoPainel } {
  return {
    id: l.slug,
    data: {
      slug: l.slug,
      placeId: l.placeId,
      nome: l.nome,
      nicho: l.nicho,
      cidade: l.cidade,
      bairro: l.bairro,
      endereco: l.endereco,
      telefone: l.telefone,
      celular: l.celular,
      whatsapp: l.whatsapp,
      instagram: l.instagram,
      instagramUrl: l.instagram ? `https://www.instagram.com/${l.instagram.slice(1)}/` : null,
      classificacao: l.classificacao,
      nota: l.nota,
      avaliacoes: l.avaliacoes,
      mapsUrl: l.mapsUrl,
      score: l.score,
      previaUrl: null,
      status: "novo",
      proximoContato: null,
      notas: "",
      historico: [{ status: "novo", em: agoraISO }],
      plano: null,
      precoMensal: null,
      motivoPerda: null,
      limpo: false,
      criadoEm: agoraISO,
      atualizadoEm: agoraISO,
    },
  };
}
```

- [ ] **Step 5: Implementar `prospeccao/cli/lote.ts`**

```ts
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { escolherLote, paraPainel } from "../lote.ts";
import { hojeEmSaoPaulo } from "../datas.ts";

const { values } = parseArgs({
  options: { quantidade: { type: "string" }, nicho: { type: "string" }, cidade: { type: "string" } },
});
const config = carregarConfig();
const armazem = criarArmazem(fileURLToPath(new URL("../../", import.meta.url)));
const agora = new Date();
const quantidade = values.quantidade ? Number(values.quantidade) : config.limites.lotePadrao;

const lote = escolherLote(armazem.listarLeads(), quantidade, { nicho: values.nicho, cidade: values.cidade });
if (lote.length === 0) {
  console.log("Nenhum candidato disponível. Rode `npm run buscar` antes.");
  process.exit(0);
}
const hoje = hojeEmSaoPaulo(agora);
for (const l of lote) armazem.salvarLead({ ...l, fase: "lote", lote: hoje });
armazem.gravarSistema("painel-lote.json", lote.map((l) => paraPainel(l, agora.toISOString())));
console.log(`Lote de ${hoje}: ${lote.length} leads → leads/_sistema/painel-lote.json`);
console.table(lote.map((l) => ({ score: l.score, nome: l.nome, cidade: l.cidade, telefone: l.telefone })));
```

- [ ] **Step 6: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 7: Commit**

```bash
git add prospeccao/datas.ts prospeccao/datas.test.ts prospeccao/lote.ts prospeccao/lote.test.ts prospeccao/cli/lote.ts
git commit -m "feat(prospeccao): pick daily batch and export panel documents"
```

---

### Task 8: Painel — regras puras (`painel/logica.js`)

**Files:**
- Create: `painel/logica.js`
- Test: `painel/logica.test.ts`
- Modify: `package.json` (script `test` passa a incluir `painel/`)

**Interfaces:**
- Consumes: formato `DocumentoPainel` (Task 7).
- Produces (exportados de `painel/logica.js`, usados pela página na Task 9):
  - `STATUS`, `MOTIVOS`, `PLANOS` (arrays `{ id, rotulo, ... }`), `TABELA_PADRAO = { solo: 59, equipe: 89, casaCheia: 129 }`
  - `hojeLocal(agora?: Date): string`, `somarDias(dataISO: string, n: number): string`
  - `visaoDe(lead, hoje): "ligar" | "depois" | "negociacao" | "fechados" | "perdidos" | "arquivados"`
  - `filtrarLeads(leads, { visao, nicho, cidade }, hoje)`, `ordenarLeads(leads, hoje)`, `contagens(leads, hoje)`
  - `precisaDeMotivo(status): boolean`, `precisaDePlano(status): boolean`
  - `mudarStatus(lead, novo, agoraISO, extras?: { motivoPerda?, plano?, precoMensal? })` → patch para `update`
  - `indicadorPreco(leads, tabela)` → `{ amostra, recusasPreco, sugestao: "aguardar" | "subir" | "manter" | "descer" }`
  - `ajustarTabela(tabela, delta)`, `formatarReais(n)`, `dataCurta(dataISO)`, `dataHora(iso)`
  - `rotuloStatus(id)`, `rotuloMotivo(id)`, `rotuloPlano(id)`

- [ ] **Step 1: Incluir o painel no script de testes**

Em `package.json`, troque a linha do `test` por:
```json
"test": "node --test \"prospeccao/**/*.test.ts\" \"painel/**/*.test.ts\"",
```

- [ ] **Step 2: Escrever o teste que falha — `painel/logica.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hojeLocal, somarDias, visaoDe, filtrarLeads, ordenarLeads, contagens, mudarStatus,
  indicadorPreco, ajustarTabela, formatarReais, dataCurta, precisaDeMotivo, precisaDePlano, TABELA_PADRAO,
} from "./logica.js";

const HOJE = "2026-10-13";
const lead = (p: Record<string, unknown> = {}) => ({
  slug: "x", nome: "X", nicho: "barbearia", cidade: "São José", telefone: "+55 48 99999-0001", score: 50,
  status: "novo", proximoContato: null, historico: [{ status: "novo", em: "2026-10-09T19:00:00.000Z" }],
  plano: null, precoMensal: null, motivoPerda: null, limpo: false, atualizadoEm: "2026-10-09T19:00:00.000Z",
  ...p,
});

test("datas", () => {
  assert.equal(hojeLocal(new Date("2026-10-10T01:30:00Z")), "2026-10-09");
  assert.equal(somarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(dataCurta("2026-10-12"), "12/10");
});

test("visão de cada lead", () => {
  assert.equal(visaoDe(lead(), HOJE), "ligar");
  assert.equal(visaoDe(lead({ status: "sem_resposta", proximoContato: "2026-10-13" }), HOJE), "ligar");
  assert.equal(visaoDe(lead({ status: "retornar", proximoContato: "2026-10-20" }), HOJE), "depois");
  assert.equal(visaoDe(lead({ status: "interessado" }), HOJE), "negociacao");
  assert.equal(visaoDe(lead({ status: "fechou" }), HOJE), "fechados");
  assert.equal(visaoDe(lead({ status: "perdeu" }), HOJE), "perdidos");
});

test("arquivado ou sem telefone não aparece para ligar", () => {
  assert.equal(visaoDe(lead({ limpo: true, telefone: null }), HOJE), "arquivados");
  assert.equal(visaoDe(lead({ telefone: null }), HOJE), "arquivados");
  const leads = [lead({ slug: "a" }), lead({ slug: "b", limpo: true, telefone: null })];
  assert.deepEqual(filtrarLeads(leads, { visao: "ligar", nicho: "", cidade: "" }, HOJE).map((l: any) => l.slug), ["a"]);
  assert.deepEqual(filtrarLeads(leads, { visao: "todos", nicho: "", cidade: "" }, HOJE).map((l: any) => l.slug), ["a", "b"]);
});

test("filtra por nicho e cidade", () => {
  const leads = [lead({ slug: "a" }), lead({ slug: "b", nicho: "estetica", cidade: "Palhoça" })];
  assert.deepEqual(filtrarLeads(leads, { visao: "todos", nicho: "estetica", cidade: "" }, HOJE).map((l: any) => l.slug), ["b"]);
  assert.deepEqual(filtrarLeads(leads, { visao: "todos", nicho: "", cidade: "São José" }, HOJE).map((l: any) => l.slug), ["a"]);
});

test("ordem: retornos vencidos, depois sem data por score, depois futuros, finais no fim", () => {
  const leads = [
    lead({ slug: "final", status: "fechou", atualizadoEm: "2026-10-12T10:00:00Z" }),
    lead({ slug: "futuro", status: "retornar", proximoContato: "2026-10-15" }),
    lead({ slug: "semdata-baixo", score: 20 }),
    lead({ slug: "semdata-alto", score: 90 }),
    lead({ slug: "vencido-ontem", status: "retornar", proximoContato: "2026-10-12" }),
    lead({ slug: "vencido-hoje", status: "sem_resposta", proximoContato: "2026-10-13" }),
  ];
  assert.deepEqual(ordenarLeads(leads, HOJE).map((l: any) => l.slug), [
    "vencido-ontem", "vencido-hoje", "semdata-alto", "semdata-baixo", "futuro", "final",
  ]);
});

test("contagens do resumo", () => {
  const c = contagens([
    lead(), lead({ status: "retornar", proximoContato: "2026-10-13" }), lead({ status: "interessado" }),
    lead({ status: "fechou" }), lead({ status: "perdeu" }), lead({ limpo: true, telefone: null }),
  ], HOJE);
  assert.deepEqual(c, { ligar: 2, vencidos: 1, depois: 0, negociacao: 1, fechados: 1, perdidos: 1, arquivados: 1 });
});

test("perdeu exige motivo e limpa o próximo contato", () => {
  assert.equal(precisaDeMotivo("perdeu"), true);
  assert.throws(() => mudarStatus(lead(), "perdeu", "t1"), /motivo/);
  const p = mudarStatus(lead({ proximoContato: "2026-10-20" }), "perdeu", "t1", { motivoPerda: "preco" });
  assert.equal(p.status, "perdeu");
  assert.equal(p.motivoPerda, "preco");
  assert.equal(p.proximoContato, null);
  assert.deepEqual(p.historico.at(-1), { status: "perdeu", em: "t1" });
  assert.equal(p.atualizadoEm, "t1");
});

test("interessado, reunião e fechou exigem plano e preço", () => {
  assert.equal(precisaDePlano("interessado"), true);
  assert.equal(precisaDePlano("sem_resposta"), false);
  assert.throws(() => mudarStatus(lead(), "interessado", "t1"), /plano/);
  const p = mudarStatus(lead(), "interessado", "t1", { plano: "equipe", precoMensal: 89 });
  assert.equal(p.plano, "equipe");
  assert.equal(p.precoMensal, 89);
  const q = mudarStatus(lead({ status: "interessado", plano: "equipe", precoMensal: 89 }), "fechou", "t2");
  assert.equal(q.plano, "equipe");
  assert.equal(q.proximoContato, null);
});

test("voltar de perdeu limpa o motivo; status desconhecido dá erro", () => {
  assert.equal(mudarStatus(lead({ status: "perdeu", motivoPerda: "preco" }), "retornar", "t1").motivoPerda, null);
  assert.throws(() => mudarStatus(lead(), "sumiu", "t1"), /Status desconhecido/);
});

test("indicador de preço usa só decididos com a tabela atual", () => {
  const tabela = { ...TABELA_PADRAO };
  const decidido = (i: number, status: string, motivo: string | null = null, preco = 89) =>
    lead({
      slug: `d${i}`, status, plano: "equipe", precoMensal: preco, motivoPerda: motivo,
      historico: [{ status: "interessado", em: `2026-10-0${i % 9 + 1}T10:00:00Z` }, { status, em: `2026-10-1${i % 9}T10:00:00Z` }],
    });
  const nove = Array.from({ length: 9 }, (_, i) => decidido(i, "fechou"));
  assert.equal(indicadorPreco(nove, tabela).sugestao, "aguardar");
  assert.equal(indicadorPreco(nove, tabela).amostra, 9);
  const dez = [...nove, decidido(9, "fechou")];
  assert.equal(indicadorPreco(dez, tabela).sugestao, "subir");
  const umaRecusa = [...nove, decidido(9, "perdeu", "preco")];
  assert.deepEqual(indicadorPreco(umaRecusa, tabela), { amostra: 10, recusasPreco: 1, sugestao: "manter" });
  const duas = [...nove.slice(1), decidido(9, "perdeu", "preco"), decidido(10, "perdeu", "preco")];
  assert.equal(indicadorPreco(duas, tabela).sugestao, "descer");
  const outraTabela = [...nove, decidido(9, "perdeu", "preco", 79)];
  assert.equal(indicadorPreco(outraTabela, tabela).amostra, 9);
});

test("ajuste e formato de preço", () => {
  assert.deepEqual(ajustarTabela(TABELA_PADRAO, 10), { solo: 69, equipe: 99, casaCheia: 139 });
  assert.equal(formatarReais(59), "R$ 59");
  assert.equal(formatarReais(59.9), "R$ 59,90");
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `painel/logica.js` não encontrado.

- [ ] **Step 4: Implementar `painel/logica.js`**

```js
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
```

- [ ] **Step 5: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
git add package.json painel/logica.js painel/logica.test.ts
git commit -m "feat(painel): add pure lead-tracking rules and price indicator"
```

---

### Task 9: Painel — página, build e publicação

**Files:**
- Create: `painel/pagina.html`, `painel/construir.ts`
- Test: `painel/construir.test.ts`
- Gera (fora do git): `painel/dist/caderno.html`
- Modify: `package.json` (script `painel:construir`)

**Interfaces:**
- Consumes: tudo que `painel/logica.js` exporta (Task 8); documentos `leads/<slug>` no formato `DocumentoPainel` (Task 7); documento `config/oferta` = `{ solo, equipe, casaCheia, atualizadoEm }`.
- Produces: artifact privado "Caderno de Ligações" com capability `db`; coleção `leads` (id do documento = slug) e documento `config/oferta`. A URL do artifact fica na memória do projeto.

Antes de escrever a página, carregue as skills `artifact-design` e `artifact-capabilities` (exigência do Artifact). O código abaixo já segue o contrato delas: tokens de cor com tema escuro, `claude.use("db")` com ramo para `null`, uma escrita por vez por documento, inscrição única em `onSnapshot`, número de telefone selecionável com botão de copiar (links `tel:` podem não abrir dentro do artifact), sem `alert/confirm/prompt`, campos de 16px (sem zoom no iPhone), `prefers-reduced-motion`.

- [ ] **Step 1: Adicionar o script de build**

Em `package.json`, acrescente em `scripts`:
```json
"painel:construir": "node painel/construir.ts"
```

- [ ] **Step 2: Escrever o teste que falha — `painel/construir.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../", import.meta.url));

test("gera caderno.html com a lógica embutida e script válido", () => {
  const build = spawnSync(process.execPath, ["painel/construir.ts"], { cwd: raiz, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const html = readFileSync(join(raiz, "painel/dist/caderno.html"), "utf8");
  assert.ok(html.startsWith("<title>Caderno de Ligações</title>"));
  assert.ok(!html.includes("/*__LOGICA__*/"));
  assert.ok(html.includes("export function mudarStatus"));
  const script = html.split('<script type="module">')[1]?.split("</script>")[0];
  assert.ok(script, "script module não encontrado");
  const arquivo = join(mkdtempSync(join(tmpdir(), "caderno-")), "pagina.mjs");
  writeFileSync(arquivo, script);
  const checagem = spawnSync(process.execPath, ["--check", arquivo], { encoding: "utf8" });
  assert.equal(checagem.status, 0, checagem.stderr);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `painel/construir.ts` não existe (status ≠ 0).

- [ ] **Step 4: Implementar `painel/construir.ts`**

```ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const caminho = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const MARCA = "/*__LOGICA__*/";

const pagina = readFileSync(caminho("./pagina.html"), "utf8");
if (!pagina.includes(MARCA)) throw new Error(`painel/pagina.html precisa conter ${MARCA}`);
const logica = readFileSync(caminho("./logica.js"), "utf8");

mkdirSync(caminho("./dist/"), { recursive: true });
writeFileSync(caminho("./dist/caderno.html"), pagina.replace(MARCA, () => logica));
console.log("painel/dist/caderno.html gerado");
```

- [ ] **Step 5: Escrever `painel/pagina.html`**

Direção: ferramenta de bolso para ligar, uma coluna para o polegar. Atkinson Hyperlegible Next na interface e Atkinson Hyperlegible Mono nos números (telefone legível na hora de discar). Neutros frios levemente azulados, azul-tinta como destaque, verde só no "Ligar", cores de status semânticas.

```html
<title>Caderno de Ligações</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:wght@400;600;800&display=swap">
<style>
/* Layout: coluna única para o polegar — resumo, filtros, cartões que abrem no lugar; aba Roteiro à parte */
:root {
  --bg: #f2f4f6;
  --surface: #ffffff;
  --ink: #16212c;
  --muted: #586572;
  --line: #d6dce3;
  --chip: #e6eaef;
  --accent: #1d5bb8;
  --accent-ink: #ffffff;
  --call: #11724a;
  --call-ink: #ffffff;
  --st-novo: #586572;
  --st-sem: #8a5a00;
  --st-retornar: #1d5bb8;
  --st-neg: #7440b0;
  --st-fechou: #11724a;
  --st-perdeu: #b0261d;
  --font-ui: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-num: "Atkinson Hyperlegible Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --raio: 10px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f151b; --surface: #17212a; --ink: #e6edf3; --muted: #97a4b1; --line: #28343f; --chip: #1f2a35;
    --accent: #6ea6ff; --accent-ink: #0f151b; --call: #49c98a; --call-ink: #0f151b;
    --st-novo: #97a4b1; --st-sem: #e2aa4c; --st-retornar: #6ea6ff; --st-neg: #b98ff0; --st-fechou: #49c98a; --st-perdeu: #f28479;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0f151b; --surface: #17212a; --ink: #e6edf3; --muted: #97a4b1; --line: #28343f; --chip: #1f2a35;
  --accent: #6ea6ff; --accent-ink: #0f151b; --call: #49c98a; --call-ink: #0f151b;
  --st-novo: #97a4b1; --st-sem: #e2aa4c; --st-retornar: #6ea6ff; --st-neg: #b98ff0; --st-fechou: #49c98a; --st-perdeu: #f28479;
  color-scheme: dark;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  background: var(--bg); color: var(--ink); font-family: var(--font-ui); font-size: 16px; line-height: 1.45;
  padding-inline: 16px; padding-block: 0 56px; -webkit-tap-highlight-color: transparent;
}
.casca { max-width: 720px; margin-inline: auto; display: grid; gap: 14px; }
.topo {
  position: sticky; top: env(safe-area-inset-top, 0px); z-index: 2; background: var(--bg);
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding-block: 12px 10px; border-bottom: 1px solid var(--line);
}
h1 { margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.01em; text-wrap: balance; }
h2 { margin: 0; font-size: 1.05rem; font-weight: 800; text-wrap: balance; }
button, select, input, textarea { font: inherit; color: inherit; }
button { cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; transition: transform 120ms ease-out; }
button:active { transform: scale(0.97); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.abas { display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: var(--chip); }
.abas button { border: 0; background: transparent; padding: 6px 14px; border-radius: 999px; font-weight: 600; color: var(--muted); }
.abas button[aria-selected="true"] { background: var(--surface); color: var(--ink); }
.resumo { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.resumo div { display: grid; gap: 2px; }
.resumo .num { font-family: var(--font-num); font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1; }
.resumo .rot { font-size: 0.78rem; color: var(--muted); }
.filtros { display: grid; gap: 8px; }
.chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.chips button { flex: none; border: 1px solid var(--line); background: var(--surface); padding: 6px 12px; border-radius: 999px; font-size: 0.9rem; }
.chips button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.selects { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
select, input[type="date"], input[type="number"], textarea {
  width: 100%; min-width: 0; font-size: 16px; padding: 8px 10px; border: 1px solid var(--line);
  border-radius: 8px; background: var(--surface);
}
textarea { resize: vertical; min-height: 4.5em; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.estado { margin: 0; padding: 24px 16px; text-align: center; color: var(--muted); border: 1px dashed var(--line); border-radius: var(--raio); }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.lead { background: var(--surface); border: 1px solid var(--line); border-radius: var(--raio); overflow: hidden; }
.lead-cabeca {
  display: grid; gap: 4px; width: 100%; text-align: left; border: 0; background: transparent; padding: 12px 14px;
  transition: none;
}
.lead-cabeca:active { transform: none; background: var(--chip); }
.lead-linha1 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lead-nome { font-weight: 800; font-size: 1.02rem; min-width: 0; overflow-wrap: anywhere; }
.lead-linha2, .lead-linha3 { color: var(--muted); font-size: 0.88rem; display: flex; flex-wrap: wrap; gap: 4px 10px; }
.score, .nota { font-family: var(--font-num); font-variant-numeric: tabular-nums; }
.prox[data-vencido="true"] { color: var(--st-sem); font-weight: 600; }
.pilula { --pill: var(--st-novo); flex: none; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; color: var(--pill); background: color-mix(in srgb, var(--pill) 14%, transparent); }
.pilula[data-status="sem_resposta"] { --pill: var(--st-sem); }
.pilula[data-status="retornar"] { --pill: var(--st-retornar); }
.pilula[data-status="interessado"], .pilula[data-status="reuniao"] { --pill: var(--st-neg); }
.pilula[data-status="fechou"] { --pill: var(--st-fechou); }
.pilula[data-status="perdeu"] { --pill: var(--st-perdeu); }
.lead-corpo { display: grid; gap: 14px; padding: 4px 14px 16px; border-top: 1px solid var(--line); }
.fone-linha { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 10px; }
.fone { font-family: var(--font-num); font-size: 1.35rem; font-weight: 600; font-variant-numeric: tabular-nums; user-select: all; -webkit-user-select: all; }
.acoes { display: flex; flex-wrap: wrap; gap: 8px; }
.acao, .botao, .botao-sec {
  display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 8px 14px;
  border-radius: 8px; font-weight: 600; text-decoration: none; border: 1px solid var(--line); background: var(--surface); color: var(--ink);
}
.acao.ligar { background: var(--call); border-color: var(--call); color: var(--call-ink); }
.botao { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.endereco { margin: 0; color: var(--muted); font-size: 0.9rem; }
fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 8px; min-width: 0; }
legend, .campo label { font-size: 0.8rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 0; margin-bottom: 6px; }
.status-botoes { display: flex; flex-wrap: wrap; gap: 6px; }
.status-botoes button { border: 1px solid var(--line); background: var(--surface); padding: 6px 10px; border-radius: 8px; font-size: 0.9rem; }
.status-botoes button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.painel-extra { display: grid; gap: 10px; padding: 12px; border-radius: 8px; background: var(--chip); }
.opcao { display: flex; align-items: center; gap: 8px; min-height: 36px; }
.campo { display: grid; min-width: 0; }
.linha { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.linha input[type="date"] { flex: 1 1 160px; width: auto; }
.plano-atual { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.92rem; }
.salvo { font-size: 0.8rem; color: var(--muted); min-height: 1.2em; }
.historico summary { cursor: pointer; color: var(--muted); font-size: 0.9rem; }
.historico ol { margin: 8px 0 0; padding-left: 18px; color: var(--muted); font-size: 0.88rem; }
.roteiro { display: grid; gap: 18px; }
.bloco { background: var(--surface); border: 1px solid var(--line); border-radius: var(--raio); padding: 14px; display: grid; gap: 10px; }
.bloco p, .bloco ul, .bloco ol { margin: 0; max-width: 65ch; }
.bloco ul, .bloco ol { padding-left: 20px; display: grid; gap: 6px; }
.fala { border-left: 3px solid var(--accent); padding-left: 10px; }
.tabela { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.tabela label { display: grid; gap: 4px; font-size: 0.85rem; color: var(--muted); }
.indicador { display: grid; gap: 6px; }
.indicador .num { font-family: var(--font-num); font-variant-numeric: tabular-nums; font-weight: 600; }
.aviso {
  position: fixed; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
  max-width: calc(100% - 32px); padding: 10px 14px; border-radius: 8px; background: var(--ink); color: var(--bg);
  font-weight: 600; box-shadow: 0 6px 24px color-mix(in srgb, var(--ink) 25%, transparent); z-index: 5;
}
.aviso[data-tipo="erro"] { background: var(--st-perdeu); color: var(--accent-ink); }
@media (hover: hover) {
  .acao:hover, .botao-sec:hover, .chips button:hover { border-color: var(--muted); }
  .lead-cabeca:hover { background: color-mix(in srgb, var(--chip) 60%, transparent); }
}
@media (max-width: 420px) {
  .resumo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tabela { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
</style>

<div class="casca">
  <header class="topo">
    <h1>Caderno de Ligações</h1>
    <div class="abas" role="tablist" aria-label="Seções">
      <button type="button" role="tab" id="aba-leads" data-aba="leads" aria-controls="vista-leads">Leads</button>
      <button type="button" role="tab" id="aba-roteiro" data-aba="roteiro" aria-controls="vista-roteiro">Roteiro</button>
    </div>
  </header>

  <main id="vista-leads" class="casca" role="tabpanel" aria-labelledby="aba-leads">
    <section class="resumo" aria-label="Resumo do dia">
      <div><span class="num" id="n-ligar">0</span><span class="rot">para ligar</span></div>
      <div><span class="num" id="n-vencidos">0</span><span class="rot">retornos até hoje</span></div>
      <div><span class="num" id="n-neg">0</span><span class="rot">em negociação</span></div>
      <div><span class="num" id="n-fechados">0</span><span class="rot">fechados</span></div>
    </section>
    <nav class="filtros" aria-label="Filtros">
      <div class="chips">
        <button type="button" data-visao="ligar">Para ligar</button>
        <button type="button" data-visao="depois">Mais tarde</button>
        <button type="button" data-visao="negociacao">Negociação</button>
        <button type="button" data-visao="fechados">Fechados</button>
        <button type="button" data-visao="perdidos">Perdidos</button>
        <button type="button" data-visao="todos">Todos</button>
      </div>
      <div class="selects">
        <label class="sr" for="f-nicho">Nicho</label><select id="f-nicho"></select>
        <label class="sr" for="f-cidade">Cidade</label><select id="f-cidade"></select>
      </div>
    </nav>
    <p id="carregando" class="estado">Carregando leads…</p>
    <p id="falha" class="estado" hidden></p>
    <p id="vazio" class="estado" hidden></p>
    <ul id="lista" class="lista"></ul>
  </main>

  <main id="vista-roteiro" class="roteiro" role="tabpanel" aria-labelledby="aba-roteiro" hidden>
    <section class="bloco indicador" aria-labelledby="t-indicador">
      <h2 id="t-indicador">Preço</h2>
      <p>Últimos interessados decididos com a tabela atual: <span class="num" id="ind-amostra">0 de 10</span> · recusaram por preço: <span class="num" id="ind-recusas">0</span></p>
      <p id="ind-texto"></p>
      <div class="linha">
        <button type="button" class="botao" id="ind-subir" hidden>Aplicar +R$10</button>
        <button type="button" class="botao" id="ind-descer" hidden>Aplicar −R$10</button>
      </div>
    </section>

    <section class="bloco" aria-labelledby="t-tabela">
      <h2 id="t-tabela">Tabela de preços (por mês)</h2>
      <div class="tabela">
        <label for="tab-solo">Solo · 1 profissional<input id="tab-solo" type="number" inputmode="numeric" min="1" step="1"></label>
        <label for="tab-equipe">Equipe · 2–5<input id="tab-equipe" type="number" inputmode="numeric" min="1" step="1"></label>
        <label for="tab-casaCheia">Casa cheia · 6+<input id="tab-casaCheia" type="number" inputmode="numeric" min="1" step="1"></label>
      </div>
      <div class="linha"><button type="button" class="botao-sec" id="tab-salvar">Salvar tabela</button></div>
      <p>Sem taxa de implantação. Sem fidelidade. O primeiro mês é pago na contratação.</p>
    </section>

    <section class="bloco" aria-labelledby="t-antes">
      <h2 id="t-antes">Antes de ligar</h2>
      <ul>
        <li>Melhor horário: terça a quinta, das 9h às 11h ou das 14h às 16h. Evite sexta à tarde e sábado (casa cheia) e segunda (muita barbearia fecha).</li>
        <li>Abra o cartão do lead e veja nota, bairro e se tem Instagram. Use isso na conversa.</li>
        <li>O objetivo da primeira ligação é mandar a prévia, não fechar tudo na hora.</li>
      </ul>
    </section>

    <section class="bloco" aria-labelledby="t-abertura">
      <h2 id="t-abertura">Abertura</h2>
      <p><strong>Com prévia pronta</strong></p>
      <p class="fala">"Oi, tudo bem? Falo com o responsável pela [nome do negócio]? Aqui é [seu nome], sou daqui da Grande Floripa. Vai ser rapidinho: montei uma prévia de site com agenda online pra [nome do negócio], já com as avaliações de vocês no Google. Posso te mandar o link no WhatsApp pra você dar uma olhada?"</p>
      <p><strong>Ainda sem prévia</strong></p>
      <p class="fala">"Oi, tudo bem? Falo com o responsável pela [nome do negócio]? Aqui é [seu nome], sou daqui da Grande Floripa. Eu faço site com agenda online pra negócios da região. Vi que vocês têm [nota] estrelas no Google com [nº] avaliações, mas ainda não têm site. Posso montar uma prévia do site de vocês, sem compromisso, e te mandar no WhatsApp?"</p>
    </section>

    <section class="bloco" aria-labelledby="t-perguntas">
      <h2 id="t-perguntas">Perguntas</h2>
      <ol>
        <li>"Hoje como o cliente marca horário com vocês?"</li>
        <li>"Quantos profissionais atendem aí?" (define o plano)</li>
        <li>"Já usaram algum app de agenda?"</li>
      </ol>
    </section>

    <section class="bloco" aria-labelledby="t-proposta">
      <h2 id="t-proposta">Proposta</h2>
      <p class="fala">"Fica [valor do plano] por mês, sem taxa de implantação e sem fidelidade. Tem o site com a cara de vocês, agenda online separada por profissional, o domínio .com.br no nome de vocês e a hospedagem. Um atendimento a mais por mês já paga."</p>
      <p>Solo <strong data-preco="solo"></strong> · Equipe <strong data-preco="equipe"></strong> · Casa cheia <strong data-preco="casaCheia"></strong></p>
    </section>

    <section class="bloco" aria-labelledby="t-fechamento">
      <h2 id="t-fechamento">Fechamento</h2>
      <p class="fala">"Posso deixar no ar essa semana? Você paga só o primeiro mês pra começar e eu te mando o passo a passo pra ligar a agenda."</p>
      <p>Se pedir para pensar: "Claro. Te mando a prévia agora e te ligo [dia] pra saber o que achou. Melhor de manhã ou à tarde?" Marque <strong>Retornar</strong> e a data.</p>
    </section>

    <section class="bloco" aria-labelledby="t-objecoes">
      <h2 id="t-objecoes">Objeções</h2>
      <ul>
        <li><strong>"Já tenho Instagram."</strong> "O Instagram continua. O site aparece no Google quando alguém pesquisa por [serviço] em [bairro], e o cliente agenda sozinho, até de madrugada. O link vai na bio do Insta."</li>
        <li><strong>"Marco tudo pelo WhatsApp."</strong> "Pode continuar. A agenda online é pra quem prefere marcar sozinho, e cada profissional vê a própria agenda no celular. Menos mensagem pra responder no meio do atendimento."</li>
        <li><strong>"Tá caro" ou "agora não dá".</strong> "Não tem taxa de implantação e você cancela quando quiser. Custa menos que um app só de agenda, e aqui vem site e domínio junto. Um atendimento a mais no mês já paga." Se recusar, marque Perdeu → Preço.</li>
        <li><strong>"Já uso Booksy, Trinks ou AppBarber."</strong> "A nossa agenda faz o mesmo e ainda vem com site e domínio próprio, por menos do que esses apps cobram só pela agenda."</li>
        <li><strong>"Me manda por WhatsApp."</strong> "Mando agora. Amanhã te ligo rapidinho pra saber o que achou: melhor de manhã ou à tarde?" Marque Retornar e a data.</li>
        <li><strong>"Preciso falar com meu sócio."</strong> "Claro. Te mando a prévia pra vocês verem juntos. Posso ligar [dia]?" Se perder, o motivo é Não decide sozinho.</li>
        <li><strong>"Não tenho tempo agora."</strong> "Sem problema. Qual o melhor horário pra eu ligar? Leva três minutos." Marque Retornar e a data.</li>
      </ul>
    </section>
  </main>

  <div id="aviso" class="aviso" role="status" aria-live="polite" hidden></div>
</div>

<script type="module">
/*__LOGICA__*/

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const NICHOS = { barbearia: "Barbearia", estetica: "Estética" };
const estado = { leads: new Map(), tabela: { ...TABELA_PADRAO }, aba: "leads", visao: "ligar", nicho: "", cidade: "", carregado: false };
const cartoes = new Map();
const filas = new Map();
let db = null;

try {
  const p = JSON.parse(localStorage.getItem("caderno:preferencias") || "{}");
  for (const k of ["aba", "visao", "nicho", "cidade"]) if (typeof p[k] === "string") estado[k] = p[k];
} catch {}
if (location.hash === "#roteiro") estado.aba = "roteiro";

function guardarPreferencias() {
  try {
    localStorage.setItem("caderno:preferencias", JSON.stringify({ aba: estado.aba, visao: estado.visao, nicho: estado.nicho, cidade: estado.cidade }));
  } catch {}
}

let temporizadorAviso;
function avisar(texto, tipo = "ok") {
  const el = $("#aviso");
  el.textContent = texto;
  el.dataset.tipo = tipo;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.hidden = true; }, 2600);
}

function mensagemErro(e) {
  switch (e && e.code) {
    case "invalid_argument": return "Não foi possível salvar: esta conta só pode ler o caderno.";
    case "quota_exceeded": return "O caderno está cheio. Peça ao Claude para arquivar leads antigos.";
    case "resource_exhausted": return "Muitas alterações seguidas. Espere alguns segundos e tente de novo.";
    default: return "Não foi possível salvar agora. Tente de novo em instantes.";
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function comRetentativa(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e && e.code === "unavailable") {
      await esperar(400 + Math.random() * 800);
      return fn();
    }
    throw e;
  }
}

// Uma escrita por vez por documento: cada gravação espera a anterior do mesmo lead.
function gravarLead(id, patch) {
  if (!db) {
    avisar("Os dados do caderno não estão disponíveis nesta visualização.", "erro");
    return Promise.reject(new Error("sem db"));
  }
  const anterior = filas.get(id) || Promise.resolve();
  const atual = anterior.catch(() => {}).then(() => comRetentativa(() => db.doc("leads/" + id).update(patch)));
  filas.set(id, atual);
  return atual.catch((e) => {
    avisar(mensagemErro(e), "erro");
    throw e;
  });
}

async function salvarTabela(nova) {
  if (!db) return;
  try {
    await comRetentativa(() => db.doc("config/oferta").set({ ...nova, atualizadoEm: new Date().toISOString() }));
    avisar("Tabela salva");
  } catch (e) {
    avisar(mensagemErro(e), "erro");
  }
}

function definirLink(a, href) {
  if (href) {
    a.href = href;
    a.hidden = false;
  } else {
    a.removeAttribute("href");
    a.hidden = true;
  }
}

function criarCartao(id) {
  const li = document.createElement("li");
  li.className = "lead";
  li.innerHTML = `
    <button type="button" class="lead-cabeca" aria-expanded="false" aria-controls="corpo-${id}">
      <span class="lead-linha1"><span class="lead-nome"></span><span class="pilula"></span></span>
      <span class="lead-linha2"></span>
      <span class="lead-linha3"><span class="nota"></span><span class="score"></span><span class="prox"></span></span>
    </button>
    <div class="lead-corpo" id="corpo-${id}" hidden>
      <div class="fone-linha"><span class="fone"></span><button type="button" class="botao-sec copiar">Copiar</button></div>
      <div class="acoes">
        <a class="acao ligar">Ligar</a>
        <a class="acao whats" target="_blank" rel="noopener">WhatsApp</a>
        <a class="acao insta" target="_blank" rel="noopener">Instagram</a>
        <a class="acao maps" target="_blank" rel="noopener">Maps</a>
        <a class="acao previa" target="_blank" rel="noopener">Prévia</a>
      </div>
      <p class="endereco"></p>
      <fieldset><legend>Status</legend><div class="status-botoes"></div></fieldset>
      <div class="painel-extra" hidden></div>
      <p class="plano-atual" hidden><span class="plano-texto"></span><button type="button" class="botao-sec alterar-plano">Alterar plano</button></p>
      <div class="campo">
        <label for="prox-${id}">Próximo contato</label>
        <div class="linha">
          <input type="date" id="prox-${id}" class="prox-input">
          <button type="button" class="botao-sec amanha">Amanhã</button>
          <button type="button" class="botao-sec limpar-data">Limpar</button>
        </div>
      </div>
      <div class="campo">
        <label for="notas-${id}">Notas</label>
        <textarea id="notas-${id}" class="notas" rows="3" placeholder="Nome do dono, melhor horário, o que achou da prévia"></textarea>
        <span class="salvo" aria-live="polite"></span>
      </div>
      <details class="historico"><summary>Histórico</summary><ol></ol></details>
    </div>`;
  const q = (s) => li.querySelector(s);
  const c = {
    li,
    dados: null,
    pendente: null,
    r: {
      cabeca: q(".lead-cabeca"), nome: q(".lead-nome"), pilula: q(".pilula"), linha2: q(".lead-linha2"),
      nota: q(".nota"), score: q(".score"), prox: q(".prox"), corpo: q(".lead-corpo"), fone: q(".fone"),
      copiar: q(".copiar"), ligar: q(".ligar"), whats: q(".whats"), insta: q(".insta"), maps: q(".maps"),
      previa: q(".previa"), endereco: q(".endereco"), statusBotoes: q(".status-botoes"), extra: q(".painel-extra"),
      planoAtual: q(".plano-atual"), planoTexto: q(".plano-texto"), alterarPlano: q(".alterar-plano"),
      proxInput: q(".prox-input"), amanha: q(".amanha"), limparData: q(".limpar-data"), notas: q(".notas"),
      salvo: q(".salvo"), historico: q(".historico ol"),
    },
  };
  for (const s of STATUS) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.status = s.id;
    b.textContent = s.rotulo;
    c.r.statusBotoes.append(b);
  }

  c.r.cabeca.addEventListener("click", () => {
    const abrir = c.r.corpo.hidden;
    c.r.corpo.hidden = !abrir;
    c.r.cabeca.setAttribute("aria-expanded", String(abrir));
  });

  c.r.copiar.addEventListener("click", () => {
    const selecionar = () => {
      const faixa = document.createRange();
      faixa.selectNodeContents(c.r.fone);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(faixa);
      avisar("Número selecionado. Copie pelo menu do celular.");
    };
    try {
      navigator.clipboard.writeText(c.dados?.telefone || "").then(() => avisar("Número copiado"), selecionar);
    } catch {
      selecionar();
    }
  });

  c.r.statusBotoes.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-status]");
    if (!b || !c.dados) return;
    const novo = b.dataset.status;
    if (novo === c.dados.status) return;
    if (precisaDeMotivo(novo)) return abrirExtra(c, { tipo: "motivo" });
    if (precisaDePlano(novo) && !c.dados.plano) return abrirExtra(c, { tipo: "plano", status: novo });
    aplicarStatus(c, novo, {});
  });

  c.r.alterarPlano.addEventListener("click", () => abrirExtra(c, { tipo: "plano" }));

  const salvarData = () =>
    gravarLead(id, { proximoContato: c.r.proxInput.value || null, atualizadoEm: new Date().toISOString() }).then(
      () => avisar(c.r.proxInput.value ? "Próximo contato: " + dataCurta(c.r.proxInput.value) : "Data removida"),
      () => {},
    );
  c.r.proxInput.addEventListener("change", salvarData);
  c.r.amanha.addEventListener("click", () => {
    c.r.proxInput.value = somarDias(hojeLocal(), 1);
    salvarData();
  });
  c.r.limparData.addEventListener("click", () => {
    c.r.proxInput.value = "";
    salvarData();
  });

  let temporizadorNotas;
  const salvarNotas = () => {
    clearTimeout(temporizadorNotas);
    const valor = c.r.notas.value;
    if (!c.dados || valor === (c.dados.notas || "")) return;
    c.r.salvo.textContent = "Salvando…";
    gravarLead(id, { notas: valor, atualizadoEm: new Date().toISOString() }).then(
      () => { c.r.salvo.textContent = "Salvo"; },
      () => { c.r.salvo.textContent = "Não salvo"; },
    );
  };
  c.r.notas.addEventListener("input", () => {
    c.r.salvo.textContent = "";
    clearTimeout(temporizadorNotas);
    temporizadorNotas = setTimeout(salvarNotas, 1200);
  });
  c.r.notas.addEventListener("blur", salvarNotas);
  return c;
}

function abrirExtra(c, pendente) {
  c.pendente = pendente;
  const id = c.dados.slug;
  const ex = c.r.extra;
  ex.hidden = false;
  if (pendente.tipo === "motivo") {
    ex.innerHTML = `<fieldset><legend>Por que perdeu?</legend>${MOTIVOS.map(
      (m) => `<label class="opcao"><input type="radio" name="motivo-${id}" value="${m.id}"> ${m.rotulo}</label>`,
    ).join("")}</fieldset>
      <div class="linha"><button type="button" class="botao confirmar">Marcar como perdido</button><button type="button" class="botao-sec cancelar">Cancelar</button></div>`;
  } else {
    ex.innerHTML = `<div class="campo"><label for="plano-${id}">Plano oferecido</label><select id="plano-${id}" class="plano-sel">${PLANOS.map(
      (p) => `<option value="${p.id}">${p.rotulo} · ${p.profissionais}</option>`,
    ).join("")}</select></div>
      <div class="campo"><label for="preco-${id}">Preço mensal (R$)</label><input id="preco-${id}" class="preco-in" type="number" inputmode="numeric" min="1" step="1"></div>
      <div class="linha"><button type="button" class="botao confirmar">${pendente.status ? "Salvar e marcar " + rotuloStatus(pendente.status) : "Salvar plano"}</button><button type="button" class="botao-sec cancelar">Cancelar</button></div>`;
    const sel = ex.querySelector(".plano-sel");
    const preco = ex.querySelector(".preco-in");
    sel.value = c.dados.plano || "equipe";
    preco.value = String(c.dados.plano && c.dados.precoMensal ? c.dados.precoMensal : estado.tabela[sel.value]);
    sel.addEventListener("change", () => { preco.value = String(estado.tabela[sel.value]); });
  }
  ex.querySelector(".cancelar").addEventListener("click", () => fecharExtra(c));
  ex.querySelector(".confirmar").addEventListener("click", () => {
    if (pendente.tipo === "motivo") {
      const marcado = ex.querySelector(`input[name="motivo-${id}"]:checked`);
      if (!marcado) return avisar("Escolha o motivo da perda.", "erro");
      return aplicarStatus(c, "perdeu", { motivoPerda: marcado.value });
    }
    const plano = ex.querySelector(".plano-sel").value;
    const precoMensal = Number(ex.querySelector(".preco-in").value);
    if (!(precoMensal > 0)) return avisar("Informe o preço oferecido.", "erro");
    if (pendente.status) return aplicarStatus(c, pendente.status, { plano, precoMensal });
    gravarLead(id, { plano, precoMensal, atualizadoEm: new Date().toISOString() }).then(
      () => { fecharExtra(c); avisar("Plano salvo"); },
      () => {},
    );
  });
}

function fecharExtra(c) {
  c.pendente = null;
  c.r.extra.hidden = true;
  c.r.extra.replaceChildren();
}

function aplicarStatus(c, novo, extras) {
  let patch;
  try {
    patch = mudarStatus(c.dados, novo, new Date().toISOString(), extras);
  } catch (e) {
    return avisar(e.message, "erro");
  }
  gravarLead(c.dados.slug, patch).then(() => { fecharExtra(c); avisar("Status: " + rotuloStatus(novo)); }, () => {});
}

function atualizarCartao(c, d) {
  c.dados = d;
  const r = c.r;
  const hoje = hojeLocal();
  r.nome.textContent = d.limpo ? "Lead arquivado" : d.nome || "Sem nome";
  r.pilula.textContent = rotuloStatus(d.status);
  r.pilula.dataset.status = d.status;
  r.linha2.textContent = [NICHOS[d.nicho] || d.nicho, [d.bairro, d.cidade].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  r.nota.textContent = d.nota
    ? `★ ${String(d.nota).replace(".", ",")} (${d.avaliacoes ?? 0})`
    : d.avaliacoes ? `${d.avaliacoes} avaliações` : "Sem avaliações";
  r.score.textContent = `${d.score ?? 0} pts`;
  const vencido = Boolean(d.proximoContato && d.proximoContato <= hoje);
  r.prox.textContent = d.proximoContato ? (vencido ? "Ligar hoje" : "Ligar em " + dataCurta(d.proximoContato)) : "";
  r.prox.dataset.vencido = String(vencido);
  r.fone.textContent = d.telefone || "Sem telefone";
  r.copiar.hidden = !d.telefone;
  definirLink(r.ligar, d.telefone ? "tel:" + d.telefone.replace(/[^\d+]/g, "") : null);
  definirLink(r.whats, d.whatsapp);
  definirLink(r.insta, d.instagramUrl);
  definirLink(r.maps, d.mapsUrl);
  definirLink(r.previa, d.previaUrl);
  r.endereco.textContent = d.endereco || "";
  r.endereco.hidden = !d.endereco;
  for (const b of r.statusBotoes.children) b.setAttribute("aria-pressed", String(b.dataset.status === d.status));
  const resumo = [];
  if (d.plano) resumo.push(`Plano ${rotuloPlano(d.plano)} · ${formatarReais(d.precoMensal)}/mês`);
  if (d.motivoPerda) resumo.push(`Motivo: ${rotuloMotivo(d.motivoPerda)}`);
  r.planoTexto.textContent = resumo.join(" · ");
  r.planoAtual.hidden = resumo.length === 0;
  r.alterarPlano.hidden = !d.plano;
  // Não sobrescreve um campo em edição: o snapshot pode chegar enquanto a pessoa digita.
  if (document.activeElement !== r.proxInput) r.proxInput.value = d.proximoContato || "";
  if (document.activeElement !== r.notas) r.notas.value = d.notas || "";
  r.historico.replaceChildren(
    ...[...(d.historico || [])].reverse().map((h) => {
      const item = document.createElement("li");
      item.textContent = `${rotuloStatus(h.status)} · ${dataHora(h.em)}`;
      return item;
    }),
  );
}

function preencherSelect(sel, valores, atual, rotuloTodos, rotular = (v) => v) {
  const opcoes = [["", rotuloTodos], ...valores.map((v) => [v, rotular(v)])];
  const assinatura = JSON.stringify(opcoes);
  if (sel.dataset.assinatura !== assinatura) {
    sel.replaceChildren(
      ...opcoes.map(([v, t]) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = t;
        return o;
      }),
    );
    sel.dataset.assinatura = assinatura;
  }
  sel.value = atual;
}

function renderLeads() {
  const hoje = hojeLocal();
  const todos = [...estado.leads.values()];
  const c = contagens(todos, hoje);
  $("#n-ligar").textContent = c.ligar;
  $("#n-vencidos").textContent = c.vencidos;
  $("#n-neg").textContent = c.negociacao;
  $("#n-fechados").textContent = c.fechados;
  for (const b of document.querySelectorAll("[data-visao]")) b.setAttribute("aria-pressed", String(b.dataset.visao === estado.visao));
  const nichos = [...new Set(todos.map((l) => l.nicho).filter(Boolean))].sort();
  const cidades = [...new Set(todos.map((l) => l.cidade).filter(Boolean))].sort();
  if (estado.carregado && estado.nicho && !nichos.includes(estado.nicho)) estado.nicho = "";
  if (estado.carregado && estado.cidade && !cidades.includes(estado.cidade)) estado.cidade = "";
  preencherSelect($("#f-nicho"), nichos, estado.nicho, "Todos os nichos", (v) => NICHOS[v] || v);
  preencherSelect($("#f-cidade"), cidades, estado.cidade, "Todas as cidades");

  const lista = ordenarLeads(filtrarLeads(todos, estado, hoje), hoje);
  const ul = $("#lista");
  const visiveis = new Set(lista.map((l) => l.slug));
  for (const [id, cartao] of cartoes) {
    if (!visiveis.has(id)) {
      cartao.li.remove();
      cartoes.delete(id);
    }
  }
  lista.forEach((dados, i) => {
    let cartao = cartoes.get(dados.slug);
    if (!cartao) {
      cartao = criarCartao(dados.slug);
      cartoes.set(dados.slug, cartao);
    }
    if (cartao.dados !== dados) atualizarCartao(cartao, dados);
    if (ul.children[i] !== cartao.li) ul.insertBefore(cartao.li, ul.children[i] || null);
  });

  $("#carregando").hidden = estado.carregado;
  const vazio = $("#vazio");
  vazio.hidden = !estado.carregado || lista.length > 0 || !$("#falha").hidden;
  vazio.textContent =
    estado.leads.size === 0
      ? "Nenhum lead ainda. Os leads aparecem aqui quando o Claude enviar o primeiro lote."
      : "Nenhum lead nesta lista.";
}

function renderRoteiro() {
  const t = estado.tabela;
  for (const el of document.querySelectorAll("[data-preco]")) el.textContent = formatarReais(t[el.dataset.preco]);
  for (const p of PLANOS) {
    const campo = $("#tab-" + p.id);
    if (document.activeElement !== campo) campo.value = String(t[p.id]);
  }
  const ind = indicadorPreco([...estado.leads.values()], t);
  $("#ind-amostra").textContent = `${ind.amostra} de 10`;
  $("#ind-recusas").textContent = String(ind.recusasPreco);
  const textos = {
    aguardar: `Faltam ${10 - ind.amostra} decisões com a tabela atual para a próxima leitura.`,
    subir: "Ninguém recusou por preço. Suba R$10 para os próximos.",
    manter: "Uma recusa por preço em 10: a tabela está no ponto. Mantenha.",
    descer: `${ind.recusasPreco} recusas por preço em 10. Desça R$10 para os próximos.`,
  };
  $("#ind-texto").textContent = textos[ind.sugestao];
  $("#ind-subir").hidden = ind.sugestao !== "subir";
  $("#ind-descer").hidden = ind.sugestao !== "descer";
}

function render() {
  for (const b of document.querySelectorAll("[data-aba]")) b.setAttribute("aria-selected", String(b.dataset.aba === estado.aba));
  $("#vista-leads").hidden = estado.aba !== "leads";
  $("#vista-roteiro").hidden = estado.aba !== "roteiro";
  renderLeads();
  renderRoteiro();
}

function mostrarFalha(texto) {
  const el = $("#falha");
  el.textContent = texto;
  el.hidden = false;
  estado.carregado = true;
  render();
}

function ouvir() {
  db.collection("leads").limit(1000).onSnapshot(
    (snap) => {
      estado.leads = new Map(snap.docs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
      estado.carregado = true;
      render();
    },
    () => mostrarFalha("A conexão com os dados do caderno caiu. Recarregue a página."),
  );
  db.doc("config/oferta").onSnapshot(
    (snap) => {
      const d = snap.exists ? snap.data() : null;
      estado.tabela =
        d && d.solo > 0 && d.equipe > 0 && d.casaCheia > 0
          ? { solo: d.solo, equipe: d.equipe, casaCheia: d.casaCheia }
          : { ...TABELA_PADRAO };
      render();
    },
    () => {},
  );
}

for (const b of document.querySelectorAll("[data-aba]")) {
  b.addEventListener("click", () => { estado.aba = b.dataset.aba; guardarPreferencias(); render(); });
}
for (const b of document.querySelectorAll("[data-visao]")) {
  b.addEventListener("click", () => { estado.visao = b.dataset.visao; guardarPreferencias(); render(); });
}
$("#f-nicho").addEventListener("change", (e) => { estado.nicho = e.target.value; guardarPreferencias(); render(); });
$("#f-cidade").addEventListener("change", (e) => { estado.cidade = e.target.value; guardarPreferencias(); render(); });
$("#tab-salvar").addEventListener("click", () => {
  const nova = {};
  for (const p of PLANOS) nova[p.id] = Number($("#tab-" + p.id).value);
  if (Object.values(nova).some((v) => !(v > 0))) return avisar("Os preços precisam ser maiores que zero.", "erro");
  salvarTabela(nova);
});
$("#ind-subir").addEventListener("click", () => salvarTabela(ajustarTabela(estado.tabela, 10)));
$("#ind-descer").addEventListener("click", () => salvarTabela(ajustarTabela(estado.tabela, -10)));

render();
const SEM_DADOS = "Os dados do caderno não abrem nesta visualização. Abra pelo claude.ai, com a sua conta.";
const pronto = window.claude && window.claude.use ? window.claude.use("db") : Promise.resolve(null);
pronto.then(
  (namespace) => {
    db = namespace;
    if (!db) return mostrarFalha(SEM_DADOS);
    ouvir();
  },
  () => mostrarFalha(SEM_DADOS),
);
</script>
```

- [ ] **Step 6: Rodar testes, checagem de tipos e build**

Run: `npm test && npm run typecheck && npm run painel:construir`
Expected: todos PASS (incluindo `construir.test.ts`); "painel/dist/caderno.html gerado".

- [ ] **Step 7: Uma olhada antes de publicar (opcional)**

Se as ferramentas do Playwright responderem nesta sessão: abra `file://<raiz>/painel/dist/caderno.html`, redimensione para 390×844 e tire uma captura. Sem o `db`, a página mostra a mensagem "Os dados do caderno não abrem nesta visualização", com cabeçalho, resumo e filtros. Corrija numa passada só o que estiver visivelmente quebrado (texto cortado, rolagem lateral). Sem Playwright, pule.

- [ ] **Step 8: Commit do código do painel**

```bash
git add package.json painel/pagina.html painel/construir.ts painel/construir.test.ts
git commit -m "feat(painel): add call notebook page with db-backed leads"
```

- [ ] **Step 9: Publicar o artifact**

Chame o `Artifact` com `file_path: "painel/dist/caderno.html"`, `icon: "phone"`, `capabilities: { db: {} }` e `description: "Leads, status das ligações e roteiro para vender sites a barbearias e estéticas da Grande Florianópolis."`. Guarde a URL devolvida.

- [ ] **Step 10: Gravar a tabela de preços no banco**

Carregue o `ArtifactData` (`ToolSearch` com `select:ArtifactData`). Faça um `set` em `config/oferta` com `{ "solo": 59, "equipe": 89, "casaCheia": 129, "atualizadoEm": "<agora em ISO>" }` no artifact da URL do Step 9.

- [ ] **Step 11: Conferência funcional (uma passada)**

`ArtifactData` `get` de `config/oferta` → os três preços; `list` da coleção `leads` → vazia. Diga à pessoa em uma linha o que foi conferido e que o fluxo de status/notas só dá para testar abrindo no celular.

- [ ] **Step 12: Registrar a URL do painel**

Acrescente na memória deste projeto no Claude Code (arquivo `cold-call-sites-project.md`) a linha: `- Painel (Caderno de Ligações): <URL do Step 9> — coleção leads (id = slug), doc config/oferta.`

---

### Task 10: Primeiro lote no painel

Task operacional: nada vai para o git (os dados ficam em `leads/`, fora dele). Ao fim desta task a pessoa já pode ligar.

**Files:**
- Gera (fora do git): `leads/*.json`, `leads/_sistema/painel-lote.json`, `leads/_sistema/uso.json`

**Interfaces:**
- Consumes: `npm run buscar` (Task 6), `npm run lote` (Task 7), artifact e URL (Task 9), custo por lugar medido na Task 4.

- [ ] **Step 1: Buscar barbearias em São José e Florianópolis**

Run:
```bash
npm run buscar -- --nicho barbearia --cidade "São José"
npm run buscar -- --nicho barbearia --cidade "Florianópolis"
```
Expected: cada uma mostra "N lugares encontrados · M candidatos novos" e a tabela. Cada busca de 40 lugares custa cerca de US$0,16 (preços em `prospeccao/apify-notas.md`).

- [ ] **Step 2: Buscar estéticas em São José**

Run: `npm run buscar -- --nicho estetica --cidade "São José" --termos "design de sobrancelhas,extensão de cílios" --max-por-termo 20`
Expected: mesma saída.

- [ ] **Step 3: Conferir o gasto acumulado**

Run: `node --input-type=module -e 'const u = JSON.parse((await import("node:fs")).readFileSync("leads/_sistema/uso.json","utf8")); console.log(u.length, "execuções · US$", u.reduce((s, x) => s + x.gastoEstimadoUsd, 0).toFixed(2))'`
Expected: total estimado perto de US$0,40. Acima de US$1,50, pare e mostre os números para a pessoa antes de seguir.

- [ ] **Step 4: Montar o lote**

Run: `npm run lote -- --quantidade 25`
Expected: "Lote de AAAA-MM-DD: 25 leads novos · N no arquivo do painel (leads/_sistema/painel-lote.json)" e a tabela. O arquivo traz todo lead já escolhido; o Step 5 pula os ids que o painel já tem.

- [ ] **Step 5: Enviar o lote ao painel sem sobrescrever nada**

1. `ArtifactData` `list` da coleção `leads` no artifact da Task 9 → anote os ids que já existem.
2. Leia `leads/_sistema/painel-lote.json` (array de `{ id, data }`) e descarte os itens cujo `id` já existe (um `set` sobrescreveria status e notas de quem já foi trabalhado).
3. `ArtifactData` `batch` com um `set` por item restante, no documento `leads/<id>` com o `data` do arquivo.

- [ ] **Step 6: Conferir**

`ArtifactData` `list` de `leads` → a contagem bate com o lote; abra um documento e confira `status: "novo"`, `telefone` e `historico`. Mande o link do painel para a pessoa abrir no celular.

---

### Task 11: Comando `detalhar` (avaliações, horário e fotos do lote)

Alimenta as prévias do Plano B. Não bloqueia as ligações.

**Files:**
- Modify: `prospeccao/doApify.ts` (acrescenta `converterDetalhes`)
- Create: `prospeccao/fotos.ts`, `prospeccao/detalhar.ts`, `prospeccao/cli/detalhar.ts`
- Test: `prospeccao/doApify.test.ts` (acrescenta testes), `prospeccao/fotos.test.ts`, `prospeccao/detalhar.test.ts`

**Interfaces:**
- Consumes: `texto`, `numero` (Task 5), `ClienteApify`, `Armazem`, `Config`, `podeRodar`, `mensagemSemSaldo`, `validarTeto` (Task 6), `leadDeTeste` (Task 6), forma de pedir detalhes confirmada na Task 4.
- Produces:
  - `interface DetalhesBrutos { placeId: string; horarios: { dia: string; horas: string }[]; coordenadas: { lat: number; lng: number } | null; reviews: { autor: string; texto: string; nota: number }[]; imagens: string[] }`, `converterDetalhes(raw: unknown): DetalhesBrutos | null`
  - `urlEmAltaResolucao(url: string): string`, `baixarFotos(urls: string[], destinoRelativo: string, raiz: string, f?: typeof fetch): Promise<string[]>`
  - `montarEntradaDetalhes(placeIds: string[])`, `executarDetalhes(o: { quantidade?: number; tetoUsd?: number }, deps: { cliente; armazem; config; agora: () => Date; baixar: (urls: string[], destinoRelativo: string) => Promise<string[]> })` → `{ detalhados: string[]; semDados: string[] }`
  - Leads detalhados ficam com `fase: "detalhado"` e `detalhes.fotos` = caminhos relativos à raiz (`sites/public/fotos/<slug>/1.jpg`).

- [ ] **Step 1: Acrescentar os testes que falham em `prospeccao/doApify.test.ts`**

Troque o import do topo por `import { converterDetalhes, converterLugar } from "./doApify.ts";` e acrescente no fim do arquivo:
```ts
const detalhe = JSON.parse(readFileSync(new URL("./fixtures/lugar-detalhe.json", import.meta.url), "utf8")) as unknown;

test("converte detalhes: horários, coordenadas, avaliações com texto e imagens", () => {
  const d = converterDetalhes(detalhe);
  assert.ok(d);
  assert.equal(d.placeId, "ChIJteste000000000000001");
  assert.deepEqual(d.horarios[1], { dia: "terça-feira", horas: "09:00 to 19:00" });
  assert.deepEqual(d.coordenadas, { lat: -27.5969, lng: -48.6167 });
  assert.deepEqual(d.reviews.map((r) => r.autor), ["Cliente Um", "Cliente Três"]);
  assert.equal(d.reviews[0].nota, 5);
  assert.equal(d.imagens.length, 2);
});

test("detalhes vazios não quebram", () => {
  const d = converterDetalhes({ placeId: "ChIJvazio" });
  assert.deepEqual(d, { placeId: "ChIJvazio", horarios: [], coordenadas: null, reviews: [], imagens: [] });
  assert.equal(converterDetalhes({}), null);
});
```

- [ ] **Step 2: Escrever os testes que falham — `prospeccao/fotos.test.ts` e `prospeccao/detalhar.test.ts`**

`prospeccao/fotos.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { baixarFotos, urlEmAltaResolucao } from "./fotos.ts";

test("pede a foto do Google com 1200px de largura", () => {
  assert.equal(urlEmAltaResolucao("https://lh3.googleusercontent.com/p/abc=w408-h306-k-no"), "https://lh3.googleusercontent.com/p/abc=w1200");
  assert.equal(urlEmAltaResolucao("https://lh3.googleusercontent.com/p/abc"), "https://lh3.googleusercontent.com/p/abc=w1200");
  assert.equal(urlEmAltaResolucao("https://exemplo.com/foto.jpg"), "https://exemplo.com/foto.jpg");
});

test("salva só respostas de imagem e segue quando uma falha", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "cold-"));
  const f = (async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("boa")) return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    if (u.includes("html")) return new Response("<html>", { headers: { "content-type": "text/html" } });
    throw new Error("rede");
  }) as typeof fetch;
  const salvos = await baixarFotos(["https://x/boa", "https://x/html", "https://x/erro"], "sites/public/fotos/barbearia-x", raiz, f);
  assert.deepEqual(salvos, ["sites/public/fotos/barbearia-x/1.jpg"]);
  assert.ok(existsSync(join(raiz, "sites/public/fotos/barbearia-x/1.jpg")));
});
```

`prospeccao/detalhar.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { executarDetalhes, montarEntradaDetalhes } from "./detalhar.ts";
import { leadDeTeste } from "./fixtures/lead.ts";
import type { ClienteApify } from "./apify.ts";
import type { Config } from "./config.ts";

const detalhe = JSON.parse(readFileSync(new URL("./fixtures/lugar-detalhe.json", import.meta.url), "utf8")) as unknown;
const config: Config = {
  cidades: ["São José"], uf: "Santa Catarina", nichos: { barbearia: { termos: ["barbearia"] } },
  limites: { maxPorTermo: 40, tetoUsdPorExecucao: 1, lotePadrao: 25 },
  precosUsd: { lugar: 0.004, detalhe: 0.002, avaliacao: 0.0005, imagem: 0.0005 },
};

test("entrada pede página de detalhe, 4 fotos e 5 avaliações", () => {
  const e = montarEntradaDetalhes(["a", "b"]);
  assert.deepEqual(e.placeIds, ["a", "b"]);
  assert.equal(e.scrapePlaceDetailPage, true);
  assert.equal(e.maxImages, 4);
  assert.equal(e.maxReviews, 5);
});

test("detalha só o lote; quem não voltou continua no lote", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", placeId: "ChIJteste000000000000001", fase: "lote", score: 90 }));
  armazem.salvarLead(leadDeTeste({ slug: "dois", placeId: "ChIJdois", fase: "lote", score: 80 }));
  armazem.salvarLead(leadDeTeste({ slug: "tres", placeId: "ChIJtres", fase: "candidato" }));
  let entrada: Record<string, unknown> = {};
  const cliente: ClienteApify = {
    saldo: async () => ({ limiteUsd: 5, usadoUsd: 1 }),
    rodar: async (input) => { entrada = input; return { runId: "r7", itens: [detalhe] }; },
  };
  const baixar = async (urls: string[], destino: string) => urls.map((_, i) => `${destino}/${i + 1}.jpg`);
  const r = await executarDetalhes({}, { cliente, armazem, config, agora: () => new Date("2026-10-10T12:00:00Z"), baixar });
  assert.deepEqual(entrada.placeIds, ["ChIJteste000000000000001", "ChIJdois"]);
  assert.deepEqual(r, { detalhados: ["um"], semDados: ["dois"] });
  const um = armazem.listarLeads().find((l) => l.slug === "um");
  assert.equal(um?.fase, "detalhado");
  assert.deepEqual(um?.detalhes?.fotos, ["sites/public/fotos/um/1.jpg", "sites/public/fotos/um/2.jpg"]);
  assert.equal(um?.detalhes?.reviews.length, 2);
  assert.equal(armazem.listarLeads().find((l) => l.slug === "dois")?.fase, "lote");
  assert.equal(armazem.lerUso()[0].comando, "detalhar");
  assert.ok(Math.abs(armazem.lerUso()[0].gastoEstimadoUsd - (0.006 + 2 * 0.0005 + 2 * 0.0005)) < 1e-9);
});

test("sem lote, não chama a Apify", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  let chamou = false;
  const cliente: ClienteApify = {
    saldo: async () => { chamou = true; return { limiteUsd: 5, usadoUsd: 1 }; },
    rodar: async () => { chamou = true; return { runId: "x", itens: [] }; },
  };
  const r = await executarDetalhes({}, { cliente, armazem, config, agora: () => new Date(), baixar: async () => [] });
  assert.deepEqual(r, { detalhados: [], semDados: [] });
  assert.equal(chamou, false);
});
```

Se a Task 4 mostrou que o ator só aceita `startUrls`, troque em `montarEntradaDetalhes` e no primeiro teste `placeIds` por `startUrls: placeIds.map((id) => ({ url: \`https://www.google.com/maps/place/?q=place_id:${id}\` }))`, e ajuste a asserção de `entrada`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `converterDetalhes` não exportado; `fotos.ts` e `detalhar.ts` não encontrados.

- [ ] **Step 4: Acrescentar `converterDetalhes` em `prospeccao/doApify.ts`**

```ts
export interface DetalhesBrutos {
  placeId: string;
  horarios: { dia: string; horas: string }[];
  coordenadas: { lat: number; lng: number } | null;
  reviews: { autor: string; texto: string; nota: number }[];
  imagens: string[];
}

export function converterDetalhes(raw: unknown): DetalhesBrutos | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Bruto;
  const placeId = texto(r.placeId);
  if (!placeId) return null;
  const horarios = Array.isArray(r.openingHours)
    ? r.openingHours.flatMap((h) => {
        const o = (h ?? {}) as Bruto;
        const dia = texto(o.day);
        const horas = texto(o.hours);
        return dia && horas ? [{ dia, horas }] : [];
      })
    : [];
  const local = (r.location ?? {}) as Bruto;
  const lat = numero(local.lat);
  const lng = numero(local.lng);
  const reviews = Array.isArray(r.reviews)
    ? r.reviews
        .flatMap((v) => {
          const o = (v ?? {}) as Bruto;
          const t = texto(o.text);
          return t ? [{ autor: texto(o.name) ?? "Cliente", texto: t, nota: numero(o.stars) ?? 0 }] : [];
        })
        .slice(0, 5)
    : [];
  const imagens = Array.isArray(r.imageUrls)
    ? r.imageUrls.filter((u): u is string => typeof u === "string" && u.startsWith("http")).slice(0, 4)
    : [];
  return { placeId, horarios, coordenadas: lat != null && lng != null ? { lat, lng } : null, reviews, imagens };
}
```

- [ ] **Step 5: Implementar `prospeccao/fotos.ts`**

```ts
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
```

- [ ] **Step 6: Implementar `prospeccao/detalhar.ts`**

```ts
import { join } from "node:path";
import type { ClienteApify } from "./apify.ts";
import type { Armazem } from "./armazem.ts";
import type { Config } from "./config.ts";
import { converterDetalhes } from "./doApify.ts";
import { mensagemSemSaldo, podeRodar, validarTeto } from "./custo.ts";

export function montarEntradaDetalhes(placeIds: string[]) {
  return {
    placeIds,
    language: "pt-BR",
    scrapePlaceDetailPage: true,
    maxImages: 4,
    maxReviews: 5,
    reviewsSort: "mostRelevant",
  };
}

export async function executarDetalhes(
  o: { quantidade?: number; tetoUsd?: number },
  deps: {
    cliente: ClienteApify;
    armazem: Armazem;
    config: Config;
    agora: () => Date;
    baixar: (urls: string[], destinoRelativo: string) => Promise<string[]>;
  },
) {
  const alvo = deps.armazem
    .listarLeads()
    .filter((l) => l.fase === "lote")
    .sort((a, b) => b.score - a.score)
    .slice(0, o.quantidade ?? deps.config.limites.lotePadrao);
  if (alvo.length === 0) return { detalhados: [] as string[], semDados: [] as string[] };

  const teto = o.tetoUsd ?? deps.config.limites.tetoUsdPorExecucao;
  validarTeto(teto);
  const antes = await deps.cliente.saldo();
  if (!podeRodar(antes, teto)) throw new Error(mensagemSemSaldo(antes, teto));
  const { runId, itens } = await deps.cliente.rodar(montarEntradaDetalhes(alvo.map((l) => l.placeId)), teto);

  const detalhes = itens.map((i) => converterDetalhes(i)).filter((d) => d !== null);
  const porId = new Map(detalhes.map((d) => [d.placeId, d] as const));
  const agoraISO = deps.agora().toISOString();
  const detalhados: string[] = [];
  const semDados: string[] = [];
  for (const l of alvo) {
    const d = porId.get(l.placeId);
    if (!d) {
      semDados.push(l.slug);
      continue;
    }
    const fotos = await deps.baixar(d.imagens, join("sites", "public", "fotos", l.slug));
    deps.armazem.salvarLead({
      ...l,
      fase: "detalhado",
      detalhes: { horarios: d.horarios, coordenadas: d.coordenadas, reviews: d.reviews, fotos, detalhadoEm: agoraISO },
    });
    detalhados.push(l.slug);
  }

  // Estimativa: a Apify só registra o gasto real alguns minutos depois da execução.
  const p = deps.config.precosUsd;
  deps.armazem.registrarUso({
    quando: agoraISO,
    comando: "detalhar",
    runId,
    gastoEstimadoUsd:
      itens.length * (p.lugar + p.detalhe) +
      detalhes.reduce((s, d) => s + d.reviews.length * p.avaliacao + d.imagens.length * p.imagem, 0),
    lugares: itens.length,
  });
  return { detalhados, semDados };
}
```

- [ ] **Step 7: Implementar `prospeccao/cli/detalhar.ts`**

```ts
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { criarClienteApify } from "../apify.ts";
import { executarDetalhes } from "../detalhar.ts";
import { baixarFotos } from "../fotos.ts";

const { values } = parseArgs({ options: { quantidade: { type: "string" }, "teto-usd": { type: "string" } } });
const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("Falta APIFY_TOKEN no arquivo .env (modelo em .env.example).");
  process.exit(1);
}
const raiz = fileURLToPath(new URL("../../", import.meta.url));
try {
  const r = await executarDetalhes(
    {
      quantidade: values.quantidade ? Number(values.quantidade) : undefined,
      tetoUsd: values["teto-usd"] ? Number(values["teto-usd"]) : undefined,
    },
    {
      cliente: criarClienteApify(token),
      armazem: criarArmazem(raiz),
      config: carregarConfig(),
      agora: () => new Date(),
      baixar: (urls, destino) => baixarFotos(urls, destino, raiz),
    },
  );
  console.log(`Detalhados: ${r.detalhados.length} · sem dados: ${r.semDados.length}`);
  if (r.semDados.length) console.log(`Sem dados (continuam no lote): ${r.semDados.join(", ")}`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
```

- [ ] **Step 8: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 9: Detalhar o lote real**

Run: `npm run detalhar`
Expected: "Detalhados: N · sem dados: M", fotos em `sites/public/fotos/<slug>/`, nova linha em `leads/_sistema/uso.json`.

- [ ] **Step 10: Commit**

```bash
git add prospeccao/doApify.ts prospeccao/doApify.test.ts prospeccao/fotos.ts prospeccao/fotos.test.ts prospeccao/detalhar.ts prospeccao/detalhar.test.ts prospeccao/cli/detalhar.ts
git commit -m "feat(prospeccao): fetch reviews, hours and photos for the batch"
```

---

### Task 12: Comando `limpar` (retenção de 14 dias)

**Files:**
- Create: `prospeccao/limpar.ts`, `prospeccao/cli/limpar.ts`
- Test: `prospeccao/limpar.test.ts`

**Interfaces:**
- Consumes: `Lead`, `Armazem` (Tasks 1 e 6), `leadDeTeste` (Task 6), artifact (Task 9).
- Produces:
  - `interface StatusPainel { id: string; status: string; atualizadoEm: string }`
  - `selecionarParaLimpar(leads: Lead[], status: StatusPainel[], agora: Date): string[]` (slugs)
  - `PATCH_LIMPEZA`: campos coletados zerados + `limpo: true` (mantém `slug`, `placeId`, `nicho`, `cidade`, `score`, status, notas, histórico, plano, preço e motivo)
  - Entrada `leads/_sistema/painel-status.json` (array de `StatusPainel`, exportado do painel por Claude); saída `leads/_sistema/painel-limpar.json` (array de `{ id, patch }`).

- [ ] **Step 1: Escrever o teste que falha — `prospeccao/limpar.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { selecionarParaLimpar, PATCH_LIMPEZA } from "./limpar.ts";
import { leadDeTeste } from "./fixtures/lead.ts";

const AGORA = new Date("2026-10-30T12:00:00Z");
const antigo = "2026-10-10T12:00:00Z";
const recente = "2026-10-25T12:00:00Z";

test("aplica a regra de 14 dias", () => {
  const leads = [
    leadDeTeste({ slug: "perdido", fase: "lote" }),
    leadDeTeste({ slug: "novo-parado", fase: "lote" }),
    leadDeTeste({ slug: "sem-resposta-recente", fase: "lote" }),
    leadDeTeste({ slug: "interessado-parado", fase: "lote" }),
    leadDeTeste({ slug: "candidato-velho", fase: "candidato", buscadoEm: antigo }),
    leadDeTeste({ slug: "candidato-novo", fase: "candidato", buscadoEm: recente }),
  ];
  const status = [
    { id: "perdido", status: "perdeu", atualizadoEm: recente },
    { id: "novo-parado", status: "novo", atualizadoEm: antigo },
    { id: "sem-resposta-recente", status: "sem_resposta", atualizadoEm: recente },
    { id: "interessado-parado", status: "interessado", atualizadoEm: antigo },
  ];
  assert.deepEqual(selecionarParaLimpar(leads, status, AGORA), ["perdido", "novo-parado", "candidato-velho"]);
});

test("o patch apaga dados coletados e mantém o trabalho de quem liga", () => {
  assert.equal(PATCH_LIMPEZA.limpo, true);
  assert.equal(PATCH_LIMPEZA.telefone, null);
  assert.equal(PATCH_LIMPEZA.nome, null);
  for (const campo of ["slug", "placeId", "status", "notas", "historico", "plano", "precoMensal", "motivoPerda", "nicho", "cidade", "score"]) {
    assert.equal(campo in PATCH_LIMPEZA, false, campo);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `limpar.ts` não encontrado.

- [ ] **Step 3: Implementar `prospeccao/limpar.ts`**

```ts
import type { Lead } from "./tipos.ts";

export interface StatusPainel {
  id: string;
  status: string;
  atualizadoEm: string;
}

const QUATORZE_DIAS = 14 * 24 * 60 * 60 * 1000;

export const PATCH_LIMPEZA = {
  limpo: true,
  nome: null,
  endereco: null,
  telefone: null,
  whatsapp: null,
  instagram: null,
  instagramUrl: null,
  bairro: null,
  nota: null,
  avaliacoes: null,
  mapsUrl: null,
  previaUrl: null,
};

export function selecionarParaLimpar(leads: Lead[], status: StatusPainel[], agora: Date): string[] {
  const limite = agora.getTime() - QUATORZE_DIAS;
  const porId = new Map(status.map((s) => [s.id, s]));
  return leads
    .filter((l) => {
      const s = porId.get(l.slug);
      if (!s) return Date.parse(l.buscadoEm) < limite;
      if (s.status === "perdeu") return true;
      if (s.status === "novo" || s.status === "sem_resposta") return Date.parse(s.atualizadoEm) < limite;
      return false;
    })
    .map((l) => l.slug);
}
```

- [ ] **Step 4: Implementar `prospeccao/cli/limpar.ts`**

```ts
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { criarArmazem } from "../armazem.ts";
import { PATCH_LIMPEZA, selecionarParaLimpar, type StatusPainel } from "../limpar.ts";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const armazem = criarArmazem(raiz);
const status = armazem.lerSistema<StatusPainel[] | null>("painel-status.json", null);
if (!status) {
  console.error("Falta leads/_sistema/painel-status.json. Peça ao Claude para exportar os status do painel antes.");
  process.exit(1);
}
const noPainel = new Set(status.map((s) => s.id));
const slugs = selecionarParaLimpar(armazem.listarLeads(), status, new Date());
for (const slug of slugs) {
  armazem.removerLead(slug);
  rmSync(join(raiz, "sites", "public", "fotos", slug), { recursive: true, force: true });
}
const paraPainel = slugs.filter((s) => noPainel.has(s)).map((id) => ({ id, patch: PATCH_LIMPEZA }));
armazem.gravarSistema("painel-limpar.json", paraPainel);
console.log(`Apagados localmente: ${slugs.length} · para limpar no painel: ${paraPainel.length} (leads/_sistema/painel-limpar.json)`);
```

`import { ..., type StatusPainel }` usa import de tipo inline, que o type stripping também apaga.

- [ ] **Step 5: Rodar testes e checagem de tipos**

Run: `npm test && npm run typecheck`
Expected: todos PASS; `tsc` sem erros.

- [ ] **Step 6: Ensaiar o fluxo completo uma vez**

1. `ArtifactData` `list` da coleção `leads` → grave `leads/_sistema/painel-status.json` como `{ "exportadoEm": "<agora em ISO>", "status": [{ id, status, atualizadoEm, limpo }] }` (um item por documento). O `limpar` recusa exportação com mais de 1 hora e apaga o arquivo depois de usar.
2. Run: `npm run limpar`
   Expected: hoje, logo após o primeiro lote, "Apagados localmente: 0 · para limpar no painel: 0" (ou só candidatos com mais de 14 dias).
3. Se `painel-limpar.json` tiver itens: `ArtifactData` `batch` com um `update` por item em `leads/<id>` usando o `patch`.

Repita este step a cada duas semanas.

- [ ] **Step 7: Commit**

```bash
git add prospeccao/limpar.ts prospeccao/limpar.test.ts prospeccao/cli/limpar.ts
git commit -m "feat(prospeccao): add 14-day retention cleanup"
```


---

## Adendo de 2026-10-10: painel fora do claude.ai

A pessoa não faz login no claude.ai no celular, e o artifact com `db` só abre para quem está logado. O painel virou uma página estática com os leads criptografados por senha. Este adendo substitui os passos com `Artifact`/`ArtifactData` das Tasks 9, 10 e 12.

- **Senha:** `senha.env` (ignorado pelo git) com `PAINEL_SENHA=` e 16 caracteres ou mais. Claude nunca mostra o valor.
- **Código:** `painel/cripto.js` (PBKDF2-SHA256 600k → AES-256-GCM, Web Crypto), anotações no navegador em `painel/logica.js` (`anotar`, `mesclarLeads`, `montarBackup`, `importarBackup`), build em `painel/construir.ts` + `painel/cli/construir.ts`.
- **Publicação:** `painel/dist/` é um clone do repositório `NeekNegoer/caderno` (GitHub Pages, branch `main`, raiz). Endereço: `https://neeknegoer.github.io/caderno/`. Local: `npm run painel:local` → `http://localhost:4173`. As anotações do celular e do computador ficam separadas (cada endereço tem o seu armazenamento); para levar de um para o outro, Exportar backup num e Importar no outro.

**Novo lote (troca a Task 10, Steps 4–6):**
1. `npm run lote -- --quantidade 25`
2. `npm run painel:construir` → "painel/dist/index.html gerado com N leads".
3. `npm run painel:publicar` → o GitHub Pages atualiza em cerca de 1 minuto. As anotações já feitas continuam no celular.

**Limpeza a cada duas semanas (troca a Task 12, Step 6):**
1. No celular: Roteiro → Exportar backup, e mandar o arquivo para o computador.
2. Salvar o texto do backup em `leads/_sistema/painel-status.json` (o `limpar` recusa backup com mais de 1 hora e apaga o arquivo depois de usar).
3. `npm run limpar`, depois `npm run painel:construir` e `npm run painel:publicar` para tirar os leads apagados da página. Quem tinha anotação continua visível como arquivado.

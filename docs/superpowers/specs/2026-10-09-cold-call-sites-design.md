# Cold call de sites — Design

Data: 2026-10-09 · Status: aguardando revisão · Rev. 2: fonte de leads trocada para Apify

## 1. Objetivo

Renda extra vendendo sites para negócios locais por ligação (cold call). O diferencial: o negócio já tem uma prévia do próprio site — com nome, fotos, avaliações e agenda online funcionando — quando você liga.

Papel do Claude: encontrar e priorizar leads, gerar a prévia personalizada de cada um, transformar a prévia em site final quando fechar e configurar a agenda do cliente.

**Sucesso da v1:** um lote real de 20–30 leads da Grande Florianópolis no painel, cada um com prévia publicada e agendamento de demonstração funcionando, pronto para ligar.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Região | Grande Florianópolis: Florianópolis, São José, Palhoça, Biguaçu. Expandir depois. |
| Nichos v1 | Barbearia; estética (sobrancelha, cílios, unhas, depilação, harmonização, salão de beleza). |
| Público-alvo v1 | Negócios sem site, ou cujo "site" no Google é rede social, link de bio ou app de agenda. |
| Fonte de leads | Google Maps via Apify (ator "Google Maps Scraper", plano grátis, sem cartão). A API oficial do Google foi descartada porque exige pré-pagamento de R$200. |
| Gestão de leads | Painel privado no claude.ai (mini-CRM), usado no celular. |
| Prévia | Todo lead ganha prévia personalizada (template base + ficha por lead). Interessados ganham versão caprichada. |
| Agenda | Google Agenda (uma agenda por profissional) + Google Apps Script. Sem banco SQL, sem servidor. |
| WhatsApp | Só botão de contato. Agendamento via WhatsApp fica fora e não conta como critério de prioridade. |
| Marca | Nenhuma: você se apresenta pelo próprio nome. Prévias em subdomínio grátis. |
| Domínio do cliente | `.com.br` no Registro.br, no CPF/CNPJ do cliente, com você como contato técnico. Custo repassado na mensalidade. |
| Hospedagem | Cloudflare Pages (grátis). |
| Stack | Node.js 24, TypeScript, Astro; Apps Script (JavaScript) com clasp. |
| Design | Skill `frontend-design` (direção visual) + skills do Emil Kowalski em `.claude/skills/` (commit `e8a175d`, licença MIT) para acabamento, movimento, mobile e casos extremos. |
| Ordem | Plano A (prospecção + painel) → Plano B (gerador de sites + agenda). Cada plano tem implementação própria. |

### Oferta (proposta para o roteiro — ajuste à vontade)

- **Implantação:** R$790 à vista ou 3× R$290. Inclui site one-page, agenda online, domínio `.com.br` registrado em nome do cliente e perfil do Google ligado ao site.
- **Mensalidade:** R$99. Inclui hospedagem, renovação do domínio, agenda e até 2 alterações pequenas por mês.

## 3. Fora do escopo da v1

- Leads que já têm site próprio (v2: "site ruim").
- Agendamento via WhatsApp, lembretes automáticos por WhatsApp, sinal via PIX.
- Reservas de restaurante. O motor fica preparado para um "modo capacidade", implementado quando surgir o primeiro restaurante.
- Site ou marca próprios de quem vende.
- Coleta automática no Instagram (viola os termos). O @ entra só quando aparece como site no Google Maps.
- Sites com várias páginas.
- Dono editar a própria configuração da agenda. Mudanças passam por você e fazem parte da mensalidade.

## 4. Arquitetura

```
.cold/
├── prospeccao/          Plano A — busca (Apify), filtro, pontuação, detalhes
├── leads/               (fora do git) 1 JSON por lead + IDs vistos + gasto
├── sites/               Plano B — projeto Astro
│   ├── src/fichas/      1 ficha JSON por site (prévia ou final)
│   ├── src/layouts/     variações por nicho
│   ├── src/components/  seções + widget de agendamento
│   └── public/fotos/    (fora do git) fotos das prévias
├── agenda/              Plano B — Apps Script central (clasp)
│   ├── src/             código do motor
│   └── negocios/        1 config JSON por cliente + demo
└── docs/superpowers/    specs e planos
```

Fluxo:

1. `npm run buscar` busca no Google Maps via Apify, filtra, pontua e grava os leads em `leads/`.
2. Claude envia o lote para o painel.
3. `npm run detalhar` busca avaliações, fotos e horário do lote; Claude escreve uma ficha por lead.
4. `npm run build` gera os sites e `npm run publicar` envia as prévias ao Cloudflare Pages.
5. O link de cada prévia aparece no painel. Você liga.
6. Fechou: Claude refina a ficha com material do cliente, publica o site final no domínio dele e cadastra o negócio na agenda.

## 5. Plano A — Prospecção

### 5.1 Busca (descoberta)

- Ator `compass/crawler-google-places` da Apify, chamado pelo cliente oficial `apify-client`.
- Uma execução por nicho × local: termos do nicho em `searchStringsArray`, local `"<bairro>, <cidade>, Santa Catarina, Brasil"`, idioma pt-BR, fechados ignorados.
- Modo barato: **sem** página de detalhe, **sem** fotos, **sem** avaliações, com limite de lugares por busca.
- Campos usados: placeId, nome, endereço, bairro, cidade, telefone, site, nota, nº de avaliações, categoria, link do Maps.
- Termos por nicho e bairros por cidade ficam em `prospeccao/config.json`.
- Duplicados são removidos pelo placeId. IDs já vistos ficam em `leads/vistos.json` e não voltam.
- Endereços fora das 4 cidades são descartados.
- **Isolamento:** o módulo da Apify só converte o resultado para o formato de lead (5.6). Trocar de fonte (ex.: API oficial do Google) não mexe em filtro, pontuação, painel nem sites.

### 5.2 Filtro

- O filtro "sem site" do próprio ator **não** é usado: ele descartaria quem tem só Instagram, que é lead quente.
- Descarta: sem telefone.
- Classifica o campo "site":
  - vazio → `sem_site`
  - domínio de rede social, link de bio ou app de agenda (instagram.com, facebook.com, fb.com, linktr.ee, linkme.bio, beacons.ai, bio.link, wa.me, api.whatsapp.com, booksy.com, trinks.com, business.site) → `so_rede`
  - qualquer outro → `site_proprio`, descartado na v1
- Se o site for instagram.com, extrai o @.

### 5.3 Pontuação (0–100)

| Critério | Pontos |
|---|---|
| Avaliações | `min(n, 100) / 100 × 50` |
| Nota | ≥ 4,5 → 25 · ≥ 4,0 → 15 · ≥ 3,5 → 5 · abaixo ou sem nota → 0 |
| Celular (11 dígitos, terceiro dígito 9) | 15 |
| Instagram identificado | 10 |

O lote = os N leads de maior pontuação (padrão 25).

### 5.4 Detalhes (só do lote)

- Segunda execução do ator só com os placeIds do lote, com página de detalhe: horário de funcionamento, coordenadas, até 5 avaliações, até 4 fotos.
- Fotos baixadas para `sites/public/fotos/<slug>/` (as URLs do Google podem expirar).
- Fotos do Google aparecem só na prévia privada, com a legenda "Fotos: Google Maps". O site final usa fotos do cliente.

### 5.5 Controle de custo

- Plano grátis da Apify: US$5 de crédito por mês, sem cartão. Quando acaba, as execuções param até o mês seguinte. Não existe cobrança extra.
- Estimativa (conferida na busca teste): descoberta de ~80 lugares + detalhes de 25 leads ≈ US$0,50–1,00 por lote. O crédito grátis rende vários lotes por mês.
- O script define um teto de gasto por execução (configurável) e consulta o uso do mês antes de rodar. Se não houver saldo para a execução, avisa e não roda.
- Cada execução registra o gasto em `leads/uso.json`.

### 5.6 Formato do lead (`leads/<slug>.json`)

`placeId, slug, nicho, termo, cidade, bairro, nome, endereco, telefone, celular (bool), instagram, site, classificacao, nota, avaliacoes, mapsUrl, score, buscadoEm`. Depois dos detalhes, também: `horarios, coordenadas, reviews[], fotos[]`.

Slug: nome em minúsculas, sem acento, hifenizado. Em caso de colisão, recebe sufixo numérico.

### 5.7 Retenção de dados

Os dados vêm de página pública do Google Maps, coletada por terceiro (risco na seção 10). Para minimizar dados pessoais (LGPD):

- `npm run limpar` apaga JSON e fotos de leads em status `perdeu`, ou em `novo`/`sem resposta` sem mudança há mais de 14 dias, e limpa os campos coletados desses leads no painel. Ficam o placeId e as suas anotações.
- O que você levanta na ligação (nome do dono, interesse, contato confirmado) é seu.
- Lead fechado passa a usar dados e fotos fornecidos pelo próprio cliente.

### 5.8 Painel (mini-CRM)

- Página privada no claude.ai com banco de dados do próprio artifact. Claude grava os leads e você atualiza pelo celular.
- Lista ordenada por próxima ação e pontuação, com filtros por status, nicho e cidade.
- Cartão do lead: nome, nicho, bairro, nota (nº de avaliações), pontuação; botões Ligar (`tel:`), WhatsApp, Instagram, Maps e Prévia; status; data do próximo contato; notas com salvamento automático; histórico de mudanças de status.
- Status: novo → sem resposta → retornar → interessado → reunião → fechou / perdeu.
- Aba "Roteiro": roteiro de ligação, respostas para objeções comuns e a oferta da seção 2.

## 6. Plano B — Gerador de sites + agenda

### 6.1 Ficha (`sites/src/fichas/<slug>.json`)

Validada por schema no build: ficha inválida faz o build falhar com mensagem clara.

- `slug` (nas prévias, com sufixo aleatório de 4 caracteres para o link não ser adivinhável), `placeId`, `modo` (`previa` | `final`), `nicho`, `layout`
- `tema`: cores (fundo, superfície, texto, destaque) e par de fontes de uma lista curada
- `textos`: título, subtítulo, sobre, chamada do botão
- `servicos[]`: nome, duração (min), preço opcional. Prévias nunca inventam preço.
- `profissionais[]`: nome, foto opcional, id da agenda
- `depoimentos[]`: autor, texto, nota
- `fotos[]`: arquivo, alt, legenda
- `contato`: telefone, whatsapp, instagram, endereço, mapsUrl, horários por dia da semana
- `agenda`: id do negócio no motor (`demo` nas prévias)

### 6.2 Layouts

- Barbearia: clássica, moderna escura, minimal. Estética: suave, luxo, clean.
- Todas usam as mesmas seções e componentes; mudam composição, tipografia, formas e movimento.
- As variações são construídas com a skill `prototype` (comparação lado a lado) e aprovadas por você antes de virar template.

### 6.3 Seções do site (one-page, mobile primeiro)

1. Faixa "Prévia criada para <Negócio>" (só no modo prévia)
2. Início: nome, frase, botão Agendar
3. Serviços
4. Equipe (some se não houver profissionais nomeados)
5. Depoimentos
6. Galeria
7. Localização e horário (endereço, botão "Como chegar")
8. Rodapé: Instagram, WhatsApp (contato), link de privacidade

Mais uma página `/privacidade` (LGPD) gerada pelo template.

### 6.4 Widget de agendamento

- Gaveta de baixo para cima no celular, modal no computador. Sem React: Astro + TypeScript.
- Passos: serviço → profissional (ou "sem preferência") → dia (próximos 14) → horário livre → nome + celular (+ e-mail opcional) → confirmação.
- Fuso: America/Sao_Paulo.
- Erros: horário tomado entre a escolha e a confirmação → aviso e horários recarregados; motor fora do ar → mensagem com telefone/WhatsApp de contato.

### 6.5 Motor da agenda (Apps Script central)

**Mudança em relação à conversa:** em vez de instalar uma cópia do script na conta de cada cliente, um único script roda numa **conta Google de operação** sua (Gmail dedicado, a mesma da demo). Cada cliente cria as agendas dos profissionais na conta dele e as compartilha com a conta de operação, com permissão para editar eventos. O cliente continua dono das agendas e pode revogar o acesso quando quiser. Ganho: uma implantação, uma URL, atualização vale para todos na hora, e o cliente só compartilha agendas (2 minutos) em vez de autorizar um script.

- **API:** `GET ?acao=horarios&negocio&servico&profissional&data` → horários livres. `POST` com corpo JSON em `text/plain` (evita preflight CORS) e `acao=agendar` → `{ok: true}` ou `{ok: false, erro: "ocupado" | "limite" | "invalido"}`.
- **Horários livres** = funcionamento do dia − eventos existentes na agenda do profissional − duração do serviço, em passos de 30 min (configurável), com antecedência mínima de 60 min. "Sem preferência" une os horários de todos e atribui o primeiro profissional livre.
- Qualquer evento criado pelo dono ou pelo profissional bloqueia o horário ("Almoço", "Folga").
- **Agendar:** trava (LockService), revalida o horário e cria o evento `Serviço — Nome`, com o celular na descrição e uma etiqueta de origem. E-mail informado vira convidado, e o Google manda o lembrete.
- **Proteção:** validação de celular brasileiro, campo isca contra robôs, máximo de 2 agendamentos por celular por dia.
- **Config por negócio** em `agenda/negocios/<id>.json` (serviços, durações, horários, profissionais → id da agenda), versionada no git e embutida no deploy. Em produção, durações vêm só da config; o navegador nunca define duração.
- **Modo demo** (`negocio=demo`): agendas "Profissional 1/2/3" da conta de operação; profissionais da ficha mapeados por posição; durações aceitas da requisição (só na demo); eventos marcados com o slug do lead; gatilho diário às 03:00 apaga os eventos de demo.
- Deploy com clasp mantendo o mesmo ID de implantação, para a URL não mudar.

### 6.6 Build e publicação

- Astro estático.
- Prévias: um projeto Cloudflare Pages, um caminho por slug, `noindex` (meta + cabeçalho). A raiz do projeto não lista nada.
- Site final: build só daquele slug, servido na raiz do domínio do cliente, em projeto Cloudflare Pages próprio.
- `npm run publicar` usa wrangler.

## 7. Testes e verificação

- Funções puras com testes (Node test runner, TDD): classificação de site, pontuação, slug, extração do @, conversão do resultado da Apify para lead, cálculo de horários livres, validação de celular.
- Busca teste pequena (1 termo, 1 bairro, até 10 lugares) antes do primeiro lote: confirma quais campos vêm sem página de detalhe e o custo real por lugar.
- Ficha "pior caso" (nome enorme, sem fotos, 1 avaliação, sem horário) renderizada em todas as variações, com a skill `break-ui`.
- Baseline da skill `mobile-native` obrigatório; verificação visual em 390 px com Playwright.
- Agenda ponta a ponta na demo: agendar → horário some → conflito simultâneo é recusado → limpeza diária apaga.

## 8. Segurança e privacidade

- Token da Apify em `.env` (fora do git).
- `leads/` e `sites/public/fotos/` fora do git.
- Conta de operação com verificação em duas etapas.
- Prévias: faixa de prévia, `noindex`, links com sufixo aleatório, remoção quando o lead fecha ou é perdido.
- LGPD: página de privacidade em todo site com agenda; coleta mínima (nome, celular, e-mail opcional); dados ficam nas agendas do cliente; você atua como operador dos dados.

## 9. Contas e setup (você)

| Conta | Para quê | Quando |
|---|---|---|
| Apify (grátis, sem cartão) | Busca de leads | Plano A |
| Gmail de operação | Demo + motor da agenda | Plano B |
| Cloudflare | Hospedagem das prévias e sites | Plano B |

## 10. Riscos conhecidos

- **Raspagem:** a Apify coleta páginas públicas do Google Maps, e os termos do Google proíbem raspagem. O risco recai principalmente sobre a Apify; para você, com uso comercial pontual de dados públicos de empresas, o risco prático é baixo. Saída limpa disponível: API oficial (pré-pagamento de R$200, reembolsável), trocando só o módulo de busca (5.1).
- Preço ou funcionamento do ator podem mudar: teto de gasto por execução, busca teste e módulo isolado.
- Cotas do Apps Script em conta gratuita: suficientes para dezenas de negócios pequenos. Reavaliar com escala (Google Workspace ou Cloudflare Workers).
- Conta de operação é ponto único de falha: 2FA obrigatório; se ela cair, todas as agendas param.

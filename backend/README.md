# backend/ — BFF do TRÍADE (Next.js)

```powershell
copy .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

Este Next.js é o BFF do app mobile (é o lugar onde as chaves vivem — o app
nunca fala com o astro-calc-service, com a API do Gemini nem com a service
role do Supabase) **e também serve o app web** (export estático do Expo),
pra dar um link público único sem precisar de um segundo serviço no Railway.
Ver "App web" abaixo.

## Banco (Supabase)

Schema em `supabase/schema.sql` — 7 tabelas (`perfis`, `mapas_natais`,
`leituras_diarias`, `interpretacoes_signos`, `mensagens`, `sinastrias`,
`geocoding_cache`), RLS ligado em todas, policies por `auth.uid()`.

Como rodar:

1. Crie um projeto no [Supabase](https://supabase.com) (ainda não existe um
   real — `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` estão vazias em
   `.env.example`).
2. Supabase Studio → SQL Editor → cole `supabase/schema.sql` inteiro → Run.
   (Ou `supabase db push` via CLI, ou `psql "$DATABASE_URL" -f supabase/schema.sql`.)
3. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (e `SUPABASE_ANON_KEY`,
   ainda sem uso pelo backend) em `.env.local`.

`mapas_natais` é preenchida por `POST /api/auth/cadastro` (calcula os 3
sistemas na hora, a partir dos dados de nascimento do cadastro, e persiste
numa chamada só — ver `src/lib/mapasNatais.ts`) e lida de volta por
`POST /api/auth/login` e pelas rotas de interpretação abaixo. As rotas
`/api/calcular/*` continuam proxy puro sem persistir nada — de propósito: são
usadas também pela Sinastria pra calcular o mapa de uma SEGUNDA pessoa, e
isso nunca pode sobrescrever o mapa do usuário logado.

**Pendência conhecida:** não existe hoje uma rota autenticada de "recalcular
e persistir" — se o cálculo falhar no cadastro (`mapa: null` na resposta), o
app tem um retry client-side (`tentarRecalcularMapa` no `PerfilContext`) que
só atualiza o estado local, não `mapas_natais`. Um login futuro em outro
aparelho ainda viria com `mapa: null` até essa rota existir.

## Gemini (interpretação em PT-BR)

`src/lib/interpretacao.ts` é o único ponto que fala com a API do Gemini —
REST direta via `fetch` (`generativelanguage.googleapis.com`), sem SDK. Ver o
comentário no topo do arquivo para o porquê de não usar `@google/genai`.

`GEMINI_API_KEY` e `GEMINI_MODEL` (padrão `gemini-2.5-flash`) em `.env.local`.
Sem a chave, qualquer rota de interpretação devolve `INTERPRETACAO_INDISPONIVEL`
(503) de forma tratada — nunca derruba a rota nem o processo.

## Rotas

| Rota | Estado | O que faz |
| --- | --- | --- |
| `GET /api/health` | pronto | Diz quais integrações estão configuradas |
| `POST /api/calcular/mapa-ocidental` | pronto (proxy) | Valida, embrulha em `{ dados }` e repassa |
| `POST /api/calcular/signo-chines` | pronto (proxy) | Valida e repassa |
| `POST /api/calcular/sistema-egipcio` | pronto (proxy) | Valida e repassa |
| `POST /api/auth/cadastro` | pronto | Cria conta (Supabase Auth) + `perfis` |
| `POST /api/auth/login` | pronto | Login por e-mail/senha |
| `POST /api/interpretacao/leitura-diaria` | pronto | Bloco pôster + 3 frases do dia (auth + cache diário) |
| `POST /api/interpretacao/signos` | pronto | 2 parágrafos por sistema (auth + cache permanente) |
| `POST /api/conversa` | pronto | Chat com streaming (auth + histórico persistido) |

"Pronto" aqui significa: código real, sem mock, testado até onde dá sem
credenciais reais (ver seção "O que não foi testado" abaixo).

## Autenticação

E-mail/senha via Supabase Auth. Sem magic link, sem OAuth social por enquanto.

### `POST /api/auth/cadastro`

Corpo (`CadastroRequest`, `@shared/types/api`):

```json
{
  "email": "pessoa@example.com",
  "senha": "pelomenos8caracteres",
  "nome": "Nome da pessoa",
  "data_nascimento": "1990-05-15",
  "hora_nascimento": "14:20",
  "hora_desconhecida": false,
  "cidade": "Rio de Janeiro",
  "pais": "Brasil"
}
```

Resposta `201` (`AuthResponse`):

```json
{
  "sessao": { "access_token": "...", "refresh_token": "...", "expira_em": 1234567890 },
  "perfil": {
    "id": "uuid",
    "nome": "Nome da pessoa",
    "data_nascimento": "1990-05-15",
    "hora_nascimento": "14:20:00",
    "hora_desconhecida": false,
    "cidade": "Rio de Janeiro",
    "pais": "Brasil",
    "criado_em": "2026-08-26T12:00:00.000Z"
  },
  "mapa": { "ocidental": { "...": "..." }, "chines": { "...": "..." }, "egipcio": { "...": "..." } }
}
```

`mapa` é calculado na hora (ver `lib/mapasNatais.ts`) — vem `null` se o
cálculo falhar (cidade não encontrada, etc.); a conta ainda assim é criada.

Erros: `400 ENTRADA_INVALIDA`, `409 EMAIL_JA_CADASTRADO`, `503 ERRO_INTERNO`
(Supabase não configurado).

### `POST /api/auth/login`

Corpo (`LoginRequest`): `{ "email": "...", "senha": "..." }`.
Resposta `200`: mesma forma de `AuthResponse` acima.
Erros: `400 ENTRADA_INVALIDA`, `401 CREDENCIAIS_INVALIDAS`, `503 ERRO_INTERNO`.

### Rotas autenticadas

O app manda `Authorization: Bearer <access_token>` (o `access_token` que
`cadastro`/`login` devolveram). Sem isso, ou com token inválido/expirado:
`401 NAO_AUTENTICADO`. `access_token` expira — quando isso acontecer, usar
`refresh_token` para renovar (endpoint de refresh ainda não existe no backend;
pendência — ver "O que falta").

## Detalhe importante do contrato

Dos três endpoints do serviço Python, **só o mapa ocidental usa o envelope**
`{ "dados": {...} }`; os outros dois recebem o objeto plano. Essa assimetria fica
escondida em `src/lib/astroCalc.ts`: o app manda sempre o objeto plano e o
backend embrulha. Não vaze o envelope para o cliente.

## Conversa (streaming)

`POST /api/conversa` devolve `text/event-stream`. Cada evento:
`data: {"delta":"texto parcial"}\n\n`, terminando com `data: [DONE]\n\n`. O app
consome com `fetch` + `response.body.getReader()`. Corpo: `{ "mensagem": "..." }`
(`historico` do tipo `ConversaRequest` é ignorado — o histórico vem de
`mensagens` no Supabase).

## Erros

Todo erro sai como `{ erro: { codigo, mensagem } }` (`ApiErro` em
`@shared/types/api`). O app decide a tela pelo `codigo`, nunca pelo texto:

- `GEOCODING_FALHOU` (422) → volta ao passo 3 do onboarding com mensagem inline.
- `ANO_FORA_DA_TABELA` (422) → degradar para ocidental + egípcio.
- `SERVICO_INDISPONIVEL` (502/503) → tela de falha com "Tentar de novo".
- `INTERPRETACAO_INDISPONIVEL` (503) → mostrar o cálculo sem o texto.
- `NAO_AUTENTICADO` (401) → tela de login.
- `CREDENCIAIS_INVALIDAS` (401) → erro inline no login.
- `EMAIL_JA_CADASTRADO` (409) → sugerir login no lugar de cadastro.
- `MAPA_NAO_CALCULADO` (409) → mandar calcular/persistir o mapa primeiro.

## App web (deploy público)

Além do BFF, este serviço serve o app em `mobile/` como site (export web do
Expo) — um link público único, sem exigir instalar nada. Rodando ao vivo em
`https://backend-production-0d97.up.railway.app` (Railway, projeto `triade`).

**Como funciona:** `[...catchall]/route.ts` (e `route.ts` na raiz) devolvem o
mesmo HTML pra qualquer caminho fora de `/api` — é uma SPA, o roteamento
acontece no cliente (expo-router). `_expo/` e `app-web.html` em `public/` são
servidos normalmente pelo Next.js.

**Para atualizar o app web depois de mudar algo em `mobile/`:**

```bash
cd mobile
# EXPO_PUBLIC_BACKEND_URL no mobile/.env precisa já apontar pra URL pública
# deste backend ANTES do build — é embutida no bundle, não lida em runtime.
npx expo export --platform web --clear

cd ../backend
rm -rf public/_expo public/app-web.html font-assets
cp -r ../mobile/dist/_expo public/_expo
cp ../mobile/dist/index.html public/app-web.html
cp -r ../mobile/dist/assets/node_modules font-assets   # ver por quê abaixo

cd ..
railway up --service backend --verbose   # da RAIZ do repo, não de backend/
```

**Por que `font-assets/` na raiz de `backend/`, e não `public/assets/`
(bug real, já foi encontrado e custou tempo):** o `railway up` **pula
silenciosamente qualquer diretório chamado `node_modules`**, mesmo que o
`.gitignore` diga explicitamente pra não ignorar — não é um comportamento de
`.gitignore`, é hardcoded no CLI do Railway. O export web do Expo gera as
fontes em `dist/assets/node_modules/@expo-google-fonts/archivo/*.ttf`
(espelha o caminho de `require()`), então esse diretório nunca subia — sem
erro 4xx, sem erro de console: a resposta vinha `200` com o HTML da SPA no
lugar da fonte, e o app carregava com o Archivo trocado pela fonte padrão do
navegador. A correção: os arquivos moram em `backend/font-assets/` (mesmo
conteúdo, caminho sem a palavra "node_modules"), e `lib/spa.ts` remapeia a
URL pública `/assets/node_modules/...` (fixa no bundle, não dá pra mudar) pro
caminho de disco real. Ver o comentário no topo de `src/lib/spa.ts` para o
detalhe completo — inclusive um segundo desvio (`dynamic = 'force-dynamic'`
nas rotas SPA) que fazia parte da mesma investigação mas acabou não sendo a
causa raiz.

**Deploy do `astro-calc-service`:** serviço irmão no mesmo projeto Railway,
`cd astro-calc-service && railway up --service astro-calc` — não precisa do
Dockerfile na raiz (não depende de `shared/`), usa Nixpacks normal.

## O que não foi testado (falta credencial real)

- Nenhuma chamada real à Gemini foi feita (`GEMINI_API_KEY` ainda não existe
  no ambiente de produção). O caminho de erro (`INTERPRETACAO_INDISPONIVEL`)
  foi validado em produção (responde 503 de forma tratada); o parsing do
  JSON/SSE de resposta não rodou contra a API de verdade.
- Nenhum projeto Supabase real existe ainda. `schema.sql` não rodou contra um
  banco de verdade; as policies de RLS não foram exercitadas;
  `cadastro`/`login` respondem 503 tratado em produção, não testados ponta a
  ponta com dados reais.

## Próximos passos

1. Rodar `supabase/schema.sql` num projeto real, preencher `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` nas variáveis do serviço
   `backend` no Railway (`railway variable set ... --service backend`), e
   testar `cadastro`/`login`/interpretação ponta a ponta com dados reais.
2. Endpoint de refresh de sessão (`refresh_token` → novo `access_token`).
3. CORS restrito e rate limit antes de abrir de vez ao público.

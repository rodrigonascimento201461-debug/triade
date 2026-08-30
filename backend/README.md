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
Expo) — um link público único, sem exigir instalar nada.

**Ao vivo:**
- App + backend: `https://triade-app.netlify.app` (Netlify, site "triade-app",
  conectado ao GitHub `rodrigonascimento201461-debug/triade`, deploy automático
  a cada push em `master`).
- `astro-calc-service`: `https://astro-calc.onrender.com` (Render, serviço
  "astro-calc", mesmo repo, `rootDir: astro-calc-service`, deploy automático
  a cada push).

**Migrou de Railway pra Netlify+Render** porque o trial grátis da Railway
expirou (passou a exigir cartão). Netlify não roda Python (nem em Functions),
por isso o serviço de cálculo foi separado pro Render, que tem camada grátis
real pra isso (com um detalhe: o serviço "dorme" depois de ~15min sem uso, o
primeiro request depois disso demora ~30-50s pra acordar).

**Como funciona (app web):** `[...catchall]/route.ts` (e `route.ts` na raiz)
devolvem o mesmo HTML pra qualquer caminho fora de `/api` — é uma SPA, o
roteamento acontece no cliente (expo-router). `_expo/` e `app-web.html` em
`public/` são servidos normalmente pelo Next.js.

**Para atualizar o app web depois de mudar algo em `mobile/`:**

```bash
cd mobile
# EXPO_PUBLIC_BACKEND_URL no mobile/.env precisa já apontar pra URL pública
# deste backend (https://triade-app.netlify.app) ANTES do build — é
# embutida no bundle, não lida em runtime.
npx expo export --platform web --clear

cd ../backend
rm -rf public/_expo public/app-web.html font-assets
cp -r ../mobile/dist/_expo public/_expo
cp ../mobile/dist/index.html public/app-web.html
cp -r ../mobile/dist/assets/node_modules font-assets   # ver por quê abaixo

cd ..
git add -A && git commit -m "atualiza app web" && git push
# a Netlify builda e publica sozinha a partir daqui (~1-2min)
```

**Por que `font-assets/` na raiz de `backend/`, e não `public/assets/`**
(bug real, encontrado tanto no Railway quanto — por um motivo diferente — via
o mecanismo de deploy do Netlify): o nome da pasta gerada pelo export do Expo
é `dist/assets/node_modules/@expo-google-fonts/archivo/*.ttf` (espelha o
caminho de `require()`). Várias ferramentas de deploy tratam qualquer pasta
chamada `node_modules` de forma especial (ignoram no upload). A correção: os
arquivos moram em `backend/font-assets/` (mesmo conteúdo, caminho sem a
palavra "node_modules"), e `lib/spa.ts` remapeia a URL pública
`/assets/node_modules/...` (fixa no bundle, não dá pra mudar) pro caminho de
disco real. Ver o comentário no topo de `src/lib/spa.ts`.

**netlify.toml — por que tudo é explícito (`cd backend && npm ci && npm run
build`):** a detecção automática de monorepo do Netlify (campo "Base
directory"/`package_path`) não funcionou pra essa estrutura de pastas —
mesmo configurado, o comando de build sempre rodava em `/opt/build/repo`
(raiz do repo) e o `npm ci` automático era pulado, quebrando com `next: not
found`. Descoberto forçando o build a "suceder" sempre e escrevendo
`pwd`/`ls`/erro real num arquivo dentro de `public/` pra poder buscar depois
via `curl` (não havia acesso aos logs de build pela API/CLI nesse momento).
Também é por isso que `output: 'standalone'` está em `next.config.mjs`
(exigido pelo `@netlify/plugin-nextjs`) e `outputFileTracingRoot` usa
`fileURLToPath` em vez de `new URL(...).pathname` (esse último gera um
caminho inválido no Windows, tipo `/C:/Projetos/...`).

**`astro-calc-service` no Render:** `render.yaml` na raiz do repo é o
blueprint (Infrastructure-as-Code) — mas o serviço ao vivo foi criado direto
via API do Render (`POST /v1/services`), não pelo blueprint, porque o fluxo
de blueprint pela dashboard exige clique manual de autorização que travou
repetidamente. O repositório GitHub precisou ficar **público** pra API do
Render conseguir ler o código sem essa autorização interativa (confirmado
sem nenhum segredo commitado antes de mudar a visibilidade).

## Estado das credenciais em produção

`GET /api/health` mostra o que está configurado:
`{"configurado":{"astro_calc":true,"gemini":true,"supabase":false}}` — assim
em 30/08/2026. `astro_calc` e `gemini` já são reais (chave de verdade,
serviço de cálculo ao vivo). `supabase` ainda falta: `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` nunca foram preenchidas, então `cadastro`/`login`
respondem 503 tratado — o app funciona até aí (onboarding, cálculo real do
mapa via os 3 endpoints), mas não passa do cadastro de conta.

## Próximos passos

1. Criar um projeto no [Supabase](https://supabase.com), rodar
   `supabase/schema.sql` nele, e setar `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do site Netlify
   (`netlify env:set NOME valor --context production`, depois redeploy) —
   isso destrava cadastro/login/interpretação de ponta a ponta.
2. Endpoint de refresh de sessão (`refresh_token` → novo `access_token`).
3. CORS restrito e rate limit antes de abrir de vez ao público.
4. Considerar deixar o repositório GitHub privado de novo (ficou público só
   pra desbloquear a API do Render sem exigir autorização manual — ver "App
   web" acima) — precisaria then reconectar o Render via GitHub App de
   verdade, não só a API de criação de serviço.

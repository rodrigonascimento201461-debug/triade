# STACK — TRÍADE

> Fonte da verdade da stack deste projeto. Qualquer especialista (banco, backend,
> deploy, segurança) deve ler este arquivo **antes** de aplicar convenções de stack.
> Se a stack real mudar, atualize aqui no mesmo commit.

Última atualização: 2026-08-23 · Status: scaffold criado, sem dependências instaladas.

---

## Tecnologias escolhidas

| Camada | Escolha | Observação |
| --- | --- | --- |
| App mobile | **Expo (React Native) + TypeScript**, expo-router (file-based) | Pasta `mobile/` |
| Fontes | `@expo-google-fonts/archivo` (400/500/600/700/800/900) | Archivo é obrigatória pelo design system |
| Ícones | `lucide-react-native` (+ `react-native-svg`) | Requisito explícito do briefing (P2 item 15) |
| Backend/BFF | **Next.js (App Router) + TypeScript** | Pasta `backend/` |
| Validação de entrada | `zod` | Nas route handlers |
| Serviço de cálculo | **Python / FastAPI** (fornecido pelo De Lobo) | Pasta `astro-calc-service/`, ainda vazia |
| Banco + Auth | **Supabase** (Postgres + Auth) | Padrão da agência, mantido |
| Interpretação de texto | **Claude API** (`@anthropic-ai/sdk`), só no backend | Nunca chamada direto do app |
| Deploy backend | **Vercel** (Next.js) | A confirmar com De Lobo |
| Deploy astro-calc | **Railway** | Já indicado no briefing (`railway.json`/`Procfile` prontos) |
| Distribuição do app | EAS Build / EAS Update | A confirmar |
| Pagamentos | **em aberto** (P2 item 14 — paywall) | Mercado Pago é o padrão da agência, mas app store cobra in-app purchase; ver Pendências |

### Desvios do padrão da agência

- **Nenhum desvio de banco/auth**: Supabase mantido como primeira opção, como manda o padrão.
- **Expo/React Native no lugar de Next.js no front**: o produto é um app mobile
  (tab bar nativa, notificação diária). Next.js fica só como backend/BFF.
- **Railway em vez de Vercel para o `astro-calc-service`**: é Python de longa
  execução com Swiss Ephemeris; Vercel Functions não é o ambiente certo. O
  briefing já assume Railway.
- **Mercado Pago ainda não adotado**: monetização de app nas lojas normalmente
  precisa de in-app purchase (RevenueCat/StoreKit/Play Billing). Decisão pendente
  de De Lobo — ver `## Pendências`.

---

## Topologia do repositório: pastas irmãs, **sem** workspaces

```
Triade/
  mobile/              app Expo
  backend/             Next.js (BFF)
  astro-calc-service/  FastAPI (colado pelo De Lobo)
  shared/              APENAS tipos TypeScript do contrato de dados
  design/              protótipo HTML de referência
```

**Por que não monorepo com npm workspaces:** o hoisting de `node_modules` de
workspaces é a maior fonte de dor conhecida em Metro/Expo (resolução de módulos
nativos, versões duplicadas de React). Com um dev solo e só dois pacotes JS, o
custo do workspace é maior que o benefício. Cada pasta tem seu próprio
`package.json` e `node_modules`, e cada uma roda/deploya sozinha.

**Como o contrato de dados fica sincronizado sem workspace:** a pasta `shared/`
contém **somente tipos** (`.ts` com `type`/`interface`, zero runtime). Ambos os
lados a importam por path alias `@shared/*` no `tsconfig.json`. Como todo import
de lá usa `import type`, o Babel/SWC apaga o import na compilação e nem Metro nem
o bundler do Next precisam resolver o caminho em runtime. **Regra: nada de valor
executável em `shared/`** (sem const, sem função, sem enum) — se precisar, duplique
ou promova para um pacote de verdade.

## Regra de comunicação (não negociável)

O app **nunca** fala com o `astro-calc-service`, com a Claude API ou com a
`service_role` do Supabase. Tudo passa pelo backend Next.js, que é onde as chaves
vivem. O app só conhece `EXPO_PUBLIC_BACKEND_URL`.

---

## Convenções por camada

- **Supabase**: RLS **ligado** em todas as tabelas (`natal_charts`, `users`,
  `sinastrias`, `mensagens`, `leituras_diarias`, `geocoding_cache`). O backend usa
  `SUPABASE_SERVICE_ROLE_KEY` server-side; o app, se um dia falar direto com o
  Supabase (auth), usa só a `anon key`.
- **Next.js**: App Router, route handlers em `src/app/api/**/route.ts`,
  `runtime = 'nodejs'` (a Claude API e o Supabase server-side precisam).
- **Expo**: expo-router com as rotas em `mobile/src/app/`. Nenhum nome de signo
  como literal em código de UI (ver `CLAUDE.md`, P0 item 1).
- **Python**: o serviço é colado como veio; o backend só consome os 3 endpoints.

---

## Pendências que dependem de De Lobo

1. **Monetização/paywall** (P2 item 14): assinatura via in-app purchase
   (RevenueCat) ou cobrança fora do app (Mercado Pago + web)? Isso muda backend,
   banco e política das lojas. Decidir antes de qualquer tela de paywall.
2. **Auth**: Supabase Auth com e-mail/senha, magic link ou login social? Hoje o
   scaffold guarda o perfil só em memória/local.
3. **Deploy do backend**: Vercel (padrão) ou Railway junto do serviço Python
   (uma conta a menos, latência menor entre backend e astro-calc).
4. **Versões de dependência**: os `package.json` foram escritos apontando para
   Expo SDK 53 / Next 15. Rodar `npx expo install --fix` no `mobile/` e conferir
   o `npm install` do `backend/` antes de considerar as versões finais.

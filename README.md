# TRÍADE

App mobile de astrologia em pt-BR que lê o nascimento em três tradições
(ocidental, chinesa e egípcia) e cruza as três numa leitura diária.

- **Especificação do produto, design system e contrato de dados:** [`CLAUDE.md`](./CLAUDE.md) — leia primeiro.
- **Stack e decisões de arquitetura:** [`STACK.md`](./STACK.md).

## Estrutura

```
mobile/              app Expo (React Native + TypeScript, expo-router)
backend/             Next.js (BFF): proxy do astro-calc, Claude API, Supabase
astro-calc-service/  FastAPI (Python) — será colado pelo De Lobo
shared/              somente tipos TS do contrato de dados (sem runtime)
design/              protótipo HTML de referência (Triade.dc.html)
```

Fluxo: `mobile` → `backend` → (`astro-calc-service` | Claude API | Supabase).
O app nunca fala direto com nenhum dos três.

## Rodando local

```powershell
# 1. serviço de cálculo (quando existir)
cd astro-calc-service
uvicorn main:app --reload --port 8000

# 2. backend
cd backend
copy .env.example .env.local     # preencher as chaves
npm install
npm run dev                      # http://localhost:3000

# 3. app
cd mobile
copy .env.example .env           # EXPO_PUBLIC_BACKEND_URL
npm install
npx expo install --fix           # alinha versões nativas ao SDK
npx expo start
```

No dispositivo físico, `EXPO_PUBLIC_BACKEND_URL` precisa ser o IP da máquina na
rede local (ex.: `http://192.168.0.10:3000`), não `localhost`.

## Estado atual

Scaffold. Todas as telas são placeholders de UI com os tokens do design system
aplicados; nenhum nome de signo é literal em código de UI. As rotas do backend
já fazem proxy real dos 3 endpoints do contrato, mas Claude API e Supabase são
stubs que respondem `501`. Ver o backlog P0/P1/P2 na PARTE 3 do `CLAUDE.md`.

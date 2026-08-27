# Build do serviço "backend" (Next.js) no Railway.
#
# Por quê um Dockerfile na raiz, e não em backend/: o backend importa tipos de
# ../shared (contrato de dados, "só tipos", ver shared/README.md). O deploy
# via `railway up` a partir de backend/ sozinho não enxerga a pasta irmã — o
# build falha com "Cannot find module '@shared/types/api'". Buildar com
# contexto na raiz do monorepo (copiando shared/ e backend/ preservando a
# posição relativa) resolve sem duplicar código nem symlink.
#
# Deploy: `cd Triade (raiz) && railway up --service backend -y` — o Railway
# detecta este Dockerfile automaticamente por estar na raiz do que foi
# enviado.

FROM node:20-slim AS build
WORKDIR /app
COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend
RUN npm ci
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/shared ./shared
COPY --from=build /app/backend ./backend
WORKDIR /app/backend
ENV NODE_ENV=production
# next start lê $PORT automaticamente (Railway injeta na hora do deploy).
CMD ["npm", "run", "start"]

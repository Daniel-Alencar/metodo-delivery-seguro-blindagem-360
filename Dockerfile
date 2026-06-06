# ===== STAGE 1: build =====
FROM node:22-alpine AS build

WORKDIR /app

# Copia apenas arquivos de dependência primeiro (cache de camadas)
COPY package.json package-lock.json* ./

RUN npm install

# Copia o resto do projeto
COPY . .

# Build do TanStack Start (SSR com Nitro → node-server)
RUN npm run build


# ===== STAGE 2: production =====
FROM node:22-alpine

WORKDIR /app

# Copia o output do Nitro (server + client estáticos)
COPY --from=build /app/.output ./.output

# O Nitro node-server é self-contained, não precisa de node_modules

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

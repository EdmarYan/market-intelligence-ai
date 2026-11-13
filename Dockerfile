FROM node:20-slim

WORKDIR /app

# Instala dependências
COPY package.json package-lock.json* ./
RUN npm install

# Copia código-fonte
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Build da aplicação Next.js
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]

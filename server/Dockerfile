FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 3000

# migrate/seed — идемпотентны (upsert, не удаляют данные), безопасно запускать
# при каждом старте контейнера. См. README.
CMD ["sh", "-c", "npm run migrate && npm run seed && npx tsx scripts/seed-dev-users.ts && npm run start"]

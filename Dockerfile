# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV RULES_DIR=/data
ENV RULES_PATH=/data/rules.store.json

# Copia código y dependencias desde la build stage
COPY --from=build /app /app

EXPOSE 3000
CMD ["node","server.js"]

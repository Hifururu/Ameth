# Usa Node 20
FROM node:20-alpine

# Carpeta de trabajo
WORKDIR /app

# Copia package.json e instala dependencias
COPY package.json ./
RUN npm install --omit=dev

# Copia el código
COPY . .

# Puerto expuesto (Northflank mapea este)
ENV PORT=8080
EXPOSE 8080

# Arranque
CMD ["npm", "start"]

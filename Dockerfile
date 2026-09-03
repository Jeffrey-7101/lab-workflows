FROM node:20-alpine AS build

WORKDIR /app
COPY app-node/package*.json ./
RUN npm ci
COPY app-node/src/ ./src/

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
#Definir un usuario no root para ejecutar la aplicación
USER node
CMD ["node", "src/index.js"]
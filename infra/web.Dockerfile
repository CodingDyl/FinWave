FROM node:20-slim
WORKDIR /app/frontend

# copy manifests first for layer caching
COPY frontend/package*.json ./

# install deps (prefer lock if present, otherwise fallback)
RUN npm ci || npm i

# now copy the rest of the app
COPY frontend ./

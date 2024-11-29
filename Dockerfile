FROM node:alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml index.js ./
RUN npm install -g pnpm && pnpm install --prod
ENV LINKS_CONF=/links.conf
CMD pnpm run start

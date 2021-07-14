FROM node:alpine
WORKDIR /app
COPY package.json yarn.lock server.ts ./
RUN yarn --production
ENV LINKS_CONF=/links.conf
CMD yarn run start

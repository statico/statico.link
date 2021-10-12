FROM node:alpine
WORKDIR /app
COPY package.json yarn.lock index.js ./
RUN yarn --production
ENV LINKS_CONF=/links.conf
CMD yarn run start

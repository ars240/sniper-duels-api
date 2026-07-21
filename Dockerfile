FROM ghcr.io/puppeteer/puppeteer:latest

# We need to run as root to copy files, or switch user
USER root

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Change ownership to the pptruser (from the puppeteer image)
RUN chown -R pptruser:pptruser /usr/src/app

USER pptruser

EXPOSE 3000

CMD ["npm", "start"]

FROM reitzig/texlive-base:latest

# Cài đặt Node.js và pdf2svg
RUN apt-get update && apt-get install -y \
    curl \
    pdf2svg \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000
CMD [ "node", "server.js" ]

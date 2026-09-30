FROM node:18-bookworm-slim

# Bỏ qua các hộp thoại tương tác trong quá trình apt-get install
ENV DEBIAN_FRONTEND=noninteractive

# Cài đặt TeX Live, các gói vẽ hình (tkz-tab, pgfplots,...) và pdf2svg
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-pictures \
    texlive-science \
    texlive-lang-english \
    dvisvgm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD [ "node", "server.js" ]

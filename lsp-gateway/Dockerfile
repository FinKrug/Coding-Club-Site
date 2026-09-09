# Bundles pyright, clangd, gopls, rust-analyzer and the Eclipse JDT Language
# Server alongside the lsp-gateway itself, so `docker compose up` gets you a
# working IntelliSense backend for every language the site supports without
# installing any of those tools on your own machine.
#
# This is a big image (a JDK, a Go toolchain, clangd, etc.) and the first
# build can take several minutes — that's expected.

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      ca-certificates \
      clangd \
      openjdk-17-jdk \
      python3 \
    && rm -rf /var/lib/apt/lists/*

# Python IntelliSense: pyright is an npm package (TypeScript, runs on Node),
# it doesn't need a Python toolchain of its own — python3 above just lets it
# resolve real stdlib type stubs.
RUN npm install -g pyright

# Go IntelliSense: gopls. Debian's `golang-go` apt package on this base
# image ships a Go toolchain old enough that current gopls releases refuse
# to build against it (fails with "module requires go >= ..."), so we
# install a current Go toolchain straight from go.dev instead of using apt.
ARG TARGETARCH
ENV GO_VERSION=1.27.1
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${TARGETARCH}.tar.gz" \
      | tar -xz -C /usr/local
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH=/root/go
ENV PATH="${GOPATH}/bin:${PATH}"
RUN go install golang.org/x/tools/gopls@latest

# Rust IntelliSense: rust-analyzer's prebuilt binary. No cargo/rustc needed.
RUN curl -fsSL \
      https://github.com/rust-lang/rust-analyzer/releases/latest/download/rust-analyzer-x86_64-unknown-linux-gnu.gz \
      | gunzip -c > /usr/local/bin/rust-analyzer \
    && chmod +x /usr/local/bin/rust-analyzer

# Java IntelliSense: Eclipse JDT Language Server. lsp-gateway/server.js looks
# for it via JDTLS_HOME (plugins/ + config_linux/ inside that directory).
ENV JDTLS_HOME=/opt/jdtls
RUN mkdir -p "$JDTLS_HOME" \
    && curl -fsSL https://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz \
       | tar -xz -C "$JDTLS_HOME"

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

EXPOSE 3001
CMD ["node", "server.js"]

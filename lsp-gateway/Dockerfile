# Bundles pyright, clangd, gopls, rust-analyzer and the Eclipse JDT Language
# Server alongside the lsp-gateway itself, so `docker compose up` gets you a
# working IntelliSense backend for every language the site supports without
# installing any of those tools on your own machine.
#
# This is a big image (a JDK, a Go toolchain, a Rust toolchain, clangd, etc.)
# and the first build can take several minutes — that's expected.

# Java 25 comes from the official Eclipse Temurin image. Current Eclipse JDT
# Language Server builds need Java 25 or newer (on older Java they fail at
# startup with "LinkageError ... org.eclipse.equinox.launcher.Main"), and
# Debian, this image's base, doesn't package Java 25.
FROM eclipse-temurin:25-jdk AS jdk

FROM node:20-bookworm-slim

# libstdc++-12-dev brings the C and C++ standard library headers. clangd
# needs them to resolve #include <string>, <vector>, <stdio.h>, ...; without
# them C/C++ IntelliSense connects but has nothing to suggest.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      ca-certificates \
      clangd \
      libstdc++-12-dev \
      python3 \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/opt/java/openjdk
COPY --from=jdk /opt/java/openjdk ${JAVA_HOME}
ENV PATH="${JAVA_HOME}/bin:${PATH}"

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

# Rust IntelliSense: rust-analyzer needs cargo (to load the project the
# gateway creates) and the standard library's source (for completions on
# Vec, String, ...). Without them it connects but suggests nothing, so this
# installs a minimal Rust toolchain through rustup instead of just the
# rust-analyzer binary. rustup also picks the right build for Intel or ARM.
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo
ENV PATH="${CARGO_HOME}/bin:${PATH}"
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --no-modify-path \
    && rustup component add rust-src rust-analyzer

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

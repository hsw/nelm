# syntax=docker/dockerfile:1.4
FROM alpine:3 AS downloader

ARG NELM_VERSION=1.4.1
ARG TARGETARCH

WORKDIR /tmp

RUN apk add --no-cache curl gnupg \
    && curl -sSLO "https://tuf.nelm.sh/targets/releases/${NELM_VERSION}/linux-${TARGETARCH}/bin/nelm" \
    -O "https://tuf.nelm.sh/targets/signatures/${NELM_VERSION}/linux-${TARGETARCH}/bin/nelm.sig" \
    && curl -sSL https://raw.githubusercontent.com/werf/nelm/refs/heads/main/nelm.asc | gpg --import \
    && gpg --verify nelm.sig nelm \
    && chmod +x nelm

FROM alpine:3

COPY --from=downloader /tmp/nelm /usr/local/bin/nelm

CMD ["/usr/local/bin/nelm"]
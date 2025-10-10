# syntax=docker/dockerfile:1.4
FROM alpine:3.22 AS downloader

ARG NELM_VERSION=1.13.1
ARG TARGETARCH

WORKDIR /tmp

RUN apk add --no-cache curl gnupg \
    && curl -fsSL https://raw.githubusercontent.com/werf/nelm/refs/heads/main/nelm.asc | gpg --import

RUN curl -fsSLO "https://tuf.nelm.sh/targets/releases/${NELM_VERSION}/linux-${TARGETARCH}/bin/nelm" \
    -O "https://tuf.nelm.sh/targets/signatures/${NELM_VERSION}/linux-${TARGETARCH}/bin/nelm.sig" \
    && gpg --verify nelm.sig nelm \
    && chmod +x nelm

RUN unset NELM_VERSION \
    && ./nelm version  # Smoke test

RUN KUBE_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt) && \
    echo "Using kubectl version: ${KUBE_VERSION}" \
    && curl -sSLO "https://dl.k8s.io/release/${KUBE_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
    -O "https://dl.k8s.io/release/${KUBE_VERSION}/bin/linux/${TARGETARCH}/kubectl.sha256" \
    && echo "$(cat kubectl.sha256)  kubectl" | sha256sum -c \
    && chmod +x kubectl

RUN ./kubectl version --client # Smoke test

FROM alpine:3.22

COPY --from=downloader /tmp/nelm /tmp/kubectl /usr/local/bin/

CMD ["/usr/local/bin/nelm"]
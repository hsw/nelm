# nelm — multi-arch Docker image

Docker image packaging [werf/nelm](https://github.com/werf/nelm), a Helm alternative for deploying Helm Charts to Kubernetes. The image also bundles the latest stable `kubectl`.

Published to:

- Docker Hub: [`hsww/nelm`](https://hub.docker.com/r/hsww/nelm)
- GHCR: [`ghcr.io/hsw/nelm`](https://github.com/hsw/nelm/pkgs/container/nelm)

Platforms: `linux/amd64`, `linux/arm64`. Binaries are verified against the upstream GPG signature during build.

## About nelm

Nelm is a Kubernetes deployment tool built on a partially rewritten Helm codebase. Compared to Helm it adds, among other things:

- `terraform plan`-style release planning
- improved CRD management
- out-of-the-box secrets management
- advanced resource ordering and lifecycle
- continuous streaming of logs, events, and resource status during deploy
- hundreds of Helm bug fixes

It is backward-compatible with Helm Charts and Helm Releases — no migration needed.

See the [upstream README](https://github.com/werf/nelm#readme) for the full feature list, CLI reference, and documentation.

## Usage

```shell
# Show version
docker run --rm hsww/nelm:stable nelm version

# Render a chart from the current directory
docker run --rm -v "$PWD:/chart" -w /chart hsww/nelm:stable \
  nelm chart render

# Deploy using your host kubeconfig
docker run --rm \
  -v "$HOME/.kube:/root/.kube:ro" \
  -v "$PWD:/chart" -w /chart \
  hsww/nelm:stable \
  nelm release install -n myproject -r myproject
```

Default command is `nelm`. Both `nelm` and `kubectl` are on `PATH`, so any command can be overridden (e.g. `docker run --rm hsww/nelm:stable kubectl version --client`).

## Tag policy

- Semver tags (`x.y.z`, `x.y`, `x`) follow nelm releases.
- Quality labels (`ea`, `stable`, `rock-solid`, `latest`) move to newer versions automatically, matching upstream promotions.

The current tag-to-version mapping is listed below and refreshed daily by CI.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository packages [nelm](https://github.com/werf/nelm) (a Helm 3 alternative Kubernetes deployment tool) into multi-architecture Docker images. It does not contain nelm source code—only a Dockerfile and CI/CD workflows to automate building and publishing images.

## Repository Structure

- `Dockerfile` - Multi-stage build that downloads nelm and kubectl binaries with GPG verification
- `.github/workflows/build-and-publish.yml` - Builds and publishes multi-arch images (amd64/arm64) to GHCR and Docker Hub
- `.github/workflows/update-nelm.yml` - Daily cron job that discovers new nelm releases and triggers builds

## Building Locally

```bash
# Build for current architecture
docker build -t nelm .

# Build with specific nelm version
docker build --build-arg NELM_VERSION=1.12.2 -t nelm .
```

## Image Publishing

Images are published to:
- `ghcr.io/hsw/nelm`
- `hsww/nelm` (Docker Hub)

Tags follow semver: `1.12.2`, `1.12`, `1`, plus quality labels from upstream (`ea`, `stable`, `rock-solid`).

## Workflow Behavior

The `update-nelm.yml` workflow:
1. Fetches all stable releases from werf/nelm
2. Checks which versions already exist in the container registry
3. Triggers `build-and-publish.yml` for missing versions (max 10 per run)
4. Only builds versions newer than or equal to the newest stable/rock-solid release

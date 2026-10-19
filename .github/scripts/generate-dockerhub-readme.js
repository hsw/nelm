#!/usr/bin/env node
// Build a Docker Hub readme: repo README.md + auto-generated tags section.
// Usage:
//   node generate-dockerhub-readme.js \
//     --readme README.md \
//     --releases '<json array>' \
//     --labels '<json object>' \
//     [--registry-tags '<json object>'] \
//     [--building '<json array>'] \
//     --output out.md
// `releases` entries: {version, quality_labels, is_latest, is_latest_in_minor}
// `labels` maps quality label -> version (e.g. {"latest":"1.22.0","stable":"1.22.0"}).
// `registry-tags` maps version -> other tags on that image in the registry (e.g. {"1.30.2":["1.30","1"]}).
// `building` lists releases being built in this run; their tags are predicted from upstream data.
// When registry tags are known, only published or currently building versions are listed.

const fs = require('fs');

const QUALITY_LABELS = ['latest', 'rock-solid', 'stable', 'ea'];
const RECENT_VERSIONS_LIMIT = 10;
const MARKER = '<!-- DOCKERHUB_TAGS -->';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) args[k.slice(2)] = argv[++i];
  }
  return args;
}

function parseSemver(v) {
  const [major = 0, minor = 0, patch = 0] = v.replace(/^v/, '').split('.').map(Number);
  return { major, minor, patch };
}

function compareDesc(a, b) {
  const A = parseSemver(a), B = parseSemver(b);
  return B.major - A.major || B.minor - A.minor || B.patch - A.patch;
}

function labelsForVersion(release, labelMap) {
  const tags = [];
  const { major, minor } = parseSemver(release.version);
  if (release.is_latest_in_minor) tags.push(`${major}.${minor}`);
  if (release.is_latest) tags.push(`${major}`);
  for (const label of QUALITY_LABELS) {
    if (labelMap[label] === release.version) tags.push(label);
  }
  return tags;
}

// Order: X.Y, X, quality labels, then anything else alphabetically
function tagRank(tag) {
  if (/^\d+\.\d+$/.test(tag)) return 0;
  if (/^\d+$/.test(tag)) return 1;
  const i = QUALITY_LABELS.indexOf(tag);
  return i >= 0 ? 2 + i : 2 + QUALITY_LABELS.length;
}

function sortTags(tags) {
  return [...tags].sort((a, b) => tagRank(a) - tagRank(b) || a.localeCompare(b));
}

function tagsForVersion(release, labelMap, registryTags, building) {
  if (!building.has(release.version) && registryTags[release.version]) {
    return sortTags(registryTags[release.version]);
  }
  return labelsForVersion(release, labelMap);
}

// Major tags (`2`, `1`, ...) present in the registry, newest first; the latest release always gets one
function majorTags(registryTags, labelMap) {
  const majors = new Set(Object.values(registryTags).flat().filter(t => /^\d+$/.test(t)));
  if (labelMap.latest) majors.add(String(parseSemver(labelMap.latest).major));
  return [...majors].sort((a, b) => Number(b) - Number(a));
}

function renderLabelsList(labelMap) {
  return QUALITY_LABELS
    .filter(l => labelMap[l])
    .map(l => `- \`${l}\` → \`${labelMap[l]}\``)
    .join('\n');
}

function renderVersionsList(releases, labelMap, registryTags, building) {
  const known = Object.keys(registryTags).length > 0;
  const sorted = releases
    .filter(r => !known || registryTags[r.version] || building.has(r.version))
    .sort((a, b) => compareDesc(a.version, b.version));
  return sorted.slice(0, RECENT_VERSIONS_LIMIT).map(r => {
    const extra = tagsForVersion(r, labelMap, registryTags, building);
    const extraStr = extra.length ? ` — also \`${extra.join('`, `')}\`` : '';
    return `- \`${r.version}\`${extraStr}`;
  }).join('\n');
}

function buildSection(releases, labelMap, registryTags, building) {
  const parts = [];
  parts.push('## Tags');
  parts.push('');
  parts.push('Images are published to both [`hsww/nelm`](https://hub.docker.com/r/hsww/nelm) on Docker Hub and [`ghcr.io/hsw/nelm`](https://github.com/hsw/nelm/pkgs/container/nelm) on GHCR. Multi-arch: `linux/amd64`, `linux/arm64`.');
  parts.push('');
  parts.push('### Quality labels');
  parts.push('');
  parts.push('These labels follow [upstream quality promotions](https://github.com/werf/nelm/releases) and move to newer versions over time.');
  parts.push('');
  parts.push(renderLabelsList(labelMap));
  parts.push('');
  parts.push('### Recent versions');
  parts.push('');
  parts.push(renderVersionsList(releases, labelMap, registryTags, building));
  parts.push('');
  parts.push('### Pull examples');
  parts.push('');
  parts.push('```shell');
  parts.push('docker pull hsww/nelm:rock-solid');
  parts.push('docker pull hsww/nelm:stable');
  if (labelMap.latest) parts.push(`docker pull hsww/nelm:${labelMap.latest}`);
  for (const major of majorTags(registryTags, labelMap)) parts.push(`docker pull hsww/nelm:${major}`);
  parts.push('```');
  return parts.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const k of ['readme', 'releases', 'labels', 'output']) {
    if (!args[k]) {
      console.error(`Missing required --${k}`);
      process.exit(1);
    }
  }

  const readme = fs.readFileSync(args.readme, 'utf8').trimEnd();
  const releases = JSON.parse(args.releases);
  const labels = JSON.parse(args.labels);
  const registryTags = JSON.parse(args['registry-tags'] || '{}');
  const building = new Set(JSON.parse(args.building || '[]').map(r => r.version));

  if (!Array.isArray(releases) || releases.length === 0) {
    console.error('No releases provided; refusing to overwrite description with empty tags section');
    process.exit(1);
  }

  const section = buildSection(releases, labels, registryTags, building);
  const content = readme.includes(MARKER)
    ? `${readme.replace(MARKER, section)}\n`
    : `${readme}\n\n${section}\n`;

  fs.mkdirSync(args.output.replace(/\/[^/]*$/, '') || '.', { recursive: true });
  fs.writeFileSync(args.output, content);
  console.log(`Wrote ${args.output} (${content.length} bytes)`);
}

main();

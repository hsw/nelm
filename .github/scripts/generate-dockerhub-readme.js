#!/usr/bin/env node
// Build a Docker Hub readme: repo README.md + auto-generated tags section.
// Usage:
//   node generate-dockerhub-readme.js \
//     --readme README.md \
//     --releases '<json array>' \
//     --labels '<json object>' \
//     --output out.md
// `releases` entries: {version, quality_labels, is_latest, is_latest_in_minor}
// `labels` maps quality label -> version (e.g. {"latest":"1.22.0","stable":"1.22.0"}).

const fs = require('fs');

const QUALITY_LABELS = ['latest', 'rock-solid', 'stable', 'ea'];
const RECENT_VERSIONS_LIMIT = 10;

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

function renderLabelsTable(labelMap) {
  const rows = QUALITY_LABELS
    .filter(l => labelMap[l])
    .map(l => `| \`${l}\` | \`${labelMap[l]}\` |`)
    .join('\n');
  return `| Label | Current version |\n|-------|-----------------|\n${rows}`;
}

function renderVersionsTable(releases, labelMap) {
  const sorted = [...releases].sort((a, b) => compareDesc(a.version, b.version));
  const rows = sorted.slice(0, RECENT_VERSIONS_LIMIT).map(r => {
    const extra = labelsForVersion(r, labelMap);
    const extraStr = extra.length ? extra.map(t => `\`${t}\``).join(', ') : '—';
    return `| \`${r.version}\` | ${extraStr} |`;
  }).join('\n');
  return `| Version | Also tagged as |\n|---------|----------------|\n${rows}`;
}

function buildSection(releases, labelMap) {
  const parts = [];
  parts.push('## Tags');
  parts.push('');
  parts.push('Images are published to both [`hsww/nelm`](https://hub.docker.com/r/hsww/nelm) on Docker Hub and [`ghcr.io/hsw/nelm`](https://github.com/hsw/nelm/pkgs/container/nelm) on GHCR. Multi-arch: `linux/amd64`, `linux/arm64`.');
  parts.push('');
  parts.push('### Quality labels');
  parts.push('');
  parts.push('These labels follow [upstream quality promotions](https://github.com/werf/nelm/releases) and move to newer versions over time.');
  parts.push('');
  parts.push(renderLabelsTable(labelMap));
  parts.push('');
  parts.push('### Recent versions');
  parts.push('');
  parts.push(renderVersionsTable(releases, labelMap));
  parts.push('');
  parts.push('### Pull examples');
  parts.push('');
  parts.push('```shell');
  parts.push('docker pull hsww/nelm:rock-solid');
  parts.push('docker pull hsww/nelm:stable');
  if (labelMap.latest) parts.push(`docker pull hsww/nelm:${labelMap.latest}`);
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

  if (!Array.isArray(releases) || releases.length === 0) {
    console.error('No releases provided; refusing to overwrite description with empty tags section');
    process.exit(1);
  }

  const section = buildSection(releases, labels);
  const content = `${readme}\n\n${section}\n`;

  fs.mkdirSync(args.output.replace(/\/[^/]*$/, '') || '.', { recursive: true });
  fs.writeFileSync(args.output, content);
  console.log(`Wrote ${args.output} (${content.length} bytes)`);
}

main();

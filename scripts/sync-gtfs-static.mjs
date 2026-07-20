import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FEEDS, safeUnzip, build } from './build-transit-data.mjs';

const cacheDir = resolve('.cache/api-research');
await mkdir(cacheDir, { recursive: true });

for (const feed of FEEDS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(feed.url, { signal: controller.signal, headers: { 'User-Agent': 'SelangorMobilityNavigator-DataSync/2.0' } });
    if (!response.ok) throw new Error(`${feed.key}: HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!/(zip|octet-stream)/i.test(type)) throw new Error(`${feed.key}: unexpected content-type ${type}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 20_000_000) throw new Error(`${feed.key}: compressed feed exceeds 20 MB`);
    safeUnzip(buffer);
    const finalPath = resolve(cacheDir, feed.file), temporary = `${finalPath}.tmp`;
    await writeFile(temporary, buffer);
    await rename(temporary, finalPath);
    console.log(`${feed.key}: ${buffer.length} bytes`);
  } finally { clearTimeout(timer); }
}

console.log(JSON.stringify(await build(cacheDir), null, 2));

import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'cloudflare-direct-route-html',
    apply: 'build',
    async writeBundle() {
      const output = fileURLToPath(new URL('./dist/', import.meta.url));
      const appHtml = await readFile(`${output}app/index.html`, 'utf8');
      for (const route of ['app/nearest', 'status']) {
        const routeDirectory = `${output}${route}`;
        await mkdir(routeDirectory, { recursive: true });
        const directRouteHtml = appHtml.replace('data-app-shell', `data-app-shell data-direct-route="${route}"`);
        await writeFile(`${routeDirectory}/index.html`, directRouteHtml);
      }
    }
  }],
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url))
      }
    }
  }
});

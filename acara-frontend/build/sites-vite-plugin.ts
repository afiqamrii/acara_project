import { access, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const sites = (): Plugin => {
  let root = process.cwd();

  return {
    name: 'acara-sites-package',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const distDirectory = resolve(root, 'dist');
      const clientDirectory = resolve(distDirectory, 'client');
      const serverDirectory = resolve(distDirectory, 'server');
      const metadataDirectory = resolve(distDirectory, '.openai');

      await rm(clientDirectory, { recursive: true, force: true });
      await rm(serverDirectory, { recursive: true, force: true });
      await rm(metadataDirectory, { recursive: true, force: true });
      await mkdir(clientDirectory, { recursive: true });
      await mkdir(serverDirectory, { recursive: true });
      await mkdir(metadataDirectory, { recursive: true });

      for (const entry of await readdir(distDirectory)) {
        if (['client', 'server', '.openai'].includes(entry)) continue;
        await cp(resolve(distDirectory, entry), resolve(clientDirectory, entry), { recursive: true });
      }

      await cp(resolve(root, 'worker', 'index.js'), resolve(serverDirectory, 'index.js'));

      const hostingConfig = resolve(root, '.openai', 'hosting.json');
      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(metadataDirectory, 'hosting.json'));
      }
    },
  };
};

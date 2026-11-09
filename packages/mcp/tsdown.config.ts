import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    fixedExtension: false,
  },
  {
    entry: { 'bridge-client': 'src/pages/bridge-client.ts' },
    format: ['esm'],
    platform: 'browser',
    noExternal: ['zod'],
    fixedExtension: false,
    clean: false,
  },
]);

import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    platform: 'node',
    format: ['esm'],
    fixedExtension: false,
    banner: { js: '#!/usr/bin/env node' },
    clean: false,
  },
  {
    entry: ['src/pages/bridge-client.ts'],
    platform: 'browser',
    format: ['iife'],
    clean: false,
    outputOptions: { entryFileNames: 'pages/[name].js' },
  },
]);

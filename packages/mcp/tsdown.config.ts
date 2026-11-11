import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    platform: 'node',
    format: 'esm',
    dts: false,
    fixedExtension: false,
  },
  {
    entry: ['src/pages/bridge-client.ts'],
    platform: 'browser',
    format: 'iife',
    noExternal: [/.*/],
    dts: false,
    clean: false,
    fixedExtension: false,
  },
]);

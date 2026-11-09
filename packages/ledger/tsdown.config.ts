import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/test-utils.ts'],
  dts: true,
  external: ['vitest'],
  fixedExtension: false,
});

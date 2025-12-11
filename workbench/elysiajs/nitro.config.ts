import { defineNitroConfig } from 'nitro/config';

const elysiaExternals = [
  'elysia',
  '@sinclair/typebox',
  'memoirist',
  'fast-decode-uri-component',
];

export default defineNitroConfig({
  modules: ['workflow/nitro'],
  vercel: { entryFormat: 'node' },
  routes: {
    '/**': './src/index.ts',
  },
  // NOTE: `bun` preset doesn't work as expected since Nitro does not pass
  // the `idleTimeout` option through Elysia, causing workflow suspensions > 10s
  // to fail
  // preset: "bun"
  externals: {
    external: elysiaExternals,
  },
  hooks: {
    'rollup:before': (_nitro, config) => {
      // Add elysia and its deps as external to rollup
      const existing = config.external;
      config.external = (id, ...args) => {
        if (
          elysiaExternals.some((ext) => id === ext || id.startsWith(`${ext}/`))
        ) {
          return true;
        }
        if (typeof existing === 'function') {
          return existing(id, ...args);
        }
        if (Array.isArray(existing)) {
          return existing.includes(id);
        }
        return existing === id;
      };
    },
  },
  plugins: ['plugins/start-pg-world.ts'],
});

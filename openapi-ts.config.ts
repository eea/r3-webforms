import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './apps/api/api.json',
  output: {
    path: './apps/pams/src/services/api-client',
    format: 'prettier',
  },
  plugins: [
    '@hey-api/client-axios',
    {
      name: '@hey-api/sdk',
      asClass: false,
    },
  ],
});

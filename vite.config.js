import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 3333, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.js'] },
});

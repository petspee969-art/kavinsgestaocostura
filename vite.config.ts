
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: '/',
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});

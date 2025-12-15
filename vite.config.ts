import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      // Configuração de Proxy para Desenvolvimento
      // Redireciona chamadas /api para o backend Node.js rodando na porta 3000
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    define: {
      // Expõe a API_KEY (Gemini) para o frontend
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Define o caminho base para produção
    base: '/corte/',
    server: {
      // Configuração de Proxy para Desenvolvimento
      proxy: {
        // Agora as chamadas também incluirão /corte/api
        '/corte/api': {
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
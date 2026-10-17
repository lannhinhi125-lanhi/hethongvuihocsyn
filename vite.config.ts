import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {createGeminiHandler} from './server/geminiHandler.ts';

function localGeminiApi(): Plugin {
  return {
    name: 'local-gemini-api',
    apply: 'serve',
    configureServer(server) {
      // Read secrets only inside the dev server. Never add them to Vite `define`.
      const env = loadEnv(server.config.mode, server.config.envDir, '');
      const handler = createGeminiHandler(() => ({...env, ...process.env}));
      server.middlewares.use((req,res,next) => {
        if (req.url?.split('?')[0] !== '/api/gemini') return next();
        void handler(req,res);
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localGeminiApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

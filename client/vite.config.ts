import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['buffer'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
    {
      name: 'dynamic-tonconnect-manifest',
      configureServer(server) {
        server.middlewares.use('/tonconnect-manifest.json', (req, res) => {
          const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
          const proto = req.headers['x-forwarded-proto'] || (String(host).includes('localhost') ? 'http' : 'https');
          const origin = `${proto}://${host}`;
          const manifest = {
            url: origin,
            name: 'Sfida Cyber Arena',
            iconUrl: 'https://ton.org/download/ton_symbol.png',
            termsOfUseUrl: `${origin}`,
            privacyPolicyUrl: `${origin}`,
          };
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(manifest, null, 2));
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'flyer-humor-membrane-caroline.trycloudflare.com',
      '.trycloudflare.com',
    ],
  },
});

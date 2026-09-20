import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { registerWebSocketRoutes } from './ws/websocketServer.js';
import { matchRoutes } from './routes/matchRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { affiliateRoutes } from './routes/affiliateRoutes.js';
import { createTelegramBot } from './bot/index.js';
import { signerService } from './services/signer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server dir, root dir, and process.cwd()
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const require = createRequire(import.meta.url);
let hasPinoPretty = false;
try {
  require.resolve('pino-pretty');
  hasPinoPretty = true;
} catch {
  hasPinoPretty = false;
}

const fastify = Fastify({
  logger: hasPinoPretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : true,
});

async function main() {
  // Register plugins
  await fastify.register(cors, {
    origin: '*',
  });

  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Health check & Server Status
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      serverPublicKey: signerService.getPublicKeyHex(),
      serverPublicKeyBigInt: signerService.getPublicKeyBigInt().toString(),
    };
  });

  // Register WebSocket & REST API
  registerWebSocketRoutes(fastify);
  await fastify.register(matchRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(affiliateRoutes);

  // Initialize Telegram Bot
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken && botToken !== 'MOCK_TELEGRAM_BOT_TOKEN') {
    try {
      const bot = createTelegramBot(botToken);
      bot.start({
        onStart: (info) => {
          console.log(`[Bot] Telegram Bot started successfully as @${info.username}`);
        },
      });
    } catch (err: any) {
      console.warn('[Bot] Failed to start Telegram Bot polling:', err.message);
    }
  } else {
    console.log('[Bot] TELEGRAM_BOT_TOKEN not provided or mock mode. Bot polling disabled.');
  }

  // Start HTTP & WS Server
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    console.log(`🚀 SfidaBot Game Server listening at http://${host}:${port}`);
    console.log(`🔌 WebSocket Duel Endpoint: ws://${host}:${port}/ws/duel`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Server Error:', err);
});

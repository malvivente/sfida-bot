import './config.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { TonClient, Address } from '@ton/ton';
import { registerWebSocketRoutes } from './ws/websocketServer.js';
import { matchRoutes } from './routes/matchRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { affiliateRoutes } from './routes/affiliateRoutes.js';
import { createTelegramBot } from './bot/index.js';
import { signerService } from './services/signer.js';

const cjsRequire = createRequire(import.meta.url);
const isProduction = process.env.NODE_ENV === 'production';

// Safe in-process logger (avoids worker thread crashes from thread-stream on low-memory VPS)
let loggerConfig: any = true;
if (!isProduction) {
  try {
    const pinoPrettyModule = cjsRequire('pino-pretty');
    const pinoPretty = pinoPrettyModule.default || pinoPrettyModule;
    loggerConfig = pinoPretty({
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    });
  } catch {
    loggerConfig = true;
  }
}

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

const fastify = Fastify({
  logger: loggerConfig,
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

  // Sync on-chain ClashMaster public key if configured
  const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS;
  const tonEndpoint = process.env.TON_RPC_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC';
  if (clashMasterAddr) {
    try {
      const tonClient = new TonClient({
        endpoint: tonEndpoint,
        apiKey: process.env.TON_API_KEY,
      });
      const res = await tonClient.runMethod(Address.parse(clashMasterAddr), 'getStats');
      const matchCount = res.stack.readBigNumber();
      const onChainPubKey = res.stack.readBigNumber();
      console.log(`[TonSync] ✅ Connected to ClashMaster at ${clashMasterAddr}`);
      console.log(`[TonSync] On-chain Match Count: ${matchCount}, Server Public Key: 0x${onChainPubKey.toString(16)}`);
      signerService.setOnChainPublicKey(onChainPubKey);
    } catch (err: any) {
      console.warn(`[TonSync] Could not fetch on-chain ClashMaster stats (${err?.message || err}). Using local signer key.`);
    }
  }

  // Health check & Server Status
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      serverPublicKey: signerService.getPublicKeyHex(),
      serverPublicKeyBigInt: signerService.getPublicKeyBigInt().toString(),
      clashMasterAddress: process.env.CLASH_MASTER_ADDRESS || null,
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

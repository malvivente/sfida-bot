import { FastifyInstance } from 'fastify';

export async function profileRoutes(fastify: FastifyInstance) {
  // Get user profile & stats
  fastify.get('/api/profile/:telegramId', async (req, reply) => {
    const { telegramId } = req.params as { telegramId: string };

    // Return profile stats
    return reply.send({
      telegramId,
      username: `CyberWarrior_${telegramId.slice(-4)}`,
      walletAddress: `EQD${telegramId.padStart(45, '0')}`,
      duelsPlayed: 24,
      duelsWon: 18,
      winRate: '75.0%',
      bestReactionTimeMs: 182.4,
      avgReactionTimeMs: 224.1,
      totalWinningsTon: '48.5',
      spectatorBetsCount: 12,
      spectatorProfitsTon: '14.2',
    });
  });

  // Link TON wallet
  fastify.post('/api/profile/link-wallet', async (req, reply) => {
    const body = req.body as { telegramId: string; walletAddress: string };
    return reply.send({
      success: true,
      telegramId: body.telegramId,
      walletAddress: body.walletAddress,
    });
  });
}

import { FastifyInstance } from 'fastify';
import { dbService } from '../services/db.js';

export async function affiliateRoutes(fastify: FastifyInstance) {
  // Get affiliate breakdown for wallet address or telegram ID
  fastify.get('/api/affiliate/:identifier', async (req, reply) => {
    const { identifier } = req.params as { identifier: string };
    const query = req.query as { telegramId?: string };

    const resolvedTgId = query.telegramId || (identifier.startsWith('tg_') ? identifier.replace('tg_', '') : (/^\d+$/.test(identifier) ? identifier : undefined));
    const wallet = !identifier.startsWith('tg_') && !/^\d+$/.test(identifier) ? identifier : undefined;

    const botUsername = process.env.BOT_USERNAME || 'sfida_arena_bot';
    const refParam = resolvedTgId ? `ref_${resolvedTgId}` : (wallet ? `ref_${wallet}` : 'ref_arena');

    // Retrieve groups managed by this user
    const managedGroups = await dbService.getGroupAffiliatesByManager(resolvedTgId, wallet);

    const friendsCount = await dbService.getReferredCount(resolvedTgId || wallet || identifier);

    let totalGroupEarnings = 0;
    let totalGroupMatches = 0;
    let totalGroupVolume = 0;
    for (const g of managedGroups) {
      totalGroupEarnings += parseFloat(g.totalEarningsGram || '0');
      totalGroupMatches += g.totalMatchesHosted || 0;
      totalGroupVolume += parseFloat(g.totalVolumeGram || '0');
    }

    return reply.send({
      identifier,
      telegramId: resolvedTgId,
      walletAddress: wallet,
      referralLink: `https://t.me/${botUsername}?start=${refParam}`,
      personalEarningsGram: '0.00',
      groupEarningsGram: totalGroupEarnings.toFixed(2),
      totalEarnedGram: totalGroupEarnings.toFixed(2),
      hostedMatchesCount: totalGroupMatches,
      totalGroupVolumeGram: totalGroupVolume.toFixed(2),
      friendsInvited: friendsCount,
      groups: managedGroups,
      rules: {
        recruiterShare: '15% of Platform Duel Rake',
        groupAffiliateShare: '20% of Platform Duel Rake',
        payoutMethod: 'Instant credit to in-app GRAM balance / TON wallet',
      },
    });
  });

  // Get specific groups managed by a user
  fastify.get('/api/affiliate/groups/:identifier', async (req, reply) => {
    const { identifier } = req.params as { identifier: string };
    const groups = await dbService.getGroupAffiliatesByManager(identifier, identifier);
    return reply.send({ groups });
  });
}

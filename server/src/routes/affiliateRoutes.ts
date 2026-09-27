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

    const userAccount = await dbService.getUserAccount(wallet, resolvedTgId);
    const personalEarnings = parseFloat(userAccount?.referralEarningsGram || '0');
    const totalEarned = totalGroupEarnings + personalEarnings;

    return reply.send({
      identifier,
      telegramId: resolvedTgId,
      walletAddress: wallet,
      referralLink: `https://t.me/${botUsername}?start=${refParam}`,
      personalEarningsGram: personalEarnings.toFixed(2),
      groupEarningsGram: totalGroupEarnings.toFixed(2),
      totalEarnedGram: totalEarned.toFixed(2),
      hostedMatchesCount: totalGroupMatches,
      totalGroupVolumeGram: totalGroupVolume.toFixed(2),
      friendsInvited: friendsCount,
      groups: managedGroups,
      rules: {
        commissionPool: '30% of Room Creation (0.05) & Join (0.05) Fees',
        recruiterShare: '15% to 30% of match fees',
        groupAffiliateShare: '15% to 30% of match fees',
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

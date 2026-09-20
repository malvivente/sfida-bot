import { FastifyInstance } from 'fastify';

export async function affiliateRoutes(fastify: FastifyInstance) {
  // Get affiliate breakdown for wallet address
  fastify.get('/api/affiliate/:walletAddress', async (req, reply) => {
    const { walletAddress } = req.params as { walletAddress: string };

    return reply.send({
      walletAddress,
      totalEarnedTon: '12.84',
      recruiterEarningsTon: '8.40',
      groupHostEarningsTon: '4.44',
      activeRecruitsCount: 19,
      hostedMatchesCount: 38,
      referralLink: `https://t.me/sfida_arena_bot?start=ref_${walletAddress}`,
      rules: {
        recruiterShareCase1: '15% (with group host)',
        groupHostShareCase1: '15% (with recruiter)',
        recruiterShareCase2: '30% (private match)',
        groupHostShareCase3: '30% (unrecruited player)',
        treasuryCase4: '100% (direct solo play)',
      },
    });
  });
}

import { FastifyInstance } from 'fastify';
import { dbService } from '../services/db.js';

export async function casinoRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/casino/balance-delta
   * Real-time balance synchronization for casino bets and winnings.
   * Ensures the backend dbService balance matches frontend gameplay so background polling
   * does not restore un-debited bets or corrupt payout calculations.
   */
  fastify.post('/api/casino/balance-delta', async (req, reply) => {
    try {
      const body = req.body as {
        userId?: string | number;
        delta?: number;
        game?: string;
        reason?: string;
      };

      const userId = String(body.userId || '').trim();
      const delta = parseFloat(Number(body.delta || 0).toFixed(2));
      const game = String(body.game || 'casino').toUpperCase();
      const reason = body.reason || `Casino ${game} (${delta >= 0 ? '+' : ''}${delta} G)`;

      if (!userId) {
        return reply.status(400).send({ success: false, error: 'Telegram User ID is required' });
      }

      if (isNaN(delta) || delta === 0) {
        return reply.status(400).send({ success: false, error: 'Invalid delta amount' });
      }

      if (delta < 0) {
        // Player placed a bet: debit balance
        const debitAmt = Math.abs(delta).toFixed(2);
        const res = await dbService.debitUserBalance(
          '',
          debitAmt,
          'CASINO_BET' as any,
          reason,
          userId
        );

        if (!res.success) {
          return reply.status(400).send({ success: false, error: res.error || 'Insufficient balance' });
        }

        const bal = res.account?.balanceGram || '0.00';
        return reply.send({ success: true, balanceGram: bal });
      } else {
        // Player won / cashed out: credit balance
        const creditAmt = delta.toFixed(2);
        const account = await dbService.creditUserBalance(
          '',
          creditAmt,
          'CASINO_WIN' as any,
          reason,
          userId
        );

        const bal = account.balanceGram || '0.00';
        return reply.send({ success: true, balanceGram: bal });
      }
    } catch (err: any) {
      console.error('[CasinoRoutes] Error updating casino balance delta:', err);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });
}

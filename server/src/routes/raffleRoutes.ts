import { FastifyInstance } from 'fastify';
import { dbService } from '../services/db.js';

export async function raffleRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/raffles
   * Returns active raffles, the featured hero raffle, and recent winners
   */
  fastify.get('/api/raffles', async (_req, reply) => {
    try {
      const allRaffles = dbService.getRaffles();
      const active = allRaffles.filter((r) => r.status === 'ACTIVE');
      const featured = active.find((r) => r.isFeatured) || active[0] || null;
      const winners = allRaffles
        .filter((r) => r.status === 'ENDED' && r.winnerUserId)
        .sort((a, b) => (b.drawnAt || 0) - (a.drawnAt || 0))
        .slice(0, 10);

      return reply.send({
        success: true,
        raffles: active,
        featured,
        winners,
      });
    } catch (err: any) {
      console.error('[RaffleRoutes] Error fetching raffles:', err);
      return reply.status(500).send({ success: false, error: 'Failed to fetch raffles' });
    }
  });

  /**
   * GET /api/raffles/my-tickets
   * Returns tickets bought by user (strictly linked to Telegram userId)
   */
  fastify.get('/api/raffles/my-tickets', async (req, reply) => {
    try {
      const query = req.query as { userId?: string };
      const userId = query.userId ? String(query.userId).trim() : '';

      if (!userId) {
        return reply.status(400).send({ success: false, error: 'User ID is required' });
      }

      const data = dbService.getUserRaffleTickets(userId);
      const userAcc = await dbService.getUserAccount(undefined, userId);
      return reply.send({
        success: true,
        tickets: data.tickets,
        freeEntries: data.freeEntries,
        raffles: data.raffles,
        freeRaffleTickets: userAcc?.freeRaffleTickets || 0,
      });
    } catch (err: any) {
      console.error('[RaffleRoutes] Error fetching user tickets:', err);
      return reply.status(500).send({ success: false, error: 'Failed to fetch tickets' });
    }
  });

  /**
   * POST /api/raffles/buy
   * Purchase tickets for a raffle using internal GRAM balance (or free if price is 0)
   */
  fastify.post('/api/raffles/buy', async (req, reply) => {
    try {
      const body = req.body as {
        raffleId?: string;
        userId?: string | number;
        quantity?: number;
        username?: string;
        useFreeTickets?: boolean;
      };

      const raffleId = String(body.raffleId || '').trim();
      const userId = String(body.userId || '').trim();
      const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));
      const username = body.username ? String(body.username).trim() : undefined;
      const useFreeTickets = Boolean(body.useFreeTickets);

      if (!raffleId) {
        return reply.status(400).send({ success: false, error: 'Raffle ID is required' });
      }

      if (!userId) {
        return reply.status(400).send({ success: false, error: 'Telegram User ID is required' });
      }

      const result = await dbService.buyRaffleTickets(raffleId, userId, quantity, username, useFreeTickets);

      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      return reply.send({
        success: true,
        isFreeEntry: result.isFreeEntry,
        usedFreeTickets: result.usedFreeTickets,
        remainingFreeTickets: result.remainingFreeTickets,
        ticketNumbers: result.ticketNumbers,
        newBalance: result.newBalance,
      });
    } catch (err: any) {
      console.error('[RaffleRoutes] Error buying tickets:', err);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });
}

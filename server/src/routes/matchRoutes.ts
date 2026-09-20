import { FastifyInstance } from 'fastify';
import { RoomManager } from '../engine/RoomManager.js';
import { computePariMutuelOdds } from '../services/oddsCalculator.js';

export async function matchRoutes(fastify: FastifyInstance) {
  const roomManager = RoomManager.getInstance();

  // List all active matches
  fastify.get('/api/matches', async (_req, reply) => {
    const rooms = roomManager.getAllRooms();
    const matches = rooms.map((r) => {
      const odds = computePariMutuelOdds(r.totalBetsA, r.totalBetsB);
      return {
        matchId: r.matchId.toString(),
        state: r.state,
        playerA: {
          wallet: r.playerA.walletAddress,
          name: r.playerA.username,
          score: r.playerA.score,
        },
        playerB: r.playerB
          ? {
              wallet: r.playerB.walletAddress,
              name: r.playerB.username,
              score: r.playerB.score,
            }
          : null,
        wagerAmountNano: r.config.wagerAmountNano.toString(),
        totalBetsA: r.totalBetsA.toString(),
        totalBetsB: r.totalBetsB.toString(),
        oddsA: odds.oddsA,
        oddsB: odds.oddsB,
        spectatorCount: r.spectators.size,
      };
    });

    return reply.send({ matches });
  });

  // Get single match detail
  fastify.get('/api/matches/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = roomManager.getRoom(id);

    if (!room) {
      return reply.status(404).send({ error: 'Match not found' });
    }

    const odds = computePariMutuelOdds(room.totalBetsA, room.totalBetsB);

    return reply.send({
      matchId: room.matchId.toString(),
      state: room.state,
      currentRound: room.currentRound,
      playerA: {
        wallet: room.playerA.walletAddress,
        name: room.playerA.username,
        score: room.playerA.score,
        ready: room.playerA.ready,
      },
      playerB: room.playerB
        ? {
            wallet: room.playerB.walletAddress,
            name: room.playerB.username,
            score: room.playerB.score,
            ready: room.playerB.ready,
          }
        : null,
      wagerAmountNano: room.config.wagerAmountNano.toString(),
      totalBetsA: room.totalBetsA.toString(),
      totalBetsB: room.totalBetsB.toString(),
      oddsA: odds.oddsA,
      oddsB: odds.oddsB,
      distributablePoolNano: odds.distributablePoolNano.toString(),
      spectatorCount: room.spectators.size,
    });
  });

  // Create match endpoint
  fastify.post('/api/matches', async (req, reply) => {
    const body = req.body as {
      wagerAmountNano?: string;
      playerAAddress: string;
      recruiterA?: string;
      groupAdminAddress?: string;
    };

    const matchId = BigInt(Date.now() % 1000000000);
    const wagerNano = body.wagerAmountNano ? BigInt(body.wagerAmountNano) : 1000000000n;

    const room = roomManager.createRoom({
      matchId,
      wagerAmountNano: wagerNano,
      playerAAddress: body.playerAAddress,
      recruiterA: body.recruiterA,
      groupAdminAddress: body.groupAdminAddress,
    });

    return reply.send({
      success: true,
      matchId: matchId.toString(),
      state: room.state,
    });
  });
}

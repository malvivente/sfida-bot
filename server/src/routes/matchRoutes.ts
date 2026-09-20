import { FastifyInstance } from 'fastify';
import { RoomManager } from '../engine/RoomManager.js';
import { computePariMutuelOdds } from '../services/oddsCalculator.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';

export async function matchRoutes(fastify: FastifyInstance) {
  const roomManager = RoomManager.getInstance();

  // List all active matches
  fastify.get('/api/matches', async (_req, reply) => {
    const rooms = roomManager.getAllRooms();
    const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';

    const matches = rooms.map((r) => {
      const odds = computePariMutuelOdds(r.totalBetsA, r.totalBetsB);
      let escrowAddress = r.escrowAddress;
      if (!escrowAddress && clashMasterAddr) {
        escrowAddress = computeEscrowAddress(
          clashMasterAddr,
          r.matchId,
          r.playerA.walletAddress,
          r.config.wagerAmountNano,
          signerService.getPublicKeyBigInt()
        );
      }

      return {
        matchId: r.matchId.toString(),
        escrowAddress,
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
    const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';
    let escrowAddress = room.escrowAddress;
    if (!escrowAddress && clashMasterAddr) {
      escrowAddress = computeEscrowAddress(
        clashMasterAddr,
        room.matchId,
        room.playerA.walletAddress,
        room.config.wagerAmountNano,
        signerService.getPublicKeyBigInt()
      );
    }

    return reply.send({
      matchId: room.matchId.toString(),
      escrowAddress,
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
    const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';

    let escrowAddress = '';
    if (clashMasterAddr && body.playerAAddress) {
      escrowAddress = computeEscrowAddress(
        clashMasterAddr,
        matchId,
        body.playerAAddress,
        wagerNano,
        signerService.getPublicKeyBigInt()
      );
    }

    const room = roomManager.createRoom({
      matchId,
      wagerAmountNano: wagerNano,
      playerAAddress: body.playerAAddress,
      recruiterA: body.recruiterA,
      groupAdminAddress: body.groupAdminAddress,
      escrowAddress,
    });

    return reply.send({
      success: true,
      matchId: matchId.toString(),
      escrowAddress,
      state: room.state,
    });
  });

  // Delete / cancel match endpoint
  fastify.delete('/api/matches/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = roomManager.removeRoom(id);
    return reply.send({ success: true, deleted });
  });
}

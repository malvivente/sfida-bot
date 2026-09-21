import { FastifyInstance } from 'fastify';
import { RoomManager } from '../engine/RoomManager.js';
import { computePariMutuelOdds } from '../services/oddsCalculator.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';
import { tonSettlementService } from '../services/tonSettlement.js';
import { dbService } from '../services/db.js';

export async function matchRoutes(fastify: FastifyInstance) {
  const roomManager = RoomManager.getInstance();

  // List all active matches (exclude WAITING_FOR_DEPLOY)
  fastify.get('/api/matches', async (_req, reply) => {
    const rooms = roomManager.getAllRooms().filter((r) => r.state !== 'WAITING_FOR_DEPLOY');
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
        winnerAddress: r.winnerAddress,
        winnerName: r.winnerName,
        resolution: r.resolution,
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
      winnerAddress: room.winnerAddress,
      winnerName: room.winnerName,
      resolution: room.resolution,
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

  // Get resolution payload for settled match
  fastify.get('/api/matches/:id/resolution', async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = roomManager.getRoom(id);

    if (!room) {
      return reply.status(404).send({ error: 'Match not found' });
    }

    if (!room.resolution) {
      return reply.status(400).send({ error: 'Match is not settled yet' });
    }

    return reply.send({
      success: true,
      resolution: room.resolution,
    });
  });

  // Create match endpoint (begins in WAITING_FOR_DEPLOY state until Player 1 confirms on-chain)
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

    const room = roomManager.createRoom(
      {
        matchId,
        wagerAmountNano: wagerNano,
        playerAAddress: body.playerAAddress,
        recruiterA: body.recruiterA,
        groupAdminAddress: body.groupAdminAddress,
        escrowAddress,
      },
      async (settledRoom, winner) => {
        console.log(`[API] Match #${settledRoom.matchId} settled with winner: ${winner}`);
        let targetEscrow = settledRoom.escrowAddress;
        if (!targetEscrow && clashMasterAddr) {
          targetEscrow = computeEscrowAddress(
            clashMasterAddr,
            settledRoom.matchId,
            settledRoom.config.playerAAddress,
            settledRoom.config.wagerAmountNano,
            signerService.getPublicKeyBigInt()
          );
        }
        if (targetEscrow) {
          await tonSettlementService.settleMatch(targetEscrow, settledRoom.matchId, winner);
        }
      }
    );

    // Two-Phase deploy: room is WAITING_FOR_DEPLOY until on-chain confirmation
    room.state = 'WAITING_FOR_DEPLOY';

    // Auto-cleanup if deploy transaction is never signed/sent within 120s
    setTimeout(() => {
      const current = roomManager.getRoom(matchId);
      if (current && current.state === 'WAITING_FOR_DEPLOY') {
        console.log(`[matchRoutes] Match #${matchId} deploy timed out after 120s. Removing room.`);
        roomManager.removeRoom(matchId.toString());
      }
    }, 120_000);

    return reply.send({
      success: true,
      matchId: matchId.toString(),
      escrowAddress,
      state: room.state,
    });
  });

  // Confirm deploy endpoint: transitions room from WAITING_FOR_DEPLOY to LOBBY
  fastify.post('/api/matches/:id/confirm-deploy', async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = roomManager.getRoom(id);

    if (!room) {
      return reply.status(404).send({ error: 'Match not found' });
    }

    const confirmed = room.confirmDeploy();
    return reply.send({
      success: true,
      matchId: id,
      state: room.state,
      confirmed,
    });
  });

  // User match history from persistent database
  fastify.get('/api/users/:wallet/history', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const history = await dbService.getUserHistory(wallet);
    return reply.send({ success: true, history });
  });

  // User statistics from persistent database
  fastify.get('/api/users/:wallet/stats', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const stats = await dbService.getUserStats(wallet);
    return reply.send({ success: true, stats });
  });

  // User internal balance
  fastify.get('/api/users/:wallet/balance', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const query = req.query as { telegramId?: string; username?: string };
    const account = await dbService.getUserAccount(wallet, query.telegramId, query.username);
    const transactions = await dbService.getUserTransactions(wallet);
    return reply.send({ success: true, account, transactions });
  });

  // User deposit to internal balance
  fastify.post('/api/users/:wallet/deposit', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const body = req.body as { amountTon: string; txHash?: string };
    if (!body.amountTon || parseFloat(body.amountTon) <= 0) {
      return reply.status(400).send({ error: 'Invalid deposit amount' });
    }
    const account = await dbService.creditUserBalance(
      wallet,
      body.amountTon,
      'DEPOSIT',
      body.txHash ? `Tx: ${body.txHash}` : undefined
    );
    return reply.send({ success: true, account });
  });

  // User withdraw from internal balance
  fastify.post('/api/users/:wallet/withdraw', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const body = req.body as { amountTon: string };
    if (!body.amountTon || parseFloat(body.amountTon) <= 0) {
      return reply.status(400).send({ error: 'Invalid withdrawal amount' });
    }
    const result = await dbService.debitUserBalance(
      wallet,
      body.amountTon,
      'WITHDRAW',
      `Payout to ${wallet}`
    );
    if (!result.success) {
      return reply.status(400).send({ error: result.error || 'Withdrawal failed' });
    }
    return reply.send({ success: true, account: result.account });
  });

  // User active matches (where user is Player A or Player B)
  fastify.get('/api/users/:wallet/active-matches', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const target = wallet.toLowerCase();
    const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';

    const userRooms = roomManager.getAllRooms().filter((r) => {
      if (r.state === 'MATCH_SETTLED' || r.state === 'FORFEITED') return false;
      const isA = r.playerA.walletAddress.toLowerCase() === target;
      const isB = r.playerB && r.playerB.walletAddress.toLowerCase() === target;
      return isA || isB;
    });

    const matches = userRooms.map((r) => {
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
        currentRound: r.currentRound,
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
        wagerTon: (Number(r.config.wagerAmountNano) / 1e9).toFixed(2),
        totalBetsA: r.totalBetsA.toString(),
        totalBetsB: r.totalBetsB.toString(),
        oddsA: odds.oddsA,
        oddsB: odds.oddsB,
        spectatorCount: r.spectators.size,
      };
    });

    return reply.send({ success: true, matches });
  });

  // Delete / cancel match endpoint
  fastify.delete('/api/matches/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = roomManager.removeRoom(id);
    return reply.send({ success: true, deleted });
  });
}

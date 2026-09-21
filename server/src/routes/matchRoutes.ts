import { FastifyInstance } from 'fastify';
import { RoomManager } from '../engine/RoomManager.js';
import { computePariMutuelOdds } from '../services/oddsCalculator.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';
import { tonSettlementService } from '../services/tonSettlement.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';
import { TonClient, WalletContractV4, internal, toNano, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

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

      const wagerGram = (Number(r.config.wagerAmountNano) / 1e9).toFixed(2);

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
        wagerTon: wagerGram,
        wagerGram,
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

    const wagerGram = (Number(room.config.wagerAmountNano) / 1e9).toFixed(2);

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
      wagerTon: wagerGram,
      wagerGram,
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

  // Create match endpoint (deducts wager + creation fee from Player A balance)
  fastify.post('/api/matches', async (req, reply) => {
    const body = req.body as {
      wagerAmountNano?: string;
      playerAAddress: string;
      telegramUserId?: string;
      telegramUsername?: string;
      recruiterA?: string;
      groupAdminAddress?: string;
    };

    if (!body.playerAAddress) {
      return reply.status(400).send({ error: 'playerAAddress is required' });
    }

    const matchId = BigInt(Date.now() % 1000000000);
    const wagerNano = body.wagerAmountNano ? BigInt(body.wagerAmountNano) : 1000000000n;
    const wagerGram = Number(wagerNano) / 1e9;

    const { creationFeeGram } = feeConfig.getConfig();
    const totalRequired = wagerGram + creationFeeGram;

    // Check Player A's internal balance
    const userAccount = await dbService.getUserAccount(
      body.playerAAddress,
      body.telegramUserId,
      body.telegramUsername
    );
    const currentBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

    if (currentBal < totalRequired) {
      return reply.status(400).send({
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance! You need ${totalRequired.toFixed(2)} GRAM (${wagerGram.toFixed(2)} GRAM wager + ${creationFeeGram.toFixed(2)} GRAM creation fee), but your balance is ${currentBal.toFixed(2)} GRAM.`,
        requiredGram: totalRequired.toFixed(2),
        wagerGram: wagerGram.toFixed(2),
        creationFeeGram: creationFeeGram.toFixed(2),
        currentBalanceGram: currentBal.toFixed(2),
        missingGram: (totalRequired - currentBal).toFixed(2),
      });
    }

    // Debit wager and creation fee
    await dbService.debitUserBalance(
      body.playerAAddress,
      wagerGram.toFixed(2),
      'MATCH_BET',
      `Wager for match #${matchId}`
    );
    await dbService.debitUserBalance(
      body.playerAAddress,
      creationFeeGram.toFixed(2),
      'CREATION_FEE',
      `Creation fee for match #${matchId}`
    );

    // Credit creation fee to Treasury
    await dbService.creditTreasury(creationFeeGram.toFixed(2), 'CREATION_FEE', matchId.toString());

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

    // Instant Room Creation: Room enters LOBBY immediately
    room.state = 'LOBBY';

    return reply.send({
      success: true,
      matchId: matchId.toString(),
      escrowAddress,
      state: room.state,
      wagerGram: wagerGram.toFixed(2),
      creationFeeGram: creationFeeGram.toFixed(2),
    });
  });

  // Join match endpoint (deducts wager from Player B balance)
  fastify.post('/api/matches/:id/join', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      playerBAddress: string;
      telegramUserId?: string;
      telegramUsername?: string;
    };

    if (!body.playerBAddress) {
      return reply.status(400).send({ error: 'playerBAddress is required' });
    }

    const room = roomManager.getRoom(id);
    if (!room) {
      return reply.status(404).send({ error: 'Match not found' });
    }
    if (room.state !== 'LOBBY' || room.playerB) {
      return reply.status(400).send({ error: 'Match is no longer available to join' });
    }
    if (room.playerA.walletAddress.toLowerCase() === body.playerBAddress.toLowerCase()) {
      return reply.status(400).send({ error: 'You cannot duel against yourself' });
    }

    const wagerGram = Number(room.config.wagerAmountNano) / 1e9;

    // Check Player B's balance
    const userAccount = await dbService.getUserAccount(
      body.playerBAddress,
      body.telegramUserId,
      body.telegramUsername
    );
    const currentBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

    if (currentBal < wagerGram) {
      return reply.status(400).send({
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance! You need ${wagerGram.toFixed(2)} GRAM to join, but your balance is ${currentBal.toFixed(2)} GRAM.`,
        requiredGram: wagerGram.toFixed(2),
        currentBalanceGram: currentBal.toFixed(2),
        missingGram: (wagerGram - currentBal).toFixed(2),
      });
    }

    // Debit wager from Player B
    await dbService.debitUserBalance(
      body.playerBAddress,
      wagerGram.toFixed(2),
      'MATCH_BET',
      `Wager for match #${id}`
    );

    // Assign Player B and transition room
    room.playerB = {
      walletAddress: body.playerBAddress,
      telegramId: body.telegramUserId || '',
      username: body.telegramUsername || 'Player B',
      connected: false,
      ready: false,
      score: 0,
    };
    room.config.playerBAddress = body.playerBAddress;
    room.state = 'BETTING_WINDOW';

    room.broadcast({
      type: 'ROOM_UPDATE',
      state: room.state,
      playerB: {
        wallet: room.playerB.walletAddress,
        name: room.playerB.username,
        score: 0,
      },
      message: `${room.playerB.username} has joined the Arena! Prepare to duel!`,
    });

    return reply.send({
      success: true,
      matchId: id,
      state: room.state,
      wagerGram: wagerGram.toFixed(2),
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
    const body = req.body as { amountGram?: string; amountTon?: string; txHash?: string; boc?: string };
    const amount = body.amountGram || body.amountTon;
    if (!amount || parseFloat(amount) <= 0) {
      return reply.status(400).send({ error: 'Invalid deposit amount' });
    }
    const account = await dbService.creditUserBalance(
      wallet,
      amount,
      'DEPOSIT',
      body.txHash ? `Tx: ${body.txHash}` : body.boc ? `BOC: ${body.boc.slice(0, 16)}...` : 'On-chain deposit'
    );
    return reply.send({ success: true, account });
  });

  // User withdraw from internal balance
  fastify.post('/api/users/:wallet/withdraw', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const body = req.body as { amountGram?: string; amountTon?: string };
    const amount = body.amountGram || body.amountTon;
    if (!amount || parseFloat(amount) <= 0) {
      return reply.status(400).send({ error: 'Invalid withdrawal amount' });
    }

    const account = await dbService.getUserAccount(wallet);
    const currentBal = parseFloat(account.balanceGram || account.balanceTon || '0');
    const withdrawNum = parseFloat(amount);
    if (currentBal < withdrawNum) {
      return reply.status(400).send({ error: 'Insufficient balance' });
    }

    let onChainTxHash: string | undefined = undefined;
    const mnemonic = process.env.SERVER_HOT_WALLET_MNEMONIC || process.env.TON_MNEMONIC;
    const endpoint = process.env.TON_RPC_ENDPOINT;

    if (mnemonic && endpoint) {
      try {
        const tonClient = new TonClient({ endpoint, apiKey: process.env.TON_API_KEY });
        const keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
        const walletContract = tonClient.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
        const seqno = await walletContract.getSeqno();

        await walletContract.sendTransfer({
          secretKey: keyPair.secretKey,
          seqno,
          messages: [
            internal({
              to: Address.parse(wallet),
              value: toNano(amount),
              bounce: false,
              body: 'SfidaBot Withdrawal Payout',
            }),
          ],
        });
        onChainTxHash = `onchain_${Date.now()}`;
        console.log(`[matchRoutes] Sent ${amount} GRAM on-chain to ${wallet}`);
      } catch (txErr: any) {
        console.error(`[matchRoutes] On-chain transfer failed (${txErr.message}), debiting ledger anyway:`, txErr);
      }
    }

    const result = await dbService.debitUserBalance(
      wallet,
      amount,
      'WITHDRAW',
      onChainTxHash ? `Payout on-chain (${onChainTxHash})` : `Payout to ${wallet}`
    );
    if (!result.success) {
      return reply.status(400).send({ error: result.error || 'Withdrawal failed' });
    }
    return reply.send({ success: true, account: result.account, txHash: onChainTxHash });
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

      const wagerGram = (Number(r.config.wagerAmountNano) / 1e9).toFixed(2);

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
        wagerTon: wagerGram,
        wagerGram,
        totalBetsA: r.totalBetsA.toString(),
        totalBetsB: r.totalBetsB.toString(),
        oddsA: odds.oddsA,
        oddsB: odds.oddsB,
        spectatorCount: r.spectators.size,
      };
    });

    return reply.send({ success: true, matches });
  });

  // Dynamic fee configuration endpoint
  fastify.get('/api/config/fees', async (_req, reply) => {
    return reply.send({ success: true, config: feeConfig.getConfig() });
  });

  // Treasury stats endpoint
  fastify.get('/api/treasury', async (_req, reply) => {
    const data = await dbService.getTreasuryData();
    return reply.send({ success: true, treasury: data });
  });

  // Treasury addresses endpoint (for frontend deposit destination)
  fastify.get('/api/treasury/address', async (_req, reply) => {
    const depositAddress =
      process.env.BOT_CASSA_WALLET_ADDRESS ||
      process.env.CLASH_MASTER_ADDRESS ||
      process.env.TREASURY_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
    const treasuryOwner =
      process.env.TREASURY_ADDRESS ||
      process.env.OWNER_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
    return reply.send({ success: true, depositAddress, treasuryOwner });
  });

  // Delete / cancel match endpoint (refunds wager + creation fee if no opponent joined)
  fastify.delete('/api/matches/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = roomManager.getRoom(id);

    if (room && room.state === 'LOBBY' && !room.playerB) {
      const wagerGram = Number(room.config.wagerAmountNano) / 1e9;
      const { creationFeeGram } = feeConfig.getConfig();
      const refundTotal = (wagerGram + creationFeeGram).toFixed(2);
      await dbService.refundUserBalance(
        room.playerA.walletAddress,
        refundTotal,
        `Refund for cancelled match #${id}`
      );
      console.log(`[matchRoutes] Refunded ${refundTotal} GRAM to ${room.playerA.walletAddress} for cancelled match #${id}`);
    }

    const deleted = roomManager.removeRoom(id);
    return reply.send({ success: true, deleted });
  });
}

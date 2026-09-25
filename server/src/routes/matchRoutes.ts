import { FastifyInstance } from 'fastify';
import { RoomManager } from '../engine/RoomManager.js';
import { computePariMutuelOdds } from '../services/oddsCalculator.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';
import { tonSettlementService } from '../services/tonSettlement.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';
import { TonClient, WalletContractV4, WalletContractV5R1, SendMode, internal, toNano, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

export async function matchRoutes(fastify: FastifyInstance) {
  const roomManager = RoomManager.getInstance();
  const refundedMatchIds = new Set<string>();

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
        gameType: r.gameType || 'roulette',
        escrowAddress,
        state: r.state,
        isPrivate: r.isPrivate || false,
        winnerAddress: r.winnerAddress,
        winnerName: r.winnerName,
        resolution: r.resolution,
        playerA: {
          wallet: r.playerA.walletAddress,
          name: r.playerA.username,
          score: r.playerA.score,
          telegramUserId: r.playerA.telegramId,
        },
        playerB: r.playerB
          ? {
              wallet: r.playerB.walletAddress,
              name: r.playerB.username,
              score: r.playerB.score,
              telegramUserId: r.playerB.telegramId,
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
      gameType: room.gameType || 'roulette',
      escrowAddress,
      state: room.state,
      isPrivate: room.isPrivate || false,
      winnerAddress: room.winnerAddress,
      winnerName: room.winnerName,
      resolution: room.resolution,
      gameData: room.getGamePayload(),
      playerA: {
        wallet: room.playerA.walletAddress,
        name: room.playerA.username,
        score: room.playerA.score,
        ready: room.playerA.ready,
        telegramUserId: room.playerA.telegramId,
      },
      playerB: room.playerB
        ? {
            wallet: room.playerB.walletAddress,
            name: room.playerB.username,
            score: room.playerB.score,
            ready: room.playerB.ready,
            telegramUserId: room.playerB.telegramId,
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
      gameType?: any;
      telegramUserId?: string;
      telegramUsername?: string;
      recruiterA?: string;
      groupAdminAddress?: string;
      isPrivate?: boolean;
    };

    if (!body.playerAAddress) {
      return reply.status(400).send({ error: 'playerAAddress is required' });
    }

    const matchId = BigInt(Date.now() % 1000000000);
    const wagerNano = body.wagerAmountNano ? BigInt(body.wagerAmountNano) : 1000000000n;
    const wagerGram = Number(wagerNano) / 1e9;
    const gameType = body.gameType || 'roulette';

    const { creationFeeGram, minWagerGram } = feeConfig.getConfig();

    if (wagerGram < minWagerGram) {
      return reply.status(400).send({
        error: 'WAGER_TOO_LOW',
        message: `Minimum wager is ${minWagerGram.toFixed(1)} GRAM, but ${wagerGram.toFixed(2)} GRAM was provided.`,
      });
    }

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

    const isPrivate = Boolean(body.isPrivate);
    const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;

    const room = roomManager.createRoom(
      {
        matchId,
        gameType,
        wagerAmountNano: wagerNano,
        playerAAddress: body.playerAAddress,
        recruiterA: body.recruiterA,
        groupAdminAddress: body.groupAdminAddress,
        escrowAddress,
        isPrivate,
        inviteCode,
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
    room.playerA.telegramId = body.telegramUserId || '';
    room.playerA.username = body.telegramUsername || 'Player A';

    return reply.send({
      success: true,
      matchId: matchId.toString(),
      gameType: room.gameType,
      escrowAddress,
      state: room.state,
      wagerGram: wagerGram.toFixed(2),
      creationFeeGram: creationFeeGram.toFixed(2),
      isPrivate: room.isPrivate,
      inviteCode: room.inviteCode,
    });
  });

  // Join match endpoint (deducts wager from Player B balance)
  fastify.post('/api/matches/:id/join', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      playerBAddress: string;
      telegramUserId?: string;
      telegramUsername?: string;
      inviteCode?: string;
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

    // Private match check: require valid invite code
    if (room.isPrivate) {
      if (!body.inviteCode || body.inviteCode.trim().toUpperCase() !== room.inviteCode?.toUpperCase()) {
        return reply.status(403).send({
          error: 'PRIVATE_MATCH',
          message: 'Questa stanza è privata. È necessario il link di invito per partecipare come sfidante.',
        });
      }
    }

    const wagerGram = Number(room.config.wagerAmountNano) / 1e9;
    const { joinFeeGram } = feeConfig.getConfig();
    const totalRequired = wagerGram + joinFeeGram;

    // Check Player B's balance
    const userAccount = await dbService.getUserAccount(
      body.playerBAddress,
      body.telegramUserId,
      body.telegramUsername
    );
    const currentBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

    if (currentBal < totalRequired) {
      return reply.status(400).send({
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance! You need ${totalRequired.toFixed(2)} GRAM (${wagerGram.toFixed(2)} GRAM wager + ${joinFeeGram.toFixed(2)} GRAM participation fee) to join, but your balance is ${currentBal.toFixed(2)} GRAM.`,
        requiredGram: totalRequired.toFixed(2),
        wagerGram: wagerGram.toFixed(2),
        joinFeeGram: joinFeeGram.toFixed(2),
        currentBalanceGram: currentBal.toFixed(2),
        missingGram: (totalRequired - currentBal).toFixed(2),
      });
    }

    // Debit wager from Player B
    await dbService.debitUserBalance(
      body.playerBAddress,
      wagerGram.toFixed(2),
      'MATCH_BET',
      `Wager for match #${id}`
    );

    // Debit join fee from Player B and credit to Treasury
    await dbService.debitUserBalance(
      body.playerBAddress,
      joinFeeGram.toFixed(2),
      'CREATION_FEE',
      `Participation fee for match #${id}`
    );
    await dbService.creditTreasury(joinFeeGram.toFixed(2), 'CREATION_FEE', id);

    // Assign Player B and keep room in LOBBY until both ready up
    room.playerB = {
      walletAddress: body.playerBAddress,
      telegramId: body.telegramUserId || '',
      username: body.telegramUsername || 'Player B',
      connected: false,
      ready: false,
      score: 0,
    };
    room.config.playerBAddress = body.playerBAddress;
    room.state = 'LOBBY';

    room.broadcast({
      type: 'ROOM_UPDATE',
      state: room.state,
      playerB: {
        wallet: room.playerB.walletAddress,
        name: room.playerB.username,
        score: 0,
        telegramUserId: room.playerB.telegramId,
      },
      message: `${room.playerB.username} has joined the Arena! Ready up to duel!`,
    });

    return reply.send({
      success: true,
      matchId: id,
      state: room.state,
      wagerGram: wagerGram.toFixed(2),
      joinFeeGram: joinFeeGram.toFixed(2),
    });
  });

  // User match history from persistent database
  fastify.get('/api/users/:wallet/history', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const query = req.query as { telegramId?: string };
    const history = await dbService.getUserHistory(wallet, query.telegramId);
    return reply.send({ success: true, history });
  });

  // User statistics from persistent database
  fastify.get('/api/users/:wallet/stats', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const query = req.query as { telegramId?: string };
    const stats = await dbService.getUserStats(wallet, query.telegramId);
    return reply.send({ success: true, stats });
  });

  // Global Leaderboard
  fastify.get('/api/leaderboard', async (req, reply) => {
    const query = req.query as { sortBy?: 'wins' | 'streak' | 'profits'; limit?: string; userAddress?: string; telegramId?: string };
    const sortBy = query.sortBy || 'wins';
    const limit = parseInt(query.limit || '50', 10);
    const result = await dbService.getLeaderboard(sortBy, limit, query.userAddress, query.telegramId);
    return reply.send({ success: true, ...result });
  });

  // User internal balance
  fastify.get('/api/users/:wallet/balance', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const query = req.query as { telegramId?: string; username?: string };
    await dbService.restoreUnsentWithdrawals(wallet);
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
      return reply.status(400).send({ error: 'INVALID_AMOUNT', message: 'Invalid withdrawal amount' });
    }

    // Auto-restore any previously failed/unsent withdrawals first
    await dbService.restoreUnsentWithdrawals(wallet);

    const account = await dbService.getUserAccount(wallet);
    const currentBal = parseFloat(account.balanceGram || account.balanceTon || '0');
    const withdrawNum = parseFloat(amount);
    if (currentBal < withdrawNum) {
      return reply.status(400).send({
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance: you have ${currentBal.toFixed(2)} GRAM, tried to withdraw ${withdrawNum.toFixed(2)} GRAM.`
      });
    }

    const mnemonic = process.env.SERVER_HOT_WALLET_MNEMONIC || process.env.TON_MNEMONIC;
    if (!mnemonic || !mnemonic.trim()) {
      return reply.status(400).send({
        error: 'CASSA_NOT_CONFIGURED',
        message: 'Bot cassa wallet is not configured on server (SERVER_HOT_WALLET_MNEMONIC is missing in .env). Withdrawal was cancelled and your balance was NOT debited.'
      });
    }

    const endpoint =
      process.env.TON_RPC_ENDPOINT ||
      (process.env.NETWORK === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC');

    let onChainTxHash: string | undefined = undefined;

    try {
      const tonClient = new TonClient({ endpoint, apiKey: process.env.TON_API_KEY });
      const keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));

      const v4Contract = tonClient.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
      const v5Contract = tonClient.open(WalletContractV5R1.create({ publicKey: keyPair.publicKey }));

      const [bal4, bal5] = await Promise.all([
        tonClient.getBalance(v4Contract.address).catch(() => 0n),
        tonClient.getBalance(v5Contract.address).catch(() => 0n),
      ]);

      const cassaEnvAddr = process.env.BOT_CASSA_WALLET_ADDRESS
        ? Address.parse(process.env.BOT_CASSA_WALLET_ADDRESS).toRawString()
        : null;

      let activeContract: any = v5Contract;
      let activeBalance = bal5;

      if (cassaEnvAddr) {
        if (v4Contract.address.toRawString() === cassaEnvAddr) {
          activeContract = v4Contract;
          activeBalance = bal4;
        } else if (v5Contract.address.toRawString() === cassaEnvAddr) {
          activeContract = v5Contract;
          activeBalance = bal5;
        }
      } else {
        if (bal4 > bal5) {
          activeContract = v4Contract;
          activeBalance = bal4;
        }
      }

      const gasBufferTon = 0.008;
      const neededNano = toNano(amount) + toNano(gasBufferTon.toString());
      if (activeBalance < neededNano) {
        const availableGram = (Number(activeBalance) / 1e9).toFixed(3);
        const v5Friendly = v5Contract.address.toString({ bounceable: false });
        const v4Friendly = v4Contract.address.toString({ bounceable: false });
        console.error(
          `[matchRoutes] Hot wallet cassa balance insufficient. Available: ${availableGram} GRAM, Needed: ${(withdrawNum + gasBufferTon).toFixed(3)} GRAM. (V5: ${v5Friendly}, V4: ${v4Friendly})`
        );
        return reply.status(400).send({
          error: 'INSUFFICIENT_CASSA_FUNDS',
          message: `The bot cassa wallet has insufficient funds (${availableGram} GRAM available, needed ${(withdrawNum + gasBufferTon).toFixed(3)} GRAM including network fee). Please notify admin or fund cassa address (${v5Friendly}). Your balance was NOT debited.`
        });
      }

      const seqno = await activeContract.getSeqno();
      await (activeContract as any).sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        messages: [
          internal({
            to: Address.parse(wallet),
            value: toNano(amount),
            bounce: false,
            body: 'Sfida Withdrawal Payout',
          }),
        ],
      });

      onChainTxHash = `onchain_${Date.now()}`;
      console.log(`[matchRoutes] Sent ${amount} GRAM on-chain to ${wallet} (seqno: ${seqno}, contract: ${activeContract.address.toString({ bounceable: false })})`);
    } catch (txErr: any) {
      console.error(`[matchRoutes] On-chain transfer failed (${txErr.message}):`, txErr);
      return reply.status(500).send({
        error: 'PAYOUT_FAILED',
        message: `Failed to broadcast on-chain transaction: ${txErr.message || 'Unknown network error'}. Your balance was NOT debited.`
      });
    }

    // ONLY debit balance if on-chain transfer succeeded!
    const result = await dbService.debitUserBalance(
      wallet,
      amount,
      'WITHDRAW',
      `Payout on-chain (${onChainTxHash})`
    );

    if (!result.success) {
      return reply.status(400).send({ error: result.error || 'Withdrawal debit failed' });
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
        gameType: r.gameType || 'roulette',
        escrowAddress,
        state: r.state,
        currentRound: (r as any).currentRound || 1,
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
    let depositAddress = process.env.BOT_CASSA_WALLET_ADDRESS;

    if (!depositAddress) {
      const mnemonic = process.env.SERVER_HOT_WALLET_MNEMONIC || process.env.TON_MNEMONIC;
      if (mnemonic) {
        try {
          const keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
          const v5 = WalletContractV5R1.create({ publicKey: keyPair.publicKey });
          depositAddress = v5.address.toString({ bounceable: false });
        } catch (e) {
          console.warn('[matchRoutes] Could not derive address from hot wallet mnemonic:', e);
        }
      }
    }

    if (!depositAddress) {
      depositAddress =
        process.env.CLASH_MASTER_ADDRESS ||
        process.env.TREASURY_ADDRESS ||
        'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
    }

    try {
      depositAddress = Address.parse(depositAddress).toString({ bounceable: false });
    } catch {}

    let treasuryOwner =
      process.env.TREASURY_ADDRESS ||
      process.env.OWNER_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

    try {
      treasuryOwner = Address.parse(treasuryOwner).toString({ bounceable: false });
    } catch {}

    return reply.send({ success: true, depositAddress, treasuryOwner });
  });

  // Delete / cancel match endpoint (refunds players if match has not started active combat)
  fastify.delete('/api/matches/:id', async (req, reply) => {
    const { id } = req.params as { id: string };

    if (refundedMatchIds.has(id)) {
      roomManager.removeRoom(id);
      return reply.send({ success: true, message: 'Match was already cancelled and refunded.' });
    }

    const room = roomManager.getRoom(id);
    if (!room) {
      refundedMatchIds.add(id);
      return reply.send({ success: true, message: 'Match removed from memory.' });
    }

    const canCancel = room.state === 'LOBBY' || room.state === 'WAITING_FOR_DEPLOY' || room.state === 'BETTING_WINDOW';
    if (!canCancel) {
      return reply.status(400).send({
        error: 'CANNOT_CANCEL',
        message: 'Match cannot be cancelled once active combat rounds have begun.',
      });
    }

    refundedMatchIds.add(id);
    const wagerGram = Number(room.config.wagerAmountNano) / 1e9;
    const { creationFeeGram } = feeConfig.getConfig();

    // 1. Refund Player A: wager (+ creation fee if not a rematch)
    const isRematch = (room as any).isRematch === true;
    const refundPlayerATotal = (isRematch ? wagerGram : (wagerGram + creationFeeGram)).toFixed(2);
    await dbService.refundUserBalance(
      room.playerA.walletAddress,
      refundPlayerATotal,
      `Refund for cancelled match #${id}`
    );
    console.log(`[matchRoutes] Refunded ${refundPlayerATotal} GRAM to Player A (${room.playerA.walletAddress}) for cancelled match #${id}`);

    // 2. If Player B has joined, refund Player B: wager + join fee
    let refundPlayerBTotal = '0.00';
    if (room.playerB?.walletAddress) {
      const { joinFeeGram } = feeConfig.getConfig();
      refundPlayerBTotal = (wagerGram + joinFeeGram).toFixed(2);
      await dbService.refundUserBalance(
        room.playerB.walletAddress,
        refundPlayerBTotal,
        `Refund for cancelled match #${id}`
      );
      console.log(`[matchRoutes] Refunded ${refundPlayerBTotal} GRAM to Player B (${room.playerB.walletAddress}) for cancelled match #${id}`);
    }

    // 3. Abort room, clean up all timers and broadcast cancellation
    room.abortRoom(`Match #${id} was cancelled. Wagers have been refunded.`);

    // 4. Remove room from RoomManager
    const deleted = roomManager.removeRoom(id);
    return reply.send({
      success: true,
      deleted,
      refundedPlayerA: refundPlayerATotal,
      refundedPlayerB: refundPlayerBTotal,
    });
  });

  // Admin manual balance adjustment endpoint
  fastify.post('/api/admin/set-balance', async (req, reply) => {
    const body = req.body as { identifier?: string; amountGram?: string };
    if (!body?.identifier) {
      return reply.status(400).send({ error: 'identifier is required' });
    }
    const amount = body.amountGram !== undefined ? body.amountGram : '0.00';
    const account = await dbService.setUserBalanceDirect(body.identifier, amount);
    if (!account) {
      return reply.status(404).send({ error: 'USER_NOT_FOUND', message: `User not found: ${body.identifier}` });
    }
    return reply.send({ success: true, account });
  });
}

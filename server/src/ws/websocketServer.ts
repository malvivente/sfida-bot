import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { RoomManager } from '../engine/RoomManager.js';
import { tonSettlementService } from '../services/tonSettlement.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';

export function registerWebSocketRoutes(fastify: FastifyInstance) {
  const roomManager = RoomManager.getInstance();

  fastify.get('/ws/duel', { websocket: true }, (connection: any, req) => {
    const ws: WebSocket = connection.socket || connection;
    const query = req.query as {
      matchId?: string;
      wallet?: string;
      role?: string;
      telegramId?: string;
      username?: string;
    };

    const matchId = query.matchId;
    if (!matchId) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'matchId is required' }));
      ws.close();
      return;
    }

    const room = roomManager.getRoom(matchId);
    if (!room) {
      console.warn(`[WS] Connection rejected: Match #${matchId} does not exist or has already finished.`);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Match not found or already closed' }));
      ws.close();
      return;
    }

    const role = query.role || 'spectator';
    const wallet = query.wallet || (role === 'player' ? (query.username ? `player_${query.username}` : `player_${Date.now()}`) : `spectator_${Date.now()}`);
    const username = query.username || (role === 'player' ? 'Guerriero' : 'Spettatore');
    const telegramId = query.telegramId || '';

    if (role === 'player') {
      const attached = room.attachPlayer(wallet, telegramId, username, ws);
      if (attached) {
        console.log(`[WS] Player ${username} (${wallet}) connected to Match #${matchId}`);
      } else {
        console.log(`[WS] User ${username} (${wallet}) requested player role but is not an authorized participant in Match #${matchId}. Attaching as spectator.`);
        const spectatorId = `spec_${wallet || Date.now()}`;
        room.attachSpectator(spectatorId, ws);
        ws.on('close', () => {
          room?.removeSpectator(spectatorId);
        });
      }
    } else {
      const spectatorId = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      room.attachSpectator(spectatorId, ws);
      console.log(`[WS] Spectator ${spectatorId} attached to Match #${matchId}`);

      ws.on('close', () => {
        room?.removeSpectator(spectatorId);
      });
    }

    ws.on('message', async (raw: Buffer | string) => {
      try {
        const data = JSON.parse(raw.toString());
        switch (data.type) {
          case 'READY':
            room?.setPlayerReady(wallet, telegramId);
            break;

          case 'TAP':
            (room as any)?.handleTap?.(wallet);
            break;

          case 'SPECTATOR_BET':
            if (data.target && data.amountNano) {
              const isPlayerInRoom = role === 'player' ||
                (room && (wallet.toLowerCase() === room.playerA?.walletAddress.toLowerCase() ||
                  (room.playerB && wallet.toLowerCase() === room.playerB.walletAddress.toLowerCase())));
              if (isPlayerInRoom) {
                console.warn(`[WS] Spectator bet rejected: ${wallet} is a duelist in match ${matchId}`);
                ws.send(JSON.stringify({
                  type: 'BET_ERROR',
                  message: 'Duelists cannot place spectator bets on their own match.',
                }));
                break;
              }

              if (!room || room.state !== 'BETTING_WINDOW') {
                ws.send(JSON.stringify({
                  type: 'BET_ERROR',
                  message: !room
                    ? 'Match not found.'
                    : room.state === 'LOBBY'
                    ? 'Le scommesse si aprono solo quando entrambi i duellanti sono pronti (finestra di 30s).'
                    : 'Le scommesse per questa partita sono chiuse.',
                }));
                break;
              }

              const betAmountNano = BigInt(data.amountNano);
              const betAmountGram = Number(betAmountNano) / 1e9;
              const { minWagerGram, spectatorFeeGram } = feeConfig.getConfig();

              if (betAmountGram < minWagerGram) {
                ws.send(JSON.stringify({
                  type: 'BET_ERROR',
                  message: `Minimum spectator bet is ${minWagerGram.toFixed(1)} GRAM.`,
                }));
                break;
              }

              const totalRequired = betAmountGram + spectatorFeeGram;
              const userAccount = await dbService.getUserAccount(wallet, telegramId, username);
              const curBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

              if (curBal < totalRequired) {
                ws.send(JSON.stringify({
                  type: 'BET_ERROR',
                  message: `Insufficient balance! You need ${totalRequired.toFixed(2)} GRAM (${betAmountGram.toFixed(2)} bet + ${spectatorFeeGram.toFixed(2)} fee), but your balance is ${curBal.toFixed(2)} GRAM.`,
                  missingGram: (totalRequired - curBal).toFixed(2),
                }));
                break;
              }

              // Debit bet and participation fee
              await dbService.debitUserBalance(
                wallet,
                betAmountGram.toFixed(2),
                'MATCH_BET',
                `Spectator bet on Player ${data.target} for match #${matchId}`
              );
              await dbService.debitUserBalance(
                wallet,
                spectatorFeeGram.toFixed(2),
                'CREATION_FEE',
                `Spectator participation fee for match #${matchId}`
              );
              await dbService.creditTreasury(spectatorFeeGram.toFixed(2), 'CREATION_FEE', matchId.toString());

              room.registerSpectatorBet(data.target, betAmountNano, wallet, telegramId, spectatorFeeGram);

              ws.send(JSON.stringify({
                type: 'BET_CONFIRMED',
                target: data.target,
                amountGram: betAmountGram.toFixed(2),
                feePaidGram: spectatorFeeGram.toFixed(2),
                newBalance: (curBal - totalRequired).toFixed(2),
              }));
            }
            break;

          case 'REMATCH_REQUEST':
            room?.requestRematch(wallet, username);
            break;

          case 'REMATCH_ACCEPT':
            room?.acceptRematch(wallet);
            break;

          case 'REMATCH_DECLINE':
            room?.declineRematch(wallet);
            break;

          case 'ROULETTE_SHOOT':
          case 'BLACKJACK_ACTION':
          case 'BRIDGE_STEP':
          case 'BRIDGE_PASS':
          case 'CHRONO_STOP':
            room?.handleGameAction(wallet, data);
            break;

          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
            break;

          default:
            room?.handleGameAction(wallet, data);
            break;
        }
      } catch (err: any) {
        console.error('[WS] Error processing message:', err.message);
      }
    });

    ws.on('close', () => {
      if (role === 'player') {
        console.log(`[WS] Player ${username} (${wallet}) disconnected. Starting grace timer...`);
        room?.handleDisconnect(wallet);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Socket error for ${wallet}:`, err);
    });
  });
}

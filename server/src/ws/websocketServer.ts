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
      firstName?: string;
      first_name?: string;
      photoUrl?: string;
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
    const firstName = query.firstName || query.first_name || '';
    const photoUrl = query.photoUrl ? decodeURIComponent(query.photoUrl) : '';

    if (dbService.isMaintenanceMode() && !dbService.isBotAdmin(telegramId)) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        code: 'MAINTENANCE_MODE',
        message: dbService.getMaintenanceMessage() || 'Piattaforma in manutenzione programmata.',
      }));
      ws.close(1008, 'Maintenance mode');
      return;
    }

    const isAuthorizedParticipant = room.isPlayerParticipant(wallet, telegramId);

    if (role === 'player' || isAuthorizedParticipant) {
      const attached = room.attachPlayer(wallet, telegramId, username, ws, firstName, photoUrl);
      if (attached) {
        console.log(`[WS] Player ${username} (${wallet}) connected to Match #${matchId}`);
      } else {
        console.log(`[WS] User ${username} (${wallet}) requested player role but is not an authorized participant in Match #${matchId}. Attaching as spectator.`);
        const spectatorId = `spec_${wallet || Date.now()}`;
        room.attachSpectator(spectatorId, ws, wallet, telegramId);
        ws.on('close', () => {
          room?.removeSpectator(spectatorId);
        });
      }
    } else {
      const spectatorId = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      room.attachSpectator(spectatorId, ws, wallet, telegramId);
      console.log(`[WS] Spectator ${spectatorId} attached to Match #${matchId}`);

      ws.on('close', () => {
        room?.removeSpectator(spectatorId);
      });
    }

    ws.on('message', async (raw: Buffer | string) => {
      try {
        (ws as any).lastActivity = Date.now();
        const data = JSON.parse(raw.toString());
        // Determine whether sender is Player A, Player B, or spectator
        const senderSide = room ? room.getPlayerSide(wallet, ws) : null;
        const senderWallet = senderSide === 'A'
          ? room!.playerA.walletAddress
          : (senderSide === 'B' && room!.playerB ? room!.playerB.walletAddress : wallet);
        const senderTelegramId = senderSide === 'A'
          ? (room!.playerA.telegramId || telegramId)
          : (senderSide === 'B' && room!.playerB ? (room!.playerB.telegramId || telegramId) : telegramId);

        switch (data.type) {
          case 'READY':
            room?.setPlayerReady(senderWallet, senderTelegramId);
            break;

          case 'TAP':
            (room as any)?.handleTap?.(senderWallet);
            break;

          case 'SPECTATOR_BET':
          case 'PLACE_SPECTATOR_BET':
            if (data.target && data.amountNano) {
              try {
                const bettorWalletRaw = data.wallet || wallet;
                const bettorTgRaw = data.telegramId || telegramId;
                const cleanTg = bettorTgRaw ? String(bettorTgRaw).replace(/^tg_/, '').trim() : undefined;

                const isPlayerInRoom = Boolean(senderSide) ||
                  (room && (
                    (room.playerA && (room.isSameWallet(bettorWalletRaw, room.playerA.walletAddress) || (cleanTg && room.playerA.telegramId && String(room.playerA.telegramId).replace(/^tg_/, '') === cleanTg))) ||
                    (room.playerB && (room.isSameWallet(bettorWalletRaw, room.playerB.walletAddress) || (cleanTg && room.playerB.telegramId && String(room.playerB.telegramId).replace(/^tg_/, '') === cleanTg))) ||
                    ((room as any).isPlayerParticipant && (room as any).isPlayerParticipant(bettorWalletRaw, cleanTg))
                  ));
                if (isPlayerInRoom) {
                  console.warn(`[WS] Spectator bet rejected: ${bettorWalletRaw} is a duelist in match ${matchId}`);
                  ws.send(JSON.stringify({
                    type: 'BET_ERROR',
                    message: 'I duellanti non possono scommettere sulla propria partita.',
                  }));
                  break;
                }

                if (!room || room.state !== 'BETTING_WINDOW') {
                  ws.send(JSON.stringify({
                    type: 'BET_ERROR',
                    message: !room
                      ? 'Partita non trovata.'
                      : room.state === 'LOBBY'
                      ? 'Le scommesse si aprono solo quando entrambi i duellanti sono pronti.'
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
                    message: `La puntata minima per gli spettatori è di ${minWagerGram.toFixed(1)} GRAM.`,
                  }));
                  break;
                }

                const totalRequired = betAmountGram + spectatorFeeGram;
                const userAccount = await dbService.getUserAccount(bettorWalletRaw, cleanTg, username);
                const curBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

                if (curBal < totalRequired) {
                  ws.send(JSON.stringify({
                    type: 'BET_ERROR',
                    message: `Saldo insufficiente! Servono ${totalRequired.toFixed(2)} GRAM (${betAmountGram.toFixed(2)} puntata + ${spectatorFeeGram.toFixed(2)} commissione), ma il tuo saldo è di ${curBal.toFixed(2)} GRAM.`,
                    missingGram: (totalRequired - curBal).toFixed(2),
                  }));
                  break;
                }

                const effectiveTelegramId = cleanTg || (userAccount?.telegramId ? String(userAccount.telegramId).replace(/^tg_/, '').trim() : undefined) || (bettorWalletRaw?.startsWith('tg_') ? bettorWalletRaw.replace(/^tg_/, '') : undefined);
                const bettorWallet = userAccount.walletAddress || bettorWalletRaw || (effectiveTelegramId ? `tg_${effectiveTelegramId}` : `spectator_${Date.now()}`);

                // Prevent duplicate or changing spectator bets: bet is locked once placed
                const alreadyBet = room.spectatorBets.some((b) =>
                  (bettorWallet && b.walletAddress && room.isSameWallet(b.walletAddress, bettorWallet)) ||
                  (effectiveTelegramId && b.telegramId && String(b.telegramId).replace(/^tg_/, '') === effectiveTelegramId)
                );
                if (alreadyBet) {
                  ws.send(JSON.stringify({
                    type: 'BET_ERROR',
                    message: 'Hai già piazzato la tua puntata per questo duello. La scommessa è bloccata.',
                  }));
                  break;
                }

                // Debit bet and participation fee
                await dbService.debitUserBalance(
                  bettorWallet,
                  betAmountGram.toFixed(2),
                  'MATCH_BET',
                  `Spectator bet on ${data.target === 'X' ? 'Peace (Both Split)' : 'Player ' + data.target} for match #${matchId}`,
                  effectiveTelegramId
                );
                await dbService.debitUserBalance(
                  bettorWallet,
                  spectatorFeeGram.toFixed(2),
                  'CREATION_FEE',
                  `Spectator participation fee for match #${matchId}`,
                  effectiveTelegramId
                );
                await dbService.creditTreasury(spectatorFeeGram.toFixed(2), 'CREATION_FEE', matchId.toString());

                room.registerSpectatorBet(data.target, betAmountNano, bettorWallet, effectiveTelegramId, spectatorFeeGram);

                ws.send(JSON.stringify({
                  type: 'BET_CONFIRMED',
                  target: data.target,
                  amountGram: betAmountGram.toFixed(2),
                  feePaidGram: spectatorFeeGram.toFixed(2),
                  newBalance: (curBal - totalRequired).toFixed(2),
                }));
              } catch (err: any) {
                console.error(`[WS] Error processing spectator bet on match #${matchId}:`, err);
                ws.send(JSON.stringify({
                  type: 'BET_ERROR',
                  message: err?.message || 'Errore durante il piazzamento della scommessa.',
                }));
              }
            }
            break;

          case 'REMATCH_REQUEST':
            // Only actual combatants in this room can request rematch
            if (!senderSide) {
              console.warn(`[WS] Rematch request ignored: sender is not a player in match #${matchId}`);
              break;
            }
            room?.requestRematch(senderWallet, username);
            break;

          case 'REMATCH_ACCEPT':
            // Only actual combatants in this room can accept rematch
            if (!senderSide) {
              console.warn(`[WS] Rematch accept ignored: sender is not a player in match #${matchId}`);
              break;
            }
            room?.acceptRematch(senderWallet);
            break;

          case 'REMATCH_DECLINE':
            // Only actual combatants in this room can decline rematch
            if (!senderSide) {
              console.warn(`[WS] Rematch decline ignored: sender is not a player in match #${matchId}`);
              break;
            }
            room?.declineRematch(senderWallet);
            break;

          case 'ROULETTE_SHOOT':
          case 'BLACKJACK_ACTION':
          case 'BRIDGE_STEP':
          case 'BRIDGE_PASS':
          case 'CHRONO_STOP':
          case 'SPLIT_STEAL_CHOICE':
          case 'POKER_ACTION':
            room?.handleGameAction(senderWallet, { ...data, telegramUserId: senderTelegramId, telegramId: senderTelegramId });
            break;

          case 'LEAVE':
            console.log(`[WS] Client ${username} explicitly left Match #${matchId}`);
            room?.handleDisconnect(wallet, ws, telegramId);
            try { ws.close(1000, 'User left'); } catch {}
            break;

          case 'PING':
            (ws as any).lastActivity = Date.now();
            ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
            break;

          default:
            (ws as any).lastActivity = Date.now();
            room?.handleGameAction(senderWallet, data);
            break;
        }
      } catch (err: any) {
        console.error('[WS] Error processing message:', err.message);
      }
    });

    // Mobile dead-connection detector (terminates zombie sockets if completely inactive for >45s in active match)
    (ws as any).lastActivity = Date.now();
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const inactiveMs = Date.now() - ((ws as any).lastActivity || Date.now());
        if (inactiveMs > 45000 && room && (room.state === 'GAME_ACTIVE' || room.state === 'ROUND_START')) {
          console.warn(`[WS] Dead socket detected for ${username} in Match #${matchId} (inactive ${Math.round(inactiveMs / 1000)}s). Terminating...`);
          clearInterval(heartbeatInterval);
          ws.terminate();
        }
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 10000);

    ws.on('close', () => {
      clearInterval(heartbeatInterval);
      console.log(`[WS] Connection closed for ${username} (${wallet}, tg: ${telegramId}) in Match #${matchId}`);
      room?.handleDisconnect(wallet, ws, telegramId);
    });

    ws.on('error', (err) => {
      clearInterval(heartbeatInterval);
      console.error(`[WS] Socket error for ${wallet}:`, err);
    });
  });
}

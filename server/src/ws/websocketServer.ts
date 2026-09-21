import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { RoomManager } from '../engine/RoomManager.js';
import { tonSettlementService } from '../services/tonSettlement.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';

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

    let room = roomManager.getRoom(matchId);
    if (!room) {
      // Auto-create room if not already running
      const wagerNano = 1000000000n; // default 1 TON
      const playerA = query.wallet || 'EQA_playerA_fallback';
      const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';
      let escrowAddress = '';
      if (clashMasterAddr && playerA) {
        escrowAddress = computeEscrowAddress(
          clashMasterAddr,
          BigInt(matchId),
          playerA,
          wagerNano,
          signerService.getPublicKeyBigInt()
        );
      }

      room = roomManager.createRoom(
        {
          matchId: BigInt(matchId),
          wagerAmountNano: wagerNano,
          playerAAddress: playerA,
          escrowAddress,
        },
        async (settledRoom, winner) => {
          console.log(`[WS] Match #${settledRoom.matchId} settled with winner: ${winner}`);
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
            await tonSettlementService.settleMatch(
              targetEscrow,
              settledRoom.matchId,
              winner
            );
          }
        }
      );
    }

    const role = query.role || 'spectator';
    const wallet = query.wallet || (role === 'player' ? (query.username ? `player_${query.username}` : `player_${Date.now()}`) : `spectator_${Date.now()}`);
    const username = query.username || (role === 'player' ? 'Guerriero' : 'Spettatore');
    const telegramId = query.telegramId || '';

    if (role === 'player') {
      room.attachPlayer(wallet, telegramId, username, ws);
      console.log(`[WS] Player ${username} (${wallet}) connected to Match #${matchId}`);
    } else {
      const spectatorId = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      room.attachSpectator(spectatorId, ws);
      console.log(`[WS] Spectator ${spectatorId} attached to Match #${matchId}`);

      ws.on('close', () => {
        room?.removeSpectator(spectatorId);
      });
    }

    ws.on('message', (raw: Buffer | string) => {
      try {
        const data = JSON.parse(raw.toString());
        switch (data.type) {
          case 'READY':
            room?.setPlayerReady(wallet);
            break;

          case 'TAP':
            room?.handleTap(wallet);
            break;

          case 'SPECTATOR_BET':
            if (data.target && data.amountNano) {
              const isPlayerInRoom = role === 'player' ||
                (room && (wallet.toLowerCase() === room.playerA?.walletAddress.toLowerCase() ||
                  (room.playerB && wallet.toLowerCase() === room.playerB.walletAddress.toLowerCase())));
              if (isPlayerInRoom) {
                console.warn(`[WS] Spectator bet rejected: ${wallet} is a duelist in match ${matchId}`);
                break;
              }
              room?.registerSpectatorBet(data.target, BigInt(data.amountNano), wallet);
            }
            break;

          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
            break;

          default:
            console.log(`[WS] Unrecognized action from ${wallet}:`, data);
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

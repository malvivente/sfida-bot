import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { RussianRouletteRoom } from './RussianRouletteRoom.js';
import { BlackjackRoom } from './BlackjackRoom.js';
import { GlassBridgeRoom } from './GlassBridgeRoom.js';
import { ChronoBlindRoom } from './ChronoBlindRoom.js';
import { SplitStealRoom } from './SplitStealRoom.js';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, BaseGameRoom> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public createRoom(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ): BaseGameRoom {
    const key = config.matchId.toString();
    const gameType = config.gameType || 'roulette';

    const onSettledWrapped = async (r: BaseGameRoom, winner: string) => {
      if (onSettled) {
        try {
          await onSettled(r, winner);
        } catch (e) {
          console.error('[RoomManager] Error in onSettled callback:', e);
        }
      }

      if (winner && r.winnerName && !r.winnerName.includes('Nessun Vincitore') && !r.winnerName.includes('Pace')) {
        const wagerNum = Number(r.config.wagerAmountNano) / 1e9;
        const totalPot = wagerNum * 2;
        const payout = (r.gameType === 'split' ? totalPot : totalPot * 0.96).toFixed(2);
        this.broadcastGlobal({
          type: 'GLOBAL_WIN',
          data: {
            id: `win_${r.matchId}`,
            winnerName: r.winnerName.replace(/^@/, ''),
            gameType: r.gameType || 'roulette',
            payoutGram: payout,
            timestamp: Date.now(),
          },
        });
      }
    };

    let room: BaseGameRoom;
    switch (gameType) {
      case 'blackjack':
        room = new BlackjackRoom(config, onSettledWrapped);
        break;
      case 'bridge':
        room = new GlassBridgeRoom(config, onSettledWrapped);
        break;
      case 'chrono':
        room = new ChronoBlindRoom(config, onSettledWrapped);
        break;
      case 'split':
        room = new SplitStealRoom(config, onSettledWrapped);
        break;
      case 'roulette':
      default:
        room = new RussianRouletteRoom(config, onSettledWrapped);
        break;
    }

    this.rooms.set(key, room);
    return room;
  }

  public getRoom(matchId: string | bigint): BaseGameRoom | undefined {
    return this.rooms.get(matchId.toString());
  }

  public getAllRooms(): BaseGameRoom[] {
    return Array.from(this.rooms.values());
  }

  public removeRoom(matchId: string | bigint): boolean {
    return this.rooms.delete(matchId.toString());
  }

  public broadcastGlobal(message: any): void {
    for (const room of this.rooms.values()) {
      try {
        room.broadcast(message);
      } catch {}
    }
  }
}

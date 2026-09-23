import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { RussianRouletteRoom } from './RussianRouletteRoom.js';
import { BlackjackRoom } from './BlackjackRoom.js';
import { GlassBridgeRoom } from './GlassBridgeRoom.js';
import { ChronoBlindRoom } from './ChronoBlindRoom.js';

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

    let room: BaseGameRoom;
    switch (gameType) {
      case 'blackjack':
        room = new BlackjackRoom(config, onSettled);
        break;
      case 'bridge':
        room = new GlassBridgeRoom(config, onSettled);
        break;
      case 'chrono':
        room = new ChronoBlindRoom(config, onSettled);
        break;
      case 'roulette':
      default:
        room = new RussianRouletteRoom(config, onSettled);
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
}

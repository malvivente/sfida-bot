import { QuickdrawRoom, RoomConfig } from './QuickdrawRoom.js';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, QuickdrawRoom> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public createRoom(
    config: RoomConfig,
    onSettled?: (room: QuickdrawRoom, winner: string) => Promise<void>
  ): QuickdrawRoom {
    const key = config.matchId.toString();
    const room = new QuickdrawRoom(config, onSettled);
    this.rooms.set(key, room);
    return room;
  }

  public getRoom(matchId: string | bigint): QuickdrawRoom | undefined {
    return this.rooms.get(matchId.toString());
  }

  public getAllRooms(): QuickdrawRoom[] {
    return Array.from(this.rooms.values());
  }

  public removeRoom(matchId: string | bigint): boolean {
    return this.rooms.delete(matchId.toString());
  }
}

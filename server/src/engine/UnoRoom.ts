import { WebSocket } from 'ws';
import { BaseGameRoom, RoomConfig, PlayerSession } from './BaseGameRoom.js';
import { UnoState, UnoCard, UnoColor, UnoCardType, CoinTossData, UnoSeat } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';
import { cleanPlayerName } from '../utils/cleanName.js';

const COLORS: UnoColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const SIDES: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

function generateUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let id = 1;

  for (const color of COLORS) {
    // 1x 0
    deck.push({ id: `c_${id++}`, color, type: '0', value: 0 });

    // 2x 1-9
    for (let n = 1; n <= 9; n++) {
      const typeStr = n.toString() as UnoCardType;
      deck.push({ id: `c_${id++}`, color, type: typeStr, value: n });
      deck.push({ id: `c_${id++}`, color, type: typeStr, value: n });
    }

    // 2x SKIP, 2x REVERSE, 2x DRAW2
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `c_${id++}`, color, type: 'SKIP', value: 20 });
      deck.push({ id: `c_${id++}`, color, type: 'REVERSE', value: 20 });
      deck.push({ id: `c_${id++}`, color, type: 'DRAW2', value: 20 });
    }
  }

  // 4x WILD, 4x WILD_DRAW4
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${id++}`, color: 'WILD', type: 'WILD', value: 50 });
    deck.push({ id: `c_${id++}`, color: 'WILD', type: 'WILD_DRAW4', value: 50 });
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export class UnoRoom extends BaseGameRoom {
  public maxPlayers: number = 2;
  public extraPlayers: PlayerSession[] = [];
  public seats: UnoSeat[] = [];

  public drawPile: UnoCard[] = [];
  public discardPile: UnoCard[] = [];
  public hands: Map<number, UnoCard[]> = new Map();

  public currentColor: UnoColor = 'RED';
  public currentTurnSeat: number = 0;
  public direction: 1 | -1 = 1; // 1 = clockwise, -1 = counter-clockwise

  public lastAction?: UnoState['lastAction'];
  public coinToss?: CoinTossData;

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'uno', onSettled);
    this.maxPlayers = Math.min(4, Math.max(2, Number((config as any).maxPlayers) || 2));
    this.initializeSeats();
  }

  private initializeSeats() {
    this.seats = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      this.seats.push({
        seatIndex: i,
        side: SIDES[i] || 'A',
        walletAddress: '',
        telegramId: '',
        username: `Player ${i + 1}`,
        displayName: `Player ${i + 1}`,
        photoUrl: '',
        handCount: 0,
        unoCalled: false,
        ready: false,
        connected: false,
      });
    }
    this.syncSeatsFromSessions();
  }

  public syncSeatsFromSessions() {
    const sessions = this.getAllPlayerSessions();
    for (let i = 0; i < this.maxPlayers; i++) {
      const p = sessions[i];
      if (this.seats[i]) {
        if (p) {
          this.seats[i].walletAddress = p.walletAddress || '';
          this.seats[i].telegramId = p.telegramId || '';
          this.seats[i].username = p.username || `Player ${i + 1}`;
          this.seats[i].displayName = p.displayName || p.firstName || p.username || `Player ${i + 1}`;
          this.seats[i].photoUrl = p.photoUrl || '';
          this.seats[i].ready = Boolean(p.ready);
          this.seats[i].connected = Boolean(p.connected);
          this.seats[i].handCount = this.hands.get(i)?.length || 0;
        } else {
          this.seats[i].walletAddress = '';
          this.seats[i].telegramId = '';
          this.seats[i].username = `Player ${i + 1}`;
          this.seats[i].displayName = `Player ${i + 1}`;
          this.seats[i].photoUrl = '';
          this.seats[i].ready = false;
          this.seats[i].connected = false;
          this.seats[i].handCount = 0;
          this.seats[i].unoCalled = false;
        }
      }
    }
  }

  public getAllPlayerSessions(): PlayerSession[] {
    const list: PlayerSession[] = [this.playerA];
    if (this.playerB) list.push(this.playerB);
    for (const ep of this.extraPlayers) {
      list.push(ep);
    }
    return list;
  }

  public hasAvailableSeat(): boolean {
    return this.getAllPlayerSessions().length < this.maxPlayers;
  }

  public isTableFull(): boolean {
    return this.getAllPlayerSessions().length >= this.maxPlayers;
  }

  public addExtraPlayer(
    walletAddress: string,
    telegramId: string,
    username: string,
    firstName?: string,
    photoUrl?: string
  ): PlayerSession | null {
    if (this.isTableFull()) return null;

    const session: PlayerSession = {
      walletAddress,
      telegramId,
      username: cleanPlayerName(username),
      firstName: firstName?.trim(),
      displayName: firstName?.trim() || cleanPlayerName(username),
      photoUrl,
      connected: false,
      ready: false,
      score: 0,
    };

    this.extraPlayers.push(session);
    this.syncSeatsFromSessions();
    return session;
  }

  public override isPlayerParticipant(wallet?: string, telegramId?: string): boolean {
    if (!wallet && !telegramId) return false;
    const all = this.getAllPlayerSessions();
    return all.some(
      (p) =>
        (wallet && this.isSameWallet(wallet, p.walletAddress)) ||
        (telegramId && p.telegramId && String(telegramId) === String(p.telegramId))
    );
  }

  public override upgradeSpectatorToPlayer(wallet: string, telegramId: string, username: string): boolean {
    const all = this.getAllPlayerSessions();
    for (const p of all) {
      if (
        (wallet && this.isSameWallet(wallet, p.walletAddress)) ||
        (telegramId && p.telegramId && String(telegramId) === String(p.telegramId))
      ) {
        p.connected = true;
        if (wallet) p.walletAddress = wallet;
        if (telegramId) p.telegramId = telegramId;
        if (username) p.username = cleanPlayerName(username);
        this.syncSeatsFromSessions();
        return true;
      }
    }

    if (!this.playerB) {
      this.playerB = {
        walletAddress: wallet,
        telegramId,
        username: cleanPlayerName(username),
        displayName: cleanPlayerName(username),
        connected: true,
        ready: false,
        score: 0,
      };
      this.syncSeatsFromSessions();
      return true;
    }

    if (this.hasAvailableSeat()) {
      this.addExtraPlayer(wallet, telegramId, username);
      const last = this.extraPlayers[this.extraPlayers.length - 1];
      if (last) last.connected = true;
      this.syncSeatsFromSessions();
      return true;
    }

    return false;
  }

  public override attachPlayer(
    wallet: string,
    telegramId: string,
    username: string,
    ws: WebSocket,
    firstName?: string,
    photoUrl?: string
  ): boolean {
    // 1. Check Player A
    if (
      this.isSameWallet(wallet, this.playerA.walletAddress) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId))
    ) {
      this.handlePlayerConnect(this.playerA, telegramId, username, ws, 'A', firstName, photoUrl);
      this.syncSeatsFromSessions();
      this.broadcastRoomState();
      return true;
    }

    // 2. Check Player B
    if (
      this.playerB &&
      (this.isSameWallet(wallet, this.playerB.walletAddress) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId)))
    ) {
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B', firstName, photoUrl);
      this.syncSeatsFromSessions();
      this.broadcastRoomState();
      return true;
    }

    // 3. Assign Player B if invited in config and not attached
    if (!this.playerB && this.config.playerBAddress && this.isSameWallet(wallet, this.config.playerBAddress)) {
      this.playerB = {
        walletAddress: wallet,
        telegramId,
        username: cleanPlayerName(username),
        firstName: firstName?.trim(),
        displayName: firstName?.trim() || cleanPlayerName(username),
        photoUrl,
        ws,
        connected: true,
        ready: false,
        score: 0,
      };
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B', firstName, photoUrl);
      this.syncSeatsFromSessions();
      this.broadcastRoomState();
      return true;
    }

    // 4. Check Extra Players (Seats 2..3)
    for (let i = 0; i < this.extraPlayers.length; i++) {
      const ep = this.extraPlayers[i];
      if (
        this.isSameWallet(wallet, ep.walletAddress) ||
        (telegramId && ep.telegramId && String(ep.telegramId) === String(telegramId))
      ) {
        ep.ws = ws;
        ep.connected = true;
        if (telegramId) ep.telegramId = telegramId;
        if (username) ep.username = cleanPlayerName(username);
        if (firstName) ep.firstName = firstName.trim();
        if (photoUrl) ep.photoUrl = photoUrl;
        this.syncSeatsFromSessions();
        this.sendTo(ws, {
          type: 'INIT_STATE',
          matchId: this.matchId.toString(),
          gameType: 'uno',
          role: `PLAYER_${SIDES[2 + i] || 'C'}`,
          state: this.state,
          playerAName: this.playerA.username,
          playerBName: this.playerB?.username,
          gameData: this.getGamePayload(),
        });
        this.broadcastRoomState();
        return true;
      }
    }

    return false;
  }

  public override setPlayerReady(wallet: string, telegramId?: string) {
    const all = this.getAllPlayerSessions();
    let found = false;

    for (let idx = 0; idx < all.length; idx++) {
      const p = all[idx];
      if (
        this.isSameWallet(wallet, p.walletAddress) ||
        (telegramId && p.telegramId && String(p.telegramId) === String(telegramId))
      ) {
        p.ready = true;
        if (this.seats[idx]) this.seats[idx].ready = true;
        found = true;
        break;
      }
    }

    if (!found) return;

    this.syncSeatsFromSessions();
    this.broadcastRoomState();

    this.broadcast({
      type: 'PLAYER_READY',
      playerA: { ready: this.playerA.ready },
      playerB: this.playerB ? { ready: this.playerB.ready } : null,
      seats: this.seats.map((s) => ({ seatIndex: s.seatIndex, ready: s.ready, username: s.username })),
    });

    const seatedCount = all.length;
    const allReady = seatedCount >= 2 && seatedCount >= this.maxPlayers && all.every((p) => p.ready);

    if (allReady && this.state === 'LOBBY') {
      this.cancelLobbyExpirationTimer();
      this.cancelPlayerBExpirationTimer();
      this.startBettingWindow();
    }
  }

  public getGamePayload(): UnoState {
    const topCard = this.discardPile[this.discardPile.length - 1] || {
      id: 'default',
      color: 'RED',
      type: '7',
      value: 7,
    };

    const handA = this.hands.get(0) || [];
    const handB = this.hands.get(1) || [];

    const handsBySeat: Record<number, UnoCard[]> = {};
    for (let i = 0; i < this.maxPlayers; i++) {
      handsBySeat[i] = this.hands.get(i) || [];
      if (this.seats[i]) {
        this.seats[i].handCount = handsBySeat[i].length;
      }
    }

    const currentTurnSide = (SIDES[this.currentTurnSeat] || 'A') as 'A' | 'B' | 'C' | 'D';

    return {
      maxPlayers: this.maxPlayers,
      currentTurn: currentTurnSide,
      currentTurnSeat: this.currentTurnSeat,
      direction: this.direction,
      discardPileTop: topCard,
      currentColor: this.currentColor,
      drawPileCount: this.drawPile.length,
      seats: this.seats,
      handA,
      handB,
      handCountA: handA.length,
      handCountB: handB.length,
      unoCalledA: Boolean(this.seats[0]?.unoCalled),
      unoCalledB: Boolean(this.seats[1]?.unoCalled),
      handsBySeat,
      lastAction: this.lastAction,
      coinToss: this.coinToss,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.drawPile = generateUnoDeck();
    this.discardPile = [];
    this.hands.clear();
    this.direction = 1;
    this.lastAction = undefined;

    const totalSeated = this.getAllPlayerSessions().length;

    // Initialize hands for all seated players
    for (let i = 0; i < totalSeated; i++) {
      this.hands.set(i, []);
      if (this.seats[i]) {
        this.seats[i].unoCalled = false;
      }
    }

    // Deal 7 cards to each seated player
    for (let round = 0; round < 7; round++) {
      for (let i = 0; i < totalSeated; i++) {
        if (this.drawPile.length > 0) {
          this.hands.get(i)!.push(this.drawPile.pop()!);
        }
      }
    }

    // Top card on discard
    let firstCard = this.drawPile.pop()!;
    while (firstCard.type === 'WILD_DRAW4' && this.drawPile.length > 0) {
      this.drawPile.unshift(firstCard);
      firstCard = this.drawPile.pop()!;
    }
    this.discardPile.push(firstCard);
    this.currentColor = firstCard.color === 'WILD' ? 'RED' : firstCard.color;

    // Random starter among seated players
    this.currentTurnSeat = Math.floor(Math.random() * totalSeated);
    const activeSession = this.getAllPlayerSessions()[this.currentTurnSeat];
    const activePlayerName = activeSession?.username || `Player ${this.currentTurnSeat + 1}`;

    const starterSide = (SIDES[this.currentTurnSeat] || 'A') as 'A' | 'B';

    this.coinToss = {
      playerASide: 'HEADS',
      playerBSide: 'TAILS',
      winningFace: this.currentTurnSeat === 0 ? 'HEADS' : 'TAILS',
      starterSide,
      starterName: activePlayerName,
      timestamp: Date.now(),
    };

    this.syncSeatsFromSessions();

    this.broadcast({
      type: 'UNO_START',
      message: `UNO Duel started! ${activePlayerName} has the first turn!`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private startTurnTimer() {
    if (this.turnTimeout) clearTimeout(this.turnTimeout);

    const timeoutSec = GAMES_CONFIG.uno?.turnTimeoutSeconds || 15;
    this.turnTimeout = setTimeout(() => {
      console.log(`[UNO] Match #${this.matchId}: Seat ${this.currentTurnSeat} timed out. Auto-drawing.`);
      this.handleAutoTimeout();
    }, timeoutSec * 1000 + (this.discardPile.length <= 1 ? 3000 : 0));
  }

  private reshuffleIfNeeded() {
    if (this.drawPile.length === 0 && this.discardPile.length > 1) {
      const top = this.discardPile.pop()!;
      this.drawPile = this.discardPile;
      this.discardPile = [top];
      for (let i = this.drawPile.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
      }
    }
  }

  private handleAutoTimeout() {
    if (this.state !== 'GAME_ACTIVE') return;

    this.reshuffleIfNeeded();
    const currentHand = this.hands.get(this.currentTurnSeat) || [];
    if (this.drawPile.length > 0) {
      currentHand.push(this.drawPile.pop()!);
    }

    const all = this.getAllPlayerSessions();
    const currentSession = all[this.currentTurnSeat];
    const currentName = currentSession?.username || `Player ${this.currentTurnSeat + 1}`;
    const side = (SIDES[this.currentTurnSeat] || 'A') as 'A' | 'B' | 'C' | 'D';

    this.lastAction = {
      player: currentName,
      seatIndex: this.currentTurnSeat,
      side,
      type: 'DRAW',
      message: `Tempo scaduto per ${currentName}! Carta pescata automaticamente.`,
    };

    // Advance turn to next seat
    const totalSeated = all.length;
    this.currentTurnSeat = (this.currentTurnSeat + this.direction + totalSeated) % totalSeated;

    this.syncSeatsFromSessions();
    this.startTurnTimer();
    this.broadcastRoomState();
  }

  public handleGameAction(wallet: string, data: any) {
    if (this.state !== 'GAME_ACTIVE') return;

    const all = this.getAllPlayerSessions();
    const telegramId = data.telegramUserId || data.telegramId;
    const playerIndex = all.findIndex((p) =>
      (wallet && this.isSameWallet(wallet, p.walletAddress)) ||
      (telegramId && p.telegramId && String(p.telegramId) === String(telegramId))
    );

    if (playerIndex === -1 || playerIndex !== this.currentTurnSeat) {
      console.warn(`[UNO] Action attempted by ${wallet} (seat ${playerIndex}) but active seat is ${this.currentTurnSeat}.`);
      return;
    }

    if (data.type === 'UNO_PLAY_CARD') {
      this.handlePlayCard(playerIndex, data.cardIndex, data.chosenColor);
    } else if (data.type === 'UNO_DRAW_CARD') {
      this.handleDrawCard(playerIndex);
    }
  }

  private handlePlayCard(seatIndex: number, cardIndex: number, chosenColor?: UnoColor) {
    const hand = this.hands.get(seatIndex);
    if (!hand || cardIndex < 0 || cardIndex >= hand.length) return;

    const card = hand[cardIndex];
    const topCard = this.discardPile[this.discardPile.length - 1];

    const isColorMatch = card.color === this.currentColor;
    const isTypeMatch = topCard ? card.type === topCard.type : false;
    const isWild = card.color === 'WILD';

    if (!isColorMatch && !isTypeMatch && !isWild) {
      console.warn(`[UNO] Card cannot be played: ${card.color} ${card.type} on ${this.currentColor} ${topCard?.type}`);
      return;
    }

    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    // Remove from hand
    hand.splice(cardIndex, 1);
    this.discardPile.push(card);

    // Update current color
    if (isWild) {
      this.currentColor = chosenColor || 'RED';
    } else {
      this.currentColor = card.color as UnoColor;
    }

    const all = this.getAllPlayerSessions();
    const totalSeated = all.length;
    const currentSession = all[seatIndex];
    const currentName = currentSession?.username || `Player ${seatIndex + 1}`;
    const side = (SIDES[seatIndex] || 'A') as 'A' | 'B' | 'C' | 'D';

    let message = `${currentName} gioca ${card.color} ${card.type}`;
    let skipSteps = 1;

    // Special card handling
    if (totalSeated === 2) {
      // 2-Player rules: SKIP, REVERSE, DRAW2, WILD_DRAW4 give immediate extra turn to player
      if (card.type === 'SKIP' || card.type === 'REVERSE') {
        skipSteps = 0;
        message += `! Turno saltato per l'avversario!`;
      } else if (card.type === 'DRAW2') {
        const opponentSeat = (seatIndex + 1) % 2;
        const opponentHand = this.hands.get(opponentSeat) || [];
        this.reshuffleIfNeeded();
        for (let i = 0; i < 2; i++) {
          if (this.drawPile.length > 0) opponentHand.push(this.drawPile.pop()!);
        }
        skipSteps = 0;
        message += `! L'avversario pesca 2 carte e salta il turno!`;
      } else if (card.type === 'WILD_DRAW4') {
        const opponentSeat = (seatIndex + 1) % 2;
        const opponentHand = this.hands.get(opponentSeat) || [];
        this.reshuffleIfNeeded();
        for (let i = 0; i < 4; i++) {
          if (this.drawPile.length > 0) opponentHand.push(this.drawPile.pop()!);
        }
        skipSteps = 0;
        message += `! L'avversario pesca 4 carte e il colore diventa ${this.currentColor}!`;
      } else if (isWild) {
        message += `! Il colore scelto è ${this.currentColor}!`;
      }
    } else {
      // 3 or 4-Player rules
      if (card.type === 'REVERSE') {
        this.direction = (this.direction === 1 ? -1 : 1) as 1 | -1;
        message += `! Giro invertito!`;
        skipSteps = 1;
      } else if (card.type === 'SKIP') {
        skipSteps = 2; // Jump over next player
        const victimSeat = (seatIndex + this.direction + totalSeated) % totalSeated;
        const victimName = all[victimSeat]?.username || `Player ${victimSeat + 1}`;
        message += `! Turno saltato per ${victimName}!`;
      } else if (card.type === 'DRAW2') {
        const victimSeat = (seatIndex + this.direction + totalSeated) % totalSeated;
        const victimHand = this.hands.get(victimSeat) || [];
        const victimName = all[victimSeat]?.username || `Player ${victimSeat + 1}`;
        this.reshuffleIfNeeded();
        for (let i = 0; i < 2; i++) {
          if (this.drawPile.length > 0) victimHand.push(this.drawPile.pop()!);
        }
        skipSteps = 2; // Victim draws and loses turn
        message += `! ${victimName} pesca 2 carte e salta il turno!`;
      } else if (card.type === 'WILD_DRAW4') {
        const victimSeat = (seatIndex + this.direction + totalSeated) % totalSeated;
        const victimHand = this.hands.get(victimSeat) || [];
        const victimName = all[victimSeat]?.username || `Player ${victimSeat + 1}`;
        this.reshuffleIfNeeded();
        for (let i = 0; i < 4; i++) {
          if (this.drawPile.length > 0) victimHand.push(this.drawPile.pop()!);
        }
        skipSteps = 2; // Victim draws 4 and loses turn
        message += `! ${victimName} pesca 4 carte e il colore diventa ${this.currentColor}!`;
      } else if (isWild) {
        message += `! Il colore scelto è ${this.currentColor}!`;
      }
    }

    // UNO Shout check
    if (hand.length === 1) {
      if (this.seats[seatIndex]) {
        this.seats[seatIndex].unoCalled = true;
      }
      message += ` 📢 UNO!`;
    }

    this.lastAction = {
      player: currentName,
      seatIndex,
      side,
      type: 'PLAY',
      card,
      message,
    };

    // Check Victory
    if (hand.length === 0) {
      const winnerWallet = currentSession.walletAddress;
      this.syncSeatsFromSessions();
      this.broadcastRoomState();
      this.settleMatch(winnerWallet);
      return;
    }

    // Next turn calculation
    if (skipSteps > 0) {
      this.currentTurnSeat = (seatIndex + this.direction * skipSteps + totalSeated * 2) % totalSeated;
    }

    this.syncSeatsFromSessions();
    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private handleDrawCard(seatIndex: number) {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    this.reshuffleIfNeeded();
    const hand = this.hands.get(seatIndex) || [];
    if (this.drawPile.length > 0) {
      hand.push(this.drawPile.pop()!);
    }

    const all = this.getAllPlayerSessions();
    const totalSeated = all.length;
    const currentSession = all[seatIndex];
    const currentName = currentSession?.username || `Player ${seatIndex + 1}`;
    const side = (SIDES[seatIndex] || 'A') as 'A' | 'B' | 'C' | 'D';

    this.lastAction = {
      player: currentName,
      seatIndex,
      side,
      type: 'DRAW',
      message: `${currentName} pesca una carta dal mazzo.`,
    };

    // Pass turn to next seat
    this.currentTurnSeat = (seatIndex + this.direction + totalSeated) % totalSeated;

    this.syncSeatsFromSessions();
    this.startTurnTimer();
    this.broadcastRoomState();
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }

  public override resetForRematch() {
    this.cleanupGameTimers();
    this.initializeSeats();
  }
}

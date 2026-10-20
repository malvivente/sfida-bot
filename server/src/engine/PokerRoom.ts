import { WebSocket } from 'ws';
import { BaseGameRoom, PlayerSession, RoomConfig } from './BaseGameRoom.js';
import {
  PokerCard,
  PokerStage,
  PokerPlayerSeat,
  PokerState,
  PokerActionType,
  PokerPot,
} from './poker/pokerTypes.js';
import { evaluatePokerHand } from './poker/pokerEvaluator.js';
import { PotManager } from './poker/potManager.js';
import { dbService } from '../services/db.js';
import { cleanPlayerName } from '../utils/cleanName.js';

const STARTING_CHIPS = 1000;
const ACTION_TIMEOUT_SECONDS = 15;

const BLIND_LEVELS = [
  { sb: 10, bb: 20 },
  { sb: 20, bb: 40 },
  { sb: 30, bb: 60 },
  { sb: 50, bb: 100 },
  { sb: 100, bb: 200 },
  { sb: 200, bb: 400 },
  { sb: 300, bb: 600 },
  { sb: 500, bb: 1000 },
];

export class PokerRoom extends BaseGameRoom {
  public maxPlayers: number = 2; // 2 (Heads-Up) to 5 (5-Max)
  public extraPlayers: PlayerSession[] = [];
  public seats: PokerPlayerSeat[] = [];

  public deck: PokerCard[] = [];
  public communityCards: PokerCard[] = [];
  public stage: PokerStage = 'WAITING';

  public pot: number = 0;
  public sidePots: PokerPot[] = [];
  public currentBet: number = 0;
  public minRaise: number = 0;

  public buttonSeat: number = 0;
  public smallBlindSeat: number = 0;
  public bigBlindSeat: number = 1;
  public activeSeat: number | null = null;

  public handNumber: number = 0;
  public blindLevel: number = 0;
  public smallBlind: number = 10;
  public bigBlind: number = 20;

  public turnTimeRemaining: number = ACTION_TIMEOUT_SECONDS;
  private actionTimer?: NodeJS.Timeout;
  private actionInterval?: NodeJS.Timeout;
  private streetTimer?: NodeJS.Timeout;
  private finishHandTimer?: NodeJS.Timeout;

  private clearAllTimers() {
    this.clearActionTimers();
    if (this.streetTimer) {
      clearTimeout(this.streetTimer);
      this.streetTimer = undefined;
    }
    if (this.finishHandTimer) {
      clearTimeout(this.finishHandTimer);
      this.finishHandTimer = undefined;
    }
  }

  public handWinners?: {
    seatIndex: number;
    username: string;
    amount: number;
    rankName?: string;
    winningCards?: PokerCard[];
  }[];

  public tournamentWinner?: {
    seatIndex: number;
    username: string;
    walletAddress: string;
    totalPrizeGram: number;
  };

  private lastBettorSeat: number | null = null;
  private playersActedThisRound: Set<number> = new Set();
  private eliminatedRanks: { seatIndex: number; finishRank: number }[] = [];

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'poker', onSettled);
    this.maxPlayers = Math.min(5, Math.max(2, Number((config as any).maxPlayers) || 2));
    this.initializeSeats();
  }

  private initializeSeats() {
    this.seats = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      this.seats.push({
        seatIndex: i,
        walletAddress: '',
        telegramId: '',
        username: `Seat ${i + 1}`,
        displayName: `Seat ${i + 1}`,
        chips: STARTING_CHIPS,
        currentBet: 0,
        totalInvestedThisHand: 0,
        hasFolded: false,
        isAllIn: false,
        isConnected: false,
        isReady: false,
        isTurn: false,
        role: 'NORMAL',
      });
    }

    // Sync seats from sessions
    this.syncSeatsFromSessions();
  }

  public syncSeatsFromSessions() {
    if (this.seats[0]) {
      this.seats[0].walletAddress = this.playerA.walletAddress;
      this.seats[0].telegramId = this.playerA.telegramId || '';
      this.seats[0].username = this.playerA.username;
      this.seats[0].displayName = this.playerA.displayName || this.playerA.username;
      this.seats[0].isReady = Boolean(this.playerA.ready);
      this.seats[0].isConnected = Boolean(this.playerA.connected);
      this.seats[0].photoUrl = this.playerA.photoUrl;
    }

    if (this.playerB && this.seats[1]) {
      this.seats[1].walletAddress = this.playerB.walletAddress;
      this.seats[1].telegramId = this.playerB.telegramId || '';
      this.seats[1].username = this.playerB.username;
      this.seats[1].displayName = this.playerB.displayName || this.playerB.username;
      this.seats[1].isReady = Boolean(this.playerB.ready);
      this.seats[1].isConnected = Boolean(this.playerB.connected);
      this.seats[1].photoUrl = this.playerB.photoUrl;
    }

    for (let i = 0; i < this.extraPlayers.length; i++) {
      const ep = this.extraPlayers[i];
      const seatIdx = 2 + i;
      if (this.seats[seatIdx]) {
        this.seats[seatIdx].walletAddress = ep.walletAddress;
        this.seats[seatIdx].telegramId = ep.telegramId || '';
        this.seats[seatIdx].username = ep.username;
        this.seats[seatIdx].displayName = ep.displayName || ep.username;
        this.seats[seatIdx].isReady = Boolean(ep.ready);
        this.seats[seatIdx].isConnected = Boolean(ep.connected);
        this.seats[seatIdx].photoUrl = ep.photoUrl;
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
    firstName?: string
  ): PlayerSession | null {
    if (this.isTableFull()) return null;

    const seatIdx = this.getAllPlayerSessions().length;
    const session: PlayerSession = {
      walletAddress,
      telegramId,
      username: cleanPlayerName(username),
      firstName: firstName?.trim(),
      displayName: firstName?.trim() || cleanPlayerName(username),
      connected: false,
      ready: false,
      score: 0,
    };

    this.extraPlayers.push(session);

    if (this.seats[seatIdx]) {
      this.seats[seatIdx].walletAddress = walletAddress;
      this.seats[seatIdx].telegramId = telegramId;
      this.seats[seatIdx].username = session.username;
      this.seats[seatIdx].displayName = session.displayName || session.username;
    }

    return session;
  }

  public override attachPlayer(
    wallet: string,
    telegramId: string,
    username: string,
    ws: WebSocket,
    firstName?: string
  ): boolean {
    // 1. Check Player A
    if (
      this.isSameWallet(wallet, this.playerA.walletAddress) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId))
    ) {
      this.handlePlayerConnect(this.playerA, telegramId, username, ws, 'A', firstName);
      this.syncSeatConnection(0, this.playerA, ws);
      if (this.state === 'GAME_ACTIVE' && this.activeSeat !== null && !this.actionTimer) {
        this.startActionTimer();
      }
      return true;
    }

    // 2. Check Player B
    if (
      this.playerB &&
      (this.isSameWallet(wallet, this.playerB.walletAddress) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId)))
    ) {
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B', firstName);
      this.syncSeatConnection(1, this.playerB, ws);
      if (this.state === 'GAME_ACTIVE' && this.activeSeat !== null && !this.actionTimer) {
        this.startActionTimer();
      }
      return true;
    }

    // 3. Assign Player B if not yet assigned
    if (!this.playerB && this.config.playerBAddress && this.isSameWallet(wallet, this.config.playerBAddress)) {
      this.playerB = {
        walletAddress: wallet,
        telegramId,
        username: cleanPlayerName(username),
        firstName: firstName?.trim(),
        displayName: firstName?.trim() || cleanPlayerName(username),
        ws,
        connected: true,
        ready: false,
        score: 0,
      };
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B', firstName);
      this.syncSeatConnection(1, this.playerB, ws);
      return true;
    }

    // 4. Check Extra Players (Seats 2..4)
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
        this.syncSeatConnection(2 + i, ep, ws);

        this.sendTo(ws, {
          type: 'INIT_STATE',
          matchId: this.matchId.toString(),
          gameType: 'poker',
          role: `PLAYER_${2 + i}`,
          state: this.state,
          payload: this.getGamePayload(),
        });
        this.sendHoleCardsTo(2 + i);
        return true;
      }
    }

    return false;
  }

  private syncSeatConnection(seatIdx: number, session: PlayerSession, ws?: WebSocket) {
    if (this.seats[seatIdx]) {
      this.seats[seatIdx].walletAddress = session.walletAddress;
      this.seats[seatIdx].telegramId = session.telegramId;
      this.seats[seatIdx].username = session.username;
      this.seats[seatIdx].displayName = session.displayName || session.username;
      this.seats[seatIdx].isConnected = true;
      this.seats[seatIdx].photoUrl = session.photoUrl;
    }
  }

  public override setPlayerReady(wallet: string, telegramId?: string) {
    const all = this.getAllPlayerSessions();
    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      if (
        this.isSameWallet(wallet, p.walletAddress) ||
        (telegramId && p.telegramId && String(p.telegramId) === String(telegramId))
      ) {
        p.ready = true;
        if (this.seats[i]) {
          this.seats[i].isReady = true;
        }
        break;
      }
    }

    this.syncSeatsFromSessions();

    this.broadcastRoomState();
    this.broadcastState();

    this.broadcast({
      type: 'PLAYER_READY',
      playerA: { ready: this.playerA.ready },
      playerB: this.playerB ? { ready: this.playerB.ready } : null,
      seats: this.seats.map((s) => ({ seatIndex: s.seatIndex, ready: s.isReady, username: s.username })),
    });

    // Check if table is full and all seated players are ready
    const seatedCount = all.length;
    const allReady = seatedCount >= 2 && seatedCount >= this.maxPlayers && all.every((p) => p.ready);

    if (allReady && (this.state === 'LOBBY' || this.state === 'WAITING_FOR_DEPLOY')) {
      this.startBettingOrGame();
    }
  }

  protected startBettingOrGame() {
    this.cancelLobbyExpirationTimer();
    this.cancelPlayerBExpirationTimer();
    this.onGameStart();
  }

  private initDeck(): PokerCard[] {
    const suits: PokerCard['suit'][] = ['♠', '♥', '♦', '♣'];
    const rankMap: { v: string; n: number }[] = [
      { v: '2', n: 2 },
      { v: '3', n: 3 },
      { v: '4', n: 4 },
      { v: '5', n: 5 },
      { v: '6', n: 6 },
      { v: '7', n: 7 },
      { v: '8', n: 8 },
      { v: '9', n: 9 },
      { v: '10', n: 10 },
      { v: 'J', n: 11 },
      { v: 'Q', n: 12 },
      { v: 'K', n: 13 },
      { v: 'A', n: 14 },
    ];

    const cards: PokerCard[] = [];
    for (const suit of suits) {
      for (const r of rankMap) {
        cards.push({ suit, value: r.v, numericValue: r.n });
      }
    }

    // Fisher-Yates cryptographically secure shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.stage = 'PREFLOP';
    this.handNumber = 0;
    this.blindLevel = 0;
    this.buttonSeat = 0;

    // Reset stacks
    for (let i = 0; i < this.maxPlayers; i++) {
      if (this.seats[i]) {
        this.seats[i].chips = STARTING_CHIPS;
        this.seats[i].eliminated = false;
        this.seats[i].finishRank = undefined;
      }
    }

    this.startNewHand();
  }

  private getActiveSeatedPlayers(): PokerPlayerSeat[] {
    return this.seats.filter((s) => !s.eliminated && s.chips > 0);
  }

  private startNewHand() {
    this.clearAllTimers();

    const activePlayers = this.getActiveSeatedPlayers();
    if (activePlayers.length <= 1) {
      this.handleTournamentEnd();
      return;
    }

    this.handNumber += 1;

    // Blind escalation every 4 hands
    this.blindLevel = Math.min(
      BLIND_LEVELS.length - 1,
      Math.floor((this.handNumber - 1) / 4)
    );
    this.smallBlind = BLIND_LEVELS[this.blindLevel].sb;
    this.bigBlind = BLIND_LEVELS[this.blindLevel].bb;

    // Reset hand state
    this.deck = this.initDeck();
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind * 2;
    this.handWinners = undefined;
    this.stage = 'PREFLOP';
    this.playersActedThisRound.clear();
    this.lastBettorSeat = null;

    // Advance button to next active player
    if (this.handNumber > 1) {
      this.buttonSeat = this.getNextActiveSeat(this.buttonSeat);
    }

    // Reset player seat fields for this hand
    for (const seat of this.seats) {
      if (seat.eliminated) continue;
      seat.currentBet = 0;
      seat.totalInvestedThisHand = 0;
      seat.hasFolded = false;
      seat.isAllIn = false;
      seat.isTurn = false;
      seat.holeCards = [];
      seat.hasHoleCards = false;
      seat.lastAction = undefined;
      seat.handResult = undefined;
    }

    // Assign Roles (BTN, SB, BB)
    this.assignRoles(activePlayers);

    // Post Blinds
    this.postBlinds();

    // Deal 2 hole cards to each active player
    for (const seat of activePlayers) {
      seat.holeCards = [this.deck.pop()!, this.deck.pop()!];
      seat.hasHoleCards = true;
    }

    // Preflop first to act:
    // 2 players: BTN/SB acts first preflop
    // 3+ players: UTG (player to left of BB) acts first preflop
    if (activePlayers.length === 2) {
      this.activeSeat = this.smallBlindSeat;
    } else {
      this.activeSeat = this.getNextActiveSeat(this.bigBlindSeat);
    }

    this.lastBettorSeat = this.bigBlindSeat;

    this.broadcastHandStart();
    this.startActionTimer();
  }

  private assignRoles(activePlayers: PokerPlayerSeat[]) {
    for (const s of this.seats) {
      s.role = 'NORMAL';
    }

    if (activePlayers.length === 2) {
      // In Heads-Up: Button is SB, other player is BB
      this.smallBlindSeat = this.buttonSeat;
      this.bigBlindSeat = this.getNextActiveSeat(this.buttonSeat);
      this.seats[this.smallBlindSeat].role = 'SB';
      this.seats[this.bigBlindSeat].role = 'BB';
    } else {
      this.seats[this.buttonSeat].role = 'BTN';
      this.smallBlindSeat = this.getNextActiveSeat(this.buttonSeat);
      this.bigBlindSeat = this.getNextActiveSeat(this.smallBlindSeat);
      this.seats[this.smallBlindSeat].role = 'SB';
      this.seats[this.bigBlindSeat].role = 'BB';
    }
  }

  private postBlinds() {
    const sbSeat = this.seats[this.smallBlindSeat];
    const bbSeat = this.seats[this.bigBlindSeat];

    // SB
    const sbAmount = Math.min(sbSeat.chips, this.smallBlind);
    sbSeat.chips -= sbAmount;
    sbSeat.currentBet = sbAmount;
    sbSeat.totalInvestedThisHand = sbAmount;
    sbSeat.lastAction = { type: 'BLIND', amount: sbAmount, message: `SB ${sbAmount}` };
    if (sbSeat.chips === 0) sbSeat.isAllIn = true;

    // BB
    const bbAmount = Math.min(bbSeat.chips, this.bigBlind);
    bbSeat.chips -= bbAmount;
    bbSeat.currentBet = bbAmount;
    bbSeat.totalInvestedThisHand = bbAmount;
    bbSeat.lastAction = { type: 'BLIND', amount: bbAmount, message: `BB ${bbAmount}` };
    if (bbSeat.chips === 0) bbSeat.isAllIn = true;

    this.pot = sbAmount + bbAmount;
    this.sidePots = PotManager.calculatePots(this.seats);
  }

  private getNextActiveSeat(fromSeat: number): number {
    const n = this.seats.length;
    for (let step = 1; step <= n; step++) {
      const idx = (fromSeat + step) % n;
      const seat = this.seats[idx];
      if (!seat.eliminated && !seat.hasFolded && seat.chips > 0) {
        return idx;
      }
    }
    return fromSeat;
  }

  private getNextActionableSeat(fromSeat: number): number | null {
    const n = this.seats.length;
    for (let step = 1; step <= n; step++) {
      const idx = (fromSeat + step) % n;
      const seat = this.seats[idx];
      if (!seat.eliminated && !seat.hasFolded && !seat.isAllIn) {
        return idx;
      }
    }
    return null;
  }

  private startActionTimer() {
    this.clearActionTimers();
    if (this.activeSeat === null) return;

    for (let i = 0; i < this.seats.length; i++) {
      this.seats[i].isTurn = i === this.activeSeat;
    }

    this.turnTimeRemaining = ACTION_TIMEOUT_SECONDS;

    // Interval to countdown every second
    this.actionInterval = setInterval(() => {
      this.turnTimeRemaining = Math.max(0, this.turnTimeRemaining - 1);
      this.broadcast({
        type: 'POKER_CLOCK',
        seatIndex: this.activeSeat,
        secondsRemaining: this.turnTimeRemaining,
      });
    }, 1000);

    // Timeout trigger on expiry
    this.actionTimer = setTimeout(() => {
      this.handleActionTimeout();
    }, ACTION_TIMEOUT_SECONDS * 1000);

    this.broadcastState();
  }

  private clearActionTimers() {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = undefined;
    }
    if (this.actionInterval) {
      clearInterval(this.actionInterval);
      this.actionInterval = undefined;
    }
  }

  private handleActionTimeout() {
    if (this.activeSeat === null) return;
    const seat = this.seats[this.activeSeat];

    // If player can check, perform check; otherwise fold
    if (seat.currentBet === this.currentBet) {
      this.executeAction(this.activeSeat, 'check');
    } else {
      this.executeAction(this.activeSeat, 'fold');
    }
  }

  public override handleGameAction(wallet: string, data: any) {
    if (data.type === 'POKER_ACTION') {
      const seatIndex = this.seats.findIndex((s) => this.isSameWallet(s.walletAddress, wallet));
      if (seatIndex === -1 || seatIndex !== this.activeSeat) {
        return;
      }
      this.executeAction(seatIndex, data.action, data.amount);
    }
  }

  private executeAction(seatIndex: number, action: PokerActionType, rawAmount?: number) {
    this.clearActionTimers();
    const seat = this.seats[seatIndex];
    if (!seat || seat.hasFolded || seat.isAllIn) return;

    switch (action) {
      case 'fold': {
        seat.hasFolded = true;
        seat.lastAction = { type: 'FOLD', message: 'Fold' };
        break;
      }

      case 'check': {
        if (seat.currentBet < this.currentBet) {
          // Cannot check when bet is higher, treat as fold
          seat.hasFolded = true;
          seat.lastAction = { type: 'FOLD', message: 'Fold' };
        } else {
          seat.lastAction = { type: 'CHECK', message: 'Check' };
          this.playersActedThisRound.add(seatIndex);
        }
        break;
      }

      case 'call': {
        const toCall = this.currentBet - seat.currentBet;
        const callAmount = Math.min(seat.chips, toCall);
        seat.chips -= callAmount;
        seat.currentBet += callAmount;
        seat.totalInvestedThisHand += callAmount;
        this.pot += callAmount;
        if (seat.chips === 0) seat.isAllIn = true;
        seat.lastAction = { type: 'CALL', amount: callAmount, message: `Call ${callAmount}` };
        this.playersActedThisRound.add(seatIndex);
        break;
      }

      case 'bet':
      case 'raise': {
        const otherActive = this.seats.filter(
          (s) => s.seatIndex !== seatIndex && !s.eliminated && !s.hasFolded
        );
        const maxOpponentReach =
          otherActive.length > 0
            ? Math.max(...otherActive.map((s) => s.currentBet + s.chips))
            : seat.currentBet + seat.chips;

        const requested = Number(rawAmount) || this.minRaise;
        const boundedRequested = Math.min(seat.currentBet + seat.chips, Math.max(this.minRaise, requested));
        const targetBet = Math.min(boundedRequested, maxOpponentReach);
        const added = Math.min(seat.chips, targetBet - seat.currentBet);

        seat.chips -= added;
        seat.currentBet = targetBet;
        seat.totalInvestedThisHand += added;
        this.pot += added;

        if (targetBet > this.currentBet) {
          const raiseDelta = targetBet - this.currentBet;
          this.minRaise = targetBet + Math.max(this.bigBlind, raiseDelta);
          this.currentBet = targetBet;
          this.lastBettorSeat = seatIndex;
          // Re-open action for others
          this.playersActedThisRound.clear();
        }

        if (seat.chips === 0) seat.isAllIn = true;
        seat.lastAction = {
          type: action === 'bet' ? 'BET' : 'RAISE',
          amount: targetBet,
          message: `${action === 'bet' ? 'Bet' : 'Raise'} ${targetBet}`,
        };
        this.playersActedThisRound.add(seatIndex);
        break;
      }

      case 'all_in': {
        const otherActive = this.seats.filter(
          (s) => s.seatIndex !== seatIndex && !s.eliminated && !s.hasFolded
        );
        const maxOpponentReach =
          otherActive.length > 0
            ? Math.max(...otherActive.map((s) => s.currentBet + s.chips))
            : seat.currentBet + seat.chips;

        const effectiveTarget = Math.min(seat.currentBet + seat.chips, maxOpponentReach);
        const added = Math.min(seat.chips, effectiveTarget - seat.currentBet);

        seat.chips -= added;
        seat.currentBet = effectiveTarget;
        seat.totalInvestedThisHand += added;
        this.pot += added;

        if (seat.chips === 0) {
          seat.isAllIn = true;
        }

        if (effectiveTarget > this.currentBet) {
          const raiseDelta = effectiveTarget - this.currentBet;
          this.minRaise = effectiveTarget + Math.max(this.bigBlind, raiseDelta);
          this.currentBet = effectiveTarget;
          this.lastBettorSeat = seatIndex;
          this.playersActedThisRound.clear();
        }

        seat.lastAction = {
          type: 'ALL_IN',
          amount: effectiveTarget,
          message: seat.chips === 0 ? `All-In ${effectiveTarget}` : `Raise ${effectiveTarget}`,
        };
        this.playersActedThisRound.add(seatIndex);
        break;
      }
    }

    this.sidePots = PotManager.calculatePots(this.seats);

    // Check if only 1 player remains not folded
    const nonFolded = this.seats.filter((s) => !s.eliminated && !s.hasFolded);
    if (nonFolded.length === 1) {
      this.handleSingleWinner(nonFolded[0]);
      return;
    }

    // Check if betting round has ended
    if (this.isBettingRoundComplete()) {
      this.advanceStreet();
    } else {
      this.activeSeat = this.getNextActionableSeat(this.activeSeat!);
      this.startActionTimer();
    }
  }

  private isBettingRoundComplete(): boolean {
    const activeInHand = this.seats.filter((s) => !s.eliminated && !s.hasFolded);

    // If all remaining active players are all-in (or all but one are all-in and matched)
    const actionable = activeInHand.filter((s) => !s.isAllIn);
    if (actionable.length === 0) return true;
    if (actionable.length === 1 && actionable[0].currentBet === this.currentBet) {
      return true;
    }

    // Round is complete if all actionable players have acted and matched the current bet
    return actionable.every(
      (s) => this.playersActedThisRound.has(s.seatIndex) && s.currentBet === this.currentBet
    );
  }

  private advanceStreet() {
    this.clearActionTimers();

    // Reset current bets for the new street
    for (const seat of this.seats) {
      seat.currentBet = 0;
    }
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.playersActedThisRound.clear();
    this.lastBettorSeat = null;

    const actionable = this.seats.filter((s) => !s.eliminated && !s.hasFolded && !s.isAllIn);

    switch (this.stage) {
      case 'PREFLOP': {
        this.stage = 'FLOP';
        // Burn 1 card, deal 3 community cards
        this.deck.pop();
        this.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
        break;
      }
      case 'FLOP': {
        this.stage = 'TURN';
        // Burn 1 card, deal 1 community card
        this.deck.pop();
        this.communityCards.push(this.deck.pop()!);
        break;
      }
      case 'TURN': {
        this.stage = 'RIVER';
        // Burn 1 card, deal 1 community card
        this.deck.pop();
        this.communityCards.push(this.deck.pop()!);
        break;
      }
      case 'RIVER': {
        this.handleShowdown();
        return;
      }
    }

    this.broadcastState();

    // If fewer than 2 players can still take action (e.g. all-in), auto-run to next street after a suspense delay
    if (actionable.length < 2) {
      if (this.streetTimer) clearTimeout(this.streetTimer);
      this.streetTimer = setTimeout(() => {
        this.streetTimer = undefined;
        this.advanceStreet();
      }, 1600);
      return;
    }

    // Street action starts with first active player to left of button
    this.activeSeat = this.getNextActionableSeat(this.buttonSeat);
    this.startActionTimer();
  }

  private handleShowdown() {
    this.stage = 'SHOWDOWN';
    this.clearActionTimers();
    this.activeSeat = null;
    for (const s of this.seats) {
      s.isTurn = false;
    }

    const contenders = this.seats.filter((s) => !s.eliminated && !s.hasFolded);

    // Reveal cards and evaluate 7-card hand for each contender
    for (const seat of contenders) {
      const allSeven = [...(seat.holeCards || []), ...this.communityCards];
      const evaluation = evaluatePokerHand(allSeven);
      seat.handResult = {
        rankName: evaluation.rankName,
        rankNameEn: evaluation.rankNameEn,
        score: evaluation.score,
        bestFiveCards: evaluation.bestFiveCards,
      };
    }

    // Distribute main pot & side pots
    const awards = PotManager.distributePots(this.sidePots, this.seats);

    this.handWinners = awards.map((award) => {
      const seat = this.seats[award.seatIndex];
      seat.chips += award.amount;
      return {
        seatIndex: seat.seatIndex,
        username: seat.username,
        amount: award.amount,
        rankName: seat.handResult?.rankName,
        rankNameEn: seat.handResult?.rankNameEn,
        winningCards: seat.handResult?.bestFiveCards,
      };
    });

    this.broadcastShowdown();

    // Celebration pause before hand wrap-up / elimination
    if (this.finishHandTimer) clearTimeout(this.finishHandTimer);
    this.finishHandTimer = setTimeout(() => {
      this.finishHandTimer = undefined;
      this.finishHand();
    }, 4500);
  }

  private handleSingleWinner(winnerSeat: PokerPlayerSeat) {
    this.stage = 'HAND_OVER';
    this.clearActionTimers();
    this.activeSeat = null;
    for (const s of this.seats) {
      s.isTurn = false;
    }

    winnerSeat.chips += this.pot;
    this.handWinners = [
      {
        seatIndex: winnerSeat.seatIndex,
        username: winnerSeat.username,
        amount: this.pot,
      },
    ];

    this.broadcastState();

    if (this.finishHandTimer) clearTimeout(this.finishHandTimer);
    this.finishHandTimer = setTimeout(() => {
      this.finishHandTimer = undefined;
      this.finishHand();
    }, 2500);
  }

  private finishHand() {
    if (this.state !== 'GAME_ACTIVE') return;
    // Check for busted players
    for (const seat of this.seats) {
      if (!seat.eliminated && seat.chips <= 0) {
        seat.eliminated = true;
        const currentActiveCount = this.getActiveSeatedPlayers().length;
        this.eliminatedRanks.push({
          seatIndex: seat.seatIndex,
          finishRank: currentActiveCount + 1,
        });
      }
    }

    const remaining = this.getActiveSeatedPlayers();
    if (remaining.length <= 1) {
      this.handleTournamentEnd();
    } else {
      this.startNewHand();
    }
  }

  private async handleTournamentEnd() {
    this.stage = 'TOURNAMENT_OVER';
    this.state = 'MATCH_SETTLED';
    this.clearActionTimers();

    const champ = this.getActiveSeatedPlayers()[0] || this.seats[0];
    const wagerGram = Number(this.config.wagerAmountNano) / 1e9;
    const totalPrizePool = wagerGram * this.maxPlayers * 0.92; // 8% tournament fee deducted

    // Payout distribution
    // 2-3 players: Winner takes all (100%)
    // 4-5 players: 1st place 70%, 2nd place 30%
    let firstPrize = totalPrizePool;
    let secondPrize = 0;

    if (this.maxPlayers >= 4) {
      firstPrize = Number((totalPrizePool * 0.7).toFixed(2));
      secondPrize = Number((totalPrizePool * 0.3).toFixed(2));
    }

    this.tournamentWinner = {
      seatIndex: champ.seatIndex,
      username: champ.username,
      walletAddress: champ.walletAddress,
      totalPrizeGram: firstPrize,
    };

    champ.payoutGram = firstPrize;

    // Credit winner(s)
    try {
      await dbService.creditUserBalance(
        champ.walletAddress,
        firstPrize.toFixed(2),
        'MATCH_WIN',
        `1st place prize in Poker #${this.matchId}`
      );

      if (secondPrize > 0) {
        // Find 2nd place finisher
        const runnerUpEntry = this.eliminatedRanks.find((e) => e.finishRank === 2);
        if (runnerUpEntry) {
          const runnerUpSeat = this.seats[runnerUpEntry.seatIndex];
          runnerUpSeat.payoutGram = secondPrize;
          await dbService.creditUserBalance(
            runnerUpSeat.walletAddress,
            secondPrize.toFixed(2),
            'MATCH_WIN',
            `2nd place prize in Poker #${this.matchId}`
          );
        }
      }
    } catch (err) {
      console.error('[PokerRoom] Error crediting prize balances:', err);
    }

    this.winnerAddress = champ.walletAddress;
    this.winnerName = champ.username;

    this.broadcastState();

    if (this.onMatchSettledCallback) {
      try {
        await this.onMatchSettledCallback(this, champ.walletAddress);
      } catch (e) {
        console.error('[PokerRoom] Error in onMatchSettledCallback:', e);
      }
    }
  }

  public getGamePayload(recipientSeatIndex?: number): PokerState {
    this.syncSeatsFromSessions();

    // Sanitize hole cards: only include private hole cards for the recipient
    // (At SHOWDOWN, all contenders' hole cards are visible)
    const sanitizedSeats = this.seats.map((s) => {
      const showCards =
        this.stage === 'SHOWDOWN' ||
        (recipientSeatIndex !== undefined && s.seatIndex === recipientSeatIndex);

      return {
        ...s,
        holeCards: showCards ? s.holeCards : undefined,
      };
    });

    return {
      stage: this.stage,
      maxPlayers: this.maxPlayers,
      seats: sanitizedSeats,
      communityCards: this.communityCards,
      pot: this.pot,
      sidePots: this.sidePots,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      buttonSeat: this.buttonSeat,
      smallBlindSeat: this.smallBlindSeat,
      bigBlindSeat: this.bigBlindSeat,
      activeSeat: this.activeSeat,
      turnTimeLimit: ACTION_TIMEOUT_SECONDS,
      turnTimeRemaining: this.turnTimeRemaining,
      handNumber: this.handNumber,
      blindLevel: this.blindLevel,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      handWinners: this.handWinners,
      tournamentWinner: this.tournamentWinner,
    };
  }

  private broadcastState() {
    const all = this.getAllPlayerSessions();

    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      if (p.ws && p.connected && p.ws.readyState === WebSocket.OPEN) {
        this.sendTo(p.ws, {
          type: 'GAME_STATE',
          state: this.state,
          payload: this.getGamePayload(i),
        });
      }
    }

    // Broadcast to spectators (with all hole cards hidden until showdown)
    const spectatorPayload = this.getGamePayload();
    for (const spec of this.spectators.values()) {
      if (spec.ws.readyState === WebSocket.OPEN) {
        this.sendTo(spec.ws, {
          type: 'GAME_STATE',
          state: this.state,
          payload: spectatorPayload,
        });
      }
    }
  }

  private sendHoleCardsTo(seatIndex: number) {
    const all = this.getAllPlayerSessions();
    const session = all[seatIndex];
    const seat = this.seats[seatIndex];
    if (session?.ws && session.connected && seat?.holeCards) {
      this.sendTo(session.ws, {
        type: 'POKER_HOLE_CARDS',
        seatIndex,
        holeCards: seat.holeCards,
      });
    }
  }

  private broadcastHandStart() {
    this.broadcastState();

    // Send private hole cards directly to each seat
    const all = this.getAllPlayerSessions();
    for (let i = 0; i < all.length; i++) {
      this.sendHoleCardsTo(i);
    }
  }

  private broadcastShowdown() {
    // At showdown, broadcast full state with all cards revealed
    this.broadcast({
      type: 'POKER_SHOWDOWN',
      payload: this.getGamePayload(),
      handWinners: this.handWinners,
    });
  }

  public override handleDisconnect(wallet: string, ws: WebSocket, telegramId?: string) {
    const seatIdx = this.seats.findIndex((s) => this.isSameWallet(s.walletAddress, wallet));
    if (seatIdx !== -1) {
      this.seats[seatIdx].isConnected = false;
    }

    if (this.state === 'GAME_ACTIVE') {
      if (this.maxPlayers === 2) {
        // In 2-player Heads-Up: strictly activate the 15-second forfeit countdown grace period
        // Pause active turn timers while waiting for reconnection
        this.clearActionTimers();
        super.handleDisconnect(wallet, ws, telegramId);
        return;
      } else {
        // Multi-player tournament: check if only 1 connected contender remains
        const activeConnected = this.seats.filter((s) => !s.eliminated && s.isConnected);
        if (activeConnected.length <= 1) {
          this.clearActionTimers();
          super.handleDisconnect(wallet, ws, telegramId);
          return;
        }

        // Multiple players still active: let turn timer run its normal course then auto-check/fold
      }
    } else {
      super.handleDisconnect(wallet, ws, telegramId);
    }
  }

  public cleanupGameTimers(): void {
    this.clearAllTimers();
  }
}

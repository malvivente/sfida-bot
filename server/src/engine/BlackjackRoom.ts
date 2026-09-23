import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { Card, BlackjackState } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

export class BlackjackRoom extends BaseGameRoom {
  private deck: Card[] = [];
  public handA: Card[] = [];
  public handB: Card[] = [];
  public scoreA: number = 0;
  public scoreB: number = 0;
  public currentTurn: 'A' | 'B' | 'FINISHED' = 'A';
  public standA: boolean = false;
  public standB: boolean = false;
  public bustA: boolean = false;
  public bustB: boolean = false;
  public lastAction?: BlackjackState['lastAction'];

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'blackjack', onSettled);
  }

  private initDeck(): Card[] {
    const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
    const ranks = [
      { v: '2', n: 2 },
      { v: '3', n: 3 },
      { v: '4', n: 4 },
      { v: '5', n: 5 },
      { v: '6', n: 6 },
      { v: '7', n: 7 },
      { v: '8', n: 8 },
      { v: '9', n: 9 },
      { v: '10', n: 10 },
      { v: 'J', n: 10 },
      { v: 'Q', n: 10 },
      { v: 'K', n: 10 },
      { v: 'A', n: 11 },
    ];

    const cards: Card[] = [];
    for (const suit of suits) {
      for (const r of ranks) {
        cards.push({ suit, value: r.v, numericValue: r.n });
      }
    }

    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
  }

  public calculateHandScore(hand: Card[]): number {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.value === 'A') {
        aces += 1;
        total += 11;
      } else {
        total += card.numericValue;
      }
    }

    // Convert Aces from 11 to 1 if busting
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  }

  public calculateBustOdds(score: number): number {
    if (score <= 11) return 0;
    if (score >= 21) return 100;
    const diff = 21 - score;
    // Count how many cards remaining in deck would cause bust (value > diff)
    let bustingCards = 0;
    for (const card of this.deck) {
      const val = card.value === 'A' ? 1 : card.numericValue;
      if (val > diff) bustingCards++;
    }
    return this.deck.length > 0 ? Math.round((bustingCards / this.deck.length) * 100) : 0;
  }

  public getGamePayload(): BlackjackState {
    return {
      deckRemaining: this.deck.length,
      handA: this.handA,
      handB: this.handB,
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      currentTurn: this.currentTurn,
      standA: this.standA,
      standB: this.standB,
      bustA: this.bustA,
      bustB: this.bustB,
      bustOddsPercentA: this.calculateBustOdds(this.scoreA),
      bustOddsPercentB: this.calculateBustOdds(this.scoreB),
      lastAction: this.lastAction,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.deck = this.initDeck();
    this.handA = [];
    this.handB = [];
    this.standA = false;
    this.standB = false;
    this.bustA = false;
    this.bustB = false;
    this.currentTurn = 'A';
    this.lastAction = undefined;

    // Deal 2 face-up cards to each player
    this.handA.push(this.deck.pop()!);
    this.handB.push(this.deck.pop()!);
    this.handA.push(this.deck.pop()!);
    this.handB.push(this.deck.pop()!);

    this.scoreA = this.calculateHandScore(this.handA);
    this.scoreB = this.calculateHandScore(this.handB);

    this.broadcast({
      type: 'BLACKJACK_START',
      message: `Face-Up cards dealt! ${this.playerA.username}: ${this.scoreA} | ${this.playerB?.username || 'Player B'}: ${this.scoreB}. ${this.playerA.username}'s turn to Hit or Stand.`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private startTurnTimer() {
    if (this.turnTimeout) clearTimeout(this.turnTimeout);

    this.turnTimeout = setTimeout(() => {
      // Auto-stand on timeout
      console.log(`[Blackjack] Match #${this.matchId}: Player ${this.currentTurn} timed out. Auto-stand.`);
      const activeWallet = this.currentTurn === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.handleBlackjackAction(activeWallet, 'STAND');
    }, GAMES_CONFIG.blackjack.turnTimeoutSeconds * 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    const action = data.action || data.choice;
    if (data.type === 'BLACKJACK_ACTION' && (action === 'HIT' || action === 'STAND')) {
      this.handleBlackjackAction(wallet, action);
    }
  }

  public handleBlackjackAction(wallet: string, action: 'HIT' | 'STAND') {
    if (this.state !== 'GAME_ACTIVE' || this.currentTurn === 'FINISHED') return;

    const side = this.isSameWallet(wallet, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);
    if (!side || side !== this.currentTurn) {
      console.warn(`[Blackjack] Action from ${wallet} ignored: not active turn (${this.currentTurn}).`);
      return;
    }

    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    const playerName = side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    if (action === 'HIT') {
      const drawn = this.deck.pop() || { suit: '♠', value: '10', numericValue: 10 };
      if (side === 'A') {
        this.handA.push(drawn);
        this.scoreA = this.calculateHandScore(this.handA);
        if (this.scoreA > 21) {
          this.bustA = true;
          this.currentTurn = 'B';
          this.lastAction = {
            player: 'A',
            action: 'HIT',
            cardDrawn: drawn,
            message: `💥 ${playerName} drew ${drawn.value}${drawn.suit} and BUSTED with ${this.scoreA}! Turn switches to Player B.`,
          };
        } else {
          this.lastAction = {
            player: 'A',
            action: 'HIT',
            cardDrawn: drawn,
            message: `🃏 ${playerName} drew ${drawn.value}${drawn.suit} (Total: ${this.scoreA}). Hit again or Stand?`,
          };
        }
      } else {
        this.handB.push(drawn);
        this.scoreB = this.calculateHandScore(this.handB);
        if (this.scoreB > 21) {
          this.bustB = true;
          this.currentTurn = 'FINISHED';
          this.lastAction = {
            player: 'B',
            action: 'HIT',
            cardDrawn: drawn,
            message: `💥 ${playerName} drew ${drawn.value}${drawn.suit} and BUSTED with ${this.scoreB}!`,
          };
        } else {
          this.lastAction = {
            player: 'B',
            action: 'HIT',
            cardDrawn: drawn,
            message: `🃏 ${playerName} drew ${drawn.value}${drawn.suit} (Total: ${this.scoreB}). Hit again or Stand?`,
          };
        }
      }
    } else {
      // STAND
      if (side === 'A') {
        this.standA = true;
        this.currentTurn = 'B';
        this.lastAction = {
          player: 'A',
          action: 'STAND',
          message: `🛑 ${playerName} stands on ${this.scoreA}. Turn passes to Player B!`,
        };
      } else {
        this.standB = true;
        this.currentTurn = 'FINISHED';
        this.lastAction = {
          player: 'B',
          action: 'STAND',
          message: `🛑 ${playerName} stands on ${this.scoreB}. Showdown!`,
        };
      }
    }

    this.broadcast({
      type: 'BLACKJACK_UPDATE',
      lastAction: this.lastAction,
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();

    // Check if game has concluded
    if (this.currentTurn === 'FINISHED' || (this.bustA && this.bustB)) {
      this.evaluateShowdown();
    } else if (this.currentTurn === 'B' && this.bustA) {
      // If Player A busted, Player B automatically wins if they stand or already have <= 21!
      // Player B gets their turn to play or can win immediately
      this.startTurnTimer();
    } else {
      this.startTurnTimer();
    }
  }

  private evaluateShowdown() {
    this.cleanupGameTimers();

    const walletA = this.playerA.walletAddress;
    const walletB = this.playerB?.walletAddress || '';

    let winnerWallet = '';
    let winReason = '';

    if (this.bustA && !this.bustB) {
      winnerWallet = walletB;
      winReason = `${this.playerB?.username} wins because ${this.playerA.username} busted!`;
    } else if (!this.bustA && this.bustB) {
      winnerWallet = walletA;
      winReason = `${this.playerA.username} wins because ${this.playerB?.username} busted!`;
    } else if (this.bustA && this.bustB) {
      // Both busted: lower score wins or sudden death card
      if (this.scoreA < this.scoreB) {
        winnerWallet = walletA;
        winReason = `Both players busted, but ${this.playerA.username} was closer with ${this.scoreA} vs ${this.scoreB}!`;
      } else {
        winnerWallet = walletB;
        winReason = `Both players busted, but ${this.playerB?.username} was closer with ${this.scoreB} vs ${this.scoreA}!`;
      }
    } else {
      // Neither busted: closest to 21
      if (this.scoreA > this.scoreB) {
        winnerWallet = walletA;
        winReason = `${this.playerA.username} wins with ${this.scoreA} against ${this.scoreB}!`;
      } else if (this.scoreB > this.scoreA) {
        winnerWallet = walletB;
        winReason = `${this.playerB?.username} wins with ${this.scoreB} against ${this.scoreA}!`;
      } else {
        // Exact Tie! Sudden death tiebreaker card closest to 10
        const cardA = this.deck.pop() || { suit: '♠', value: '10', numericValue: 10 };
        const cardB = this.deck.pop() || { suit: '♥', value: '9', numericValue: 9 };
        if (cardA.numericValue >= cardB.numericValue) {
          winnerWallet = walletA;
          winReason = `Tie on ${this.scoreA}! Tie-breaker card: ${this.playerA.username} drew ${cardA.value}${cardA.suit} vs ${cardB.value}${cardB.suit}!`;
        } else {
          winnerWallet = walletB;
          winReason = `Tie on ${this.scoreB}! Tie-breaker card: ${this.playerB?.username} drew ${cardB.value}${cardB.suit} vs ${cardA.value}${cardA.suit}!`;
        }
      }
    }

    console.log(`[Blackjack] Match #${this.matchId} outcome: ${winReason}`);
    this.settleMatch(winnerWallet);
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }
}

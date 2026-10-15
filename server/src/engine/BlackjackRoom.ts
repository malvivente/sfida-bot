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
  public firstTurnPlayer: 'A' | 'B' = 'A';
  public standA: boolean = false;
  public standB: boolean = false;
  public bustA: boolean = false;
  public bustB: boolean = false;
  public isDeathMatch: boolean = false;
  public deathMatchRound: number = 0;
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
      isDeathMatch: this.isDeathMatch,
      deathMatchRound: this.deathMatchRound,
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
    // Coin toss determines who gets the first turn
    this.firstTurnPlayer = Math.random() < 0.5 ? 'A' : 'B';
    this.currentTurn = this.firstTurnPlayer;
    this.lastAction = undefined;

    // Deal 2 face-up cards to each player
    this.handA.push(this.deck.pop()!);
    this.handB.push(this.deck.pop()!);
    this.handA.push(this.deck.pop()!);
    this.handB.push(this.deck.pop()!);

    this.scoreA = this.calculateHandScore(this.handA);
    this.scoreB = this.calculateHandScore(this.handB);
    // Check if any player was dealt 21 immediately
    if (this.scoreA === 21 && this.scoreB === 21) {
      this.standA = true;
      this.standB = true;
      this.currentTurn = 'FINISHED';
      this.lastAction = {
        player: 'A',
        action: 'STAND',
        message: `🔥 Entrambi hanno servito 21 alla distribuzione! Parità assoluta!`,
      };
    } else if (this.scoreA === 21) {
      this.standA = true;
      this.currentTurn = 'B';
      this.lastAction = {
        player: 'A',
        action: 'STAND',
        message: `🔥 ${this.playerA.username} ha servito 21! Turno a ${this.playerB?.username || 'Player B'} per tentare di pareggiare!`,
      };
    } else if (this.scoreB === 21) {
      this.standB = true;
      this.currentTurn = 'A';
      this.lastAction = {
        player: 'B',
        action: 'STAND',
        message: `🔥 ${this.playerB?.username || 'Player B'} ha servito 21! Turno a ${this.playerA.username} per tentare di pareggiare!`,
      };
    }

    const firstPlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    this.broadcast({
      type: 'BLACKJACK_START',
      message: `🪙 Coin Toss: ${firstPlayerName} gioca per primo! ${this.playerA.username}: ${this.scoreA} | ${this.playerB?.username || 'Player B'}: ${this.scoreB}.`,
      gameData: this.getGamePayload(),
    });

    if (this.currentTurn === 'FINISHED') {
      setTimeout(() => {
        this.evaluateShowdown();
      }, 1200);
    } else {
      this.startTurnTimer();
    }
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

    const opponentSide: 'A' | 'B' = side === 'A' ? 'B' : 'A';
    const opponentStand = side === 'A' ? this.standB : this.standA;
    const opponentBust = side === 'A' ? this.bustB : this.bustA;
    const playerName = side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');
    const opponentName = side === 'A' ? (this.playerB?.username || 'Player B') : this.playerA.username;

    if (action === 'HIT') {
      const drawn = this.deck.pop() || { suit: '♠', value: '10', numericValue: 10 };
      if (side === 'A') {
        this.handA.push(drawn);
        this.scoreA = this.calculateHandScore(this.handA);
      } else {
        this.handB.push(drawn);
        this.scoreB = this.calculateHandScore(this.handB);
      }
      const myScore = side === 'A' ? this.scoreA : this.scoreB;

      if (myScore > 21) {
        if (side === 'A') this.bustA = true;
        else this.bustB = true;

        if (opponentStand || opponentBust) {
          this.currentTurn = 'FINISHED';
          this.lastAction = {
            player: side,
            action: 'HIT',
            cardDrawn: drawn,
            message: `💥 ${playerName} ha pescato ${drawn.value}${drawn.suit} e SBALLATO con ${myScore}! Showdown!`,
          };
        } else {
          this.currentTurn = opponentSide;
          this.lastAction = {
            player: side,
            action: 'HIT',
            cardDrawn: drawn,
            message: `💥 ${playerName} ha pescato ${drawn.value}${drawn.suit} e SBALLATO con ${myScore}! Turno passa a ${opponentName}.`,
          };
        }
      } else if (myScore === 21) {
        if (side === 'A') this.standA = true;
        else this.standB = true;

        if (opponentStand || opponentBust) {
          this.currentTurn = 'FINISHED';
          this.lastAction = {
            player: side,
            action: 'STAND',
            cardDrawn: drawn,
            message: `🔥 ${playerName} ha pescato ${drawn.value}${drawn.suit} e raggiunto 21! Entrambi conclusi, Showdown!`,
          };
        } else {
          this.currentTurn = opponentSide;
          this.lastAction = {
            player: side,
            action: 'STAND',
            cardDrawn: drawn,
            message: `🔥 ${playerName} ha pescato ${drawn.value}${drawn.suit} e raggiunto 21! Turno passa a ${opponentName}!`,
          };
        }
      } else {
        // Score < 21
        if (opponentStand) {
          // Opponent has already stood: turn stays with current player
          this.currentTurn = side;
          this.lastAction = {
            player: side,
            action: 'HIT',
            cardDrawn: drawn,
            message: `🃏 ${playerName} ha pescato ${drawn.value}${drawn.suit} (Totale: ${myScore}). ${opponentName} è fermo: Carta o Stai?`,
          };
        } else {
          // Opponent has not stood: alternate turn to opponent!
          this.currentTurn = opponentSide;
          this.lastAction = {
            player: side,
            action: 'HIT',
            cardDrawn: drawn,
            message: `🃏 ${playerName} ha pescato ${drawn.value}${drawn.suit} (Totale: ${myScore}). Turno passa a ${opponentName}!`,
          };
        }
      }
    } else {
      // STAND
      if (side === 'A') this.standA = true;
      else this.standB = true;
      const myScore = side === 'A' ? this.scoreA : this.scoreB;

      if (opponentStand || opponentBust) {
        this.currentTurn = 'FINISHED';
        this.lastAction = {
          player: side,
          action: 'STAND',
          message: `🛑 ${playerName} sta su ${myScore}. Entrambi hanno concluso, resa dei conti!`,
        };
      } else {
        this.currentTurn = opponentSide;
        this.lastAction = {
          player: side,
          action: 'STAND',
          message: `🛑 ${playerName} sta su ${myScore}. Turno passa a ${opponentName}!`,
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
    if (this.currentTurn === 'FINISHED') {
      setTimeout(() => {
        this.evaluateShowdown();
      }, 1200);
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

    const isTie = (this.bustA && this.bustB) || (!this.bustA && !this.bustB && this.scoreA === this.scoreB);

    if (isTie) {
      this.isDeathMatch = true;
      this.deathMatchRound = (this.deathMatchRound || 0) + 1;
      const tieReason = this.bustA && this.bustB
        ? `Entrambi i giocatori hanno sballato (${this.scoreA} vs ${this.scoreB})!`
        : `Punteggio identico (${this.scoreA} a ${this.scoreB})!`;
      
      const deathMatchMsg = `💀 PARITÀ! ${tieReason} Inizia il DEATH MATCH (Round ${this.deathMatchRound})!`;
      console.log(`[Blackjack] Match #${this.matchId}: ${deathMatchMsg}`);

      this.lastAction = {
        player: 'A',
        action: 'STAND',
        message: deathMatchMsg,
      };

      this.broadcast({
        type: 'BLACKJACK_TIE',
        message: deathMatchMsg,
        isDeathMatch: true,
        deathMatchRound: this.deathMatchRound,
        gameData: this.getGamePayload(),
      });
      this.broadcastRoomState();

      // Start Death Match Round after 2.5 seconds
      setTimeout(() => {
        this.startDeathMatchRound();
      }, 2500);
      return;
    }

    if (this.bustA && !this.bustB) {
      winnerWallet = walletB;
      winReason = `${this.playerB?.username} vince perché ${this.playerA.username} ha sballato!`;
    } else if (!this.bustA && this.bustB) {
      winnerWallet = walletA;
      winReason = `${this.playerA.username} vince perché ${this.playerB?.username} ha sballato!`;
    } else if (this.scoreA > this.scoreB) {
      winnerWallet = walletA;
      winReason = `${this.playerA.username} vince con ${this.scoreA} contro ${this.scoreB}!`;
    } else {
      winnerWallet = walletB;
      winReason = `${this.playerB?.username} vince con ${this.scoreB} contro ${this.scoreA}!`;
    }

    console.log(`[Blackjack] Match #${this.matchId} outcome: ${winReason}`);
    this.settleMatch(winnerWallet);
  }

  private startDeathMatchRound() {
    this.cleanupGameTimers();

    // Check if deck has enough cards for a new round (at least 15 cards)
    if (this.deck.length < 15) {
      this.deck = this.initDeck();
    }

    this.handA = [];
    this.handB = [];
    this.standA = false;
    this.standB = false;
    this.bustA = false;
    this.bustB = false;

    // Coin toss for who plays first in this death match round
    this.firstTurnPlayer = Math.random() < 0.5 ? 'A' : 'B';
    this.currentTurn = this.firstTurnPlayer;
    const firstPlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    // Deal 2 face-up cards to each player
    this.handA.push(this.deck.pop()!);
    this.handB.push(this.deck.pop()!);
    this.handA.push(this.deck.pop()!);
    this.handB.push(this.deck.pop()!);

    this.scoreA = this.calculateHandScore(this.handA);
    this.scoreB = this.calculateHandScore(this.handB);

    // Check if first player was dealt 21 immediately in Death Match
    const firstScore = this.firstTurnPlayer === 'A' ? this.scoreA : this.scoreB;
    if (firstScore === 21) {
      if (this.firstTurnPlayer === 'A') this.standA = true;
      else this.standB = true;
      const secondTurn = this.firstTurnPlayer === 'A' ? 'B' : 'A';
      this.currentTurn = secondTurn;
    }

    const roundMsg = `⚔️ DEATH MATCH R${this.deathMatchRound}: Turno a ${firstPlayerName}! ${this.playerA.username}: ${this.scoreA} | ${this.playerB?.username || 'Player B'}: ${this.scoreB}`;

    this.lastAction = {
      player: this.currentTurn,
      action: 'HIT',
      message: roundMsg,
    };

    this.broadcast({
      type: 'BLACKJACK_ROUND_START',
      message: roundMsg,
      isDeathMatch: true,
      deathMatchRound: this.deathMatchRound,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private getCardRank(value: string): number {
    if (value === 'A') return 14;
    if (value === 'K') return 13;
    if (value === 'Q') return 12;
    if (value === 'J') return 11;
    return parseInt(value, 10) || 10;
  }

  private getSuitRank(suit: string): number {
    if (suit === '♠') return 4;
    if (suit === '♥') return 3;
    if (suit === '♦') return 2;
    return 1; // ♣
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }

  public override resetForRematch() {
    this.deck = [];
    this.handA = [];
    this.handB = [];
    this.scoreA = 0;
    this.scoreB = 0;
    this.standA = false;
    this.standB = false;
    this.bustA = false;
    this.bustB = false;
    this.lastAction = undefined;
    this.cleanupGameTimers();
  }
}

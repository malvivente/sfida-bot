import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { UnoState, UnoCard, UnoColor, UnoCardType, CoinTossData } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const COLORS: UnoColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

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
  public drawPile: UnoCard[] = [];
  public discardPile: UnoCard[] = [];
  public handA: UnoCard[] = [];
  public handB: UnoCard[] = [];
  public currentColor: UnoColor = 'RED';
  public currentTurn: 'A' | 'B' = 'A';
  public unoCalledA: boolean = false;
  public unoCalledB: boolean = false;
  public lastAction?: UnoState['lastAction'];
  public coinToss?: CoinTossData;

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'uno', onSettled);
  }

  public getGamePayload(): UnoState {
    const topCard = this.discardPile[this.discardPile.length - 1] || {
      id: 'default',
      color: 'RED',
      type: '7',
      value: 7,
    };

    return {
      currentTurn: this.currentTurn,
      discardPileTop: topCard,
      currentColor: this.currentColor,
      drawPileCount: this.drawPile.length,
      handA: this.handA,
      handB: this.handB,
      handCountA: this.handA.length,
      handCountB: this.handB.length,
      unoCalledA: this.unoCalledA,
      unoCalledB: this.unoCalledB,
      lastAction: this.lastAction,
      coinToss: this.coinToss,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.drawPile = generateUnoDeck();
    this.discardPile = [];
    this.handA = [];
    this.handB = [];
    this.unoCalledA = false;
    this.unoCalledB = false;
    this.lastAction = undefined;

    // Deal 7 cards to each
    for (let i = 0; i < 7; i++) {
      if (this.drawPile.length > 0) this.handA.push(this.drawPile.pop()!);
      if (this.drawPile.length > 0) this.handB.push(this.drawPile.pop()!);
    }

    // Top card on discard
    let firstCard = this.drawPile.pop()!;
    // Ensure first card is not a wild +4 to start cleanly
    while (firstCard.type === 'WILD_DRAW4' && this.drawPile.length > 0) {
      this.drawPile.unshift(firstCard);
      firstCard = this.drawPile.pop()!;
    }
    this.discardPile.push(firstCard);
    this.currentColor = firstCard.color === 'WILD' ? 'RED' : firstCard.color;

    // Random starter via coin toss
    this.currentTurn = Math.random() > 0.5 ? 'A' : 'B';
    const activePlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    this.coinToss = {
      playerASide: 'HEADS',
      playerBSide: 'TAILS',
      winningFace: this.currentTurn === 'A' ? 'HEADS' : 'TAILS',
      starterSide: this.currentTurn,
      starterName: activePlayerName,
      timestamp: Date.now(),
    };

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
      console.log(`[UNO] Match #${this.matchId}: Player ${this.currentTurn} timed out. Auto-drawing.`);
      this.handleAutoTimeout();
    }, timeoutSec * 1000 + (this.discardPile.length <= 1 ? 3000 : 0));
  }

  private reshuffleIfNeeded() {
    if (this.drawPile.length === 0 && this.discardPile.length > 1) {
      const top = this.discardPile.pop()!;
      this.drawPile = this.discardPile;
      this.discardPile = [top];
      // Shuffle
      for (let i = this.drawPile.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
      }
    }
  }

  private handleAutoTimeout() {
    if (this.state !== 'GAME_ACTIVE') return;

    this.reshuffleIfNeeded();
    const currentHand = this.currentTurn === 'A' ? this.handA : this.handB;
    if (this.drawPile.length > 0) {
      currentHand.push(this.drawPile.pop()!);
    }

    const side = this.currentTurn;
    const opponent = side === 'A' ? 'B' : 'A';
    this.lastAction = {
      player: side,
      type: 'DRAW',
      message: `Tempo scaduto per ${side === 'A' ? this.playerA.username : this.playerB?.username}! Carta pescata automaticamente.`,
    };

    this.currentTurn = opponent;
    this.startTurnTimer();
    this.broadcastRoomState();
  }

  public handleGameAction(wallet: string, data: any) {
    if (this.state !== 'GAME_ACTIVE') return;

    const side = this.isSameWallet(wallet, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);
    if (!side || side !== this.currentTurn) {
      console.warn(`[UNO] Action attempted by ${wallet} but not their turn (${this.currentTurn}).`);
      return;
    }

    if (data.type === 'UNO_PLAY_CARD') {
      this.handlePlayCard(side, data.cardIndex, data.chosenColor);
    } else if (data.type === 'UNO_DRAW_CARD') {
      this.handleDrawCard(side);
    }
  }

  private handlePlayCard(side: 'A' | 'B', cardIndex: number, chosenColor?: UnoColor) {
    const hand = side === 'A' ? this.handA : this.handB;
    if (cardIndex < 0 || cardIndex >= hand.length) return;

    const card = hand[cardIndex];
    const topCard = this.discardPile[this.discardPile.length - 1];

    // Check validity
    const isColorMatch = card.color === this.currentColor;
    const isTypeMatch = card.type === topCard.type;
    const isWild = card.color === 'WILD';

    if (!isColorMatch && !isTypeMatch && !isWild) {
      console.warn(`[UNO] Card cannot be played: ${card.color} ${card.type} on ${this.currentColor} ${topCard.type}`);
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

    const opponentSide = side === 'A' ? 'B' : 'A';
    const opponentHand = opponentSide === 'A' ? this.handA : this.handB;

    let message = `${side === 'A' ? this.playerA.username : this.playerB?.username} gioca ${card.color} ${card.type}`;

    // Handle special effects
    let extraTurn = false;
    if (card.type === 'SKIP' || card.type === 'REVERSE') {
      extraTurn = true;
      message += `! Turno saltato per l'avversario!`;
    } else if (card.type === 'DRAW2') {
      this.reshuffleIfNeeded();
      for (let i = 0; i < 2; i++) {
        if (this.drawPile.length > 0) opponentHand.push(this.drawPile.pop()!);
      }
      extraTurn = true;
      message += `! L'avversario pesca 2 carte e salta il turno!`;
    } else if (card.type === 'WILD_DRAW4') {
      this.reshuffleIfNeeded();
      for (let i = 0; i < 4; i++) {
        if (this.drawPile.length > 0) opponentHand.push(this.drawPile.pop()!);
      }
      extraTurn = true;
      message += `! L'avversario pesca 4 carte e il colore diventa ${this.currentColor}!`;
    } else if (isWild) {
      message += `! Il colore scelto è ${this.currentColor}!`;
    }

    // Check UNO shout
    if (hand.length === 1) {
      if (side === 'A') this.unoCalledA = true;
      else this.unoCalledB = true;
      message += ` 📢 UNO!`;
    }

    this.lastAction = {
      player: side,
      type: 'PLAY',
      card,
      message,
    };

    // Check Victory
    if (hand.length === 0) {
      const winnerWallet = side === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.broadcastRoomState();
      this.settleMatch(winnerWallet);
      return;
    }

    // Next turn
    if (!extraTurn) {
      this.currentTurn = opponentSide;
    }

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private handleDrawCard(side: 'A' | 'B') {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    this.reshuffleIfNeeded();
    const hand = side === 'A' ? this.handA : this.handB;
    if (this.drawPile.length > 0) {
      hand.push(this.drawPile.pop()!);
    }

    const opponentSide = side === 'A' ? 'B' : 'A';
    this.lastAction = {
      player: side,
      type: 'DRAW',
      message: `${side === 'A' ? this.playerA.username : this.playerB?.username} pesca una carta dal mazzo.`,
    };

    // Pass turn to opponent
    this.currentTurn = opponentSide;
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
  }
}

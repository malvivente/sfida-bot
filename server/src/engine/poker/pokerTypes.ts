export interface PokerCard {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  numericValue: number; // 2-14 (Ace = 14)
}

export type PokerStage =
  | 'WAITING'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'HAND_OVER'
  | 'TOURNAMENT_OVER';

export type PokerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export enum HandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

export interface HandEvaluation {
  rank: HandRank;
  score: number; // For tie-breaking
  rankName: string;
  rankNameEn: string;
  bestFiveCards: PokerCard[];
}

export interface PokerPlayerSeat {
  seatIndex: number;
  walletAddress: string;
  telegramId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  chips: number;
  currentBet: number;
  totalInvestedThisHand: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  isReady: boolean;
  isTurn: boolean;
  role: 'BTN' | 'SB' | 'BB' | 'NORMAL';
  holeCards?: PokerCard[]; // Sent only to this player during hand, broadcast at showdown if not folded
  hasHoleCards?: boolean; // Visible to everyone else
  lastAction?: {
    type: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN' | 'BLIND';
    amount?: number;
    message?: string;
  };
  handResult?: {
    rankName: string;
    score: number;
    bestFiveCards: PokerCard[];
  };
  eliminated?: boolean;
  payoutGram?: number;
  finishRank?: number;
}

export interface PokerPot {
  amount: number;
  eligibleSeats: number[];
}

export interface PokerState {
  stage: PokerStage;
  maxPlayers: number;
  seats: PokerPlayerSeat[];
  communityCards: PokerCard[];
  pot: number;
  sidePots: PokerPot[];
  currentBet: number;
  minRaise: number;
  buttonSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  activeSeat: number | null;
  turnTimeLimit: number;
  turnTimeRemaining: number;
  handNumber: number;
  blindLevel: number;
  smallBlind: number;
  bigBlind: number;
  handWinners?: {
    seatIndex: number;
    username: string;
    amount: number;
    rankName?: string;
    winningCards?: PokerCard[];
  }[];
  tournamentWinner?: {
    seatIndex: number;
    username: string;
    walletAddress: string;
    totalPrizeGram: number;
  };
}

export type RoomState =
  | 'WAITING_FOR_DEPLOY'
  | 'LOBBY'
  | 'BETTING_WINDOW'
  | 'ROUND_START'
  | 'WAITING_FOR_SIGNAL'
  | 'SIGNAL_FIRED'
  | 'ROUND_END'
  | 'MATCH_SETTLED'
  | 'FORFEITED';

export interface PlayerInfo {
  wallet: string;
  name: string;
  ready: boolean;
  score: number;
  connected?: boolean;
  telegramUserId?: string;
}

export interface MatchResolution {
  matchId: string;
  escrowAddress: string;
  winner: string;
  timestamp: number;
  signatureHex: string;
  signatureCellBoc: string;
}

export interface MatchData {
  matchId: string;
  escrowAddress?: string;
  state: RoomState;
  currentRound: number;
  winnerAddress?: string;
  winnerName?: string;
  resolution?: MatchResolution;
  playerA: PlayerInfo;
  playerB: PlayerInfo | null;
  wagerAmountNano: string;
  totalBetsA: string;
  totalBetsB: string;
  oddsA: number;
  oddsB: number;
  distributablePoolNano?: string;
  spectatorCount?: number;
}

export interface WsMessage {
  type: string;
  matchId?: string;
  role?: string;
  state?: RoomState;
  currentRound?: number;
  scoreA?: number;
  scoreB?: number;
  oddsA?: number;
  oddsB?: number;
  totalBetsA?: string;
  totalBetsB?: string;
  signal?: string;
  message?: string;
  reactionTimeMs?: number;
  winnerAddress?: string;
  winnerName?: string;
  winnerSide?: 'A' | 'B';
  bestReactionPlayerA?: number;
  bestReactionPlayerB?: number;
  resolution?: MatchResolution;
  offender?: string;
  secondsLeft?: number;
  durationSeconds?: number;
  round?: number;
  gracePeriodSeconds?: number;
  side?: 'A' | 'B';
  playerAName?: string;
  playerBName?: string;
  playerA?: any;
  playerB?: any;
  wagerTon?: string;
  proposerWallet?: string;
  proposerName?: string;
  newWagerTon?: string;
}

export interface RematchOffer {
  proposerWallet: string;
  proposerName: string;
  newWagerTon: string;
}

export interface UserBalance {
  walletAddress: string;
  balanceNano: string;
  balanceTon: string;
  balanceGram: string;
  depositedTotalTon: string;
  depositedTotalGram: string;
  withdrawnTotalTon: string;
  withdrawnTotalGram: string;
}

export interface DuelHistoryRecord {
  matchId: string;
  timestamp: number;
  opponentName: string;
  opponentWallet?: string;
  wagerTon: string;
  wagerGram?: string;
  payoutTon: string;
  payoutGram?: string;
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  reactionTimeMs?: number;
  score: string;
}

export interface UserStats {
  duelsPlayed: number;
  duelsWon: number;
  winRate: number;
  bestReaction: string;
  totalProfitsTon: string;
  totalProfitsGram?: string;
}

export interface FeeConfig {
  currency: string;
  creationFeeGram: number;
  duelRakePercent: number;
  spectatorRakePercent: number;
  minWagerGram: number;
  maxWagerGram: number;
  minDepositGram: number;
  minWithdrawGram: number;
  presetsWagerGram: string[];
}


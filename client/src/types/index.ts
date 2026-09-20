export type RoomState =
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
  resolution?: MatchResolution;
  offender?: string;
  secondsLeft?: number;
  durationSeconds?: number;
  round?: number;
  gracePeriodSeconds?: number;
  side?: 'A' | 'B';
}

export interface DuelHistoryRecord {
  matchId: string;
  timestamp: number;
  opponentName: string;
  opponentWallet?: string;
  wagerTon: string;
  payoutTon: string;
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  reactionTimeMs?: number;
  score: string;
}

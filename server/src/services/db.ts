import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredMatch {
  matchId: string;
  escrowAddress?: string;
  wagerAmountNano: string;
  wagerTon: string;
  playerAAddress: string;
  playerAName: string;
  playerBAddress?: string;
  playerBName?: string;
  winnerAddress?: string;
  winnerName?: string;
  scoreA: number;
  scoreB: number;
  bestReactionPlayerA?: number;
  bestReactionPlayerB?: number;
  settledAt: number;
  createdAt: number;
}

export interface UserMatchHistoryRecord {
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

export interface UserStats {
  duelsPlayed: number;
  duelsWon: number;
  winRate: number;
  bestReaction: string;
  totalProfitsTon: string;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private matches: Map<string, StoredMatch> = new Map();
  private dataDir: string;
  private filePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.dataDir = path.resolve(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'matches.json');
    this.loadData();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private loadData() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: StoredMatch[] = JSON.parse(raw);
        for (const m of list) {
          this.matches.set(m.matchId, m);
        }
        console.log(`[DatabaseService] Loaded ${this.matches.size} matches from persistent storage.`);
      } else {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      }
      this.initialized = true;
    } catch (err) {
      console.warn('[DatabaseService] Warning loading database file:', err);
    }
  }

  private persistData() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const list = Array.from(this.matches.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist matches to file:', err);
    }
  }

  public async saveMatch(record: StoredMatch): Promise<void> {
    this.matches.set(record.matchId, record);
    this.persistData();
    console.log(`[DatabaseService] Persisted match #${record.matchId} (Winner: ${record.winnerName || record.winnerAddress})`);
  }

  public async getMatch(matchId: string): Promise<StoredMatch | null> {
    return this.matches.get(matchId) || null;
  }

  public async getUserHistory(walletAddress: string): Promise<UserMatchHistoryRecord[]> {
    const target = walletAddress.toLowerCase();
    const result: UserMatchHistoryRecord[] = [];

    const sorted = Array.from(this.matches.values()).sort((a, b) => b.settledAt - a.settledAt);

    for (const m of sorted) {
      const isPlayerA = m.playerAAddress.toLowerCase() === target;
      const isPlayerB = m.playerBAddress && m.playerBAddress.toLowerCase() === target;

      if (!isPlayerA && !isPlayerB) continue;

      const isWinner = m.winnerAddress && m.winnerAddress.toLowerCase() === target;
      const outcome: 'WIN' | 'LOSS' | 'DRAW' = isWinner ? 'WIN' : 'LOSS';
      const wagerTon = m.wagerTon || (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
      const payoutTon = isWinner ? (parseFloat(wagerTon) * 2 * 0.96).toFixed(2) : '0.00';

      const opponentName = isPlayerA ? (m.playerBName || 'Player B') : m.playerAName;
      const opponentWallet = isPlayerA ? m.playerBAddress : m.playerAAddress;
      const myReaction = isPlayerA ? m.bestReactionPlayerA : m.bestReactionPlayerB;
      const myScore = isPlayerA ? m.scoreA : m.scoreB;
      const oppScore = isPlayerA ? m.scoreB : m.scoreA;

      result.push({
        matchId: m.matchId,
        timestamp: m.settledAt,
        opponentName,
        opponentWallet,
        wagerTon,
        payoutTon,
        outcome,
        reactionTimeMs: myReaction,
        score: `${myScore} - ${oppScore}`,
      });
    }

    return result;
  }

  public async getUserStats(walletAddress: string): Promise<UserStats> {
    const history = await this.getUserHistory(walletAddress);
    const duelsPlayed = history.length;
    const duelsWon = history.filter((h) => h.outcome === 'WIN').length;
    const winRate = duelsPlayed > 0 ? Math.round((duelsWon / duelsPlayed) * 100) : 0;

    const validReactions = history
      .map((h) => h.reactionTimeMs)
      .filter((ms): ms is number => typeof ms === 'number' && ms > 0);

    const bestReaction = validReactions.length > 0 ? `${Math.min(...validReactions)}` : '-';

    const totalProfitsTon = history
      .reduce((acc, h) => {
        if (h.outcome === 'WIN') {
          const p = parseFloat(h.payoutTon);
          return acc + (isNaN(p) ? 0 : p);
        }
        return acc;
      }, 0)
      .toFixed(2);

    return {
      duelsPlayed,
      duelsWon,
      winRate,
      bestReaction,
      totalProfitsTon,
    };
  }
}

export const dbService = DatabaseService.getInstance();

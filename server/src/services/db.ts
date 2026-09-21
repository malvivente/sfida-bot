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

export interface UserAccount {
  walletAddress: string;
  telegramId?: string;
  username?: string;
  balanceNano: string;
  balanceTon: string;
  depositedTotalTon: string;
  withdrawnTotalTon: string;
  updatedAt: number;
}

export interface BalanceTransaction {
  id: string;
  walletAddress: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'MATCH_WIN' | 'MATCH_BET' | 'REMATCH_BET';
  amountNano: string;
  amountTon: string;
  timestamp: number;
  details?: string;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private matches: Map<string, StoredMatch> = new Map();
  private users: Map<string, UserAccount> = new Map();
  private transactions: BalanceTransaction[] = [];
  private dataDir: string;
  private filePath: string;
  private usersFilePath: string;
  private txFilePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.dataDir = path.resolve(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'matches.json');
    this.usersFilePath = path.join(this.dataDir, 'users.json');
    this.txFilePath = path.join(this.dataDir, 'transactions.json');
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

      if (fs.existsSync(this.usersFilePath)) {
        const rawUsers = fs.readFileSync(this.usersFilePath, 'utf-8');
        const userList: UserAccount[] = JSON.parse(rawUsers);
        for (const u of userList) {
          this.users.set(u.walletAddress.toLowerCase(), u);
        }
      } else {
        fs.writeFileSync(this.usersFilePath, JSON.stringify([], null, 2), 'utf-8');
      }

      if (fs.existsSync(this.txFilePath)) {
        const rawTx = fs.readFileSync(this.txFilePath, 'utf-8');
        this.transactions = JSON.parse(rawTx);
      } else {
        fs.writeFileSync(this.txFilePath, JSON.stringify([], null, 2), 'utf-8');
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

      const userList = Array.from(this.users.values());
      fs.writeFileSync(this.usersFilePath, JSON.stringify(userList, null, 2), 'utf-8');

      fs.writeFileSync(this.txFilePath, JSON.stringify(this.transactions.slice(-200), null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist data to file:', err);
    }
  }

  public async getUserAccount(walletAddress: string, telegramId?: string, username?: string): Promise<UserAccount> {
    const key = walletAddress.toLowerCase();
    let account = this.users.get(key);
    if (!account) {
      account = {
        walletAddress,
        telegramId: telegramId || '',
        username: username || '',
        balanceNano: '0',
        balanceTon: '0.00',
        depositedTotalTon: '0.00',
        withdrawnTotalTon: '0.00',
        updatedAt: Date.now(),
      };
      this.users.set(key, account);
      this.persistData();
    } else {
      if (telegramId && !account.telegramId) account.telegramId = telegramId;
      if (username) account.username = username;
    }
    return account;
  }

  public async creditUserBalance(
    walletAddress: string,
    amountTon: string,
    type: 'DEPOSIT' | 'MATCH_WIN',
    details?: string
  ): Promise<UserAccount> {
    const account = await this.getUserAccount(walletAddress);
    const amountNum = parseFloat(amountTon) || 0;
    const currentNum = parseFloat(account.balanceTon) || 0;
    const newBal = (currentNum + amountNum).toFixed(2);
    const newNano = (BigInt(Math.round(parseFloat(newBal) * 1e9))).toString();

    account.balanceTon = newBal;
    account.balanceNano = newNano;
    account.updatedAt = Date.now();

    if (type === 'DEPOSIT') {
      const depTotal = (parseFloat(account.depositedTotalTon || '0') + amountNum).toFixed(2);
      account.depositedTotalTon = depTotal;
    }

    this.transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletAddress,
      type,
      amountNano: (BigInt(Math.round(amountNum * 1e9))).toString(),
      amountTon,
      timestamp: Date.now(),
      details,
    });

    this.persistData();
    return account;
  }

  public async debitUserBalance(
    walletAddress: string,
    amountTon: string,
    type: 'WITHDRAW' | 'MATCH_BET' | 'REMATCH_BET',
    details?: string
  ): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
    const account = await this.getUserAccount(walletAddress);
    const amountNum = parseFloat(amountTon) || 0;
    const currentNum = parseFloat(account.balanceTon) || 0;

    if (currentNum < amountNum) {
      return { success: false, error: 'Insufficient balance' };
    }

    const newBal = (currentNum - amountNum).toFixed(2);
    const newNano = (BigInt(Math.round(parseFloat(newBal) * 1e9))).toString();

    account.balanceTon = newBal;
    account.balanceNano = newNano;
    account.updatedAt = Date.now();

    if (type === 'WITHDRAW') {
      const wTotal = (parseFloat(account.withdrawnTotalTon || '0') + amountNum).toFixed(2);
      account.withdrawnTotalTon = wTotal;
    }

    this.transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletAddress,
      type,
      amountNano: (BigInt(Math.round(amountNum * 1e9))).toString(),
      amountTon,
      timestamp: Date.now(),
      details,
    });

    this.persistData();
    return { success: true, account };
  }

  public async getUserTransactions(walletAddress: string): Promise<BalanceTransaction[]> {
    const key = walletAddress.toLowerCase();
    return this.transactions.filter((tx) => tx.walletAddress.toLowerCase() === key);
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Address } from '@ton/ton';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredMatch {
  matchId: string;
  escrowAddress?: string;
  wagerAmountNano: string;
  wagerTon: string;
  wagerGram?: string;
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
  gameType?: string;
  settledAt: number;
  createdAt: number;
}

export interface UserMatchHistoryRecord {
  matchId: string;
  timestamp: number;
  opponentName: string;
  opponentWallet?: string;
  wagerTon: string;
  wagerGram: string;
  payoutTon: string;
  payoutGram: string;
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  reactionTimeMs?: number;
  score: string;
  gameType?: string;
}

export interface UserStats {
  duelsPlayed: number;
  duelsWon: number;
  winRate: number;
  bestReaction: string;
  totalProfitsTon: string;
  totalProfitsGram: string;
  dailyStreak: number;
  hasWonToday: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username: string;
  duelsPlayed: number;
  duelsWon: number;
  winRate: number;
  dailyStreak: number;
  totalProfitsGram: string;
}

export interface UserAccount {
  walletAddress: string;
  telegramId?: string;
  username?: string;
  balanceNano: string;
  balanceTon: string; // for backward compatibility
  balanceGram: string; // primary GRAM balance
  depositedTotalTon: string;
  depositedTotalGram: string;
  withdrawnTotalTon: string;
  withdrawnTotalGram: string;
  updatedAt: number;
}

export interface BalanceTransaction {
  id: string;
  walletAddress: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'MATCH_WIN' | 'MATCH_BET' | 'REMATCH_BET' | 'CREATION_FEE' | 'REFUND';
  amountNano: string;
  amountTon: string; // for backward compatibility
  amountGram: string; // primary GRAM amount
  timestamp: number;
  details?: string;
}

export interface TreasuryFeeEvent {
  id: string;
  type: 'CREATION_FEE' | 'DUEL_RAKE' | 'SPECTATOR_RAKE' | 'WITHDRAWAL';
  amountGram: string;
  matchId?: string;
  recipient?: string;
  timestamp: number;
}

export interface TreasuryData {
  treasuryWallet: string;
  claimableFeesGram: string;
  totalEarnedFeesGram: string;
  totalWithdrawnFeesGram: string;
  totalMatchesRaked: number;
  feeBreakdown: {
    creationFeesGram: string;
    duelRakeGram: string;
    spectatorRakeGram: string;
  };
  history: TreasuryFeeEvent[];
  lastUpdated: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private matches: Map<string, StoredMatch> = new Map();
  private users: Map<string, UserAccount> = new Map();
  private transactions: BalanceTransaction[] = [];
  private treasury: TreasuryData;
  private dataDir: string;
  private filePath: string;
  private usersFilePath: string;
  private txFilePath: string;
  private treasuryFilePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.dataDir = path.resolve(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'matches.json');
    this.usersFilePath = path.join(this.dataDir, 'users.json');
    this.txFilePath = path.join(this.dataDir, 'transactions.json');
    this.treasuryFilePath = path.join(this.dataDir, 'treasury.json');

    const defaultTreasuryWallet =
      process.env.TREASURY_ADDRESS ||
      process.env.OWNER_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

    this.treasury = {
      treasuryWallet: defaultTreasuryWallet,
      claimableFeesGram: '0.00',
      totalEarnedFeesGram: '0.00',
      totalWithdrawnFeesGram: '0.00',
      totalMatchesRaked: 0,
      feeBreakdown: {
        creationFeesGram: '0.00',
        duelRakeGram: '0.00',
        spectatorRakeGram: '0.00',
      },
      history: [],
      lastUpdated: Date.now(),
    };

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
        const userList: any[] = JSON.parse(rawUsers);
        for (const u of userList) {
          const bal = u.balanceGram || u.balanceTon || '0.00';
          const dep = u.depositedTotalGram || u.depositedTotalTon || '0.00';
          const wit = u.withdrawnTotalGram || u.withdrawnTotalTon || '0.00';
          const normKey = this.normalizeAddress(u.walletAddress);
          this.users.set(normKey, {
            ...u,
            walletAddress: this.toFriendlyAddress(u.walletAddress),
            balanceGram: bal,
            balanceTon: bal,
            depositedTotalGram: dep,
            depositedTotalTon: dep,
            withdrawnTotalGram: wit,
            withdrawnTotalTon: wit,
          });
        }
      } else {
        fs.writeFileSync(this.usersFilePath, JSON.stringify([], null, 2), 'utf-8');
      }

      if (fs.existsSync(this.txFilePath)) {
        const rawTx = fs.readFileSync(this.txFilePath, 'utf-8');
        const txList: any[] = JSON.parse(rawTx);
        this.transactions = txList.map((t) => ({
          ...t,
          amountGram: t.amountGram || t.amountTon || '0.00',
          amountTon: t.amountTon || t.amountGram || '0.00',
        }));
      } else {
        fs.writeFileSync(this.txFilePath, JSON.stringify([], null, 2), 'utf-8');
      }

      // Auto-recover any unsent withdrawals from previous runs across all users
      for (const normKey of Array.from(this.users.keys())) {
        this.healUnsentWithdrawalsForUser(normKey);
      }

      // Sanitize and revoke any duplicate refunds caused by room resurrection glitch
      this.sanitizeDuplicateRefunds();

      if (fs.existsSync(this.treasuryFilePath)) {
        const rawTreasury = fs.readFileSync(this.treasuryFilePath, 'utf-8');
        this.treasury = JSON.parse(rawTreasury);
      } else {
        this.persistData();
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

      fs.writeFileSync(this.txFilePath, JSON.stringify(this.transactions.slice(-300), null, 2), 'utf-8');

      fs.writeFileSync(this.treasuryFilePath, JSON.stringify(this.treasury, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist data to file:', err);
    }
  }

  public normalizeAddress(walletAddress: string): string {
    if (!walletAddress) return '';
    try {
      return Address.parse(walletAddress).toRawString().toLowerCase();
    } catch {
      return walletAddress.toLowerCase();
    }
  }

  public toFriendlyAddress(walletAddress: string): string {
    if (!walletAddress) return '';
    try {
      return Address.parse(walletAddress).toString({ bounceable: false });
    } catch {
      return walletAddress;
    }
  }

  public healUnsentWithdrawalsForUser(normKey: string): number {
    const account = this.users.get(normKey);
    if (!account) return 0;

    const unsentWithdraws = this.transactions.filter(
      (tx) =>
        this.normalizeAddress(tx.walletAddress) === normKey &&
        tx.type === 'WITHDRAW' &&
        !tx.details?.includes('onchain_') &&
        !tx.details?.includes('[REFUNDED')
    );

    if (unsentWithdraws.length === 0) return 0;

    let restoredAmount = 0;
    for (const tx of unsentWithdraws) {
      const amt = parseFloat(tx.amountGram || tx.amountTon || '0');
      if (amt > 0) {
        restoredAmount += amt;
        tx.details = (tx.details ? tx.details + ' ' : '') + '[REFUNDED_UNBROADCAST]';
      }
    }

    if (restoredAmount > 0) {
      const curBal = parseFloat(account.balanceGram || account.balanceTon || '0');
      const newBal = (curBal + restoredAmount).toFixed(2);
      account.balanceGram = newBal;
      account.balanceTon = newBal;
      account.balanceNano = BigInt(Math.round(parseFloat(newBal) * 1e9)).toString();

      const curWithdrawn = parseFloat(account.withdrawnTotalGram || account.withdrawnTotalTon || '0');
      const newWithdrawn = Math.max(0, curWithdrawn - restoredAmount).toFixed(2);
      account.withdrawnTotalGram = newWithdrawn;
      account.withdrawnTotalTon = newWithdrawn;
      account.updatedAt = Date.now();

      this.transactions.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        walletAddress: account.walletAddress,
        type: 'REFUND',
        amountNano: BigInt(Math.round(restoredAmount * 1e9)).toString(),
        amountTon: restoredAmount.toFixed(2),
        amountGram: restoredAmount.toFixed(2),
        timestamp: Date.now(),
        details: `Automatic recovery of unsent withdrawal (${restoredAmount.toFixed(2)} GRAM restored)`,
      });

      this.persistData();
      console.log(`[DatabaseService] Auto-restored ${restoredAmount.toFixed(2)} GRAM to user ${account.walletAddress}`);
    }
    return restoredAmount;
  }

  public async restoreUnsentWithdrawals(walletAddress: string): Promise<number> {
    const normKey = this.normalizeAddress(walletAddress);
    return this.healUnsentWithdrawalsForUser(normKey);
  }

  public sanitizeDuplicateRefunds(): void {
    const refundMatchSeen = new Map<string, number>();

    for (const tx of this.transactions) {
      if (
        tx.type === 'REFUND' &&
        tx.details?.includes('cancelled match #') &&
        !tx.details?.includes('[DUPLICATE_REVOKED]')
      ) {
        const matchRegex = tx.details.match(/cancelled match #([a-zA-Z0-9_-]+)/);
        if (matchRegex) {
          const matchId = matchRegex[1];
          const key = `${this.normalizeAddress(tx.walletAddress)}_${matchId}`;
          const count = refundMatchSeen.get(key) || 0;
          if (count > 0) {
            // Duplicate refund found!
            const amt = parseFloat(tx.amountGram || tx.amountTon || '0');
            const account = this.users.get(this.normalizeAddress(tx.walletAddress));
            if (account && amt > 0) {
              const curBal = parseFloat(account.balanceGram || account.balanceTon || '0');
              const correctedBal = Math.max(0, curBal - amt).toFixed(2);
              account.balanceGram = correctedBal;
              account.balanceTon = correctedBal;
              account.balanceNano = BigInt(Math.round(parseFloat(correctedBal) * 1e9)).toString();
              account.updatedAt = Date.now();
              console.log(
                `[DatabaseService] Revoked duplicate refund of ${amt} GRAM for match #${matchId} from ${account.walletAddress}. Corrected balance: ${correctedBal}`
              );
            }
            tx.details = (tx.details || '') + ' [DUPLICATE_REVOKED]';
          }
          refundMatchSeen.set(key, count + 1);
        }
      }
    }
  }

  public async getUserAccount(walletAddress: string, telegramId?: string, username?: string): Promise<UserAccount> {
    const normKey = this.normalizeAddress(walletAddress);
    let account = this.users.get(normKey);
    if (!account) {
      account = this.users.get(walletAddress.toLowerCase());
      if (account) {
        this.users.set(normKey, account);
      }
    }

    if (account) {
      this.healUnsentWithdrawalsForUser(normKey);
      this.sanitizeDuplicateRefunds();
    }

    if (!account) {
      account = {
        walletAddress: this.toFriendlyAddress(walletAddress),
        telegramId: telegramId || '',
        username: username || '',
        balanceNano: '0',
        balanceTon: '0.00',
        balanceGram: '0.00',
        depositedTotalTon: '0.00',
        depositedTotalGram: '0.00',
        withdrawnTotalTon: '0.00',
        withdrawnTotalGram: '0.00',
        updatedAt: Date.now(),
      };
      this.users.set(normKey, account);
      this.persistData();
    } else {
      if (telegramId && !account.telegramId) account.telegramId = telegramId;
      if (username) account.username = username;
    }
    return account;
  }

  public async setUserBalanceDirect(
    identifier: string,
    amountGram: string
  ): Promise<UserAccount | null> {
    const normId = identifier.trim().toLowerCase();
    let account: UserAccount | undefined;

    // Search by telegramId, walletAddress, or username
    for (const [key, u] of this.users.entries()) {
      if (
        u.telegramId === normId ||
        key === this.normalizeAddress(identifier) ||
        key === normId ||
        u.walletAddress.toLowerCase() === normId ||
        (u.username && u.username.toLowerCase() === normId.replace('@', ''))
      ) {
        account = u;
        break;
      }
    }

    if (!account) return null;

    const amtNum = parseFloat(amountGram);
    const validAmt = isNaN(amtNum) || amtNum < 0 ? '0.00' : amtNum.toFixed(2);

    account.balanceGram = validAmt;
    account.balanceTon = validAmt;
    account.balanceNano = BigInt(Math.round(parseFloat(validAmt) * 1e9)).toString();
    account.updatedAt = Date.now();

    this.transactions.push({
      id: `tx_${Date.now()}_adj`,
      walletAddress: account.walletAddress,
      type: 'REFUND',
      amountNano: account.balanceNano,
      amountTon: validAmt,
      amountGram: validAmt,
      timestamp: Date.now(),
      details: `Admin balance adjustment to ${validAmt} GRAM`,
    });

    this.persistData();
    console.log(`[DatabaseService] Admin set balance for ${account.walletAddress} (ID: ${account.telegramId}) to ${validAmt} GRAM`);
    return account;
  }

  public async creditUserBalance(
    walletAddress: string,
    amountGram: string,
    type: 'DEPOSIT' | 'MATCH_WIN' | 'REFUND',
    details?: string
  ): Promise<UserAccount> {
    const account = await this.getUserAccount(walletAddress);
    const amountNum = parseFloat(amountGram) || 0;
    const currentNum = parseFloat(account.balanceGram || account.balanceTon || '0') || 0;
    const newBal = (currentNum + amountNum).toFixed(2);
    const newNano = BigInt(Math.round(parseFloat(newBal) * 1e9)).toString();

    account.balanceGram = newBal;
    account.balanceTon = newBal;
    account.balanceNano = newNano;
    account.updatedAt = Date.now();

    if (type === 'DEPOSIT') {
      const depTotal = (parseFloat(account.depositedTotalGram || '0') + amountNum).toFixed(2);
      account.depositedTotalGram = depTotal;
      account.depositedTotalTon = depTotal;
    }

    this.transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletAddress,
      type,
      amountNano: BigInt(Math.round(amountNum * 1e9)).toString(),
      amountTon: amountGram,
      amountGram: amountGram,
      timestamp: Date.now(),
      details,
    });

    this.persistData();
    return account;
  }

  public async debitUserBalance(
    walletAddress: string,
    amountGram: string,
    type: 'WITHDRAW' | 'MATCH_BET' | 'REMATCH_BET' | 'CREATION_FEE',
    details?: string
  ): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
    const account = await this.getUserAccount(walletAddress);
    const amountNum = parseFloat(amountGram) || 0;
    const currentNum = parseFloat(account.balanceGram || account.balanceTon || '0') || 0;

    if (currentNum < amountNum) {
      return { success: false, error: 'Insufficient balance' };
    }

    const newBal = (currentNum - amountNum).toFixed(2);
    const newNano = BigInt(Math.round(parseFloat(newBal) * 1e9)).toString();

    account.balanceGram = newBal;
    account.balanceTon = newBal;
    account.balanceNano = newNano;
    account.updatedAt = Date.now();

    if (type === 'WITHDRAW') {
      const wTotal = (parseFloat(account.withdrawnTotalGram || '0') + amountNum).toFixed(2);
      account.withdrawnTotalGram = wTotal;
      account.withdrawnTotalTon = wTotal;
    }

    this.transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletAddress,
      type,
      amountNano: BigInt(Math.round(amountNum * 1e9)).toString(),
      amountTon: amountGram,
      amountGram: amountGram,
      timestamp: Date.now(),
      details,
    });

    this.persistData();
    return { success: true, account };
  }

  public async refundUserBalance(
    walletAddress: string,
    amountGram: string,
    reason: string
  ): Promise<UserAccount> {
    return this.creditUserBalance(walletAddress, amountGram, 'REFUND', reason);
  }

  public async getUserTransactions(walletAddress: string): Promise<BalanceTransaction[]> {
    const normKey = this.normalizeAddress(walletAddress);
    const lowerKey = walletAddress.toLowerCase();
    return this.transactions.filter(
      (tx) => this.normalizeAddress(tx.walletAddress) === normKey || tx.walletAddress.toLowerCase() === lowerKey
    );
  }

  // --- Treasury Management Methods ---

  public async getTreasuryData(): Promise<TreasuryData> {
    const defaultWallet =
      process.env.TREASURY_ADDRESS ||
      process.env.OWNER_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

    if (this.treasury.treasuryWallet !== defaultWallet && defaultWallet) {
      this.treasury.treasuryWallet = defaultWallet;
    }
    return this.treasury;
  }

  public async creditTreasury(
    amountGram: string,
    type: 'CREATION_FEE' | 'DUEL_RAKE' | 'SPECTATOR_RAKE',
    matchId?: string
  ): Promise<TreasuryData> {
    const amountNum = parseFloat(amountGram) || 0;
    if (amountNum <= 0) return this.treasury;

    const currentClaimable = parseFloat(this.treasury.claimableFeesGram || '0');
    const currentEarned = parseFloat(this.treasury.totalEarnedFeesGram || '0');

    this.treasury.claimableFeesGram = (currentClaimable + amountNum).toFixed(2);
    this.treasury.totalEarnedFeesGram = (currentEarned + amountNum).toFixed(2);
    this.treasury.totalMatchesRaked = (this.treasury.totalMatchesRaked || 0) + 1;
    this.treasury.lastUpdated = Date.now();

    if (type === 'CREATION_FEE') {
      const cur = parseFloat(this.treasury.feeBreakdown.creationFeesGram || '0');
      this.treasury.feeBreakdown.creationFeesGram = (cur + amountNum).toFixed(2);
    } else if (type === 'DUEL_RAKE') {
      const cur = parseFloat(this.treasury.feeBreakdown.duelRakeGram || '0');
      this.treasury.feeBreakdown.duelRakeGram = (cur + amountNum).toFixed(2);
    } else if (type === 'SPECTATOR_RAKE') {
      const cur = parseFloat(this.treasury.feeBreakdown.spectatorRakeGram || '0');
      this.treasury.feeBreakdown.spectatorRakeGram = (cur + amountNum).toFixed(2);
    }

    this.treasury.history.push({
      id: `fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      amountGram: amountNum.toFixed(2),
      matchId,
      timestamp: Date.now(),
    });

    this.persistData();
    console.log(`[Treasury] Credited ${amountGram} GRAM (${type}) to claimable fees. New total: ${this.treasury.claimableFeesGram} GRAM`);
    return this.treasury;
  }

  public async withdrawTreasuryFees(
    amountGram: string,
    recipientWallet: string
  ): Promise<{ success: boolean; data?: TreasuryData; error?: string }> {
    const amountNum = parseFloat(amountGram) || 0;
    const currentClaimable = parseFloat(this.treasury.claimableFeesGram || '0');

    if (amountNum <= 0) {
      return { success: false, error: 'Invalid withdrawal amount' };
    }
    if (amountNum > currentClaimable) {
      return { success: false, error: `Insufficient claimable fees. Requested: ${amountNum} GRAM, Available: ${currentClaimable} GRAM` };
    }

    this.treasury.claimableFeesGram = (currentClaimable - amountNum).toFixed(2);
    const currentWithdrawn = parseFloat(this.treasury.totalWithdrawnFeesGram || '0');
    this.treasury.totalWithdrawnFeesGram = (currentWithdrawn + amountNum).toFixed(2);
    this.treasury.lastUpdated = Date.now();

    this.treasury.history.push({
      id: `wit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'WITHDRAWAL',
      amountGram: amountNum.toFixed(2),
      recipient: recipientWallet,
      timestamp: Date.now(),
    });

    this.persistData();
    console.log(`[Treasury] Withdrew ${amountGram} GRAM to ${recipientWallet}. Remaining claimable: ${this.treasury.claimableFeesGram} GRAM`);
    return { success: true, data: this.treasury };
  }

  // --- Match and History Methods ---

  public async saveMatch(record: StoredMatch): Promise<void> {
    this.matches.set(record.matchId, record);
    this.persistData();
    console.log(`[DatabaseService] Persisted match #${record.matchId} (Winner: ${record.winnerName || record.winnerAddress})`);
  }

  public async getMatch(matchId: string): Promise<StoredMatch | null> {
    return this.matches.get(matchId) || null;
  }

  public async getUserHistory(walletAddress: string): Promise<UserMatchHistoryRecord[]> {
    const targetNorm = this.normalizeAddress(walletAddress);
    const targetLower = walletAddress ? walletAddress.toLowerCase() : '';
    const result: UserMatchHistoryRecord[] = [];

    const sorted = Array.from(this.matches.values()).sort((a, b) => b.settledAt - a.settledAt);

    for (const m of sorted) {
      const normA = this.normalizeAddress(m.playerAAddress);
      const normB = m.playerBAddress ? this.normalizeAddress(m.playerBAddress) : '';
      const normWinner = m.winnerAddress ? this.normalizeAddress(m.winnerAddress) : '';

      const isPlayerA = (targetNorm && normA === targetNorm) || m.playerAAddress.toLowerCase() === targetLower;
      const isPlayerB = (targetNorm && normB === targetNorm) || (m.playerBAddress && m.playerBAddress.toLowerCase() === targetLower);

      if (!isPlayerA && !isPlayerB) continue;

      const isWinner = (targetNorm && normWinner === targetNorm) || (m.winnerAddress && m.winnerAddress.toLowerCase() === targetLower);
      const outcome: 'WIN' | 'LOSS' | 'DRAW' = isWinner ? 'WIN' : 'LOSS';
      const wagerTon = m.wagerTon || m.wagerGram || (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
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
        wagerGram: wagerTon,
        payoutTon,
        payoutGram: payoutTon,
        outcome,
        reactionTimeMs: myReaction,
        score: `${myScore} - ${oppScore}`,
        gameType: m.gameType || 'roulette',
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

    const totalProfits = history
      .reduce((acc, h) => {
        if (h.outcome === 'WIN') {
          const p = parseFloat(h.payoutGram || h.payoutTon);
          return acc + (isNaN(p) ? 0 : p);
        }
        return acc;
      }, 0)
      .toFixed(2);

    const { dailyStreak, hasWonToday } = this.calculateDailyWinStreak(history);

    return {
      duelsPlayed,
      duelsWon,
      winRate,
      bestReaction,
      totalProfitsTon: totalProfits,
      totalProfitsGram: totalProfits,
      dailyStreak,
      hasWonToday,
    };
  }

  public calculateDailyWinStreak(history: UserMatchHistoryRecord[]): { dailyStreak: number; hasWonToday: boolean } {
    const winningMatches = history.filter((h) => h.outcome === 'WIN' && h.timestamp > 0);
    if (winningMatches.length === 0) {
      return { dailyStreak: 0, hasWonToday: false };
    }

    // Set of distinct UTC calendar dates 'YYYY-MM-DD'
    const winDays = new Set<string>();
    for (const m of winningMatches) {
      const d = new Date(m.timestamp);
      const dayStr = d.toISOString().slice(0, 10);
      winDays.add(dayStr);
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const hasWonToday = winDays.has(todayStr);

    let streak = 0;
    // If won today, count backwards from today.
    // If not won today, but won yesterday, count backwards from yesterday.
    // Otherwise streak is 0.
    let checkDate: Date;
    if (hasWonToday) {
      checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    } else if (winDays.has(yesterdayStr)) {
      checkDate = new Date(Date.UTC(yesterdayDate.getUTCFullYear(), yesterdayDate.getUTCMonth(), yesterdayDate.getUTCDate()));
    } else {
      return { dailyStreak: 0, hasWonToday: false };
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (winDays.has(dateStr)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    return { dailyStreak: streak, hasWonToday };
  }

  public async getLeaderboard(
    sortBy: 'wins' | 'streak' | 'profits' = 'wins',
    limit: number = 50,
    userAddress?: string
  ): Promise<{ leaderboard: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }> {
    const addressMap = new Map<string, string>(); // normKey -> display/friendly Address
    const usernameMap = new Map<string, string>(); // normKey -> username

    for (const [key, user] of this.users.entries()) {
      const norm = this.normalizeAddress(user.walletAddress) || key;
      addressMap.set(norm, this.toFriendlyAddress(user.walletAddress));
      if (user.username) {
        usernameMap.set(norm, user.username);
      }
    }

    for (const m of this.matches.values()) {
      if (m.playerAAddress) {
        const normA = this.normalizeAddress(m.playerAAddress);
        if (!addressMap.has(normA)) addressMap.set(normA, this.toFriendlyAddress(m.playerAAddress));
        if (m.playerAName && !usernameMap.has(normA)) usernameMap.set(normA, m.playerAName);
      }
      if (m.playerBAddress) {
        const normB = this.normalizeAddress(m.playerBAddress);
        if (!addressMap.has(normB)) addressMap.set(normB, this.toFriendlyAddress(m.playerBAddress));
        if (m.playerBName && !usernameMap.has(normB)) usernameMap.set(normB, m.playerBName);
      }
    }

    if (userAddress) {
      const normUser = this.normalizeAddress(userAddress);
      if (!addressMap.has(normUser)) addressMap.set(normUser, this.toFriendlyAddress(userAddress));
    }

    const entries: Omit<LeaderboardEntry, 'rank'>[] = [];

    for (const [normKey, addr] of addressMap.entries()) {
      const stats = await this.getUserStats(addr);
      // Skip addresses that have never played and have no profit/streak
      if (stats.duelsPlayed === 0 && parseFloat(stats.totalProfitsGram) <= 0) continue;

      let name = usernameMap.get(normKey);
      if (!name) {
        name = addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
      }

      entries.push({
        walletAddress: addr,
        username: name,
        duelsPlayed: stats.duelsPlayed,
        duelsWon: stats.duelsWon,
        winRate: stats.winRate,
        dailyStreak: stats.dailyStreak,
        totalProfitsGram: stats.totalProfitsGram,
      });
    }

    entries.sort((a, b) => {
      if (sortBy === 'streak') {
        if (b.dailyStreak !== a.dailyStreak) return b.dailyStreak - a.dailyStreak;
        return b.duelsWon - a.duelsWon;
      } else if (sortBy === 'profits') {
        const diff = parseFloat(b.totalProfitsGram) - parseFloat(a.totalProfitsGram);
        if (Math.abs(diff) > 0.001) return diff;
        return b.duelsWon - a.duelsWon;
      } else {
        if (b.duelsWon !== a.duelsWon) return b.duelsWon - a.duelsWon;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.duelsPlayed - a.duelsPlayed;
      }
    });

    const ranked: LeaderboardEntry[] = entries.map((e, idx) => ({
      ...e,
      rank: idx + 1,
    }));

    let userEntry: LeaderboardEntry | null = null;
    if (userAddress) {
      const normTarget = this.normalizeAddress(userAddress);
      const found = ranked.find((e) => this.normalizeAddress(e.walletAddress) === normTarget);
      if (found) {
        userEntry = found;
      } else {
        const stats = await this.getUserStats(userAddress);
        userEntry = {
          rank: ranked.length + 1,
          walletAddress: this.toFriendlyAddress(userAddress),
          username: usernameMap.get(normTarget) || 'You',
          duelsPlayed: stats.duelsPlayed,
          duelsWon: stats.duelsWon,
          winRate: stats.winRate,
          dailyStreak: stats.dailyStreak,
          totalProfitsGram: stats.totalProfitsGram,
        };
      }
    }

    return {
      leaderboard: ranked.slice(0, limit),
      userEntry,
    };
  }
}

export const dbService = DatabaseService.getInstance();

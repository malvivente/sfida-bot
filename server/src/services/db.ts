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
  payoutTon?: string;
  payoutGram?: string;
  playerAAddress: string;
  playerAName: string;
  playerATelegramId?: string;
  playerBAddress?: string;
  playerBName?: string;
  playerBTelegramId?: string;
  winnerAddress?: string;
  winnerName?: string;
  winnerTelegramId?: string;
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
  telegramId?: string;
  username: string; // The display name (first + last name, never @username)
  photoUrl?: string; // Telegram avatar photo URL
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
  displayName?: string; // Real Telegram display name (first_name + last_name)
  photoUrl?: string; // Telegram profile picture url
  balanceNano: string;
  balanceTon: string; // for backward compatibility
  balanceGram: string; // primary GRAM balance
  depositedTotalTon: string;
  depositedTotalGram: string;
  withdrawnTotalTon: string;
  withdrawnTotalGram: string;
  updatedAt: number;
  mockStats?: {
    duelsPlayed: number;
    duelsWon: number;
    winRate: number;
    bestReaction?: string;
    totalProfitsGram: string;
    dailyStreak: number;
  };
}

export interface BalanceTransaction {
  id: string;
  walletAddress: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'MATCH_WIN' | 'MATCH_BET' | 'REMATCH_BET' | 'CREATION_FEE' | 'REFUND' | 'JACKPOT_BONUS';
  amountNano: string;
  amountTon: string; // for backward compatibility
  amountGram: string; // primary GRAM amount
  timestamp: number;
  details?: string;
}

export interface TreasuryFeeEvent {
  id: string;
  type: 'CREATION_FEE' | 'DUEL_RAKE' | 'SPECTATOR_RAKE' | 'WITHDRAWAL' | 'DOUBLE_STEAL_HOUSE_SHARE' | 'SPECTATOR_DOUBLE_STEAL_SHARE';
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

export interface JackpotData {
  trustJackpotGram: string;
  thresholdGram: string;
  bonusPercentage: number;
  totalDistributedGram: string;
  totalCollectedGram: string;
  lastUpdated: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private matches: Map<string, StoredMatch> = new Map();
  private matchesByTg: Map<string, StoredMatch[]> = new Map();
  private matchesByWallet: Map<string, StoredMatch[]> = new Map();
  private leaderboardCache: Map<string, { timestamp: number; data: LeaderboardEntry[] }> = new Map();
  private users: Map<string, UserAccount> = new Map();
  private usersByTg: Map<string, UserAccount> = new Map();
  private usersByWallet: Map<string, UserAccount> = new Map();
  private usersByUsername: Map<string, UserAccount> = new Map();
  private transactions: BalanceTransaction[] = [];
  private treasury: TreasuryData;
  private jackpot: JackpotData;
  private dataDir: string;
  private filePath: string;
  private usersFilePath: string;
  private txFilePath: string;
  private treasuryFilePath: string;
  private jackpotFilePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.dataDir = path.resolve(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'matches.json');
    this.usersFilePath = path.join(this.dataDir, 'users.json');
    this.txFilePath = path.join(this.dataDir, 'transactions.json');
    this.treasuryFilePath = path.join(this.dataDir, 'treasury.json');
    this.jackpotFilePath = path.join(this.dataDir, 'jackpot.json');

    const defaultTreasuryWallet =
      process.env.TREASURY_ADDRESS ||
      process.env.OWNER_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

    this.jackpot = {
      trustJackpotGram: '5.00',
      thresholdGram: '5.00',
      bonusPercentage: 20,
      totalDistributedGram: '0.00',
      totalCollectedGram: '0.00',
      lastUpdated: Date.now(),
    };

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
        this.matchesByTg.clear();
        this.matchesByWallet.clear();
        for (const m of list) {
          this.matches.set(m.matchId, m);
          this.indexMatch(m);
        }
        console.log(`[DatabaseService] Loaded ${this.matches.size} matches from persistent storage.`);
      } else {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      }

      if (fs.existsSync(this.usersFilePath)) {
        const rawUsers = fs.readFileSync(this.usersFilePath, 'utf-8');
        const userList: any[] = JSON.parse(rawUsers);
        this.users.clear();
        this.usersByTg.clear();
        this.usersByWallet.clear();
        this.usersByUsername.clear();
        for (const u of userList) {
          const bal = u.balanceGram || u.balanceTon || '0.00';
          const dep = u.depositedTotalGram || u.depositedTotalTon || '0.00';
          const wit = u.withdrawnTotalGram || u.withdrawnTotalTon || '0.00';
          const cleanTg = u.telegramId ? String(u.telegramId).trim() : '';
          const tgKey = cleanTg ? `tg_${cleanTg}` : '';
          const normKey = u.walletAddress ? this.normalizeAddress(u.walletAddress) : '';
          const storageKey = tgKey || normKey || `user_${Math.random()}`;
          const account: UserAccount = {
            ...u,
            walletAddress: u.walletAddress ? this.toFriendlyAddress(u.walletAddress) : '',
            telegramId: cleanTg,
            username: u.username || '',
            displayName: u.displayName || u.username || '',
            photoUrl: u.photoUrl || '',
            balanceGram: bal,
            balanceTon: bal,
            depositedTotalGram: dep,
            depositedTotalTon: dep,
            withdrawnTotalGram: wit,
            withdrawnTotalTon: wit,
          };
          this.users.set(storageKey, account);
          this.indexUser(account);
        }
        console.log(`[DatabaseService] Loaded ${this.users.size} users from persistent storage.`);
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

      if (fs.existsSync(this.jackpotFilePath)) {
        const rawJackpot = fs.readFileSync(this.jackpotFilePath, 'utf-8');
        this.jackpot = JSON.parse(rawJackpot);
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

      fs.writeFileSync(this.jackpotFilePath, JSON.stringify(this.jackpot, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist data to file:', err);
    }
  }

  private indexUser(u: UserAccount) {
    if (u.telegramId && String(u.telegramId).trim()) {
      this.usersByTg.set(String(u.telegramId).trim(), u);
    }
    if (u.walletAddress) {
      const norm = this.normalizeAddress(u.walletAddress);
      if (norm) {
        this.usersByWallet.set(norm, u);
      }
      this.usersByWallet.set(u.walletAddress.toLowerCase(), u);
    }
    if (u.username) {
      const uname = u.username.replace(/^@/, '').toLowerCase().trim();
      if (uname) {
        this.usersByUsername.set(uname, u);
      }
    }
  }

  private indexMatch(m: StoredMatch) {
    if (m.playerATelegramId) {
      const list = this.matchesByTg.get(m.playerATelegramId) || [];
      list.push(m);
      this.matchesByTg.set(m.playerATelegramId, list);
    }
    if (m.playerBTelegramId) {
      const list = this.matchesByTg.get(m.playerBTelegramId) || [];
      list.push(m);
      this.matchesByTg.set(m.playerBTelegramId, list);
    }
    if (m.playerAAddress) {
      const normA = this.normalizeAddress(m.playerAAddress);
      if (normA) {
        const list = this.matchesByWallet.get(normA) || [];
        list.push(m);
        this.matchesByWallet.set(normA, list);
      }
    }
    if (m.playerBAddress) {
      const normB = this.normalizeAddress(m.playerBAddress);
      if (normB) {
        const list = this.matchesByWallet.get(normB) || [];
        list.push(m);
        this.matchesByWallet.set(normB, list);
      }
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
    const account = this.usersByWallet.get(normKey) || this.users.get(normKey);
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
            const norm = this.normalizeAddress(tx.walletAddress);
            const account = this.usersByWallet.get(norm) || this.users.get(norm);
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

  public async getUserAccount(
    walletAddress?: string,
    telegramId?: string,
    username?: string,
    displayName?: string,
    photoUrl?: string
  ): Promise<UserAccount> {
    const cleanTgId = telegramId ? String(telegramId).trim() : '';
    const normWallet = walletAddress ? this.normalizeAddress(walletAddress) : '';
    const cleanUsername = username ? username.replace(/^@/, '').toLowerCase().trim() : '';

    let account: UserAccount | undefined;

    // 1. By Telegram ID (primary persistent identity)
    if (cleanTgId) {
      account = this.usersByTg.get(cleanTgId);
    }

    // 2. By Wallet Address
    if (!account && normWallet) {
      account = this.usersByWallet.get(normWallet) || (walletAddress ? this.usersByWallet.get(walletAddress.toLowerCase()) : undefined);
    }

    // 3. If walletAddress was 'tg_12345'
    if (!account && walletAddress) {
      const matchTg = walletAddress.match(/^(?:tg_)?(\d+)$/);
      if (matchTg) {
        account = this.usersByTg.get(matchTg[1]);
      }
    }

    // 4. By Username
    if (!account && cleanUsername) {
      account = this.usersByUsername.get(cleanUsername);
    }

    if (account) {
      if (account.walletAddress) {
        this.healUnsentWithdrawalsForUser(this.normalizeAddress(account.walletAddress));
      }
      this.sanitizeDuplicateRefunds();

      let changed = false;
      if (cleanTgId && account.telegramId !== cleanTgId) {
        account.telegramId = cleanTgId;
        this.usersByTg.set(cleanTgId, account);
        changed = true;
      }
      if (displayName && displayName.trim() && account.displayName !== displayName.trim()) {
        account.displayName = displayName.trim();
        changed = true;
      }
      if (photoUrl && account.photoUrl !== photoUrl) {
        account.photoUrl = photoUrl;
        changed = true;
      }
      if (username && account.username !== username) {
        account.username = username;
        if (cleanUsername) this.usersByUsername.set(cleanUsername, account);
        changed = true;
      }
      if (walletAddress && !walletAddress.startsWith('tg_') && !/^\d+$/.test(walletAddress)) {
        const friendly = this.toFriendlyAddress(walletAddress);
        if (friendly && account.walletAddress !== friendly) {
          account.walletAddress = friendly;
          const newNorm = this.normalizeAddress(walletAddress);
          if (newNorm) this.usersByWallet.set(newNorm, account);
          this.usersByWallet.set(walletAddress.toLowerCase(), account);
          changed = true;
        }
      }

      if (changed) {
        account.updatedAt = Date.now();
        this.persistData();
      }

      return account;
    }

    // 5. Create new UserAccount
    const friendlyWallet = walletAddress && !walletAddress.startsWith('tg_') && !/^\d+$/.test(walletAddress)
      ? this.toFriendlyAddress(walletAddress)
      : '';
    const userStorageKey = cleanTgId ? `tg_${cleanTgId}` : (normWallet || `user_${Date.now()}`);

    account = {
      walletAddress: friendlyWallet,
      telegramId: cleanTgId,
      username: username || '',
      displayName: displayName || (username ? username : (cleanTgId ? `Duelist #${cleanTgId}` : 'Duelist')),
      photoUrl: photoUrl || '',
      balanceNano: '0',
      balanceTon: '0.00',
      balanceGram: '0.00',
      depositedTotalTon: '0.00',
      depositedTotalGram: '0.00',
      withdrawnTotalTon: '0.00',
      withdrawnTotalGram: '0.00',
      updatedAt: Date.now(),
    };

    this.users.set(userStorageKey, account);
    this.indexUser(account);
    this.persistData();
    console.log(`[DatabaseService] Created UserAccount ${account.displayName} (${account.walletAddress || account.telegramId})`);
    return account;
  }

  public async syncUserProfile(params: {
    telegramId: string;
    username?: string;
    displayName?: string;
    photoUrl?: string;
    walletAddress?: string;
  }): Promise<UserAccount> {
    return this.getUserAccount(
      params.walletAddress,
      params.telegramId,
      params.username,
      params.displayName,
      params.photoUrl
    );
  }

  public async setUserBalanceDirect(
    identifier: string,
    amountGram: string
  ): Promise<UserAccount | null> {
    const normId = identifier.trim().toLowerCase();
    const cleanUname = normId.replace('@', '');
    let account: UserAccount | undefined =
      this.usersByTg.get(normId) ||
      this.usersByWallet.get(this.normalizeAddress(normId)) ||
      this.usersByWallet.get(normId) ||
      this.usersByUsername.get(cleanUname);

    if (!account) {
      for (const [key, u] of this.users.entries()) {
        if (
          u.telegramId === normId ||
          key === this.normalizeAddress(identifier) ||
          key === normId ||
          u.walletAddress.toLowerCase() === normId ||
          (u.username && u.username.toLowerCase() === cleanUname)
        ) {
          account = u;
          break;
        }
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

    this.leaderboardCache.clear();
    this.persistData();
    console.log(`[DatabaseService] Admin set balance for ${account.walletAddress} (ID: ${account.telegramId}) to ${validAmt} GRAM`);
    return account;
  }

  public async creditUserBalance(
    walletAddress: string,
    amountGram: string,
    type: 'DEPOSIT' | 'MATCH_WIN' | 'REFUND',
    details?: string,
    telegramId?: string
  ): Promise<UserAccount> {
    const account = await this.getUserAccount(walletAddress, telegramId);
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
      walletAddress: account.walletAddress || walletAddress,
      type,
      amountNano: BigInt(Math.round(amountNum * 1e9)).toString(),
      amountTon: amountGram,
      amountGram: amountGram,
      timestamp: Date.now(),
      details,
    });

    this.leaderboardCache.clear();
    this.persistData();
    return account;
  }

  public async debitUserBalance(
    walletAddress: string,
    amountGram: string,
    type: 'WITHDRAW' | 'MATCH_BET' | 'REMATCH_BET' | 'CREATION_FEE',
    details?: string,
    telegramId?: string
  ): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
    const account = await this.getUserAccount(walletAddress, telegramId);
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
      walletAddress: account.walletAddress || walletAddress,
      type,
      amountNano: BigInt(Math.round(amountNum * 1e9)).toString(),
      amountTon: amountGram,
      amountGram: amountGram,
      timestamp: Date.now(),
      details,
    });

    this.leaderboardCache.clear();
    this.persistData();
    return { success: true, account };
  }

  public async refundUserBalance(
    walletAddress: string,
    amountGram: string,
    reason: string,
    telegramId?: string
  ): Promise<UserAccount> {
    return this.creditUserBalance(walletAddress, amountGram, 'REFUND', reason, telegramId);
  }

  public async getUserTransactions(walletAddress?: string, telegramId?: string): Promise<BalanceTransaction[]> {
    const resolvedTg = this.resolveTelegramId(walletAddress, telegramId);
    const userAcc = resolvedTg
      ? this.usersByTg.get(resolvedTg)
      : (walletAddress ? (this.usersByWallet.get(this.normalizeAddress(walletAddress)) || this.usersByWallet.get(walletAddress.toLowerCase())) : undefined);

    const possibleWallets = new Set<string>();
    if (walletAddress) {
      possibleWallets.add(this.normalizeAddress(walletAddress));
      possibleWallets.add(walletAddress.toLowerCase());
    }
    if (userAcc?.walletAddress) {
      possibleWallets.add(this.normalizeAddress(userAcc.walletAddress));
      possibleWallets.add(userAcc.walletAddress.toLowerCase());
    }
    if (resolvedTg) {
      possibleWallets.add(`tg_${resolvedTg}`);
      possibleWallets.add(resolvedTg);
    }

    return this.transactions.filter((tx) => {
      const txNorm = this.normalizeAddress(tx.walletAddress);
      const txLower = tx.walletAddress.toLowerCase();
      return possibleWallets.has(txNorm) || possibleWallets.has(txLower);
    });
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
    type: 'CREATION_FEE' | 'DUEL_RAKE' | 'SPECTATOR_RAKE' | 'DOUBLE_STEAL_HOUSE_SHARE' | 'SPECTATOR_DOUBLE_STEAL_SHARE',
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
    } else if (type === 'DUEL_RAKE' || type === 'DOUBLE_STEAL_HOUSE_SHARE') {
      const cur = parseFloat(this.treasury.feeBreakdown.duelRakeGram || '0');
      this.treasury.feeBreakdown.duelRakeGram = (cur + amountNum).toFixed(2);
    } else if (type === 'SPECTATOR_RAKE' || type === 'SPECTATOR_DOUBLE_STEAL_SHARE') {
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
    this.indexMatch(record);
    this.leaderboardCache.clear();
    this.persistData();
    console.log(`[DatabaseService] Persisted match #${record.matchId} (Winner: ${record.winnerName || record.winnerAddress})`);
  }

  public async getMatch(matchId: string): Promise<StoredMatch | null> {
    return this.matches.get(matchId) || null;
  }

  public extractUsername(name?: string): string {
    if (!name) return '';
    const match = name.match(/@([a-zA-Z0-9_]+)/);
    if (match) return match[1].toLowerCase();
    if (name.startsWith('0:') || name.startsWith('Player_') || name.startsWith('EQ') || name.startsWith('UQ')) {
      return '';
    }
    return name.trim().toLowerCase();
  }

  public resolveTelegramId(walletAddress?: string, telegramId?: string, name?: string): string | undefined {
    if (telegramId && String(telegramId).trim()) {
      return String(telegramId).trim();
    }
    if (walletAddress) {
      const matchTg = walletAddress.match(/^(?:tg_)?(\d+)$/);
      if (matchTg) return matchTg[1];
      const norm = this.normalizeAddress(walletAddress);
      const acc = this.usersByWallet.get(norm) || this.usersByWallet.get(walletAddress.toLowerCase());
      if (acc?.telegramId && String(acc.telegramId).trim()) return String(acc.telegramId).trim();
    }
    const uname = this.extractUsername(name);
    if (uname) {
      const acc = this.usersByUsername.get(uname);
      if (acc?.telegramId && String(acc.telegramId).trim()) return String(acc.telegramId).trim();
    }
    return undefined;
  }

  public async getUserHistory(walletAddress?: string, telegramId?: string): Promise<UserMatchHistoryRecord[]> {
    const resolvedTgId = this.resolveTelegramId(walletAddress, telegramId);
    const targetNorm = walletAddress ? this.normalizeAddress(walletAddress) : '';

    let candidateMatches: StoredMatch[] = [];
    if (resolvedTgId && this.matchesByTg.has(resolvedTgId)) {
      candidateMatches = this.matchesByTg.get(resolvedTgId)!;
    } else if (targetNorm && this.matchesByWallet.has(targetNorm)) {
      candidateMatches = this.matchesByWallet.get(targetNorm)!;
    } else if (resolvedTgId) {
      candidateMatches = Array.from(this.matches.values()).filter(
        (m) => m.playerATelegramId === resolvedTgId || m.playerBTelegramId === resolvedTgId
      );
    } else if (targetNorm) {
      candidateMatches = Array.from(this.matches.values()).filter(
        (m) => (m.playerAAddress && this.normalizeAddress(m.playerAAddress) === targetNorm) ||
               (m.playerBAddress && this.normalizeAddress(m.playerBAddress) === targetNorm)
      );
    }

    if (candidateMatches.length === 0) {
      return [];
    }

    const result: UserMatchHistoryRecord[] = [];
    const sorted = [...candidateMatches].sort((a, b) => b.settledAt - a.settledAt);

    for (const m of sorted) {
      const isPlayerA = Boolean(
        (resolvedTgId && m.playerATelegramId && String(m.playerATelegramId) === String(resolvedTgId)) ||
        (targetNorm && m.playerAAddress && this.normalizeAddress(m.playerAAddress) === targetNorm)
      );
      const isPlayerB = !isPlayerA && Boolean(
        (resolvedTgId && m.playerBTelegramId && String(m.playerBTelegramId) === String(resolvedTgId)) ||
        (targetNorm && m.playerBAddress && this.normalizeAddress(m.playerBAddress) === targetNorm)
      );

      if (!isPlayerA && !isPlayerB) continue;

      const myTg = isPlayerA ? m.playerATelegramId : m.playerBTelegramId;
      const myWallet = isPlayerA ? m.playerAAddress : m.playerBAddress;
      const myName = isPlayerA ? m.playerAName : m.playerBName;

      let isWinner = false;
      if (m.winnerTelegramId && myTg && String(m.winnerTelegramId) === String(myTg)) {
        isWinner = true;
      } else if (m.winnerAddress && myWallet && this.normalizeAddress(m.winnerAddress) === this.normalizeAddress(myWallet)) {
        isWinner = true;
      } else if (m.winnerName && myName && m.winnerName === myName) {
        isWinner = true;
      }

      const outcome: 'WIN' | 'LOSS' | 'DRAW' = isWinner ? 'WIN' : 'LOSS';
      const wagerTon = m.wagerTon || m.wagerGram || (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
      const payoutTon = isWinner
        ? (m.payoutGram || m.payoutTon || (m.gameType === 'split' ? (parseFloat(wagerTon) * 2).toFixed(2) : (parseFloat(wagerTon) * 2 * 0.96).toFixed(2)))
        : '0.00';

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

  public async getUserStats(walletAddress?: string, telegramId?: string): Promise<UserStats> {
    const resolvedTgId = this.resolveTelegramId(walletAddress, telegramId);
    const targetNorm = walletAddress ? this.normalizeAddress(walletAddress) : '';

    const userAcc = resolvedTgId
      ? this.usersByTg.get(resolvedTgId)
      : (targetNorm ? (this.usersByWallet.get(targetNorm) || this.usersByWallet.get(walletAddress!.toLowerCase())) : undefined);

    const history = await this.getUserHistory(walletAddress, telegramId);

    // If mockStats present on seeded user and history is empty, return mockStats directly
    if (history.length === 0 && userAcc?.mockStats) {
      return {
        duelsPlayed: userAcc.mockStats.duelsPlayed,
        duelsWon: userAcc.mockStats.duelsWon,
        winRate: userAcc.mockStats.winRate,
        bestReaction: userAcc.mockStats.bestReaction || '-',
        totalProfitsTon: userAcc.mockStats.totalProfitsGram,
        totalProfitsGram: userAcc.mockStats.totalProfitsGram,
        dailyStreak: userAcc.mockStats.dailyStreak,
        hasWonToday: userAcc.mockStats.dailyStreak > 0,
      };
    }

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
    limit: number = 100,
    userAddress?: string,
    telegramId?: string
  ): Promise<{ leaderboard: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }> {
    const cacheKey = `${sortBy}_${limit}`;
    const cached = this.leaderboardCache.get(cacheKey);
    let ranked: LeaderboardEntry[];

    if (cached && Date.now() - cached.timestamp < 3000) {
      ranked = cached.data;
    } else {
      interface UserGroup {
        key: string;
        telegramId?: string;
        primaryWallet: string;
        username: string;
        photoUrl?: string;
      }

      const groups = new Map<string, UserGroup>();

      const registerPlayer = (wallet?: string, tgId?: string, name?: string, photo?: string) => {
        const resolvedTg = this.resolveTelegramId(wallet, tgId, name);
        const key = resolvedTg ? `tg_${resolvedTg}` : (wallet ? `wallet_${this.normalizeAddress(wallet)}` : '');
        if (!key) return;

        if (groups.has(key)) return;

        const userAcc = resolvedTg
          ? this.usersByTg.get(resolvedTg)
          : (wallet ? (this.usersByWallet.get(this.normalizeAddress(wallet)) || this.usersByWallet.get(wallet.toLowerCase())) : undefined);

        const friendlyWallet = wallet ? this.toFriendlyAddress(wallet) : (userAcc?.walletAddress || '');

        let cleanName = userAcc?.displayName || userAcc?.username || name || '';
        if (cleanName.startsWith('@')) {
          cleanName = cleanName.substring(1);
        }
        if (!cleanName && friendlyWallet) {
          cleanName = friendlyWallet.length > 10 ? `${friendlyWallet.slice(0, 4)}...${friendlyWallet.slice(-4)}` : friendlyWallet;
        }
        const userPhoto = userAcc?.photoUrl || photo || '';

        groups.set(key, {
          key,
          telegramId: resolvedTg,
          primaryWallet: friendlyWallet,
          username: cleanName,
          photoUrl: userPhoto,
        });
      };

      // 1. Register from users
      for (const user of this.users.values()) {
        registerPlayer(user.walletAddress, user.telegramId, user.displayName || user.username, user.photoUrl);
      }

      // 2. Register current requesting user if present
      if (userAddress || telegramId) {
        registerPlayer(userAddress, telegramId);
      }

      const entries: Omit<LeaderboardEntry, 'rank'>[] = [];

      for (const group of groups.values()) {
        const stats = await this.getUserStats(group.primaryWallet, group.telegramId);
        // Skip players with 0 duels played and 0 profits
        if (stats.duelsPlayed === 0 && parseFloat(stats.totalProfitsGram) <= 0) continue;

        entries.push({
          walletAddress: group.primaryWallet,
          telegramId: group.telegramId,
          username: group.username || (group.primaryWallet ? `${group.primaryWallet.slice(0, 4)}...${group.primaryWallet.slice(-4)}` : 'Warrior'),
          photoUrl: group.photoUrl || undefined,
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

      ranked = entries.map((e, idx) => ({
        ...e,
        rank: idx + 1,
      }));

      this.leaderboardCache.set(cacheKey, { timestamp: Date.now(), data: ranked });
    }

    let userEntry: LeaderboardEntry | null = null;
    const targetTg = telegramId ? String(telegramId).trim() : this.resolveTelegramId(userAddress);
    const targetWalletNorm = userAddress ? this.normalizeAddress(userAddress) : '';

    if (targetTg || targetWalletNorm) {
      const found = ranked.find((e) => {
        if (targetTg && e.telegramId && String(e.telegramId) === targetTg) return true;
        if (targetWalletNorm && e.walletAddress && this.normalizeAddress(e.walletAddress) === targetWalletNorm) return true;
        return false;
      });

      if (found) {
        userEntry = found;
      } else if (userAddress || telegramId) {
        const stats = await this.getUserStats(userAddress, telegramId);
        const userAcc = targetTg ? this.usersByTg.get(targetTg) : (targetWalletNorm ? (this.usersByWallet.get(targetWalletNorm) || this.usersByWallet.get(userAddress!.toLowerCase())) : undefined);
        const disp = userAcc?.displayName || userAcc?.username || (userAddress ? `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}` : 'You');
        userEntry = {
          rank: ranked.length + 1,
          walletAddress: userAddress ? this.toFriendlyAddress(userAddress) : (userAcc?.walletAddress || ''),
          telegramId: targetTg,
          username: disp,
          photoUrl: userAcc?.photoUrl,
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

  // --- Trust Jackpot Methods ---
  public getTrustJackpotSync(): number {
    return parseFloat(this.jackpot.trustJackpotGram || '0.00');
  }

  public isTrustJackpotActiveSync(): boolean {
    const cur = parseFloat(this.jackpot.trustJackpotGram || '0.00');
    const threshold = parseFloat(this.jackpot.thresholdGram || '5.00');
    return cur >= threshold;
  }

  public async getTrustJackpot(): Promise<number> {
    return this.getTrustJackpotSync();
  }

  public async getJackpotInfo(): Promise<{
    trustJackpotGram: string;
    isActive: boolean;
    thresholdGram: string;
    bonusPercentage: number;
    totalDistributedGram: string;
    totalCollectedGram: string;
  }> {
    const current = parseFloat(this.jackpot.trustJackpotGram || '0.00');
    const threshold = parseFloat(this.jackpot.thresholdGram || '5.00');
    return {
      trustJackpotGram: current.toFixed(2),
      isActive: current >= threshold,
      thresholdGram: threshold.toFixed(2),
      bonusPercentage: this.jackpot.bonusPercentage || 20,
      totalDistributedGram: this.jackpot.totalDistributedGram || '0.00',
      totalCollectedGram: this.jackpot.totalCollectedGram || '0.00',
    };
  }

  public async addTrustJackpot(amountGram: number): Promise<number> {
    if (isNaN(amountGram) || amountGram <= 0) return this.getTrustJackpot();
    const current = parseFloat(this.jackpot.trustJackpotGram || '0.00');
    const newBal = (current + amountGram).toFixed(2);
    const collected = (parseFloat(this.jackpot.totalCollectedGram || '0.00') + amountGram).toFixed(2);
    this.jackpot.trustJackpotGram = newBal;
    this.jackpot.totalCollectedGram = collected;
    this.jackpot.lastUpdated = Date.now();
    this.persistData();
    console.log(`[DatabaseService] Added ${amountGram.toFixed(2)} GRAM to Trust Jackpot. New balance: ${newBal} GRAM`);
    return parseFloat(newBal);
  }

  public async deductTrustJackpot(amountGram: number): Promise<number> {
    if (isNaN(amountGram) || amountGram <= 0) return this.getTrustJackpot();
    const current = parseFloat(this.jackpot.trustJackpotGram || '0.00');
    const deducted = Math.min(current, amountGram);
    const newBal = Math.max(0, current - deducted).toFixed(2);
    const distributed = (parseFloat(this.jackpot.totalDistributedGram || '0.00') + deducted).toFixed(2);
    this.jackpot.trustJackpotGram = newBal;
    this.jackpot.totalDistributedGram = distributed;
    this.jackpot.lastUpdated = Date.now();
    this.persistData();
    console.log(`[DatabaseService] Deducted ${deducted.toFixed(2)} GRAM from Trust Jackpot for bonus payout. New balance: ${newBal} GRAM`);
    return parseFloat(newBal);
  }
}

export const dbService = DatabaseService.getInstance();

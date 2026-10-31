import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Address } from '@ton/ton';
import { feeConfig } from '../config/feeConfig.js';
import { cleanPlayerName } from '../utils/cleanName.js';
import { UserRank, RANKS_CONFIG, RANKS_LIST, getRankFromXp, getUserFee, getNextRankProgress } from '../config/ranksConfig.js';

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
  xp?: number;
  rank?: UserRank;
  rankFeeGram?: number;
  nextRank?: UserRank | null;
  progressPercent?: number;
  xpInCurrentTier?: number;
  xpNeededForNextTier?: number;
  claimedRankRewards?: string[];
  freeRaffleTickets?: number;
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
  rankTier?: UserRank;
  xp?: number;
}

export interface UserAccount {
  walletAddress: string;
  telegramId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string; // Real Telegram display name (first_name + last_name)
  photoUrl?: string; // Telegram profile picture url
  languageCode?: string; // Telegram user client language (e.g. 'it', 'en', 'ru')
  customLanguageCode?: string; // Explicit language chosen via /lang
  hasExplicitLanguage?: boolean;
  referredBy?: string; // Telegram ID or wallet of recruiter
  referralEarningsGram?: string; // Total lifetime referral earnings in GRAM
  lastPlayedGame?: string; // Last played GameType for quick rematches & duels
  isBotBlocked?: boolean; // Whether user has blocked the bot
  botStartedAt?: number; // Timestamp when user first launched the bot
  balanceNano: string;
  balanceTon: string; // for backward compatibility
  balanceGram: string; // primary GRAM balance
  depositedTotalTon: string;
  depositedTotalGram: string;
  withdrawnTotalTon: string;
  withdrawnTotalGram: string;
  xp?: number;
  rank?: UserRank;
  claimedRankRewards?: string[];
  freeRaffleTickets?: number;
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
  type: 'DEPOSIT' | 'WITHDRAW' | 'MATCH_WIN' | 'MATCH_BET' | 'REMATCH_BET' | 'CREATION_FEE' | 'REFUND' | 'JACKPOT_BONUS' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'PROMO_CREATE' | 'PROMO_REDEEM' | 'PROMO_REFUND' | 'RAFFLE_TICKET' | 'RAFFLE_WIN' | 'CASINO_BET' | 'CASINO_WIN' | 'RANK_REWARD';
  amountNano: string;
  amountTon: string; // for backward compatibility
  amountGram: string; // primary GRAM amount
  timestamp: number;
  details?: string;
}

export interface StoredRaffle {
  id: string;
  title: string;
  badge?: string;
  prizeGram: number;
  ticketPriceGram: number;
  totalTickets: number; // tickets sold so far (or registered users for free raffles)
  freeParticipants?: Array<{ userId: string; username?: string; registeredAt: number }>;
  maxTickets?: number;
  endsAtEpoch: number;
  createdAt: number;
  isFeatured: boolean;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  color?: string;
  winnerUserId?: string;
  winnerUsername?: string;
  winnerTicketNumber?: number;
  drawnAt?: number;
}

export interface StoredRaffleTicket {
  id: string;
  raffleId: string;
  userId: string; // strictly Telegram user ID
  username?: string;
  ticketNumber: number;
  purchasedAt: number;
}

export interface FriendshipRecord {
  id: string;
  user1Key: string;
  user2Key: string;
  createdAt: number;
}

export interface FriendRequestRecord {
  id: string;
  fromUserKey: string;
  fromTelegramId?: string;
  fromUsername?: string;
  fromDisplayName?: string;
  fromPhotoUrl?: string;
  toUserKey: string;
  toTelegramId?: string;
  toUsername?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: number;
  updatedAt: number;
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

export interface JackpotAwardRecord {
  userA: string;
  userB: string;
  tgA?: string;
  tgB?: string;
  amountGram: number;
  matchId: string;
  timestamp: number;
}

export interface JackpotData {
  trustJackpotGram: string;
  thresholdGram: string;
  bonusPercentage: number;
  totalDistributedGram: string;
  totalCollectedGram: string;
  lastUpdated: number;
  awardsHistory?: JackpotAwardRecord[];
}

export interface GroupAffiliate {
  chatId: string;
  title: string;
  walletAddress: string;
  managerTelegramId?: string;
  managerUsername?: string;
  commissionRatePercent: number;
  totalMatchesHosted: number;
  totalVolumeGram: string;
  totalEarningsGram: string;
  configuredByAdminId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SystemSettings {
  maintenanceEnabled: boolean;
  maintenanceMessage?: string;
  adminTelegramIds: string[];
  updatedAt: number;
}

export interface PromoRequiredChat {
  chatId: string;
  chatUsername?: string;
  chatTitle?: string;
  chatType?: 'group' | 'supergroup' | 'channel';
}

export interface PromoCode {
  id: string;
  code: string;
  creatorTelegramId?: string;
  creatorWallet?: string;
  creatorUsername?: string;
  creatorDisplayName?: string;
  gramPerClaim: string;
  maxClaims: number;
  claimedCount: number;
  totalEscrowGram: string;
  remainingEscrowGram: string;
  expiresAt?: number;
  requiresPremium: boolean;
  requiredChatId?: string;
  requiredChatUsername?: string;
  requiredChatTitle?: string;
  requiredChats?: PromoRequiredChat[];
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';
  createdAt: number;
  refundedAt?: number;
}

export interface PromoCodeRedemption {
  id: string;
  promoCodeId: string;
  code: string;
  userTelegramId?: string;
  userWallet?: string;
  username?: string;
  displayName?: string;
  gramAwarded: string;
  redeemedAt: number;
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
  private groupAffiliates: Map<string, GroupAffiliate> = new Map();
  private friendships: Map<string, FriendshipRecord> = new Map();
  private friendRequests: Map<string, FriendRequestRecord> = new Map();
  private promoCodes: Map<string, PromoCode> = new Map();
  private promoRedemptions: PromoCodeRedemption[] = [];
  private transactions: BalanceTransaction[] = [];
  private treasury: TreasuryData;
  private jackpot: JackpotData;
  private dataDir: string;
  private filePath: string;
  private usersFilePath: string;
  private txFilePath: string;
  private treasuryFilePath: string;
  private jackpotFilePath: string;
  private groupsFilePath: string;
  private friendsFilePath: string;
  private friendRequestsFilePath: string;
  private promoCodesFilePath: string;
  private promoRedemptionsFilePath: string;
  private systemFilePath: string;
  private rafflesFilePath: string;
  private raffleTicketsFilePath: string;
  private raffles: Map<string, StoredRaffle> = new Map();
  private raffleTickets: StoredRaffleTicket[] = [];
  private systemSettings: SystemSettings;
  private initialized: boolean = false;

  private constructor() {
    this.dataDir = path.resolve(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'matches.json');
    this.usersFilePath = path.join(this.dataDir, 'users.json');
    this.txFilePath = path.join(this.dataDir, 'transactions.json');
    this.treasuryFilePath = path.join(this.dataDir, 'treasury.json');
    this.jackpotFilePath = path.join(this.dataDir, 'jackpot.json');
    this.groupsFilePath = path.join(this.dataDir, 'groups.json');
    this.friendsFilePath = path.join(this.dataDir, 'friends.json');
    this.friendRequestsFilePath = path.join(this.dataDir, 'friend_requests.json');
    this.promoCodesFilePath = path.join(this.dataDir, 'promocodes.json');
    this.promoRedemptionsFilePath = path.join(this.dataDir, 'promocode_redemptions.json');
    this.systemFilePath = path.join(this.dataDir, 'system.json');
    this.rafflesFilePath = path.join(this.dataDir, 'raffles.json');
    this.raffleTicketsFilePath = path.join(this.dataDir, 'raffle_tickets.json');

    const defaultAdmin = String(process.env.ADMIN_TELEGRAM_ID || '1052287650').trim();
    this.systemSettings = {
      maintenanceEnabled: false,
      maintenanceMessage: '',
      adminTelegramIds: [defaultAdmin],
      updatedAt: Date.now(),
    };

    const defaultTreasuryWallet =
      process.env.TREASURY_ADDRESS ||
      process.env.OWNER_ADDRESS ||
      'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

    this.jackpot = {
      trustJackpotGram: '5.00',
      thresholdGram: '5.00',
      bonusPercentage: 25,
      totalDistributedGram: '0.00',
      totalCollectedGram: '0.00',
      lastUpdated: Date.now(),
      awardsHistory: [],
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
        if (!this.jackpot.awardsHistory) {
          this.jackpot.awardsHistory = [];
        }
      } else {
        this.persistData();
      }

      if (fs.existsSync(this.groupsFilePath)) {
        const rawGroups = fs.readFileSync(this.groupsFilePath, 'utf-8');
        const groupList: GroupAffiliate[] = JSON.parse(rawGroups);
        this.groupAffiliates.clear();
        for (const g of groupList) {
          this.groupAffiliates.set(String(g.chatId), g);
        }
        console.log(`[DatabaseService] Loaded ${this.groupAffiliates.size} affiliate groups.`);
      } else {
        this.persistData();
      }

      if (fs.existsSync(this.friendsFilePath)) {
        const rawFriends = fs.readFileSync(this.friendsFilePath, 'utf-8');
        const list: FriendshipRecord[] = JSON.parse(rawFriends);
        this.friendships.clear();
        for (const f of list) {
          this.friendships.set(f.id, f);
        }
        console.log(`[DatabaseService] Loaded ${this.friendships.size} friendships.`);
      } else {
        fs.writeFileSync(this.friendsFilePath, JSON.stringify([], null, 2), 'utf-8');
      }

      if (fs.existsSync(this.friendRequestsFilePath)) {
        const rawReqs = fs.readFileSync(this.friendRequestsFilePath, 'utf-8');
        const list: FriendRequestRecord[] = JSON.parse(rawReqs);
        this.friendRequests.clear();
        for (const r of list) {
          this.friendRequests.set(r.id, r);
        }
        console.log(`[DatabaseService] Loaded ${this.friendRequests.size} friend requests.`);
      } else {
        fs.writeFileSync(this.friendRequestsFilePath, JSON.stringify([], null, 2), 'utf-8');
      }

      if (fs.existsSync(this.systemFilePath)) {
        try {
          const rawSystem = fs.readFileSync(this.systemFilePath, 'utf-8');
          const loaded = JSON.parse(rawSystem);
          const defaultAdmin = String(process.env.ADMIN_TELEGRAM_ID || '1052287650').trim();
          const adminList: string[] = Array.isArray(loaded.adminTelegramIds)
            ? loaded.adminTelegramIds.map((id: any) => String(id).trim()).filter(Boolean)
            : [];
          if (!adminList.includes(defaultAdmin)) {
            adminList.push(defaultAdmin);
          }
          this.systemSettings = {
            maintenanceEnabled: !!loaded.maintenanceEnabled,
            maintenanceMessage: loaded.maintenanceMessage || '',
            adminTelegramIds: adminList,
            updatedAt: loaded.updatedAt || Date.now(),
          };
          console.log(`[DatabaseService] Loaded system settings. Maintenance: ${this.systemSettings.maintenanceEnabled}, Admins: ${this.systemSettings.adminTelegramIds.length}`);
        } catch (e) {
          console.warn('[DatabaseService] Error reading system.json, using defaults:', e);
        }
      } else {
        this.persistSystemSettings();
      }

      if (fs.existsSync(this.promoCodesFilePath)) {
        try {
          const rawCodes = fs.readFileSync(this.promoCodesFilePath, 'utf-8');
          const codeList: PromoCode[] = JSON.parse(rawCodes);
          this.promoCodes.clear();
          for (const c of codeList) {
            this.promoCodes.set(c.code.toUpperCase(), c);
          }
          console.log(`[DatabaseService] Loaded ${this.promoCodes.size} promo codes.`);
        } catch (e) {
          console.warn('[DatabaseService] Error loading promocodes.json:', e);
        }
      } else {
        this.persistPromoCodes();
      }

      if (fs.existsSync(this.promoRedemptionsFilePath)) {
        try {
          const rawReds = fs.readFileSync(this.promoRedemptionsFilePath, 'utf-8');
          this.promoRedemptions = JSON.parse(rawReds);
          console.log(`[DatabaseService] Loaded ${this.promoRedemptions.length} promo redemptions.`);
        } catch (e) {
          console.warn('[DatabaseService] Error loading promocode_redemptions.json:', e);
        }
      } else {
        this.persistPromoCodes();
      }

      if (fs.existsSync(this.rafflesFilePath)) {
        try {
          const rawRaffles = fs.readFileSync(this.rafflesFilePath, 'utf-8');
          const list: StoredRaffle[] = JSON.parse(rawRaffles);
          this.raffles.clear();
          for (const r of list) {
            this.raffles.set(r.id, r);
          }
          console.log(`[DatabaseService] Loaded ${this.raffles.size} raffles.`);
        } catch (e) {
          console.warn('[DatabaseService] Error loading raffles.json:', e);
        }
      } else {
        this.persistRaffles();
      }

      if (fs.existsSync(this.raffleTicketsFilePath)) {
        try {
          const rawTickets = fs.readFileSync(this.raffleTicketsFilePath, 'utf-8');
          this.raffleTickets = JSON.parse(rawTickets);
          console.log(`[DatabaseService] Loaded ${this.raffleTickets.length} raffle tickets.`);
        } catch (e) {
          console.warn('[DatabaseService] Error loading raffle_tickets.json:', e);
        }
      } else {
        this.persistRaffles();
      }

      this.initialized = true;
    } catch (err) {
      console.warn('[DatabaseService] Warning loading database file:', err);
    }
  }

  public persistPromoCodes() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const promoList = Array.from(this.promoCodes.values());
      fs.writeFileSync(this.promoCodesFilePath, JSON.stringify(promoList, null, 2), 'utf-8');
      fs.writeFileSync(this.promoRedemptionsFilePath, JSON.stringify(this.promoRedemptions, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist promo codes to file:', err);
    }
  }

  private persistSystemSettings() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.systemFilePath, JSON.stringify(this.systemSettings, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist system settings to file:', err);
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

      const groupList = Array.from(this.groupAffiliates.values());
      fs.writeFileSync(this.groupsFilePath, JSON.stringify(groupList, null, 2), 'utf-8');

      const friendsList = Array.from(this.friendships.values());
      fs.writeFileSync(this.friendsFilePath, JSON.stringify(friendsList, null, 2), 'utf-8');

      const reqList = Array.from(this.friendRequests.values());
      fs.writeFileSync(this.friendRequestsFilePath, JSON.stringify(reqList, null, 2), 'utf-8');

      this.persistSystemSettings();
      this.persistPromoCodes();
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
    photoUrl?: string,
    firstName?: string,
    lastName?: string
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
      if (firstName && account.firstName !== firstName.trim()) {
        account.firstName = firstName.trim();
        changed = true;
      }
      if (lastName && account.lastName !== lastName.trim()) {
        account.lastName = lastName.trim();
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

      if (account.xp === undefined) {
        account.xp = 0;
        account.rank = 'wood';
        account.claimedRankRewards = [];
        account.freeRaffleTickets = 0;
        changed = true;
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
      firstName: firstName || (displayName ? displayName.trim().split(/\s+/)[0] : undefined),
      lastName: lastName,
      displayName: displayName || (username ? username : (cleanTgId ? `Duelist #${cleanTgId}` : 'Duelist')),
      photoUrl: photoUrl || '',
      balanceNano: '0',
      balanceTon: '0.00',
      balanceGram: '0.00',
      depositedTotalTon: '0.00',
      depositedTotalGram: '0.00',
      withdrawnTotalTon: '0.00',
      withdrawnTotalGram: '0.00',
      xp: 0,
      rank: 'wood',
      claimedRankRewards: [],
      freeRaffleTickets: 0,
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

  public async registerBotUser(user: {
    telegramId: string | number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    referredBy?: string;
  }): Promise<UserAccount> {
    const cleanTgId = String(user.telegramId).trim();
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
    const account = await this.getUserAccount(
      undefined,
      cleanTgId,
      user.username,
      fullName,
      undefined,
      user.firstName,
      user.lastName
    );

    let changed = false;
    if (
      user.languageCode &&
      !account.customLanguageCode &&
      !account.hasExplicitLanguage &&
      account.languageCode !== user.languageCode
    ) {
      account.languageCode = user.languageCode;
      changed = true;
    }
    if (user.referredBy && !account.referredBy && user.referredBy !== cleanTgId) {
      account.referredBy = user.referredBy;
      changed = true;
    }
    if (!account.botStartedAt) {
      account.botStartedAt = Date.now();
      changed = true;
    }
    if (account.isBotBlocked) {
      account.isBotBlocked = false;
      changed = true;
    }

    if (changed) {
      account.updatedAt = Date.now();
      this.persistData();
    }

    return account;
  }

  public async getReferredCount(identifier?: string): Promise<number> {
    if (!identifier) return 0;
    const clean = identifier.replace(/^ref_/, '').trim();
    let count = 0;
    for (const u of this.users.values()) {
      if (u.referredBy && (u.referredBy === clean || u.referredBy === `ref_${clean}` || u.referredBy === identifier)) {
        count++;
      }
    }
    return count;
  }

  public async getAllBotTelegramIds(): Promise<string[]> {
    const ids = new Set<string>();
    for (const u of this.users.values()) {
      if (u.telegramId && String(u.telegramId).trim() && !u.isBotBlocked) {
        ids.add(String(u.telegramId).trim());
      }
    }
    return Array.from(ids);
  }

  public async setBotUserBlocked(telegramId: string | number, blocked: boolean = true): Promise<void> {
    const cleanTg = String(telegramId).trim();
    const user = this.usersByTg.get(cleanTg);
    if (user && user.isBotBlocked !== blocked) {
      user.isBotBlocked = blocked;
      user.updatedAt = Date.now();
      this.persistData();
    }
  }

  public async updateUserLanguage(telegramId: string | number, languageCode: string): Promise<UserAccount | null> {
    const cleanTg = String(telegramId).trim();
    let user = this.usersByTg.get(cleanTg);
    if (!user) {
      user = await this.getUserAccount(undefined, cleanTg);
    }
    if (user) {
      user.customLanguageCode = languageCode;
      user.languageCode = languageCode;
      user.hasExplicitLanguage = true;
      user.updatedAt = Date.now();
      this.persistData();
      return user;
    }
    return null;
  }

  public async getUserLanguage(telegramId?: string | number): Promise<string | undefined> {
    if (!telegramId) return undefined;
    const cleanTg = String(telegramId).trim();
    const user = this.usersByTg.get(cleanTg);
    return user?.customLanguageCode || user?.languageCode;
  }

  public async setGroupAffiliate(config: {
    chatId: string | number;
    title?: string;
    walletAddress: string;
    managerTelegramId?: string | number;
    managerUsername?: string;
    commissionRatePercent?: number;
    configuredByAdminId: string | number;
  }): Promise<GroupAffiliate> {
    const cleanChatId = String(config.chatId).trim();
    const existing = this.groupAffiliates.get(cleanChatId);

    const friendlyWallet = this.toFriendlyAddress(config.walletAddress) || config.walletAddress.trim();
    const rate = config.commissionRatePercent !== undefined ? config.commissionRatePercent : (existing?.commissionRatePercent ?? 30);

    const record: GroupAffiliate = {
      chatId: cleanChatId,
      title: config.title || existing?.title || `Group ${cleanChatId}`,
      walletAddress: friendlyWallet,
      managerTelegramId: config.managerTelegramId ? String(config.managerTelegramId).trim() : existing?.managerTelegramId,
      managerUsername: config.managerUsername || existing?.managerUsername,
      commissionRatePercent: rate,
      totalMatchesHosted: existing?.totalMatchesHosted || 0,
      totalVolumeGram: existing?.totalVolumeGram || '0.00',
      totalEarningsGram: existing?.totalEarningsGram || '0.00',
      configuredByAdminId: String(config.configuredByAdminId),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    this.groupAffiliates.set(cleanChatId, record);
    this.persistData();
    console.log(`[DatabaseService] Configured group affiliate for ${record.title} (${cleanChatId}): wallet=${record.walletAddress}, rate=${record.commissionRatePercent}%`);
    return record;
  }

  public async getGroupAffiliate(chatId: string | number): Promise<GroupAffiliate | null> {
    const cleanId = String(chatId).trim();
    return this.groupAffiliates.get(cleanId) || null;
  }

  public async getAllGroupAffiliates(): Promise<GroupAffiliate[]> {
    return Array.from(this.groupAffiliates.values());
  }

  public async getGroupAffiliatesByManager(telegramId?: string | number, walletAddress?: string): Promise<GroupAffiliate[]> {
    const cleanTg = telegramId ? String(telegramId).trim() : '';
    const normWallet = walletAddress ? this.normalizeAddress(walletAddress) : '';

    return Array.from(this.groupAffiliates.values()).filter((g) => {
      if (cleanTg && g.managerTelegramId && String(g.managerTelegramId).trim() === cleanTg) return true;
      if (normWallet && g.walletAddress && this.normalizeAddress(g.walletAddress) === normWallet) return true;
      return false;
    });
  }

  public async removeGroupAffiliate(chatId: string | number): Promise<boolean> {
    const cleanId = String(chatId).trim();
    const deleted = this.groupAffiliates.delete(cleanId);
    if (deleted) {
      this.persistData();
    }
    return deleted;
  }

  public async recordGroupMatchRevenue(
    chatId: string | number,
    wagerGram: number,
    commissionGram: number
  ): Promise<{ commissionGram: string } | null> {
    const cleanId = String(chatId).trim();
    const group = this.groupAffiliates.get(cleanId);
    if (!group) return null;

    const totalMatchVolume = wagerGram * 2;
    const groupCut = commissionGram;
    const groupCutGram = groupCut.toFixed(4);

    group.totalMatchesHosted += 1;
    group.totalVolumeGram = (parseFloat(group.totalVolumeGram || '0') + totalMatchVolume).toFixed(2);
    group.totalEarningsGram = (parseFloat(group.totalEarningsGram || '0') + groupCut).toFixed(2);
    group.updatedAt = Date.now();

    // Credit the group manager's balance if greater than 0
    if (groupCut > 0 && group.walletAddress) {
      await this.creditUserBalance(
        group.walletAddress,
        groupCutGram,
        'MATCH_WIN',
        `Group affiliate commission from match in ${group.title} (#${cleanId})`,
        group.managerTelegramId
      );
    }

    this.persistData();
    console.log(`[DatabaseService] Credited ${groupCutGram} GRAM to group affiliate ${group.title} (${group.walletAddress})`);
    return { commissionGram: groupCutGram };
  }

  public async creditReferralEarnings(
    recruiterId: string,
    amountGram: number,
    matchId: string
  ): Promise<void> {
    if (amountGram <= 0) return;
    const cleanId = recruiterId.replace(/^ref_/, '').trim();
    const recruiterAccount = await this.getUserAccount(undefined, cleanId);
    const amountStr = amountGram.toFixed(4);

    const targetWallet = recruiterAccount.walletAddress || `tg_${cleanId}`;
    await this.creditUserBalance(
      targetWallet,
      amountStr,
      'MATCH_WIN',
      `Referral commission (15%-30%) from duel #${matchId}`,
      recruiterAccount.telegramId
    );

    recruiterAccount.referralEarningsGram = (
      parseFloat(recruiterAccount.referralEarningsGram || '0') + amountGram
    ).toFixed(4);
    recruiterAccount.updatedAt = Date.now();
    this.persistData();
    console.log(`[DatabaseService] Credited ${amountStr} GRAM referral commission to ${recruiterAccount.displayName || cleanId}`);
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
    type: 'DEPOSIT' | 'MATCH_WIN' | 'REFUND' | 'PROMO_REDEEM' | 'PROMO_REFUND' | 'RAFFLE_WIN' | 'CASINO_WIN' | 'RANK_REWARD',
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
    type: 'WITHDRAW' | 'MATCH_BET' | 'REMATCH_BET' | 'CREATION_FEE' | 'PROMO_CREATE' | 'RAFFLE_TICKET' | 'CASINO_BET',
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

  // --- Rank, XP, and Level-Up Methods ---

  public async addXp(walletAddress?: string, xpToAdd: number = 0, telegramId?: string): Promise<{
    account?: UserAccount;
    newRank?: UserRank;
    didLevelUp: boolean;
    rewardGram: number;
    rewardTickets: number;
  }> {
    if (xpToAdd <= 0) return { didLevelUp: false, rewardGram: 0, rewardTickets: 0 };
    const user = await this.getUserAccount(walletAddress, telegramId);
    if (!user) return { didLevelUp: false, rewardGram: 0, rewardTickets: 0 };

    const oldXp = user.xp || 0;
    const oldRank = user.rank || getRankFromXp(oldXp);
    const newXp = oldXp + xpToAdd;
    const newRank = getRankFromXp(newXp);

    user.xp = newXp;
    user.rank = newRank;

    let totalRewardGram = 0;
    let totalRewardTickets = 0;
    let didLevelUp = false;

    const ranksOrder = RANKS_LIST;
    const newRankIndex = ranksOrder.indexOf(newRank);
    const oldRankIndex = ranksOrder.indexOf(oldRank);

    if (newRankIndex > oldRankIndex) {
      didLevelUp = true;
    }

    const claimed = new Set(user.claimedRankRewards || []);
    for (let i = 1; i <= newRankIndex; i++) {
      const r = ranksOrder[i];
      if (!claimed.has(r)) {
        const cfg = RANKS_CONFIG[r];
        if (cfg.rewardGram > 0) {
          totalRewardGram += cfg.rewardGram;
          await this.creditUserBalance(
            user.walletAddress,
            cfg.rewardGram.toFixed(2),
            'RANK_REWARD',
            `Premio Level-Up Rank ${cfg.name} (+${cfg.rewardGram} GRAM)`,
            user.telegramId
          );
        }
        if (cfg.rewardTickets > 0) {
          totalRewardTickets += cfg.rewardTickets;
          user.freeRaffleTickets = (user.freeRaffleTickets || 0) + cfg.rewardTickets;
          this.awardFreeRaffleTickets(user.telegramId || '', user.username, cfg.rewardTickets);
        }
        claimed.add(r);
        console.log(`[DatabaseService] User ${user.telegramId || user.walletAddress} achieved Rank ${cfg.name}! Claimed ${cfg.rewardGram} GRAM & ${cfg.rewardTickets} tickets.`);
      }
    }

    user.claimedRankRewards = Array.from(claimed);
    this.persistData();

    return {
      account: user,
      newRank,
      didLevelUp,
      rewardGram: totalRewardGram,
      rewardTickets: totalRewardTickets,
    };
  }

  public awardFreeRaffleTickets(userId: string, username?: string, quantity: number = 1): void {
    const cleanUserId = String(userId).trim();
    if (!cleanUserId || quantity <= 0) return;

    const activeRaffle = Array.from(this.raffles.values()).find(
      (r) => r.status === 'ACTIVE' && Date.now() < r.endsAtEpoch && r.ticketPriceGram > 0
    );
    if (!activeRaffle) return;

    const startNum = activeRaffle.totalTickets + 1;
    for (let i = 0; i < quantity; i++) {
      const num = startNum + i;
      this.raffleTickets.push({
        id: `tkt_rank_${activeRaffle.id}_${num}_${Date.now()}`,
        raffleId: activeRaffle.id,
        userId: cleanUserId,
        username,
        ticketNumber: num,
        purchasedAt: Date.now(),
      });
    }
    activeRaffle.totalTickets += quantity;
    this.persistRaffles();
    console.log(`[DatabaseService] Awarded ${quantity} free tickets in Raffle ${activeRaffle.id} to user ${cleanUserId}`);
  }

  // --- Match and History Methods ---

  public async saveMatch(record: StoredMatch): Promise<void> {
    this.matches.set(record.matchId, record);
    this.indexMatch(record);
    this.leaderboardCache.clear();

    // Award XP to participants:
    // 15 XP for playing, +10 XP for winner, +5 XP per 1 GRAM wagered (capped at 100 XP)
    try {
      const wagerGram = parseFloat(record.wagerGram || record.wagerTon || '0');
      const volumeXp = Math.min(100, Math.floor(wagerGram * 5));

      const isWinnerA = record.winnerAddress === record.playerAAddress ||
        (record.winnerTelegramId && record.winnerTelegramId === record.playerATelegramId);
      const xpA = 15 + (isWinnerA ? 10 : 0) + volumeXp;
      await this.addXp(record.playerAAddress, xpA, record.playerATelegramId);

      if (record.playerBAddress || record.playerBTelegramId) {
        const isWinnerB = record.winnerAddress === record.playerBAddress ||
          (record.winnerTelegramId && record.winnerTelegramId === record.playerBTelegramId);
        const xpB = 15 + (isWinnerB ? 10 : 0) + volumeXp;
        await this.addXp(record.playerBAddress, xpB, record.playerBTelegramId);
      }
    } catch (e) {
      console.warn('[DatabaseService] Error awarding match XP:', e);
    }

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
        opponentName: cleanPlayerName(opponentName),
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

  public async setLastPlayedGame(telegramId: string | number, gameType: string): Promise<void> {
    const user = await this.getUserAccount(undefined, telegramId.toString());
    if (user) {
      user.lastPlayedGame = gameType;
      this.persistData();
    }
  }

  public async getLastPlayedGame(telegramId: string | number): Promise<string | null> {
    const user = await this.getUserAccount(undefined, telegramId.toString());
    if (user?.lastPlayedGame) {
      return user.lastPlayedGame;
    }
    const tgIdStr = telegramId.toString();
    const resolvedTgId = this.resolveTelegramId(undefined, tgIdStr) || tgIdStr;
    const matches = this.matchesByTg.get(resolvedTgId) || [];
    if (matches.length > 0) {
      const sorted = [...matches].sort((a, b) => (b.settledAt || b.createdAt || 0) - (a.settledAt || a.createdAt || 0));
      for (const m of sorted) {
        if (m.gameType) return m.gameType;
      }
    }
    const allMatches = Array.from(this.matches.values()).filter(
      (m) => String(m.playerATelegramId) === tgIdStr || String(m.playerBTelegramId) === tgIdStr
    );
    if (allMatches.length > 0) {
      allMatches.sort((a, b) => (b.settledAt || b.createdAt || 0) - (a.settledAt || a.createdAt || 0));
      for (const m of allMatches) {
        if (m.gameType) return m.gameType;
      }
    }
    return null;
  }

  public async getRecentWins(limit: number = 15): Promise<{
    id: string;
    winnerName: string;
    gameType: string;
    payoutGram: string;
    timestamp: number;
  }[]> {
    const allMatches = Array.from(this.matches.values());
    const settled = allMatches.filter(
      (m) =>
        Boolean(m.winnerName || m.winnerAddress) &&
        m.winnerName !== 'Doppio Tradimento (Nessun Vincitore)' &&
        m.winnerName !== 'Pace (Entrambi Split)'
    );

    settled.sort((a, b) => (b.settledAt || b.createdAt || 0) - (a.settledAt || a.createdAt || 0));

    return settled.slice(0, limit).map((m) => {
      const payout =
        m.payoutGram ||
        m.payoutTon ||
        (parseFloat(m.wagerGram || m.wagerTon || '1.0') * (m.gameType === 'split' ? 2.0 : 1.92)).toFixed(2);
      return {
        id: `win_${m.matchId}`,
        winnerName: cleanPlayerName(m.winnerName || 'Sfida Duelist'),
        gameType: m.gameType || 'roulette',
        payoutGram: payout,
        timestamp: m.settledAt || m.createdAt || Date.now(),
      };
    });
  }

  public async getUserStats(walletAddress?: string, telegramId?: string): Promise<UserStats> {
    const resolvedTgId = this.resolveTelegramId(walletAddress, telegramId);
    const targetNorm = walletAddress ? this.normalizeAddress(walletAddress) : '';

    const userAcc = resolvedTgId
      ? this.usersByTg.get(resolvedTgId)
      : (targetNorm ? (this.usersByWallet.get(targetNorm) || this.usersByWallet.get(walletAddress!.toLowerCase())) : undefined);

    const history = await this.getUserHistory(walletAddress, telegramId);

    // If mockStats present on seeded user and match history is minimal sample, return mockStats directly
    if (userAcc?.mockStats && history.length <= 2) {
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

    let xp = userAcc?.xp;
    if (xp === undefined) {
      // Historical calculation for existing users
      const totalWagerVolume = history.reduce((acc, h) => acc + (parseFloat(h.wagerGram || h.wagerTon) || 0), 0);
      xp = (duelsPlayed * 15) + (duelsWon * 10) + Math.min(5000, Math.floor(totalWagerVolume * 5));
      if (userAcc) {
        userAcc.xp = xp;
        userAcc.rank = getRankFromXp(xp);
        this.persistData();
      }
    }

    const rank = userAcc?.rank || getRankFromXp(xp || 0);
    const rankFeeGram = getUserFee(rank);
    const progress = getNextRankProgress(xp || 0);

    return {
      duelsPlayed,
      duelsWon,
      winRate,
      bestReaction,
      totalProfitsTon: totalProfits,
      totalProfitsGram: totalProfits,
      dailyStreak,
      hasWonToday,
      xp: xp || 0,
      rank,
      rankFeeGram,
      nextRank: progress.nextRank,
      progressPercent: progress.progressPercent,
      xpInCurrentTier: progress.xpInCurrentTier,
      xpNeededForNextTier: progress.xpNeededForNextTier,
      claimedRankRewards: userAcc?.claimedRankRewards || [],
      freeRaffleTickets: userAcc?.freeRaffleTickets || 0,
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

        let cleanName = cleanPlayerName(userAcc?.displayName || userAcc?.username || name);
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
        // Skip placeholder 'Duelist #' accounts that have no recorded wins
        if (group.username.startsWith('Duelist') && stats.duelsWon === 0) continue;

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
          rankTier: stats.rank || 'wood',
          xp: stats.xp || 0,
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
          rankTier: stats.rank || 'wood',
          xp: stats.xp || 0,
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
    probabilityPercentage: number;
    minWagerGram: number;
    cooldownHours: number;
    totalDistributedGram: string;
    totalCollectedGram: string;
  }> {
    const current = parseFloat(this.jackpot.trustJackpotGram || '0.00');
    const threshold = parseFloat(this.jackpot.thresholdGram || '5.00');
    const {
      minWagerSplitGram = 5.0,
      splitJackpotBonusPercent = 25,
      splitJackpotProbabilityPercent = 30,
      splitJackpotCooldownHours = 48,
    } = feeConfig.getConfig();

    return {
      trustJackpotGram: current.toFixed(2),
      isActive: current >= threshold,
      thresholdGram: threshold.toFixed(2),
      bonusPercentage: splitJackpotBonusPercent,
      probabilityPercentage: splitJackpotProbabilityPercent,
      minWagerGram: minWagerSplitGram,
      cooldownHours: splitJackpotCooldownHours,
      totalDistributedGram: this.jackpot.totalDistributedGram || '0.00',
      totalCollectedGram: this.jackpot.totalCollectedGram || '0.00',
    };
  }

  public async canPairReceiveJackpot(
    walletA: string,
    walletB: string,
    tgA?: string,
    tgB?: string
  ): Promise<{ eligible: boolean; reason?: 'COOLDOWN_48H' | 'REFERRAL_CONNECTED' | 'INELIGIBLE' }> {
    // 1. Referral Lock check
    const accA = await this.getUserAccount(walletA, tgA);
    const accB = await this.getUserAccount(walletB, tgB);

    const refA = accA?.referredBy?.trim();
    const refB = accB?.referredBy?.trim();
    const idA = (tgA || accA?.telegramId)?.trim();
    const idB = (tgB || accB?.telegramId)?.trim();
    const wA = walletA?.trim().toLowerCase();
    const wB = walletB?.trim().toLowerCase();

    // Check if A referred B
    if (refA && ((idB && refA === idB) || (wB && refA.toLowerCase() === wB))) {
      return { eligible: false, reason: 'REFERRAL_CONNECTED' };
    }
    // Check if B referred A
    if (refB && ((idA && refB === idA) || (wA && refB.toLowerCase() === wA))) {
      return { eligible: false, reason: 'REFERRAL_CONNECTED' };
    }
    // Check if both share the same referrer
    if (refA && refB && refA.toLowerCase() === refB.toLowerCase()) {
      return { eligible: false, reason: 'REFERRAL_CONNECTED' };
    }

    // 2. 48-hour Cooldown check between the same pair of players
    const { splitJackpotCooldownHours = 48 } = feeConfig.getConfig();
    const cooldownMs = splitJackpotCooldownHours * 60 * 60 * 1000;
    const now = Date.now();
    const awards = this.jackpot.awardsHistory || [];

    const isMatch = (r: JackpotAwardRecord) => {
      const matchA =
        (idA && (r.tgA === idA || r.tgB === idA)) ||
        (wA && (r.userA.toLowerCase() === wA || r.userB.toLowerCase() === wA));
      const matchB =
        (idB && (r.tgA === idB || r.tgB === idB)) ||
        (wB && (r.userA.toLowerCase() === wB || r.userB.toLowerCase() === wB));
      return Boolean(matchA && matchB);
    };

    const recentAward = awards.find((r) => isMatch(r) && now - r.timestamp < cooldownMs);
    if (recentAward) {
      return { eligible: false, reason: 'COOLDOWN_48H' };
    }

    return { eligible: true };
  }

  public async recordJackpotAward(
    walletA: string,
    walletB: string,
    amountGram: number,
    matchId: string,
    tgA?: string,
    tgB?: string
  ): Promise<void> {
    if (!this.jackpot.awardsHistory) {
      this.jackpot.awardsHistory = [];
    }
    this.jackpot.awardsHistory.push({
      userA: walletA,
      userB: walletB,
      tgA,
      tgB,
      amountGram,
      matchId,
      timestamp: Date.now(),
    });
    if (this.jackpot.awardsHistory.length > 1000) {
      this.jackpot.awardsHistory = this.jackpot.awardsHistory.slice(-1000);
    }
    this.persistData();
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

  // --- Friends & Social Infrastructure ---
  public getUserCanonicalKey(walletAddress?: string, telegramId?: string | number): string {
    const cleanTg = telegramId ? String(telegramId).trim() : '';
    if (cleanTg) return `tg_${cleanTg}`;
    if (walletAddress) {
      const norm = this.normalizeAddress(walletAddress);
      if (norm) return norm;
      return walletAddress.toLowerCase();
    }
    return '';
  }

  public findUser(identifier: string): UserAccount | null {
    if (!identifier) return null;
    const clean = identifier.trim();
    const cleanLower = clean.toLowerCase();
    const cleanUname = cleanLower.replace(/^@/, '');

    // 1. By Telegram ID
    let account = this.usersByTg.get(clean) || this.usersByTg.get(cleanLower);
    if (account) return account;

    // 2. By Username
    account = this.usersByUsername.get(cleanUname);
    if (account) return account;

    // 3. By Wallet Address
    const norm = this.normalizeAddress(clean);
    if (norm) {
      account = this.usersByWallet.get(norm);
      if (account) return account;
    }
    account = this.usersByWallet.get(cleanLower);
    if (account) return account;

    // 4. By Storage key or scan
    for (const [key, u] of this.users.entries()) {
      if (
        key === clean ||
        key === cleanLower ||
        key === `tg_${clean}` ||
        u.telegramId === clean ||
        (u.username && u.username.toLowerCase() === cleanUname) ||
        (u.walletAddress && u.walletAddress.toLowerCase() === cleanLower)
      ) {
        return u;
      }
    }
    return null;
  }

  public async getFriends(identifier: string): Promise<UserAccount[]> {
    const user = this.findUser(identifier);
    if (!user) return [];
    const userKey = this.getUserCanonicalKey(user.walletAddress, user.telegramId);

    const friendAccounts: UserAccount[] = [];
    const seen = new Set<string>();

    for (const friendship of this.friendships.values()) {
      let otherKey = '';
      if (friendship.user1Key === userKey) {
        otherKey = friendship.user2Key;
      } else if (friendship.user2Key === userKey) {
        otherKey = friendship.user1Key;
      }

      if (otherKey && !seen.has(otherKey)) {
        seen.add(otherKey);
        const friend = this.findUser(otherKey);
        if (friend) {
          friendAccounts.push(friend);
        }
      }
    }

    return friendAccounts;
  }

  public async getFriendRequests(identifier: string): Promise<{
    incoming: FriendRequestRecord[];
    outgoing: FriendRequestRecord[];
  }> {
    const user = this.findUser(identifier);
    if (!user) return { incoming: [], outgoing: [] };
    const userKey = this.getUserCanonicalKey(user.walletAddress, user.telegramId);

    const incoming: FriendRequestRecord[] = [];
    const outgoing: FriendRequestRecord[] = [];

    for (const req of this.friendRequests.values()) {
      if (req.status !== 'PENDING') continue;
      if (req.toUserKey === userKey) {
        incoming.push(req);
      } else if (req.fromUserKey === userKey) {
        outgoing.push(req);
      }
    }

    return { incoming, outgoing };
  }

  public async sendFriendRequest(
    senderIdentifier: string,
    recipientIdentifier: string
  ): Promise<{ success: boolean; request?: FriendRequestRecord; error?: string }> {
    const sender = this.findUser(senderIdentifier);
    if (!sender) return { success: false, error: 'Mittente non trovato' };

    const recipient = this.findUser(recipientIdentifier);
    if (!recipient) return { success: false, error: 'Utente non trovato su Sfida Arena' };

    const senderKey = this.getUserCanonicalKey(sender.walletAddress, sender.telegramId);
    const recipientKey = this.getUserCanonicalKey(recipient.walletAddress, recipient.telegramId);

    if (senderKey === recipientKey) {
      return { success: false, error: 'Non puoi inviare una richiesta di amicizia a te stesso' };
    }

    // Check if already friends
    const friendshipId1 = `fs_${senderKey}_${recipientKey}`;
    const friendshipId2 = `fs_${recipientKey}_${senderKey}`;
    if (this.friendships.has(friendshipId1) || this.friendships.has(friendshipId2)) {
      return { success: false, error: 'Siete già amici!' };
    }

    // Check existing pending request
    for (const req of this.friendRequests.values()) {
      if (req.status === 'PENDING') {
        if (req.fromUserKey === senderKey && req.toUserKey === recipientKey) {
          return { success: false, error: 'Hai già una richiesta di amicizia in attesa per questo utente' };
        }
        if (req.fromUserKey === recipientKey && req.toUserKey === senderKey) {
          // Reciprocal request: auto-accept!
          req.status = 'ACCEPTED';
          req.updatedAt = Date.now();
          this.friendships.set(friendshipId1, {
            id: friendshipId1,
            user1Key: senderKey,
            user2Key: recipientKey,
            createdAt: Date.now(),
          });
          this.persistData();
          return { success: true, request: req };
        }
      }
    }

    const reqId = `freq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const requestRecord: FriendRequestRecord = {
      id: reqId,
      fromUserKey: senderKey,
      fromTelegramId: sender.telegramId,
      fromUsername: sender.username,
      fromDisplayName: sender.displayName || sender.username || 'Un duellante',
      fromPhotoUrl: sender.photoUrl,
      toUserKey: recipientKey,
      toTelegramId: recipient.telegramId,
      toUsername: recipient.username,
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.friendRequests.set(reqId, requestRecord);
    this.persistData();
    return { success: true, request: requestRecord };
  }

  public async respondFriendRequest(
    requestId: string,
    userIdentifier: string,
    action: 'ACCEPT' | 'DECLINE'
  ): Promise<{ success: boolean; error?: string; request?: FriendRequestRecord }> {
    const req = this.friendRequests.get(requestId);
    if (!req) return { success: false, error: 'Richiesta non trovata' };
    if (req.status !== 'PENDING') return { success: false, error: 'Questa richiesta è già stata gestita' };

    const user = this.findUser(userIdentifier);
    if (!user) return { success: false, error: 'Utente non trovato' };
    const userKey = this.getUserCanonicalKey(user.walletAddress, user.telegramId);

    if (req.toUserKey !== userKey) {
      return { success: false, error: 'Non sei autorizzato a gestire questa richiesta' };
    }

    if (action === 'DECLINE') {
      req.status = 'DECLINED';
      req.updatedAt = Date.now();
      this.persistData();
      return { success: true, request: req };
    }

    req.status = 'ACCEPTED';
    req.updatedAt = Date.now();
    const friendshipId = `fs_${req.fromUserKey}_${req.toUserKey}`;
    this.friendships.set(friendshipId, {
      id: friendshipId,
      user1Key: req.fromUserKey,
      user2Key: req.toUserKey,
      createdAt: Date.now(),
    });

    this.persistData();
    return { success: true, request: req };
  }

  public async removeFriend(userIdentifier: string, friendIdentifier: string): Promise<boolean> {
    const user = this.findUser(userIdentifier);
    const friend = this.findUser(friendIdentifier);
    if (!user || !friend) return false;

    const userKey = this.getUserCanonicalKey(user.walletAddress, user.telegramId);
    const friendKey = this.getUserCanonicalKey(friend.walletAddress, friend.telegramId);

    const fs1 = `fs_${userKey}_${friendKey}`;
    const fs2 = `fs_${friendKey}_${userKey}`;

    let removed = false;
    if (this.friendships.delete(fs1)) removed = true;
    if (this.friendships.delete(fs2)) removed = true;

    if (removed) {
      this.persistData();
    }
    return removed;
  }

  public async transferBalance(
    senderIdentifier: string,
    recipientIdentifier: string,
    amountGram: string,
    note?: string
  ): Promise<{ success: boolean; error?: string; senderAccount?: UserAccount; recipientAccount?: UserAccount }> {
    const sender = this.findUser(senderIdentifier);
    if (!sender) return { success: false, error: 'Mittente non trovato' };

    const recipient = this.findUser(recipientIdentifier);
    if (!recipient) return { success: false, error: 'Destinatario non trovato. Verifica lo username o ID.' };

    const senderKey = this.getUserCanonicalKey(sender.walletAddress, sender.telegramId);
    const recipientKey = this.getUserCanonicalKey(recipient.walletAddress, recipient.telegramId);

    if (senderKey === recipientKey) {
      return { success: false, error: 'Non puoi inviare un tip a te stesso!' };
    }

    const amtNum = parseFloat(amountGram);
    if (isNaN(amtNum) || amtNum <= 0) {
      return { success: false, error: 'Importo non valido' };
    }
    if (amtNum < 0.1) {
      return { success: false, error: 'L\'importo minimo per un tip è di 0.10 GRAM' };
    }

    const curBal = parseFloat(sender.balanceGram || sender.balanceTon || '0');
    if (curBal < amtNum) {
      return { success: false, error: `Saldo insufficiente: hai ${curBal.toFixed(2)} GRAM, stai provando a inviare ${amtNum.toFixed(2)} GRAM` };
    }

    const amtStr = amtNum.toFixed(2);
    const senderNewBal = (curBal - amtNum).toFixed(2);
    sender.balanceGram = senderNewBal;
    sender.balanceTon = senderNewBal;
    sender.balanceNano = BigInt(Math.round(parseFloat(senderNewBal) * 1e9)).toString();
    sender.updatedAt = Date.now();

    const recipientCur = parseFloat(recipient.balanceGram || recipient.balanceTon || '0');
    const recipientNewBal = (recipientCur + amtNum).toFixed(2);
    recipient.balanceGram = recipientNewBal;
    recipient.balanceTon = recipientNewBal;
    recipient.balanceNano = BigInt(Math.round(parseFloat(recipientNewBal) * 1e9)).toString();
    recipient.updatedAt = Date.now();

    const senderDesc = `Tip a @${recipient.username || recipient.displayName}${note ? ': ' + note : ''}`;
    const recipientDesc = `Tip da @${sender.username || sender.displayName}${note ? ': ' + note : ''}`;

    this.transactions.push({
      id: `tx_${Date.now()}_tip_out`,
      walletAddress: sender.walletAddress,
      type: 'TRANSFER_OUT',
      amountNano: BigInt(Math.round(amtNum * 1e9)).toString(),
      amountTon: amtStr,
      amountGram: amtStr,
      timestamp: Date.now(),
      details: senderDesc,
    });

    this.transactions.push({
      id: `tx_${Date.now()}_tip_in`,
      walletAddress: recipient.walletAddress,
      type: 'TRANSFER_IN',
      amountNano: BigInt(Math.round(amtNum * 1e9)).toString(),
      amountTon: amtStr,
      amountGram: amtStr,
      timestamp: Date.now(),
      details: recipientDesc,
    });

    this.persistData();
    console.log(`[DatabaseService] Transfer/Tip: ${amtStr} GRAM from ${sender.displayName} to ${recipient.displayName}`);
    return { success: true, senderAccount: sender, recipientAccount: recipient };
  }

  /**
   * Returns whether maintenance mode is currently active.
   */
  public isMaintenanceMode(): boolean {
    return !!this.systemSettings.maintenanceEnabled;
  }

  /**
   * Sets the maintenance mode on or off.
   */
  public setMaintenanceMode(enabled: boolean, message?: string): boolean {
    this.systemSettings.maintenanceEnabled = enabled;
    if (message !== undefined) {
      this.systemSettings.maintenanceMessage = message;
    }
    this.systemSettings.updatedAt = Date.now();
    this.persistSystemSettings();
    console.log(`[DatabaseService] Maintenance mode set to: ${enabled}`);
    return this.systemSettings.maintenanceEnabled;
  }

  /**
   * Returns the optional maintenance notice message.
   */
  public getMaintenanceMessage(): string {
    return this.systemSettings.maintenanceMessage || '';
  }

  /**
   * Checks whether a given Telegram user ID is an authorized administrator.
   */
  public isBotAdmin(telegramId?: string | number): boolean {
    if (!telegramId) return false;
    const idStr = String(telegramId).trim();
    const defaultAdmin = String(process.env.ADMIN_TELEGRAM_ID || '1052287650').trim();
    if (idStr === defaultAdmin) return true;
    return this.systemSettings.adminTelegramIds.includes(idStr);
  }

  /**
   * Adds a new administrator by Telegram ID.
   */
  public addAdmin(telegramId: string | number): boolean {
    const idStr = String(telegramId).trim();
    if (!idStr) return false;
    if (!this.systemSettings.adminTelegramIds.includes(idStr)) {
      this.systemSettings.adminTelegramIds.push(idStr);
      this.systemSettings.updatedAt = Date.now();
      this.persistSystemSettings();
      console.log(`[DatabaseService] Added new admin: ${idStr}`);
    }
    return true;
  }

  /**
   * Removes an administrator by Telegram ID.
   * Root superadmin (1052287650 or process.env.ADMIN_TELEGRAM_ID) can never be removed.
   */
  public removeAdmin(telegramId: string | number): boolean {
    const idStr = String(telegramId).trim();
    const defaultAdmin = String(process.env.ADMIN_TELEGRAM_ID || '1052287650').trim();
    if (idStr === defaultAdmin) return false;
    const idx = this.systemSettings.adminTelegramIds.indexOf(idStr);
    if (idx !== -1) {
      this.systemSettings.adminTelegramIds.splice(idx, 1);
      this.systemSettings.updatedAt = Date.now();
      this.persistSystemSettings();
      console.log(`[DatabaseService] Removed admin: ${idStr}`);
      return true;
    }
    return false;
  }

  /**
   * Returns the list of all registered administrator Telegram IDs.
   */
  public getAdmins(): string[] {
    const defaultAdmin = String(process.env.ADMIN_TELEGRAM_ID || '1052287650').trim();
    const set = new Set([defaultAdmin, ...this.systemSettings.adminTelegramIds]);
    return Array.from(set);
  }

  /**
   * Safe comparison of two TON wallet addresses.
   */
  public isSameWallet(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    return this.normalizeAddress(a) === this.normalizeAddress(b);
  }

  /**
   * Refreshes the status of a promo code based on expiration and claim counts,
   * automatically refunding unspent escrow back to creator if expired.
   */
  public async refreshPromoCodeStatus(promo: PromoCode): Promise<PromoCode> {
    if (promo.status === 'ACTIVE') {
      if (promo.claimedCount >= promo.maxClaims) {
        promo.status = 'EXHAUSTED';
        promo.remainingEscrowGram = '0.00';
        this.persistPromoCodes();
      } else if (promo.expiresAt && Date.now() > promo.expiresAt) {
        promo.status = 'EXPIRED';
        const remaining = parseFloat(promo.remainingEscrowGram || '0');
        if (remaining > 0 && !promo.refundedAt) {
          promo.refundedAt = Date.now();
          promo.remainingEscrowGram = '0.00';
          const refundTarget = promo.creatorWallet || (promo.creatorTelegramId ? `tg_${promo.creatorTelegramId}` : '');
          if (refundTarget) {
            try {
              await this.creditUserBalance(
                refundTarget,
                remaining.toFixed(2),
                'REFUND',
                `Rimborso Promo Code scaduto #${promo.code}`,
                promo.creatorTelegramId
              );
            } catch (refErr) {
              console.warn(`[DatabaseService] Failed to refund expired promo code #${promo.code}:`, refErr);
            }
          }
        }
        this.persistPromoCodes();
      }
    }
    return promo;
  }

  /**
   * Creates a new promotional code funded from the creator's balance.
   */
  public async createPromoCode(params: {
    creatorTelegramId?: string | number;
    creatorWallet?: string;
    creatorUsername?: string;
    creatorDisplayName?: string;
    gramPerClaim: string | number;
    maxClaims: number;
    expiryHours?: number;
    requiresPremium?: boolean;
    requiredChatId?: string;
    requiredChatUsername?: string;
    requiredChatTitle?: string;
    requiredChats?: PromoRequiredChat[];
  }): Promise<{ success: boolean; promoCode?: PromoCode; error?: string }> {
    const maxClaims = Math.max(1, Math.floor(Number(params.maxClaims) || 1));
    const gramPerClaimNum = parseFloat(String(params.gramPerClaim || '0'));
    if (isNaN(gramPerClaimNum) || gramPerClaimNum <= 0) {
      return { success: false, error: 'INVALID_AMOUNT' };
    }

    const totalCostNum = gramPerClaimNum * maxClaims;
    const totalCostStr = totalCostNum.toFixed(2);
    const gramPerClaimStr = gramPerClaimNum.toFixed(2);

    const cleanTgId = params.creatorTelegramId ? String(params.creatorTelegramId).trim() : undefined;
    const cleanWallet = params.creatorWallet ? this.toFriendlyAddress(params.creatorWallet) || params.creatorWallet.trim() : undefined;

    if (!cleanTgId && !cleanWallet) {
      return { success: false, error: 'CREATOR_REQUIRED' };
    }

    // Lookup creator account and verify balance
    const creator = await this.getUserAccount(cleanWallet, cleanTgId, params.creatorUsername, params.creatorDisplayName);
    const curBal = parseFloat(creator.balanceGram || creator.balanceTon || '0');

    if (curBal < totalCostNum) {
      return { success: false, error: 'INSUFFICIENT_BALANCE' };
    }

    // Debit balance from creator
    const debitRes = await this.debitUserBalance(
      creator.walletAddress || `tg_${cleanTgId}`,
      totalCostStr,
      'PROMO_CREATE',
      `Creazione Promo Code (${maxClaims}x ${gramPerClaimStr} GRAM)`,
      cleanTgId
    );

    if (!debitRes.success) {
      return { success: false, error: debitRes.error || 'DEBIT_FAILED' };
    }

    // Generate unique code: SFIDA-XXXX-XXXX (using unambiguous chars)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    let attempts = 0;
    while (!code || this.promoCodes.has(code)) {
      attempts++;
      let chunk1 = '';
      let chunk2 = '';
      for (let i = 0; i < 4; i++) {
        chunk1 += chars.charAt(Math.floor(Math.random() * chars.length));
        chunk2 += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `SFIDA-${chunk1}-${chunk2}`;
      if (attempts > 50) {
        code = `SFIDA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        break;
      }
    }

    const expiresAt = params.expiryHours && params.expiryHours > 0
      ? Date.now() + Math.round(params.expiryHours * 3600 * 1000)
      : undefined;

    // Handle required chats list
    const requiredChats = params.requiredChats && params.requiredChats.length > 0
      ? params.requiredChats
      : (params.requiredChatId
          ? [{
              chatId: String(params.requiredChatId).trim(),
              chatUsername: params.requiredChatUsername ? params.requiredChatUsername.replace(/^@/, '').trim() : undefined,
              chatTitle: params.requiredChatTitle ? params.requiredChatTitle.trim() : undefined,
              chatType: 'group' as const,
            }]
          : undefined);

    const primaryChat = requiredChats && requiredChats.length > 0 ? requiredChats[0] : undefined;

    const promoCode: PromoCode = {
      id: `promo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      creatorTelegramId: cleanTgId,
      creatorWallet: creator.walletAddress || cleanWallet,
      creatorUsername: creator.username || params.creatorUsername,
      creatorDisplayName: creator.displayName || params.creatorDisplayName,
      gramPerClaim: gramPerClaimStr,
      maxClaims,
      claimedCount: 0,
      totalEscrowGram: totalCostStr,
      remainingEscrowGram: totalCostStr,
      expiresAt,
      requiresPremium: !!params.requiresPremium,
      requiredChatId: primaryChat ? primaryChat.chatId : (params.requiredChatId ? String(params.requiredChatId).trim() : undefined),
      requiredChatUsername: primaryChat?.chatUsername || (params.requiredChatUsername ? params.requiredChatUsername.replace(/^@/, '').trim() : undefined),
      requiredChatTitle: primaryChat?.chatTitle || (params.requiredChatTitle ? params.requiredChatTitle.trim() : undefined),
      requiredChats,
      status: 'ACTIVE',
      createdAt: Date.now(),
    };

    this.promoCodes.set(code.toUpperCase(), promoCode);
    this.persistPromoCodes();
    console.log(`[DatabaseService] Created PromoCode ${code} for ${creator.displayName} (${totalCostStr} GRAM in escrow, ${maxClaims} claims)`);
    return { success: true, promoCode };
  }

  /**
   * Retrieves a promo code by code string and refreshes its status.
   */
  public async getPromoCode(code: string): Promise<PromoCode | null> {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const promo = this.promoCodes.get(clean);
    if (!promo) return null;
    await this.refreshPromoCodeStatus(promo);
    return promo;
  }

  /**
   * Retrieves all promo codes created by a specific user.
   */
  public async getPromoCodesByCreator(creatorTelegramId?: string | number, creatorWallet?: string): Promise<PromoCode[]> {
    const cleanTg = creatorTelegramId ? String(creatorTelegramId).trim() : undefined;
    const normWallet = creatorWallet ? this.normalizeAddress(creatorWallet) : undefined;

    const results: PromoCode[] = [];
    for (const p of this.promoCodes.values()) {
      let isOwner = false;
      if (cleanTg && p.creatorTelegramId && String(p.creatorTelegramId).trim() === cleanTg) {
        isOwner = true;
      }
      if (!isOwner && normWallet && p.creatorWallet && this.normalizeAddress(p.creatorWallet) === normWallet) {
        isOwner = true;
      }
      if (isOwner) {
        await this.refreshPromoCodeStatus(p);
        results.push(p);
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Checks whether a user has already redeemed a promo code.
   */
  public hasUserRedeemedPromo(promoCodeId: string, telegramId?: string | number, walletAddress?: string): boolean {
    const cleanTg = telegramId ? String(telegramId).trim() : undefined;
    const normWallet = walletAddress ? this.normalizeAddress(walletAddress) : undefined;

    return this.promoRedemptions.some((r) => {
      if (r.promoCodeId !== promoCodeId) return false;
      if (cleanTg && r.userTelegramId && String(r.userTelegramId).trim() === cleanTg) return true;
      if (normWallet && r.userWallet && this.normalizeAddress(r.userWallet) === normWallet) return true;
      return false;
    });
  }

  /**
   * Records a redemption, decrements escrow, increments claimed count, and credits the user.
   */
  public async recordPromoRedemption(params: {
    promoCode: PromoCode;
    userTelegramId?: string | number;
    userWallet?: string;
    username?: string;
    displayName?: string;
  }): Promise<{ success: boolean; gramAwarded?: string; promoCode?: PromoCode; error?: string }> {
    const promo = params.promoCode;
    await this.refreshPromoCodeStatus(promo);

    if (promo.status !== 'ACTIVE' || promo.claimedCount >= promo.maxClaims) {
      return { success: false, error: promo.status === 'EXPIRED' ? 'EXPIRED' : 'EXHAUSTED' };
    }

    const awardStr = promo.gramPerClaim;
    const awardNum = parseFloat(awardStr) || 0;
    promo.claimedCount += 1;
    const curRemaining = Math.max(0, parseFloat(promo.remainingEscrowGram || '0') - awardNum);
    promo.remainingEscrowGram = curRemaining.toFixed(2);

    if (promo.claimedCount >= promo.maxClaims) {
      promo.status = 'EXHAUSTED';
    }

    const cleanTg = params.userTelegramId ? String(params.userTelegramId).trim() : undefined;
    const redemption: PromoCodeRedemption = {
      id: `pcr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      promoCodeId: promo.id,
      code: promo.code,
      userTelegramId: cleanTg,
      userWallet: params.userWallet,
      username: params.username,
      displayName: params.displayName,
      gramAwarded: awardStr,
      redeemedAt: Date.now(),
    };

    this.promoRedemptions.push(redemption);

    // Credit user's balance
    const creditTarget = params.userWallet || (cleanTg ? `tg_${cleanTg}` : '');
    if (creditTarget) {
      await this.creditUserBalance(
        creditTarget,
        awardStr,
        'MATCH_WIN',
        `Riscatto Promo Code ${promo.code}`,
        cleanTg
      );
    }

    this.persistPromoCodes();
    console.log(`[DatabaseService] PromoCode ${promo.code} redeemed by ${params.displayName || cleanTg || params.userWallet} (+${awardStr} GRAM)`);
    return { success: true, gramAwarded: awardStr, promoCode: promo };
  }

  public persistRaffles() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const list = Array.from(this.raffles.values());
      fs.writeFileSync(this.rafflesFilePath, JSON.stringify(list, null, 2), 'utf-8');
      fs.writeFileSync(this.raffleTicketsFilePath, JSON.stringify(this.raffleTickets, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseService] Failed to persist raffles to file:', err);
    }
  }

  public getRaffles(): StoredRaffle[] {
    return Array.from(this.raffles.values());
  }

  public getActiveRaffles(): StoredRaffle[] {
    return Array.from(this.raffles.values()).filter((r) => r.status === 'ACTIVE');
  }

  public getRaffleById(raffleId: string): StoredRaffle | undefined {
    return this.raffles.get(raffleId);
  }

  public createRaffle(options: {
    title: string;
    prizeGram: number;
    ticketPriceGram: number;
    durationHours: number;
    isFeatured?: boolean;
    badge?: string;
  }): StoredRaffle {
    const id = `raffle_${Date.now()}`;
    const endsAtEpoch = Date.now() + Math.max(0.1, options.durationHours) * 3600 * 1000;

    // If this raffle is set as featured, reset featured flag on other active raffles
    if (options.isFeatured) {
      for (const r of this.raffles.values()) {
        r.isFeatured = false;
      }
    }

    const raffle: StoredRaffle = {
      id,
      title: options.title.trim(),
      badge: options.badge || (options.ticketPriceGram === 0 ? '100% GRATIS' : 'MONTEPREMI RECORD'),
      prizeGram: Math.max(0.1, options.prizeGram),
      ticketPriceGram: Math.max(0, options.ticketPriceGram),
      totalTickets: 0,
      freeParticipants: [],
      endsAtEpoch,
      createdAt: Date.now(),
      isFeatured: Boolean(options.isFeatured),
      status: 'ACTIVE',
      color: options.ticketPriceGram === 0
        ? 'from-emerald-900/60 via-[#121c18] to-[#0e1018]'
        : options.isFeatured
        ? 'from-purple-900/60 via-[#181326] to-[#0e1018]'
        : 'from-amber-900/60 via-[#1c1612] to-[#0e1018]',
    };

    this.raffles.set(id, raffle);
    this.persistRaffles();
    console.log(`[DatabaseService] Created raffle ${id} ("${raffle.title}") - Prize: ${raffle.prizeGram} G, Ticket: ${raffle.ticketPriceGram} G, Featured: ${raffle.isFeatured}`);
    return raffle;
  }

  public setFeaturedRaffle(raffleId: string): boolean {
    const target = this.raffles.get(raffleId);
    if (!target) return false;

    for (const r of this.raffles.values()) {
      r.isFeatured = r.id === raffleId;
    }

    this.persistRaffles();
    console.log(`[DatabaseService] Raffle ${raffleId} set as featured.`);
    return true;
  }

  public async buyRaffleTickets(
    raffleId: string,
    userId: string,
    quantity: number,
    username?: string
  ): Promise<{
    success: boolean;
    error?: string;
    ticketNumbers?: number[];
    isFreeEntry?: boolean;
    newBalance?: string;
  }> {
    const cleanUserId = String(userId).trim();
    if (!cleanUserId) {
      return { success: false, error: 'User ID is required' };
    }

    const raffle = this.raffles.get(raffleId);
    if (!raffle) {
      return { success: false, error: 'Raffle non trovata' };
    }

    if (raffle.status !== 'ACTIVE') {
      return { success: false, error: 'Raffle non più attiva' };
    }

    if (Date.now() >= raffle.endsAtEpoch) {
      return { success: false, error: 'Questa raffle è terminata' };
    }

    // 1. FREE RAFFLE: Directly register user (1 registration per user, no tickets)
    if (raffle.ticketPriceGram === 0) {
      if (!raffle.freeParticipants) {
        raffle.freeParticipants = [];
      }

      const alreadyRegistered = raffle.freeParticipants.some((p) => p.userId === cleanUserId);
      if (alreadyRegistered) {
        return { success: false, error: 'Sei già registrato a questa raffle gratuita!' };
      }

      raffle.freeParticipants.push({
        userId: cleanUserId,
        username: username || undefined,
        registeredAt: Date.now(),
      });
      raffle.totalTickets = raffle.freeParticipants.length;
      this.persistRaffles();

      const userAcc = await this.getUserAccount(undefined, cleanUserId);
      const newBal = userAcc.balanceGram || '0.00';
      console.log(`[DatabaseService] User ${cleanUserId} registered for free raffle ${raffle.id} ("${raffle.title}")`);
      return { success: true, isFreeEntry: true, newBalance: newBal };
    }

    // 2. PAID RAFFLE: Purchase numbered tickets using balance
    const qty = Math.max(1, Math.floor(quantity));
    const totalCost = parseFloat((raffle.ticketPriceGram * qty).toFixed(2));

    const debitRes = await this.debitUserBalance(
      '',
      totalCost.toFixed(2),
      'RAFFLE_TICKET',
      `Acquisto ${qty} biglietti per Raffle: ${raffle.title}`,
      cleanUserId
    );

    if (!debitRes.success) {
      return { success: false, error: 'Saldo insufficiente per acquistare i biglietti' };
    }

    const ticketNumbers: number[] = [];
    const startNum = raffle.totalTickets + 1;

    for (let i = 0; i < qty; i++) {
      const num = startNum + i;
      ticketNumbers.push(num);
      this.raffleTickets.push({
        id: `tkt_${raffle.id}_${num}`,
        raffleId: raffle.id,
        userId: cleanUserId,
        username: username || undefined,
        ticketNumber: num,
        purchasedAt: Date.now(),
      });
    }

    raffle.totalTickets += qty;
    this.persistRaffles();

    const userAcc = await this.getUserAccount(undefined, cleanUserId);
    const newBal = userAcc.balanceGram || '0.00';

    console.log(`[DatabaseService] User ${cleanUserId} purchased ${qty} tickets for raffle ${raffle.id} (Cost: ${totalCost} G, Remaining: ${newBal} G)`);
    return { success: true, ticketNumbers, newBalance: newBal };
  }

  public async endRaffle(raffleId: string): Promise<{
    success: boolean;
    error?: string;
    winner?: {
      userId: string;
      username?: string;
      prizeGram: number;
      ticketNumber?: number;
    };
  }> {
    const raffle = this.raffles.get(raffleId);
    if (!raffle) {
      return { success: false, error: 'Raffle non trovata' };
    }

    if (raffle.status !== 'ACTIVE') {
      return { success: false, error: 'La raffle è già conclusa o archiviata' };
    }

    // 1. FREE RAFFLE DRAWING (draw directly from registered users)
    if (raffle.ticketPriceGram === 0) {
      const participants = raffle.freeParticipants || [];
      if (participants.length === 0) {
        raffle.status = 'ENDED';
        raffle.drawnAt = Date.now();
        this.persistRaffles();
        console.log(`[DatabaseService] Free raffle ${raffleId} ended with 0 registered users.`);
        return { success: true };
      }

      const winningParticipant = participants[Math.floor(Math.random() * participants.length)];

      await this.creditUserBalance(
        '',
        raffle.prizeGram.toFixed(2),
        'RAFFLE_WIN',
        `Vittoria Raffle Gratuita: ${raffle.title}`,
        winningParticipant.userId
      );

      raffle.status = 'ENDED';
      raffle.winnerUserId = winningParticipant.userId;
      raffle.winnerUsername = winningParticipant.username;
      raffle.winnerTicketNumber = undefined;
      raffle.drawnAt = Date.now();

      this.persistRaffles();
      console.log(`[DatabaseService] Free Raffle ${raffleId} drawn! Winner: User ${winningParticipant.userId} (${winningParticipant.username || 'anon'}) won ${raffle.prizeGram} GRAM!`);

      return {
        success: true,
        winner: {
          userId: winningParticipant.userId,
          username: winningParticipant.username,
          prizeGram: raffle.prizeGram,
        },
      };
    }

    // 2. PAID RAFFLE DRAWING (draw from purchased numbered tickets)
    const tickets = this.raffleTickets.filter((t) => t.raffleId === raffleId);

    if (tickets.length === 0) {
      raffle.status = 'ENDED';
      raffle.drawnAt = Date.now();
      this.persistRaffles();
      console.log(`[DatabaseService] Raffle ${raffleId} ended with 0 tickets sold.`);
      return { success: true };
    }

    // Pick random winning ticket
    const winningTicket = tickets[Math.floor(Math.random() * tickets.length)];

    // Credit prize directly to winner's balance
    await this.creditUserBalance(
      '',
      raffle.prizeGram.toFixed(2),
      'RAFFLE_WIN',
      `Vittoria Raffle: ${raffle.title} (Biglietto #${winningTicket.ticketNumber})`,
      winningTicket.userId
    );

    raffle.status = 'ENDED';
    raffle.winnerUserId = winningTicket.userId;
    raffle.winnerUsername = winningTicket.username;
    raffle.winnerTicketNumber = winningTicket.ticketNumber;
    raffle.drawnAt = Date.now();

    this.persistRaffles();
    console.log(`[DatabaseService] Raffle ${raffleId} drawn! Winner: User ${winningTicket.userId} (${winningTicket.username || 'anon'}) - Ticket #${winningTicket.ticketNumber} won ${raffle.prizeGram} GRAM!`);

    return {
      success: true,
      winner: {
        userId: winningTicket.userId,
        username: winningTicket.username,
        prizeGram: raffle.prizeGram,
        ticketNumber: winningTicket.ticketNumber,
      },
    };
  }

  public getUserRaffleTickets(userId: string): {
    tickets: StoredRaffleTicket[];
    freeEntries: Array<{ raffleId: string; registeredAt: number }>;
    raffles: Record<string, StoredRaffle>;
  } {
    const cleanUserId = String(userId).trim();
    const userTickets = this.raffleTickets.filter((t) => t.userId === cleanUserId);
    const rafflesMap: Record<string, StoredRaffle> = {};

    for (const t of userTickets) {
      if (!rafflesMap[t.raffleId]) {
        const r = this.raffles.get(t.raffleId);
        if (r) rafflesMap[t.raffleId] = r;
      }
    }

    const freeEntries: Array<{ raffleId: string; registeredAt: number }> = [];
    for (const r of this.raffles.values()) {
      const p = r.freeParticipants?.find((part) => part.userId === cleanUserId);
      if (p) {
        freeEntries.push({ raffleId: r.id, registeredAt: p.registeredAt });
        if (!rafflesMap[r.id]) {
          rafflesMap[r.id] = r;
        }
      }
    }

    return {
      tickets: userTickets,
      freeEntries,
      raffles: rafflesMap,
    };
  }
}

export const dbService = DatabaseService.getInstance();

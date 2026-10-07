import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FeeConfig {
  currency: string;
  creationFeeGram: number;
  joinFeeGram: number;
  spectatorFeeGram: number;
  duelRakePercent: number;
  spectatorRakePercent: number;
  minWagerGram: number;
  maxWagerGram: number;
  minDepositGram: number;
  minWithdrawGram: number;
  minWagerSplitGram: number;
  splitJackpotBonusPercent: number; // legacy alias
  splitPeaceBonusPercent: number;
  splitStealBonusPercent: number;
  splitJackpotProbabilityPercent: number;
  splitTurnDurationSeconds: number;
  splitRound1PeaceBonusPercent: number;
  splitRound1StealBonusPercent: number;
  splitRound1ProbabilityPercent: number;
  splitRound2PeaceBonusPercent: number;
  splitRound2StealBonusPercent: number;
  splitRound2ProbabilityPercent: number;
  splitRound3PeaceBonusPercent: number;
  splitRound3StealBonusPercent: number;
  splitRound3ProbabilityPercent: number;
  splitJackpotCooldownHours: number;
  presetsWagerGram: string[];
  bettingWindowSeconds: number;
}

const DEFAULT_CONFIG: FeeConfig = {
  currency: 'GRAM',
  creationFeeGram: 0.05,
  joinFeeGram: 0.05,
  spectatorFeeGram: 0.05,
  duelRakePercent: 0,
  spectatorRakePercent: 0,
  minWagerGram: 0.1,
  maxWagerGram: 100.0,
  minDepositGram: 0.1,
  minWithdrawGram: 1.0,
  minWagerSplitGram: 5.0,
  splitJackpotBonusPercent: 25,
  splitPeaceBonusPercent: 25,
  splitStealBonusPercent: 20,
  splitJackpotProbabilityPercent: 30,
  splitTurnDurationSeconds: 15,
  splitRound1PeaceBonusPercent: 15,
  splitRound1StealBonusPercent: 10,
  splitRound1ProbabilityPercent: 20,
  splitRound2PeaceBonusPercent: 30,
  splitRound2StealBonusPercent: 25,
  splitRound2ProbabilityPercent: 40,
  splitRound3PeaceBonusPercent: 50,
  splitRound3StealBonusPercent: 40,
  splitRound3ProbabilityPercent: 70,
  splitJackpotCooldownHours: 48,
  presetsWagerGram: ['0.1', '0.5', '1', '2', '5', '10', '25', '50'],
  bettingWindowSeconds: process.env.BETTING_WINDOW_SECONDS ? parseInt(process.env.BETTING_WINDOW_SECONDS, 10) : 20,
};

class FeeConfigManager {
  private static instance: FeeConfigManager;
  private configPath: string;
  private config: FeeConfig;

  private constructor() {
    this.configPath = path.resolve(__dirname, '../../../server/config/fees.json');
    this.config = this.loadConfig();
  }

  public static getInstance(): FeeConfigManager {
    if (!FeeConfigManager.instance) {
      FeeConfigManager.instance = new FeeConfigManager();
    }
    return FeeConfigManager.instance;
  }

  public getConfig(): FeeConfig {
    // Reload if file was modified
    return this.loadConfig();
  }

  private loadConfig(): FeeConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('[FeeConfigManager] Could not read fees.json, using default config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }
}

export const feeConfig = FeeConfigManager.getInstance();

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
  presetsWagerGram: string[];
}

const DEFAULT_CONFIG: FeeConfig = {
  currency: 'GRAM',
  creationFeeGram: 0.05,
  joinFeeGram: 0.05,
  spectatorFeeGram: 0.05,
  duelRakePercent: 0,
  spectatorRakePercent: 0,
  minWagerGram: 1.0,
  maxWagerGram: 100.0,
  minDepositGram: 0.1,
  minWithdrawGram: 0.1,
  presetsWagerGram: ['1', '2', '5', '10', '25', '50', '100'],
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

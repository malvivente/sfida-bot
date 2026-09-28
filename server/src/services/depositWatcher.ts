import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TonClient, Address, WalletContractV5R1, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { dbService } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DepositWatcherService {
  private static instance: DepositWatcherService;
  private client?: TonClient;
  private depositAddress?: string;
  private processedHashes: Set<string> = new Set();
  private processedFilePath: string;
  private isScanning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;

  private constructor() {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.processedFilePath = path.join(dataDir, 'processed_deposits.json');
    this.loadProcessedHashes();

    const endpoint =
      process.env.TON_RPC_ENDPOINT ||
      (process.env.NETWORK === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC');

    try {
      this.client = new TonClient({
        endpoint,
        apiKey: process.env.TON_API_KEY,
      });
    } catch (e) {
      console.warn('[DepositWatcher] Could not initialize TonClient:', e);
    }
  }

  public static getInstance(): DepositWatcherService {
    if (!DepositWatcherService.instance) {
      DepositWatcherService.instance = new DepositWatcherService();
    }
    return DepositWatcherService.instance;
  }

  private loadProcessedHashes(): void {
    try {
      if (fs.existsSync(this.processedFilePath)) {
        const raw = fs.readFileSync(this.processedFilePath, 'utf-8');
        const list: string[] = JSON.parse(raw);
        this.processedHashes = new Set(list);
        console.log(`[DepositWatcher] Loaded ${this.processedHashes.size} processed deposit hashes.`);
      }
    } catch (e) {
      console.warn('[DepositWatcher] Error loading processed deposits:', e);
      this.processedHashes = new Set();
    }
  }

  private persistProcessedHashes(): void {
    try {
      const list = Array.from(this.processedHashes);
      // Keep up to 20,000 hashes in history
      const trimmed = list.slice(-20000);
      fs.writeFileSync(this.processedFilePath, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DepositWatcher] Error saving processed deposits:', e);
    }
  }

  public async getDepositAddress(): Promise<string> {
    if (this.depositAddress) {
      return this.depositAddress;
    }

    let addr = process.env.BOT_CASSA_WALLET_ADDRESS;

    if (!addr) {
      const mnemonic = process.env.SERVER_HOT_WALLET_MNEMONIC || process.env.TON_MNEMONIC;
      if (mnemonic) {
        try {
          const keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
          try {
            const v5 = WalletContractV5R1.create({ publicKey: keyPair.publicKey });
            addr = v5.address.toString({ bounceable: false });
          } catch {
            const v4 = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
            addr = v4.address.toString({ bounceable: false });
          }
        } catch (e) {
          console.warn('[DepositWatcher] Could not derive address from mnemonic:', e);
        }
      }
    }

    if (!addr) {
      addr =
        process.env.CLASH_MASTER_ADDRESS ||
        process.env.TREASURY_ADDRESS ||
        'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
    }

    try {
      addr = Address.parse(addr).toString({ bounceable: false });
    } catch {}

    this.depositAddress = addr;
    return addr;
  }

  /**
   * Scan incoming transactions on the deposit wallet and credit verified deposits.
   */
  public async scanIncomingDeposits(): Promise<number> {
    if (this.isScanning) return 0;
    if (!this.client) return 0;

    this.isScanning = true;
    let creditedCount = 0;

    try {
      const depositAddrStr = await this.getDepositAddress();
      if (!depositAddrStr) {
        this.isScanning = false;
        return 0;
      }

      let parsedDepositAddr: Address;
      try {
        parsedDepositAddr = Address.parse(depositAddrStr);
      } catch (err) {
        console.warn(`[DepositWatcher] Invalid deposit address "${depositAddrStr}":`, err);
        this.isScanning = false;
        return 0;
      }

      // Fetch last 30 transactions for the deposit wallet
      const transactions = await this.client.getTransactions(parsedDepositAddr, { limit: 30 });

      for (const tx of transactions) {
        const txHash = tx.hash().toString('hex');
        if (this.processedHashes.has(txHash)) {
          continue;
        }

        const inMsg = tx.inMessage;
        if (!inMsg || inMsg.info.type !== 'internal') {
          // Non-internal or no message (e.g. tick/tock), record so we don't inspect again
          this.processedHashes.add(txHash);
          continue;
        }

        const valueCoins = inMsg.info.value.coins;
        if (valueCoins <= 0n) {
          this.processedHashes.add(txHash);
          continue;
        }

        const senderAddress = inMsg.info.src;
        if (!senderAddress) {
          this.processedHashes.add(txHash);
          continue;
        }

        const senderFriendly = senderAddress.toString({ bounceable: false });
        const senderRaw = senderAddress.toRawString().toLowerCase();

        // Extract comment from body if available
        let comment = '';
        try {
          if (inMsg.body) {
            const slice = inMsg.body.beginParse();
            if (slice.remainingBits >= 32) {
              const op = slice.loadUint(32);
              if (op === 0) {
                comment = slice.loadStringTail();
              }
            }
          }
        } catch {}

        // Determine destination user wallet
        let targetWallet = senderFriendly;
        let telegramId: string | undefined = undefined;

        // Check if comment specifies a user wallet: e.g. "Sfida Deposit: UQ..."
        const walletMatch = comment.match(/(?:Sfida Deposit:?\s*|Deposit:?\s*)([0-9a-zA-Z_\-:]+)/i);
        if (walletMatch && walletMatch[1]) {
          const candidate = walletMatch[1].trim();
          try {
            targetWallet = Address.parse(candidate).toString({ bounceable: false });
          } catch {
            if (candidate.startsWith('0:') || candidate.length > 20) {
              targetWallet = candidate;
            }
          }
        }

        // Check if comment specifies telegram ID: e.g. "tg:12345" or "tg_12345"
        const tgMatch = comment.match(/(?:tg:?|telegram:?|tg_)([0-9]+)/i);
        if (tgMatch && tgMatch[1]) {
          telegramId = tgMatch[1];
        }

        const amountGram = (Number(valueCoins) / 1e9).toFixed(2);
        const amountNum = parseFloat(amountGram);

        if (amountNum > 0) {
          await dbService.creditUserBalance(
            targetWallet,
            amountGram,
            'DEPOSIT',
            `On-chain deposit Tx: ${txHash.slice(0, 8)}... (${amountGram} TON/GRAM)`,
            telegramId
          );

          this.processedHashes.add(txHash);
          this.persistProcessedHashes();
          creditedCount++;

          console.log(
            `[DepositWatcher] 💰 Successfully detected & credited ${amountGram} GRAM to ${targetWallet} (tx: ${txHash.slice(0, 10)}...)`
          );
        } else {
          this.processedHashes.add(txHash);
        }
      }

      if (creditedCount > 0) {
        this.persistProcessedHashes();
      }
    } catch (err: any) {
      console.warn('[DepositWatcher] Error scanning transactions:', err?.message || err);
    } finally {
      this.isScanning = false;
    }

    return creditedCount;
  }

  /**
   * Immediate check on request from user/frontend.
   */
  public async checkDepositsForWallet(walletAddress: string): Promise<number> {
    const credited = await this.scanIncomingDeposits();
    return credited;
  }

  /**
   * Start recurring background polling every 12 seconds.
   */
  public start(intervalMs: number = 12000): void {
    if (this.intervalTimer) return;
    console.log(`[DepositWatcher] 🛰️ Starting automated on-chain deposit watcher (interval: ${intervalMs}ms)...`);
    
    // Initial scan after 2 seconds
    setTimeout(() => {
      this.scanIncomingDeposits().catch(() => {});
    }, 2000);

    this.intervalTimer = setInterval(() => {
      this.scanIncomingDeposits().catch(() => {});
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const depositWatcher = DepositWatcherService.getInstance();

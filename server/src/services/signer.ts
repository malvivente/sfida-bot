import { beginCell, Address, Cell } from '@ton/core';
import { keyPairFromSeed, sign } from '@ton/crypto';

export class MatchSignerService {
  private secretKey?: Buffer;
  public publicKey?: Buffer;
  public publicKeyBigInt?: bigint;
  private onChainPublicKeyBigInt?: bigint;
  private seedHex?: string;
  private initialized: boolean = false;

  constructor(seedHex?: string) {
    this.seedHex = seedHex;
  }

  private ensureInitialized() {
    if (this.initialized && this.secretKey && this.publicKey && this.publicKeyBigInt !== undefined) {
      return;
    }

    let seed: Buffer;
    const envSeed = this.seedHex || process.env.SERVER_SIGNER_SEED;
    if (envSeed && envSeed.length >= 64) {
      seed = Buffer.from(envSeed.slice(0, 64), 'hex');
      console.log('[SignerService] ✅ Initialized with SERVER_SIGNER_SEED from environment.');
    } else {
      console.log('⚠️ [SignerService] SERVER_SIGNER_SEED non impostato o < 64 caratteri. Uso default test seed.');
      seed = Buffer.alloc(32, 7);
    }

    const keypair = keyPairFromSeed(seed);
    this.secretKey = keypair.secretKey;
    this.publicKey = keypair.publicKey;
    this.publicKeyBigInt = BigInt('0x' + this.publicKey.toString('hex'));
    this.initialized = true;

    console.log(`[SignerService] Public Key (Hex): ${this.publicKey.toString('hex')}`);
    console.log(`[SignerService] Public Key (BigInt): ${this.publicKeyBigInt.toString()}`);
  }

  // Allow setting or syncing with ClashMaster on-chain public key
  public setOnChainPublicKey(key: bigint) {
    this.onChainPublicKeyBigInt = key;
    console.log(`[SignerService] 🔗 Synced on-chain ClashMaster public key: 0x${key.toString(16)}`);
  }

  // Create hash and Ed25519 signature for match resolution
  public signResolution(
    matchId: bigint,
    winnerAddress: string,
    timestamp: number
  ): { hash: Buffer; signature: Buffer; signatureCell: Cell } {
    this.ensureInitialized();
    const winner = Address.parse(winnerAddress);

    const payloadCell = beginCell()
      .storeUint(matchId, 64)
      .storeAddress(winner)
      .storeUint(timestamp, 32)
      .endCell();

    const hash = payloadCell.hash();
    const signature = sign(hash, this.secretKey!);
    const signatureCell = beginCell().storeBuffer(signature).endCell();

    return { hash, signature, signatureCell };
  }

  public getPublicKeyHex(): string {
    this.ensureInitialized();
    return this.publicKey!.toString('hex');
  }

  public getPublicKeyBigInt(): bigint {
    // If on-chain public key was synced from ClashMaster, use that for deterministic escrow addresses!
    if (this.onChainPublicKeyBigInt !== undefined) {
      return this.onChainPublicKeyBigInt;
    }
    this.ensureInitialized();
    return this.publicKeyBigInt!;
  }
}

export const signerService = new MatchSignerService();

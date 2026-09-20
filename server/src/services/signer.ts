import { beginCell, Address, Cell } from '@ton/core';
import { keyPairFromSeed, sign } from '@ton/crypto';

export class MatchSignerService {
  private secretKey: Buffer;
  public publicKey: Buffer;
  public publicKeyBigInt: bigint;

  constructor(seedHex?: string) {
    let seed: Buffer;
    if (seedHex && seedHex.length >= 64) {
      seed = Buffer.from(seedHex.slice(0, 64), 'hex');
    } else if (process.env.SERVER_SIGNER_SEED) {
      seed = Buffer.from(process.env.SERVER_SIGNER_SEED.slice(0, 64), 'hex');
    } else {
      // Default deterministic seed for development / arena engine
      seed = Buffer.alloc(32, 7);
    }

    const keypair = keyPairFromSeed(seed);
    this.secretKey = keypair.secretKey;
    this.publicKey = keypair.publicKey;
    this.publicKeyBigInt = BigInt('0x' + this.publicKey.toString('hex'));
  }

  // Create hash and Ed25519 signature for match resolution
  public signResolution(
    matchId: bigint,
    winnerAddress: string,
    timestamp: number
  ): { hash: Buffer; signature: Buffer; signatureCell: Cell } {
    const winner = Address.parse(winnerAddress);

    const payloadCell = beginCell()
      .storeUint(matchId, 64)
      .storeAddress(winner)
      .storeUint(timestamp, 32)
      .endCell();

    const hash = payloadCell.hash();
    const signature = sign(hash, this.secretKey);
    const signatureCell = beginCell().storeBuffer(signature).endCell();

    return { hash, signature, signatureCell };
  }

  public getPublicKeyHex(): string {
    return this.publicKey.toString('hex');
  }

  public getPublicKeyBigInt(): bigint {
    return this.publicKeyBigInt;
  }
}

export const signerService = new MatchSignerService();

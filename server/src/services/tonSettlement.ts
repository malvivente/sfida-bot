import { TonClient, WalletContractV4, internal, toNano, Address, beginCell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { signerService } from './signer.js';

export interface SettlementResult {
  success: boolean;
  txHash?: string;
  error?: string;
  resolutionPayload: {
    matchId: string;
    escrowAddress: string;
    winner: string;
    timestamp: number;
    signatureHex: string;
    signatureCellBoc: string;
  };
}

export class TonSettlementService {
  private client?: TonClient;

  constructor() {
    const endpoint = process.env.TON_RPC_ENDPOINT;
    if (endpoint) {
      this.client = new TonClient({
        endpoint,
        apiKey: process.env.TON_API_KEY,
      });
    }
  }

  // Settle match on TON blockchain
  public async settleMatch(
    escrowAddress: string,
    matchId: bigint,
    winnerAddress: string
  ): Promise<SettlementResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const { signatureHex, signatureCell, signatureCellBoc } = signerService.signResolution(
      matchId,
      winnerAddress,
      timestamp
    );

    const payload = {
      matchId: matchId.toString(),
      escrowAddress,
      winner: winnerAddress,
      timestamp,
      signatureHex,
      signatureCellBoc,
    };

    console.log(`[TonSettlement] Signed resolution for Match #${matchId}:`, {
      escrowAddress,
      winner: winnerAddress,
      signatureHex: signatureHex.slice(0, 16) + '...',
    });

    const mnemonic = process.env.SERVER_HOT_WALLET_MNEMONIC || process.env.TON_MNEMONIC;

    if (!this.client || !mnemonic) {
      console.log(
        `[TonSettlement] Server hot wallet not configured in .env. Match #${matchId} resolution is ready for direct decentralized claim by winner.`
      );
      return {
        success: true,
        resolutionPayload: payload,
      };
    }

    try {
      console.log(`[TonSettlement] Auto-relaying ResolveMatch from server hot-wallet to ${escrowAddress}...`);

      const keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
      const workchain = 0;
      const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
      const walletContract = this.client.open(wallet);

      const seqno = await walletContract.getSeqno();

      // Opcode 756388397 (0x2d15922d) for ResolveMatch
      const resolveMessageCell = beginCell()
        .storeUint(756388397, 32)
        .storeUint(matchId, 64)
        .storeAddress(Address.parse(winnerAddress))
        .storeUint(timestamp, 32)
        .storeRef(signatureCell)
        .endCell();

      await walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(escrowAddress),
            value: toNano('0.06'),
            bounce: false,
            body: resolveMessageCell,
          }),
        ],
      });

      console.log(`[TonSettlement] ✅ ResolveMatch successfully broadcast for Match #${matchId} (seqno: ${seqno})`);

      return {
        success: true,
        txHash: `broadcast_seq_${seqno}`,
        resolutionPayload: payload,
      };
    } catch (err: any) {
      console.warn('[TonSettlement] Server hot-wallet relay attempt warning (winner can still claim directly):', err?.message);
      return {
        success: true,
        error: err?.message,
        resolutionPayload: payload,
      };
    }
  }
}

export const tonSettlementService = new TonSettlementService();

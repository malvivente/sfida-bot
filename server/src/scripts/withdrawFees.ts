import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbService } from '../services/db.js';
import { TonClient, WalletContractV4, WalletContractV5R1, SendMode, internal, toNano, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  console.log('\n========================================');
  console.log('🏦 SfidaBot Platform Treasury Fee Manager');
  console.log('========================================\n');

  const treasury = await dbService.getTreasuryData();
  const recipient =
    process.env.TREASURY_ADDRESS ||
    process.env.OWNER_ADDRESS ||
    treasury.treasuryWallet ||
    'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

  console.log(`- Recipient (Owner Wallet):  ${recipient}`);
  console.log(`- Claimable Fees:           ${treasury.claimableFeesGram} GRAM`);
  console.log(`- Total Lifetime Earned:    ${treasury.totalEarnedFeesGram} GRAM`);
  console.log(`- Total Already Withdrawn:  ${treasury.totalWithdrawnFeesGram} GRAM`);
  console.log(`- Total Matches Raked:      ${treasury.totalMatchesRaked}`);
  console.log(`  • Creation Fees:          ${treasury.feeBreakdown.creationFeesGram} GRAM`);
  console.log(`  • Duel Rake:              ${treasury.feeBreakdown.duelRakeGram} GRAM`);
  console.log(`  • Spectator Rake:         ${treasury.feeBreakdown.spectatorRakeGram} GRAM`);
  console.log('========================================\n');

  const claimableNum = parseFloat(treasury.claimableFeesGram || '0');
  if (claimableNum <= 0) {
    console.log('ℹ️ No claimable fees available for withdrawal at this time.');
    process.exit(0);
  }

  const mnemonic = process.env.SERVER_HOT_WALLET_MNEMONIC || process.env.TON_MNEMONIC;
  const endpoint = process.env.TON_RPC_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC';

  if (!mnemonic) {
    console.log('⚠️ SERVER_HOT_WALLET_MNEMONIC is not configured in .env.');
    console.log('To execute on-chain transfer, add the 24 words of the Cassa Wallet to server/.env.');
    console.log('\nSimulating ledger-only fee withdrawal...');
    await dbService.withdrawTreasuryFees(treasury.claimableFeesGram, recipient);
    console.log(`✅ Recorded withdrawal of ${treasury.claimableFeesGram} GRAM to ${recipient} in ledger.`);
    process.exit(0);
  }

  try {
    console.log(`🚀 Initiating on-chain transfer of ${treasury.claimableFeesGram} GRAM to ${recipient}...`);
    const tonClient = new TonClient({ endpoint, apiKey: process.env.TON_API_KEY });
    const keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
    const v4Contract = tonClient.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
    const v5Contract = tonClient.open(WalletContractV5R1.create({ publicKey: keyPair.publicKey }));

    const [bal4, bal5] = await Promise.all([
      tonClient.getBalance(v4Contract.address).catch(() => 0n),
      tonClient.getBalance(v5Contract.address).catch(() => 0n),
    ]);

    const activeContract = bal4 > bal5 ? v4Contract : v5Contract;
    const balance = bal4 > bal5 ? bal4 : bal5;
    const contractType = activeContract === v5Contract ? 'W5' : 'V4';

    console.log(`- Cassa Wallet Address:     ${activeContract.address.toString({ bounceable: false })} (${contractType})`);
    console.log(`- Cassa Wallet Balance:     ${Number(balance) / 1e9} TON`);

    if (balance < toNano(treasury.claimableFeesGram) + toNano('0.008')) {
      console.error('❌ Insufficient balance in Cassa Wallet to execute the fee transfer + gas.');
      process.exit(1);
    }

    const seqno = await activeContract.getSeqno();
    await (activeContract as any).sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      messages: [
        internal({
          to: Address.parse(recipient),
          value: toNano(treasury.claimableFeesGram),
          bounce: false,
          body: 'SfidaBot Platform Fee Withdrawal',
        }),
      ],
    });

    console.log(`✅ On-chain transaction broadcast successfully!`);
    await dbService.withdrawTreasuryFees(treasury.claimableFeesGram, recipient);
    const updated = await dbService.getTreasuryData();
    console.log(`🎉 Treasury ledger updated! Remaining claimable: ${updated.claimableFeesGram} GRAM.\n`);
  } catch (err: any) {
    console.error('❌ Error executing on-chain fee withdrawal:', err.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Script Error:', err);
  process.exit(1);
});

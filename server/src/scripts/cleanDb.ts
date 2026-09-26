import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');

export async function cleanDatabase() {
  console.log('🧹 [SfidaBot] Starting Production Database Wipe...');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 1. Reset matches
  const matchesPath = path.join(dataDir, 'matches.json');
  fs.writeFileSync(matchesPath, JSON.stringify([], null, 2), 'utf-8');
  console.log('✅ Cleared matches.json');

  // 2. Reset users
  const usersPath = path.join(dataDir, 'users.json');
  fs.writeFileSync(usersPath, JSON.stringify([], null, 2), 'utf-8');
  console.log('✅ Cleared users.json');

  // 3. Reset transactions
  const txPath = path.join(dataDir, 'transactions.json');
  fs.writeFileSync(txPath, JSON.stringify([], null, 2), 'utf-8');
  console.log('✅ Cleared transactions.json');

  // 4. Reset Trust Jackpot to standard initial base (5.00 GRAM)
  const jackpotPath = path.join(dataDir, 'jackpot.json');
  const initialJackpot = {
    trustJackpotGram: '5.00',
    thresholdGram: '5.00',
    bonusPercentage: 20,
    totalDistributedGram: '0.00',
    totalCollectedGram: '0.00',
    lastUpdated: Date.now(),
  };
  fs.writeFileSync(jackpotPath, JSON.stringify(initialJackpot, null, 2), 'utf-8');
  console.log('✅ Reset jackpot.json (5.00 GRAM)');

  // 5. Reset Treasury
  const treasuryPath = path.join(dataDir, 'treasury.json');
  const defaultTreasuryWallet =
    process.env.TREASURY_ADDRESS ||
    process.env.OWNER_ADDRESS ||
    'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';

  const initialTreasury = {
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
  fs.writeFileSync(treasuryPath, JSON.stringify(initialTreasury, null, 2), 'utf-8');
  console.log('✅ Reset treasury.json (0.00 GRAM)');

  console.log('\n✨ Database is now completely clean and ready for production!');
}

cleanDatabase().catch((err) => {
  console.error('❌ Failed to wipe database:', err);
  process.exit(1);
});

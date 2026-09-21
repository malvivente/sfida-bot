import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbService } from '../services/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const identifier = args[0];
  const amount = args[1] !== undefined ? args[1] : '0.00';

  console.log('\n========================================');
  console.log('⚖️ SfidaBot User Balance Manager');
  console.log('========================================\n');

  if (!identifier) {
    console.log('Usage: npm run set:balance <telegramId|walletAddress|username> <amountGram>');
    console.log('Example: npm run set:balance 1052287650 0\n');

    // List all users
    const users = Array.from((dbService as any).users.values()) as any[];
    if (users.length === 0) {
      console.log('ℹ️ No registered users found in database.');
    } else {
      console.log('Known users in database:');
      for (const u of users) {
        console.log(`- ID: ${u.telegramId || 'N/A'} | @${u.username || 'N/A'} | Balance: ${u.balanceGram || u.balanceTon || '0.00'} GRAM | Wallet: ${u.walletAddress}`);
      }
    }
    console.log('========================================\n');
    process.exit(0);
  }

  // 1. If backend server is currently running, update via REST API so memory and disk are in sync!
  const port = process.env.PORT || 3000;
  try {
    const res = await fetch(`http://localhost:${port}/api/admin/set-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, amountGram: amount }),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data?.account) {
        console.log(`✅ [Live Server Synced] Balance updated successfully!`);
        console.log(`- Telegram ID: ${data.account.telegramId || identifier}`);
        console.log(`- Username:    @${data.account.username || 'N/A'}`);
        console.log(`- Wallet:      ${data.account.walletAddress}`);
        console.log(`- New Balance: ${data.account.balanceGram} GRAM\n`);
        process.exit(0);
      }
    }
  } catch {
    // Server is offline, fallback to direct database service write
  }

  // 2. Direct database update if server is not reachable
  const account = await dbService.setUserBalanceDirect(identifier, amount);
  if (!account) {
    console.error(`❌ User not found with identifier: "${identifier}".`);
    console.log('\nKnown users in database:');
    const users = Array.from((dbService as any).users.values()) as any[];
    for (const u of users) {
      console.log(`- ID: ${u.telegramId || 'N/A'} | @${u.username || 'N/A'} | Balance: ${u.balanceGram || '0.00'} GRAM | Wallet: ${u.walletAddress}`);
    }
    console.log('\n========================================\n');
    process.exit(1);
  }

  console.log(`✅ [Database File Updated] Balance updated successfully!`);
  console.log(`- Telegram ID: ${account.telegramId || identifier}`);
  console.log(`- Username:    @${account.username || 'N/A'}`);
  console.log(`- Wallet:      ${account.walletAddress}`);
  console.log(`- New Balance: ${account.balanceGram} GRAM\n`);
}

main().catch((err) => {
  console.error('Fatal Script Error:', err);
  process.exit(1);
});

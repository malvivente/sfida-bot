import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');

const FIRST_NAMES = [
  'Marco', 'Alessandro', 'Sofia', 'Giulia', 'Luca', 'Davide', 'Elena', 'Matteo',
  'Lorenzo', 'Federico', 'Chiara', 'Andrea', 'Sara', 'Simone', 'Alessia', 'Gabriele',
  'Valeria', 'Fabio', 'Martina', 'Roberto', 'Paolo', 'Vincenzo', 'Camilla', 'Beatrice',
  'Daniele', 'Giorgio', 'Anna', 'Francesca', 'Riccardo', 'Tommaso', 'Leonardo', 'Edoardo',
  'Michele', 'Emanuele', 'Pietro', 'Antonio', 'Giovanni', 'Filippo', 'Stefano', 'Massimo',
  'Alex', 'Viktor', 'Nikita', 'Ivan', 'Dmitry', 'Svetlana', 'Olga', 'Maxim',
  'Leo', 'Lucas', 'Arthur', 'Hugo', 'Gabriel', 'Louis', 'Jules', 'Adam',
  'Oliver', 'George', 'Harry', 'Jack', 'Jacob', 'Noah', 'Charlie', 'James',
  'Liam', 'Noah', 'Mason', 'Ethan', 'Logan', 'Lucas', 'Jackson', 'Aiden'
];

const LAST_NAMES = [
  'Rossi', 'Bianchi', 'Romano', 'Ferrari', 'Esposito', 'Conti', 'Moretti', 'Ricci',
  'De Luca', 'Bruno', 'Colombo', 'De Angelis', 'Gentile', 'Santoro', 'Marini', 'Leone',
  'Longo', 'Martini', 'Greco', 'Gatti', 'Barbieri', 'Lombardi', 'Fontana', 'Caruso',
  'Ferraro', 'Piras', 'Sanna', 'Serra', 'Meloni', 'Carta', 'Manca', 'Porcu',
  'Vance', 'Sterling', 'Blackwood', 'Frost', 'Winter', 'Kovacs', 'Petrov', 'Ivanov',
  'Dubois', 'Laurent', 'Moreau', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Fontaine',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson'
];

export async function seedLeaderboard(userCount: number = 150) {
  console.log(`🌱 [SfidaBot] Generating ${userCount} mock users for Leaderboard verification...`);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const users: any[] = [];
  const matches: any[] = [];
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (let i = 0; i < userCount; i++) {
    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lName = LAST_NAMES[Math.floor(i * 1.618) % LAST_NAMES.length];
    const fullName = `${fName} ${lName}`;
    const tgId = (100000000 + i + 1).toString();
    const cleanUsername = `${fName.toLowerCase()}_${lName.toLowerCase()}`;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName)}`;

    // Generate descending win profiles: #1 has ~90 wins, #100 has ~15 wins, #150 has ~3 wins
    const factor = Math.pow((userCount - i) / userCount, 1.4);
    const duelsWon = Math.max(1, Math.round(factor * 85) + (i < 3 ? 10 : 0));
    const winRate = 0.55 + ((userCount - i) / userCount) * 0.35; // 55% to 90%
    const duelsPlayed = Math.max(duelsWon, Math.round(duelsWon / winRate));
    const losses = duelsPlayed - duelsWon;
    const streak = i < 10 ? (12 - i) : i % 5 === 0 ? Math.floor(Math.random() * 5) + 1 : 0;
    const profitGram = (duelsWon * 1.92 - losses * 1.0).toFixed(2);

    const userAccount = {
      walletAddress: `UQ${tgId.padStart(46, '0')}`,
      telegramId: tgId,
      username: cleanUsername,
      displayName: fullName,
      photoUrl: avatarUrl,
      balanceNano: BigInt(Math.round(parseFloat(profitGram) * 1e9)).toString(),
      balanceTon: profitGram,
      balanceGram: profitGram,
      depositedTotalTon: '10.00',
      depositedTotalGram: '10.00',
      withdrawnTotalTon: '0.00',
      withdrawnTotalGram: '0.00',
      updatedAt: now - i * 60000,
      mockStats: {
        duelsPlayed,
        duelsWon,
        winRate: Math.round(winRate * 100),
        bestReaction: i < 20 ? `${Math.floor(180 + Math.random() * 120)}` : '-',
        totalProfitsGram: profitGram,
        dailyStreak: streak,
      },
    };
    users.push(userAccount);

    // Generate 1-2 sample matches for match history
    const sampleMatchesCount = i < 30 ? 2 : 1;
    for (let mIdx = 0; mIdx < sampleMatchesCount; mIdx++) {
      const matchTimestamp = now - (mIdx * 3600000) - (i * 120000);
      const isWin = mIdx === 0 || duelsWon > losses;
      matches.push({
        matchId: `seed_${i}_${mIdx}`,
        wagerAmountNano: '1000000000',
        wagerTon: '1.00',
        wagerGram: '1.00',
        payoutTon: isWin ? '1.92' : '0.00',
        payoutGram: isWin ? '1.92' : '0.00',
        playerAAddress: userAccount.walletAddress,
        playerAName: fullName,
        playerATelegramId: tgId,
        playerBAddress: 'UQOpponent00000000000000000000000000000000000000000',
        playerBName: 'Arena Challenger',
        playerBTelegramId: '999999999',
        winnerAddress: isWin ? userAccount.walletAddress : 'UQOpponent00000000000000000000000000000000000000000',
        winnerName: isWin ? fullName : 'Arena Challenger',
        winnerTelegramId: isWin ? tgId : '999999999',
        scoreA: isWin ? 1 : 0,
        scoreB: isWin ? 0 : 1,
        gameType: i % 2 === 0 ? 'split' : 'roulette',
        settledAt: matchTimestamp,
        createdAt: matchTimestamp - 30000,
      });
    }
  }

  // Save users.json and matches.json
  const usersPath = path.join(dataDir, 'users.json');
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');

  const matchesPath = path.join(dataDir, 'matches.json');
  fs.writeFileSync(matchesPath, JSON.stringify(matches, null, 2), 'utf-8');

  console.log(`✅ Successfully seeded ${users.length} mock users and ${matches.length} matches!`);
  console.log('🏆 Top 3 seeded players:');
  console.log(`   🥇 1. ${users[0].displayName} (${users[0].telegramId})`);
  console.log(`   🥈 2. ${users[1].displayName} (${users[1].telegramId})`);
  console.log(`   🥉 3. ${users[2].displayName} (${users[2].telegramId})`);
  console.log(`📊 Total players beyond rank 100: ${Math.max(0, users.length - 100)} (will display as 100+)`);
}

seedLeaderboard(150).catch((err) => {
  console.error('❌ Failed to seed leaderboard:', err);
  process.exit(1);
});

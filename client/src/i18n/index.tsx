import React, { createContext, useContext, useState } from 'react';

export type Language = 'it' | 'en';

export interface Translations {
  [key: string]: {
    it: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  'nav.arena': { it: 'ARENA', en: 'ARENA' },
  'nav.leaderboard': { it: 'CLASSIFICA', en: 'LEADERBOARD' },
  'nav.leaderboardShort': { it: 'TOP', en: 'TOP' },
  'nav.affiliates': { it: 'AFFILIATI', en: 'AFFILIATES' },
  'nav.profile': { it: 'PROFILO', en: 'PROFILE' },
  'nav.subtitle': { it: 'DUELLI CYBER PVP', en: 'CYBER PVP DUELS' },

  // Profile
  'profile.title': { it: 'PROFILO GUERRIERO', en: 'WARRIOR PROFILE' },
  'profile.streakTitle': { it: '{streak} GIORNI DI STREAK', en: '{streak} DAY STREAK' },
  'profile.streakAction': { it: 'Vinci 1 duello oggi', en: 'Win 1 match today' },
  'profile.streakCompleted': { it: '✓ Completato per oggi!', en: '✓ Completed today!' },
  'profile.rewardSample': { it: 'Prossimo premio: Bonus GRAM', en: 'Upcoming prize: GRAM Bonus' },
  'profile.rewardPreview': { it: 'Anteprima premio: +{reward} GRAM', en: 'Reward preview: +{reward} GRAM' },
  'profile.streakGoal': { it: 'Traguardo {days} gg: +{reward} GRAM', en: '{days}-day goal: +{reward} GRAM' },
  'profile.streakUnit': { it: '{days} gg', en: '{days}d' },
  'profile.duelVictories': { it: 'VITTORIE NEI DUELLI', en: 'DUEL VICTORIES' },
  'profile.victoriesCount': { it: '{won} V / {played} Partite', en: '{won} W / {played} Games' },
  'profile.winRate': { it: '{rate}% Percentuale Vittorie', en: '{rate}% Win Rate' },
  'profile.balance': { it: 'SALDO INTERNO', en: 'IN-APP BALANCE' },
  'profile.availableGram': { it: 'GRAM Disponibili', en: 'GRAM Available' },
  'profile.deposit': { it: 'DEPOSITA', en: 'DEPOSIT' },
  'profile.withdraw': { it: 'PRELEVA', en: 'WITHDRAW' },
  'profile.activeDuelsTitle': { it: 'DUELLI ATTIVI IN CORSO', en: 'ACTIVE DUELS IN PROGRESS' },
  'profile.recentHistoryTitle': { it: 'STORICO DUELLI RECENTI', en: 'RECENT DUEL HISTORY' },
  'profile.duelsCount': { it: '{count} duelli', en: '{count} duels' },
  'profile.noMatches': { it: 'Nessun duello giocato finora.', en: 'No duels played yet.' },
  'profile.resume': { it: 'ENTRA', en: 'RESUME' },
  'profile.walletNotConnected': { it: 'Portafoglio non connesso', en: 'Wallet not connected' },
  'profile.connectWallet': { it: 'Connetti TON Wallet', en: 'Connect TON Wallet' },
  'profile.totalProfits': { it: 'Profitti Totali', en: 'Total Profits' },
  'profile.totalWinningsCredited': { it: 'VINCITE TOTALI ACCREDITATE', en: 'TOTAL WINNINGS CREDITED' },
  'profile.bestReaction': { it: 'Miglior reazione personale', en: 'Personal best reaction' },
  'profile.viewLeaderboard': { it: 'VEDI CLASSIFICA GLOBALE', en: 'VIEW GLOBAL LEADERBOARD' },

  // Leaderboard
  'leaderboard.title': { it: 'CLASSIFICA CYBER', en: 'CYBER LEADERBOARD' },
  'leaderboard.subtitle': { it: 'I guerrieri d\'élite dell\'Arena Sfida', en: 'Top duelists of the cyber arena' },
  'leaderboard.backToArena': { it: '← Torna all\'Arena', en: '← Back to Arena' },
  'leaderboard.back': { it: '← Torna al Profilo', en: '← Back to Profile' },
  'leaderboard.tabWins': { it: '🏆 Vittorie', en: '🏆 Victories' },
  'leaderboard.tabStreak': { it: '🔥 Streak', en: '🔥 Streak' },
  'leaderboard.tabProfits': { it: '💎 Profitti', en: '💎 Profits' },
  'leaderboard.rank': { it: 'Pos.', en: 'Rank' },
  'leaderboard.player': { it: 'Guerriero', en: 'Warrior' },
  'leaderboard.wins': { it: 'Vittorie', en: 'Wins' },
  'leaderboard.winRate': { it: 'Win Rate', en: 'Win Rate' },
  'leaderboard.streak': { it: 'Streak', en: 'Streak' },
  'leaderboard.profits': { it: 'Profitti', en: 'Profits' },
  'leaderboard.yourRank': { it: 'LA TUA POSIZIONE', en: 'YOUR RANK' },
  'leaderboard.noData': { it: 'Nessun combattente registrato al momento.', en: 'No warriors ranked at this time.' },
  'leaderboard.loading': { it: 'Caricamento classifica...', en: 'Loading hall of fame...' },

  // Spectator & Betting
  'spectator.title': { it: 'SCOMMESSE TOTALIZZATORE SPETTATORI', en: 'SPECTATOR TOTALIZER BETTING' },
  'spectator.oddsLocked': { it: 'QUOTE E PERCENTUALI NASCOSTE FINO AD INIZIO ROUND', en: 'ODDS & SHARES REVEALED AT DUEL START' },
  'spectator.pariMutuel': { it: 'Pool: Pari-Mutuel Dinamico', en: 'Pool: Dynamic Pari-Mutuel' },
  'spectator.locked': { it: 'BLOCCATO', en: 'LOCKED' },
  'spectator.estPayout': { it: 'Vincita stimata:', en: 'Est. payout:' },
  'spectator.bet': { it: 'PUNTA', en: 'BET' },
  'spectator.on': { it: 'SU', en: 'ON' },
  'spectator.feeNotice': { it: '+0.05 GRAM quota scommessa', en: '+0.05 GRAM bet entry fee' },
  'spectator.minBetNotice': { it: 'Puntata minima: 1 GRAM', en: 'Minimum bet: 1 GRAM' },
  'spectator.isPlayerNotice': { it: 'Sei un duellante in questa partita: le scommesse spettatori sono disabilitate per i combattenti.', en: 'You are a duelist in this match: spectator betting is disabled for combatants.' },

  // Lobby
  'lobby.liveDuels': { it: 'DUELLI LIVE 1V1', en: '1V1 LIVE DUELS' },
  'lobby.balance': { it: 'Saldo:', en: 'Balance:' },
  'lobby.deposit': { it: '+ Deposita', en: '+ Deposit' },
  'lobby.create': { it: 'CREA', en: 'CREATE' },
  'lobby.activeDuels': { it: 'DUELLI ATTIVI NELL\'ARENA', en: 'ACTIVE ARENA DUELS' },
  'lobby.refresh': { it: 'Aggiorna', en: 'Refresh' },
  'lobby.refreshing': { it: 'Aggiornamento...', en: 'Refreshing...' },
  'lobby.allGames': { it: 'TUTTI I GIOCHI', en: 'ALL GAMES' },
  'lobby.noDuelsTitle': { it: 'Nessun duello attivo trovato', en: 'No active duels found' },
  'lobby.noDuelsDesc': { it: 'Crea un duello in questa modalità o cambia filtri per trovare sfide aperte!', en: 'Create a duel in this mode or switch filters to find open matches!' },
  'lobby.createDuelBtn': { it: 'CREA SFIDA', en: 'CREATE DUEL' },
  'lobby.createModalTitle': { it: 'CONFIGURA IL TUO DUELLO', en: 'SET UP YOUR DUEL' },
  'lobby.createModalDesc': { it: 'Seleziona la modalità e l\'importo della puntata in GRAM', en: 'Select your game mode and wager in GRAM' },
  'lobby.gameMode': { it: 'MODALITÀ DI GIOCO', en: 'GAME MODE' },
  'lobby.roomType': { it: 'ACCESSO ALLA STANZA', en: 'ROOM ACCESS' },
  'lobby.public': { it: 'Pubblica', en: 'Public' },
  'lobby.private': { it: 'Privata', en: 'Private' },
  'lobby.publicDesc': { it: 'Aperta a qualsiasi combattente nella lobby.', en: 'Open to any combatant in the lobby.' },
  'lobby.privateDesc': { it: 'Solo chi possiede il tuo link d\'invito può combattere. Spettatori e scommesse rimangono aperti a tutti.', en: 'Only fighters with your direct invite link can join. Spectators and betting remain open to all.' },
  'lobby.privateBadge': { it: 'PRIVATA', en: 'PRIVATE' },
  'lobby.spectatePrivate': { it: 'GUARDA (PRIVATA)', en: 'WATCH (PRIVATE)' },
  'lobby.creationError': { it: 'Errore di Creazione', en: 'Creation Error' },
  'lobby.presetAmount': { it: 'Importo preimpostato:', en: 'Preset amount:' },
  'lobby.maxWagerLabel': { it: 'Max: {max}', en: 'Max: {max}' },
  'lobby.customStake': { it: 'Puntata personalizzata:', en: 'Custom amount:' },
  'lobby.yourWager': { it: 'La tua puntata:', en: 'Your wager:' },
  'lobby.creationFee': { it: 'Commissione di Creazione:', en: 'Creation Fee:' },
  'lobby.totalNeeded': { it: 'Totale richiesto dal saldo:', en: 'Total Required from Balance:' },
  'lobby.availableBalance': { it: 'Saldo Disponibile:', en: 'Available Balance:' },
  'lobby.insufficientShort': { it: 'Saldo insufficiente! Servono {total} GRAM (mancano {missing} GRAM).', en: 'Insufficient balance! Need {total} GRAM ({missing} GRAM short).' },
  'lobby.depositMissingBtn': { it: 'DEPOSITA {missing} GRAM', en: 'DEPOSIT {missing} GRAM' },
  'lobby.depositGram': { it: 'DEPOSITA GRAM', en: 'DEPOSIT GRAM' },
  'lobby.creatingEscrow': { it: 'CREAZIONE IN CORSO...', en: 'CREATING...' },
  'lobby.createDuelWithAmount': { it: 'CREA DUELLO ({amount} GRAM)', en: 'CREATE DUEL ({amount} GRAM)' },
  'lobby.selectDiscipline': { it: 'Seleziona Disciplina di Gioco:', en: 'Select Game Discipline:' },
  'lobby.setWager': { it: 'Imposta Importo Puntata:', en: 'Set Wager Stake:' },
  'lobby.selectOrEnter': { it: 'Seleziona o inserisci puntata:', en: 'Select or enter stake:' },
  'lobby.winnerTakes': { it: 'Vincita netta vincitore (100%):', en: 'Winner takes (100%):' },
  'lobby.youNeed': { it: 'Ti mancano', en: 'You need' },
  'lobby.confirmCreate': { it: 'CONFERMA E CREA DUELLO', en: 'CONFIRM & CREATE DUEL' },
  'lobby.insufficientBtn': { it: 'SALDO INSUFFICIENTE (DEPOSITA)', en: 'INSUFFICIENT BALANCE (DEPOSIT)' },
  'lobby.joinBtn': { it: 'SFIDA', en: 'JOIN' },
  'lobby.spectateBtn': { it: 'GUARDA', en: 'WATCH' },
  'lobby.cancelBtn': { it: 'ANNULLA', en: 'CANCEL' },
  'lobby.maxWagerWarn': { it: 'Attenzione: la puntata massima è di {max} GRAM.', en: 'Warning: Maximum allowed wager is {max} GRAM.' },
  'lobby.minWagerWarn': { it: 'La puntata minima è di 0.1 GRAM', en: 'Minimum wager is 0.1 GRAM' },
  'lobby.wagerLabel': { it: 'Puntata', en: 'Wager' },
  'lobby.poolLabel': { it: 'Montepremi', en: 'Prize Pool' },
  'lobby.spectatorsLabel': { it: 'Spettatori', en: 'Spectators' },
  'lobby.statusWaiting': { it: 'IN ATTESA AVVERSARIO', en: 'WAITING FOR OPPONENT' },
  'lobby.statusLive': { it: 'IN CORSO', en: 'LIVE' },
  'lobby.statusSettled': { it: 'CONCLUSO', en: 'SETTLED' },
  'lobby.creatorTag': { it: 'CREATORE', en: 'CREATOR' },
  'lobby.opponentTag': { it: 'AVVERSARIO', en: 'OPPONENT' },
  'lobby.insufficientModalTitle': { it: 'SALDO INSUFFICIENTE PER PARTECIPARE', en: 'INSUFFICIENT BALANCE TO JOIN' },
  'lobby.insufficientJoinDesc': { it: 'Questo duello richiede {required} GRAM (inclusi 0.05 GRAM di quota di partecipazione). Il tuo saldo disponibile è di {current} GRAM.', en: 'This duel requires {required} GRAM (including 0.05 GRAM entry fee). Your available balance is {current} GRAM.' },
  'lobby.missingDeposit': { it: 'Deposito Mancante:', en: 'Missing Deposit:' },

  // Arena & Rematch
  'arena.shareDuel': { it: 'CONDIVIDI', en: 'SHARE' },
  'arena.backToLobby': { it: 'TORNA IN LOBBY', en: 'BACK TO LOBBY' },
  'rematch.offerTitle': { it: 'PROPOSTA DI RIVINCITA (2X)', en: '2X REMATCH OFFER' },
  'rematch.offeredBy': { it: '{name} ti sfida a una rivincita 2X per {amount} GRAM!', en: '{name} challenges you to a 2X Rematch for {amount} GRAM!' },
  'rematch.accept': { it: 'ACCETTA 2X', en: 'ACCEPT 2X' },
  'rematch.decline': { it: 'RIFIUTA', en: 'DECLINE' },
  'rematch.request': { it: 'RIVINCITA (2X)', en: 'REMATCH (2X)' },
  'rematch.requested': { it: 'RIVINCITA INVIATA (2X)', en: 'REMATCH OFFER SENT (2X)' },
  'rematch.waitingOpponent': { it: 'In attesa della risposta dell\'avversario...', en: 'Waiting for opponent to accept...' },
  'rematch.insufficientBalance': { it: 'Saldo insufficiente! Richiesti {required} GRAM (hai {current} GRAM)', en: 'Insufficient balance! Required {required} GRAM (you have {current} GRAM)' },
  'rematch.depositBtn': { it: 'DEPOSITA GRAM', en: 'DEPOSIT GRAM' },

  // Affiliates / ReferralDashboard
  'affiliates.title': { it: 'IL TUO PROGRAMMA AFFILIATI', en: 'YOUR AFFILIATE PROGRAM' },
  'affiliates.subtitle': { it: 'Guadagna ricompense dai duelli dei tuoi amici', en: 'Earn rewards from your friends\' duels' },
  'affiliates.totalEarnings': { it: 'GUADAGNI TOTALI', en: 'TOTAL EARNINGS' },
  'affiliates.instantPayout': { it: 'Pagamento istantaneo', en: 'Instant payout' },
  'affiliates.friendsInvited': { it: 'AMICI INVITATI', en: 'FRIENDS INVITED' },
  'affiliates.activeInDuels': { it: 'Attivi nei duelli', en: 'Active in duels' },
  'affiliates.personalLink': { it: 'IL TUO LINK DI INVITO PERSONALE', en: 'YOUR PERSONAL INVITE LINK' },
  'affiliates.copied': { it: 'COPIATO!', en: 'COPIED!' },
  'affiliates.inviteBtn': { it: 'INVITA', en: 'INVITE' },
  'affiliates.telegramParam': { it: 'Parametro Telegram:', en: 'Telegram Parameter:' },
  'affiliates.walletConnected': { it: 'Il tuo wallet è connesso e riceverà le quote affiliate automaticamente.', en: 'Your wallet is connected and will receive affiliate shares automatically.' },
  'affiliates.walletNotConnected': { it: 'Connetti il tuo wallet per ricevere i pagamenti dei contratti.', en: 'Connect your wallet to receive contract payouts.' },
  'affiliates.howItWorks': { it: 'COME FUNZIONANO LE RICOMPENSE AFFILIATI', en: 'HOW AFFILIATE REWARDS WORK' },
  'affiliates.step1Title': { it: '1. Invita i tuoi amici', en: '1. Invite Your Friends' },
  'affiliates.step1Desc': { it: 'Invia il tuo link con i parametri ai tuoi contatti. Ogni volta che duellano o scommettono, riceverai automaticamente una quota delle commissioni.', en: 'Send your link with your personal code to your contacts. Every time they duel or place bets, a share of the platform contract fee is automatically routed to you.' },
  'affiliates.step2Title': { it: '2. Aggiungi il Bot nei Gruppi Telegram', en: '2. Add the Bot to Telegram Groups' },
  'affiliates.step2Desc': { it: 'Aggiungi il bot nella tua community Telegram. Quando i membri si sfidano in chat, l\'admin del gruppo guadagna automaticamente su ogni partita.', en: 'Add the bot to your Telegram community. When members challenge each other in chat, the group admin automatically earns affiliate yields on every match.' },
  'affiliates.step3Title': { it: '3. Pagamenti Diretti su Smart Contract', en: '3. Direct Smart Contract Payouts' },
  'affiliates.step3Desc': { it: 'Nessun blocco: le ricompense vengono calcolate e saldate in modo trasparente sulla blockchain TON direttamente al tuo indirizzo.', en: 'Zero lockups: rewards are calculated and settled transparently on the TON blockchain directly to your address.' },

  // Rules & ToS Modal
  'rules.title': { it: 'REGOLAMENTO & TERMINI (ToS)', en: 'RULES & TERMS (ToS)' },
  'rules.fairplay': { it: 'FAIR PLAY', en: 'FAIR PLAY' },
  'rules.duels': { it: 'DUELLI 1V1', en: '1V1 DUELS' },
  'rules.fees': { it: 'COMMISSIONI & PREMI', en: 'FEES & PRIZES' },
  'rules.affiliates': { it: 'AFFILIATI', en: 'AFFILIATES' },
  'rules.understood': { it: 'HO CAPITO', en: 'UNDERSTOOD' },
  'rules.escrowTitle': { it: 'SMART CONTRACT ESCROW (NESSUN RISCHIO BANCO)', en: 'SMART CONTRACT ESCROW (ZERO-HOUSE RISK)' },
  'rules.escrowP1': { it: 'Tutte le puntate dei duelli 1v1 e le scommesse degli spettatori sono custodite in modo sicuro da smart contract dedicati scritti in Tact sulla blockchain TON.', en: 'All 1v1 duel wagers and spectator bets are securely held by dedicated smart contracts written in Tact on the TON blockchain.' },
  'rules.escrowP2': { it: 'Nessun intermediario o server può trattenere o sequestrare i fondi degli utenti: gli esiti sono firmati crittograficamente con firme Ed25519 e accreditati automaticamente al vincitore alla fine di ogni duello.', en: 'No intermediary or server can seize user funds: outcomes are cryptographically signed with authoritative Ed25519 signatures and settled automatically to the winner at the conclusion of each duel.' },
  'rules.transparency': { it: 'Trasparenza Totale: ogni transazione e risoluzione è verificabile pubblicamente sul TON Explorer.', en: 'Total Transparency: Every transaction and resolution is publicly verifiable on the TON Explorer.' },
  'rules.autoRefund': { it: 'Rimborso Automatico: se crei un duello e nessun avversario si unisce, puoi annullare e recuperare l\'intera puntata in qualsiasi momento.', en: 'Automatic Refund: If you create a duel and no opponent joins, you can cancel and refund the full wager at any time.' },
  'rules.duelsTitle': { it: 'DISCIPLINE DEI DUELLI 1V1 E REGOLE', en: '1V1 DUEL DISCIPLINES & RULES' },
  'rules.duelsDesc': { it: 'I duellanti puntano TON / GRAM in giochi PvP ad alta tensione. Tutti gli esiti sono risolti lato server e accreditati automaticamente sul saldo del vincitore.', en: 'Duelists wager TON / GRAM in high-stakes PvP games. All outcomes are resolved server-side and settled automatically to the winner\'s balance.' },
  'rules.rrRule': { it: 'I duellanti a turno scelgono se spararsi (`SHOOT SELF`). A salve passa il turno con probabilità letali crescenti. Ogni giocatore ha a disposizione 1 singolo colpo offensivo contro il rivale: se va a vuoto, dovrà spararsi per tutti i turni successivi! Un colpo letale istantaneo chiude la partita.', en: 'Duelists take turns shooting themselves (`SHOOT SELF`). Blank passes the turn with increasing lethal odds. Each player has 1 single offensive shot against the rival: if missed, you must shoot yourself on all future turns! Instant fatal shot settles the match.' },
  'rules.bjRule': { it: 'Le carte vengono distribuite scoperte da un mazzo comune condiviso visibile a entrambi i duellanti e agli spettatori. Scegli HIT o STAND. Vince la puntata chi si avvicina di più a 21 senza sballare.', en: 'Cards are dealt face-up from a shared common deck visible to both duelists and spectators. Choose HIT or STAND. Closest to 21 without busting wins the wager.' },
  'rules.gbRule': { it: 'Attraversa un ponte infinito di lastre di vetro temperato o fragile. 2 vite a testa. Ogni giocatore può usare 1 singolo PASS per cedere l\'iniziativa all\'avversario. Infrangi tutte le vite e precipita nell\'abisso: l\'ultimo guerriero in piedi vince!', en: 'Step across an endless bridge of tempered vs fragile glass tiles. 2 lives each. Each player can use 1 single PASS to shift the lead to the opponent. Shatter all lives and fall into the abyss—last warrior standing wins!' },
  'rules.cbRule': { it: 'Un timer casuale sprofonda nella Blind Zone buia tra 2.0s e 4.0s. Premi STOP più vicino possibile a 0.000s. Fermare dopo lo 0.000s è BUST. I pareggi attivano il Sudden Death overtime! Il primo a conquistare 2 round vince il match.', en: 'A random timer plunges into the dark Blind Zone between 2.0s and 4.0s. Hit STOP as close to 0.000s as you dare. Stopping past 0.000s is a BUST. Ties trigger Sudden Death overtime! First to secure 2 rounds wins the match.' },
  'rules.settleRule': { it: 'I premi vengono accreditati automaticamente sul saldo in-app al termine del duello. Alla fine di ogni match, entrambi i giocatori possono proporre una rivincita immediata 2X!', en: 'Prizes are automatically credited to your in-bot balance upon duel settlement. At the end of any duel, either player can propose an immediate 2X rematch!' },
  'rules.feesTitle': { it: 'COME FUNZIONANO VINCITE E COMMISSIONI', en: 'HOW WINNINGS & FEES WORK' },
  'rules.feesDesc': { it: 'Nessun margine nascosto. Il vincitore del duello 1v1 riscuote il 100% del montepremi generato dalle puntate di entrambi i giocatori (0% commissione trattenuta dal banco). È prevista solo una quota fissa di partecipazione di 0.05 GRAM per giocatore.', en: 'Zero hidden rake. The 1v1 winner collects 100% of the prize pool generated by both players\' wagers (0% platform rake). There is only a fixed participation fee of 0.05 GRAM per player.' },
  'rules.example': { it: 'Esempio Pratico:', en: 'Practical Example:' },
  'rules.wagerPerPlayer': { it: 'Puntata per giocatore:', en: 'Wager per player:' },
  'rules.poolGenerated': { it: 'Montepremi totale generato:', en: 'Total prize pool generated:' },
  'rules.netPrize': { it: 'Premio netto al vincitore (100%):', en: 'Net prize to winner (100%):' },
  'rules.pariMutuelDesc': { it: 'Per le scommesse degli spettatori in modalità Pari-Mutuel, il 100% del montepremi raccolto viene redistribuito integralmente tra gli spettatori vincenti (0% rake). È prevista solo una quota fissa di partecipazione di 0.05 GRAM per scommessa.', en: 'For spectator Pari-Mutuel betting, 100% of the pool is distributed to winning spectators (0% rake). There is only a fixed participation fee of 0.05 GRAM per bet.' },
  'rules.affiliatesTitle': { it: 'GUADAGNARE CON GLI AFFILIATI', en: 'EARNING WITH AFFILIATES' },
  'rules.affiliatesDesc': { it: 'Ogni duellante possiede un link d\'invito unico. Condividendolo con gli amici o aggiungendo il bot nei gruppi Telegram, guadagni automaticamente una quota su ogni duello giocato:', en: 'Every duelist has a unique invite link. By sharing it with friends or adding the bot to your Telegram groups, you automatically earn a share of every duel played:' },
  'rules.affiliateDirect': { it: 'Referral Giocatori Diretti', en: 'Direct Player Referrals' },
  'rules.affiliateDirectDesc': { it: 'Guadagna fino al 30% delle commissioni di piattaforma generate da tutti i duelli giocati dagli amici invitati.', en: 'Earn up to 30% of platform fees generated from all duels played by friends you invited.' },
  'rules.affiliateGroup': { it: 'Admin di Gruppi Telegram', en: 'Telegram Group Admins' },
  'rules.affiliateGroupDesc': { it: 'Aggiungi il bot nella tua community Telegram: quando i membri duellano nel gruppo, l\'amministratore guadagna automaticamente ricompense su ogni match.', en: 'Add the bot to your Telegram community: when members duel within the group, the group admin automatically earns recurring rewards on every match.' },
  'rules.affiliatePayout': { it: 'Pagamenti Istantanei On-Chain', en: 'Instant On-Chain Payouts' },
  'rules.affiliatePayoutDesc': { it: 'Le commissioni degli affiliati sono accreditate direttamente dallo smart contract all\'indirizzo del tuo wallet TON.', en: 'Affiliate commissions are credited directly from the smart contract to your linked TON wallet address.' },

  // Footer & Common
  'footer.escrow': { it: 'Smart Contract Escrow TON • Gioco Equo Senza Rischio Banco', en: 'TON Smart Contract Escrow • Fair Play Zero House Risk' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_language');
      if (saved === 'it' || saved === 'en') return saved;
      // Default to English as explicitly requested by user
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('sfidabot_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'en' ? 'it' : 'en';
    setLanguage(nextLang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const entry = translations[key];
    let text = entry ? (entry[language] || entry.en || key) : key;
    if (params) {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => useContext(LanguageContext);

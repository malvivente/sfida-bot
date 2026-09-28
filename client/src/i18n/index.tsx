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
  'nav.home': { it: 'Home', en: 'Home' },
  'nav.duels': { it: 'Duelli', en: 'Duels' },
  'nav.activity': { it: 'I Miei Duelli', en: 'My Duels' },
  'nav.invite': { it: 'Invita', en: 'Invite' },
  'nav.arena': { it: 'ARENA', en: 'ARENA' },
  'nav.leaderboard': { it: 'CLASSIFICA', en: 'LEADERBOARD' },
  'nav.leaderboardShort': { it: 'TOP', en: 'TOP' },
  'nav.affiliates': { it: 'AFFILIATI', en: 'AFFILIATES' },
  'nav.profile': { it: 'PROFILO', en: 'PROFILE' },
  'nav.subtitle': { it: 'DUELLI CYBER PVP', en: 'CYBER PVP DUELS' },

  // Epic GUI Experience
  'epic.yourBalance': { it: 'Il tuo saldo', en: 'Your balance' },
  'epic.deposit': { it: 'Deposita', en: 'Deposit' },
  'epic.live': { it: 'Live', en: 'Live' },
  'epic.hot': { it: 'HOT', en: 'HOT' },
  'epic.new': { it: 'NUOVO', en: 'NEW' },
  'epic.back': { it: 'Indietro', en: 'Back' },
  'epic.recentWins': { it: 'Vincite Live', en: 'Live Winnings' },
  'epic.noRecentWins': { it: 'In attesa delle prime vincite...', en: 'Waiting for live wins...' },
  'epic.won': { it: 'ha vinto', en: 'won' },
  'epic.pvpTitle': { it: 'PVP', en: 'PVP' },
  'epic.pvpSubtitle': { it: 'Duelli 1v1 in tempo reale', en: 'Real-time 1v1 duels' },
  'epic.createDuel': { it: 'Crea Sfida', en: 'Create Duel' },
  'epic.playHubTitle': { it: 'PLAY HUB', en: 'PLAY HUB' },
  'epic.playHubSubtitle': { it: 'Tutte le 5 Discipline', en: 'All 5 Disciplines' },
  'epic.playHubDesc': { it: 'Esplora le discipline di combattimento dell\'Arena Sfida: scegli la tua specialità, crea una stanza o unisciti a una sfida attiva!', en: 'Explore the combat disciplines of Sfida Arena: choose your game, create a room, or join an active challenge!' },
  'epic.allGames': { it: 'Tutti i Giochi', en: 'All Games' },
  'epic.trustJackpot': { it: 'TRUST JACKPOT', en: 'TRUST JACKPOT' },
  'epic.jackpotSub': { it: 'LUCKY DROP 30%', en: '30% LUCKY DROP' },
  'epic.inviteTitle': { it: 'COMMUNITY & EARN', en: 'COMMUNITY & EARN' },
  'epic.inviteSub': { it: 'Fino al 30% sulle commissioni', en: 'Up to 30% fee share' },
  'epic.openRooms': { it: 'Stanze Aperte', en: 'Open Rooms' },
  'epic.viewAll': { it: 'Vedi Tutti', en: 'View All' },
  'epic.fastJoin': { it: 'SFIDA', en: 'DUEL' },
  'epic.playNow': { it: 'GIOCA ORA', en: 'PLAY NOW' },
  'epic.activePlayers': { it: 'giocatori attivi', en: 'active players' },
  'epic.splitHeroDesc': { it: 'Dilemma ad alta tensione con Jackpot Condiviso della Fiducia.', en: 'High-tension Prisoner\'s Dilemma with Shared Trust Jackpot.' },
  'epic.splitPeaceBadge': { it: '+12.5% PACE', en: '+12.5% SPLIT' },
  'epic.splitStealBadge': { it: '+20% STEAL', en: '+20% STEAL' },
  'epic.zeroRake': { it: '0% RAKE', en: '0% RAKE' },
  'epic.playHubCardDesc': { it: 'Scegli la tua disciplina: revolver, 21 cyber, ponte di vetro, riflessi e fiducia.', en: 'Choose your discipline: revolver, cyber 21, glass bridge, reflexes, and trust.' },
  'epic.pvpHubDesc': { it: 'Scegli la tua disciplina: Roulette, Blackjack, Ponte di Vetro e Chrono.', en: 'Choose your discipline: Roulette, Blackjack, Glass Bridge and Chrono.' },
  'epic.pvpHubBtn': { it: 'ENTRA NEL PLAY HUB', en: 'ENTER PLAY HUB' },
  'epic.spectateTitle': { it: 'SCOMMESSE & LIVE', en: 'SPECTATE & BET' },
  'epic.spectateBadge': { it: 'SPETTATORI LIVE', en: 'LIVE SPECTATE' },
  'epic.spectateDesc': { it: 'Guarda i duelli in corso in tempo reale e scommetti con quote Pari-Mutuel dinamiche.', en: 'Watch live duels in real-time and bet with dynamic Pari-Mutuel odds.' },
  'epic.spectateBtn': { it: 'GUARDA I DUELLI', en: 'WATCH DUELS' },
  'epic.spectateOddsBadge': { it: 'QUOTE DINAMICHE', en: 'DYNAMIC ODDS' },
  'epic.jackpotCardDesc': { it: 'Gira la Ruota nei duelli Split or Steal!', en: 'Spin the Lucky Drop Wheel in Split or Steal duels!' },
  'epic.earnCardPill': { it: 'FINO AL 30%', en: 'UP TO 30%' },
  'epic.earnCardChat': { it: 'GRUPPI TELEGRAM', en: 'TELEGRAM GROUPS' },
  'epic.earnCardDesc': { it: 'Guadagna commissioni continue su ogni sfida in chat!', en: 'Earn continuous commissions on every match played in chat!' },
  'epic.openPvpHub': { it: 'VEDI TUTTI', en: 'VIEW ALL' },
  'playHub.splitDesc': { it: 'Dilemma del Prigioniero: collabora per il +12.5% dal Trust Jackpot o ruba per il +20%!', en: 'Prisoner\'s Dilemma: cooperate for +12.5% Trust Jackpot or steal for +20%!' },
  'playHub.splitBadge': { it: 'FIDUCIA', en: 'TRUST' },
  'playHub.playNow': { it: 'GIOCA ORA', en: 'PLAY NOW' },
  'playHub.viewRooms': { it: 'STANZE APERTE', en: 'OPEN ROOMS' },
  'lobby.configureForGame': { it: 'CONFIGURA: {game}', en: 'SET UP: {game}' },
  'activity.playNow': { it: 'GIOCA ORA', en: 'PLAY NOW' },
  'epic.openPlayHub': { it: 'APRI HUB', en: 'OPEN HUB' },

  'playHub.rouletteDesc': { it: '8 colpi tattici, 1 proiettile mortale. Spara all\'avversario o tenta la sorte.', en: '8 tactical shots, 1 live round. Shoot your foe or test your luck.' },
  'playHub.blackjackDesc': { it: 'Carte scoperte da un mazzo comune visibile a tutti.', en: 'Cards revealed from a public shared deck.' },
  'playHub.bridgeDesc': { it: 'Passi infiniti su vetro. 2 vite a testa o cedi il passo.', en: 'Endless glass bridge. 2 lives each or yield the step.' },
  'playHub.chronoDesc': { it: 'Timer al buio. Ferma più vicino possibile allo 0.000s!', en: 'Blind countdown. Stop as close to 0.000s as possible!' },
  'playHub.openRooms': { it: '{count} stanze aperte', en: '{count} open rooms' },
  'playHub.rouletteBadge': { it: '8 COLPI', en: '8 SHOTS' },
  'playHub.badgeRoulette': { it: 'REVOLVER', en: 'REVOLVER' },
  'playHub.badgeBlackjack': { it: '21 SCOPERTO', en: '21 FACE-UP' },
  'playHub.badgeBridge': { it: '12 PANNELLI', en: '12 PANELS' },
  'playHub.badgeChrono': { it: 'RIFLESSI', en: 'REFLEXES' },
  'epic.pvpArenaTag': { it: 'ARENA PVP 1V1', en: '1V1 PVP ARENA' },
  'epic.fiveDisciplines': { it: '5 DISCIPLINE', en: '5 DISCIPLINES' },
  'epic.pariMutuel': { it: 'PARI-MUTUEL', en: 'PARI-MUTUEL' },
  'epic.zeroFee': { it: '0% COMMISSIONI', en: '0% FEE' },

  // Trust Jackpot Wheel
  'wheel.peaceDropTitle': { it: 'Ruota Jackpot della Fiducia', en: 'Trust Jackpot Lucky Drop' },
  'wheel.stealDropTitle': { it: 'Taglia Tentazione Jackpot', en: 'Temptation Bounty Drop' },
  'wheel.dropRate': { it: '30% DROP', en: '30% DROP' },
  'wheel.spinningPeace': { it: 'La ruota sta girando per il bonus 12.5% a testa...', en: 'Wheel spinning for 12.5% shared bonus...' },
  'wheel.spinningSteal': { it: 'La ruota sta girando per la Taglia Tentazione (+20%)...', en: 'Wheel spinning for Temptation Bounty (+20%)...' },
  'wheel.wonPeace': { it: '🎉 Bonus Jackpot Assegnato (+12.5% a testa)!', en: '🎉 Jackpot Bonus Awarded (+12.5% each)!' },
  'wheel.wonSteal': { it: '🗡️ Taglia Tentazione Assegnata (+20%)!', en: '🗡️ Temptation Bounty Awarded (+20%)!' },
  'wheel.refundPeace': { it: '🤝 Rimborso 100% Puntata Confermato', en: '🤝 100% Wager Refund Confirmed' },
  'wheel.refundSteal': { it: '🗡️ Piatto 100% Incassato', en: '🗡️ 100% Pot Collected' },
  'wheel.standbyPeace': { it: 'Entrambi avete scelto SPLIT! Estrazione in corso...', en: 'Both chose SPLIT! Lucky Drop drawing...' },
  'wheel.standbySteal': { it: 'Tradimento riuscito! Estrazione taglia tentazione in corso...', en: 'Betrayal success! Temptation drawing...' },
  'wheel.wonPeaceBanner': { it: 'JACKPOT DROP VINTO!', en: 'JACKPOT DROP WON!' },
  'wheel.wonStealBanner': { it: 'BOUNTY TENTAZIONE VINTO!', en: 'TEMPTATION BOUNTY WON!' },
  'wheel.wonPeaceDesc': { it: 'Entrambi ricevete il rimborso del 100% della puntata ({wager} GRAM) + Bonus del 12.5%:', en: 'Both players receive a 100% stake refund ({wager} GRAM) + 12.5% Bonus:' },
  'wheel.wonStealDesc': { it: 'Hai vinto l\'intero piatto ({pot} GRAM) + Bonus Tentazione del 20%:', en: 'You won the full pot ({pot} GRAM) + 20% Temptation Bounty:' },
  'wheel.potWonBanner': { it: 'PIATTO 100% CONQUISTATO!', en: '100% POT COLLECTED!' },
  'wheel.refundBanner': { it: 'PUNTATA RIMBORSATA AL 100%', en: '100% STAKE REFUNDED' },
  'wheel.potCollected': { it: 'Hai incassato l\'intero montepremi di {pot} GRAM. (Drop 20% non estratto).', en: 'You won the entire prize pool of {pot} GRAM. (20% Drop not drawn).' },
  'wheel.refundPreserved': { it: 'Lucky Drop 30% non estratto questa volta. Capitale interamente preservato (+{wager} GRAM).', en: '30% Lucky Drop not drawn this time. Stake fully preserved (+{wager} GRAM).' },
  'wheel.each': { it: 'A TESTA', en: 'EACH' },
  'wheel.extraBonus': { it: 'BONUS EXTRA', en: 'EXTRA BONUS' },
  'wheel.skip': { it: 'SALTA', en: 'SKIP' },
  'wheel.skipAnimation': { it: 'Salta animazione', en: 'Skip animation' },
  'wheel.replaySpin': { it: 'Rivedi estrazione', en: 'Replay spin' },

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
  'profile.depositSubmitted': { it: 'Deposito di {amount} GRAM inviato alla rete!', en: 'Deposit of {amount} GRAM submitted to network!' },
  'profile.depositCancelled': { it: 'Deposito annullato o rifiutato nel wallet.', en: 'Deposit was cancelled or rejected in wallet.' },
  'profile.depositRejected': { it: 'Transazione rifiutata o annullata nel wallet.', en: 'Transaction was rejected or cancelled in wallet.' },
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
  'spectator.minBetNotice': { it: 'Puntata minima: 0.1 GRAM', en: 'Minimum bet: 0.1 GRAM' },
  'spectator.isPlayerNotice': { it: 'Sei un duellante in questa partita: le scommesse spettatori sono disabilitate per i combattenti.', en: 'You are a duelist in this match: spectator betting is disabled for combatants.' },
  'spectator.waitingReady': { it: 'IN ATTESA DEI DUELLANTI', en: 'WAITING FOR DUELISTS' },
  'spectator.waitingReadyNotice': { it: 'Le scommesse apriranno per 30s quando entrambi i duellanti saranno pronti', en: '30s betting window unlocks once both duelists are ready' },
  'spectator.bettingWindowActive': { it: 'FINESTRA SCOMMESSE ATTIVA', en: 'BETTING WINDOW ACTIVE' },
  'spectator.bettingClosed': { it: 'SCOMMESSE CHIUSE', en: 'BETTING CLOSED' },
  'spectator.bettingClosedNotice': { it: 'Scommesse chiuse • Duello in corso', en: 'Betting closed • Duel in progress' },
  'spectator.btnWaitingReady': { it: 'ATTESA CHE I DUELLANTI SIANO PRONTI', en: 'WAITING FOR DUELISTS TO READY UP' },
  'spectator.btnBettingClosed': { it: 'SCOMMESSE CHIUSE (DUELLO IN CORSO)', en: 'BETTING CLOSED (DUEL IN PROGRESS)' },

  // Match Detail
  'matchDetail.settledOnTon': { it: 'CONCLUSO SU TON', en: 'SETTLED ON TON' },
  'matchDetail.winnerCrown': { it: 'Vittoria Epica', en: 'Epic Victory' },
  'matchDetail.payoutLabel': { it: 'Vincita (100% Montepremi)', en: 'Payout (100% Pot)' },
  'matchDetail.totalPot': { it: 'Montepremi Totale:', en: 'Total Pot:' },
  'matchDetail.playerRake': { it: 'Rake Duellanti (0%):', en: 'Player Rake (0%):' },
  'matchDetail.spectatorPool': { it: 'Pool Totale Spettatori:', en: 'Spectator Pool Total:' },
  'matchDetail.spectatorRake': { it: 'Rake Spettatori (0%):', en: 'Spectator Rake (0%):' },
  'matchDetail.distributablePool': { it: 'Pool Spettatori Distribuibile:', en: 'Distributable Spectator Pool:' },
  'matchDetail.claimSpectator': { it: 'RISCATTA VINCITE SPETTATORI', en: 'CLAIM SPECTATOR WINNINGS' },
  'matchDetail.claimSuccess': { it: 'Premio riscattato con successo!', en: 'Reward claimed successfully!' },
  'matchDetail.claimError': { it: 'Errore nel riscatto: {error}', en: 'Claim error: {error}' },

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
  'lobby.splitPrivateJackpotNotice': { it: 'Nelle stanze private il Bonus Trust Jackpot non è attivo (riservato alle partite pubbliche della lobby).', en: 'In private rooms, the Trust Jackpot Bonus is inactive (reserved for public lobby matches).' },
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
  'lobby.filterTitle': { it: 'Filtri e Ricerca', en: 'Filters & Search' },
  'lobby.filterBtn': { it: 'Filtri', en: 'Filters' },
  'lobby.filterAll': { it: 'Tutti', en: 'All' },
  'lobby.filterPublic': { it: 'Pubbliche', en: 'Public' },
  'lobby.filterPrivate': { it: 'Private', en: 'Private' },
  'lobby.filterOpenOnly': { it: 'Solo Aperte', en: 'Open Only' },
  'lobby.filterAllBets': { it: 'Tutte le Puntate', en: 'All Stakes' },
  'lobby.filterMicroBet': { it: '≤ 1 GRAM', en: '≤ 1 GRAM' },
  'lobby.filterMidBet': { it: '1 - 5 GRAM', en: '1 - 5 GRAM' },
  'lobby.filterHighBet': { it: '5+ GRAM', en: '5+ GRAM' },
  'lobby.sortLabel': { it: 'Ordina per:', en: 'Sort by:' },
  'lobby.sortNewest': { it: 'Più Recenti', en: 'Newest' },
  'lobby.sortHighBet': { it: 'Puntata Più Alta', en: 'Highest Stake' },
  'lobby.sortLowBet': { it: 'Puntata Più Bassa', en: 'Lowest Stake' },
  'lobby.searchPlaceholder': { it: 'Cerca giocatore o #Match...', en: 'Search player or #Match...' },
  'lobby.resetFilters': { it: 'Azzera Filtri', en: 'Reset Filters' },
  'lobby.filteredNoResults': { it: 'Nessun duello corrisponde ai filtri selezionati', en: 'No duels match the selected filters' },
  'lobby.filteredNoResultsDesc': { it: 'Prova a modificare i filtri di puntata, accesso o modalità per visualizzare altre sfide.', en: 'Try adjusting the stake, access or game mode filters to find other duels.' },
  'lobby.splitMinWagerWarn': { it: 'La puntata minima per Split or Steal è di 5.00 GRAM.', en: 'Minimum wager for Split or Steal is 5.00 GRAM.' },
  'lobby.yourDuelTag': { it: 'IL TUO DUELLO', en: 'YOUR DUEL' },
  'lobby.createdByName': { it: 'Creato da', en: 'Created by' },
  'lobby.eachLabel': { it: 'ciascuno', en: 'each' },
  'lobby.filtersLabel': { it: 'Filtri:', en: 'Filters:' },
  'lobby.sharePrivateText': { it: '⚔️ Ti ho invitato a un duello PRIVATO su {title} per {wager} GRAM! Entra con questo link unico:', en: '⚔️ I invited you to a PRIVATE {title} duel for {wager} GRAM! Join using this unique link:' },
  'lobby.sharePublicText': { it: '⚔️ Ti sfido a un duello su {title} per {wager} GRAM! {tagline}', en: '⚔️ I challenge you to a {title} duel for {wager} GRAM! {tagline}' },

  // Arena & Rematch
  'arena.cancelModalTitle': { it: 'ANNULLA DUELLO E RIMBORSA', en: 'CANCEL DUEL & REFUND' },
  'arena.cancelModalDesc': { it: 'Sei sicuro di voler annullare la stanza #{matchId}?', en: 'Are you sure you want to cancel room #{matchId}?' },
  'arena.amountToRefund': { it: 'Importo da Rimborsare:', en: 'Amount to Refund:' },
  'arena.cancelRefundNotice': { it: 'La puntata e la commissione di creazione verranno rimborsate immediatamente sul tuo saldo in-bot (0 gas).', en: 'The wager and creation fee will be refunded immediately back to your in-bot balance (0 gas).' },
  'arena.cancelOpponentRefundNotice': { it: ' Poiché un avversario si è già unito, verrà rimborsata anche la sua puntata.', en: ' Since an opponent joined, their wager will also be refunded.' },
  'arena.confirmCancelBtn': { it: 'CONFERMA ANNULLAMENTO', en: 'CONFIRM CANCEL' },
  'arena.refundingBtn': { it: 'RIMBORSO IN CORSO...', en: 'REFUNDING...' },
  'arena.depositModalTitle': { it: 'DEPOSITA GRAM SUL SALDO BOT', en: 'DEPOSIT GRAM TO IN-BOT BALANCE' },
  'arena.depositModalDesc': { it: 'Deposita GRAM via TON Wallet sul tuo saldo per sfide istantanee e rivincite 2X.', en: 'Deposit GRAM via TON Wallet into your balance for instant duels and 2X rematches.' },
  'arena.depositAmountLabel': { it: 'Importo (GRAM):', en: 'Amount (GRAM):' },
  'arena.currentBalLabel': { it: 'Attuale: {amount} GRAM', en: 'Current: {amount} GRAM' },
  'arena.confirmDepositBtn': { it: 'CONFERMA DEPOSITO', en: 'CONFIRM DEPOSIT' },
  'arena.shareDuel': { it: 'CONDIVIDI', en: 'SHARE' },
  'arena.cancelDuel': { it: 'ANNULLA', en: 'CANCEL' },
  'arena.backToLobby': { it: 'TORNA IN LOBBY', en: 'BACK TO LOBBY' },
  'arena.joinDuelAsOpponent': { it: 'PARTECIPA AL DUELLO ({amount} GRAM)', en: 'JOIN DUEL ({amount} GRAM)' },
  'arena.waitingForOpponent': { it: 'IN ATTESA DI UNO SFIDANTE...', en: 'WAITING FOR OPPONENT...' },
  'arena.spectatorWaitingOpponent': { it: '👁️ VISTA SPETTATORE • IN ATTESA DI UNO SFIDANTE', en: '👁️ SPECTATOR VIEW • WAITING FOR OPPONENT' },
  'arena.spectatorWaitingReady': { it: '👁️ VISTA SPETTATORE • IN ATTESA DEI DUELLANTI', en: '👁️ SPECTATOR VIEW • WAITING FOR DUELISTS' },
  'arena.readyToDuel': { it: '⚔️ PRONTO AL DUELLO', en: '⚔️ READY TO DUEL' },
  'arena.readyWaiting': { it: 'PRONTO • IN ATTESA DELL\'AVVERSARIO', en: 'READY • WAITING FOR OPPONENT' },
  'arena.waitingForOpponentBtn': { it: '⏳ IN ATTESA DI UNO SFIDANTE...', en: '⏳ WAITING FOR OPPONENT...' },
  'arena.joinAsPlayer': { it: 'PARTECIPA AL DUELLO ({amount} GRAM)', en: 'JOIN DUEL ({amount} GRAM)' },
  'arena.readyBadge': { it: '✓ PRONTO', en: '✓ READY' },
  'arena.waitingBadge': { it: 'ATTESA', en: 'WAITING' },
  'arena.notReadyBadge': { it: 'NON PRONTO', en: 'NOT READY' },

  // Split or Steal Game Mode & Trust Jackpot
  'split.title': { it: 'SPLIT OR STEAL', en: 'SPLIT OR STEAL' },
  'split.lobbyTitle': { it: 'LOBBY SPLIT OR STEAL', en: 'SPLIT OR STEAL LOBBY' },
  'split.lobbyWaitingDesc': { it: 'In attesa che un secondo duellante si unisca alla stanza...', en: 'Waiting for an opponent to join the match...' },
  'split.lobbyReadyDesc': { it: 'Entrambi i duellanti devono confermare READY per avviare la finestra scommesse (30s) e il duello.', en: 'Both duelists must confirm READY to start the 30s betting window and duel.' },
  'split.trustJackpot': { it: 'JACKPOT DELLA FIDUCIA', en: 'TRUST JACKPOT' },
  'split.jackpotActive': { it: 'ATTIVO (LUCKY DROP 30%)', en: 'ACTIVE (30% LUCKY DROP)' },
  'split.jackpotCharging': { it: 'IN CARICA (< 5G)', en: 'CHARGING (< 5G)' },
  'split.bonusUnlockedDesc': { it: 'Lucky Drop: +12.5% a testa se Split, +20% taglia se Steal', en: 'Lucky Drop: +12.5% each on Split, +20% bounty on Steal' },
  'split.refundOnlyDesc': { it: 'Solo rimborso se entrambi Split', en: 'Refund only if both Split' },
  'split.bettingWindow': { it: 'FINESTRA SCOMMESSE APERTA', en: 'BETTING WINDOW OPEN' },
  'split.bettingWindowDesc': { it: 'Gli spettatori stanno piazzando le scommesse 1-X-2. Il duello inizierà al termine del countdown!', en: 'Spectators are placing 1-X-2 bets. The duel will begin after countdown!' },
  'split.secondsLeft': { it: 'SECONDI RIMASTI', en: 'SECONDS REMAINING' },
  'split.choiceLocked': { it: 'DECISIONE REGISTRATA', en: 'CHOICE LOCKED' },
  'split.choiceLockedDesc': { it: 'Hai scelto in segreto: {choice}. Le scelte saranno svelate simultaneamente allo scadere del tempo!', en: 'You secretly selected: {choice}. Choices will be revealed simultaneously once timer ends!' },
  'split.pickPrompt': { it: 'Fai la tua scelta in segreto:', en: 'Make your secret choice:' },
  'split.btnSplit': { it: 'SPLIT', en: 'SPLIT' },
  'split.btnSplitTag': { it: 'COOPERA', en: 'COOPERATE' },
  'split.btnSplitDesc': { it: 'Se entrambi fate Split, vi rimborsate la puntata + fino al 12.5% dal Jackpot della Fiducia!', en: 'If both Split, wagers are refunded + up to 12.5% from the Trust Jackpot!' },
  'split.btnSteal': { it: 'STEAL', en: 'STEAL' },
  'split.btnStealTag': { it: 'TRADISCI', en: 'BETRAY' },
  'split.btnStealDesc': { it: 'Se l\'altro fa Split, incassi il 100% del piatto + 20% Taglia Tentazione! Se rubate entrambi, perdete tutto!', en: 'If the other Splits, take 100% of the pot + 20% Temptation Bounty! If both Steal, you lose all!' },
  'split.thinking': { it: 'STA SCEGLIENDO...', en: 'THINKING...' },
  'split.secretLocked': { it: 'SCELTA BLOCCATA', en: 'CHOICE LOCKED' },
  'split.spectatorWatching': { it: 'SCELTA SEGRETA DEI DUELLANTI', en: 'SECRET DUELIST CHOICES' },
  'split.spectatorWatchingDesc': { it: 'I duellanti stanno scegliendo in segreto se cooperare o tradire. I risultati verranno mostrati a breve!', en: 'Duelists are secretly choosing whether to cooperate or betray. Results will appear shortly!' },
  'split.outcomePeace': { it: '🤝 PACE ASSOLUTA (SPLIT / SPLIT)', en: '🤝 ABSOLUTE PEACE (SPLIT / SPLIT)' },
  'split.outcomePeaceDesc': { it: 'Entrambi i duellanti hanno scelto la cooperazione!', en: 'Both duelists chose cooperation!' },
  'split.outcomePeaceRefund': { it: 'Puntata rimborsata ({amount} GRAM)', en: 'Wager refunded ({amount} GRAM)' },
  'split.outcomePeaceBonus': { it: '+ {amount} GRAM BONUS JACKPOT DELLA FIDUCIA!', en: '+ {amount} GRAM TRUST JACKPOT BONUS!' },
  'split.outcomeSteal': { it: '🗡️ TRADIMENTO VINCENTE!', en: '🗡️ SUCCESSFUL BETRAYAL!' },
  'split.outcomeStealDesc': { it: '{winner} ha scelto STEAL mentre l\'avversario ha scelto SPLIT!', en: '{winner} chose STEAL while the opponent chose SPLIT!' },
  'split.outcomeStealPot': { it: '{winner} incassa l\'intero piatto!', en: '{winner} collects the entire pot!' },
  'split.outcomeDoubleSteal': { it: '💀 DOPPIO TRADIMENTO (STEAL / STEAL)', en: '💀 DOUBLE BETRAYAL (STEAL / STEAL)' },
  'split.outcomeDoubleStealDesc': { it: 'Entrambi i duellanti hanno provato a rubare! Nessun vincitore.', en: 'Both duelists tried to steal! Zero winners.' },
  'split.outcomeDoubleStealPot': { it: '100% del piatto perso: 50% alla Piattaforma e 50% alimenta il Jackpot della Fiducia!', en: '100% pot lost: 50% Platform profit and 50% to Trust Jackpot!' },
  'split.rematchOffer': { it: '{name} ha proposto una rivincita ({amount} GRAM)!', en: '{name} offered a rematch ({amount} GRAM)!' },
  'split.rematchRequest': { it: 'CHIEDI RIVINCITA', en: 'REQUEST REMATCH' },
  'split.rematchRequested': { it: 'RIVINCITA RICHIESTA...', en: 'REMATCH REQUESTED...' },
  'split.returnToArena': { it: 'TORNA ALL\'ARENA', en: 'RETURN TO ARENA' },
  'split.chargingTag': { it: 'IN CARICA', en: 'CHARGING' },
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
  'affiliates.groupsTitle': { it: 'COMMUNITY & GRUPPI AFFILIATI', en: 'AFFILIATED COMMUNITIES & GROUPS' },
  'affiliates.groupsSubtitle': { it: 'Statistiche delle community che gestisci come manager', en: 'Live statistics for communities you manage' },
  'affiliates.groupMatches': { it: 'Partite', en: 'Matches' },
  'affiliates.groupVolume': { it: 'Volume', en: 'Volume' },
  'affiliates.groupCommission': { it: 'Commissione', en: 'Commission' },
  'affiliates.groupEarnings': { it: 'Guadagni', en: 'Earnings' },
  'affiliates.noGroupsTitle': { it: 'POSSIEDI UNA COMMUNITY TELEGRAM?', en: 'MANAGE A TELEGRAM COMMUNITY?' },
  'affiliates.noGroupsDesc': { it: 'Aggiungi il bot nel tuo gruppo e contatta l\'amministratore per attivare le commissioni affiliate sulle partite giocate nella community (fino al 15% delle quote fisse di partecipazione e taglie del 5% su Split or Steal).', en: 'Add the bot to your community and contact the admin to activate affiliate commissions on matches played in your group (up to 15% of fixed participation fees and 5% bounties on Split or Steal).' },
  'affiliates.contactAdminBtn': { it: 'CONTATTA ADMIN', en: 'CONTACT ADMIN' },

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
  'rules.duelsDesc': { it: 'I duellanti puntano GRAM in giochi PvP ad alta tensione. Tutti gli esiti sono risolti lato server e accreditati automaticamente sul saldo del vincitore.', en: 'Duelists wager GRAM in high-stakes PvP games. All outcomes are resolved server-side and settled automatically to the winner\'s balance.' },
  'rules.rrRule': { it: 'I duellanti a turno scelgono se spararsi (`SHOOT SELF`). A salve passa il turno con probabilità letali crescenti. Ogni giocatore ha a disposizione 1 singolo colpo offensivo contro il rivale: se va a vuoto, dovrà spararsi per tutti i turni successivi! Un colpo letale istantaneo chiude la partita.', en: 'Duelists take turns shooting themselves (`SHOOT SELF`). Blank passes the turn with increasing lethal odds. Each player has 1 single offensive shot against the rival: if missed, you must shoot yourself on all future turns! Instant fatal shot settles the match.' },
  'rules.bjRule': { it: 'Le carte vengono distribuite scoperte da un mazzo comune condiviso visibile a entrambi i duellanti e agli spettatori. Scegli HIT o STAND. Vince la puntata chi si avvicina di più a 21 senza sballare.', en: 'Cards are dealt face-up from a shared common deck visible to both duelists and spectators. Choose HIT or STAND. Closest to 21 without busting wins the wager.' },
  'rules.gbRule': { it: 'Attraversa un ponte infinito di lastre di vetro temperato o fragile. 2 vite a testa. Ogni giocatore può usare 1 singolo PASS per cedere l\'iniziativa all\'avversario. Infrangi tutte le vite e precipita nell\'abisso: l\'ultimo guerriero in piedi vince!', en: 'Step across an endless bridge of tempered vs fragile glass tiles. 2 lives each. Each player can use 1 single PASS to shift the lead to the opponent. Shatter all lives and fall into the abyss—last warrior standing wins!' },
  'rules.cbRule': { it: 'Un timer casuale sprofonda nella Blind Zone buia tra 2.0s e 4.0s. Premi STOP più vicino possibile a 0.000s. Fermare dopo lo 0.000s è BUST. I pareggi attivano il Sudden Death overtime! Il primo a conquistare 2 round vince il match.', en: 'A random timer plunges into the dark Blind Zone between 2.0s and 4.0s. Hit STOP as close to 0.000s as you dare. Stopping past 0.000s is a BUST. Ties trigger Sudden Death overtime! First to secure 2 rounds wins the match.' },
  'rules.ssRule': {
    it: `Dilemma del Prigioniero ad alta tensione (puntata min. 5.00 GRAM):
⏱️ Decisione Segreta (30s): Entrambi i duellanti scelgono in segreto tra SPLIT (Coopera) o STEAL (Tradisci). Le scelte rimangono crittografate fino allo scadere del tempo.

🤝 Doppio Split (Pace Assoluta):
• Rimborso 100% della puntata a entrambi i giocatori.
• Nelle partite pubbliche della lobby, se il Trust Jackpot è attivo (≥ 5.0 GRAM), gira la Ruota Lucky Drop (30% probabilità) con un Bonus del 25% della puntata diviso equamente (12.5% a testa) prelevato dal Jackpot!

🗡️ Steal vs Split (Tradimento & Taglia Tentazione):
• Chi sceglie STEAL vince il 100% del piatto (2x la puntata). Chi ha scelto SPLIT perde la puntata.
• Nelle partite pubbliche con Jackpot attivo, chi ruba gira la Ruota Lucky Drop (30% probabilità) per una Taglia Tentazione extra del 20% della propria puntata dal Trust Jackpot!

💀 Doppio Steal (Avidità & Distruzione):
• Se entrambi scelgono STEAL, nessuno vince ed entrambi perdono il 100% della puntata.
• Il piatto bruciato alimenta per il 50% il Trust Jackpot, il 10% va in taglie per la community/referrer (5% gruppo e 2.5% a ciascun referrer) e il 40% alla Treasury.

🛡️ Regole Anti-Abuso & Limiti:
• Bonus Jackpot validi SOLO nelle stanze pubbliche della lobby (non disponibili nelle stanze private).
• Cooldown 48 ore: la stessa coppia di giocatori può riscuotere il bonus Jackpot una sola volta ogni 48 ore.
• Blocco Referral: due utenti legati da invito diretto non possono incassare bonus Jackpot sfidandosi tra loro.`,
    en: `High-stakes Prisoner's Dilemma showdown (min. wager 5.00 GRAM):
⏱️ Secret Decision Window (30s): Both duelists secretly choose SPLIT (Cooperate) or STEAL (Betray). Choices remain encrypted until the timer expires.

🤝 Mutual Split (Absolute Peace):
• 100% full wager refund to both players.
• In open public lobby matches with an active Trust Jackpot (≥ 5.0 GRAM), the 30% Lucky Drop Wheel spins for a 25% wager bonus shared equally (12.5% each) from the Jackpot!

🗡️ Steal vs Split (Betrayal & Temptation Bounty):
• The stealer wins the entire pot (100% pot / 2x wager). The cooperating player loses their stake.
• In public matches with active Jackpot, the stealer also spins the 30% Lucky Drop Wheel for an extra 20% Temptation Bounty on their wager taken from the Trust Jackpot!

💀 Double Steal (Greed & Total Loss):
• If both duelists choose STEAL, zero winners and both lose 100% of their stakes.
• The burned pot is redistributed: 50% feeds the Trust Jackpot, 10% to community & referrers (5% group & 2.5% to each referrer), and 40% to Platform Treasury.

🛡️ Anti-Collusion Rules & Safeguards:
• Jackpot bonuses trigger ONLY in public lobby matches (unavailable in private rooms).
• 48-Hour Cooldown: The same pair of players can only trigger a Jackpot bonus once every 48 hours.
• Referral Lock: Players connected by direct invite/referral cannot trigger Jackpot bonuses against each other.`
  },
  'rules.settleRule': { it: 'I premi vengono accreditati automaticamente sul saldo in-app al termine del duello. Alla fine di ogni match, entrambi i giocatori possono proporre una rivincita immediata 2X!', en: 'Prizes are automatically credited to your in-bot balance upon duel settlement. At the end of any duel, either player can propose an immediate 2X rematch!' },
  'rules.feesTitle': { it: 'COME FUNZIONANO VINCITE E COMMISSIONI', en: 'HOW WINNINGS & FEES WORK' },
  'rules.feesDesc': { it: 'Nessun margine nascosto. Il vincitore del duello 1v1 riscuote il 100% del montepremi generato dalle puntate di entrambi i giocatori (0% commissione trattenuta dal banco). È prevista solo una quota fissa di partecipazione di 0.05 GRAM per giocatore. Prelievo minimo consentito: 1.00 GRAM (per evitare lo spreco di fee di rete).', en: 'Zero hidden rake. The 1v1 winner collects 100% of the prize pool generated by both players\' wagers (0% platform rake). There is only a fixed participation fee of 0.05 GRAM per player. Minimum withdrawal allowed: 1.00 GRAM (to avoid network fee waste).' },
  'rules.example': { it: 'Esempio Pratico:', en: 'Practical Example:' },
  'rules.wagerPerPlayer': { it: 'Puntata per giocatore:', en: 'Wager per player:' },
  'rules.poolGenerated': { it: 'Montepremi totale generato:', en: 'Total prize pool generated:' },
  'rules.netPrize': { it: 'Premio netto al vincitore (100%):', en: 'Net prize to winner (100%):' },
  'rules.pariMutuelDesc': { it: 'Per le scommesse degli spettatori in modalità Pari-Mutuel, il 100% del montepremi raccolto viene redistribuito integralmente tra gli spettatori vincenti (0% rake). È prevista solo una quota fissa di partecipazione di 0.05 GRAM per scommessa.', en: 'For spectator Pari-Mutuel betting, 100% of the pool is distributed to winning spectators (0% rake). There is only a fixed participation fee of 0.05 GRAM per bet.' },
  'rules.affiliatesTitle': { it: 'GUADAGNARE CON GLI AFFILIATI', en: 'EARNING WITH AFFILIATES' },
  'rules.affiliatesDesc': { it: 'Ogni duellante possiede un link d\'invito unico. Condividendolo con gli amici o aggiungendo il bot nei gruppi Telegram, guadagni automaticamente una quota su ogni duello giocato:', en: 'Every duelist has a unique invite link. By sharing it with friends or adding the bot to your Telegram groups, you automatically earn a share of every duel played:' },
  'rules.affiliateDirect': { it: 'Referral Giocatori Diretti', en: 'Direct Player Referrals' },
  'rules.affiliateDirectDesc': { it: 'Guadagna una quota sulle quote fisse di partecipazione generate dai tuoi invitati (fino al 30% delle fee di piattaforma) e taglie del 2.5% sui doppi tradimenti in Split or Steal.', en: 'Earn a share of fixed participation fees from your invited players (up to 30% platform fee share) plus 2.5% bounties on Split or Steal double betrayals.' },
  'rules.affiliateGroup': { it: 'Admin di Gruppi Telegram', en: 'Telegram Group Admins' },
  'rules.affiliateGroupDesc': { it: 'Aggiungi il bot nella tua community Telegram: quando i membri duellano nel gruppo, guadagni quote fisse su ogni match e una taglia del 5% in caso di Doppio Tradimento.', en: 'Add the bot to your Telegram community: when members duel in the group, earn fixed fees on every match plus a 5% bounty on double betrayals.' },
  'rules.affiliatePayout': { it: 'Accrediti Istantanei & Prelievo Libero', en: 'Instant Earnings & Free Withdrawals' },
  'rules.affiliatePayoutDesc': { it: 'Le commissioni degli affiliati vengono accreditate in tempo reale sul saldo interno del bot e possono essere prelevate in qualsiasi momento con un click (min. 1.00 GRAM).', en: 'Affiliate commissions are credited in real-time to your in-app balance and can be withdrawn anytime with one click (min. 1.00 GRAM).' },

  // Quick Deposit Modal
  'depositModal.title': { it: 'DEPOSITA GRAM', en: 'DEPOSIT GRAM' },
  'depositModal.subtitle': { it: 'Ricarica il saldo per duelli immediati', en: 'Top up balance for instant duels' },
  'depositModal.currentBalance': { it: 'Saldo attuale:', en: 'Current balance:' },
  'depositModal.amountLabel': { it: 'Importo da depositare:', en: 'Amount to deposit:' },
  'depositModal.cancel': { it: 'ANNULLA', en: 'CANCEL' },
  'depositModal.confirm': { it: 'CONFERMA DEPOSITO', en: 'CONFIRM DEPOSIT' },
  'depositModal.successMsg': { it: 'Deposito di {amount} GRAM confermato! Il saldo si è aggiornato.', en: 'Deposit of {amount} GRAM confirmed! Your balance has been updated.' },
  'depositModal.errorRejected': { it: 'Transazione annullata o rifiutata dal wallet.', en: 'Transaction cancelled or rejected by wallet.' },
  'depositModal.errorNetwork': { it: 'Errore di rete o server non raggiungibile. Riprova.', en: 'Network error or game server unreachable. Please try again.' },
  'depositModal.errorGeneric': { it: 'Errore durante il deposito. Riprova.', en: 'Error during deposit. Please try again.' },
  'depositModal.verifyFailed': { it: 'Verifica del deposito non riuscita dal server.', en: 'Deposit verification failed on server.' },

  // Trust Jackpot Explainer Modal
  'jackpotModal.title': { it: 'TRUST JACKPOT', en: 'TRUST JACKPOT' },
  'jackpotModal.luckyDropBadge': { it: 'LUCKY DROP', en: 'LUCKY DROP' },
  'jackpotModal.sharedPool': { it: 'Montepremi Condiviso', en: 'Shared Prize Pool' },
  'jackpotModal.currentPool': { it: 'MONTEPREMI ATTUALE DELLA FIDUCIA', en: 'CURRENT TRUST JACKPOT POOL' },
  'jackpotModal.statusActive': { it: 'ATTIVO • RUOTA 30% DROP CHANCE', en: 'ACTIVE • 30% DROP WHEEL' },
  'jackpotModal.statusCharging': { it: 'IN CARICA (< 5.00 GRAM)', en: 'CHARGING (< 5.00 GRAM)' },
  'jackpotModal.howItWorks': { it: 'COME SI VINCE IL JACKPOT', en: 'HOW TO WIN THE JACKPOT' },
  'jackpotModal.splitTitle': { it: 'DOPPIO SPLIT (PACE ASSOLUTA)', en: 'DOUBLE SPLIT (MUTUAL PEACE)' },
  'jackpotModal.splitBadge': { it: '+12.5% A TESTA', en: '+12.5% EACH' },
  'jackpotModal.splitDesc': {
    it: 'Rimborso del 100% della puntata a entrambi. Nelle partite pubbliche con Jackpot attivo, gira la Ruota Lucky Drop con il 30% di probabilità per un Bonus del 25% diviso equamente (12.5% a testa) dal Jackpot!',
    en: '100% stake refund to both players. In public lobby matches with active Jackpot, spin the Lucky Drop Wheel with a 30% chance to win a 25% Bonus split equally (12.5% each) from the Jackpot!',
  },
  'jackpotModal.stealTitle': { it: 'STEAL VS SPLIT (TRADIMENTO)', en: 'STEAL VS SPLIT (BETRAYAL)' },
  'jackpotModal.stealBadge': { it: '+20% TAGLIA', en: '+20% BOUNTY' },
  'jackpotModal.stealDesc': {
    it: 'Chi sceglie STEAL vince il 100% del piatto (2x puntata). Inoltre gira la Ruota per una Taglia Tentazione extra del 20% della propria puntata prelevata dal Trust Jackpot!',
    en: 'The player who chooses STEAL wins 100% of the pot (2x stake). In addition, spin the wheel for an extra 20% Temptation Bounty on their stake taken from the Trust Jackpot!',
  },
  'jackpotModal.doubleStealTitle': { it: 'DOPPIO STEAL (AVIDITÀ)', en: 'DOUBLE STEAL (GREED)' },
  'jackpotModal.doubleStealBadge': { it: '50% AL JACKPOT', en: '50% TO JACKPOT' },
  'jackpotModal.doubleStealDesc': {
    it: 'Nessun vincitore ed entrambi perdono la puntata. Il 50% del piatto bruciato va ad alimentare questo Trust Jackpot, facendolo crescere continuamente nel tempo!',
    en: 'No winner and both lose their stake. 50% of the burned pot feeds this Trust Jackpot, growing it continuously over time!',
  },
  'jackpotModal.safeguardsTitle': { it: 'REGOLE ANTI-COLLUSIONE & EQUITÀ', en: 'ANTI-COLLUSION & FAIRPLAY RULES' },
  'jackpotModal.safeguardPublic': { it: 'Solo Lobby Pubblica: non attivo nelle stanze private tra amici.', en: 'Public Lobby Only: not active in private rooms between friends.' },
  'jackpotModal.safeguardCooldown': { it: 'Cooldown 48 Ore: la stessa coppia può riscuotere il bonus solo una volta ogni 48h.', en: '48-Hour Cooldown: the same player pair can only claim a bonus once every 48 hours.' },
  'jackpotModal.safeguardReferral': { it: 'Blocco Referral: duellanti legati da invito diretto non possono incassare bonus sfidandosi.', en: 'Referral Lock: duelists linked by direct referral cannot claim bonuses against each other.' },
  'jackpotModal.safeguardMinBet': { it: 'Puntata Minima: 5.00 GRAM per duello.', en: 'Minimum Stake: 5.00 GRAM per duel.' },
  'jackpotModal.close': { it: 'CHIUDI', en: 'CLOSE' },
  'jackpotModal.playSplitSteal': { it: 'GIOCA SPLIT/STEAL', en: 'PLAY SPLIT/STEAL' },

  // Rules Game Titles
  'rules.gameRoulette': { it: '1. Russian Roulette (8 Camere, 1 Proiettile)', en: '1. Russian Roulette (8 Chambers, 1 Bullet)' },
  'rules.gameBlackjack': { it: '2. Blackjack Face-Up (Duello al 21)', en: '2. Blackjack Face-Up (Duel to 21)' },
  'rules.gameBridge': { it: '3. Endless Glass Bridge (Ponte di Vetro)', en: '3. Endless Glass Bridge (Survival Leap)' },
  'rules.gameChrono': { it: '4. Chrono Blind (Precision Countdown)', en: '4. Chrono Blind (Precision Countdown)' },
  'rules.gameSplit': { it: '5. Split or Steal (Dilemma della Fiducia & Jackpot Condiviso)', en: '5. Split or Steal (Trust Dilemma & Shared Jackpot)' },
  'rules.gameSettle': { it: '6. Risoluzione Automatica Vincite & Rivincite', en: '6. Automated Prize Settlement & Rematches' },

  // Profile outcome badges
  'profile.win': { it: 'VITTORIA', en: 'VICTORY' },
  'profile.draw': { it: 'PAREGGIO', en: 'DRAW' },
  'profile.loss': { it: 'SCONFITTA', en: 'DEFEAT' },
  'profile.recent': { it: 'Recente', en: 'Recent' },
  'profile.vs': { it: 'vs', en: 'vs' },

  // Profile Withdraw Modal
  'profile.withdrawModalTitle': { it: 'PRELEVA GRAM NEL WALLET', en: 'WITHDRAW GRAM TO WALLET' },
  'profile.withdrawModalDesc': { it: 'Preleva fondi verso il tuo portafoglio TON collegato ({wallet}).', en: 'Withdraw funds to your connected TON wallet ({wallet}).' },
  'profile.withdrawAmountLabel': { it: 'Importo (Min 1.00 GRAM):', en: 'Amount (Min 1.00 GRAM):' },
  'profile.withdrawAvailLabel': { it: 'Disponibile: {amount} GRAM', en: 'Available: {amount} GRAM' },
  'profile.withdrawMinNotice': { it: 'Prelievo minimo: 1.00 GRAM (per evitare lo spreco di fee di rete).', en: 'Minimum withdrawal: 1.00 GRAM (to avoid network fee waste).' },
  'profile.withdrawSuccess': { it: 'Prelievo di {amount} GRAM elaborato con successo!', en: 'Withdrawal of {amount} GRAM processed successfully!' },

  // Arena error messages
  'arena.connectWalletToWager': { it: 'Connetti il tuo Tonkeeper Wallet per puntare e creare un duello.', en: 'Connect your Tonkeeper Wallet to proceed with the wager and create a duel.' },
  'arena.serverUnreachable': { it: 'Server di gioco non configurato o non raggiungibile.', en: 'Game server not configured or unreachable.' },
  'arena.connectWalletToJoin': { it: 'Devi connettere il tuo Tonkeeper Wallet per entrare in questo duello.', en: 'You must connect your Tonkeeper Wallet to enter this duel.' },
  'arena.spectatorSelfBetDisabled': { it: 'Sei un combattente in questo duello: le scommesse da spettatore sono disabilitate per i duellanti.', en: 'You are a fighter in this duel: spectator bets are disabled for duelists.' },
  'arena.joinMatchError': { it: 'Errore durante l\'ingresso nella partita.', en: 'Error joining match.' },
  'arena.serverConnError': { it: 'Errore di connessione con il server di gioco. Riprova.', en: 'Connection error with game server. Please try again.' },

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
export const useLanguage = useI18n;

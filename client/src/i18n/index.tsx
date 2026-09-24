import React, { createContext, useContext, useState, useEffect } from 'react';

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
  'nav.affiliates': { it: 'AFFILIATI', en: 'AFFILIATES' },
  'nav.profile': { it: 'PROFILO', en: 'PROFILE' },
  'nav.subtitle': { it: 'DUELLI CYBER PVP', en: 'CYBER PVP DUELS' },

  // Profile
  'profile.title': { it: 'PROFILO GUERRIERO', en: 'WARRIOR PROFILE' },
  'profile.streakTitle': { it: '{streak} GIORNI DI STREAK', en: '{streak} DAY STREAK' },
  'profile.streakAction': { it: 'Vinci 1 duello oggi', en: 'Win 1 match today' },
  'profile.streakCompleted': { it: '✓ Completato per oggi!', en: '✓ Completed today!' },
  'profile.rewardSample': { it: 'Prossimo premio: Bonus GRAM', en: 'Upcoming prize: GRAM Bonus' },
  'profile.victoriesTitle': { it: '{won} V / {played} Partite', en: '{won} W / {played} Games' },
  'profile.winRate': { it: '{rate}% Percentuale Vittorie', en: '{rate}% Win Rate' },
  'profile.balance': { it: 'SALDO INTERNO', en: 'IN-APP BALANCE' },
  'profile.deposit': { it: 'DEPOSITA', en: 'DEPOSIT' },
  'profile.withdraw': { it: 'PRELEVA', en: 'WITHDRAW' },
  'profile.activeDuels': { it: 'DUELLI IN CORSO', en: 'ACTIVE DUELS' },
  'profile.recentHistory': { it: 'STORIA RECENTE', en: 'RECENT HISTORY' },
  'profile.noMatches': { it: 'Nessun duello giocato finora.', en: 'No duels played yet.' },
  'profile.resume': { it: 'ENTRA', en: 'RESUME' },
  'profile.walletNotConnected': { it: 'Portafoglio non connesso', en: 'Wallet not connected' },
  'profile.connectWallet': { it: 'Connetti TON Wallet', en: 'Connect TON Wallet' },
  'profile.totalProfits': { it: 'Profitti Totali', en: 'Total Profits' },

  // Leaderboard
  'leaderboard.title': { it: 'CLASSIFICA CYBER', en: 'CYBER LEADERBOARD' },
  'leaderboard.subtitle': { it: 'I guerrieri d\'élite dell\'Arena', en: 'Top duelists of the cyber arena' },
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

  // Spectator & Betting
  'spectator.title': { it: 'SCOMMESSE TOTALIZZATORE SPETTATORI', en: 'SPECTATOR TOTALIZER BETTING' },
  'spectator.oddsLocked': { it: 'QUOTE E PERCENTUALI NASCOSTE FINO AD INIZIO ROUND', en: 'ODDS & SHARES REVEALED AT DUEL START' },
  'spectator.pariMutuel': { it: 'Pool: Pari-Mutuel Dinamico', en: 'Pool: Dynamic Pari-Mutuel' },
  'spectator.locked': { it: 'BLOCCATO', en: 'LOCKED' },
  'spectator.estPayout': { it: 'Vincita stimata:', en: 'Est. payout:' },
  'spectator.bet': { it: 'PUNTA', en: 'BET' },
  'spectator.on': { it: 'SU', en: 'ON' },
  'spectator.isPlayerNotice': { it: 'Sei un duellante in questa partita: le scommesse spettatori sono disabilitate per i combattenti.', en: 'You are a duelist in this match: spectator betting is disabled for combatants.' },

  // Lobby & General
  'lobby.createDuel': { it: 'CREA SFIDA', en: 'CREATE DUEL' },
  'lobby.selectGame': { it: 'SELEZIONA DISCIPLINA', en: 'SELECT GAME' },
  'lobby.openMatches': { it: 'SFIDE IN ATTESA', en: 'OPEN CHALLENGES' },
  'lobby.noOpenMatches': { it: 'Nessuna sfida aperta al momento. Creane una tu!', en: 'No open challenges right now. Create one!' },
  'lobby.join': { it: 'SFIDA', en: 'JOIN' },
  'lobby.spectate': { it: 'GUARDA', en: 'WATCH' },
  'lobby.cancel': { it: 'ANNULLA', en: 'CANCEL' },
  'footer.escrow': { it: 'Smart Contract Escrow TON • Gioco Equo Senza Rischio Banco', en: 'TON Smart Contract Escrow • Fair Play Zero House Risk' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'it',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_language');
      if (saved === 'it' || saved === 'en') return saved;
      // Default to Italian as requested by user
      return 'it';
    } catch {
      return 'it';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('sfidabot_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'it' ? 'en' : 'it');
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

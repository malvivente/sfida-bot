export interface StreakMilestone {
  days: number;
  rewardGram: number;
  rewardTickets: number;
  titleIt: string;
  titleEn: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, rewardGram: 0.50, rewardTickets: 2, titleIt: 'Serie 3 Giorni', titleEn: '3-Day Streak' },
  { days: 7, rewardGram: 1.50, rewardTickets: 5, titleIt: '1 Settimana di Fuoco', titleEn: '1-Week Fire' },
  { days: 14, rewardGram: 3.50, rewardTickets: 10, titleIt: '2 Settimane Costanti', titleEn: '2-Week Master' },
  { days: 30, rewardGram: 10.00, rewardTickets: 25, titleIt: '1 Mese Invincibile', titleEn: '1-Month Legend' },
  { days: 60, rewardGram: 25.00, rewardTickets: 50, titleIt: '2 Mesi di Dominio', titleEn: '2-Month Dominance' },
  { days: 90, rewardGram: 50.00, rewardTickets: 100, titleIt: '3 Mesi Campione', titleEn: 'Quarter Titan' },
  { days: 180, rewardGram: 120.00, rewardTickets: 250, titleIt: 'Metà Anno Immortale', titleEn: 'Half-Year Immortal' },
  { days: 365, rewardGram: 300.00, rewardTickets: 500, titleIt: '1 Anno di Gloria', titleEn: '1-Year Grandmaster' },
];

export function getNextStreakMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) || null;
}

export function getPrevStreakMilestone(currentStreak: number): StreakMilestone | null {
  const reached = STREAK_MILESTONES.filter((m) => m.days <= currentStreak);
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

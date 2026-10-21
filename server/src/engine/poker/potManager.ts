import { PokerPlayerSeat, PokerPot } from './pokerTypes.js';

export interface PotAward {
  seatIndex: number;
  amount: number;
}

export class PotManager {
  /**
   * Calculate main pot and side pots based on player investments.
   */
  public static calculatePots(seats: PokerPlayerSeat[]): PokerPot[] {
    const investments = seats
      .map((s) => s.totalInvestedThisHand)
      .filter((inv) => inv > 0);

    if (investments.length === 0) return [];

    const totalPot = investments.reduce((sum, v) => sum + v, 0);

    // If no active player is All-In, there are no side pots (all non-folded players contest the full pot)
    const hasAllIn = seats.some((s) => s.isAllIn && s.totalInvestedThisHand > 0);
    if (!hasAllIn) {
      return [
        {
          amount: totalPot,
          eligibleSeats: seats.filter((s) => !s.hasFolded).map((s) => s.seatIndex),
        },
      ];
    }

    const uniqueThresholds = Array.from(new Set(investments)).sort((a, b) => a - b);
    const pots: PokerPot[] = [];
    let previousThreshold = 0;

    for (const threshold of uniqueThresholds) {
      const tierDelta = threshold - previousThreshold;
      if (tierDelta <= 0) continue;

      const contributors = seats.filter((s) => s.totalInvestedThisHand >= threshold);
      const tierAmount = contributors.length * tierDelta;

      // If only 1 contributor reached this tier, it is an uncalled portion.
      // We assign it to that single contributor so it is returned to them at showdown without mutating stacks mid-hand.
      if (contributors.length === 1) {
        pots.push({
          amount: tierAmount,
          eligibleSeats: [contributors[0].seatIndex],
        });
        previousThreshold = threshold;
        continue;
      }

      // Eligible players are those who contributed to this tier and did NOT fold
      const eligibleSeats = contributors
        .filter((s) => !s.hasFolded)
        .map((s) => s.seatIndex);

      if (tierAmount > 0 && eligibleSeats.length > 0) {
        pots.push({
          amount: tierAmount,
          eligibleSeats,
        });
      }

      previousThreshold = threshold;
    }

    return pots;
  }

  /**
   * Distribute pots to winners based on hand evaluation scores.
   */
  public static distributePots(
    pots: PokerPot[],
    seats: PokerPlayerSeat[]
  ): PotAward[] {
    const awardsMap = new Map<number, number>();

    for (const pot of pots) {
      if (pot.amount <= 0) continue;

      // Filter eligible seats who have hand results
      const eligible = pot.eligibleSeats
        .map((seatIndex) => seats.find((s) => s.seatIndex === seatIndex))
        .filter((s): s is PokerPlayerSeat => Boolean(s && !s.hasFolded));

      if (eligible.length === 0) {
        // Fallback: if somehow no one is eligible (should never happen), give to first non-folded player
        const fallback = seats.find((s) => !s.hasFolded);
        if (fallback) {
          awardsMap.set(fallback.seatIndex, (awardsMap.get(fallback.seatIndex) || 0) + pot.amount);
        }
        continue;
      }

      // Find the highest score among eligible players
      let bestScore = -1;
      for (const player of eligible) {
        const score = player.handResult?.score || 0;
        if (score > bestScore) {
          bestScore = score;
        }
      }

      const winners = eligible.filter((p) => (p.handResult?.score || 0) === bestScore);
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount % winners.length;

      for (const winner of winners) {
        const bonus = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;
        const totalWon = share + bonus;
        awardsMap.set(winner.seatIndex, (awardsMap.get(winner.seatIndex) || 0) + totalWon);
      }
    }

    return Array.from(awardsMap.entries()).map(([seatIndex, amount]) => ({
      seatIndex,
      amount,
    }));
  }
}

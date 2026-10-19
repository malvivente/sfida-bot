import { PokerCard, HandRank, HandEvaluation } from './pokerTypes.js';

const RANK_NAMES_IT: Record<number, string> = {
  14: 'Assi',
  13: 'Re',
  12: 'Donne',
  11: 'Fanti',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
};

const RANK_NAMES_EN: Record<number, string> = {
  14: 'Aces',
  13: 'Kings',
  12: 'Queens',
  11: 'Jacks',
  10: '10s',
  9: '9s',
  8: '8s',
  7: '7s',
  6: '6s',
  5: '5s',
  4: '4s',
  3: '3s',
  2: '2s',
};

const SINGLE_RANK_IT: Record<number, string> = {
  14: 'Asso',
  13: 'Re',
  12: 'Donna',
  11: 'Fante',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
};

const SINGLE_RANK_EN: Record<number, string> = {
  14: 'Ace',
  13: 'King',
  12: 'Queen',
  11: 'Jack',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
};

function getCombinations<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, combo: T[]) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function evaluate5Cards(cards: PokerCard[]): HandEvaluation {
  // Sort cards descending by numericValue
  const sorted = [...cards].sort((a, b) => b.numericValue - a.numericValue);
  const ranks = sorted.map((c) => c.numericValue);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  if (
    ranks[0] - ranks[1] === 1 &&
    ranks[1] - ranks[2] === 1 &&
    ranks[2] - ranks[3] === 1 &&
    ranks[3] - ranks[4] === 1
  ) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (
    ranks[0] === 14 &&
    ranks[1] === 5 &&
    ranks[2] === 4 &&
    ranks[3] === 3 &&
    ranks[4] === 2
  ) {
    // Wheel (A-2-3-4-5), high card for ranking is 5
    isStraight = true;
    straightHigh = 5;
  }

  // Count frequencies
  const counts: Record<number, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }

  // Sort groups by frequency descending, then by rank descending
  const groups = Object.entries(counts)
    .map(([r, count]) => ({ rank: Number(r), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Helper for computing positional score: rank * 15^5 + k1 * 15^4 + k2 * 15^3 + k3 * 15^2 + k4 * 15 + k5
  const calcScore = (handRank: HandRank, kickers: number[]): number => {
    let score = handRank * Math.pow(15, 5);
    for (let i = 0; i < 5; i++) {
      const k = kickers[i] || 0;
      score += k * Math.pow(15, 4 - i);
    }
    return score;
  };

  // 1. Royal Flush & Straight Flush
  if (isStraight && isFlush) {
    if (straightHigh === 14) {
      return {
        rank: HandRank.ROYAL_FLUSH,
        score: calcScore(HandRank.ROYAL_FLUSH, [14, 0, 0, 0, 0]),
        rankName: 'Scala Reale',
        rankNameEn: 'Royal Flush',
        bestFiveCards: sorted,
      };
    }
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      score: calcScore(HandRank.STRAIGHT_FLUSH, [straightHigh, 0, 0, 0, 0]),
      rankName: `Scala Colore al ${SINGLE_RANK_IT[straightHigh]}`,
      rankNameEn: `Straight Flush, ${SINGLE_RANK_EN[straightHigh]} High`,
      bestFiveCards: sorted,
    };
  }

  // 2. Four of a Kind
  if (groups[0].count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups[1].rank;
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      score: calcScore(HandRank.FOUR_OF_A_KIND, [quadRank, kicker, 0, 0, 0]),
      rankName: `Poker di ${RANK_NAMES_IT[quadRank]}`,
      rankNameEn: `Four of a Kind, ${RANK_NAMES_EN[quadRank]}`,
      bestFiveCards: sorted,
    };
  }

  // 3. Full House
  if (groups[0].count === 3 && groups[1].count === 2) {
    const tripRank = groups[0].rank;
    const pairRank = groups[1].rank;
    return {
      rank: HandRank.FULL_HOUSE,
      score: calcScore(HandRank.FULL_HOUSE, [tripRank, pairRank, 0, 0, 0]),
      rankName: `Full di ${RANK_NAMES_IT[tripRank]} e ${RANK_NAMES_IT[pairRank]}`,
      rankNameEn: `Full House, ${RANK_NAMES_EN[tripRank]} full of ${RANK_NAMES_EN[pairRank]}`,
      bestFiveCards: sorted,
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      rank: HandRank.FLUSH,
      score: calcScore(HandRank.FLUSH, ranks),
      rankName: `Colore al ${SINGLE_RANK_IT[ranks[0]]}`,
      rankNameEn: `Flush, ${SINGLE_RANK_EN[ranks[0]]} High`,
      bestFiveCards: sorted,
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      rank: HandRank.STRAIGHT,
      score: calcScore(HandRank.STRAIGHT, [straightHigh, 0, 0, 0, 0]),
      rankName: `Scala al ${SINGLE_RANK_IT[straightHigh]}`,
      rankNameEn: `Straight, ${SINGLE_RANK_EN[straightHigh]} High`,
      bestFiveCards: sorted,
    };
  }

  // 6. Three of a Kind
  if (groups[0].count === 3) {
    const tripRank = groups[0].rank;
    const kickers = [groups[1].rank, groups[2].rank];
    return {
      rank: HandRank.THREE_OF_A_KIND,
      score: calcScore(HandRank.THREE_OF_A_KIND, [tripRank, kickers[0], kickers[1], 0, 0]),
      rankName: `Tris di ${RANK_NAMES_IT[tripRank]}`,
      rankNameEn: `Three of a Kind, ${RANK_NAMES_EN[tripRank]}`,
      bestFiveCards: sorted,
    };
  }

  // 7. Two Pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPair = Math.max(groups[0].rank, groups[1].rank);
    const lowPair = Math.min(groups[0].rank, groups[1].rank);
    const kicker = groups[2].rank;
    return {
      rank: HandRank.TWO_PAIR,
      score: calcScore(HandRank.TWO_PAIR, [highPair, lowPair, kicker, 0, 0]),
      rankName: `Doppia Coppia di ${RANK_NAMES_IT[highPair]} e ${RANK_NAMES_IT[lowPair]}`,
      rankNameEn: `Two Pair, ${RANK_NAMES_EN[highPair]} and ${RANK_NAMES_EN[lowPair]}`,
      bestFiveCards: sorted,
    };
  }

  // 8. One Pair
  if (groups[0].count === 2) {
    const pairRank = groups[0].rank;
    const kickers = [groups[1].rank, groups[2].rank, groups[3].rank];
    return {
      rank: HandRank.ONE_PAIR,
      score: calcScore(HandRank.ONE_PAIR, [pairRank, kickers[0], kickers[1], kickers[2], 0]),
      rankName: `Coppia di ${RANK_NAMES_IT[pairRank]}`,
      rankNameEn: `Pair of ${RANK_NAMES_EN[pairRank]}`,
      bestFiveCards: sorted,
    };
  }

  // 9. High Card
  return {
    rank: HandRank.HIGH_CARD,
    score: calcScore(HandRank.HIGH_CARD, ranks),
    rankName: `${SINGLE_RANK_IT[ranks[0]]} Carta Alta`,
    rankNameEn: `${SINGLE_RANK_EN[ranks[0]]} High`,
    bestFiveCards: sorted,
  };
}

export function evaluatePokerHand(allCards: PokerCard[]): HandEvaluation {
  if (allCards.length < 5) {
    throw new Error('At least 5 cards required to evaluate poker hand');
  }

  if (allCards.length === 5) {
    return evaluate5Cards(allCards);
  }

  // Generate all 5-card combinations and pick the one with highest score
  const combos = getCombinations(allCards, 5);
  let bestEval: HandEvaluation | null = null;

  for (const combo of combos) {
    const currentEval = evaluate5Cards(combo);
    if (!bestEval || currentEval.score > bestEval.score) {
      bestEval = currentEval;
    }
  }

  return bestEval!;
}

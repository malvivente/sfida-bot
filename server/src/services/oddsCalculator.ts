export interface OddsResult {
  totalPoolNano: bigint;
  distributablePoolNano: bigint;
  spectatorRakeNano: bigint;
  treasuryRakeNano: bigint;
  affiliateRakeNano: bigint;
  oddsA: number;
  oddsB: number;
}

export function computePariMutuelOdds(
  totalBetsANano: bigint,
  totalBetsBNano: bigint
): OddsResult {
  const totalPoolNano = totalBetsANano + totalBetsBNano;

  if (totalPoolNano === 0n) {
    return {
      totalPoolNano: 0n,
      distributablePoolNano: 0n,
      spectatorRakeNano: 0n,
      treasuryRakeNano: 0n,
      affiliateRakeNano: 0n,
      oddsA: 2.0,
      oddsB: 2.0,
    };
  }

  // 6% total rake
  const spectatorRakeNano = (totalPoolNano * 600n) / 10000n;
  // 94% distributable pool
  const distributablePoolNano = totalPoolNano - spectatorRakeNano;

  // 70% of rake to Treasury, 30% to Affiliate Pool
  const treasuryRakeNano = (spectatorRakeNano * 7000n) / 10000n;
  const affiliateRakeNano = spectatorRakeNano - treasuryRakeNano;

  // Multipliers M_W = DistributablePool / SideBets
  const poolNum = Number(distributablePoolNano);
  const betsANum = Number(totalBetsANano);
  const betsBNum = Number(totalBetsBNano);

  const oddsA = betsANum > 0 ? parseFloat((poolNum / betsANum).toFixed(2)) : 2.0;
  const oddsB = betsBNum > 0 ? parseFloat((poolNum / betsBNum).toFixed(2)) : 2.0;

  return {
    totalPoolNano,
    distributablePoolNano,
    spectatorRakeNano,
    treasuryRakeNano,
    affiliateRakeNano,
    oddsA,
    oddsB,
  };
}

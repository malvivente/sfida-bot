// Utility functions and calculation logic for SfidaBot

struct RakeDistribution {
    treasuryShare: Int as coins;
    recruiterShare: Int as coins;
    groupAdminShare: Int as coins;
}

// Player pot rake: 4% (0.04 * 2W = 0.08W)
// Winner receives 96% of total pot
fun calculatePlayerRake(totalPot: Int): Int {
    return (totalPot * 4) / 100;
}

// Spectator totalizer rake: 6% (0.06 * S_total)
// Distributable pool receives 94% of S_total
fun calculateSpectatorRake(totalSpectatorPool: Int): Int {
    return (totalSpectatorPool * 6) / 100;
}

// Pari-mutuel payout for an individual bet:
// Payout = (betAmount * distributablePool) / totalWinningBets
fun calculateSpectatorShare(betAmount: Int, distributablePool: Int, totalWinningBets: Int): Int {
    if (totalWinningBets == 0) {
        return 0;
    }
    return (betAmount * distributablePool) / totalWinningBets;
}

// "Host vs Recruiter" Affiliate Split (Max 30% of Rake):
// - Case 1 (Recruiter + Group): 50/50 -> 15% Recruiter, 15% Group Admin
// - Case 2 (Recruiter only): 30% to Recruiter
// - Case 3 (Group only): 30% to Group Admin
// - Case 4 (Neither): Treasury retains 100% of rake
fun splitRake(totalRake: Int, hasRecruiter: Bool, hasGroupAdmin: Bool): RakeDistribution {
    let treasuryBaseline: Int = (totalRake * 70) / 100;
    let affiliatePool: Int = totalRake - treasuryBaseline;

    if (hasRecruiter && hasGroupAdmin) {
        let recruiterHalf: Int = affiliatePool / 2;
        let groupAdminHalf: Int = affiliatePool - recruiterHalf;
        return RakeDistribution{
            treasuryShare: treasuryBaseline,
            recruiterShare: recruiterHalf,
            groupAdminShare: groupAdminHalf
        };
    }

    if (hasRecruiter) {
        return RakeDistribution{
            treasuryShare: treasuryBaseline,
            recruiterShare: affiliatePool,
            groupAdminShare: 0
        };
    }

    if (hasGroupAdmin) {
        return RakeDistribution{
            treasuryShare: treasuryBaseline,
            recruiterShare: 0,
            groupAdminShare: affiliatePool
        };
    }

    // Case 4: No Recruiter, No Group -> Platform Treasury retains 100%
    return RakeDistribution{
        treasuryShare: totalRake,
        recruiterShare: 0,
        groupAdminShare: 0
    };
}

// Verifies authorative game server's Ed25519 signature
fun verifyResolutionSignature(
    matchId: Int,
    winner: Address,
    timestamp: Int,
    signature: Slice,
    serverPublicKey: Int
): Bool {
    let payloadHash: Int = beginCell()
        .storeUint(matchId, 64)
        .storeAddress(winner)
        .storeUint(timestamp, 32)
        .endCell()
        .hash();
    
    return checkSignature(payloadHash, signature, serverPublicKey);
}

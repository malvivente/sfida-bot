// OpCodes and Message definitions for SfidaBot PvP Arena

message DeployMatch {
    matchId: Int as uint64;
    wagerAmount: Int as coins;
    recruiterA: Address?;
    groupAdminAddress: Address?;
}

message JoinMatch {
    matchId: Int as uint64;
    recruiterB: Address?;
}

message BetSpectator {
    matchId: Int as uint64;
    targetPlayer: Address;
}

message ResolveMatch {
    matchId: Int as uint64;
    winner: Address;
    timestamp: Int as uint32;
    signature: Slice;
}

message ClaimSpectatorReward {
    matchId: Int as uint64;
}

message CancelMatch {
    matchId: Int as uint64;
    reason: String;
    signature: Slice;
}

message EmergencyRefund {
    matchId: Int as uint64;
}

message SetServerPublicKey {
    newKey: Int as uint256;
}

// -------------------------------------------------------------------
// Events (Emit to TON Blockchain for Indexers & Explorers)
// -------------------------------------------------------------------

message EventMatchCreated {
    matchId: Int as uint64;
    playerA: Address;
    wagerAmount: Int as coins;
    creationFee: Int as coins;
}

message EventPlayerJoined {
    matchId: Int as uint64;
    playerB: Address;
}

message EventSpectatorBet {
    matchId: Int as uint64;
    spectator: Address;
    targetPlayer: Address;
    amount: Int as coins;
    totalBetsA: Int as coins;
    totalBetsB: Int as coins;
}

message EventMatchResolved {
    matchId: Int as uint64;
    winner: Address;
    playerPotPayout: Int as coins;
    totalPlayerRake: Int as coins;
    distributableSpectatorPool: Int as coins;
    totalSpectatorRake: Int as coins;
}

message EventSpectatorClaim {
    matchId: Int as uint64;
    spectator: Address;
    payout: Int as coins;
}

message EventAffiliatePayout {
    matchId: Int as uint64;
    recipient: Address;
    amount: Int as coins;
    reason: String;
}

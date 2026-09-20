import "./messages.tact";
import "./utils.tact";

const STATE_CREATED: Int = 0;
const STATE_ACTIVE: Int = 1;
const STATE_RESOLVED: Int = 2;
const STATE_CANCELLED: Int = 3;

contract MatchEscrow {
    clashMaster: Address;
    matchId: Int as uint64;
    playerA: Address;
    playerB: Address?;
    wagerAmount: Int as coins;
    totalBetsA: Int as coins;
    totalBetsB: Int as coins;
    state: Int as uint8;
    recruiterA: Address?;
    recruiterB: Address?;
    groupAdminAddress: Address?;
    serverPublicKey: Int as uint256;
    winner: Address?;
    creationFeePaid: Int as coins;
    
    // Spectator bets mappings
    spectatorBetsA: map<Address, Int as coins>;
    spectatorBetsB: map<Address, Int as coins>;
    spectatorClaimed: map<Address, Bool>;
    
    // Pari-mutuel distributable pool & tracking
    distributableSpectatorPool: Int as coins;
    remainingWinningBetsToClaim: Int as coins;
    totalWinningBets: Int as coins;

    init(
        clashMaster: Address,
        matchId: Int as uint64,
        playerA: Address,
        wagerAmount: Int as coins,
        serverPublicKey: Int as uint256,
        recruiterA: Address?,
        groupAdminAddress: Address?
    ) {
        self.clashMaster = clashMaster;
        self.matchId = matchId;
        self.playerA = playerA;
        self.playerB = null;
        self.wagerAmount = wagerAmount;
        self.serverPublicKey = serverPublicKey;
        self.recruiterA = recruiterA;
        self.recruiterB = null;
        self.groupAdminAddress = groupAdminAddress;
        self.state = STATE_CREATED;
        self.winner = null;
        self.creationFeePaid = ton("0.02");
        self.totalBetsA = 0;
        self.totalBetsB = 0;
        self.distributableSpectatorPool = 0;
        self.remainingWinningBetsToClaim = 0;
        self.totalWinningBets = 0;
    }

    // Accepts initial deployment funding and comment transfers
    receive(msg: String) {
    }

    receive() {
    }

    // Player B joins the match by depositing matching wager
    receive(msg: JoinMatch) {
        let ctx: Context = context();
        require(self.state == STATE_CREATED, "Match already active or settled");
        require(msg.matchId == self.matchId, "Match ID mismatch");
        require(ctx.sender != self.playerA, "Player A cannot play against self");
        require(ctx.value >= self.wagerAmount, "Insufficient wager amount sent");

        self.playerB = ctx.sender;
        self.recruiterB = msg.recruiterB;
        self.state = STATE_ACTIVE;

        emit(EventPlayerJoined{
            matchId: self.matchId,
            playerB: ctx.sender
        }.toCell());
    }

    // Spectator places a bet on either Player A or Player B
    receive(msg: BetSpectator) {
        let ctx: Context = context();
        require(self.state == STATE_CREATED || self.state == STATE_ACTIVE, "Betting closed for this match");
        require(msg.matchId == self.matchId, "Match ID mismatch");
        
        let isValidTarget: Bool = (msg.targetPlayer == self.playerA);
        if (self.playerB != null) {
            if (msg.targetPlayer == self.playerB!!) {
                isValidTarget = true;
            }
        }
        require(isValidTarget, "Invalid target player");
        require(ctx.value >= ton("0.1"), "Minimum spectator bet is 0.1 TON");

        let betValue: Int = ctx.value;
        if (msg.targetPlayer == self.playerA) {
            let existing: Int = 0;
            let currentVal: Int? = self.spectatorBetsA.get(ctx.sender);
            if (currentVal != null) {
                existing = currentVal!!;
            }
            self.spectatorBetsA.set(ctx.sender, existing + betValue);
            self.totalBetsA = self.totalBetsA + betValue;
        } else {
            let existing: Int = 0;
            let currentVal: Int? = self.spectatorBetsB.get(ctx.sender);
            if (currentVal != null) {
                existing = currentVal!!;
            }
            self.spectatorBetsB.set(ctx.sender, existing + betValue);
            self.totalBetsB = self.totalBetsB + betValue;
        }

        emit(EventSpectatorBet{
            matchId: self.matchId,
            spectator: ctx.sender,
            targetPlayer: msg.targetPlayer,
            amount: betValue,
            totalBetsA: self.totalBetsA,
            totalBetsB: self.totalBetsB
        }.toCell());
    }

    // Authoritative game server submits signed resolution
    receive(msg: ResolveMatch) {
        let ctx: Context = context();
        require(self.state == STATE_ACTIVE, "Match must be active to resolve");
        require(msg.matchId == self.matchId, "Match ID mismatch");
        require(self.playerB != null, "Player B missing");
        
        let isValidWinner: Bool = (msg.winner == self.playerA || msg.winner == self.playerB!!);
        require(isValidWinner, "Invalid winner");

        // Verify Ed25519 signature
        let isValidSig: Bool = verifyResolutionSignature(
            msg.matchId,
            msg.winner,
            msg.timestamp,
            msg.signature,
            self.serverPublicKey
        );
        require(isValidSig, "Invalid Ed25519 resolution signature");

        self.winner = msg.winner;
        self.state = STATE_RESOLVED;

        // 1. Calculate 1v1 Player Pot & Rake
        // Total pot = 2 * Wager
        let totalPlayerPot: Int = self.wagerAmount * 2;
        let playerRake: Int = calculatePlayerRake(totalPlayerPot); // 4%
        let winnerPayout: Int = totalPlayerPot - playerRake;       // 96%

        // 2. Calculate Spectator Pari-Mutuel Pool & Rake
        let totalSpectatorPool: Int = self.totalBetsA + self.totalBetsB;
        let spectatorRake: Int = 0;
        let distPool: Int = 0;
        let winBets: Int = 0;

        if (totalSpectatorPool > 0) {
            spectatorRake = calculateSpectatorRake(totalSpectatorPool); // 6%
            distPool = totalSpectatorPool - spectatorRake;              // 94%
            if (msg.winner == self.playerA) {
                winBets = self.totalBetsA;
            } else {
                winBets = self.totalBetsB;
            }
        }

        self.distributableSpectatorPool = distPool;
        self.totalWinningBets = winBets;
        self.remainingWinningBetsToClaim = winBets;

        // 3. Affiliate Distribution (Host vs Recruiter logic)
        let totalRake: Int = playerRake + spectatorRake;
        let winnerRecruiter: Address? = null;
        if (msg.winner == self.playerA) {
            winnerRecruiter = self.recruiterA;
        } else {
            winnerRecruiter = self.recruiterB;
        }

        let hasRecruiter: Bool = (winnerRecruiter != null);
        let hasGroupAdmin: Bool = (self.groupAdminAddress != null);
        let rakeSplit: RakeDistribution = splitRake(totalRake, hasRecruiter, hasGroupAdmin);

        // 4. Send Winner Payout
        send(SendParameters{
            to: msg.winner,
            value: winnerPayout,
            mode: SendPayGasSeparately,
            bounce: false,
            body: "SfidaBot Duel Winner Payout (96%)".asComment()
        });

        // 5. Send Affiliate Payouts
        if (rakeSplit.recruiterShare > 0) {
            if (winnerRecruiter != null) {
                send(SendParameters{
                    to: winnerRecruiter!!,
                    value: rakeSplit.recruiterShare,
                    mode: SendPayGasSeparately,
                    bounce: false,
                    body: "SfidaBot Recruiter Reward".asComment()
                });
                emit(EventAffiliatePayout{
                    matchId: self.matchId,
                    recipient: winnerRecruiter!!,
                    amount: rakeSplit.recruiterShare,
                    reason: "Recruiter Reward"
                }.toCell());
            }
        }

        if (rakeSplit.groupAdminShare > 0) {
            if (self.groupAdminAddress != null) {
                send(SendParameters{
                    to: self.groupAdminAddress!!,
                    value: rakeSplit.groupAdminShare,
                    mode: SendPayGasSeparately,
                    bounce: false,
                    body: "SfidaBot Host Community Reward".asComment()
                });
                emit(EventAffiliatePayout{
                    matchId: self.matchId,
                    recipient: self.groupAdminAddress!!,
                    amount: rakeSplit.groupAdminShare,
                    reason: "Group Host Reward"
                }.toCell());
            }
        }

        // 6. Send Treasury Rake + Micro Creation Fee to ClashMaster
        let treasuryTotal: Int = rakeSplit.treasuryShare + self.creationFeePaid;
        send(SendParameters{
            to: self.clashMaster,
            value: treasuryTotal,
            mode: SendPayGasSeparately,
            bounce: false,
            body: "SfidaBot Treasury Rake".asComment()
        });

        emit(EventMatchResolved{
            matchId: self.matchId,
            winner: msg.winner,
            playerPotPayout: winnerPayout,
            totalPlayerRake: playerRake,
            distributableSpectatorPool: distPool,
            totalSpectatorRake: spectatorRake
        }.toCell());

        // Self-destruct check: If no spectator rewards remain to be claimed, clean up immediately!
        if (self.remainingWinningBetsToClaim == 0) {
            self.selfDestructToMaster();
        }
    }

    // Winning spectator claims their totalizer share
    receive(msg: ClaimSpectatorReward) {
        let ctx: Context = context();
        require(self.state == STATE_RESOLVED, "Match not resolved yet");
        require(self.winner != null, "Winner not set");
        require(msg.matchId == self.matchId, "Match ID mismatch");
        
        let hasClaimed: Bool = false;
        let claimVal: Bool? = self.spectatorClaimed.get(ctx.sender);
        if (claimVal != null) {
            hasClaimed = claimVal!!;
        }
        require(!hasClaimed, "Already claimed reward");

        let betAmount: Int = 0;
        if (self.winner!! == self.playerA) {
            let betVal: Int? = self.spectatorBetsA.get(ctx.sender);
            if (betVal != null) {
                betAmount = betVal!!;
            }
        } else {
            let betVal: Int? = self.spectatorBetsB.get(ctx.sender);
            if (betVal != null) {
                betAmount = betVal!!;
            }
        }

        require(betAmount > 0, "No winning bet found for sender");
        self.spectatorClaimed.set(ctx.sender, true);

        // Calculate proportional share of 94% distributable pool
        let payout: Int = calculateSpectatorShare(
            betAmount,
            self.distributableSpectatorPool,
            self.totalWinningBets
        );
        require(payout > 0, "Zero payout calculated");

        self.remainingWinningBetsToClaim = self.remainingWinningBetsToClaim - betAmount;

        send(SendParameters{
            to: ctx.sender,
            value: payout,
            mode: SendPayGasSeparately,
            bounce: false,
            body: "SfidaBot Spectator Totalizer Payout".asComment()
        });

        emit(EventSpectatorClaim{
            matchId: self.matchId,
            spectator: ctx.sender,
            payout: payout
        }.toCell());

        // Once all winning spectators have claimed, destroy contract & sweep dust to Master
        if (self.remainingWinningBetsToClaim <= 0) {
            self.selfDestructToMaster();
        }
    }

    // Cancellation & Full Refund (if Player B never joins or game aborted by server)
    receive(msg: CancelMatch) {
        let ctx: Context = context();
        require(self.state == STATE_CREATED || self.state == STATE_ACTIVE, "Cannot cancel resolved match");
        require(msg.matchId == self.matchId, "Match ID mismatch");

        let isAuthorized: Bool = false;
        if (ctx.sender == self.playerA && self.state == STATE_CREATED) {
            isAuthorized = true;
        } else {
            isAuthorized = verifyResolutionSignature(
                msg.matchId,
                self.playerA,
                0,
                msg.signature,
                self.serverPublicKey
            );
        }
        require(isAuthorized, "Unauthorized match cancellation");

        self.state = STATE_CANCELLED;

        // Refund Player A wager
        send(SendParameters{
            to: self.playerA,
            value: self.wagerAmount,
            mode: SendPayGasSeparately,
            bounce: false,
            body: "SfidaBot Duel Refund Player A".asComment()
        });

        // Refund Player B wager if joined
        if (self.playerB != null) {
            send(SendParameters{
                to: self.playerB!!,
                value: self.wagerAmount,
                mode: SendPayGasSeparately,
                bounce: false,
                body: "SfidaBot Duel Refund Player B".asComment()
            });
        }

        // Destroy contract and return remaining storage balance to Master Treasury
        self.selfDestructToMaster();
    }

    // Emergency sweep after timeout
    receive(msg: EmergencyRefund) {
        let ctx: Context = context();
        require(ctx.sender == self.clashMaster, "Only Master can trigger emergency sweep");
        require(msg.matchId == self.matchId, "Match ID mismatch");
        self.selfDestructToMaster();
    }

    // Helper: destroy contract and send remaining balance to Master Treasury
    fun selfDestructToMaster() {
        send(SendParameters{
            to: self.clashMaster,
            value: 0,
            mode: SendRemainingBalance | SendDestroyIfZero,
            bounce: false,
            body: "SfidaBot Escrow Cleanup & Dust Sweep".asComment()
        });
    }

    // Getters for contract state inspection
    get fun getMatchDetails(): MatchEscrowDetails {
        return MatchEscrowDetails{
            matchId: self.matchId,
            playerA: self.playerA,
            playerB: self.playerB,
            wagerAmount: self.wagerAmount,
            totalBetsA: self.totalBetsA,
            totalBetsB: self.totalBetsB,
            state: self.state,
            winner: self.winner,
            distributableSpectatorPool: self.distributableSpectatorPool,
            remainingWinningBetsToClaim: self.remainingWinningBetsToClaim
        };
    }

    get fun getSpectatorBetA(spectator: Address): Int {
        let val: Int? = self.spectatorBetsA.get(spectator);
        if (val != null) {
            return val!!;
        }
        return 0;
    }

    get fun getSpectatorBetB(spectator: Address): Int {
        let val: Int? = self.spectatorBetsB.get(spectator);
        if (val != null) {
            return val!!;
        }
        return 0;
    }

    get fun hasSpectatorClaimed(spectator: Address): Bool {
        let val: Bool? = self.spectatorClaimed.get(spectator);
        if (val != null) {
            return val!!;
        }
        return false;
    }
}

struct MatchEscrowDetails {
    matchId: Int as uint64;
    playerA: Address;
    playerB: Address?;
    wagerAmount: Int as coins;
    totalBetsA: Int as coins;
    totalBetsB: Int as coins;
    state: Int as uint8;
    winner: Address?;
    distributableSpectatorPool: Int as coins;
    remainingWinningBetsToClaim: Int as coins;
}

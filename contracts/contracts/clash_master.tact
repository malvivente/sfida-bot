import "./messages.tact";
import "./match_escrow.tact";

message WithdrawTreasury {
    amount: Int as coins;
    recipient: Address;
}

struct MasterStats {
    matchCount: Int as uint64;
    serverPublicKey: Int as uint256;
    owner: Address;
    balance: Int as coins;
}

contract ClashMaster {
    owner: Address;
    serverPublicKey: Int as uint256;
    matchCount: Int as uint64;

    init(owner: Address, serverPublicKey: Int as uint256) {
        self.owner = owner;
        self.serverPublicKey = serverPublicKey;
        self.matchCount = 0;
    }

    // Deploy new MatchEscrow instance
    receive(msg: DeployMatch) {
        let ctx: Context = context();
        let totalRequired: Int = msg.wagerAmount + ton("0.02") + ton("0.08"); // Wager + 0.02 fee + deployment gas
        require(ctx.value >= totalRequired, "Insufficient TON sent for deployment and initial wager");

        self.matchCount = self.matchCount + 1;

        let escrowInit: StateInit = initOf MatchEscrow(
            myAddress(),
            msg.matchId,
            ctx.sender,
            msg.wagerAmount,
            self.serverPublicKey,
            msg.recruiterA,
            msg.groupAdminAddress
        );
        let escrowAddress: Address = contractAddress(escrowInit);

        // Deploy child escrow contract. mode: 0 ensures that if funding/gas is insufficient,
        // transaction aborts and bounces back to sender rather than failing silently with SendIgnoreErrors!
        send(SendParameters{
            to: escrowAddress,
            value: msg.wagerAmount + ton("0.05"),
            mode: 0,
            bounce: false,
            body: "SfidaBot Escrow Initialized".asComment(),
            code: escrowInit.code,
            data: escrowInit.data
        });


        emit(EventMatchCreated{
            matchId: msg.matchId,
            playerA: ctx.sender,
            wagerAmount: msg.wagerAmount,
            creationFee: ton("0.02")
        }.toCell());
    }

    // Accept treasury rake and dust sweeps from MatchEscrow contracts
    receive(msg: String) {
        // Automatically accepts incoming TON rake transfers
    }

    // Fallback receiver
    receive() {
        // Accepts plain TON transfers
    }

    // Owner can update the server's Ed25519 public key
    receive(msg: SetServerPublicKey) {
        require(context().sender == self.owner, "Only owner can update server public key");
        self.serverPublicKey = msg.newKey;
    }

    // Withdraw platform profits to secure treasury cold wallet
    receive(msg: WithdrawTreasury) {
        require(context().sender == self.owner, "Only owner can withdraw treasury funds");
        require(myBalance() > msg.amount + ton("0.1"), "Reserve minimum storage balance");

        send(SendParameters{
            to: msg.recipient,
            value: msg.amount,
            mode: SendPayGasSeparately,
            bounce: false,
            body: "SfidaBot Platform Treasury Withdrawal".asComment()
        });
    }

    // Get deterministic address of any match escrow
    get fun getEscrowAddress(
        matchId: Int,
        playerA: Address,
        wagerAmount: Int,
        recruiterA: Address?,
        groupAdminAddress: Address?
    ): Address {
        let escrowInit: StateInit = initOf MatchEscrow(
            myAddress(),
            matchId,
            playerA,
            wagerAmount,
            self.serverPublicKey,
            recruiterA,
            groupAdminAddress
        );
        return contractAddress(escrowInit);
    }

    get fun getStats(): MasterStats {
        return MasterStats{
            matchCount: self.matchCount,
            serverPublicKey: self.serverPublicKey,
            owner: self.owner,
            balance: myBalance()
        };
    }
}

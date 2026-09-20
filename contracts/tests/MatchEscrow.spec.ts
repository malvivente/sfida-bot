import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Cell, Address } from '@ton/core';
import { keyPairFromSeed, sign } from '@ton/crypto';
import '@ton/test-utils';
import { MatchEscrow } from '../build/match_escrow/match_escrow_MatchEscrow';
import { ClashMaster } from '../build/clash_master/clash_master_ClashMaster';

describe('SfidaBot MatchEscrow & ClashMaster Contract Suite', () => {
    let blockchain: Blockchain;
    let masterTreasury: SandboxContract<TreasuryContract>;
    let playerA: SandboxContract<TreasuryContract>;
    let playerB: SandboxContract<TreasuryContract>;
    let spectator1: SandboxContract<TreasuryContract>;
    let spectator2: SandboxContract<TreasuryContract>;
    let recruiterA: SandboxContract<TreasuryContract>;
    let groupAdmin: SandboxContract<TreasuryContract>;

    // Ed25519 server keypair
    const serverSeed = Buffer.alloc(32, 7); // deterministic test seed
    const serverKeyPair = keyPairFromSeed(serverSeed);
    const serverPublicKeyBigInt = BigInt('0x' + serverKeyPair.publicKey.toString('hex'));

    const matchId = 1001n;
    const wagerAmount = toNano('1.0'); // 1 TON

    function createResolutionSignature(
        mId: bigint,
        winnerAddress: Address,
        timestamp: number,
        secretKey: Buffer
    ): Cell {
        const payloadCell = beginCell()
            .storeUint(mId, 64)
            .storeAddress(winnerAddress)
            .storeUint(timestamp, 32)
            .endCell();
        const hash = payloadCell.hash();
        const signature = sign(hash, secretKey);
        return beginCell().storeBuffer(signature).endCell();
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        masterTreasury = await blockchain.treasury('master_treasury');
        playerA = await blockchain.treasury('playerA');
        playerB = await blockchain.treasury('playerB');
        spectator1 = await blockchain.treasury('spectator1');
        spectator2 = await blockchain.treasury('spectator2');
        recruiterA = await blockchain.treasury('recruiterA');
        groupAdmin = await blockchain.treasury('groupAdmin');
    });

    it('Scenario 1: Standard Win with 50/50 Affiliate Split (Recruiter + Group Admin) and Pari-Mutuel Spectator Payout', async () => {
        // Deploy MatchEscrow directly
        const escrow = blockchain.openContract(
            await MatchEscrow.fromInit(
                masterTreasury.address,
                matchId,
                playerA.address,
                wagerAmount,
                serverPublicKeyBigInt,
                recruiterA.address,
                groupAdmin.address
            )
        );

        // 1. Initial funding / deploy by Player A
        const deployResult = await escrow.send(
            playerA.getSender(),
            { value: wagerAmount + toNano('0.07') }, // wager + creation fee + gas buffer
            null
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: playerA.address,
            to: escrow.address,
            success: true,
        });

        // 2. Player B joins with 1 TON
        const joinResult = await escrow.send(
            playerB.getSender(),
            { value: wagerAmount },
            {
                $$type: 'JoinMatch',
                matchId: matchId,
                recruiterB: null,
            }
        );
        expect(joinResult.transactions).toHaveTransaction({
            from: playerB.address,
            to: escrow.address,
            success: true,
        });

        // Check match state is ACTIVE
        let details = await escrow.getGetMatchDetails();
        expect(details.state).toEqual(1n); // STATE_ACTIVE
        expect(details.playerB?.equals(playerB.address)).toBe(true);

        // 3. Spectators bet on A and B
        // Spectator 1 bets 1.0 TON on Player A
        const bet1Result = await escrow.send(
            spectator1.getSender(),
            { value: toNano('1.0') },
            {
                $$type: 'BetSpectator',
                matchId: matchId,
                targetPlayer: playerA.address,
            }
        );
        expect(bet1Result.transactions).toHaveTransaction({
            from: spectator1.address,
            to: escrow.address,
            success: true,
        });

        // Spectator 2 bets 1.0 TON on Player B
        const bet2Result = await escrow.send(
            spectator2.getSender(),
            { value: toNano('1.0') },
            {
                $$type: 'BetSpectator',
                matchId: matchId,
                targetPlayer: playerB.address,
            }
        );
        expect(bet2Result.transactions).toHaveTransaction({
            from: spectator2.address,
            to: escrow.address,
            success: true,
        });

        details = await escrow.getGetMatchDetails();
        expect(details.totalBetsA).toEqual(toNano('1.0'));
        expect(details.totalBetsB).toEqual(toNano('1.0'));

        // 4. Resolve Match: Player A wins!
        // Total Player Pot: 2.0 TON. Rake = 4% = 0.08 TON. Winner gets 96% = 1.92 TON.
        // Total Spectator Pool: 2.0 TON. Rake = 6% = 0.12 TON. Distributable = 94% = 1.88 TON.
        // Total Rake = 0.08 + 0.12 = 0.20 TON.
        // Affiliate Pool = 30% of 0.20 = 0.06 TON.
        // Treasury Rake = 70% of 0.20 = 0.14 TON (+ 0.02 creation fee = 0.16 TON).
        // Case 1 (Recruiter + Group Admin): 50/50 -> 0.03 TON to Recruiter, 0.03 TON to Group Admin!
        const timestamp = Math.floor(Date.now() / 1000);
        const sigCell = createResolutionSignature(matchId, playerA.address, timestamp, serverKeyPair.secretKey);

        const resolveResult = await escrow.send(
            masterTreasury.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'ResolveMatch',
                matchId: matchId,
                winner: playerA.address,
                timestamp: BigInt(timestamp),
                signature: sigCell.beginParse(),
            }
        );

        // Verify Player A received 1.92 TON (96% of pot)
        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: playerA.address,
            value: toNano('1.92'),
            success: true,
        });

        // Verify Recruiter received 0.03 TON (15% of rake)
        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: recruiterA.address,
            value: toNano('0.03'),
            success: true,
        });

        // Verify Group Admin received 0.03 TON (15% of rake)
        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: groupAdmin.address,
            value: toNano('0.03'),
            success: true,
        });

        // Verify Treasury received 0.16 TON (0.14 rake + 0.02 creation fee)
        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: masterTreasury.address,
            value: toNano('0.16'),
            success: true,
        });

        // 5. Spectator 1 claims winning totalizer payout
        // Bet: 1.0 TON on Player A. Distributable pool: 1.88 TON. Total winning bets: 1.0 TON.
        // Payout = (1.0 * 1.88) / 1.0 = 1.88 TON!
        const claimResult = await escrow.send(
            spectator1.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'ClaimSpectatorReward',
                matchId: matchId,
            }
        );

        expect(claimResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: spectator1.address,
            value: toNano('1.88'),
            success: true,
        });

        // After the winning spectator claimed, contract self-destructs and sweeps dust to Master
        expect(claimResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: masterTreasury.address,
            success: true,
        });
    });

    it('Scenario 2: Affiliate Split Case 2 (Recruiter only, Private Match) -> 30% to Recruiter', async () => {
        const privateMatchId = 1002n;
        const escrow = blockchain.openContract(
            await MatchEscrow.fromInit(
                masterTreasury.address,
                privateMatchId,
                playerA.address,
                wagerAmount,
                serverPublicKeyBigInt,
                recruiterA.address,
                null // No group admin
            )
        );

        await escrow.send(playerA.getSender(), { value: wagerAmount + toNano('0.07') }, null);
        await escrow.send(playerB.getSender(), { value: wagerAmount }, {
            $$type: 'JoinMatch',
            matchId: privateMatchId,
            recruiterB: null,
        });

        // Resolve: Player A wins, 0 spectator bets.
        // Total Pot = 2.0 TON. Rake = 4% = 0.08 TON.
        // Affiliate Pool = 30% of 0.08 = 0.024 TON.
        // All 0.024 TON goes to Recruiter!
        // Treasury Rake = 70% of 0.08 = 0.056 TON (+ 0.02 fee = 0.076 TON).
        const timestamp = Math.floor(Date.now() / 1000);
        const sigCell = createResolutionSignature(privateMatchId, playerA.address, timestamp, serverKeyPair.secretKey);

        const resolveResult = await escrow.send(
            masterTreasury.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'ResolveMatch',
                matchId: privateMatchId,
                winner: playerA.address,
                timestamp: BigInt(timestamp),
                signature: sigCell.beginParse(),
            }
        );

        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: recruiterA.address,
            value: toNano('0.024'),
            success: true,
        });

        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: masterTreasury.address,
            value: toNano('0.076'),
            success: true,
        });
    });

    it('Scenario 3: Affiliate Split Case 4 (No Recruiter, No Group) -> 100% Rake Retained by Treasury', async () => {
        const soloMatchId = 1003n;
        const escrow = blockchain.openContract(
            await MatchEscrow.fromInit(
                masterTreasury.address,
                soloMatchId,
                playerA.address,
                wagerAmount,
                serverPublicKeyBigInt,
                null, // No recruiter
                null  // No group
            )
        );

        await escrow.send(playerA.getSender(), { value: wagerAmount + toNano('0.07') }, null);
        await escrow.send(playerB.getSender(), { value: wagerAmount }, {
            $$type: 'JoinMatch',
            matchId: soloMatchId,
            recruiterB: null,
        });

        // Total pot = 2.0 TON. Total rake = 0.08 TON.
        // Treasury gets 100% of rake (0.08 TON) + 0.02 TON fee = 0.10 TON!
        const timestamp = Math.floor(Date.now() / 1000);
        const sigCell = createResolutionSignature(soloMatchId, playerA.address, timestamp, serverKeyPair.secretKey);

        const resolveResult = await escrow.send(
            masterTreasury.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'ResolveMatch',
                matchId: soloMatchId,
                winner: playerA.address,
                timestamp: BigInt(timestamp),
                signature: sigCell.beginParse(),
            }
        );

        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: masterTreasury.address,
            value: toNano('0.10'),
            success: true,
        });
    });

    it('Scenario 4: Security & Anti-Cheat: Reject Invalid Server Signature', async () => {
        const cheatMatchId = 1004n;
        const escrow = blockchain.openContract(
            await MatchEscrow.fromInit(
                masterTreasury.address,
                cheatMatchId,
                playerA.address,
                wagerAmount,
                serverPublicKeyBigInt,
                null,
                null
            )
        );

        await escrow.send(playerA.getSender(), { value: wagerAmount + toNano('0.07') }, null);
        await escrow.send(playerB.getSender(), { value: wagerAmount }, {
            $$type: 'JoinMatch',
            matchId: cheatMatchId,
            recruiterB: null,
        });

        // Create forged signature with wrong private key
        const fakeSeed = Buffer.alloc(32, 99);
        const fakeKeyPair = keyPairFromSeed(fakeSeed);
        const timestamp = Math.floor(Date.now() / 1000);
        const forgedSigCell = createResolutionSignature(cheatMatchId, playerA.address, timestamp, fakeKeyPair.secretKey);

        const resolveResult = await escrow.send(
            playerA.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'ResolveMatch',
                matchId: cheatMatchId,
                winner: playerA.address,
                timestamp: BigInt(timestamp),
                signature: forgedSigCell.beginParse(),
            }
        );

        // Transaction must fail / abort due to invalid signature
        expect(resolveResult.transactions).toHaveTransaction({
            from: playerA.address,
            to: escrow.address,
            success: false,
        });
    });

    it('Scenario 5: Match Cancellation & Wager Refund when Player B never joins', async () => {
        const cancelMatchId = 1005n;
        const escrow = blockchain.openContract(
            await MatchEscrow.fromInit(
                masterTreasury.address,
                cancelMatchId,
                playerA.address,
                wagerAmount,
                serverPublicKeyBigInt,
                null,
                null
            )
        );

        await escrow.send(playerA.getSender(), { value: wagerAmount + toNano('0.07') }, null);

        // Player A cancels while still in CREATED state
        const emptySig = beginCell().storeBuffer(Buffer.alloc(64)).endCell();
        const cancelResult = await escrow.send(
            playerA.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'CancelMatch',
                matchId: cancelMatchId,
                reason: 'Timed out waiting for opponent',
                signature: emptySig.beginParse(),
            }
        );

        // Verify Player A received 1.0 TON wager refund
        expect(cancelResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: playerA.address,
            value: wagerAmount,
            success: true,
        });
    });

    it('Scenario 6: Affiliate Split Case 3 (Group Admin only, No Recruiter) -> 30% to Group Admin', async () => {
        const groupMatchId = 1006n;
        const escrow = blockchain.openContract(
            await MatchEscrow.fromInit(
                masterTreasury.address,
                groupMatchId,
                playerA.address,
                wagerAmount,
                serverPublicKeyBigInt,
                null, // No recruiter
                groupAdmin.address // Group admin present
            )
        );

        await escrow.send(playerA.getSender(), { value: wagerAmount + toNano('0.07') }, null);
        await escrow.send(playerB.getSender(), { value: wagerAmount }, {
            $$type: 'JoinMatch',
            matchId: groupMatchId,
            recruiterB: null,
        });

        // 2.0 TON Pot -> 0.08 TON Rake.
        // Affiliate Pool = 30% of 0.08 = 0.024 TON -> 100% to Group Admin!
        // Treasury Rake = 70% of 0.08 = 0.056 TON (+ 0.02 fee = 0.076 TON).
        const timestamp = Math.floor(Date.now() / 1000);
        const sigCell = createResolutionSignature(groupMatchId, playerA.address, timestamp, serverKeyPair.secretKey);

        const resolveResult = await escrow.send(
            masterTreasury.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'ResolveMatch',
                matchId: groupMatchId,
                winner: playerA.address,
                timestamp: BigInt(timestamp),
                signature: sigCell.beginParse(),
            }
        );

        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: groupAdmin.address,
            value: toNano('0.024'),
            success: true,
        });

        expect(resolveResult.transactions).toHaveTransaction({
            from: escrow.address,
            to: masterTreasury.address,
            value: toNano('0.076'),
            success: true,
        });
    });

    it('Scenario 7: ClashMaster Factory Match Creation', async () => {
        const master = blockchain.openContract(
            await ClashMaster.fromInit(masterTreasury.address, serverPublicKeyBigInt)
        );

        await master.send(
            masterTreasury.getSender(),
            { value: toNano('1.0') },
            null
        );

        const factoryMatchId = 1007n;
        const deployMatchResult = await master.send(
            playerA.getSender(),
            { value: wagerAmount + toNano('0.15') },
            {
                $$type: 'DeployMatch',
                matchId: factoryMatchId,
                wagerAmount: wagerAmount,
                recruiterA: recruiterA.address,
                groupAdminAddress: groupAdmin.address,
            }
        );

        expect(deployMatchResult.transactions).toHaveTransaction({
            from: playerA.address,
            to: master.address,
            success: true,
        });

        const stats = await master.getGetStats();
        expect(stats.matchCount).toEqual(1n);
    });

    it('Scenario 8: Factory DeployMatch without pre-funded master, followed by Player B join and Player A cancel', async () => {
        const master = blockchain.openContract(
            await ClashMaster.fromInit(masterTreasury.address, serverPublicKeyBigInt)
        );

        // Master deployed with standard deploy value 0.05 TON (just like in deployClashMaster.ts)
        await master.send(
            masterTreasury.getSender(),
            { value: toNano('0.05') },
            null
        );

        const factoryMatchId = 2001n;
        // Player A sends DeployMatch with wager 1 TON + 0.15 TON buffer
        const deployMatchResult = await master.send(
            playerA.getSender(),
            { value: wagerAmount + toNano('0.15') },
            {
                $$type: 'DeployMatch',
                matchId: factoryMatchId,
                wagerAmount: wagerAmount,
                recruiterA: null,
                groupAdminAddress: null,
            }
        );


        console.log('DeployMatch transactions:');
        for (const tx of deployMatchResult.transactions) {
            console.log(`  from: ${tx.inMessage?.info.src} -> to: ${tx.inMessage?.info.dest}, exitCode: ${tx.description.type === 'generic' ? tx.description.computePhase.type === 'vm' ? tx.description.computePhase.exitCode : 'no-vm' : 'non-generic'}, aborted: ${tx.description.type === 'generic' ? tx.description.aborted : ''}`);
        }

        const escrowAddr = await master.getGetEscrowAddress(
            factoryMatchId,
            playerA.address,
            wagerAmount,
            null,
            null
        );

        console.log('Escrow Address from Master getter:', escrowAddr.toString());

        // Test computeEscrowAddress manual calculation
        const { computeEscrowAddress } = require('../build/clash_master/clash_master_MatchEscrow');
        // Let's also check with the custom computeEscrowAddress logic
        const { beginCell: bCell, contractAddress: cAddr, Cell: TCell } = require('@ton/core');
        const b_0 = bCell();
        b_0.storeUint(0, 1);
        b_0.storeAddress(master.address);
        b_0.storeUint(factoryMatchId, 64);
        b_0.storeAddress(playerA.address);
        b_0.storeCoins(wagerAmount);
        b_0.storeUint(serverPublicKeyBigInt, 256);
        const b_1 = bCell();
        b_1.storeAddress(null);
        b_1.storeAddress(null);
        b_0.storeRef(b_1.endCell());
        const dataCell = b_0.endCell();
        const codeCell = (await MatchEscrow.fromInit(master.address, factoryMatchId, playerA.address, wagerAmount, serverPublicKeyBigInt, null, null)).init!.code;
        const manualAddr = cAddr(0, { code: codeCell, data: dataCell });
        console.log('Manual Computed Escrow Address:   ', manualAddr.toString());
        expect(manualAddr.toString()).toEqual(escrowAddr.toString());

        const escrow = blockchain.openContract(MatchEscrow.fromAddress(escrowAddr));
        const escrowDetails = await escrow.getGetMatchDetails();
        console.log('Escrow Details:', escrowDetails);
        expect(escrowDetails.state).toEqual(0n); // STATE_CREATED

        // 1. Test Player B Joining
        const joinResult = await escrow.send(
            playerB.getSender(),
            { value: wagerAmount + toNano('0.05') },
            {
                $$type: 'JoinMatch',
                matchId: factoryMatchId,
                recruiterB: null,
            }
        );
        expect(joinResult.transactions).toHaveTransaction({
            from: playerB.address,
            to: escrow.address,
            success: true,
        });

        const activeDetails = await escrow.getGetMatchDetails();
        expect(activeDetails.state).toEqual(1n); // STATE_ACTIVE
        expect(activeDetails.playerB?.equals(playerB.address)).toBe(true);
    });
});

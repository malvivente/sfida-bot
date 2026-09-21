import { jest } from '@jest/globals';
import { QuickdrawRoom } from '../src/engine/QuickdrawRoom.js';
import { computePariMutuelOdds } from '../src/services/oddsCalculator.js';

describe('Authoritative Cyber Quickdraw Engine Suite', () => {
  const matchId = 5001n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Evaluates Misfire Penalty: Tapping during WAITING_FOR_SIGNAL triggers instant round loss', () => {
    const room = new QuickdrawRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.state = 'WAITING_FOR_SIGNAL';

    // Player A misfires (taps before real FIRE signal)
    const result = room.handleTap(playerAWallet);
    expect(result.accepted).toBe(true);

    // Opponent (Player B) should be awarded round win!
    expect(room.playerA.score).toBe(0);
    expect(room.playerB?.score).toBe(1);
    expect(room.state).toBe('ROUND_END');
  });

  it('Evaluates Valid Tap: Faster tap after FIRE signal wins the round and records reaction time', () => {
    const room = new QuickdrawRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.state = 'SIGNAL_FIRED';

    // Player A taps first after fire
    const result = room.handleTap(playerAWallet);
    expect(result.accepted).toBe(true);
    expect(room.playerA.score).toBe(1);
    expect(room.playerA.lastReactionTimeMs).toBeDefined();
    expect(room.playerA.lastReactionTimeMs).toBeGreaterThanOrEqual(0);
    expect(room.state).toBe('ROUND_END');
  });

  it('Evaluates Match Settlement: Best of 3 (first to 2 wins) declares overall winner', () => {
    let settledWinner = '';
    const room = new QuickdrawRoom(
      {
        matchId,
        wagerAmountNano: 1000000000n,
        playerAAddress: playerAWallet,
        playerBAddress: playerBWallet,
      },
      async (_r, winner) => {
        settledWinner = winner;
      }
    );

    // Round 1: Player A wins
    room.state = 'SIGNAL_FIRED';
    room.handleTap(playerAWallet);
    expect(room.playerA.score).toBe(1);

    // Round 2: Player A wins again (reaching 2 wins)
    room.state = 'SIGNAL_FIRED';
    room.handleTap(playerAWallet);
    expect(room.playerA.score).toBe(2);
    expect(room.state).toBe('MATCH_SETTLED');
    expect(room.winnerAddress).toBe(playerAWallet);
    expect(settledWinner).toBe(playerAWallet);
  });

  it('Evaluates Disconnect Grace Period & Automatic Forfeit', (done) => {
    jest.useFakeTimers();

    const room = new QuickdrawRoom(
      {
        matchId,
        wagerAmountNano: 1000000000n,
        playerAAddress: playerAWallet,
        playerBAddress: playerBWallet,
      },
      async (_r, winner) => {
        expect(winner).toBe(playerAWallet);
        expect(room.state).toBe('FORFEITED');
        jest.useRealTimers();
        done();
      }
    );

    room.state = 'ROUND_START';
    room.playerA.connected = true;
    if (room.playerB) room.playerB.connected = true;

    // Player B disconnects
    room.handleDisconnect(playerBWallet);
    expect(room.playerB?.connected).toBe(false);

    // Advance timer past 8-second grace period
    jest.advanceTimersByTime(8100);
  });

  it('Ensures Disconnecting in LOBBY state does NOT trigger forfeit', () => {
    jest.useFakeTimers();

    let settled = false;
    const room = new QuickdrawRoom(
      {
        matchId: 5002n,
        wagerAmountNano: 1000000000n,
        playerAAddress: playerAWallet,
        playerBAddress: playerBWallet,
      },
      async () => {
        settled = true;
      }
    );

    room.state = 'LOBBY';
    room.playerA.connected = true;
    if (room.playerB) room.playerB.connected = true;

    // Player B disconnects in LOBBY (e.g. stepping back to lobby or closing app before readying up)
    room.handleDisconnect(playerBWallet);
    expect(room.playerB?.connected).toBe(false);

    // Advance 10 seconds
    jest.advanceTimersByTime(10000);

    // Match MUST still be in LOBBY and NOT forfeited/settled!
    expect(room.state).toBe('LOBBY');
    expect(settled).toBe(false);
    expect(room.winnerAddress).toBeUndefined();

    jest.useRealTimers();
  });

  it('Evaluates Zero-Risk Pari-Mutuel Odds Calculation', () => {
    // 5 TON on A, 10 TON on B. Total = 15 TON.
    // 6% Rake = 0.90 TON.
    // 94% Distributable = 14.10 TON.
    // Odds A = 14.10 / 5 = 2.82x
    // Odds B = 14.10 / 10 = 1.41x
    const betsA = 5000000000n;
    const betsB = 10000000000n;

    const odds = computePariMutuelOdds(betsA, betsB);
    expect(odds.oddsA).toBe(2.82);
    expect(odds.oddsB).toBe(1.41);
    expect(odds.spectatorRakeNano).toBe(900000000n);
    expect(odds.distributablePoolNano).toBe(14100000000n);
  });
});

import { ChronoBlindRoom } from '../src/engine/ChronoBlindRoom.js';

describe('Chrono Blind Engine Suite', () => {
  const matchId = 6004n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Initializes Chrono Blind with target duration between 5.00s and 8.00s and blackout threshold at 3.00s', () => {
    const room = new ChronoBlindRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();

    expect(room.targetDurationMs).toBeGreaterThanOrEqual(5000);
    expect(room.targetDurationMs).toBeLessThanOrEqual(8000);
    expect(room.blindThresholdMs).toBe(3000);
    expect(room.currentRound).toBe(1);

    room.cleanupGameTimers();
  });

  it('Evaluates closest to 0.000s without exceeding as round winner', () => {
    const room = new ChronoBlindRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.targetDurationMs = 5000;
    room.startEpochMs = Date.now() - 4000; // started 4000ms ago

    // Player A stops at 4920ms (80ms to 0.000s)
    (room as any).recordStop('A', room.startEpochMs + 4920);
    expect(room.diffMsA).toBe(80);
    expect(room.bustedA).toBe(false);

    // Player B stops at 4600ms (400ms to 0.000s)
    (room as any).recordStop('B', room.startEpochMs + 4600);
    expect(room.diffMsB).toBe(400);
    expect(room.bustedB).toBe(false);

    (room as any).evaluateRound();

    expect(room.roundWinner).toBe('A');
    expect(room.playerA.score).toBe(1);

    room.cleanupGameTimers();
  });

  it('Evaluates overshoot past 0.000s as BUST', () => {
    const room = new ChronoBlindRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.targetDurationMs = 5000;
    room.startEpochMs = Date.now() - 6000;

    // Player A stops at 5050ms (50ms AFTER 0.000s => BUST)
    (room as any).recordStop('A', room.startEpochMs + 5050);
    expect(room.bustedA).toBe(true);

    // Player B stops at 4700ms (300ms BEFORE 0.000s => SAFE)
    (room as any).recordStop('B', room.startEpochMs + 4700);
    expect(room.bustedB).toBe(false);

    (room as any).evaluateRound();

    // Player B wins because Player A busted!
    expect(room.roundWinner).toBe('B');
    expect(room.playerB?.score).toBe(1);

    room.cleanupGameTimers();
  });
});

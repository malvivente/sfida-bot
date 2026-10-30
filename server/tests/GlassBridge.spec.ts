import { GlassBridgeRoom } from '../src/engine/GlassBridgeRoom.js';

describe('Glass Bridge Engine Suite', () => {
  const matchId = 6003n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Initializes endless bridge with 3 starting lives and 1 skip per player', () => {
    const room = new GlassBridgeRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();

    expect(room.livesA).toBe(3);
    expect(room.livesB).toBe(3);
    expect(room.passesRemainingA).toBe(1);
    expect(room.passesRemainingB).toBe(1);
    expect(room.currentStepA).toBe(0);
    expect(room.currentStepB).toBe(0);
    expect(['A', 'B']).toContain(room.currentTurn);

    room.cleanupGameTimers();
  });

  it('Safe step advances both players and reveals step choice', () => {
    const room = new GlassBridgeRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';
    (room as any).safePath = ['LEFT', 'RIGHT', 'LEFT', 'RIGHT'];

    // Player A steps on LEFT for step 1
    room.handleBridgeStep(playerAWallet, 'LEFT');

    expect(room.currentStepA).toBe(1);
    expect(room.currentStepB).toBe(1);
    expect(room.revealedSteps[1]).toBe('LEFT');
    expect(room.lastOutcome?.result).toBe('SAFE');
    expect(room.currentTurn).toBe('B');

    room.cleanupGameTimers();
  });

  it('Shattered step deducts life, reveals safe tile, and switches turn to opponent', () => {
    const room = new GlassBridgeRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';
    (room as any).safePath = ['LEFT', 'RIGHT', 'LEFT', 'RIGHT'];

    // Player A steps on RIGHT (wrong, LEFT was safe!)
    room.handleBridgeStep(playerAWallet, 'RIGHT');

    expect(room.livesA).toBe(2); // 1 life lost from 3
    expect(room.revealedSteps[1]).toBe('LEFT'); // Safe tile revealed!
    expect(room.lastOutcome?.result).toBe('SHATTER');
    expect(room.currentTurn).toBe('B'); // Turn passes to Player B
    expect(room.currentStepA).toBe(1); // Both players advance past step 1
    expect(room.currentStepB).toBe(1);

    room.cleanupGameTimers();
  });

  it('Skip / Pass lead allows skipping step, decrements pass, and passes turn', () => {
    const room = new GlassBridgeRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';

    expect(room.passesRemainingA).toBe(1);

    // Player A uses skip
    room.handleGameAction(playerAWallet, { type: 'BRIDGE_PASS' });

    expect(room.passesRemainingA).toBe(0);
    expect(room.currentTurn).toBe('B');
    expect(room.lastOutcome?.result).toBe('PASS');

    // Attempting to pass again should be ignored (0 remaining)
    room.currentTurn = 'A';
    room.handleGameAction(playerAWallet, { type: 'BRIDGE_PASS' });
    expect(room.currentTurn).toBe('A'); // Turn not passed because 0 remaining

    room.cleanupGameTimers();
  });

  it('Losing all 3 lives settles match and awards opponent victory', () => {
    let settledWinner = '';
    const room = new GlassBridgeRoom(
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

    room.onGameStart();
    (room as any).safePath = ['LEFT', 'LEFT', 'LEFT', 'LEFT'];

    // Player A loses 3 lives on wrong steps
    room.currentTurn = 'A';
    room.handleBridgeStep(playerAWallet, 'RIGHT'); // life 1 lost (2 left)
    expect(room.livesA).toBe(2);

    room.currentTurn = 'A';
    room.handleBridgeStep(playerAWallet, 'RIGHT'); // life 2 lost (1 left)
    expect(room.livesA).toBe(1);

    room.currentTurn = 'A';
    room.handleBridgeStep(playerAWallet, 'RIGHT'); // life 3 lost (0 left -> match settled!)

    expect(room.livesA).toBe(0);
    expect(room.state).toBe('MATCH_SETTLED');
    expect(room.winnerAddress).toBe(playerBWallet);

    room.cleanupGameTimers();
  });
});

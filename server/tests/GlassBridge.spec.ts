import { GlassBridgeRoom } from '../src/engine/GlassBridgeRoom.js';

describe('Glass Bridge Engine Suite', () => {
  const matchId = 6003n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Initializes 6-step bridge and 2 starting lives per player', () => {
    const room = new GlassBridgeRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();

    expect(room.totalSteps).toBe(6);
    expect(room.livesA).toBe(2);
    expect(room.livesB).toBe(2);
    expect(room.currentStepA).toBe(0);
    expect(room.currentStepB).toBe(0);
    expect(room.currentTurn).toBe('A');

    room.cleanupGameTimers();
  });

  it('Safe step advances player and reveals step choice', () => {
    const room = new GlassBridgeRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    (room as any).safePath = ['LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT'];

    // Player A steps on LEFT for step 1
    room.handleBridgeStep(playerAWallet, 'LEFT');

    expect(room.currentStepA).toBe(1);
    expect(room.revealedSteps[1]).toBe('LEFT');
    expect(room.lastOutcome?.result).toBe('SAFE');

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
    (room as any).safePath = ['LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT'];

    // Player A steps on RIGHT (wrong!)
    room.handleBridgeStep(playerAWallet, 'RIGHT');

    expect(room.livesA).toBe(1); // 1 life lost
    expect(room.revealedSteps[1]).toBe('LEFT'); // Safe tile revealed!
    expect(room.lastOutcome?.result).toBe('SHATTER');
    expect(room.currentTurn).toBe('B'); // Turn passes to Player B
    expect(room.currentStepB).toBe(1); // Opponent advances to the revealed checkpoint

    room.cleanupGameTimers();
  });

  it('Crossing all 6 steps triggers victory', () => {
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
    (room as any).safePath = ['LEFT', 'LEFT', 'LEFT', 'LEFT', 'LEFT', 'LEFT'];

    // Player A steps through all 6 steps
    for (let s = 1; s <= 6; s++) {
      room.currentTurn = 'A';
      room.handleBridgeStep(playerAWallet, 'LEFT');
    }

    expect(room.currentStepA).toBe(6);
    expect(room.state).toBe('MATCH_SETTLED');
    expect(room.winnerAddress).toBe(playerAWallet);

    room.cleanupGameTimers();
  });
});

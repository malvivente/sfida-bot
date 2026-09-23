import { RussianRouletteRoom } from '../src/engine/RussianRouletteRoom.js';

describe('Russian Roulette Engine Suite', () => {
  const matchId = 6001n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Initializes Russian Roulette with 8 chambers and 1 live bullet', () => {
    const room = new RussianRouletteRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    expect(room.gameType).toBe('roulette');
    expect(room.state).toBe('LOBBY');
    expect(room.chambersRemaining).toBe(8);

    room.onGameStart();
    expect(room.state).toBe('GAME_ACTIVE');
    expect(['A', 'B']).toContain(room.currentTurn);
    expect(room.shieldA).toBe(false);
    expect(room.shieldB).toBe(false);

    room.cleanupGameTimers();
  });

  it('Shooting self on a blank grants Shield defense and passes turn', () => {
    const room = new RussianRouletteRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';

    // Mock Math.random to guarantee a blank (not chamber 1)
    const originalRandom = Math.random;
    Math.random = () => 0.99; // roll will be 8 (blank)

    room.handleRouletteShoot(playerAWallet, 'self');

    expect(room.shieldA).toBe(true);
    expect(room.chambersRemaining).toBe(7);
    expect(room.currentTurn).toBe('B');
    expect(room.lastOutcome?.result).toBe('BLANK');

    Math.random = originalRandom;
    room.cleanupGameTimers();
  });

  it('Prevents shooting self when shield is active, and absorbs bullet when opponent shoots', () => {
    const room = new RussianRouletteRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';
    room.shieldA = true;

    // 1. Player A tries to shoot self while shielded -> REJECTED
    room.handleRouletteShoot(playerAWallet, 'self');
    expect(room.shieldA).toBe(true);
    expect(room.currentTurn).toBe('A'); // Turn didn't pass, action was blocked

    // 2. Turn passes to Player B, who shoots opponent (Player A who has shield)
    room.currentTurn = 'B';
    const originalRandom = Math.random;
    Math.random = () => 0.01; // roll will be 1 (BANG)

    room.handleRouletteShoot(playerBWallet, 'opponent');

    expect(room.shieldA).toBe(false); // Shield absorbed bullet
    expect(room.chambersRemaining).toBe(8); // Reloaded cylinder
    expect(room.state).toBe('GAME_ACTIVE'); // Did NOT die!
    expect(room.currentTurn).toBe('A');

    Math.random = originalRandom;
    room.cleanupGameTimers();
  });

  it('Enforces max 1 shield per match: blocks shooting self if shield was already earned', () => {
    const room = new RussianRouletteRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';
    room.shieldsEarnedA = 1;
    room.shieldA = false; // Shield was already consumed

    // Attempting to shoot self when already earned 1 shield is blocked
    room.handleRouletteShoot(playerAWallet, 'self');
    expect(room.shieldA).toBe(false);
    expect(room.currentTurn).toBe('A'); // Blocked!

    room.cleanupGameTimers();
  });

  it('Shooting opponent on a live bullet wins the match if opponent has no shield', () => {
    let settledWinner = '';
    const room = new RussianRouletteRoom(
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
    room.currentTurn = 'A';
    room.shieldB = false;

    // Mock Math.random to guarantee bullet
    const originalRandom = Math.random;
    Math.random = () => 0.01;

    room.handleRouletteShoot(playerAWallet, 'opponent');

    expect(room.state).toBe('MATCH_SETTLED');
    expect(room.winnerAddress).toBe(playerAWallet);
    expect(room.lastOutcome?.result).toBe('BANG');

    Math.random = originalRandom;
    room.cleanupGameTimers();
  });

  it('Rematch: blocks request if opponent left room, and blocks self-accept exploit', async () => {
    const room = new RussianRouletteRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.settleMatch(playerAWallet);
    expect(room.state).toBe('MATCH_SETTLED');

    // 1. If Player B is not connected, Player A cannot request rematch
    room.playerA.connected = true;
    room.playerB!.connected = false;
    await room.requestRematch(playerAWallet, 'Player A');
    expect(room.rematchProposerWallet).toBeUndefined();

    // 2. Mock both players connected with open sockets
    const mockWs = { readyState: 1, send: () => {} } as any;
    room.playerA.ws = mockWs;
    room.playerB!.connected = true;
    room.playerB!.ws = mockWs;

    await room.requestRematch(playerAWallet, 'Player A');
    expect(room.rematchProposerWallet).toBe(playerAWallet);
    expect(room.rematchNewWagerNano).toBe(2000000000n);

    // 3. Player A attempts to self-accept their own rematch offer -> BLOCKED
    await room.acceptRematch(playerAWallet);
    expect(room.state).toBe('MATCH_SETTLED'); // Did NOT reset to LOBBY!
    expect(room.rematchProposerWallet).toBe(playerAWallet); // Rematch offer still pending for opponent

    room.cleanupGameTimers();
  });
});

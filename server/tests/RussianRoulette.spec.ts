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

  it('Shooting self on a live bullet with a shield breaks shield and reloads', () => {
    const room = new RussianRouletteRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();
    room.currentTurn = 'A';
    room.shieldA = true;

    // Mock Math.random to guarantee bullet (chamber 1)
    const originalRandom = Math.random;
    Math.random = () => 0.01; // roll will be 1 (BANG)

    room.handleRouletteShoot(playerAWallet, 'self');

    expect(room.shieldA).toBe(false); // Shield absorbed bullet
    expect(room.chambersRemaining).toBe(8); // Reloaded
    expect(room.state).toBe('GAME_ACTIVE'); // Did NOT die!
    expect(room.currentTurn).toBe('B');

    Math.random = originalRandom;
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
});

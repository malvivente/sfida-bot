import { BlackjackRoom } from '../src/engine/BlackjackRoom.js';

describe('Blackjack Face-Up Engine Suite', () => {
  const matchId = 6002n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Deals 2 face-up cards to each player at game start', () => {
    const room = new BlackjackRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();

    expect(room.handA.length).toBe(2);
    expect(room.handB.length).toBe(2);
    expect(room.scoreA).toBeGreaterThanOrEqual(4);
    expect(room.scoreB).toBeGreaterThanOrEqual(4);
    expect(room.currentTurn).toBe('A');

    room.cleanupGameTimers();
  });

  it('Evaluates Aces correctly as 11 or 1', () => {
    const room = new BlackjackRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    // Ace + 8 = 19
    const score1 = room.calculateHandScore([
      { suit: '♠', value: 'A', numericValue: 11 },
      { suit: '♥', value: '8', numericValue: 8 },
    ]);
    expect(score1).toBe(19);

    // Ace + 8 + 5 = 14 (Ace reduced to 1)
    const score2 = room.calculateHandScore([
      { suit: '♠', value: 'A', numericValue: 11 },
      { suit: '♥', value: '8', numericValue: 8 },
      { suit: '♦', value: '5', numericValue: 5 },
    ]);
    expect(score2).toBe(14);
  });

  it('Evaluates Stand and Showdown between both players', () => {
    let settledWinner = '';
    const room = new BlackjackRoom(
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

    // Force known hands
    room.handA = [
      { suit: '♠', value: '10', numericValue: 10 },
      { suit: '♥', value: '9', numericValue: 9 }, // 19
    ];
    room.scoreA = 19;

    room.handB = [
      { suit: '♦', value: '10', numericValue: 10 },
      { suit: '♣', value: '7', numericValue: 7 }, // 17
    ];
    room.scoreB = 17;

    // Player A stands
    room.handleBlackjackAction(playerAWallet, 'STAND');
    expect(room.standA).toBe(true);
    expect(room.currentTurn).toBe('B');

    // Player B stands
    room.handleBlackjackAction(playerBWallet, 'STAND');
    expect(room.standB).toBe(true);
    expect(room.state).toBe('MATCH_SETTLED');
    expect(room.winnerAddress).toBe(playerAWallet); // 19 beats 17!

    room.cleanupGameTimers();
  });
});

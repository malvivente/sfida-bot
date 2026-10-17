import { HeadSoccerRoom } from '../src/engine/HeadSoccerRoom.js';

describe('Head Soccer 1v1 Engine Suite', () => {
  const matchId = 7001n;
  const playerAWallet = '0:1111111111111111111111111111111111111111111111111111111111111111';
  const playerBWallet = '0:2222222222222222222222222222222222222222222222222222222222222222';

  it('Super shot state persists across kickoff if activated and not used', () => {
    const room = new HeadSoccerRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
    });

    room.onGameStart();

    // Arm super shot for Player A
    (room as any).pA.superCharge = 100;
    room.handleGameAction(playerAWallet, { type: 'HEADSOCCER_INPUT', super: true });
    expect((room as any).pA.superActive).toBe(true);

    // Goal is scored by Player B, triggering celebration & kickoff
    (room as any).onGoalScored('B');
    expect((room as any).playerB.score).toBe(1);

    // After goal celebration, start kickoff countdown
    (room as any).startKickoffCountdown(2, 'A');

    // Player A super shot MUST still remain active!
    expect((room as any).pA.superActive).toBe(true);

    room.cleanupGameTimers();
  });

  it('First to reach 5 goals ends match immediately with full-time settlement', () => {
    const room = new HeadSoccerRoom(
      {
        matchId,
        wagerAmountNano: 1000000000n,
        playerAAddress: playerAWallet,
        playerBAddress: playerBWallet,
      }
    );

    room.onGameStart();

    // Player A scores 4 goals
    (room as any).playerA.score = 4;

    // 5th goal scored by Player A
    (room as any).onGoalScored('A');

    expect((room as any).phase).toBe('FULL_TIME');
    expect((room as any).timeRemainingMs).toBe(0);
    expect((room as any).playerA.score).toBe(5);

    room.cleanupGameTimers();
  });

  it('Immediate start when both ready if allowSpectators is false in private match', () => {
    const room = new HeadSoccerRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
      isPrivate: true,
      allowSpectators: false,
    });

    expect(room.allowSpectators).toBe(false);

    // Mark both players ready
    room.playerA.ready = true;
    (room as any).playerB.ready = true;

    // Start betting window method should bypass betting and immediately set GAME_ACTIVE
    room.startBettingWindow();

    expect(room.state).toBe('GAME_ACTIVE');
    room.cleanupGameTimers();
  });

  it('Starts 20-second betting window when allowSpectators is true', () => {
    const room = new HeadSoccerRoom({
      matchId,
      wagerAmountNano: 1000000000n,
      playerAAddress: playerAWallet,
      playerBAddress: playerBWallet,
      isPrivate: false,
      allowSpectators: true,
    });

    expect(room.allowSpectators).toBe(true);

    room.playerA.ready = true;
    (room as any).playerB.ready = true;

    room.startBettingWindow();

    expect(room.state).toBe('BETTING_WINDOW');
    expect((room as any).bettingCountdownSeconds).toBe(20);

    room.cleanupGameTimers();
  });
});

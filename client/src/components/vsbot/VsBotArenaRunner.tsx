import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameType } from '../../types/index.js';
import { GAMES_METADATA } from '../../config/gamesConfig.js';
import { ArrowLeft, Bot, RotateCcw, Trophy, Skull } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';

// Arenas
import { RussianRouletteArena } from '../games/RussianRouletteArena.js';
import { BlackjackArena } from '../games/BlackjackArena.js';
import { Connect4Arena } from '../games/Connect4Arena.js';
import { CyberShotgunArena } from '../games/CyberShotgunArena.js';
import { GlassBridgeArena } from '../games/GlassBridgeArena.js';
import { ChronoBlindArena } from '../games/ChronoBlindArena.js';
import { SplitStealArena } from '../games/SplitStealArena.js';
import { CubeCountArena } from '../games/CubeCountArena.js';
import { HeadSoccerArena } from '../games/HeadSoccerArena.js';
import { PokerArena } from '../games/PokerArena.js';

interface VsBotArenaRunnerProps {
  gameType: GameType;
  onExit: () => void;
  userProfile?: {
    displayName?: string;
    username?: string;
    photoUrl?: string;
  };
}

export const VsBotArenaRunner: React.FC<VsBotArenaRunnerProps> = ({
  gameType,
  onExit,
  userProfile,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const playerName = userProfile?.displayName || userProfile?.username || 'Giocatore';
  const botName = '🤖 CPU Bot';

  const [roomState, setRoomState] = useState<'GAME_ACTIVE' | 'MATCH_SETTLED'>('GAME_ACTIVE');
  const [winnerSide, setWinnerSide] = useState<'A' | 'B' | null>(null);
  const [matchCount, setMatchCount] = useState(1);

  // --- 1. RUSSIAN ROULETTE STATE & BOT ---
  const [rouletteChambers, setRouletteChambers] = useState(8);
  const [rouletteBulletPos, setRouletteBulletPos] = useState(() => Math.floor(Math.random() * 8));
  const [rouletteCurrentTurn, setRouletteCurrentTurn] = useState<'A' | 'B'>('A');
  const [rouletteOffensiveA, setRouletteOffensiveA] = useState(1);
  const [rouletteOffensiveB, setRouletteOffensiveB] = useState(1);
  const [rouletteLastOutcome, setRouletteLastOutcome] = useState<any>(undefined);

  const resetRoulette = () => {
    setRouletteChambers(8);
    setRouletteBulletPos(Math.floor(Math.random() * 8));
    setRouletteCurrentTurn('A');
    setRouletteOffensiveA(1);
    setRouletteOffensiveB(1);
    setRouletteLastOutcome(undefined);
  };

  const handleRouletteShoot = (target: 'self' | 'opponent', shooter: 'A' | 'B' = 'A') => {
    const isBullet = rouletteChambers === rouletteBulletPos + 1; // Last chamber or random trigger
    const newChambers = rouletteChambers - 1;

    if (isBullet) {
      // Bang!
      const loser = target === 'self' ? shooter : shooter === 'A' ? 'B' : 'A';
      const winner = loser === 'A' ? 'B' : 'A';
      setRouletteLastOutcome({
        shooter,
        target,
        result: 'BANG',
        message: target === 'self' ? `${shooter === 'A' ? playerName : botName} si è sparato! BANG!` : `${shooter === 'A' ? playerName : botName} spara all'avversario! BANG!`,
      });
      setRouletteChambers(newChambers);
      setWinnerSide(winner);
      setRoomState('MATCH_SETTLED');
      if (winner === 'A') triggerNotification('success');
      else triggerNotification('error');
    } else {
      // Blank click!
      setRouletteLastOutcome({
        shooter,
        target,
        result: 'BLANK',
        message: target === 'self' ? `${shooter === 'A' ? playerName : botName} si è sparato! CLICK! Chamber vuota!` : `${shooter === 'A' ? playerName : botName} spara all'avversario! CLICK! A vuoto!`,
      });
      setRouletteChambers(newChambers);

      if (target === 'self') {
        // Extra turn for shooting self with a blank
        if (shooter === 'A') {
          setRouletteOffensiveA((prev) => Math.min(prev + 1, 2));
        } else {
          setRouletteOffensiveB((prev) => Math.min(prev + 1, 2));
        }
      } else {
        // Turn passes to opponent
        setRouletteCurrentTurn(shooter === 'A' ? 'B' : 'A');
      }
    }
  };

  // Bot AI for Russian Roulette
  useEffect(() => {
    if (gameType !== 'roulette' || roomState !== 'GAME_ACTIVE' || rouletteCurrentTurn !== 'B') return;

    const timer = setTimeout(() => {
      // Intelligent probability check:
      // If chambers > 4, shoot self for extra turn. If chambers <= 4, shoot opponent!
      const choice: 'self' | 'opponent' = rouletteChambers > 4 && rouletteOffensiveB <= 0 ? 'self' : rouletteChambers <= 3 ? 'opponent' : Math.random() > 0.4 ? 'self' : 'opponent';
      handleRouletteShoot(choice, 'B');
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameType, roomState, rouletteCurrentTurn, rouletteChambers, rouletteOffensiveB]);

  // --- 2. BLACKJACK STATE & BOT ---
  const createDeck = () => {
    const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: any[] = [];
    for (const suit of suits) {
      for (const value of values) {
        let num = parseInt(value);
        if (['J', 'Q', 'K'].includes(value)) num = 10;
        if (value === 'A') num = 11;
        deck.push({ suit, value, numericValue: num });
      }
    }
    return deck.sort(() => Math.random() - 0.5);
  };

  const calculateBlackjackScore = (hand: any[]) => {
    let score = hand.reduce((sum, c) => sum + c.numericValue, 0);
    let aces = hand.filter((c) => c.value === 'A').length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  };

  const [bjDeck, setBjDeck] = useState<any[]>(createDeck);
  const [bjHandA, setBjHandA] = useState<any[]>([]);
  const [bjHandB, setBjHandB] = useState<any[]>([]);
  const [bjTurn, setBjTurn] = useState<'A' | 'B' | 'FINISHED'>('A');
  const [bjStandA, setBjStandA] = useState(false);
  const [bjStandB, setBjStandB] = useState(false);

  const resetBlackjack = () => {
    const d = createDeck();
    const cA1 = d.pop()!;
    const cB1 = d.pop()!;
    const cA2 = d.pop()!;
    const cB2 = d.pop()!;
    setBjDeck(d);
    setBjHandA([cA1, cA2]);
    setBjHandB([cB1, cB2]);
    setBjTurn('A');
    setBjStandA(false);
    setBjStandB(false);
  };

  useEffect(() => {
    if (gameType === 'blackjack') {
      resetBlackjack();
    }
  }, [gameType, matchCount]);

  const handleBlackjackHit = () => {
    if (bjTurn !== 'A' || bjStandA) return;
    const newDeck = [...bjDeck];
    const newCard = newDeck.pop();
    if (!newCard) return;
    const newHand = [...bjHandA, newCard];
    setBjDeck(newDeck);
    setBjHandA(newHand);
    const score = calculateBlackjackScore(newHand);
    if (score > 21) {
      // Player Bust! Bot Wins
      setBjTurn('FINISHED');
      setWinnerSide('B');
      setRoomState('MATCH_SETTLED');
      triggerNotification('error');
    }
  };

  const handleBlackjackStand = () => {
    if (bjTurn !== 'A') return;
    setBjStandA(true);
    setBjTurn('B');
  };

  // Bot AI for Blackjack: Hits until 17, then stands
  useEffect(() => {
    if (gameType !== 'blackjack' || roomState !== 'GAME_ACTIVE' || bjTurn !== 'B') return;

    const timer = setTimeout(() => {
      const botScore = calculateBlackjackScore(bjHandB);
      if (botScore < 17) {
        // Hit
        const newDeck = [...bjDeck];
        const newCard = newDeck.pop();
        if (!newCard) return;
        const newHand = [...bjHandB, newCard];
        setBjDeck(newDeck);
        setBjHandB(newHand);
        const newScore = calculateBlackjackScore(newHand);
        if (newScore > 21) {
          // Bot Busts! Player A Wins!
          setBjTurn('FINISHED');
          setWinnerSide('A');
          setRoomState('MATCH_SETTLED');
          triggerNotification('success');
        }
      } else {
        // Stand! Evaluate Winner
        setBjStandB(true);
        setBjTurn('FINISHED');
        const scoreA = calculateBlackjackScore(bjHandA);
        const finalScoreB = botScore;
        if (scoreA > finalScoreB) {
          setWinnerSide('A');
          triggerNotification('success');
        } else if (finalScoreB > scoreA) {
          setWinnerSide('B');
          triggerNotification('error');
        } else {
          // Tie goes to player in training
          setWinnerSide('A');
        }
        setRoomState('MATCH_SETTLED');
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [gameType, roomState, bjTurn, bjHandB, bjDeck, bjHandA]);

  // --- 3. CONNECT 4 STATE & BOT ---
  const [c4Board, setC4Board] = useState<number[][]>(() =>
    Array(6).fill(null).map(() => Array(7).fill(0))
  );
  const [c4Turn, setC4Turn] = useState<'A' | 'B'>('A');

  const resetConnect4 = () => {
    setC4Board(Array(6).fill(null).map(() => Array(7).fill(0)));
    setC4Turn('A');
  };

  const checkConnect4Winner = (b: number[][]): number | null => {
    // Horizontal
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r][c + 1] && p === b[r][c + 2] && p === b[r][c + 3]) return p;
      }
    }
    // Vertical
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r + 1][c] && p === b[r + 2][c] && p === b[r + 3][c]) return p;
      }
    }
    // Diag down-right
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r + 1][c + 1] && p === b[r + 2][c + 2] && p === b[r + 3][c + 3]) return p;
      }
    }
    // Diag up-right
    for (let r = 3; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r - 1][c + 1] && p === b[r - 2][c + 2] && p === b[r - 3][c + 3]) return p;
      }
    }
    return null;
  };

  const dropConnect4Disc = (col: number, playerSide: 'A' | 'B') => {
    if (col < 0 || col > 6) return false;
    const newBoard = c4Board.map((row) => [...row]);
    let placedRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        newBoard[r][col] = playerSide === 'A' ? 1 : 2;
        placedRow = r;
        break;
      }
    }
    if (placedRow === -1) return false; // Column full

    setC4Board(newBoard);
    const win = checkConnect4Winner(newBoard);
    if (win === 1) {
      setWinnerSide('A');
      setRoomState('MATCH_SETTLED');
      triggerNotification('success');
    } else if (win === 2) {
      setWinnerSide('B');
      setRoomState('MATCH_SETTLED');
      triggerNotification('error');
    } else {
      setC4Turn(playerSide === 'A' ? 'B' : 'A');
    }
    return true;
  };

  // Bot AI for Connect 4: Winning move -> Blocking move -> Center column
  useEffect(() => {
    if (gameType !== 'connect4' || roomState !== 'GAME_ACTIVE' || c4Turn !== 'B') return;

    const timer = setTimeout(() => {
      // 1. Check if bot can win immediately
      for (let c = 0; c < 7; c++) {
        const testBoard = c4Board.map((row) => [...row]);
        for (let r = 5; r >= 0; r--) {
          if (testBoard[r][c] === 0) {
            testBoard[r][c] = 2;
            if (checkConnect4Winner(testBoard) === 2) {
              dropConnect4Disc(c, 'B');
              return;
            }
            break;
          }
        }
      }

      // 2. Check if player has immediate win and block it
      for (let c = 0; c < 7; c++) {
        const testBoard = c4Board.map((row) => [...row]);
        for (let r = 5; r >= 0; r--) {
          if (testBoard[r][c] === 0) {
            testBoard[r][c] = 1;
            if (checkConnect4Winner(testBoard) === 1) {
              dropConnect4Disc(c, 'B');
              return;
            }
            break;
          }
        }
      }

      // 3. Fallback: prefer columns [3, 2, 4, 1, 5, 0, 6]
      const preferred = [3, 2, 4, 1, 5, 0, 6];
      for (const col of preferred) {
        if (c4Board[0][col] === 0) {
          dropConnect4Disc(col, 'B');
          return;
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [gameType, roomState, c4Turn, c4Board]);

  // --- 4. CYBER SHOTGUN STATE & BOT ---
  const generateShells = (): Array<'LIVE' | 'BLANK'> =>
    (['LIVE', 'BLANK', 'LIVE', 'BLANK'] as Array<'LIVE' | 'BLANK'>).sort(() => Math.random() - 0.5);

  const [shotgunHpA, setShotgunHpA] = useState(3);
  const [shotgunHpB, setShotgunHpB] = useState(3);
  const [shotgunShells, setShotgunShells] = useState<Array<'LIVE' | 'BLANK'>>(generateShells);
  const [shotgunTurn, setShotgunTurn] = useState<'A' | 'B'>('A');
  const [shotgunSaw, setShotgunSaw] = useState(false);
  const [shotgunItemsA, setShotgunItemsA] = useState<any[]>(['saw', 'ejector']);
  const [shotgunItemsB, setShotgunItemsB] = useState<any[]>(['saw', 'inverter']);
  const [shotgunLastAction, setShotgunLastAction] = useState<any>(undefined);

  const resetShotgun = () => {
    setShotgunHpA(3);
    setShotgunHpB(3);
    setShotgunShells(generateShells());
    setShotgunTurn('A');
    setShotgunSaw(false);
    setShotgunItemsA(['saw', 'ejector']);
    setShotgunItemsB(['saw', 'inverter']);
    setShotgunLastAction(undefined);
  };

  const handleShotgunShoot = (target: 'self' | 'opponent', shooter: 'A' | 'B' = 'A') => {
    if (shotgunShells.length === 0) return;
    const currentShell = shotgunShells[0];
    const rem = shotgunShells.slice(1);
    const dmg = shotgunSaw ? 2 : 1;
    setShotgunSaw(false);

    if (currentShell === 'LIVE') {
      const targetSide = target === 'self' ? shooter : shooter === 'A' ? 'B' : 'A';
      if (targetSide === 'A') {
        const nextHp = Math.max(0, shotgunHpA - dmg);
        setShotgunHpA(nextHp);
        if (nextHp <= 0) {
          setWinnerSide('B');
          setRoomState('MATCH_SETTLED');
          triggerNotification('error');
        }
      } else {
        const nextHp = Math.max(0, shotgunHpB - dmg);
        setShotgunHpB(nextHp);
        if (nextHp <= 0) {
          setWinnerSide('A');
          setRoomState('MATCH_SETTLED');
          triggerNotification('success');
        }
      }

      setShotgunLastAction({
        player: shooter,
        type: 'SHOOT',
        target,
        result: 'BANG',
        damage: dmg,
        message: `${shooter === 'A' ? playerName : botName} spara a ${target === 'self' ? 'se stesso' : 'avversario'}! BANG! -${dmg} HP!`,
      });
      setShotgunTurn(shooter === 'A' ? 'B' : 'A');
    } else {
      // Blank
      setShotgunLastAction({
        player: shooter,
        type: 'SHOOT',
        target,
        result: 'BLANK',
        damage: 0,
        message: `${shooter === 'A' ? playerName : botName} spara a ${target === 'self' ? 'se stesso' : 'avversario'}! CLICK! Bossolo a salve!`,
      });
      if (target === 'self') {
        // Extra turn!
      } else {
        setShotgunTurn(shooter === 'A' ? 'B' : 'A');
      }
    }

    if (rem.length === 0) {
      // Reload magazine
      setShotgunShells(generateShells());
    } else {
      setShotgunShells(rem);
    }
  };

  const handleShotgunUseItem = (item: string) => {
    if (item === 'saw') {
      setShotgunSaw(true);
      setShotgunItemsA((prev) => prev.filter((i) => i !== 'saw'));
      setShotgunLastAction({
        player: 'A',
        type: 'USE_ITEM',
        item: 'saw',
        message: `${playerName} usa la Sega Laser! Danno prossimo colpo raddoppiato a 2 HP!`,
      });
    } else if (item === 'ejector') {
      if (shotgunShells.length > 0) {
        const ejected = shotgunShells[0];
        setShotgunShells(shotgunShells.slice(1));
        setShotgunItemsA((prev) => prev.filter((i) => i !== 'ejector'));
        setShotgunLastAction({
          player: 'A',
          type: 'USE_ITEM',
          item: 'ejector',
          message: `${playerName} espelle un bossolo ${ejected}!`,
        });
      }
    }
  };

  // Bot AI for Cyber Shotgun
  useEffect(() => {
    if (gameType !== 'shotgun' || roomState !== 'GAME_ACTIVE' || shotgunTurn !== 'B') return;

    const timer = setTimeout(() => {
      // Bot chooses action
      const live = shotgunShells.filter((s) => s === 'LIVE').length;
      const blank = shotgunShells.filter((s) => s === 'BLANK').length;

      if (shotgunItemsB.includes('saw') && live >= blank) {
        setShotgunSaw(true);
        setShotgunItemsB((prev) => prev.filter((i) => i !== 'saw'));
      }

      if (live > blank) {
        handleShotgunShoot('opponent', 'B');
      } else {
        handleShotgunShoot('self', 'B');
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameType, roomState, shotgunTurn, shotgunShells, shotgunItemsB]);

  // --- 5. GLASS BRIDGE STATE & BOT ---
  const [bridgeCurrentA, setBridgeCurrentA] = useState(0);
  const [bridgeCurrentB, setBridgeCurrentB] = useState(0);
  const [bridgeSafePath] = useState<Array<'LEFT' | 'RIGHT'>>(() =>
    Array(8).fill(null).map(() => (Math.random() > 0.5 ? 'LEFT' : 'RIGHT'))
  );
  const [bridgeRevealed, setBridgeRevealed] = useState<Record<number, 'LEFT' | 'RIGHT'>>({});
  const [bridgeTurn, setBridgeTurn] = useState<'A' | 'B'>('A');

  const handleBridgeStep = (choice: 'LEFT' | 'RIGHT', stepper: 'A' | 'B' = 'A') => {
    const step = stepper === 'A' ? bridgeCurrentA : bridgeCurrentB;
    const isSafe = bridgeSafePath[step] === choice;

    if (isSafe) {
      setBridgeRevealed((prev) => ({ ...prev, [step]: choice }));
      if (stepper === 'A') {
        const next = step + 1;
        setBridgeCurrentA(next);
        if (next >= 6) {
          setWinnerSide('A');
          setRoomState('MATCH_SETTLED');
          triggerNotification('success');
        }
      } else {
        const next = step + 1;
        setBridgeCurrentB(next);
        if (next >= 6) {
          setWinnerSide('B');
          setRoomState('MATCH_SETTLED');
          triggerNotification('error');
        }
      }
    } else {
      // Shatter! Turn passes
      setBridgeRevealed((prev) => ({ ...prev, [step]: choice === 'LEFT' ? 'RIGHT' : 'LEFT' }));
      setBridgeTurn(stepper === 'A' ? 'B' : 'A');
    }
  };

  useEffect(() => {
    if (gameType !== 'bridge' || roomState !== 'GAME_ACTIVE' || bridgeTurn !== 'B') return;
    const timer = setTimeout(() => {
      const known = bridgeRevealed[bridgeCurrentB];
      const choice = known ? known : Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      handleBridgeStep(choice, 'B');
    }, 1000);
    return () => clearTimeout(timer);
  }, [gameType, roomState, bridgeTurn, bridgeCurrentB, bridgeRevealed]);

  // --- 6. CHRONO BLIND STATE & BOT ---
  const [chronoStart] = useState(() => Date.now());
  const [chronoStoppedA, setChronoStoppedA] = useState(false);
  const [chronoStoppedB, setChronoStoppedB] = useState(false);
  const [chronoDiffA, setChronoDiffA] = useState<number | undefined>();
  const [chronoDiffB, setChronoDiffB] = useState<number | undefined>();

  const handleChronoStop = () => {
    if (chronoStoppedA) return;
    const elapsed = Date.now() - chronoStart;
    const target = 5000;
    const diff = Math.abs(target - elapsed);
    setChronoStoppedA(true);
    setChronoDiffA(diff);

    // Trigger bot stop slightly after
    setTimeout(() => {
      const botDiff = Math.floor(Math.random() * 250) + 40;
      setChronoStoppedB(true);
      setChronoDiffB(botDiff);
      if (diff < botDiff) {
        setWinnerSide('A');
        triggerNotification('success');
      } else {
        setWinnerSide('B');
        triggerNotification('error');
      }
      setRoomState('MATCH_SETTLED');
    }, 700);
  };

  // --- 7. SPLIT OR STEAL STATE & BOT ---
  const [splitPhase, setSplitPhase] = useState<'COUNTDOWN' | 'REVEALED'>('COUNTDOWN');
  const [splitChoiceA, setSplitChoiceA] = useState<'SPLIT' | 'STEAL' | undefined>();
  const [splitChoiceB, setSplitChoiceB] = useState<'SPLIT' | 'STEAL' | undefined>();

  const handleSplitChoice = (choice: 'SPLIT' | 'STEAL') => {
    setSplitChoiceA(choice);
    // Bot decides: 65% split, 35% steal
    const botChoice: 'SPLIT' | 'STEAL' = Math.random() > 0.35 ? 'SPLIT' : 'STEAL';
    setSplitChoiceB(botChoice);
    setSplitPhase('REVEALED');

    if (choice === 'SPLIT' && botChoice === 'SPLIT') {
      setWinnerSide('A'); // Mutual win
      triggerNotification('success');
    } else if (choice === 'STEAL' && botChoice === 'SPLIT') {
      setWinnerSide('A');
      triggerNotification('success');
    } else if (choice === 'SPLIT' && botChoice === 'STEAL') {
      setWinnerSide('B');
      triggerNotification('error');
    } else {
      setWinnerSide(null); // Both steal: tie / lose
    }
    setRoomState('MATCH_SETTLED');
  };

  // --- 8. CUBE COUNT STATE & BOT ---
  const [cubeGrid] = useState(() => [
    [1, 2, 0, 1, 3],
    [0, 1, 2, 1, 0],
    [2, 3, 1, 0, 2],
    [1, 0, 2, 2, 1],
    [0, 1, 1, 2, 0],
  ]);
  const cubeTotal = cubeGrid.flat().reduce((a, b) => a + b, 0);

  const handleCubeSubmit = (ans: number) => {
    if (ans === cubeTotal) {
      setWinnerSide('A');
      triggerNotification('success');
    } else {
      setWinnerSide('B');
      triggerNotification('error');
    }
    setRoomState('MATCH_SETTLED');
  };

  // --- 9. HEAD SOCCER STATE & BOT ---
  const [hsState, setHsState] = useState<any>({
    scoreA: 0,
    scoreB: 0,
    timeRemainingMs: 45000,
    pA: { x: 180, y: 358, vx: 0, vy: 0, superCharge: 0 },
    pB: { x: 620, y: 358, vx: 0, vy: 0, superCharge: 0 },
    ball: { x: 400, y: 200, vx: 0, vy: 0 },
  });

  const handleHeadSoccerInput = useCallback((inp: any) => {
    // Simple simulation update
    setHsState((prev: any) => {
      const pAx = Math.max(100, Math.min(380, prev.pA.x + (inp.left ? -6 : inp.right ? 6 : 0)));
      return {
        ...prev,
        pA: { ...prev.pA, x: pAx },
      };
    });
  }, []);

  // --- 10. POKER STATE & BOT ---
  const [pokerPot, setPokerPot] = useState(100);
  const [pokerCurrentTurn, setPokerCurrentTurn] = useState<'A' | 'B'>('A');

  const handlePokerAction = (action: string) => {
    if (action === 'fold') {
      setWinnerSide('B');
      setRoomState('MATCH_SETTLED');
      triggerNotification('error');
    } else {
      // Bot acts after short delay
      setPokerCurrentTurn('B');
      setTimeout(() => {
        // Bot calls/checks
        setWinnerSide('A');
        setRoomState('MATCH_SETTLED');
        triggerNotification('success');
      }, 900);
    }
  };

  const handleRestartMatch = () => {
    triggerImpact('medium');
    setWinnerSide(null);
    setRoomState('GAME_ACTIVE');
    setMatchCount((c) => c + 1);
    if (gameType === 'roulette') resetRoulette();
    if (gameType === 'blackjack') resetBlackjack();
    if (gameType === 'connect4') resetConnect4();
    if (gameType === 'shotgun') resetShotgun();
  };

  const meta = GAMES_METADATA[gameType] || GAMES_METADATA.roulette;

  return (
    <div className="w-full max-w-md mx-auto space-y-3 font-sans pb-12 select-none animate-in fade-in duration-200">
      {/* Top Banner: VS BOT Indicator & Exit */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            onExit();
          }}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-heading font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.exit') || 'Esci'}</span>
        </button>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-heading font-extrabold uppercase tracking-wider">
          <Bot className="w-3.5 h-3.5" />
          <span>VS CPU • NESSUNA SCOMMESSA</span>
        </div>
      </div>

      {/* Render Active Game Arena */}
      <div className="relative">
        {gameType === 'roulette' && (
          <RussianRouletteArena
            gameData={{
              chambersRemaining: rouletteChambers,
              totalChambers: 8,
              currentTurn: rouletteCurrentTurn,
              offensiveShotsA: rouletteOffensiveA,
              offensiveShotsB: rouletteOffensiveB,
              lethalOddsPercent: Math.round((1 / Math.max(1, rouletteChambers)) * 100),
              lastOutcome: rouletteLastOutcome,
            } as any}
            role="player"
            isPlayerTurn={rouletteCurrentTurn === 'A'}
            onShoot={(target) => handleRouletteShoot(target, 'A')}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            winnerName={winnerSide === 'A' ? playerName : botName}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'blackjack' && (
          <BlackjackArena
            gameData={{
              deckRemaining: bjDeck.length,
              handA: bjHandA,
              handB: bjHandB,
              scoreA: calculateBlackjackScore(bjHandA),
              scoreB: calculateBlackjackScore(bjHandB),
              currentTurn: bjTurn,
              standA: bjStandA,
              standB: bjStandB,
              bustA: calculateBlackjackScore(bjHandA) > 21,
              bustB: calculateBlackjackScore(bjHandB) > 21,
              bustOddsPercentA: 0,
              bustOddsPercentB: 0,
            } as any}
            role="player"
            isPlayerTurn={bjTurn === 'A'}
            onHit={handleBlackjackHit}
            onStand={handleBlackjackStand}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            winnerName={winnerSide === 'A' ? playerName : botName}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'connect4' && (
          <Connect4Arena
            gameData={{
              board: c4Board,
              currentTurn: c4Turn,
              movesCount: 0,
            } as any}
            role="player"
            isPlayerTurn={c4Turn === 'A'}
            onDrop={(col) => dropConnect4Disc(col, 'A')}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'shotgun' && (
          <CyberShotgunArena
            gameData={{
              hpA: shotgunHpA,
              hpB: shotgunHpB,
              maxHp: 3,
              currentTurn: shotgunTurn,
              liveCount: shotgunShells.filter((s) => s === 'LIVE').length,
              blankCount: shotgunShells.filter((s) => s === 'BLANK').length,
              totalShellsRemaining: shotgunShells.length,
              isSawActive: shotgunSaw,
              isHandcuffedA: false,
              isHandcuffedB: false,
              itemsA: shotgunItemsA,
              itemsB: shotgunItemsB,
              lastAction: shotgunLastAction,
              mancheNumber: 1,
            } as any}
            role="player"
            isPlayerTurn={shotgunTurn === 'A'}
            onShoot={(target) => handleShotgunShoot(target, 'A')}
            onUseItem={handleShotgunUseItem}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            winnerName={winnerSide === 'A' ? playerName : botName}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'bridge' && (
          <GlassBridgeArena
            gameData={{
              totalSteps: 6,
              currentStepA: bridgeCurrentA,
              currentStepB: bridgeCurrentB,
              activeStep: Math.max(bridgeCurrentA, bridgeCurrentB),
              currentTurn: bridgeTurn,
              livesA: 1,
              livesB: 1,
              revealedSteps: bridgeRevealed,
            } as any}
            role="player"
            isPlayerTurn={bridgeTurn === 'A'}
            onStep={(c) => handleBridgeStep(c, 'A')}
            onPass={() => {}}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'chrono' && (
          <ChronoBlindArena
            gameData={{
              currentRound: 1,
              maxRounds: 1,
              scoreA: 0,
              scoreB: 0,
              targetDurationMs: 5000,
              blindThresholdMs: 2000,
              startEpochMs: chronoStart,
              stoppedA: chronoStoppedA,
              stoppedB: chronoStoppedB,
              diffMsA: chronoDiffA,
              diffMsB: chronoDiffB,
              bustedA: false,
              bustedB: false,
            } as any}
            role="player"
            isPlayerTurn={true}
            onStop={handleChronoStop}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'split' && (
          <SplitStealArena
            gameData={{
              phase: splitPhase,
              currentRound: 1,
              maxRounds: 1,
              choicesRevealed: splitPhase === 'REVEALED',
              choiceA: splitChoiceA,
              choiceB: splitChoiceB,
              hasChosenA: Boolean(splitChoiceA),
              hasChosenB: Boolean(splitChoiceB),
              jackpotGram: 0,
              jackpotStatus: 'ACTIVE',
            } as any}
            role="player"
            isPlayerTurn={true}
            onChoice={handleSplitChoice}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'cubecount' && (
          <CubeCountArena
            gameData={{
              currentRound: 1,
              phase: 'INPUT',
              hpA: 3,
              hpB: 3,
              maxHp: 3,
              isSuddenDeath: false,
              gridSize: 5,
              grid: cubeGrid,
              flashDurationMs: 1500,
              phaseEndEpochMs: Date.now() + 10000,
              hasAnsweredA: false,
              hasAnsweredB: false,
            } as any}
            role="player"
            onSubmit={handleCubeSubmit}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'headsoccer' && (
          <HeadSoccerArena
            gameData={hsState}
            role="player"
            onInput={handleHeadSoccerInput}
            onSubscribeTick={() => () => {}}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'poker' && (
          <PokerArena
            gameData={{
              phase: 'FLOP',
              pot: pokerPot,
              currentTurn: pokerCurrentTurn === 'A' ? 0 : 1,
              seats: [
                { seatIndex: 0, playerName, chips: 500, currentBet: 50, isFolded: false },
                { seatIndex: 1, playerName: botName, chips: 500, currentBet: 50, isFolded: false },
              ],
              communityCards: [
                { suit: '♠', value: '10', numericValue: 10 },
                { suit: '♥', value: 'J', numericValue: 11 },
                { suit: '♦', value: 'Q', numericValue: 12 },
              ],
            } as any}
            role="player"
            isPlayerTurn={pokerCurrentTurn === 'A'}
            onAction={handlePokerAction}
            playerAName={playerName}
            playerBName={botName}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            winnerName={winnerSide === 'A' ? playerName : botName}
            onReturnToLobby={onExit}
          />
        )}
      </div>

      {/* Settled match action banner */}
      {roomState === 'MATCH_SETTLED' && (
        <div className="fixed bottom-4 left-3 right-3 max-w-md mx-auto z-40 p-4 rounded-3xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {winnerSide === 'A' ? (
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Trophy className="w-5 h-5 animate-bounce" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
                  <Skull className="w-5 h-5" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                  {winnerSide === 'A' ? 'VITTORIA CONTRO IL BOT!' : 'SCONFITTA CONTRO IL BOT!'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Partita di allenamento completata
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={handleRestartMatch}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RIVINCITA SUBITO</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              ESCI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

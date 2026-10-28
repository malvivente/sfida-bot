import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameType, CoinTossData, ShotgunItem } from '../../types/index.js';
import { GAMES_METADATA } from '../../config/gamesConfig.js';
import { ArrowLeft, Bot, RotateCcw, Trophy, Skull, Clock, Swords } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { CoinTossOverlay } from '../CoinTossOverlay.js';

// Arenas for the 7 VS BOT games
import { RussianRouletteArena } from '../games/RussianRouletteArena.js';
import { BlackjackArena } from '../games/BlackjackArena.js';
import { Connect4Arena } from '../games/Connect4Arena.js';
import { CyberShotgunArena } from '../games/CyberShotgunArena.js';
import { GlassBridgeArena } from '../games/GlassBridgeArena.js';
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
  const botName = t('vsbot.cpuOpponent');

  const [roomState, setRoomState] = useState<'READY_CHECK' | 'GAME_ACTIVE' | 'MATCH_SETTLED'>('READY_CHECK');
  const [winnerSide, setWinnerSide] = useState<'A' | 'B' | null>(null);
  const [matchId, setMatchId] = useState<number>(() => Date.now());

  // Starter coin toss
  const [coinToss, setCoinToss] = useState<CoinTossData | null>(null);
  const [showCoinToss, setShowCoinToss] = useState<boolean>(true);

  // Turn clock timer (15 seconds per turn)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(15);

  // ==========================================
  // --- 1. RUSSIAN ROULETTE (ROULETTE ROOM REPLICA) ---
  // ==========================================
  const [rouletteChambers, setRouletteChambers] = useState<number>(8);
  const [rouletteTurn, setRouletteTurn] = useState<'A' | 'B'>('A');
  const [rouletteOffensiveA, setRouletteOffensiveA] = useState<number>(1);
  const [rouletteOffensiveB, setRouletteOffensiveB] = useState<number>(1);
  const [rouletteLastOutcome, setRouletteLastOutcome] = useState<any>(undefined);

  const initRoulette = (starter: 'A' | 'B') => {
    setRouletteChambers(8);
    setRouletteTurn(starter);
    setRouletteOffensiveA(1);
    setRouletteOffensiveB(1);
    setRouletteLastOutcome(undefined);
  };

  const handleRouletteShoot = (target: 'self' | 'opponent', shooter: 'A' | 'B' = 'A') => {
    if (rouletteTurn !== shooter || roomState !== 'GAME_ACTIVE') return;

    // Check offensive shot limits
    if (target === 'opponent') {
      const available = shooter === 'A' ? rouletteOffensiveA : rouletteOffensiveB;
      if (available <= 0) return;
      if (shooter === 'A') setRouletteOffensiveA(0);
      else setRouletteOffensiveB(0);
    }

    // 1-in-chambers chance of live bullet
    const isBullet = Math.floor(Math.random() * rouletteChambers) + 1 === 1;
    const opponent = shooter === 'A' ? 'B' : 'A';
    const shooterDisplayName = shooter === 'A' ? playerName : botName;
    const opponentDisplayName = shooter === 'A' ? botName : playerName;

    if (target === 'self') {
      if (isBullet) {
        // Fatal hit on self! Opponent wins
        setRouletteLastOutcome({
          shooter,
          target,
          result: 'BANG',
          message: `💥 BANG! ${shooterDisplayName} si è sparato con il colpo letale!`,
        });
        setWinnerSide(opponent);
        setRoomState('MATCH_SETTLED');
        if (opponent === 'A') triggerNotification('success');
        else triggerNotification('error');
      } else {
        // Survived blank! Cylinder advances, turn passes to opponent
        setRouletteChambers((c) => Math.max(1, c - 1));
        setRouletteTurn(opponent);
        setTurnTimeLeft(15);
        setRouletteLastOutcome({
          shooter,
          target,
          result: 'BLANK',
          message: `🔒 CLICK! ${shooterDisplayName} si è sparato... Camera vuota!`,
        });
      }
    } else {
      // Shoot opponent
      if (isBullet) {
        // Fatal hit on opponent! Shooter wins
        setRouletteLastOutcome({
          shooter,
          target,
          result: 'BANG',
          message: `💥 BANG! ${shooterDisplayName} ha colpito ${opponentDisplayName} con il colpo letale!`,
        });
        setWinnerSide(shooter);
        setRoomState('MATCH_SETTLED');
        if (shooter === 'A') triggerNotification('success');
        else triggerNotification('error');
      } else {
        // Blank on opponent! Turn passes
        setRouletteChambers((c) => Math.max(1, c - 1));
        setRouletteTurn(opponent);
        setTurnTimeLeft(15);
        setRouletteLastOutcome({
          shooter,
          target,
          result: 'BLANK',
          message: `💨 CLICK! ${shooterDisplayName} ha sparato a ${opponentDisplayName}... A vuoto!`,
        });
      }
    }
  };

  // Bot AI for Russian Roulette
  useEffect(() => {
    if (gameType !== 'roulette' || roomState !== 'GAME_ACTIVE' || rouletteTurn !== 'B') return;

    const timer = setTimeout(() => {
      // If chambers > 3 and has offensive shot, 60% chance to shoot self for safety; otherwise shoot opponent
      const choice: 'self' | 'opponent' =
        rouletteOffensiveB > 0 && (rouletteChambers <= 3 || Math.random() > 0.4)
          ? 'opponent'
          : 'self';
      handleRouletteShoot(choice, 'B');
    }, 1400);

    return () => clearTimeout(timer);
  }, [gameType, roomState, rouletteTurn, rouletteChambers, rouletteOffensiveB]);

  // ==========================================
  // --- 2. BLACKJACK (FACE-UP ROOM REPLICA) ---
  // ==========================================
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

  const initBlackjack = (starter: 'A' | 'B') => {
    const d = createDeck();
    const cA = d.pop()!;
    const cB = d.pop()!;
    setBjDeck(d);
    setBjHandA([cA]);
    setBjHandB([cB]);
    setBjTurn(starter);
    setBjStandA(false);
    setBjStandB(false);
  };

  const handleBlackjackHit = (player: 'A' | 'B' = 'A') => {
    if (bjTurn !== player || (player === 'A' && bjStandA) || (player === 'B' && bjStandB)) return;
    const newDeck = [...bjDeck];
    const newCard = newDeck.pop();
    if (!newCard) return;

    if (player === 'A') {
      const newHand = [...bjHandA, newCard];
      setBjDeck(newDeck);
      setBjHandA(newHand);
      const score = calculateBlackjackScore(newHand);
      if (score > 21) {
        // Player busts! Bot wins
        setBjTurn('FINISHED');
        setWinnerSide('B');
        setRoomState('MATCH_SETTLED');
        triggerNotification('error');
      } else {
        setTurnTimeLeft(15);
      }
    } else {
      const newHand = [...bjHandB, newCard];
      setBjDeck(newDeck);
      setBjHandB(newHand);
      const score = calculateBlackjackScore(newHand);
      if (score > 21) {
        // Bot busts! Player wins
        setBjTurn('FINISHED');
        setWinnerSide('A');
        setRoomState('MATCH_SETTLED');
        triggerNotification('success');
      } else {
        setTurnTimeLeft(15);
      }
    }
  };

  const handleBlackjackStand = (player: 'A' | 'B' = 'A') => {
    if (bjTurn !== player) return;
    if (player === 'A') {
      setBjStandA(true);
      if (bjStandB) {
        // Both stand: evaluate winner
        evaluateBlackjackWinner(calculateBlackjackScore(bjHandA), calculateBlackjackScore(bjHandB));
      } else {
        setBjTurn('B');
        setTurnTimeLeft(15);
      }
    } else {
      setBjStandB(true);
      if (bjStandA) {
        evaluateBlackjackWinner(calculateBlackjackScore(bjHandA), calculateBlackjackScore(bjHandB));
      } else {
        setBjTurn('A');
        setTurnTimeLeft(15);
      }
    }
  };

  const evaluateBlackjackWinner = (scoreA: number, scoreB: number) => {
    setBjTurn('FINISHED');
    if (scoreA > scoreB) {
      setWinnerSide('A');
      triggerNotification('success');
    } else if (scoreB > scoreA) {
      setWinnerSide('B');
      triggerNotification('error');
    } else {
      setWinnerSide('A'); // Push goes to player in practice
    }
    setRoomState('MATCH_SETTLED');
  };

  // Bot AI for Blackjack: Dealer standard (hits < 17, stands >= 17)
  useEffect(() => {
    if (gameType !== 'blackjack' || roomState !== 'GAME_ACTIVE' || bjTurn !== 'B') return;

    const timer = setTimeout(() => {
      const botScore = calculateBlackjackScore(bjHandB);
      if (botScore < 17) {
        handleBlackjackHit('B');
      } else {
        handleBlackjackStand('B');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameType, roomState, bjTurn, bjHandB, bjDeck, bjStandA]);

  // ==========================================
  // --- 3. CONNECT 4 (CONNECT4 ROOM REPLICA) ---
  // ==========================================
  const [c4Board, setC4Board] = useState<number[][]>(() =>
    Array(6).fill(null).map(() => Array(7).fill(0))
  );
  const [c4Turn, setC4Turn] = useState<'A' | 'B'>('A');

  const initConnect4 = (starter: 'A' | 'B') => {
    setC4Board(Array(6).fill(null).map(() => Array(7).fill(0)));
    setC4Turn(starter);
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
    if (col < 0 || col > 6 || c4Turn !== playerSide) return false;
    const newBoard = c4Board.map((row) => [...row]);
    let placedRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        newBoard[r][col] = playerSide === 'A' ? 1 : 2;
        placedRow = r;
        break;
      }
    }
    if (placedRow === -1) return false; // Full column

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
      setTurnTimeLeft(15);
    }
    return true;
  };

  // Bot AI for Connect 4: Win check -> Block check -> Center columns
  useEffect(() => {
    if (gameType !== 'connect4' || roomState !== 'GAME_ACTIVE' || c4Turn !== 'B') return;

    const timer = setTimeout(() => {
      // 1. Check immediate win
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

      // 2. Block player immediate win
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

      // 3. Fallback center columns
      const preferred = [3, 2, 4, 1, 5, 0, 6];
      for (const col of preferred) {
        if (c4Board[0][col] === 0) {
          dropConnect4Disc(col, 'B');
          return;
        }
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameType, roomState, c4Turn, c4Board]);

  // ==========================================
  // --- 4. CYBER SHOTGUN (BUCKSHOT ROOM REPLICA) ---
  // ==========================================
  const generateShells = (): Array<'LIVE' | 'BLANK'> =>
    (['LIVE', 'BLANK', 'LIVE', 'BLANK'] as Array<'LIVE' | 'BLANK'>).sort(() => Math.random() - 0.5);

  const [shotgunHpA, setShotgunHpA] = useState<number>(3);
  const [shotgunHpB, setShotgunHpB] = useState<number>(3);
  const [shotgunShells, setShotgunShells] = useState<Array<'LIVE' | 'BLANK'>>(generateShells);
  const [shotgunTurn, setShotgunTurn] = useState<'A' | 'B'>('A');
  const [shotgunSaw, setShotgunSaw] = useState<boolean>(false);
  const [shotgunHandcuffedA, setShotgunHandcuffedA] = useState<boolean>(false);
  const [shotgunHandcuffedB, setShotgunHandcuffedB] = useState<boolean>(false);
  const [shotgunItemsA, setShotgunItemsA] = useState<ShotgunItem[]>(['saw', 'ejector']);
  const [shotgunItemsB, setShotgunItemsB] = useState<ShotgunItem[]>(['saw', 'inverter']);
  const [shotgunLastAction, setShotgunLastAction] = useState<any>(undefined);

  const initShotgun = (starter: 'A' | 'B') => {
    setShotgunHpA(3);
    setShotgunHpB(3);
    setShotgunShells(generateShells());
    setShotgunTurn(starter);
    setShotgunSaw(false);
    setShotgunHandcuffedA(false);
    setShotgunHandcuffedB(false);
    setShotgunItemsA(['saw', 'ejector']);
    setShotgunItemsB(['saw', 'inverter']);
    setShotgunLastAction(undefined);
  };

  const handleShotgunShoot = (target: 'self' | 'opponent', shooter: 'A' | 'B' = 'A') => {
    if (shotgunShells.length === 0 || shotgunTurn !== shooter) return;

    const currentShell = shotgunShells[0];
    const rem = shotgunShells.slice(1);
    const dmg = shotgunSaw ? 2 : 1;
    setShotgunSaw(false);

    const opponent = shooter === 'A' ? 'B' : 'A';
    const isHandcuffed = opponent === 'A' ? shotgunHandcuffedA : shotgunHandcuffedB;

    if (currentShell === 'LIVE') {
      const targetSide = target === 'self' ? shooter : opponent;
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

      // Turn passes to opponent (unless handcuffed)
      if (isHandcuffed) {
        if (opponent === 'A') setShotgunHandcuffedA(false);
        else setShotgunHandcuffedB(false);
      } else {
        setShotgunTurn(opponent);
      }
      setTurnTimeLeft(15);
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
        if (isHandcuffed) {
          if (opponent === 'A') setShotgunHandcuffedA(false);
          else setShotgunHandcuffedB(false);
        } else {
          setShotgunTurn(opponent);
        }
      }
      setTurnTimeLeft(15);
    }

    if (rem.length === 0) {
      setShotgunShells(generateShells());
    } else {
      setShotgunShells(rem);
    }
  };

  const handleShotgunUseItem = (item: ShotgunItem, user: 'A' | 'B' = 'A') => {
    if (shotgunTurn !== user) return;
    if (item === 'saw') {
      setShotgunSaw(true);
      if (user === 'A') setShotgunItemsA((p) => p.filter((i) => i !== 'saw'));
      else setShotgunItemsB((p) => p.filter((i) => i !== 'saw'));
      setShotgunLastAction({
        player: user,
        type: 'USE_ITEM',
        item: 'saw',
        message: `${user === 'A' ? playerName : botName} usa la Sega Laser! Danno raddoppiato!`,
      });
    } else if (item === 'ejector') {
      if (shotgunShells.length > 0) {
        const ejected = shotgunShells[0];
        setShotgunShells(shotgunShells.slice(1));
        if (user === 'A') setShotgunItemsA((p) => p.filter((i) => i !== 'ejector'));
        else setShotgunItemsB((p) => p.filter((i) => i !== 'ejector'));
        setShotgunLastAction({
          player: user,
          type: 'USE_ITEM',
          item: 'ejector',
          message: `${user === 'A' ? playerName : botName} espelle un bossolo ${ejected}!`,
        });
      }
    } else if (item === 'handcuffs') {
      if (user === 'A') {
        setShotgunHandcuffedB(true);
        setShotgunItemsA((p) => p.filter((i) => i !== 'handcuffs'));
      } else {
        setShotgunHandcuffedA(true);
        setShotgunItemsB((p) => p.filter((i) => i !== 'handcuffs'));
      }
    } else if (item === 'inverter') {
      if (shotgunShells.length > 0) {
        const current = shotgunShells[0];
        const inverted = current === 'LIVE' ? 'BLANK' : 'LIVE';
        setShotgunShells([inverted, ...shotgunShells.slice(1)]);
        if (user === 'A') setShotgunItemsA((p) => p.filter((i) => i !== 'inverter'));
        else setShotgunItemsB((p) => p.filter((i) => i !== 'inverter'));
      }
    }
  };

  // Bot AI for Cyber Shotgun
  useEffect(() => {
    if (gameType !== 'shotgun' || roomState !== 'GAME_ACTIVE' || shotgunTurn !== 'B') return;

    const timer = setTimeout(() => {
      const live = shotgunShells.filter((s) => s === 'LIVE').length;
      const blank = shotgunShells.filter((s) => s === 'BLANK').length;

      if (shotgunItemsB.includes('saw') && live >= blank) {
        handleShotgunUseItem('saw', 'B');
      }

      if (live > blank) {
        handleShotgunShoot('opponent', 'B');
      } else {
        handleShotgunShoot('self', 'B');
      }
    }, 1300);

    return () => clearTimeout(timer);
  }, [gameType, roomState, shotgunTurn, shotgunShells, shotgunItemsB]);

  // ==========================================
  // --- 5. GLASS BRIDGE (BRIDGE ROOM REPLICA) ---
  // ==========================================
  const [bridgeCurrentA, setBridgeCurrentA] = useState<number>(0);
  const [bridgeCurrentB, setBridgeCurrentB] = useState<number>(0);
  const [bridgeSafePath, setBridgeSafePath] = useState<Array<'LEFT' | 'RIGHT'>>(() =>
    Array(8).fill(null).map(() => (Math.random() > 0.5 ? 'LEFT' : 'RIGHT'))
  );
  const [bridgeRevealed, setBridgeRevealed] = useState<Record<number, 'LEFT' | 'RIGHT'>>({});
  const [bridgeTurn, setBridgeTurn] = useState<'A' | 'B'>('A');

  const initBridge = (starter: 'A' | 'B') => {
    setBridgeCurrentA(0);
    setBridgeCurrentB(0);
    setBridgeSafePath(Array(8).fill(null).map(() => (Math.random() > 0.5 ? 'LEFT' : 'RIGHT')));
    setBridgeRevealed({});
    setBridgeTurn(starter);
  };

  const handleBridgeStep = (choice: 'LEFT' | 'RIGHT', stepper: 'A' | 'B' = 'A') => {
    if (bridgeTurn !== stepper) return;
    const step = stepper === 'A' ? bridgeCurrentA : bridgeCurrentB;
    const isSafe = bridgeSafePath[step] === choice;

    if (isSafe) {
      setBridgeRevealed((p) => ({ ...p, [step]: choice }));
      const next = step + 1;
      if (stepper === 'A') {
        setBridgeCurrentA(next);
        if (next >= 6) {
          setWinnerSide('A');
          setRoomState('MATCH_SETTLED');
          triggerNotification('success');
        }
      } else {
        setBridgeCurrentB(next);
        if (next >= 6) {
          setWinnerSide('B');
          setRoomState('MATCH_SETTLED');
          triggerNotification('error');
        }
      }
      setTurnTimeLeft(15);
    } else {
      // Shatters! Turn passes to opponent
      setBridgeRevealed((p) => ({ ...p, [step]: choice === 'LEFT' ? 'RIGHT' : 'LEFT' }));
      setBridgeTurn(stepper === 'A' ? 'B' : 'A');
      setTurnTimeLeft(15);
    }
  };

  useEffect(() => {
    if (gameType !== 'bridge' || roomState !== 'GAME_ACTIVE' || bridgeTurn !== 'B') return;
    const timer = setTimeout(() => {
      const known = bridgeRevealed[bridgeCurrentB];
      const choice = known ? known : Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      handleBridgeStep(choice, 'B');
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameType, roomState, bridgeTurn, bridgeCurrentB, bridgeRevealed]);

  // ==========================================
  // --- 6. HEAD SOCCER (SOCCER ROOM REPLICA) ---
  // ==========================================
  const [hsState, setHsState] = useState<any>({
    scoreA: 0,
    scoreB: 0,
    timeRemainingMs: 45000,
    pA: { x: 180, y: 358, vx: 0, vy: 0, superCharge: 0 },
    pB: { x: 620, y: 358, vx: 0, vy: 0, superCharge: 0 },
    ball: { x: 400, y: 200, vx: 0, vy: 0 },
  });

  const handleHeadSoccerInput = useCallback((inp: any) => {
    setHsState((prev: any) => {
      const pAx = Math.max(100, Math.min(380, prev.pA.x + (inp.left ? -6 : inp.right ? 6 : 0)));
      return {
        ...prev,
        pA: { ...prev.pA, x: pAx },
      };
    });
  }, []);

  // ==========================================
  // --- 7. POKER (POKER ROOM REPLICA) ---
  // ==========================================
  const [pokerPot] = useState(100);
  const [pokerTurn, setPokerTurn] = useState<'A' | 'B'>('A');

  const handlePokerAction = (action: string) => {
    if (action === 'fold') {
      setWinnerSide('B');
      setRoomState('MATCH_SETTLED');
      triggerNotification('error');
    } else {
      setPokerTurn('B');
      setTimeout(() => {
        setWinnerSide('A');
        setRoomState('MATCH_SETTLED');
        triggerNotification('success');
      }, 1100);
    }
  };

  // --- Initial Start & Coin Toss Orchestration ---
  const startNewMatch = useCallback(() => {
    const starter: 'A' | 'B' = Math.random() > 0.5 ? 'A' : 'B';
    const starterDisplayName = starter === 'A' ? playerName : botName;

    const tossData: CoinTossData = {
      playerASide: 'HEADS',
      playerBSide: 'TAILS',
      winningFace: starter === 'A' ? 'HEADS' : 'TAILS',
      starterSide: starter,
      starterName: starterDisplayName,
      timestamp: Date.now(),
    };

    setCoinToss(tossData);
    setShowCoinToss(true);
    setWinnerSide(null);
    setRoomState('READY_CHECK');
    setTurnTimeLeft(15);
    setMatchId(Date.now());

    if (gameType === 'roulette') initRoulette(starter);
    if (gameType === 'blackjack') initBlackjack(starter);
    if (gameType === 'connect4') initConnect4(starter);
    if (gameType === 'shotgun') initShotgun(starter);
    if (gameType === 'bridge') initBridge(starter);
  }, [gameType, playerName, botName]);

  useEffect(() => {
    startNewMatch();
  }, [startNewMatch]);

  // Turn Clock Timer Ticking
  useEffect(() => {
    if (roomState !== 'GAME_ACTIVE') return;
    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          return 15; // Reset or auto-action
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [roomState]);

  // Handle Coin Toss Completed
  const handleCoinTossComplete = () => {
    setShowCoinToss(false);
    setRoomState('GAME_ACTIVE');
  };

  const meta = GAMES_METADATA[gameType] || GAMES_METADATA.roulette;

  return (
    <div className="w-full max-w-md mx-auto space-y-3 font-sans pb-12 select-none animate-in fade-in duration-200 relative">
      {/* Coin Toss Overlay on Start */}
      {showCoinToss && coinToss && (
        <CoinTossOverlay
          coinToss={coinToss}
          playerAName={playerName}
          playerBName={botName}
          userSide="A"
          role="player"
          onComplete={handleCoinTossComplete}
        />
      )}

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
          <span>{t('common.exit')}</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-heading font-extrabold uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5" />
            <span>{t('vsbot.noWagerTag')}</span>
          </div>
        </div>
      </div>

      {/* Active Turn Clock Indicator */}
      {roomState === 'GAME_ACTIVE' && (
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#141724] border border-white/10 text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                (gameType === 'roulette' && rouletteTurn === 'A') ||
                (gameType === 'blackjack' && bjTurn === 'A') ||
                (gameType === 'connect4' && c4Turn === 'A') ||
                (gameType === 'shotgun' && shotgunTurn === 'A') ||
                (gameType === 'bridge' && bridgeTurn === 'A')
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-heading font-bold text-white uppercase">
              {((gameType === 'roulette' && rouletteTurn === 'A') ||
                (gameType === 'blackjack' && bjTurn === 'A') ||
                (gameType === 'connect4' && c4Turn === 'A') ||
                (gameType === 'shotgun' && shotgunTurn === 'A') ||
                (gameType === 'bridge' && bridgeTurn === 'A'))
                ? 'TUO TURNO'
                : t('vsbot.cpuThinking')}
            </span>
          </div>

          <div className="flex items-center space-x-1 text-slate-300 font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{turnTimeLeft}s</span>
          </div>
        </div>
      )}

      {/* Render Active Game Arena */}
      <div className="relative">
        {gameType === 'roulette' && (
          <RussianRouletteArena
            gameData={{
              chambersRemaining: rouletteChambers,
              totalChambers: 8,
              currentTurn: rouletteTurn,
              offensiveShotsA: rouletteOffensiveA,
              offensiveShotsB: rouletteOffensiveB,
              lethalOddsPercent: Math.round((1 / Math.max(1, rouletteChambers)) * 100),
              lastOutcome: rouletteLastOutcome,
              coinToss: coinToss || undefined,
            } as any}
            role="player"
            isPlayerTurn={rouletteTurn === 'A'}
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
              coinToss: coinToss || undefined,
            } as any}
            role="player"
            isPlayerTurn={bjTurn === 'A'}
            onHit={() => handleBlackjackHit('A')}
            onStand={() => handleBlackjackStand('A')}
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
              coinToss: coinToss || undefined,
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
              isHandcuffedA: shotgunHandcuffedA,
              isHandcuffedB: shotgunHandcuffedB,
              itemsA: shotgunItemsA,
              itemsB: shotgunItemsB,
              lastAction: shotgunLastAction,
              mancheNumber: 1,
              coinToss: coinToss || undefined,
            } as any}
            role="player"
            isPlayerTurn={shotgunTurn === 'A'}
            onShoot={(target) => handleShotgunShoot(target, 'A')}
            onUseItem={(item) => handleShotgunUseItem(item, 'A')}
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
              coinToss: coinToss || undefined,
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
              currentTurn: pokerTurn === 'A' ? 0 : 1,
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
            isPlayerTurn={pokerTurn === 'A'}
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

      {/* Centered Match Settled Result Modal (100% visible on all viewports, never cut off) */}
      {roomState === 'MATCH_SETTLED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-xs rounded-3xl bg-[#141724] border border-white/20 p-5 shadow-2xl text-center space-y-4">
            <div className="flex flex-col items-center">
              {winnerSide === 'A' ? (
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-2">
                  <Trophy className="w-7 h-7 animate-bounce" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 mb-2">
                  <Skull className="w-7 h-7" />
                </div>
              )}
              <h4 className="text-base font-heading font-black text-white uppercase tracking-wider">
                {winnerSide === 'A' ? t('vsbot.victory') : t('vsbot.defeat')}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {meta.title} • {t('vsbot.noWagerTag')}
              </p>
            </div>

            <div className="flex flex-col space-y-2 pt-1">
              <button
                type="button"
                onClick={startNewMatch}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('vsbot.rematch')}</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                {t('common.exit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

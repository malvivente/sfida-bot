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
import { BoxingArena } from '../games/BoxingArena.js';

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

  const calculateBustOdds = (score: number, deck: any[]) => {
    if (score <= 11) return 0;
    if (score >= 21) return 100;
    const diff = 21 - score;
    let bustingCards = 0;
    for (const card of deck) {
      const val = card.value === 'A' ? 1 : card.numericValue;
      if (val > diff) bustingCards++;
    }
    return deck.length > 0 ? Math.round((bustingCards / deck.length) * 100) : 0;
  };

  const [bjDeck, setBjDeck] = useState<any[]>(createDeck);
  const [bjHandA, setBjHandA] = useState<any[]>([]);
  const [bjHandB, setBjHandB] = useState<any[]>([]);
  const [bjTurn, setBjTurn] = useState<'A' | 'B' | 'FINISHED'>('A');
  const [bjStandA, setBjStandA] = useState(false);
  const [bjStandB, setBjStandB] = useState(false);
  const [bjBustA, setBjBustA] = useState(false);
  const [bjBustB, setBjBustB] = useState(false);
  const [bjLastAction, setBjLastAction] = useState<{
    player: 'A' | 'B';
    action: 'HIT' | 'STAND';
    cardDrawn?: any;
    message: string;
  } | undefined>(undefined);

  const initBlackjack = (starter: 'A' | 'B') => {
    const d = createDeck();
    const cA1 = d.pop()!;
    const cB1 = d.pop()!;
    const handA = [cA1];
    const handB = [cB1];
    setBjDeck(d);
    setBjHandA(handA);
    setBjHandB(handB);
    setBjStandA(false);
    setBjStandB(false);
    setBjBustA(false);
    setBjBustB(false);
    setBjTurn(starter);
    setTurnTimeLeft(15);

    const firstPlayerName = starter === 'A' ? playerName : botName;
    const initialScoreA = calculateBlackjackScore(handA);
    const initialScoreB = calculateBlackjackScore(handB);

    if (initialScoreA === 21 && initialScoreB === 21) {
      setBjStandA(true);
      setBjStandB(true);
      setBjTurn('FINISHED');
      setBjLastAction({
        player: 'A',
        action: 'STAND',
        message: '🔥 Entrambi hanno servito 21 alla distribuzione! Parità assoluta!',
      });
      setTimeout(() => evaluateBlackjackWinner(initialScoreA, initialScoreB), 1000);
    } else if (initialScoreA === 21) {
      setBjStandA(true);
      setBjTurn('B');
      setBjLastAction({
        player: 'A',
        action: 'STAND',
        message: `🔥 ${playerName} ha servito 21! Turno a ${botName}!`,
      });
    } else if (initialScoreB === 21) {
      setBjStandB(true);
      setBjTurn('A');
      setBjLastAction({
        player: 'B',
        action: 'STAND',
        message: `🔥 ${botName} ha servito 21! Turno a ${playerName}!`,
      });
    } else {
      setBjLastAction({
        player: starter,
        action: 'STAND',
        message: `🪙 Coin Toss: ${firstPlayerName} gioca per primo!`,
      });
    }
  };

  const handleBlackjackHit = (player: 'A' | 'B' = 'A') => {
    if (bjTurn !== player) return;
    const isPlayerA = player === 'A';
    if (isPlayerA && (bjStandA || bjBustA)) return;
    if (!isPlayerA && (bjStandB || bjBustB)) return;

    const newDeck = [...bjDeck];
    const drawn = newDeck.pop();
    if (!drawn) return;

    const currentHand = isPlayerA ? [...bjHandA, drawn] : [...bjHandB, drawn];
    const newScore = calculateBlackjackScore(currentHand);
    const actingName = isPlayerA ? playerName : botName;
    const opponentName = isPlayerA ? botName : playerName;
    const opponentStand = isPlayerA ? bjStandB : bjStandA;
    const opponentBust = isPlayerA ? bjBustB : bjBustA;
    const opponentSide: 'A' | 'B' = isPlayerA ? 'B' : 'A';

    setBjDeck(newDeck);
    if (isPlayerA) {
      setBjHandA(currentHand);
      triggerImpact('light');
    } else {
      setBjHandB(currentHand);
    }

    if (newScore > 21) {
      if (isPlayerA) {
        setBjBustA(true);
        setBjStandA(true);
      } else {
        setBjBustB(true);
        setBjStandB(true);
      }

      if (opponentStand || opponentBust) {
        setBjTurn('FINISHED');
        setBjLastAction({
          player,
          action: 'HIT',
          cardDrawn: drawn,
          message: `💥 ${actingName} ha pescato ${drawn.value}${drawn.suit} e SBALLATO con ${newScore}! Showdown!`,
        });
        const finalScoreA = isPlayerA ? newScore : calculateBlackjackScore(bjHandA);
        const finalScoreB = isPlayerA ? calculateBlackjackScore(bjHandB) : newScore;
        setTimeout(() => evaluateBlackjackWinner(finalScoreA, finalScoreB), 1200);
      } else {
        setBjTurn(opponentSide);
        setTurnTimeLeft(15);
        setBjLastAction({
          player,
          action: 'HIT',
          cardDrawn: drawn,
          message: `💥 ${actingName} ha pescato ${drawn.value}${drawn.suit} e SBALLATO con ${newScore}! Turno passa a ${opponentName}.`,
        });
      }
    } else if (newScore === 21) {
      if (isPlayerA) {
        setBjStandA(true);
      } else {
        setBjStandB(true);
      }

      if (opponentStand || opponentBust) {
        setBjTurn('FINISHED');
        setBjLastAction({
          player,
          action: 'STAND',
          cardDrawn: drawn,
          message: `🔥 ${actingName} ha pescato ${drawn.value}${drawn.suit} e raggiunto 21! Showdown!`,
        });
        const finalScoreA = isPlayerA ? newScore : calculateBlackjackScore(bjHandA);
        const finalScoreB = isPlayerA ? calculateBlackjackScore(bjHandB) : newScore;
        setTimeout(() => evaluateBlackjackWinner(finalScoreA, finalScoreB), 1200);
      } else {
        setBjTurn(opponentSide);
        setTurnTimeLeft(15);
        setBjLastAction({
          player,
          action: 'STAND',
          cardDrawn: drawn,
          message: `🔥 ${actingName} ha pescato ${drawn.value}${drawn.suit} e raggiunto 21! Turno passa a ${opponentName}!`,
        });
      }
    } else {
      // Score < 21: Alternate turns if opponent hasn't finished
      if (opponentStand || opponentBust) {
        setBjTurn(player);
        setTurnTimeLeft(15);
        setBjLastAction({
          player,
          action: 'HIT',
          cardDrawn: drawn,
          message: `🃏 ${actingName} ha pescato ${drawn.value}${drawn.suit} (Totale: ${newScore}). ${opponentName} ha concluso: Carta o Stai?`,
        });
      } else {
        setBjTurn(opponentSide);
        setTurnTimeLeft(15);
        setBjLastAction({
          player,
          action: 'HIT',
          cardDrawn: drawn,
          message: `🃏 ${actingName} ha pescato ${drawn.value}${drawn.suit} (Totale: ${newScore}). Turno passa a ${opponentName}!`,
        });
      }
    }
  };

  const handleBlackjackStand = (player: 'A' | 'B' = 'A') => {
    if (bjTurn !== player) return;
    const isPlayerA = player === 'A';
    const actingName = isPlayerA ? playerName : botName;
    const opponentName = isPlayerA ? botName : playerName;
    const opponentStand = isPlayerA ? bjStandB : bjStandA;
    const opponentBust = isPlayerA ? bjBustB : bjBustA;
    const opponentSide: 'A' | 'B' = isPlayerA ? 'B' : 'A';
    const myScore = isPlayerA ? calculateBlackjackScore(bjHandA) : calculateBlackjackScore(bjHandB);

    if (isPlayerA) {
      setBjStandA(true);
      triggerImpact('medium');
    } else {
      setBjStandB(true);
    }

    if (opponentStand || opponentBust) {
      setBjTurn('FINISHED');
      setBjLastAction({
        player,
        action: 'STAND',
        message: `🛑 ${actingName} sta su ${myScore}. Entrambi hanno concluso, resa dei conti!`,
      });
      const finalScoreA = calculateBlackjackScore(bjHandA);
      const finalScoreB = calculateBlackjackScore(bjHandB);
      setTimeout(() => evaluateBlackjackWinner(finalScoreA, finalScoreB), 1200);
    } else {
      setBjTurn(opponentSide);
      setTurnTimeLeft(15);
      setBjLastAction({
        player,
        action: 'STAND',
        message: `🛑 ${actingName} sta su ${myScore}. Turno passa a ${opponentName}!`,
      });
    }
  };

  const evaluateBlackjackWinner = (scoreA: number, scoreB: number) => {
    setBjTurn('FINISHED');
    const bustA = scoreA > 21;
    const bustB = scoreB > 21;

    let winner: 'A' | 'B' = 'A';
    if (bustA && !bustB) {
      winner = 'B';
    } else if (bustB && !bustA) {
      winner = 'A';
    } else if (bustA && bustB) {
      winner = scoreA <= scoreB ? 'A' : 'B';
    } else if (scoreA > scoreB) {
      winner = 'A';
    } else if (scoreB > scoreA) {
      winner = 'B';
    } else {
      winner = 'A';
    }

    setWinnerSide(winner);
    if (winner === 'A') {
      triggerNotification('success');
    } else {
      triggerNotification('error');
    }
    setRoomState('MATCH_SETTLED');
  };

  // Bot AI for Blackjack (Turn-based matching PvP)
  useEffect(() => {
    if (gameType !== 'blackjack' || roomState !== 'GAME_ACTIVE' || bjTurn !== 'B') return;

    const timer = setTimeout(() => {
      const bScore = calculateBlackjackScore(bjHandB);
      const aScore = calculateBlackjackScore(bjHandA);
      const isPlayerFinished = bjStandA || bjBustA;

      if (bjBustA && bScore <= 21) {
        handleBlackjackStand('B');
        return;
      }

      if (isPlayerFinished && bScore > aScore && bScore <= 21) {
        handleBlackjackStand('B');
        return;
      }

      if (bScore >= 17) {
        handleBlackjackStand('B');
      } else {
        handleBlackjackHit('B');
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameType, roomState, bjTurn, bjHandA, bjHandB, bjDeck, bjStandA, bjBustA]);

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

  const [shotgunHpA, setShotgunHpA] = useState<number>(5);
  const [shotgunHpB, setShotgunHpB] = useState<number>(5);
  const [shotgunShells, setShotgunShells] = useState<Array<'LIVE' | 'BLANK'>>(generateShells);
  const [shotgunTurn, setShotgunTurn] = useState<'A' | 'B'>('A');
  const [shotgunSaw, setShotgunSaw] = useState<boolean>(false);
  const [shotgunHandcuffedA, setShotgunHandcuffedA] = useState<boolean>(false);
  const [shotgunHandcuffedB, setShotgunHandcuffedB] = useState<boolean>(false);
  const [shotgunItemsA, setShotgunItemsA] = useState<ShotgunItem[]>(['saw', 'ejector']);
  const [shotgunItemsB, setShotgunItemsB] = useState<ShotgunItem[]>(['saw', 'inverter']);
  const [shotgunLastAction, setShotgunLastAction] = useState<any>(undefined);

  const initShotgun = (starter: 'A' | 'B') => {
    setShotgunHpA(5);
    setShotgunHpB(5);
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
  const [bridgeLivesA, setBridgeLivesA] = useState<number>(3);
  const [bridgeLivesB, setBridgeLivesB] = useState<number>(3);
  const [bridgeSafePath, setBridgeSafePath] = useState<Array<'LEFT' | 'RIGHT'>>(() =>
    Array(12).fill(null).map(() => (Math.random() > 0.5 ? 'LEFT' : 'RIGHT'))
  );
  const [bridgeRevealed, setBridgeRevealed] = useState<Record<number, 'LEFT' | 'RIGHT'>>({});
  const [bridgeTurn, setBridgeTurn] = useState<'A' | 'B'>('A');

  const initBridge = (starter: 'A' | 'B') => {
    setBridgeCurrentA(0);
    setBridgeCurrentB(0);
    setBridgeLivesA(3);
    setBridgeLivesB(3);
    setBridgeSafePath(Array(12).fill(null).map(() => (Math.random() > 0.5 ? 'LEFT' : 'RIGHT')));
    setBridgeRevealed({});
    setBridgeTurn(starter);
  };

  const handleBridgeStep = (choice: 'LEFT' | 'RIGHT', stepper: 'A' | 'B' = 'A') => {
    if (bridgeTurn !== stepper || roomState !== 'GAME_ACTIVE') return;
    const step = stepper === 'A' ? bridgeCurrentA : bridgeCurrentB;
    const isSafe = bridgeSafePath[step] === choice;

    if (isSafe) {
      setBridgeRevealed((p) => ({ ...p, [step]: choice }));
      const next = step + 1;
      if (stepper === 'A') {
        setBridgeCurrentA(next);
        if (next >= 8) {
          setWinnerSide('A');
          setRoomState('MATCH_SETTLED');
          triggerNotification('success');
          return;
        }
      } else {
        setBridgeCurrentB(next);
        if (next >= 8) {
          setWinnerSide('B');
          setRoomState('MATCH_SETTLED');
          triggerNotification('error');
          return;
        }
      }
      setBridgeTurn(stepper === 'A' ? 'B' : 'A');
      setTurnTimeLeft(15);
    } else {
      // Fragile glass shatters! Loses 1 life (starts with 3 lives like PVP)
      setBridgeRevealed((p) => ({ ...p, [step]: choice === 'LEFT' ? 'RIGHT' : 'LEFT' }));
      if (stepper === 'A') {
        const nextLives = bridgeLivesA - 1;
        setBridgeLivesA(nextLives);
        if (nextLives <= 0) {
          setWinnerSide('B');
          setRoomState('MATCH_SETTLED');
          triggerNotification('error');
          return;
        }
      } else {
        const nextLives = bridgeLivesB - 1;
        setBridgeLivesB(nextLives);
        if (nextLives <= 0) {
          setWinnerSide('A');
          setRoomState('MATCH_SETTLED');
          triggerNotification('success');
          return;
        }
      }
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
  }, [gameType, roomState, bridgeTurn, bridgeCurrentB, bridgeRevealed, bridgeLivesA, bridgeLivesB]);

  // ==========================================
  // --- 6. HEAD SOCCER (REAL-TIME ARCADE REPLICA) ---
  // ==========================================
  const [hsState, setHsState] = useState<any>({
    phase: 'PLAYING',
    scoreA: 0,
    scoreB: 0,
    timeRemainingMs: 60000,
    isOvertime: false,
    countdownSec: 0,
    playerA: { x: 200, y: 358, vx: 0, vy: 0, isGrounded: true, isKicking: false, kickTimer: 0, superCharge: 30, superActive: false },
    playerB: { x: 600, y: 358, vx: 0, vy: 0, isGrounded: true, isKicking: false, kickTimer: 0, superCharge: 30, superActive: false },
    ball: { x: 400, y: 240, vx: 0, vy: 0, radius: 20, isSuperShot: false, superShotTimer: 0 },
    lastEvent: null,
  });

  const hsInputRef = useRef<{ left: boolean; right: boolean; jump: boolean; kick: boolean; super: boolean }>({
    left: false,
    right: false,
    jump: false,
    kick: false,
    super: false,
  });

  const handleHeadSoccerInput = useCallback((inp: any) => {
    hsInputRef.current = { ...hsInputRef.current, ...inp };
  }, []);

  // Cyber Boxing Local Bot State & Inputs
  const [boxingState, setBoxingState] = useState<any>({
    phase: 'FIGHTING',
    timeRemainingMs: 60000,
    round: 1,
    countdownSec: 0,
    boxerA: { side: 'A', name: playerName, x: 260, hp: 100, stamina: 100, superMeter: 0, state: 'IDLE', stateTicks: 0, isGuarding: false, isDodging: false, consecutiveHits: 0, score: 0 },
    boxerB: { side: 'B', name: botName, x: 540, hp: 100, stamina: 100, superMeter: 0, state: 'IDLE', stateTicks: 0, isGuarding: false, isDodging: false, consecutiveHits: 0, score: 0 },
    lastHitEvent: null,
  });

  const boxingInputRef = useRef<{
    left: boolean;
    right: boolean;
    block: boolean;
    jab: boolean;
    hook: boolean;
    dodge: boolean;
    super: boolean;
    jabBufferTicks: number;
    hookBufferTicks: number;
    dodgeBufferTicks: number;
    superBufferTicks: number;
  }>({
    left: false,
    right: false,
    block: false,
    jab: false,
    hook: false,
    dodge: false,
    super: false,
    jabBufferTicks: 0,
    hookBufferTicks: 0,
    dodgeBufferTicks: 0,
    superBufferTicks: 0,
  });

  const botCooldownRef = useRef<number>(0);

  const handleBoxingInput = useCallback((inp: any) => {
    const cur = boxingInputRef.current;
    boxingInputRef.current = {
      ...cur,
      ...inp,
      jabBufferTicks: inp.jab ? 8 : (inp.jab === false ? 0 : cur.jabBufferTicks),
      hookBufferTicks: inp.hook ? 8 : (inp.hook === false ? 0 : cur.hookBufferTicks),
      dodgeBufferTicks: inp.dodge ? 8 : (inp.dodge === false ? 0 : cur.dodgeBufferTicks),
      superBufferTicks: inp.super ? 8 : (inp.super === false ? 0 : cur.superBufferTicks),
    };
  }, []);

  const initBoxing = () => {
    botCooldownRef.current = 15;
    setBoxingState({
      phase: 'FIGHTING',
      timeRemainingMs: 60000,
      round: 1,
      countdownSec: 0,
      boxerA: { side: 'A', name: playerName, x: 260, hp: 150, stamina: 100, superMeter: 0, state: 'IDLE', stateTicks: 0, isGuarding: false, isDodging: false, consecutiveHits: 0, score: 0 },
      boxerB: { side: 'B', name: botName, x: 540, hp: 150, stamina: 100, superMeter: 0, state: 'IDLE', stateTicks: 0, isGuarding: false, isDodging: false, consecutiveHits: 0, score: 0 },
      lastHitEvent: null,
    });
    boxingInputRef.current = {
      left: false,
      right: false,
      block: false,
      jab: false,
      hook: false,
      dodge: false,
      super: false,
      jabBufferTicks: 0,
      hookBufferTicks: 0,
      dodgeBufferTicks: 0,
      superBufferTicks: 0,
    };
  };

  const initHeadSoccer = () => {
    setHsState({
      phase: 'PLAYING',
      scoreA: 0,
      scoreB: 0,
      timeRemainingMs: 60000,
      isOvertime: false,
      countdownSec: 0,
      playerA: { x: 200, y: 358, vx: 0, vy: 0, isGrounded: true, isKicking: false, kickTimer: 0, superCharge: 30, superActive: false },
      playerB: { x: 600, y: 358, vx: 0, vy: 0, isGrounded: true, isKicking: false, kickTimer: 0, superCharge: 30, superActive: false },
      ball: { x: 400, y: 240, vx: 0, vy: 0, radius: 20, isSuperShot: false, superShotTimer: 0 },
      lastEvent: null,
    });
    hsInputRef.current = { left: false, right: false, jump: false, kick: false, super: false };
  };

  // Real-time 30 FPS Head Soccer physics simulation
  useEffect(() => {
    if (gameType !== 'headsoccer' || roomState !== 'GAME_ACTIVE') return;

    const interval = setInterval(() => {
      setHsState((prev: any) => {
        if (!prev || prev.timeRemainingMs <= 0) return prev;

        const newTime = Math.max(0, prev.timeRemainingMs - 33);
        if (newTime <= 0) {
          const winSide = prev.scoreA > prev.scoreB ? 'A' : prev.scoreB > prev.scoreA ? 'B' : 'A';
          setWinnerSide(winSide);
          setRoomState('MATCH_SETTLED');
          if (winSide === 'A') triggerNotification('success');
          else triggerNotification('error');
          return { ...prev, timeRemainingMs: 0 };
        }

        const input = hsInputRef.current;
        let pA = { ...prev.playerA };
        let pB = { ...prev.playerB };
        let ball = { ...prev.ball };
        let lastEvent = prev.lastEvent;

        // Passive Super Charge progression over time (reaches 100% in ~10s)
        pA.superCharge = Math.min(100, pA.superCharge + 0.35);
        pB.superCharge = Math.min(100, pB.superCharge + 0.35);

        // Super Shot Activation trigger from Player A
        if (input.super) {
          hsInputRef.current.super = false;
          if (pA.superCharge >= 100) {
            pA.superActive = true;
            triggerImpact('heavy');
          }
        }

        // 1. Player A movement & Single-Impulse Jump
        if (input.left) pA.vx = -6.5;
        else if (input.right) pA.vx = 6.5;
        else pA.vx *= 0.8;

        if (input.jump) {
          if (pA.isGrounded) {
            pA.vy = -14.0;
            pA.isGrounded = false;
          }
          hsInputRef.current.jump = false; // Immediately consume single jump impulse!
        }

        pA.vy += 0.8;
        pA.x = Math.max(80, Math.min(380, pA.x + pA.vx));
        pA.y += pA.vy;
        if (pA.y >= 358) {
          pA.y = 358;
          pA.vy = 0;
          pA.isGrounded = true;
        }

        // Kick trigger: sets kickTimer to 7 frames (~230ms) for visible sprite animation & collision window
        if (input.kick) {
          pA.kickTimer = 7;
          hsInputRef.current.kick = false;
          triggerImpact('light');
        } else if (pA.kickTimer > 0) {
          pA.kickTimer -= 1;
        }
        pA.isKicking = pA.kickTimer > 0;

        // 2. Bot B Autonomous AI (defensive + offensive)
        const targetX = Math.max(420, Math.min(720, ball.x + 20));
        if (pB.x < targetX - 10) pB.vx = 5.2;
        else if (pB.x > targetX + 10) pB.vx = -5.2;
        else pB.vx *= 0.8;

        const distB = Math.hypot(pB.x - ball.x, pB.y - ball.y);
        if (distB < 120 && ball.y < 300 && pB.isGrounded && Math.random() > 0.4) {
          pB.vy = -13;
          pB.isGrounded = false;
        }
        pB.vy += 0.8;
        pB.x = Math.max(420, Math.min(720, pB.x + pB.vx));
        pB.y += pB.vy;
        if (pB.y >= 358) {
          pB.y = 358;
          pB.vy = 0;
          pB.isGrounded = true;
        }

        // Bot B kicks when ball is in range
        if (distB < 65 && Math.random() > 0.3) {
          pB.kickTimer = 7;
        } else if (pB.kickTimer > 0) {
          pB.kickTimer -= 1;
        }
        pB.isKicking = pB.kickTimer > 0;

        // Bot B Super Shot Activation
        if (pB.superCharge >= 100 && distB < 110) {
          pB.superActive = true;
        }

        // 3. Ball Physics & Super Shot Timer
        if (ball.superShotTimer > 0) {
          ball.superShotTimer -= 1;
          if (ball.superShotTimer <= 0) {
            ball.isSuperShot = false;
          }
        }

        ball.vy += 0.55;
        ball.vx *= 0.99;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Ground bounce
        if (ball.y >= 370) {
          ball.y = 370;
          ball.vy = -ball.vy * 0.75;
          ball.vx *= 0.96;
        }

        // Left/Right pitch bounce
        if (ball.x <= 62) {
          if (ball.y < 235) {
            ball.x = 62;
            ball.vx = Math.abs(ball.vx) * 0.8;
          }
        }
        if (ball.x >= 738) {
          if (ball.y < 235) {
            ball.x = 738;
            ball.vx = -Math.abs(ball.vx) * 0.8;
          }
        }

        // Collision: Player A with ball (generous 68px radius when kicking)
        const distA = Math.hypot(pA.x - ball.x, pA.y - ball.y);
        const contactLimitA = pA.isKicking ? 68 : 52;
        if (distA < contactLimitA) {
          if (pA.superActive) {
            // Unstoppable Flaming Rocket Super Shot!
            ball.isSuperShot = true;
            ball.superShotTimer = 45;
            ball.vx = 26.0;
            ball.vy = -6.0;
            pA.superActive = false;
            pA.superCharge = 0;
            lastEvent = { type: 'SUPER_SHOT', x: ball.x, y: ball.y, ts: Date.now() };
            triggerImpact('heavy');
            triggerNotification('success');
          } else {
            const kickBoost = pA.isKicking ? 1.85 : 1.1;
            ball.vx = (ball.x > pA.x ? 12.0 : -7.0) * kickBoost;
            ball.vy = -8.5 * kickBoost;
            pA.superCharge = Math.min(100, pA.superCharge + 12);
            if (pA.isKicking) {
              lastEvent = { type: 'KICK', x: ball.x, y: ball.y, side: 'A', ts: Date.now() };
            }
          }
        }

        // Collision: Bot B with ball
        const contactLimitB = pB.isKicking ? 68 : 52;
        if (distB < contactLimitB) {
          if (pB.superActive) {
            // Bot Super Shot
            ball.isSuperShot = true;
            ball.superShotTimer = 45;
            ball.vx = -26.0;
            ball.vy = -6.0;
            pB.superActive = false;
            pB.superCharge = 0;
            lastEvent = { type: 'SUPER_SHOT', x: ball.x, y: ball.y, ts: Date.now() };
            triggerImpact('heavy');
          } else {
            const kickBoost = pB.isKicking ? 1.85 : 1.1;
            ball.vx = (ball.x < pB.x ? -12.0 : 7.0) * kickBoost;
            ball.vy = -8.5 * kickBoost;
            pB.superCharge = Math.min(100, pB.superCharge + 12);
            if (pB.isKicking) {
              lastEvent = { type: 'KICK', x: ball.x, y: ball.y, side: 'B', ts: Date.now() };
            }
          }
        }

        // 4. Goal Detection
        let scoreA = prev.scoreA;
        let scoreB = prev.scoreB;
        if (ball.x < 55 && ball.y >= 235) {
          scoreB += 1;
          ball = { x: 400, y: 220, vx: 0, vy: 0, radius: 20, isSuperShot: false, superShotTimer: 0 };
          pA.superCharge = Math.min(100, pA.superCharge + 35); // Conceding boosts super charge
          lastEvent = { type: 'GOAL', x: ball.x, y: ball.y, ts: Date.now() };
          triggerImpact('heavy');
        } else if (ball.x > 745 && ball.y >= 235) {
          scoreA += 1;
          ball = { x: 400, y: 220, vx: 0, vy: 0, radius: 20, isSuperShot: false, superShotTimer: 0 };
          pB.superCharge = Math.min(100, pB.superCharge + 35);
          lastEvent = { type: 'GOAL', x: ball.x, y: ball.y, ts: Date.now() };
          triggerImpact('heavy');
        }

        return {
          ...prev,
          scoreA,
          scoreB,
          timeRemainingMs: newTime,
          playerA: pA,
          playerB: pB,
          ball,
          lastEvent,
        };
      });
    }, 33);

    return () => clearInterval(interval);
  }, [gameType, roomState]);

  // Real-time 30 FPS Cyber Boxing physics simulation
  useEffect(() => {
    if (gameType !== 'boxing' || roomState !== 'GAME_ACTIVE') return;

    const interval = setInterval(() => {
      setBoxingState((prev: any) => {
        if (!prev || prev.phase === 'MATCH_OVER') return prev;

        const newTime = Math.max(0, prev.timeRemainingMs - 33);
        if (newTime <= 0 || prev.boxerA.hp <= 0 || prev.boxerB.hp <= 0) {
          const winSide = prev.boxerA.hp > prev.boxerB.hp ? 'A' : prev.boxerB.hp > prev.boxerA.hp ? 'B' : 'A';
          setWinnerSide(winSide);
          setRoomState('MATCH_SETTLED');
          if (winSide === 'A') triggerNotification('success');
          else triggerNotification('error');
          return { ...prev, phase: 'MATCH_OVER', timeRemainingMs: 0 };
        }

        let pA = { ...prev.boxerA };
        let pB = { ...prev.boxerB };
        const inp = boxingInputRef.current;
        let lastHitEvent = prev.lastHitEvent;

        // Passive recovery
        pA.stamina = Math.min(100, pA.stamina + 0.85);
        pB.stamina = Math.min(100, pB.stamina + 0.50);
        pA.superMeter = Math.min(100, pA.superMeter + 0.15);
        pB.superMeter = Math.min(100, pB.superMeter + 0.10);

        if (botCooldownRef.current > 0) {
          botCooldownRef.current--;
        }

        // Input Buffers decrement
        if (inp.jabBufferTicks > 0) inp.jabBufferTicks--;
        if (inp.hookBufferTicks > 0) inp.hookBufferTicks--;
        if (inp.dodgeBufferTicks > 0) inp.dodgeBufferTicks--;
        if (inp.superBufferTicks > 0) inp.superBufferTicks--;

        // Update Player A stateTicks
        if (pA.stateTicks > 0) {
          pA.stateTicks--;
          if (pA.stateTicks <= 0) {
            pA.isDodging = false;
            pA.state = inp.block ? 'BLOCK' : 'IDLE';
            pA.isGuarding = inp.block;
          }
        } else {
          // Handle Player A input (buffer-aware)
          const wantSuper = inp.super || inp.superBufferTicks > 0;
          const wantDodge = inp.dodge || inp.dodgeBufferTicks > 0;
          const wantHook = inp.hook || inp.hookBufferTicks > 0;
          const wantJab = inp.jab || inp.jabBufferTicks > 0;

          if (wantSuper && pA.superMeter >= 100) {
            inp.super = false;
            inp.superBufferTicks = 0;
            pA.superMeter = 0;
            pA.state = 'UPPERCUT';
            pA.stateTicks = 14;
            pA.isGuarding = false;
          } else if (wantDodge && pA.stamina >= 10) {
            inp.dodge = false;
            inp.dodgeBufferTicks = 0;
            pA.stamina -= 10;
            pA.state = 'DODGE';
            pA.stateTicks = 6;
            pA.isDodging = true;
            pA.isGuarding = false;
          } else if (wantHook && pA.stamina >= 14) {
            inp.hook = false;
            inp.hookBufferTicks = 0;
            pA.stamina -= 14;
            pA.state = 'HOOK';
            pA.stateTicks = 8;
            pA.isGuarding = false;
          } else if (wantJab && pA.stamina >= 7) {
            inp.jab = false;
            inp.jabBufferTicks = 0;
            pA.stamina -= 7;
            pA.state = 'JAB';
            pA.stateTicks = 5;
            pA.isGuarding = false;
          } else if (inp.block && pA.stamina >= 6) {
            pA.state = 'BLOCK';
            pA.isGuarding = true;
          } else {
            pA.isGuarding = false;
            if (inp.left) {
              pA.state = 'MOVE';
              pA.x = Math.max(140, pA.x - 6.5);
            } else if (inp.right) {
              pA.state = 'MOVE';
              pA.x = Math.min(660, pA.x + 6.5);
            } else {
              pA.state = 'IDLE';
            }
          }
        }

        // Bot AI (Boxer B)
        const dist = Math.abs(pB.x - pA.x);
        if (pB.stateTicks > 0) {
          pB.stateTicks--;
          if (pB.stateTicks <= 0) {
            pB.isDodging = false;
            pB.state = 'IDLE';
            pB.isGuarding = false;
          }
        } else if (botCooldownRef.current > 0) {
          // Bot in cooldown: reposition smoothly, no auto-block or instant attacks
          if (dist < 65) {
            pB.state = 'MOVE';
            pB.x = Math.min(660, pB.x + 3.0);
          } else if (dist > 115) {
            pB.state = 'MOVE';
            pB.x = Math.max(140, pB.x - 2.8);
          } else {
            pB.state = 'IDLE';
          }
          pB.isGuarding = false;
          pB.isDodging = false;
        } else {
          const r = Math.random();
          if (dist > 85) {
            pB.state = 'MOVE';
            pB.x = Math.max(140, pB.x - 4.2);
          } else if (dist < 58 && r < 0.25) {
            pB.state = 'MOVE';
            pB.x = Math.min(660, pB.x + 3.8);
          } else if (pB.superMeter >= 100 && dist <= 78) {
            pB.superMeter = 0;
            pB.state = 'UPPERCUT';
            pB.stateTicks = 14;
            pB.isGuarding = false;
            botCooldownRef.current = 24;
          } else if ((pA.state === 'JAB' || pA.state === 'HOOK') && r < 0.22) {
            // Human-like occasional block
            if (r < 0.08 && pB.stamina >= 15) {
              pB.stamina -= 15;
              pB.state = 'DODGE';
              pB.stateTicks = 6;
              pB.isDodging = true;
              botCooldownRef.current = 16;
            } else {
              pB.state = 'BLOCK';
              pB.isGuarding = true;
              pB.stateTicks = 6;
              botCooldownRef.current = 14;
            }
          } else if (dist <= 74 && r < 0.12 && pB.stamina >= 18) {
            pB.stamina -= 18;
            pB.state = 'HOOK';
            pB.stateTicks = 9;
            pB.isGuarding = false;
            botCooldownRef.current = 18 + Math.floor(Math.random() * 10);
          } else if (dist <= 84 && r < 0.20 && pB.stamina >= 10) {
            pB.stamina -= 10;
            pB.state = 'JAB';
            pB.stateTicks = 6;
            pB.isGuarding = false;
            botCooldownRef.current = 16 + Math.floor(Math.random() * 10);
          } else {
            pB.state = 'IDLE';
            pB.isGuarding = false;
          }
        }

        // Distance constraint (min 55px so hits connect smoothly)
        if (pA.x + 55 > pB.x) {
          const mid = (pA.x + pB.x) / 2;
          pA.x = mid - 27.5;
          pB.x = mid + 27.5;
        }

        // Hit Detection: Player A hitting Bot B
        if ((pA.state === 'JAB' && pA.stateTicks === 3) || (pA.state === 'HOOK' && pA.stateTicks === 5) || (pA.state === 'UPPERCUT' && pA.stateTicks === 7)) {
          const range = pA.state === 'UPPERCUT' ? 80 : pA.state === 'HOOK' ? 76 : 84;
          if (dist <= range && !pB.isDodging) {
            const isBlocked = pB.isGuarding && pB.stamina >= 10 && pA.state !== 'UPPERCUT';
            const baseDmg = pA.state === 'UPPERCUT' ? 42 : pA.state === 'HOOK' ? 22 : 9;
            const finalDmg = isBlocked ? Math.max(2, Math.round(baseDmg * 0.22)) : baseDmg;
            pB.hp = Math.max(0, pB.hp - finalDmg);
            if (!isBlocked) {
              pB.state = 'HURT';
              pB.stateTicks = 6;
              pB.x = Math.min(660, pB.x + (pA.state === 'UPPERCUT' ? 26 : 14));
              botCooldownRef.current = 14;
            }
            const superGain = pA.state === 'UPPERCUT' ? 0 : pA.state === 'HOOK' ? 22 : 12;
            pA.superMeter = Math.min(100, pA.superMeter + superGain);
            lastHitEvent = {
              id: `hit_${Date.now()}_${Math.random()}`,
              attacker: 'A',
              defender: 'B',
              type: pA.state === 'UPPERCUT' ? 'UPPERCUT' : isBlocked ? 'JAB' : pA.state === 'HOOK' ? 'HOOK' : 'JAB',
              damage: finalDmg,
              isCrit: false,
              isBlocked,
              timestamp: Date.now(),
            };
          }
        }

        // Hit Detection: Bot B hitting Player A
        if ((pB.state === 'JAB' && pB.stateTicks === 3) || (pB.state === 'HOOK' && pB.stateTicks === 5) || (pB.state === 'UPPERCUT' && pB.stateTicks === 7)) {
          const range = pB.state === 'UPPERCUT' ? 80 : pB.state === 'HOOK' ? 76 : 84;
          if (dist <= range && !pA.isDodging) {
            const isBlocked = pA.isGuarding && pA.stamina >= 10 && pB.state !== 'UPPERCUT';
            const baseDmg = pB.state === 'UPPERCUT' ? 36 : pB.state === 'HOOK' ? 18 : 8;
            const finalDmg = isBlocked ? Math.max(2, Math.round(baseDmg * 0.22)) : baseDmg;
            pA.hp = Math.max(0, pA.hp - finalDmg);
            if (!isBlocked) {
              pA.state = 'HURT';
              pA.stateTicks = 6;
              pA.x = Math.max(140, pA.x - (pB.state === 'UPPERCUT' ? 26 : 14));
            }
            const superGain = pB.state === 'UPPERCUT' ? 0 : pB.state === 'HOOK' ? 18 : 10;
            pB.superMeter = Math.min(100, pB.superMeter + superGain);
            lastHitEvent = {
              id: `hit_${Date.now()}_${Math.random()}`,
              attacker: 'B',
              defender: 'A',
              type: pB.state === 'UPPERCUT' ? 'UPPERCUT' : isBlocked ? 'JAB' : pB.state === 'HOOK' ? 'HOOK' : 'JAB',
              damage: finalDmg,
              isCrit: false,
              isBlocked,
              timestamp: Date.now(),
            };
          }
        }

        return {
          ...prev,
          timeRemainingMs: newTime,
          boxerA: pA,
          boxerB: pB,
          lastHitEvent,
        };
      });
    }, 33);

    return () => clearInterval(interval);
  }, [gameType, roomState, triggerNotification]);

  // ==========================================
  // --- 7. POKER (POKER ROOM REPLICA) ---
  // ==========================================
  const [pokerPot, setPokerPot] = useState(100);
  const [pokerTurn, setPokerTurn] = useState<'A' | 'B'>('A');
  const [pokerPhase, setPokerPhase] = useState<'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'>('FLOP');
  const [pokerCommunityCards, setPokerCommunityCards] = useState<any[]>([
    { suit: '♠', value: '10', numericValue: 10 },
    { suit: '♥', value: 'J', numericValue: 11 },
    { suit: '♦', value: 'Q', numericValue: 12 },
  ]);

  const initPoker = () => {
    setPokerPot(100);
    setPokerPhase('FLOP');
    setPokerTurn('A');
    setPokerCommunityCards([
      { suit: '♠', value: '10', numericValue: 10 },
      { suit: '♥', value: 'J', numericValue: 11 },
      { suit: '♦', value: 'Q', numericValue: 12 },
    ]);
  };

  const handlePokerAction = (action: string) => {
    if (action === 'fold') {
      setWinnerSide('B');
      setRoomState('MATCH_SETTLED');
      triggerNotification('error');
    } else {
      setPokerTurn('B');
      setTurnTimeLeft(15);
    }
  };

  // Bot AI for Poker: responds and advances betting rounds
  useEffect(() => {
    if (gameType !== 'poker' || roomState !== 'GAME_ACTIVE' || pokerTurn !== 'B') return;

    const timer = setTimeout(() => {
      if (pokerPhase === 'FLOP') {
        setPokerPhase('TURN');
        setPokerCommunityCards((prev) => [
          ...prev,
          { suit: '♣', value: '4', numericValue: 4 },
        ]);
        setPokerTurn('A');
        setTurnTimeLeft(15);
      } else if (pokerPhase === 'TURN') {
        setPokerPhase('RIVER');
        setPokerCommunityCards((prev) => [
          ...prev,
          { suit: '♥', value: 'A', numericValue: 14 },
        ]);
        setPokerTurn('A');
        setTurnTimeLeft(15);
      } else {
        // Showdown
        setPokerPhase('SHOWDOWN');
        setWinnerSide('A');
        setRoomState('MATCH_SETTLED');
        triggerNotification('success');
      }
    }, 1300);

    return () => clearTimeout(timer);
  }, [gameType, roomState, pokerTurn, pokerPhase]);

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
    setWinnerSide(null);
    setTurnTimeLeft(15);
    setMatchId(Date.now());

    if (gameType === 'headsoccer' || gameType === 'boxing') {
      setShowCoinToss(false);
      setRoomState('GAME_ACTIVE');
      if (gameType === 'headsoccer') initHeadSoccer();
      if (gameType === 'boxing') initBoxing();
    } else {
      setShowCoinToss(true);
      setRoomState('READY_CHECK');
      if (gameType === 'blackjack') initBlackjack(starter);
      if (gameType === 'roulette') initRoulette(starter);
      if (gameType === 'connect4') initConnect4(starter);
      if (gameType === 'shotgun') initShotgun(starter);
      if (gameType === 'bridge') initBridge(starter);
      if (gameType === 'poker') initPoker();
    }
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

      {/* Active Turn Clock Indicator (Hidden for real-time action matches) */}
      {roomState === 'GAME_ACTIVE' && gameType !== 'headsoccer' && gameType !== 'boxing' && (
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
              bustA: bjBustA,
              bustB: bjBustB,
              bustOddsPercentA: calculateBustOdds(calculateBlackjackScore(bjHandA), bjDeck),
              bustOddsPercentB: calculateBustOdds(calculateBlackjackScore(bjHandB), bjDeck),
              coinToss: coinToss || undefined,
              lastAction: bjLastAction,
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
            winnerSide={winnerSide}
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
              maxHp: 5,
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
              totalSteps: 10,
              currentStepA: bridgeCurrentA,
              currentStepB: bridgeCurrentB,
              activeStep: Math.max(bridgeCurrentA, bridgeCurrentB),
              currentTurn: bridgeTurn,
              livesA: bridgeLivesA,
              livesB: bridgeLivesB,
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

        {gameType === 'boxing' && (
          <BoxingArena
            gameData={boxingState}
            role="player"
            onInput={handleBoxingInput}
            onSubscribeTick={() => () => {}}
            playerAName={playerName}
            playerBName={botName}
            playerAReady={true}
            playerBReady={true}
            hasPlayerB={true}
            roomState={roomState}
            wagerTon="0.00"
            isCreator={true}
            isWinner={winnerSide === 'A'}
            winnerName={winnerSide === 'A' ? playerName : botName}
            onReturnToLobby={onExit}
          />
        )}

        {gameType === 'poker' && (
          <PokerArena
            gameData={{
              phase: pokerPhase,
              pot: pokerPot,
              currentTurn: pokerTurn === 'A' ? 0 : 1,
              activeSeat: pokerTurn === 'A' ? 0 : 1,
              dealerSeat: 0,
              currentBet: 50,
              minRaise: 50,
              seats: [
                {
                  seatIndex: 0,
                  username: playerName,
                  chips: 500,
                  currentBet: 50,
                  hasFolded: false,
                  isConnected: true,
                  cards: [
                    { suit: '♠', value: 'A', numericValue: 14 },
                    { suit: '♥', value: 'K', numericValue: 13 },
                  ],
                },
                {
                  seatIndex: 1,
                  username: botName,
                  chips: 500,
                  currentBet: 50,
                  hasFolded: false,
                  isConnected: true,
                  cards: [
                    { suit: '♦', value: 'Q', numericValue: 12 },
                    { suit: '♣', value: 'J', numericValue: 11 },
                  ],
                },
              ],
              communityCards: pokerCommunityCards,
              turnTimeRemaining: turnTimeLeft,
            } as any}
            role="PLAYER_A"
            userSide="A"
            opponentConnected={true}
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

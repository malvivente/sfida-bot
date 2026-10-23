import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomState, WsMessage, MatchResolution, GameType, ShotgunItem } from '../types/index.js';

export interface PlacedSpectatorBet {
  target: 'A' | 'B' | 'X';
  amountGram: string;
  feePaidGram: string;
  targetName?: string;
  odds?: number;
}

export interface SpectatorOutcome {
  won: boolean;
  payoutGram: string;
  refunded?: boolean;
}

export interface SocketPlayerInfo {
  wallet?: string;
  name?: string;
  ready?: boolean;
  score?: number;
  connected?: boolean;
  telegramUserId?: string;
  photoUrl?: string;
}

interface UseSocketProps {
  matchId: string;
  wallet?: string;
  role: 'player' | 'spectator';
  telegramId?: string;
  username?: string;
  firstName?: string;
  photoUrl?: string;
  serverUrl?: string;
}

function resolveWsUrl(serverUrl?: string): string | null {
  let endpoint = serverUrl || (import.meta as any).env?.VITE_WS_URL;
  if (!endpoint) {
    const httpUrl = (import.meta as any).env?.VITE_SERVER_URL;
    if (httpUrl) {
      endpoint = httpUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    }
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (!endpoint) {
    if (isHttps) return null;
    return 'ws://localhost:3000';
  }

  if (isHttps) {
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      return null;
    }
    endpoint = endpoint.replace(/^ws:\/\//i, 'wss://').replace(/^http:\/\//i, 'https://');
  }

  return endpoint;
}

export function useSocket({
  matchId,
  wallet,
  role,
  telegramId,
  username,
  firstName,
  photoUrl,
  serverUrl,
}: UseSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>('LOBBY');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [oddsA, setOddsA] = useState<number>(2.0);
  const [oddsB, setOddsB] = useState<number>(2.0);
  const [oddsX, setOddsX] = useState<number>(2.8);
  const [totalBetsA, setTotalBetsA] = useState<string>('0');
  const [totalBetsB, setTotalBetsB] = useState<string>('0');
  const [totalBetsX, setTotalBetsX] = useState<string>('0');
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [feedMessage, setFeedMessage] = useState<string>('In attesa nella lobby del duello...');
  const [lastReactionTimeMs, setLastReactionTimeMs] = useState<number | null>(null);
  const [personalReactionTimeMs, setPersonalReactionTimeMs] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [forfeitCountdown, setForfeitCountdown] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);
  const [matchWinnerName, setMatchWinnerName] = useState<string | null>(null);
  const [winnerSide, setWinnerSide] = useState<'A' | 'B' | null>(null);
  const [resolution, setResolution] = useState<MatchResolution | null>(null);
  const [playerAName, setPlayerAName] = useState<string>('Player A');
  const [playerBName, setPlayerBName] = useState<string | null>(null);
  const [rematchOffer, setRematchOffer] = useState<{ proposerWallet: string; proposerName: string; newWagerTon: string } | null>(null);
  const [activeWagerTon, setActiveWagerTon] = useState<string>('1.00');
  const [gameType, setGameType] = useState<GameType | undefined>(undefined);
  const [gameData, setGameData] = useState<any>(null);
  const [playerAReady, setPlayerAReady] = useState(false);
  const [playerBReady, setPlayerBReady] = useState(false);
  const [playerAConnected, setPlayerAConnected] = useState(true);
  const [playerBConnected, setPlayerBConnected] = useState(true);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [rematchDeclined, setRematchDeclined] = useState<boolean>(false);
  const [placedBet, setPlacedBet] = useState<PlacedSpectatorBet | null>(null);
  const [betStatus, setBetStatus] = useState<'idle' | 'placing' | 'confirmed' | 'error'>('idle');
  const [betError, setBetError] = useState<string | null>(null);
  const [spectatorOutcome, setSpectatorOutcome] = useState<SpectatorOutcome | null>(null);
  const [socketRole, setSocketRole] = useState<string | null>(null);
  const [socketPlayerA, setSocketPlayerA] = useState<SocketPlayerInfo | null>(null);
  const [socketPlayerB, setSocketPlayerB] = useState<SocketPlayerInfo | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [playerBExpiresAt, setPlayerBExpiresAt] = useState<number | null>(null);
  const [kickedInactivity, setKickedInactivity] = useState<string | null>(null);
  const [isRematch, setIsRematch] = useState<boolean>(false);
  const reconnectRef = useRef<() => void>(() => {});

  // High-frequency tick listener system for zero-overhead canvas render loops
  const gameTickSubscribersRef = useRef<Set<(data: any) => void>>(new Set());
  const lastHsReactUpdateRef = useRef<number>(0);
  const lastHsPhaseRef = useRef<string | undefined>(undefined);
  const lastHsScoreARef = useRef<number | undefined>(undefined);
  const lastHsScoreBRef = useRef<number | undefined>(undefined);
  const lastHsTimeSecRef = useRef<number | undefined>(undefined);
  const lastHsCountdownSecRef = useRef<number | undefined>(undefined);
  const lastHsSuperActiveARef = useRef<boolean | undefined>(undefined);
  const lastHsSuperActiveBRef = useRef<boolean | undefined>(undefined);
  const currentRoomStateRef = useRef<RoomState>('LOBBY');
  const currentScoreARef = useRef<number>(-1);
  const currentScoreBRef = useRef<number>(-1);
  const currentSecondsLeftRef = useRef<number | null>(null);

  const subscribeToGameTick = useCallback((cb: (data: any) => void) => {
    gameTickSubscribersRef.current.add(cb);
    return () => {
      gameTickSubscribersRef.current.delete(cb);
    };
  }, []);

  useEffect(() => {
    // Reset room state when entering a new match or switching rooms
    setRoomState('LOBBY');
    setCurrentRound(1);
    setScoreA(0);
    setScoreB(0);
    setPlayerAName('Player A');
    setPlayerBName(null);
    setPlayerAReady(false);
    setPlayerBReady(false);
    setPlayerAConnected(true);
    setPlayerBConnected(true);
    setGameData(null);
    setRematchOffer(null);
    setRematchDeclined(false);
    setRoundWinner(null);
    setMatchWinner(null);
    setMatchWinnerName(null);
    setResolution(null);
    setSocketError(null);
    setCountdownSeconds(null);
    setPlacedBet(null);
    setBetStatus('idle');
    setBetError(null);
    setSpectatorOutcome(null);
    setSocketRole(null);
    setSocketPlayerA(null);
    setSocketPlayerB(null);
    setExpiresAt(null);
    setPlayerBExpiresAt(null);
    setKickedInactivity(null);
    setIsRematch(false);

    if (!matchId) return;

    const wsEndpoint = resolveWsUrl(serverUrl);
    if (!wsEndpoint) {
      setIsConnected(false);
      setFeedMessage('Server di gioco in attesa di configurazione (VITE_WS_URL)...');
      return;
    }

    let isDisposed = false;
    let reconnectTimeout: any = null;
    let pingTimer: any = null;
    let lastMsgAt = Date.now();

    const connect = () => {
      if (isDisposed) return;
      try {
        const url = `${wsEndpoint}/ws/duel?matchId=${matchId}&role=${role}&wallet=${wallet || ''}&telegramId=${telegramId || ''}&username=${encodeURIComponent(username || '')}&firstName=${encodeURIComponent(firstName || '')}&photoUrl=${encodeURIComponent(photoUrl || '')}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) {
            try { ws.close(); } catch {}
            return;
          }
          lastMsgAt = Date.now();
          setIsConnected(true);
          setFeedMessage('Connesso all\'Arena Cyber.');
        };

        ws.onerror = (e) => {
          console.warn('[WebSocket] Warning/error on connection:', e);
          setIsConnected(false);
          setFeedMessage('Server di gioco temporaneamente non raggiungibile.');
        };

        ws.onmessage = (event) => {
          lastMsgAt = Date.now();
          try {
            const msg: WsMessage = JSON.parse(event.data);
            if ((msg as any).type === 'PONG') {
              return;
            }

            switch (msg.type) {
          case 'INIT_STATE':
            if (msg.role) setSocketRole(msg.role as any);
            if (msg.state) setRoomState(msg.state);
            if (msg.currentRound) setCurrentRound(msg.currentRound);
            if (msg.scoreA !== undefined) setScoreA(msg.scoreA);
            if (msg.scoreB !== undefined) setScoreB(msg.scoreB);
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.oddsX) setOddsX(msg.oddsX);
            if (msg.totalBetsA) setTotalBetsA(msg.totalBetsA);
            if (msg.totalBetsB) setTotalBetsB(msg.totalBetsB);
            if (msg.totalBetsX) setTotalBetsX(msg.totalBetsX);
            if (msg.winnerAddress) setMatchWinner(msg.winnerAddress);
            if (msg.winnerName) setMatchWinnerName(msg.winnerName);
            if (msg.resolution) setResolution(msg.resolution);
            if (msg.playerAName) setPlayerAName(msg.playerAName);
            if (msg.playerBName) setPlayerBName(msg.playerBName);
            if (msg.wagerTon) setActiveWagerTon(msg.wagerTon);
            if (msg.gameType) setGameType(msg.gameType);
            if (msg.gameData || (msg as any).payload) setGameData(msg.gameData || (msg as any).payload);
            if (msg.playerA) {
              setSocketPlayerA(msg.playerA);
              if (msg.playerA.name) setPlayerAName(msg.playerA.name);
              if (msg.playerA.ready !== undefined) setPlayerAReady(Boolean(msg.playerA.ready));
              if (msg.playerA.connected !== undefined) setPlayerAConnected(Boolean(msg.playerA.connected));
            }
            if (msg.playerB) {
              setSocketPlayerB(msg.playerB);
              if (msg.playerB.name) setPlayerBName(msg.playerB.name);
              if (msg.playerB.ready !== undefined) setPlayerBReady(Boolean(msg.playerB.ready));
              if (msg.playerB.connected !== undefined) setPlayerBConnected(Boolean(msg.playerB.connected));
            }
            if ((msg as any).expiresAt) setExpiresAt((msg as any).expiresAt);
            if ((msg as any).playerBExpiresAt) setPlayerBExpiresAt((msg as any).playerBExpiresAt);
            if ((msg as any).isRematch !== undefined) setIsRematch(Boolean((msg as any).isRematch));
            break;

          case 'ROOM_UPDATE':
            if (msg.state) setRoomState(msg.state);
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.oddsX) setOddsX(msg.oddsX);
            if (msg.winnerAddress) setMatchWinner(msg.winnerAddress);
            if (msg.winnerName) setMatchWinnerName(msg.winnerName);
            if (msg.resolution) setResolution(msg.resolution);
            if (msg.playerAName) setPlayerAName(msg.playerAName);
            if (msg.playerBName) setPlayerBName(msg.playerBName);
            if (msg.wagerTon) setActiveWagerTon(msg.wagerTon);
            if (msg.gameType) setGameType(msg.gameType);
            if (msg.gameData || (msg as any).payload) setGameData(msg.gameData || (msg as any).payload);
            if (msg.playerA) {
              setSocketPlayerA((prev) => ({ ...prev, ...msg.playerA }));
              if (msg.playerA.name) setPlayerAName(msg.playerA.name);
              if (msg.playerA.ready !== undefined) setPlayerAReady(Boolean(msg.playerA.ready));
              if (msg.playerA.connected !== undefined) setPlayerAConnected(Boolean(msg.playerA.connected));
            }
            if (msg.playerB) {
              setSocketPlayerB((prev) => ({ ...prev, ...msg.playerB }));
              if (msg.playerB.name) setPlayerBName(msg.playerB.name);
              if (msg.playerB.ready !== undefined) setPlayerBReady(Boolean(msg.playerB.ready));
              if (msg.playerB.connected !== undefined) setPlayerBConnected(Boolean(msg.playerB.connected));
            } else if (msg.playerB === null) {
              setSocketPlayerB(null);
              setPlayerBName(null);
              setPlayerBReady(false);
              setPlayerBConnected(false);
            }
            if ((msg as any).expiresAt) setExpiresAt((msg as any).expiresAt);
            if ((msg as any).playerBExpiresAt) setPlayerBExpiresAt((msg as any).playerBExpiresAt);
            if ((msg as any).isRematch !== undefined) setIsRematch(Boolean((msg as any).isRematch));
            break;

          case 'ROULETTE_START':
          case 'ROULETTE_UPDATE':
          case 'BLACKJACK_START':
          case 'BLACKJACK_UPDATE':
          case 'BLACKJACK_TIE':
          case 'BLACKJACK_ROUND_START':
          case 'BRIDGE_START':
          case 'BRIDGE_UPDATE':
          case 'CHRONO_ROUND_START':
          case 'CHRONO_UPDATE':
          case 'CHRONO_ROUND_END':
          case 'SPLIT_STEAL_START':
          case 'SPLIT_STEAL_TICK':
          case 'SPLIT_STEAL_CHOICE_LOCKED':
          case 'SPLIT_STEAL_REVEAL':
          case 'SHOTGUN_START':
          case 'SHOTGUN_ITEM_USED':
          case 'SHOTGUN_OUTCOME':
          case 'CONNECT4_START':
          case 'CONNECT4_MOVE':
          case 'CUBECOUNT_ROUND_START':
          case 'CUBECOUNT_FLASH':
          case 'CUBECOUNT_INPUT':
          case 'CUBECOUNT_ANSWER_STATUS':
          case 'CUBECOUNT_REVEAL':
          case 'HEADSOCCER_START':
          case 'HEADSOCCER_GOAL':
          case 'HEADSOCCER_OVERTIME':
          case 'HEADSOCCER_FULLTIME':
          case 'GAME_STATE':
          case 'POKER_SHOWDOWN':
            setRoomState((prev) => (prev === 'MATCH_SETTLED' ? prev : (msg.state || 'GAME_ACTIVE')));
            const incomingPayload = (msg as any).payload || msg.gameData;
            if (incomingPayload) {
              setGameData((prev: any) => {
                if (prev?.seats && incomingPayload?.seats && incomingPayload.stage !== 'WAITING') {
                  const mergedSeats = incomingPayload.seats.map((nextSeat: any) => {
                    const prevSeat = prev.seats.find((ps: any) => ps.seatIndex === nextSeat.seatIndex);
                    if (!nextSeat.holeCards && prevSeat?.holeCards && prevSeat.holeCards.length > 0) {
                      return { ...nextSeat, holeCards: prevSeat.holeCards };
                    }
                    return nextSeat;
                  });
                  return { ...incomingPayload, seats: mergedSeats };
                }
                return incomingPayload;
              });
            }
            if (msg.scoreA !== undefined) setScoreA(msg.scoreA);
            if (msg.scoreB !== undefined) setScoreB(msg.scoreB);
            if (msg.message) setFeedMessage(msg.message);
            if (msg.secondsLeft !== undefined) setCountdownSeconds(msg.secondsLeft);
            break;

          case 'PLAYER_READY':
            if ((msg as any).playerA?.ready !== undefined) {
              setPlayerAReady(Boolean((msg as any).playerA.ready));
            }
            if ((msg as any).playerB?.ready !== undefined) {
              setPlayerBReady(Boolean((msg as any).playerB.ready));
            }
            if ((msg as any).seats) {
              setGameData((prev: any) => {
                if (!prev) return prev;
                const prevSeats = prev.seats || [];
                const updatedSeats = prevSeats.map((s: any, idx: number) => {
                  const match = (msg as any).seats.find((us: any) => us.seatIndex === s.seatIndex || us.seatIndex === idx);
                  return match ? { ...s, isReady: Boolean(match.ready) } : s;
                });
                return { ...prev, seats: updatedSeats };
              });
            }
            break;

          case 'POKER_HOLE_CARDS':
            if ((msg as any).holeCards) {
              setGameData((prev: any) => {
                if (!prev || !prev.seats) return prev;
                const updatedSeats = prev.seats.map((s: any) =>
                  s.seatIndex === (msg as any).seatIndex ? { ...s, holeCards: (msg as any).holeCards } : s
                );
                return { ...prev, seats: updatedSeats };
              });
            }
            break;

          case 'POKER_CLOCK':
            setGameData((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                activeSeat: (msg as any).seatIndex,
                turnTimeRemaining: (msg as any).secondsRemaining,
                turnTimeLimit: (msg as any).turnTimeLimit !== undefined ? (msg as any).turnTimeLimit : prev.turnTimeLimit,
              };
            });
            break;

          case 'HEADSOCCER_TICK':
            if (currentRoomStateRef.current !== 'GAME_ACTIVE' && currentRoomStateRef.current !== 'MATCH_SETTLED' && currentRoomStateRef.current !== 'FORFEITED') {
              currentRoomStateRef.current = 'GAME_ACTIVE';
              setRoomState('GAME_ACTIVE');
            }
            if (msg.gameData) {
              // Direct notification to render loop without forcing React component re-render
              gameTickSubscribersRef.current.forEach((cb) => {
                try {
                  cb(msg.gameData);
                } catch {}
              });

              // Intelligently update React DOM state ONLY when user-visible UI actually changes:
              // - Phase transition (KICKOFF_COUNTDOWN, PLAYING, GOAL_CELEBRATION, FULL_TIME)
              // - Score changed
              // - Integer clock second changed (once per sec)
              // - Kickoff countdown second changed (3 -> 2 -> 1 -> 0)
              // - Super activation toggled
              // - Heartbeat fallback at 1000ms
              const gd = msg.gameData;
              const now = Date.now();
              const isPhaseChanged = gd.phase !== lastHsPhaseRef.current;
              const isScoreChanged =
                gd.scoreA !== lastHsScoreARef.current ||
                gd.scoreB !== lastHsScoreBRef.current;
              const currentSec = Math.floor((gd.timeRemainingMs || 0) / 1000);
              const isTimeSecChanged = currentSec !== lastHsTimeSecRef.current;
              const isCountdownChanged = gd.countdownSec !== lastHsCountdownSecRef.current;
              const isSuperChanged =
                gd.playerA?.superActive !== lastHsSuperActiveARef.current ||
                gd.playerB?.superActive !== lastHsSuperActiveBRef.current;
              const isHeartbeat = now - lastHsReactUpdateRef.current >= 800;

              const shouldUpdateReact =
                isPhaseChanged ||
                isScoreChanged ||
                isTimeSecChanged ||
                isCountdownChanged ||
                isSuperChanged ||
                isHeartbeat;

              if (shouldUpdateReact) {
                lastHsReactUpdateRef.current = now;
                lastHsPhaseRef.current = gd.phase;
                lastHsScoreARef.current = gd.scoreA;
                lastHsScoreBRef.current = gd.scoreB;
                lastHsTimeSecRef.current = currentSec;
                lastHsCountdownSecRef.current = gd.countdownSec;
                lastHsSuperActiveARef.current = gd.playerA?.superActive;
                lastHsSuperActiveBRef.current = gd.playerB?.superActive;
                setGameData(gd);
              }
            }
            if (msg.scoreA !== undefined && msg.scoreA !== currentScoreARef.current) {
              currentScoreARef.current = msg.scoreA;
              setScoreA(msg.scoreA);
            }
            if (msg.scoreB !== undefined && msg.scoreB !== currentScoreBRef.current) {
              currentScoreBRef.current = msg.scoreB;
              setScoreB(msg.scoreB);
            }
            if (msg.secondsLeft !== undefined && msg.secondsLeft !== currentSecondsLeftRef.current) {
              currentSecondsLeftRef.current = msg.secondsLeft;
              setCountdownSeconds(msg.secondsLeft);
            }
            break;

          case 'BETTING_WINDOW_OPEN':
            setRoomState('BETTING_WINDOW');
            if (msg.message) setFeedMessage(msg.message);
            if (msg.durationSeconds) setCountdownSeconds(msg.durationSeconds);
            break;

          case 'BETTING_COUNTDOWN':
            if (msg.secondsLeft !== undefined) setCountdownSeconds(msg.secondsLeft);
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.oddsX) setOddsX(msg.oddsX);
            break;

          case 'ROUND_INITIALIZING':
            setRoomState('ROUND_START');
            setLastSignal(null);
            setRoundWinner(null);
            if (msg.round) setCurrentRound(msg.round);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'ROUND_WAITING':
            setRoomState('WAITING_FOR_SIGNAL');
            setLastSignal(null);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'DECOY_SIGNAL':
            setLastSignal('WAIT!');
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'SIGNAL_FIRE':
            setRoomState('SIGNAL_FIRED');
            setLastSignal('FIRE!');
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'ROUND_WON':
            setRoomState('ROUND_END');
            if (msg.reactionTimeMs !== undefined) setLastReactionTimeMs(msg.reactionTimeMs);
            if (msg.winnerAddress && wallet && msg.winnerAddress.toLowerCase() === wallet.toLowerCase()) {
              if (msg.reactionTimeMs !== undefined) {
                setPersonalReactionTimeMs((prev) => (!prev || msg.reactionTimeMs! < prev ? msg.reactionTimeMs! : prev));
              }
            }
            if (msg.scoreA !== undefined) setScoreA(msg.scoreA);
            if (msg.scoreB !== undefined) setScoreB(msg.scoreB);
            if (msg.winnerName) setRoundWinner(msg.winnerName);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'MISFIRE_PENALTY':
            setRoomState('ROUND_END');
            setLastSignal('MISFIRE!');
            if (msg.scoreA !== undefined) setScoreA(msg.scoreA);
            if (msg.scoreB !== undefined) setScoreB(msg.scoreB);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'ROUND_DRAW':
            setRoomState('ROUND_END');
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'GLOBAL_WIN':
            if ((msg as any).data) {
              window.dispatchEvent(
                new CustomEvent('sfida_global_win', { detail: (msg as any).data })
              );
            }
            break;

          case 'MATCH_SETTLED':
          case 'MATCH_FORFEITED':
            setRoomState(msg.type === 'MATCH_FORFEITED' ? 'FORFEITED' : 'MATCH_SETTLED');
            if (msg.winnerAddress) setMatchWinner(msg.winnerAddress);
            if (msg.winnerName) setMatchWinnerName(msg.winnerName);
            if (msg.winnerSide) setWinnerSide(msg.winnerSide);
            if (msg.resolution) setResolution(msg.resolution);
            if (msg.message) setFeedMessage(msg.message);
            setForfeitCountdown(null);
            if (msg.spectatorSettlements && Array.isArray(msg.spectatorSettlements)) {
              const mySettlement = msg.spectatorSettlements.find((s: any) => {
                if (telegramId && s.telegramId && String(s.telegramId) === String(telegramId)) return true;
                if (wallet && s.walletAddress) {
                  const normW = wallet.toLowerCase().trim();
                  const normS = s.walletAddress.toLowerCase().trim();
                  if (normW === normS) return true;
                }
                return false;
              });
              if (mySettlement) {
                setSpectatorOutcome({
                  won: mySettlement.won,
                  payoutGram: mySettlement.payoutGram,
                  refunded: mySettlement.refunded,
                });
                window.dispatchEvent(new CustomEvent('sfida_balance_updated'));
              }
            }
            if (msg.winnerAddress && wallet && msg.winnerAddress.toLowerCase() === wallet.toLowerCase()) {
              window.dispatchEvent(new CustomEvent('sfida_balance_updated'));
            }
            if (msg.winnerName && !msg.winnerName.includes('Nessun') && !msg.winnerName.includes('Pace')) {
              window.dispatchEvent(
                new CustomEvent('sfida_global_win', {
                  detail: {
                    id: `win_${msg.resolution?.matchId || Date.now()}`,
                    winnerName: msg.winnerName.replace(/^@/, ''),
                    gameType: msg.gameType || 'roulette',
                    payoutGram: msg.payoutTon || '1.92',
                    timestamp: Date.now(),
                  },
                })
              );
            }
            break;

          case 'SPECTATOR_BETS_REFUNDED':
            if (msg.message) setFeedMessage(msg.message);
            if (msg.spectatorSettlements && Array.isArray(msg.spectatorSettlements)) {
              const mySettlement = msg.spectatorSettlements.find((s: any) => {
                if (telegramId && s.telegramId && String(s.telegramId) === String(telegramId)) return true;
                if (wallet && s.walletAddress) {
                  const normW = wallet.toLowerCase().trim();
                  const normS = s.walletAddress.toLowerCase().trim();
                  if (normW === normS) return true;
                }
                return false;
              });
              if (mySettlement) {
                setSpectatorOutcome({
                  won: false,
                  payoutGram: mySettlement.payoutGram,
                  refunded: true,
                });
                window.dispatchEvent(new CustomEvent('sfida_balance_updated'));
              }
            }
            setPlacedBet(null);
            setBetStatus('idle');
            break;

          case 'ROOM_CANCELLED':
            setRoomState('CANCELLED');
            if (msg.message) setFeedMessage(msg.message);
            setForfeitCountdown(null);
            break;

          case 'KICKED_INACTIVITY':
            setKickedInactivity(msg.message || 'Sei stato rimosso dalla stanza per inattività del creatore.');
            setSocketError(msg.message || 'Sei stato rimosso dalla stanza per inattività del creatore.');
            setFeedMessage(msg.message || 'Sei stato rimosso per inattività del creatore.');
            window.dispatchEvent(new CustomEvent('sfida_balance_updated'));
            break;

          case 'PLAYER_B_TIMED_OUT':
            setFeedMessage(msg.message || 'Avversario rimosso per timeout inattività.');
            setSocketPlayerB(null);
            setPlayerBName(null);
            setPlayerBReady(false);
            setPlayerBConnected(false);
            break;

          case 'PLAYER_DISCONNECTED':
            if (msg.side === 'A') setPlayerAConnected(false);
            if (msg.side === 'B') setPlayerBConnected(false);
            if (msg.gracePeriodSeconds) setForfeitCountdown(msg.gracePeriodSeconds);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'PLAYER_DISCONNECTED_TICK':
            if (msg.side === 'A') setPlayerAConnected(false);
            if (msg.side === 'B') setPlayerBConnected(false);
            if (typeof msg.secondsLeft === 'number') setForfeitCountdown(msg.secondsLeft);
            break;

          case 'PLAYER_RECONNECTED':
            if (msg.side === 'A') setPlayerAConnected(true);
            if (msg.side === 'B') setPlayerBConnected(true);
            setForfeitCountdown(null);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'ODDS_UPDATE':
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.oddsX) setOddsX(msg.oddsX);
            if (msg.totalBetsA) setTotalBetsA(msg.totalBetsA);
            if (msg.totalBetsB) setTotalBetsB(msg.totalBetsB);
            if (msg.totalBetsX) setTotalBetsX(msg.totalBetsX);
            break;

          case 'REMATCH_OFFERED':
            if (msg.proposerWallet && msg.proposerName && msg.newWagerTon) {
              setRematchOffer({
                proposerWallet: msg.proposerWallet,
                proposerName: msg.proposerName,
                newWagerTon: msg.newWagerTon,
              });
            }
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'REMATCH_ACCEPTED':
            setIsRematch(true);
            setRematchOffer(null);
            setSocketError(null);
            setMatchWinner(null);
            setMatchWinnerName(null);
            setResolution(null);
            setRoomState('LOBBY');
            setCurrentRound(1);
            setScoreA(0);
            setScoreB(0);
            setPlayerAReady(false);
            setPlayerBReady(false);
            setPlacedBet(null);
            setSpectatorOutcome(null);
            setBetStatus('idle');
            setCountdownSeconds(null);
            setGameData(null);
            setLastSignal(null);
            setRoundWinner(null);
            setForfeitCountdown(null);
            setOddsA(msg.oddsA !== undefined ? msg.oddsA : 2.0);
            setOddsB(msg.oddsB !== undefined ? msg.oddsB : 2.0);
            setOddsX(msg.oddsX !== undefined ? msg.oddsX : 2.8);
            setTotalBetsA('0');
            setTotalBetsB('0');
            setTotalBetsX('0');
            if (msg.newWagerTon) setActiveWagerTon(msg.newWagerTon);
            if (msg.message) setFeedMessage(msg.message);
            window.dispatchEvent(new CustomEvent('sfida_rematch_accepted'));
            break;

          case 'REMATCH_DECLINED':
            setRematchOffer(null);
            setSocketError(null);
            setRematchDeclined(true);
            if (msg.message) setFeedMessage(msg.message);
            setTimeout(() => {
              setRematchDeclined(false);
            }, 6000);
            break;

          case 'BET_CONFIRMED':
            if (msg.target && msg.amountGram) {
              const bTarget = msg.target as 'A' | 'B' | 'X';
              setPlacedBet({
                target: bTarget,
                amountGram: msg.amountGram,
                feePaidGram: msg.feePaidGram || '0.05',
                targetName: bTarget === 'A' ? playerAName : (bTarget === 'B' ? (playerBName || 'Player B') : 'Peace (Both Split)'),
                odds: bTarget === 'A' ? oddsA : (bTarget === 'B' ? oddsB : oddsX),
              });
              setBetStatus('confirmed');
              setBetError(null);
              window.dispatchEvent(new CustomEvent('sfida_balance_refresh'));
            }
            break;

          case 'BET_ERROR':
            if (msg.message) {
              setBetError(msg.message);
              setBetStatus('error');
              setFeedMessage(msg.message);
            }
            break;

          case 'ERROR':
            if (msg.message) {
              setSocketError(msg.message);
              setFeedMessage(msg.message);
            }
            break;
        }
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    };

        ws.onclose = () => {
          setIsConnected(false);
          if (!isDisposed) {
            setFeedMessage('Connessione interrotta. Riconnessione in corso...');
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              if (!isDisposed) connect();
            }, 1200);
          }
        };
      } catch (err) {
        console.warn('[WebSocket] Safe catch on WebSocket init:', err);
        setIsConnected(false);
        setFeedMessage('Impossibile connettersi al server WebSocket.');
        if (!isDisposed) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            if (!isDisposed) connect();
          }, 2000);
        }
      }
    };

    reconnectRef.current = () => {
      if (isDisposed) return;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      setIsConnected(false);
      setFeedMessage('Riconnessione forzata...');
      connect();
    };

    connect();

    // Active ping heartbeat and dead-socket watchdog every 2 seconds for immediate drop detection
    pingTimer = setInterval(() => {
      const now = Date.now();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // If we haven't received ANY message (game tick, room update, or pong) in > 4500ms, socket is half-open / dead
        if (now - lastMsgAt > 4500) {
          console.warn('[WebSocket] Inactivity watchdog: no message or PONG received for >4.5s. Reconnecting...');
          setIsConnected(false);
          try {
            wsRef.current.close();
          } catch {}
          if (!isDisposed) {
            connect();
          }
          return;
        }
        try {
          wsRef.current.send(JSON.stringify({ type: 'PING' }));
        } catch {}
      }
    }, 2000);

    const handleUnload = () => {
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'LEAVE', wallet, telegramId }));
          wsRef.current.close(1000, 'Page hidden');
        }
      } catch {}
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      isDisposed = true;
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingTimer) clearInterval(pingTimer);
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'LEAVE', wallet, telegramId }));
          wsRef.current.close(1000, 'Disposed');
        }
      } catch {}
    };
  }, [matchId, role, wallet, telegramId, username, serverUrl]);

  const reconnect = useCallback(() => {
    reconnectRef.current();
  }, []);

  // Send action methods
  const sendReady = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'READY' }));
    }
  }, []);

  const sendTap = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'TAP', timestamp: Date.now() }));
    }
  }, []);

  const placeSpectatorBet = useCallback((target: 'A' | 'B' | 'X', amountNano: string) => {
    setBetError(null);
    setBetStatus('placing');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SPECTATOR_BET', target, amountNano }));
    } else {
      setBetError('Connessione WebSocket non attiva');
      setBetStatus('error');
    }
  }, []);

  const clearPlacedBet = useCallback(() => {
    setPlacedBet(null);
    setBetStatus('idle');
    setBetError(null);
  }, []);

  const requestRematch = useCallback(() => {
    setSocketError(null);
    setRematchDeclined(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH_REQUEST' }));
    }
  }, []);

  const acceptRematch = useCallback(() => {
    setSocketError(null);
    setRematchDeclined(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH_ACCEPT' }));
    }
  }, []);

  const declineRematch = useCallback(() => {
    setSocketError(null);
    setRematchDeclined(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH_DECLINE' }));
    }
  }, []);

  const sendRouletteShoot = useCallback((target: 'self' | 'opponent') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ROULETTE_SHOOT', target }));
    }
  }, []);

  const sendBlackjackAction = useCallback((choice: 'HIT' | 'STAND') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'BLACKJACK_ACTION', action: choice, choice }));
    }
  }, []);

  const sendBridgeStep = useCallback((choice: 'LEFT' | 'RIGHT') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'BRIDGE_STEP', choice }));
    }
  }, []);

  const sendBridgePass = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'BRIDGE_PASS' }));
    }
  }, []);

  const sendChronoStop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CHRONO_STOP' }));
    }
  }, []);

  const sendSplitStealChoice = useCallback((choice: 'SPLIT' | 'STEAL') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SPLIT_STEAL_CHOICE', choice }));
    }
  }, []);

  const sendShotgunShoot = useCallback((target: 'self' | 'opponent') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SHOTGUN_SHOOT', target }));
    }
  }, []);

  const sendShotgunUseItem = useCallback((item: ShotgunItem) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SHOTGUN_USE_ITEM', item }));
    }
  }, []);

  const sendConnect4Drop = useCallback((column: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CONNECT4_DROP', column }));
    }
  }, []);

  const sendCubeCountSubmit = useCallback((count: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CUBECOUNT_SUBMIT', count }));
    }
  }, []);

  const sendHeadSoccerInput = useCallback((input: {
    left?: boolean;
    right?: boolean;
    jump?: boolean;
    kick?: boolean;
    super?: boolean;
  }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'HEADSOCCER_INPUT', ...input }));
    }
  }, []);

  const sendPokerAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in', amount?: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'POKER_ACTION', action, amount, wallet, telegramUserId: telegramId, telegramId }));
      }
    },
    [wallet, telegramId]
  );

  return {
    isConnected,
    roomState,
    currentRound,
    scoreA,
    scoreB,
    oddsA,
    oddsB,
    oddsX,
    totalBetsA,
    totalBetsB,
    totalBetsX,
    lastSignal,
    feedMessage,
    lastReactionTimeMs,
    personalReactionTimeMs,
    countdownSeconds,
    forfeitCountdown,
    roundWinner,
    matchWinner,
    matchWinnerName,
    winnerSide,
    resolution,
    playerAName,
    playerBName,
    rematchOffer,
    rematchDeclined,
    activeWagerTon,
    gameType,
    gameData,
    playerAReady,
    playerBReady,
    playerAConnected,
    playerBConnected,
    sendReady,
    sendTap,
    sendRouletteShoot,
    sendBlackjackAction,
    sendBridgeStep,
    sendBridgePass,
    sendChronoStop,
    sendSplitStealChoice,
    sendShotgunShoot,
    sendShotgunUseItem,
    sendConnect4Drop,
    sendCubeCountSubmit,
    sendHeadSoccerInput,
    sendPokerAction,
    placeSpectatorBet,
    placedBet,
    betStatus,
    betError,
    clearPlacedBet,
    spectatorOutcome,
    setSpectatorOutcome,
    requestRematch,
    acceptRematch,
    declineRematch,
    socketError,
    setSocketError,
    socketRole,
    socketPlayerA,
    socketPlayerB,
    expiresAt,
    playerBExpiresAt,
    kickedInactivity,
    setKickedInactivity,
    isRematch,
    subscribeToGameTick,
    reconnect,
  };
}


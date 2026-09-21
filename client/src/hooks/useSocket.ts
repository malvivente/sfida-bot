import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomState, WsMessage, MatchResolution } from '../types/index.js';

interface UseSocketProps {
  matchId: string;
  wallet?: string;
  role: 'player' | 'spectator';
  telegramId?: string;
  username?: string;
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
  const [totalBetsA, setTotalBetsA] = useState<string>('0');
  const [totalBetsB, setTotalBetsB] = useState<string>('0');
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [feedMessage, setFeedMessage] = useState<string>('In attesa nella lobby del duello...');
  const [lastReactionTimeMs, setLastReactionTimeMs] = useState<number | null>(null);
  const [personalReactionTimeMs, setPersonalReactionTimeMs] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [forfeitCountdown, setForfeitCountdown] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);
  const [matchWinnerName, setMatchWinnerName] = useState<string | null>(null);
  const [resolution, setResolution] = useState<MatchResolution | null>(null);
  const [playerAName, setPlayerAName] = useState<string>('Player A');
  const [playerBName, setPlayerBName] = useState<string | null>(null);
  const [rematchOffer, setRematchOffer] = useState<{ proposerWallet: string; proposerName: string; newWagerTon: string } | null>(null);
  const [activeWagerTon, setActiveWagerTon] = useState<string>('1.00');

  useEffect(() => {
    if (!matchId) return;

    const wsEndpoint = resolveWsUrl(serverUrl);
    if (!wsEndpoint) {
      setIsConnected(false);
      setFeedMessage('Server di gioco in attesa di configurazione (VITE_WS_URL)...');
      return;
    }

    let ws: WebSocket | null = null;
    try {
      const url = `${wsEndpoint}/ws/duel?matchId=${matchId}&role=${role}&wallet=${wallet || ''}&telegramId=${telegramId || ''}&username=${encodeURIComponent(username || '')}`;
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setFeedMessage('Connesso all\'Arena Cyber.');
      };

      ws.onerror = (e) => {
        console.warn('[WebSocket] Warning/error on connection:', e);
        setIsConnected(false);
        setFeedMessage('Server di gioco temporaneamente non raggiungibile.');
      };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'INIT_STATE':
            if (msg.state) setRoomState(msg.state);
            if (msg.currentRound) setCurrentRound(msg.currentRound);
            if (msg.scoreA !== undefined) setScoreA(msg.scoreA);
            if (msg.scoreB !== undefined) setScoreB(msg.scoreB);
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.totalBetsA) setTotalBetsA(msg.totalBetsA);
            if (msg.totalBetsB) setTotalBetsB(msg.totalBetsB);
            if (msg.winnerAddress) setMatchWinner(msg.winnerAddress);
            if (msg.winnerName) setMatchWinnerName(msg.winnerName);
            if (msg.resolution) setResolution(msg.resolution);
            if (msg.playerAName) setPlayerAName(msg.playerAName);
            if (msg.playerBName) setPlayerBName(msg.playerBName);
            if (msg.wagerTon) setActiveWagerTon(msg.wagerTon);
            break;

          case 'ROOM_UPDATE':
            if (msg.state) setRoomState(msg.state);
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.winnerAddress) setMatchWinner(msg.winnerAddress);
            if (msg.winnerName) setMatchWinnerName(msg.winnerName);
            if (msg.resolution) setResolution(msg.resolution);
            if (msg.playerAName) setPlayerAName(msg.playerAName);
            if (msg.playerBName) setPlayerBName(msg.playerBName);
            if (msg.wagerTon) setActiveWagerTon(msg.wagerTon);
            if (msg.playerA?.name) setPlayerAName(msg.playerA.name);
            if (msg.playerB?.name) setPlayerBName(msg.playerB.name);
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

          case 'MATCH_SETTLED':
          case 'MATCH_FORFEITED':
            setRoomState('MATCH_SETTLED');
            if (msg.winnerAddress) setMatchWinner(msg.winnerAddress);
            if (msg.winnerName) setMatchWinnerName(msg.winnerName);
            if (msg.resolution) setResolution(msg.resolution);
            if (msg.message) setFeedMessage(msg.message);
            setForfeitCountdown(null);
            break;

          case 'PLAYER_DISCONNECTED':
            if (msg.gracePeriodSeconds) setForfeitCountdown(msg.gracePeriodSeconds);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'PLAYER_RECONNECTED':
            setForfeitCountdown(null);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'ODDS_UPDATE':
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
            if (msg.totalBetsA) setTotalBetsA(msg.totalBetsA);
            if (msg.totalBetsB) setTotalBetsB(msg.totalBetsB);
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
            setRematchOffer(null);
            setMatchWinner(null);
            setMatchWinnerName(null);
            setResolution(null);
            setRoomState('LOBBY');
            setCurrentRound(1);
            setScoreA(0);
            setScoreB(0);
            if (msg.newWagerTon) setActiveWagerTon(msg.newWagerTon);
            if (msg.message) setFeedMessage(msg.message);
            break;

          case 'REMATCH_DECLINED':
            setRematchOffer(null);
            if (msg.message) setFeedMessage(msg.message);
            break;
        }
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    };

      ws.onclose = () => {
        setIsConnected(false);
        setFeedMessage('Disconnesso dal server.');
      };
    } catch (err) {
      console.warn('[WebSocket] Safe catch on WebSocket init:', err);
      setIsConnected(false);
      setFeedMessage('Impossibile connettersi al server WebSocket.');
    }

    return () => {
      try {
        ws?.close();
      } catch {}
    };
  }, [matchId, role, wallet, telegramId, username, serverUrl]);

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

  const placeSpectatorBet = useCallback((target: 'A' | 'B', amountNano: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SPECTATOR_BET', target, amountNano }));
    }
  }, []);

  const requestRematch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH_REQUEST' }));
    }
  }, []);

  const acceptRematch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH_ACCEPT' }));
    }
  }, []);

  const declineRematch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH_DECLINE' }));
    }
  }, []);

  return {
    isConnected,
    roomState,
    currentRound,
    scoreA,
    scoreB,
    oddsA,
    oddsB,
    totalBetsA,
    totalBetsB,
    lastSignal,
    feedMessage,
    lastReactionTimeMs,
    personalReactionTimeMs,
    countdownSeconds,
    forfeitCountdown,
    roundWinner,
    matchWinner,
    matchWinnerName,
    resolution,
    playerAName,
    playerBName,
    rematchOffer,
    activeWagerTon,
    sendReady,
    sendTap,
    placeSpectatorBet,
    requestRematch,
    acceptRematch,
    declineRematch,
  };
}

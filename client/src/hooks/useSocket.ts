import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomState, WsMessage } from '../types/index.js';

interface UseSocketProps {
  matchId: string;
  wallet?: string;
  role: 'player' | 'spectator';
  telegramId?: string;
  username?: string;
  serverUrl?: string;
}

export function useSocket({
  matchId,
  wallet,
  role,
  telegramId,
  username,
  serverUrl = 'ws://localhost:3000',
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
  const [feedMessage, setFeedMessage] = useState<string>('Waiting in duel lobby...');
  const [lastReactionTimeMs, setLastReactionTimeMs] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [forfeitCountdown, setForfeitCountdown] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const url = `${serverUrl}/ws/duel?matchId=${matchId}&role=${role}&wallet=${wallet || ''}&telegramId=${telegramId || ''}&username=${encodeURIComponent(username || '')}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setFeedMessage('Connected to Cyber Arena Server.');
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
            break;

          case 'ROOM_UPDATE':
            if (msg.state) setRoomState(msg.state);
            if (msg.oddsA) setOddsA(msg.oddsA);
            if (msg.oddsB) setOddsB(msg.oddsB);
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
            setLastSignal('HOLD!');
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
        }
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setFeedMessage('Disconnected from server.');
    };

    return () => {
      ws.close();
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
    countdownSeconds,
    forfeitCountdown,
    roundWinner,
    matchWinner,
    sendReady,
    sendTap,
    placeSpectatorBet,
  };
}

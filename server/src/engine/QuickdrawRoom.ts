import { WebSocket } from 'ws';
import { Address } from '@ton/core';
import { signerService } from '../services/signer.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';

export type RoomState =
  | 'WAITING_FOR_DEPLOY'
  | 'LOBBY'
  | 'BETTING_WINDOW'
  | 'ROUND_START'
  | 'WAITING_FOR_SIGNAL'
  | 'SIGNAL_FIRED'
  | 'ROUND_END'
  | 'MATCH_SETTLED'
  | 'FORFEITED';

export interface MatchResolutionPayload {
  matchId: string;
  escrowAddress: string;
  winner: string;
  timestamp: number;
  signatureHex: string;
  signatureCellBoc: string;
}

export interface PlayerSession {
  walletAddress: string;
  telegramId: string;
  username: string;
  ws?: WebSocket;
  connected: boolean;
  ready: boolean;
  score: number;
  lastReactionTimeMs?: number;
  bestReactionTimeMs?: number;
  disconnectTimer?: NodeJS.Timeout;
}

export interface SpectatorSession {
  id: string;
  ws: WebSocket;
  betOn?: 'A' | 'B';
  betAmount?: number;
}

export interface RoomConfig {
  matchId: bigint;
  wagerAmountNano: bigint;
  playerAAddress: string;
  playerBAddress?: string;
  recruiterA?: string;
  recruiterB?: string;
  groupAdminAddress?: string;
  bettingWindowSeconds?: number;
  escrowAddress?: string;
}

export class QuickdrawRoom {
  public matchId: bigint;
  public config: RoomConfig;
  public escrowAddress?: string;
  public state: RoomState = 'LOBBY';

  public playerA: PlayerSession;
  public playerB?: PlayerSession;
  public spectators: Map<string, SpectatorSession> = new Map();

  public currentRound: number = 1;
  public maxRounds: number = 3;
  public roundsToWin: number = 2; // Best of 3

  private fireTimestamp: number = 0;
  private signalTimer?: NodeJS.Timeout;
  private decoyTimer?: NodeJS.Timeout;
  private bettingTimer?: NodeJS.Timeout;
  private roundTimeout?: NodeJS.Timeout;

  public totalBetsA: bigint = 0n;
  public totalBetsB: bigint = 0n;

  public winnerAddress?: string;
  public winnerName?: string;
  public resolution?: MatchResolutionPayload;
  public forfeitWinner?: string;

  private onMatchSettledCallback?: (room: QuickdrawRoom, winnerAddress: string) => Promise<void>;

  constructor(config: RoomConfig, onSettled?: (room: QuickdrawRoom, winner: string) => Promise<void>) {
    this.matchId = config.matchId;
    this.config = config;
    this.escrowAddress = config.escrowAddress;
    this.onMatchSettledCallback = onSettled;

    this.playerA = {
      walletAddress: config.playerAAddress,
      telegramId: '',
      username: 'Player A',
      connected: false,
      ready: false,
      score: 0,
    };

    if (config.playerBAddress) {
      this.playerB = {
        walletAddress: config.playerBAddress,
        telegramId: '',
        username: 'Player B',
        connected: false,
        ready: false,
        score: 0,
      };
    }
  }

  public isSameWallet(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    if (a.toLowerCase() === b.toLowerCase()) return true;
    try {
      return Address.parse(a).equals(Address.parse(b));
    } catch {
      return false;
    }
  }

  // Bind WebSocket to Player A or B
  public attachPlayer(wallet: string, telegramId: string, username: string, ws: WebSocket): boolean {
    if (
      this.isSameWallet(wallet, this.playerA.walletAddress) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId))
    ) {
      this.handlePlayerConnect(this.playerA, telegramId, username, ws, 'A');
      return true;
    }

    if (
      this.playerB &&
      (this.isSameWallet(wallet, this.playerB.walletAddress) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId)))
    ) {
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B');
      return true;
    }

    // Only assign Player B if specifically invited in match config
    if (!this.playerB && this.config.playerBAddress && this.isSameWallet(wallet, this.config.playerBAddress)) {
      this.playerB = {
        walletAddress: wallet,
        telegramId,
        username,
        ws,
        connected: true,
        ready: false,
        score: 0,
      };
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B');
      return true;
    }

    return false;
  }

  private handlePlayerConnect(
    player: PlayerSession,
    telegramId: string,
    username: string,
    ws: WebSocket,
    side: 'A' | 'B'
  ) {
    player.ws = ws;
    player.telegramId = telegramId;
    player.username = username;
    player.connected = true;

    // Clear 8-second disconnection grace timer if active
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
      this.broadcast({
        type: 'PLAYER_RECONNECTED',
        side,
        message: `${player.username} reconnected in time! Resuming duel.`,
      });
    }

    this.sendTo(ws, {
      type: 'INIT_STATE',
      matchId: this.matchId.toString(),
      role: `PLAYER_${side}`,
      state: this.state,
      currentRound: this.currentRound,
      scoreA: this.playerA.score,
      scoreB: this.playerB ? this.playerB.score : 0,
      playerAName: this.playerA.username,
      playerBName: this.playerB ? this.playerB.username : undefined,
      wagerTon: (Number(this.config.wagerAmountNano) / 1e9).toFixed(2),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
    });

    this.broadcastRoomState();
  }

  // Spectator connection
  public attachSpectator(id: string, ws: WebSocket) {
    this.spectators.set(id, { id, ws });

    this.sendTo(ws, {
      type: 'INIT_STATE',
      matchId: this.matchId.toString(),
      role: 'SPECTATOR',
      state: this.state,
      currentRound: this.currentRound,
      scoreA: this.playerA.score,
      scoreB: this.playerB ? this.playerB.score : 0,
      playerAName: this.playerA.username,
      playerBName: this.playerB ? this.playerB.username : undefined,
      wagerTon: (Number(this.config.wagerAmountNano) / 1e9).toFixed(2),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
    });
  }

  public removeSpectator(id: string) {
    this.spectators.delete(id);
  }

  // Handle Player Disconnect with 8-Second Grace Period
  public handleDisconnect(wallet: string) {
    let disconnectedPlayer: PlayerSession | undefined;
    let opponent: PlayerSession | undefined;
    let side: 'A' | 'B' = 'A';

    if (this.isSameWallet(wallet, this.playerA.walletAddress)) {
      disconnectedPlayer = this.playerA;
      opponent = this.playerB;
      side = 'A';
    } else if (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress)) {
      disconnectedPlayer = this.playerB;
      opponent = this.playerA;
      side = 'B';
    }

    if (!disconnectedPlayer) return;

    disconnectedPlayer.connected = false;
    disconnectedPlayer.ws = undefined;

    // Clear any existing timer
    if (disconnectedPlayer.disconnectTimer) {
      clearTimeout(disconnectedPlayer.disconnectTimer);
      disconnectedPlayer.disconnectTimer = undefined;
    }

    // ONLY activate forfeit countdown if an actual match/combat round is active!
    // In 'LOBBY' or 'WAITING_FOR_DEPLOY', the duel has NOT begun; disconnection must NEVER trigger a forfeit.
    const isCombatActive = [
      'ROUND_START',
      'WAITING_FOR_SIGNAL',
      'SIGNAL_FIRED',
      'ROUND_END',
    ].includes(this.state);

    if (isCombatActive && opponent) {
      this.broadcast({
        type: 'PLAYER_DISCONNECTED',
        side,
        gracePeriodSeconds: 8,
        message: `${disconnectedPlayer.username} disconnected. 8-second forfeit countdown initiated.`,
      });

      disconnectedPlayer.disconnectTimer = setTimeout(() => {
        if (!disconnectedPlayer?.connected && opponent) {
          this.triggerForfeit(opponent.walletAddress, disconnectedPlayer!.username);
        }
      }, 8000);
    } else {
      // In LOBBY, simply inform that the player stepped away without any forfeit penalty
      this.broadcast({
        type: 'PLAYER_DISCONNECTED',
        side,
        message: `${disconnectedPlayer.username} stepped away from the room.`,
      });
      this.broadcastRoomState();
    }
  }

  // Immediate forfeit when 8-second grace timer expires
  private triggerForfeit(winnerWallet: string, forfeiterName: string) {
    this.state = 'FORFEITED';
    this.forfeitWinner = winnerWallet;
    this.settleMatch(winnerWallet);
  }

  // Confirm deployment of MatchEscrow on TON blockchain by Player 1
  public confirmDeploy(): boolean {
    if (this.state === 'WAITING_FOR_DEPLOY') {
      this.state = 'LOBBY';
      this.broadcastRoomState();
      console.log(`[QuickdrawRoom] Match #${this.matchId} transitioned from WAITING_FOR_DEPLOY to LOBBY.`);
      return true;
    }
    return false;
  }

  // Player Ready Toggle
  public setPlayerReady(wallet: string, telegramId?: string) {
    if (
      this.isSameWallet(wallet, this.playerA.walletAddress) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId))
    ) {
      this.playerA.ready = true;
    } else if (
      this.playerB &&
      (this.isSameWallet(wallet, this.playerB.walletAddress) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId)))
    ) {
      this.playerB.ready = true;
    }

    this.broadcastRoomState();

    // When both players are ready, open Betting Window
    if (this.playerA.ready && this.playerB?.ready && this.state === 'LOBBY') {
      this.startBettingWindow();
    }
  }

  // Spectator Pari-Mutuel Window (20s with spectators, 5s without)
  public startBettingWindow() {
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = undefined;
    }

    this.state = 'BETTING_WINDOW';
    const duration = this.config.bettingWindowSeconds || (this.spectators.size > 0 ? 20 : 5);
    let countdown = duration;

    this.broadcast({
      type: 'BETTING_WINDOW_OPEN',
      durationSeconds: duration,
      message: this.spectators.size > 0
        ? 'Spectator Pari-Mutuel betting window is open! 20 seconds to place wagers.'
        : 'Both fighters ready! Duel starts in 5 seconds...',
    });

    this.bettingTimer = setInterval(() => {
      countdown -= 1;
      this.broadcast({
        type: 'BETTING_COUNTDOWN',
        secondsLeft: countdown,
        oddsA: this.calculateOdds('A'),
        oddsB: this.calculateOdds('B'),
      });

      if (countdown <= 0) {
        if (this.bettingTimer) {
          clearInterval(this.bettingTimer);
          this.bettingTimer = undefined;
        }
        this.startRound(1);
      }
    }, 1000);
  }

  // Start Quickdraw Round (Best of 3)
  private startRound(roundNum: number) {
    this.currentRound = roundNum;
    this.state = 'ROUND_START';
    this.fireTimestamp = 0;
    this.cleanupRoundTimers();

    this.broadcast({
      type: 'ROUND_INITIALIZING',
      round: this.currentRound,
      scoreA: this.playerA.score,
      scoreB: this.playerB?.score || 0,
      message: `Round ${this.currentRound} - Best of 3! Get ready...`,
    });

    // 2-second preparation before arming triggers
    setTimeout(() => {
      this.state = 'WAITING_FOR_SIGNAL';
      this.broadcast({
        type: 'ROUND_WAITING',
        message: 'HOLD YOUR FIRE! Wait for the real signal.',
      });

      this.scheduleDecoyAndFireSignal();
    }, 2000);
  }

  // Randomized Trigger (1,800ms - 4,200ms) with False-Start / Decoy "WAIT!" Protection
  private scheduleDecoyAndFireSignal() {
    // Generate random delay between 1,800ms and 4,200ms
    const randomDelay = Math.floor(Math.random() * (4200 - 1800 + 1)) + 1800;

    // 50% chance to emit a false decoy "WAIT!" signal halfway through
    const shouldDecoy = Math.random() > 0.5;
    if (shouldDecoy && randomDelay > 2400) {
      const decoyDelay = Math.floor(randomDelay / 2);
      this.decoyTimer = setTimeout(() => {
        if (this.state === 'WAITING_FOR_SIGNAL') {
          this.broadcast({
            type: 'DECOY_SIGNAL',
            signal: 'WAIT!',
            message: 'WAIT! Do NOT tap!',
          });
        }
      }, decoyDelay);
    }

    // Arm the genuine FIRE signal
    this.signalTimer = setTimeout(() => {
      this.state = 'SIGNAL_FIRED';
      this.fireTimestamp = performance.now();

      this.broadcast({
        type: 'SIGNAL_FIRE',
        signal: 'FIRE!',
        serverTime: Date.now(),
        message: '>>> FIRE NOW! <<<',
      });

      // If no player taps within 5 seconds after signal, declare draw for the round
      this.roundTimeout = setTimeout(() => {
        if (this.state === 'SIGNAL_FIRED') {
          this.handleRoundDraw();
        }
      }, 5000);
    }, randomDelay);
  }

  // Authoritative Tap Evaluation
  public handleTap(wallet: string): { accepted: boolean; reason?: string } {
    const isPlayerA = this.isSameWallet(wallet, this.playerA.walletAddress);
    const isPlayerB = Boolean(this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress));

    if (!isPlayerA && !isPlayerB) {
      return { accepted: false, reason: 'Sender is not an active duelist' };
    }

    const tappingSide = isPlayerA ? 'A' : 'B';
    const opponentSide = isPlayerA ? 'B' : 'A';
    const tappingPlayer = isPlayerA ? this.playerA : this.playerB!;
    const opponentPlayer = isPlayerA ? this.playerB! : this.playerA;

    // 1. MISFIRE EVALUATION: Tapping during WAITING_FOR_SIGNAL triggers instant round loss!
    if (this.state === 'WAITING_FOR_SIGNAL' || this.state === 'ROUND_START') {
      this.cleanupRoundTimers();
      this.state = 'ROUND_END';

      // Opponent wins round automatically due to misfire
      opponentPlayer.score += 1;

      this.broadcast({
        type: 'MISFIRE_PENALTY',
        offender: tappingPlayer.walletAddress,
        offenderName: tappingPlayer.username,
        roundWinner: opponentPlayer.walletAddress,
        scoreA: this.playerA.score,
        scoreB: this.playerB?.score || 0,
        message: `FALSE START! ${tappingPlayer.username} misfired! Round awarded to ${opponentPlayer.username}.`,
      });

      this.evaluateMatchProgression();
      return { accepted: true };
    }

    // 2. VALID TAP EVALUATION: After genuine "FIRE!" signal
    if (this.state === 'SIGNAL_FIRED') {
      this.cleanupRoundTimers();
      this.state = 'ROUND_END';

      const now = performance.now();
      const reactionTimeMs = parseFloat((now - this.fireTimestamp).toFixed(2));
      tappingPlayer.lastReactionTimeMs = reactionTimeMs;
      if (!tappingPlayer.bestReactionTimeMs || reactionTimeMs < tappingPlayer.bestReactionTimeMs) {
        tappingPlayer.bestReactionTimeMs = reactionTimeMs;
      }
      tappingPlayer.score += 1;

      this.broadcast({
        type: 'ROUND_WON',
        winnerSide: tappingSide,
        winnerAddress: tappingPlayer.walletAddress,
        winnerName: tappingPlayer.username,
        reactionTimeMs,
        scoreA: this.playerA.score,
        scoreB: this.playerB?.score || 0,
        message: `${tappingPlayer.username} fired first with lightning reaction time: ${reactionTimeMs}ms!`,
      });

      this.evaluateMatchProgression();
      return { accepted: true };
    }

    return { accepted: false, reason: 'Tap ignored in current state' };
  }

  private handleRoundDraw() {
    this.state = 'ROUND_END';
    this.broadcast({
      type: 'ROUND_DRAW',
      message: 'Both players failed to fire in time! Round is a draw.',
    });
    this.evaluateMatchProgression();
  }

  // Evaluate Best-of-3 status
  private evaluateMatchProgression() {
    // Check if either player reached 2 wins
    if (this.playerA.score >= this.roundsToWin) {
      this.settleMatch(this.playerA.walletAddress);
      return;
    }

    if (this.playerB && this.playerB.score >= this.roundsToWin) {
      this.settleMatch(this.playerB.walletAddress);
      return;
    }

    // If max rounds reached or need next round
    if (this.currentRound < this.maxRounds) {
      setTimeout(() => {
        this.startRound(this.currentRound + 1);
      }, 3000);
    } else {
      // Tie breaker or decide by score
      const winner =
        this.playerA.score > (this.playerB?.score || 0)
          ? this.playerA.walletAddress
          : this.playerB!.walletAddress;
      this.settleMatch(winner);
    }
  }

  // Final Match Settlement
  private settleMatch(winnerAddress: string) {
    if (this.state !== 'FORFEITED') {
      this.state = 'MATCH_SETTLED';
    }
    this.winnerAddress = winnerAddress;
    this.cleanupTimers();

    const winnerName =
      this.isSameWallet(winnerAddress, this.playerA.walletAddress)
        ? this.playerA.username
        : this.playerB?.username || 'Opponent';
    this.winnerName = winnerName;

    const timestamp = Math.floor(Date.now() / 1000);
    const { signatureHex, signatureCellBoc } = signerService.signResolution(
      this.matchId,
      winnerAddress,
      timestamp
    );

    this.resolution = {
      matchId: this.matchId.toString(),
      escrowAddress: this.escrowAddress || '',
      winner: winnerAddress,
      timestamp,
      signatureHex,
      signatureCellBoc,
    };

    console.log(`[QuickdrawRoom] Match #${this.matchId} settled. Winner: ${winnerName} (${winnerAddress})`);

    this.broadcast({
      type: 'MATCH_SETTLED',
      matchId: this.matchId.toString(),
      winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
      finalScoreA: this.playerA.score,
      finalScoreB: this.playerB?.score || 0,
      bestReactionPlayerA: this.playerA.bestReactionTimeMs,
      bestReactionPlayerB: this.playerB?.bestReactionTimeMs,
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      message: `DUEL COMPLETE! ${winnerName} reigns supreme in the Arena!`,
    });

    // Save match permanently in DatabaseService
    const wagerGram = (parseFloat(this.config.wagerAmountNano.toString()) / 1e9).toFixed(2);
    const wagerNum = parseFloat(wagerGram);
    const totalPot = wagerNum * 2;
    const { duelRakePercent } = feeConfig.getConfig();
    const rakeShare = duelRakePercent / 100;
    const winnerShare = 1 - rakeShare;
    const winnerPayoutGram = (totalPot * winnerShare).toFixed(2);
    const rakeGram = (totalPot * rakeShare).toFixed(2);

    // Credit winner's in-bot balance
    dbService.creditUserBalance(winnerAddress, winnerPayoutGram, 'MATCH_WIN', `Won duel #${this.matchId}`).catch((err) => {
      console.error(`[QuickdrawRoom] Error crediting winner balance for match #${this.matchId}:`, err);
    });

    // Credit platform rake to Treasury
    dbService.creditTreasury(rakeGram, 'DUEL_RAKE', this.matchId.toString()).catch((err) => {
      console.error(`[QuickdrawRoom] Error crediting duel rake for match #${this.matchId}:`, err);
    });

    const winnerTelegramId = winnerAddress === this.playerA.walletAddress
      ? this.playerA.telegramId
      : this.playerB?.telegramId;

    dbService
      .saveMatch({
        matchId: this.matchId.toString(),
        escrowAddress: this.escrowAddress,
        wagerAmountNano: this.config.wagerAmountNano.toString(),
        wagerTon: wagerGram,
        wagerGram,
        playerAAddress: this.playerA.walletAddress,
        playerAName: this.playerA.username,
        playerATelegramId: this.playerA.telegramId,
        playerBAddress: this.playerB?.walletAddress,
        playerBName: this.playerB?.username,
        playerBTelegramId: this.playerB?.telegramId,
        winnerAddress,
        winnerName: this.winnerName,
        winnerTelegramId,
        scoreA: this.playerA.score,
        scoreB: this.playerB?.score || 0,
        bestReactionPlayerA: this.playerA.bestReactionTimeMs,
        bestReactionPlayerB: this.playerB?.bestReactionTimeMs,
        settledAt: Date.now(),
        createdAt: Number(this.matchId) || Date.now(),
      })
      .catch((err) => {
        console.error('[QuickdrawRoom] Error saving match to dbService:', err);
      });

    // Auto-cleanup room from RoomManager memory after 90 seconds
    setTimeout(async () => {
      try {
        const { RoomManager } = await import('./RoomManager.js');
        RoomManager.getInstance().removeRoom(this.matchId.toString());
        console.log(`[QuickdrawRoom] Auto-cleaned settled match #${this.matchId} from RoomManager`);
      } catch (e) {
        console.warn('[QuickdrawRoom] Error during room cleanup:', e);
      }
    }, 90_000);

    if (this.onMatchSettledCallback) {
      this.onMatchSettledCallback(this, winnerAddress);
    }
  }

  // Update spectator betting pool
  public registerSpectatorBet(target: 'A' | 'B', amountNano: bigint, bettorWallet?: string) {
    if (
      bettorWallet &&
      (this.isSameWallet(bettorWallet, this.playerA.walletAddress) ||
        (this.playerB && this.isSameWallet(bettorWallet, this.playerB.walletAddress)))
    ) {
      console.warn(`[QuickdrawRoom] Duelist ${bettorWallet} attempted to place a spectator bet. Denied.`);
      return;
    }

    if (target === 'A') {
      this.totalBetsA += amountNano;
    } else {
      this.totalBetsB += amountNano;
    }

    this.broadcast({
      type: 'ODDS_UPDATE',
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
    });
  }

  // Pari-Mutuel Odds Multiplier Calculator (Zero-Risk Totalizer)
  // M_W = (0.94 * S_total) / S_winning_side
  public calculateOdds(side: 'A' | 'B'): number {
    const totalPool = Number(this.totalBetsA + this.totalBetsB);
    if (totalPool === 0) return 2.0; // default 2.0x

    const distributablePool = totalPool * 0.94;
    const sideBets = side === 'A' ? Number(this.totalBetsA) : Number(this.totalBetsB);

    if (sideBets === 0) return 2.0;
    return parseFloat((distributablePool / sideBets).toFixed(2));
  }

  // Broadcast to all duelists and spectators
  public broadcast(data: any) {
    const payload = JSON.stringify(data);

    if (this.playerA.ws && this.playerA.ws.readyState === WebSocket.OPEN) {
      this.playerA.ws.send(payload);
    }

    if (this.playerB?.ws && this.playerB.ws.readyState === WebSocket.OPEN) {
      this.playerB.ws.send(payload);
    }

    for (const spec of this.spectators.values()) {
      if (spec.ws.readyState === WebSocket.OPEN) {
        spec.ws.send(payload);
      }
    }
  }

  public requestRematch(proposerWallet: string, proposerName: string) {
    if (this.state !== 'MATCH_SETTLED' && this.state !== 'FORFEITED') {
      console.warn(`[QuickdrawRoom] Rematch requested for match #${this.matchId} while not settled.`);
      return;
    }

    const newWagerNano = this.config.wagerAmountNano * 2n;
    const newWagerTon = (Number(newWagerNano) / 1e9).toFixed(2);

    console.log(`[QuickdrawRoom] Rematch 2X requested by ${proposerName} (${proposerWallet}) for ${newWagerTon} TON`);

    this.broadcast({
      type: 'REMATCH_OFFERED',
      proposerWallet,
      proposerName,
      newWagerTon,
      newWagerNano: newWagerNano.toString(),
      message: `${proposerName} challenged you to a REMATCH with 2X Wager (${newWagerTon} TON)!`,
    });
  }

  public acceptRematch(acceptorWallet: string) {
    if (this.state !== 'MATCH_SETTLED' && this.state !== 'FORFEITED') return;

    this.config.wagerAmountNano = this.config.wagerAmountNano * 2n;
    const newWagerTon = (Number(this.config.wagerAmountNano) / 1e9).toFixed(2);

    this.state = 'LOBBY';
    this.currentRound = 1;
    this.playerA.score = 0;
    this.playerA.ready = false;
    if (this.playerB) {
      this.playerB.score = 0;
      this.playerB.ready = false;
    }
    this.winnerAddress = undefined;
    this.winnerName = undefined;
    this.resolution = undefined;
    this.forfeitWinner = undefined;
    this.cleanupTimers();

    console.log(`[QuickdrawRoom] Rematch accepted by ${acceptorWallet}. Match #${this.matchId} wager doubled to ${newWagerTon} TON`);

    this.broadcast({
      type: 'REMATCH_ACCEPTED',
      newWagerTon,
      message: `Rematch accepted! Wager doubled to ${newWagerTon} TON. Both players ready up!`,
    });

    this.broadcastRoomState();
  }

  public declineRematch(declinerWallet: string) {
    this.broadcast({
      type: 'REMATCH_DECLINED',
      declinerWallet,
      message: 'Rematch offer was declined.',
    });
  }

  public broadcastRoomState() {
    this.broadcast({
      type: 'ROOM_UPDATE',
      state: this.state,
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
      playerAName: this.playerA.username,
      playerBName: this.playerB ? this.playerB.username : undefined,
      wagerTon: (Number(this.config.wagerAmountNano) / 1e9).toFixed(2),
      playerA: {
        wallet: this.playerA.walletAddress,
        name: this.playerA.username,
        ready: this.playerA.ready,
        score: this.playerA.score,
        connected: this.playerA.connected,
      },
      playerB: this.playerB
        ? {
            wallet: this.playerB.walletAddress,
            name: this.playerB.username,
            ready: this.playerB.ready,
            score: this.playerB.score,
            connected: this.playerB.connected,
          }
        : null,
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
    });
  }

  private sendTo(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private cleanupRoundTimers() {
    if (this.signalTimer) clearTimeout(this.signalTimer);
    if (this.decoyTimer) clearTimeout(this.decoyTimer);
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
  }

  public abortRoom(reason: string = 'Match was cancelled.') {
    this.cleanupTimers();
    this.state = 'FORFEITED';
    this.broadcast({
      type: 'ROOM_CANCELLED',
      state: 'CANCELLED',
      message: reason,
    });
  }

  public cleanupTimers() {
    this.cleanupRoundTimers();
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = undefined;
    }
    if (this.playerA.disconnectTimer) {
      clearTimeout(this.playerA.disconnectTimer);
      this.playerA.disconnectTimer = undefined;
    }
    if (this.playerB?.disconnectTimer) {
      clearTimeout(this.playerB.disconnectTimer);
      this.playerB.disconnectTimer = undefined;
    }
  }
}

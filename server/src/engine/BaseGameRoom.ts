import { WebSocket } from 'ws';
import { Address } from '@ton/core';
import { GameType, RoomState } from '../types/gameTypes.js';
import { signerService } from '../services/signer.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';

export interface RoomConfig {
  matchId: bigint;
  gameType?: GameType;
  wagerAmountNano: bigint;
  playerAAddress: string;
  playerBAddress?: string;
  recruiterA?: string;
  groupAdminAddress?: string;
  escrowAddress?: string;
  bettingWindowSeconds?: number;
  isPrivate?: boolean;
  inviteCode?: string;
}

export interface SpectatorBet {
  walletAddress: string;
  telegramId?: string;
  target: 'A' | 'B' | 'X';
  amountGram: number;
  amountNano: bigint;
  feePaidGram: number;
  timestamp: number;
}

export interface PlayerSession {
  walletAddress: string;
  telegramId: string;
  username: string;
  ws?: WebSocket;
  connected: boolean;
  ready: boolean;
  score: number;
  disconnectTimer?: NodeJS.Timeout;
}

export interface SpectatorSession {
  id: string;
  ws: WebSocket;
}

export interface MatchResolutionPayload {
  matchId: string;
  winnerAddress: string;
  timestamp: number;
  signatureHex: string;
  signatureCellBoc: string;
}

export abstract class BaseGameRoom {
  public matchId: bigint;
  public gameType: GameType;
  public config: RoomConfig;
  public escrowAddress?: string;
  public state: RoomState = 'LOBBY';

  public playerA: PlayerSession;
  public playerB?: PlayerSession;
  public spectators: Map<string, SpectatorSession> = new Map();

  protected bettingTimer?: NodeJS.Timeout;

  public totalBetsA: bigint = 0n;
  public totalBetsB: bigint = 0n;
  public totalBetsX: bigint = 0n;

  public winnerAddress?: string;
  public winnerName?: string;
  public resolution?: MatchResolutionPayload;
  public forfeitWinner?: string;

  public isPrivate: boolean = false;
  public inviteCode?: string;
  public spectatorBets: SpectatorBet[] = [];

  public rematchProposerWallet?: string;
  public rematchNewWagerNano?: bigint;
  public isRematch: boolean = false;
  protected settleCleanupTimer?: NodeJS.Timeout;

  private onMatchSettledCallback?: (room: BaseGameRoom, winnerAddress: string) => Promise<void>;

  constructor(
    config: RoomConfig,
    gameType: GameType,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    this.matchId = config.matchId;
    this.gameType = gameType;
    this.config = config;
    this.escrowAddress = config.escrowAddress;
    this.onMatchSettledCallback = onSettled;
    this.isPrivate = Boolean(config.isPrivate);
    this.inviteCode = config.inviteCode;

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

    // Assign Player B if invited in config and not attached
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

  protected handlePlayerConnect(
    player: PlayerSession,
    telegramId: string,
    username: string,
    ws: WebSocket,
    side: 'A' | 'B'
  ) {
    player.ws = ws;
    if (telegramId) player.telegramId = telegramId;
    if (username) player.username = username;
    player.connected = true;

    // Clear grace timer if reconnecting
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
      this.broadcast({
        type: 'PLAYER_RECONNECTED',
        side,
        message: `${player.username} reconnected. Resuming match.`,
      });
    }

    this.sendTo(ws, {
      type: 'INIT_STATE',
      matchId: this.matchId.toString(),
      gameType: this.gameType,
      role: `PLAYER_${side}`,
      state: this.state,
      scoreA: this.playerA.score,
      scoreB: this.playerB ? this.playerB.score : 0,
      playerAName: this.playerA.username,
      playerBName: this.playerB ? this.playerB.username : undefined,
      wagerTon: (Number(this.config.wagerAmountNano) / 1e9).toFixed(2),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      oddsX: this.calculateOdds('X'),
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsX: this.totalBetsX.toString(),
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
      gameData: this.getGamePayload(),
    });

    this.broadcastRoomState();
  }

  // Spectator connection
  public attachSpectator(id: string, ws: WebSocket) {
    this.spectators.set(id, { id, ws });

    this.sendTo(ws, {
      type: 'INIT_STATE',
      matchId: this.matchId.toString(),
      gameType: this.gameType,
      role: 'SPECTATOR',
      state: this.state,
      scoreA: this.playerA.score,
      scoreB: this.playerB ? this.playerB.score : 0,
      playerAName: this.playerA.username,
      playerBName: this.playerB ? this.playerB.username : undefined,
      wagerTon: (Number(this.config.wagerAmountNano) / 1e9).toFixed(2),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      oddsX: this.calculateOdds('X'),
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsX: this.totalBetsX.toString(),
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
      gameData: this.getGamePayload(),
    });
  }

  public removeSpectator(id: string) {
    this.spectators.delete(id);
  }

  // Player Disconnect Handler
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

    if (disconnectedPlayer.disconnectTimer) {
      clearTimeout(disconnectedPlayer.disconnectTimer);
      disconnectedPlayer.disconnectTimer = undefined;
    }

    // Forfeit grace timer strictly applies during active combat/gameplay
    const isGameActive = this.state === 'GAME_ACTIVE' || this.state === 'ROUND_START';

    if (this.rematchProposerWallet) {
      this.rematchProposerWallet = undefined;
      this.rematchNewWagerNano = undefined;
      this.broadcast({
        type: 'REMATCH_DECLINED',
        message: 'Rematch cancelled: Player left the duel room.',
      });
    }

    if (isGameActive && opponent) {
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
      // In LOBBY or BETTING_WINDOW, no forfeit penalty
      this.broadcast({
        type: 'PLAYER_DISCONNECTED',
        side,
        message: `${disconnectedPlayer.username} stepped away from the room.`,
      });
      this.broadcastRoomState();
    }
  }

  protected triggerForfeit(winnerWallet: string, forfeiterName: string) {
    this.state = 'FORFEITED';
    this.forfeitWinner = winnerWallet;
    this.broadcast({
      type: 'MATCH_FORFEITED',
      forfeiterName,
      winnerAddress: winnerWallet,
      message: `${forfeiterName} failed to reconnect in time. Match forfeited!`,
    });
    this.settleMatch(winnerWallet);
  }

  // Ready toggle
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

    if (this.playerA.ready && this.playerB?.ready && this.state === 'LOBBY') {
      this.startBettingWindow();
    }
  }

  // Spectator Pari-Mutuel Window (configurable, default 30s when both players are ready)
  public startBettingWindow() {
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = undefined;
    }

    this.state = 'BETTING_WINDOW';
    const dynamicConfig = feeConfig.getConfig();
    const duration = this.config.bettingWindowSeconds ?? dynamicConfig.bettingWindowSeconds ?? 30;
    let countdown = duration;

    this.broadcast({
      type: 'BETTING_WINDOW_OPEN',
      durationSeconds: duration,
      message: `Entrambi i duellanti sono pronti! Finestra scommesse aperta per ${duration} secondi.`,
    });

    this.bettingTimer = setInterval(() => {
      countdown -= 1;
      this.broadcast({
        type: 'BETTING_COUNTDOWN',
        secondsLeft: countdown,
        oddsA: this.calculateOdds('A'),
        oddsB: this.calculateOdds('B'),
        oddsX: this.calculateOdds('X'),
      });

      if (countdown <= 0) {
        if (this.bettingTimer) {
          clearInterval(this.bettingTimer);
          this.bettingTimer = undefined;
        }
        this.onGameStart();
      }
    }, 1000);
  }

  // Settle Match
  public settleMatch(winnerAddress: string) {
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
      winnerAddress,
      timestamp,
      signatureHex,
      signatureCellBoc,
    };

    console.log(`[${this.gameType.toUpperCase()}] Match #${this.matchId} settled. Winner: ${winnerName} (${winnerAddress})`);

    const wagerNum = Number(this.config.wagerAmountNano) / 1e9;
    const totalPot = wagerNum * 2;
    const { duelRakePercent, spectatorRakePercent } = feeConfig.getConfig();
    const rakeShare = (duelRakePercent || 0) / 100;
    const winnerShare = 1 - rakeShare;
    const winnerPayoutGram = (totalPot * winnerShare).toFixed(2);
    const rakeGram = (totalPot * rakeShare).toFixed(2);

    // Credit winner's internal balance
    dbService.creditUserBalance(winnerAddress, winnerPayoutGram, 'MATCH_WIN', `Won ${this.gameType} duel #${this.matchId}`).catch((err) => {
      console.error(`[BaseGameRoom] Error crediting winner balance:`, err);
    });

    // Credit platform rake if greater than 0
    if (parseFloat(rakeGram) > 0) {
      dbService.creditTreasury(rakeGram, 'DUEL_RAKE', this.matchId.toString()).catch((err) => {
        console.error(`[BaseGameRoom] Error crediting duel rake:`, err);
      });
    }

    // Settle spectator bets
    const winningSide = winnerAddress === this.playerA.walletAddress ? 'A' : 'B';
    const totalPoolNano = this.totalBetsA + this.totalBetsB;
    if (totalPoolNano > 0n && this.spectatorBets.length > 0) {
      const winningBets = this.spectatorBets.filter((b) => b.target === winningSide);
      const totalWinningBetsNano = winningSide === 'A' ? this.totalBetsA : this.totalBetsB;
      const specRakeRate = (spectatorRakePercent || 0) / 100;
      const totalPoolGram = Number(totalPoolNano) / 1e9;
      const specRakeGram = totalPoolGram * specRakeRate;
      const distributablePoolGram = totalPoolGram - specRakeGram;

      if (specRakeGram > 0) {
        dbService.creditTreasury(specRakeGram.toFixed(2), 'SPECTATOR_RAKE', this.matchId.toString()).catch((err) => {
          console.error(`[BaseGameRoom] Error crediting spectator rake:`, err);
        });
      }

      if (winningBets.length > 0 && totalWinningBetsNano > 0n) {
        const winningBetsGram = Number(totalWinningBetsNano) / 1e9;
        for (const bet of winningBets) {
          const share = bet.amountGram / winningBetsGram;
          const payoutGram = (distributablePoolGram * share).toFixed(2);
          dbService.creditUserBalance(
            bet.walletAddress,
            payoutGram,
            'MATCH_WIN',
            `Won spectator bet on match #${this.matchId}`
          ).catch((err) => {
            console.error(`[BaseGameRoom] Error crediting spectator winner ${bet.walletAddress}:`, err);
          });
        }
      } else {
        // No winners on winning side: refund stakes to all spectators
        for (const bet of this.spectatorBets) {
          dbService.refundUserBalance(
            bet.walletAddress,
            bet.amountGram.toFixed(2),
            `Refund for spectator bet on match #${this.matchId}`
          ).catch((err) => {
            console.error(`[BaseGameRoom] Error refunding spectator ${bet.walletAddress}:`, err);
          });
        }
      }
    }

    const winnerTelegramId = winnerAddress === this.playerA.walletAddress
      ? this.playerA.telegramId
      : this.playerB?.telegramId;

    dbService.saveMatch({
      matchId: this.matchId.toString(),
      escrowAddress: this.escrowAddress,
      wagerAmountNano: this.config.wagerAmountNano.toString(),
      wagerTon: wagerNum.toFixed(2),
      wagerGram: wagerNum.toFixed(2),
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
      gameType: this.gameType,
      settledAt: Date.now(),
      createdAt: Number(this.matchId) || Date.now(),
    }).catch((err) => {
      console.error('[BaseGameRoom] Error saving match to db:', err);
    });

    this.broadcast({
      type: 'MATCH_SETTLED',
      winnerAddress,
      winnerName,
      resolution: this.resolution,
      scoreA: this.playerA.score,
      scoreB: this.playerB?.score || 0,
      payoutTon: winnerPayoutGram,
      message: `🏆 ${winnerName} has won the duel!`,
      gameData: this.getGamePayload(),
    });

    this.broadcastRoomState();

    if (this.onMatchSettledCallback) {
      this.onMatchSettledCallback(this, winnerAddress);
    }

    // Auto cleanup after 90 seconds (can be cancelled if rematch accepted)
    if (this.settleCleanupTimer) {
      clearTimeout(this.settleCleanupTimer);
    }
    this.settleCleanupTimer = setTimeout(async () => {
      try {
        const { RoomManager } = await import('./RoomManager.js');
        RoomManager.getInstance().removeRoom(this.matchId.toString());
      } catch {}
    }, 90_000);
  }

  // Spectator Pari-Mutuel Bet
  public registerSpectatorBet(
    target: 'A' | 'B' | 'X',
    amountNano: bigint,
    bettorWallet?: string,
    telegramId?: string,
    feePaidGram: number = 0.05
  ) {
    if (this.state !== 'BETTING_WINDOW') {
      console.warn(`[BaseGameRoom] Match #${this.matchId} is in state '${this.state}'. Spectator betting is only allowed during BETTING_WINDOW.`);
      return;
    }

    if (
      bettorWallet &&
      (this.isSameWallet(bettorWallet, this.playerA.walletAddress) ||
        (this.playerB && this.isSameWallet(bettorWallet, this.playerB.walletAddress)))
    ) {
      console.warn(`[BaseGameRoom] Duelist ${bettorWallet} attempted spectator bet. Denied.`);
      return;
    }

    const amountGram = Number(amountNano) / 1e9;
    if (bettorWallet) {
      this.spectatorBets.push({
        walletAddress: bettorWallet,
        telegramId,
        target,
        amountGram,
        amountNano,
        feePaidGram,
        timestamp: Date.now(),
      });
    }

    if (target === 'A') {
      this.totalBetsA += amountNano;
    } else if (target === 'B') {
      this.totalBetsB += amountNano;
    } else {
      this.totalBetsX += amountNano;
    }

    this.broadcast({
      type: 'ODDS_UPDATE',
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsX: this.totalBetsX.toString(),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      oddsX: this.calculateOdds('X'),
    });
  }

  public calculateOdds(side: 'A' | 'B' | 'X'): number {
    const totalPool = Number(this.totalBetsA + this.totalBetsB + this.totalBetsX);
    if (totalPool === 0) return this.gameType === 'split' || this.totalBetsX > 0n || side === 'X' ? 2.8 : 2.0;

    const { spectatorRakePercent } = feeConfig.getConfig();
    const distributablePool = totalPool * (1 - (spectatorRakePercent || 0) / 100);
    const sideBets = side === 'A' ? Number(this.totalBetsA) : (side === 'B' ? Number(this.totalBetsB) : Number(this.totalBetsX));
    if (sideBets === 0) return this.gameType === 'split' ? 2.8 : 2.0;
    return parseFloat((distributablePool / sideBets).toFixed(2));
  }

  public abortRoom(reason: string = 'Match was cancelled.') {
    this.cleanupTimers();
    this.state = 'FORFEITED';

    // Refund any spectator bets + spectator fee
    for (const bet of this.spectatorBets) {
      const refundTotal = (bet.amountGram + (bet.feePaidGram || 0)).toFixed(2);
      dbService.refundUserBalance(
        bet.walletAddress,
        refundTotal,
        `Refund for spectator bet on cancelled match #${this.matchId}`
      ).catch(console.error);
    }

    this.broadcast({
      type: 'ROOM_CANCELLED',
      state: 'CANCELLED',
      message: reason,
    });
  }

  public cleanupTimers() {
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
    this.cleanupGameTimers();
  }

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

  public broadcastRoomState() {
    this.broadcast({
      type: 'ROOM_UPDATE',
      state: this.state,
      gameType: this.gameType,
      isPrivate: this.isPrivate,
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
        telegramUserId: this.playerA.telegramId,
      },
      playerB: this.playerB
        ? {
            wallet: this.playerB.walletAddress,
            name: this.playerB.username,
            ready: this.playerB.ready,
            score: this.playerB.score,
            connected: this.playerB.connected,
            telegramUserId: this.playerB.telegramId,
          }
        : null,
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      gameData: this.getGamePayload(),
    });
  }

  public async requestRematch(proposerWallet: string, proposerName: string) {
    if (this.state !== 'MATCH_SETTLED' && this.state !== 'FORFEITED') return;
    if (!this.playerB) return;

    const isPlayerA = this.isSameWallet(proposerWallet, this.playerA.walletAddress);
    const isPlayerB = this.isSameWallet(proposerWallet, this.playerB.walletAddress);
    if (!isPlayerA && !isPlayerB) return;

    const proposer = isPlayerA ? this.playerA : this.playerB;
    const opponent = isPlayerA ? this.playerB : this.playerA;

    // Verify opponent is still actively connected in the duel room
    if (!opponent.connected || !opponent.ws || opponent.ws.readyState !== WebSocket.OPEN) {
      if (proposer.ws) {
        this.sendTo(proposer.ws, {
          type: 'ERROR',
          message: 'Cannot request rematch: Opponent has already left the duel room.',
        });
      }
      return;
    }

    const newWagerNano = this.config.wagerAmountNano * 2n;
    const newWagerTon = (Number(newWagerNano) / 1e9).toFixed(2);
    const newWagerGram = Number(newWagerNano) / 1e9;

    // Check proposer's internal balance
    try {
      const proposerAccount = await dbService.getUserAccount(proposerWallet);
      const currentBal = parseFloat(proposerAccount.balanceGram || proposerAccount.balanceTon || '0');
      if (currentBal < newWagerGram) {
        if (proposer.ws) {
          this.sendTo(proposer.ws, {
            type: 'ERROR',
            message: `Insufficient balance for 2X rematch! Required: ${newWagerTon} GRAM, your balance: ${currentBal.toFixed(2)} GRAM.`,
          });
        }
        return;
      }
    } catch (err) {
      console.error(`[BaseGameRoom] Error checking proposer balance for rematch on #${this.matchId}:`, err);
      return;
    }

    this.rematchProposerWallet = proposerWallet;
    this.rematchNewWagerNano = newWagerNano;

    this.broadcast({
      type: 'REMATCH_OFFERED',
      proposerWallet,
      proposerName,
      newWagerTon,
      newWagerNano: newWagerNano.toString(),
      message: `${proposerName} challenged you to a REMATCH with 2X Wager (${newWagerTon} GRAM)!`,
    });
  }

  public async acceptRematch(acceptorWallet: string) {
    if (this.state !== 'MATCH_SETTLED' && this.state !== 'FORFEITED') return;
    if (!this.rematchProposerWallet || !this.rematchNewWagerNano) return;
    if (!this.playerB) return;

    // Prevent self-accept exploit
    if (this.isSameWallet(acceptorWallet, this.rematchProposerWallet)) {
      console.warn(`[BaseGameRoom] Proposer ${acceptorWallet} attempted to self-accept rematch on #${this.matchId}. Rejected.`);
      return;
    }

    const isPlayerA = this.isSameWallet(acceptorWallet, this.playerA.walletAddress);
    const isPlayerB = this.isSameWallet(acceptorWallet, this.playerB.walletAddress);
    if (!isPlayerA && !isPlayerB) return;

    const acceptor = isPlayerA ? this.playerA : this.playerB;
    const proposer = isPlayerA ? this.playerB : this.playerA;

    // Verify challenger/opponent is still in room
    if (!proposer.connected || !proposer.ws || proposer.ws.readyState !== WebSocket.OPEN) {
      if (acceptor.ws) {
        this.sendTo(acceptor.ws, {
          type: 'ERROR',
          message: 'Rematch cancelled: Challenger has already left the duel room.',
        });
      }
      this.rematchProposerWallet = undefined;
      this.rematchNewWagerNano = undefined;
      return;
    }

    const newWagerNano = this.rematchNewWagerNano;
    const newWagerTon = (Number(newWagerNano) / 1e9).toFixed(2);
    const newWagerGram = Number(newWagerNano) / 1e9;

    try {
      // 1. Check acceptor balance
      const acceptorAccount = await dbService.getUserAccount(acceptorWallet);
      const acceptorBal = parseFloat(acceptorAccount.balanceGram || acceptorAccount.balanceTon || '0');
      if (acceptorBal < newWagerGram) {
        if (acceptor.ws) {
          this.sendTo(acceptor.ws, {
            type: 'ERROR',
            message: `Insufficient balance to accept 2X rematch! Required: ${newWagerTon} GRAM, your balance: ${acceptorBal.toFixed(2)} GRAM.`,
          });
        }
        return;
      }

      // 2. Re-verify proposer balance
      const proposerAccount = await dbService.getUserAccount(this.rematchProposerWallet);
      const proposerBal = parseFloat(proposerAccount.balanceGram || proposerAccount.balanceTon || '0');
      if (proposerBal < newWagerGram) {
        this.broadcast({
          type: 'REMATCH_DECLINED',
          message: 'Rematch cancelled: Challenger no longer has sufficient balance for 2X wager.',
        });
        this.rematchProposerWallet = undefined;
        this.rematchNewWagerNano = undefined;
        return;
      }

      // 3. Deduct wagers from BOTH players
      await dbService.debitUserBalance(
        this.rematchProposerWallet,
        newWagerGram.toFixed(2),
        'REMATCH_BET',
        `2X Rematch wager for match #${this.matchId}`
      );
      await dbService.debitUserBalance(
        acceptorWallet,
        newWagerGram.toFixed(2),
        'REMATCH_BET',
        `2X Rematch wager for match #${this.matchId}`
      );
      console.log(`[BaseGameRoom] Match #${this.matchId} rematch debited ${newWagerGram.toFixed(2)} GRAM from both players.`);
    } catch (err: any) {
      console.error(`[BaseGameRoom] Failed to process rematch balance debit for #${this.matchId}:`, err);
      if (acceptor.ws) {
        this.sendTo(acceptor.ws, {
          type: 'ERROR',
          message: 'Failed to process rematch balance deduction. Please try again.',
        });
      }
      return;
    }

    // Cancel 90s auto-cleanup timer so room persists for rematch
    if (this.settleCleanupTimer) {
      clearTimeout(this.settleCleanupTimer);
      this.settleCleanupTimer = undefined;
    }

    this.config.wagerAmountNano = newWagerNano;
    this.isRematch = true;
    this.rematchProposerWallet = undefined;
    this.rematchNewWagerNano = undefined;

    this.state = 'LOBBY';
    this.playerA.score = 0;
    this.playerA.ready = false;
    this.playerB.score = 0;
    this.playerB.ready = false;
    this.winnerAddress = undefined;
    this.winnerName = undefined;
    this.resolution = undefined;
    this.forfeitWinner = undefined;
    this.cleanupTimers();

    this.broadcast({
      type: 'REMATCH_ACCEPTED',
      newWagerTon,
      message: `Rematch accepted! Wager doubled to ${newWagerTon} GRAM. Both players ready up!`,
    });
    this.broadcastRoomState();
  }

  public declineRematch(declinerWallet?: string) {
    this.rematchProposerWallet = undefined;
    this.rematchNewWagerNano = undefined;
    this.broadcast({
      type: 'REMATCH_DECLINED',
      declinerWallet,
      message: 'Rematch offer was cancelled or declined.',
    });
  }

  protected sendTo(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // --- Abstract Game Hooks ---
  public abstract getGamePayload(): any;
  public abstract handleGameAction(wallet: string, data: any): void;
  public abstract onGameStart(): void;
  public abstract cleanupGameTimers(): void;
}

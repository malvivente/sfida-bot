import { WebSocket } from 'ws';
import { Address } from '@ton/core';
import { GameType, RoomState } from '../types/gameTypes.js';
import { signerService } from '../services/signer.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';
import { cleanPlayerName } from '../utils/cleanName.js';

export interface RoomConfig {
  matchId: bigint;
  gameType?: GameType;
  wagerAmountNano: bigint;
  playerAAddress: string;
  playerBAddress?: string;
  recruiterA?: string;
  groupAdminAddress?: string;
  groupChatId?: string;
  escrowAddress?: string;
  bettingWindowSeconds?: number;
  isPrivate?: boolean;
  inviteCode?: string;
  targetOpponentUsername?: string;
  targetOpponentId?: string;
  createdAt?: number;
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
  photoUrl?: string;
  ws?: WebSocket;
  connected: boolean;
  ready: boolean;
  score: number;
  disconnectTimer?: NodeJS.Timeout;
}

export interface SpectatorSession {
  id: string;
  ws: WebSocket;
  wallet?: string;
  telegramId?: string;
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
  public bettingCountdownSeconds?: number;

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

  public createdAt: number;
  public expiresAt: number;
  public targetOpponentUsername?: string;
  public targetOpponentId?: string;
  protected lobbyExpirationTimer?: NodeJS.Timeout;
  public playerBExpiresAt?: number;
  protected playerBExpirationTimer?: NodeJS.Timeout;

  public rematchProposerWallet?: string;
  public rematchNewWagerNano?: bigint;
  public isRematch: boolean = false;
  protected settleCleanupTimer?: NodeJS.Timeout;
  private notifiedTelegramActions: Set<string> = new Set();

  protected onMatchSettledCallback?: (room: BaseGameRoom, winnerAddress: string) => Promise<void>;

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

    this.createdAt = config.createdAt || Date.now();
    const expireMinutes = feeConfig.getConfig().lobbyRoomExpirationMinutes || 10;
    this.expiresAt = this.createdAt + expireMinutes * 60 * 1000;
    this.targetOpponentUsername = config.targetOpponentUsername;
    this.targetOpponentId = config.targetOpponentId;

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
    } else {
      this.startLobbyExpirationTimer();
    }
  }

  public isSameWallet(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    if (a.toLowerCase() === b.toLowerCase()) return true;
    const cleanA = a.replace(/^tg_/, '').toLowerCase();
    const cleanB = b.replace(/^tg_/, '').toLowerCase();
    if (cleanA && cleanB && cleanA === cleanB) return true;
    try {
      return Address.parse(a).equals(Address.parse(b));
    } catch {
      return false;
    }
  }

  /**
   * Helper to resolve whether a connected websocket or wallet represents Player A, Player B, or neither.
   */
  public getPlayerSide(wallet?: string, ws?: WebSocket): 'A' | 'B' | null {
    if (ws) {
      if (this.playerA?.ws === ws) return 'A';
      if (this.playerB?.ws === ws) return 'B';
    }
    if (wallet) {
      if (this.isSameWallet(wallet, this.playerA.walletAddress)) return 'A';
      if (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress)) return 'B';
      if (this.playerA.telegramId && (this.isSameWallet(wallet, `tg_${this.playerA.telegramId}`) || wallet === String(this.playerA.telegramId))) return 'A';
      if (this.playerB?.telegramId && (this.isSameWallet(wallet, `tg_${this.playerB.telegramId}`) || wallet === String(this.playerB.telegramId))) return 'B';
    }
    return null;
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
        username: cleanPlayerName(username),
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
    if (username) player.username = cleanPlayerName(username);
    player.connected = true;
    if (side === 'B') {
      this.cancelLobbyExpirationTimer();
      if (!this.playerBExpirationTimer && this.state === 'LOBBY') {
        this.startPlayerBExpirationTimer();
      }
    }

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
      secondsLeft: this.bettingCountdownSeconds,
      createdAt: this.createdAt,
      expiresAt: this.playerB ? (this.playerBExpiresAt || this.expiresAt) : this.expiresAt,
      playerBExpiresAt: this.playerBExpiresAt,
      isRematch: (this as any).isRematch || false,
    });

    this.broadcastRoomState();
  }

  // Spectator connection
  public attachSpectator(id: string, ws: WebSocket, wallet?: string, telegramId?: string) {
    this.spectators.set(id, { id, ws, wallet, telegramId });

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
      secondsLeft: this.bettingCountdownSeconds,
      createdAt: this.createdAt,
      expiresAt: this.playerB ? (this.playerBExpiresAt || this.expiresAt) : this.expiresAt,
      playerBExpiresAt: this.playerBExpiresAt,
      isRematch: (this as any).isRematch || false,
    });
  }

  public removeSpectator(id: string) {
    this.spectators.delete(id);
  }

  /**
   * Promotes an existing spectator WebSocket to Player B upon joining.
   */
  public upgradeSpectatorToPlayer(wallet: string, telegramId: string, username: string): boolean {
    if (!this.playerB) return false;
    for (const [id, spec] of this.spectators.entries()) {
      const matchWallet = Boolean(wallet && spec.wallet && this.isSameWallet(wallet, spec.wallet));
      const matchTg = Boolean(telegramId && spec.telegramId && String(telegramId) === String(spec.telegramId));
      if (matchWallet || matchTg) {
        this.spectators.delete(id);
        this.handlePlayerConnect(this.playerB, telegramId, username, spec.ws, 'B');
        return true;
      }
    }
    return false;
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
    if (this.state !== 'LOBBY') {
      console.warn(`[BaseGameRoom] Match #${this.matchId}: setPlayerReady ignored in state '${this.state}'.`);
      return;
    }

    let readySide: 'A' | 'B' | null = null;
    if (
      this.isSameWallet(wallet, this.playerA.walletAddress) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId))
    ) {
      this.playerA.ready = true;
      readySide = 'A';
    } else if (
      this.playerB &&
      (this.isSameWallet(wallet, this.playerB.walletAddress) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId)))
    ) {
      this.playerB.ready = true;
      readySide = 'B';
    }

    this.broadcastRoomState();

    if (this.playerA.ready && this.playerB?.ready && this.state === 'LOBBY') {
      this.cancelLobbyExpirationTimer();
      this.cancelPlayerBExpirationTimer();
      this.startBettingWindow();
      return;
    }

    // If one player is ready and opponent is not ready and offline/outside miniapp, notify them via Telegram
    if (readySide && this.state === 'LOBBY') {
      const readyPlayer = readySide === 'A' ? this.playerA : this.playerB;
      const otherPlayer = readySide === 'A' ? this.playerB : this.playerA;

      if (readyPlayer && otherPlayer && otherPlayer.telegramId && (!otherPlayer.ws || otherPlayer.ws.readyState !== 1)) {
        this.notifyOpponent(readyPlayer, otherPlayer, 'ready');
      }
    }
  }

  public notifyOpponentJoin(joinedPlayer: PlayerSession, creatorPlayer: PlayerSession) {
    if (creatorPlayer && creatorPlayer.telegramId && (!creatorPlayer.ws || creatorPlayer.ws.readyState !== 1)) {
      this.notifyOpponent(joinedPlayer, creatorPlayer, 'join');
    }
  }

  private async notifyOpponent(senderPlayer: PlayerSession, targetPlayer: PlayerSession, action: 'ready' | 'join') {
    if (!targetPlayer.telegramId) return;
    const key = `${targetPlayer.telegramId}_${action}_${this.matchId}`;
    if (this.notifiedTelegramActions.has(key)) return;
    this.notifiedTelegramActions.add(key);

    try {
      const { getTelegramBot } = await import('../bot/index.js');
      const { SfidaInlineKeyboard: InlineKeyboard } = await import('../bot/keyboardUtils.js');
      const { renderCustomEmojis } = await import('../bot/emojis.js');
      const { GAMES_CONFIG } = await import('../config/gamesConfig.js');

      const bot = getTelegramBot();
      if (!bot) return;

      const gameConfig = (GAMES_CONFIG as any)[this.gameType];
      const gameTitle = gameConfig?.name || this.gameType.toUpperCase();
      const wagerGram = (Number(this.config.wagerAmountNano) / 1e9).toFixed(2);
      const senderName = senderPlayer.username ? `@${senderPlayer.username.replace(/^@/, '')}` : 'Un giocatore';

      const title = action === 'ready'
        ? `⚔️ <b>SFIDA ARENA • AVVERSARIO PRONTO!</b>`
        : `⚔️ <b>SFIDA ARENA • AVVERSARIO ENTRATO!</b>`;

      const desc = action === 'ready'
        ? `<b>${senderName}</b> ha premuto <b>PRONTO</b> per sfidarti a <b>${gameTitle}</b> (Stanza #${this.matchId})!\n\n`
        : `<b>${senderName}</b> è entrato nella tua stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) ed è in attesa!\n\n`;

      const text =
        `${title}\n\n` +
        desc +
        `💰 <b>Posta in palio:</b> ${wagerGram} GRAM\n\n` +
        `⚡ <i>Entra subito nell'Arena per iniziare a giocare!</i>`;

      const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';
      const keyboard = new InlineKeyboard().webApp('⚔️ ENTRA NEL DUELLO', `${webAppUrl}?startapp=duel_${this.matchId}`);

      await bot.api.sendMessage(Number(targetPlayer.telegramId), renderCustomEmojis(text), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      console.log(`[BaseGameRoom] Sent '${action}' notification to tg:${targetPlayer.telegramId} for match #${this.matchId}`);
    } catch (err: any) {
      console.warn(`[BaseGameRoom] Could not send '${action}' notification to tg:${targetPlayer.telegramId}:`, err?.message || err);
    }
  }

  // Spectator Pari-Mutuel Window (configurable, default 20s when both players are ready)
  public startBettingWindow() {
    this.cancelLobbyExpirationTimer();
    this.cancelPlayerBExpirationTimer();
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = undefined;
    }

    this.state = 'BETTING_WINDOW';
    const dynamicConfig = feeConfig.getConfig();
    const duration = this.config.bettingWindowSeconds ?? dynamicConfig.bettingWindowSeconds ?? 10;
    let countdown = duration;

    this.bettingCountdownSeconds = duration;

    this.broadcast({
      type: 'BETTING_WINDOW_OPEN',
      durationSeconds: duration,
      message: `Entrambi i duellanti sono pronti! Finestra scommesse aperta per ${duration} secondi.`,
    });
    this.broadcastRoomState();

    this.bettingTimer = setInterval(() => {
      countdown -= 1;
      this.bettingCountdownSeconds = countdown;
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
        this.bettingCountdownSeconds = undefined;
        this.checkAndRefundOneSidedSpectatorBets();
        this.onGameStart();
      }
    }, 1000);
  }

  public checkAndRefundOneSidedSpectatorBets() {
    if (this.spectatorBets.length === 0) return;

    const hasBetsA = this.totalBetsA > 0n;
    const hasBetsB = this.totalBetsB > 0n;
    const hasBetsX = this.totalBetsX > 0n;
    const distinctSides = (hasBetsA ? 1 : 0) + (hasBetsB ? 1 : 0) + (hasBetsX ? 1 : 0);

    // If all bets are placed on only 1 side (or only 1 bettor), there is no opposing pool to win against!
    // Immediately refund stakes and fees so users aren't locked in or losing fees.
    if (distinctSides <= 1) {
      console.log(`[BaseGameRoom] Match #${this.matchId}: Only ${distinctSides} side backed by spectators. Refunding ${this.spectatorBets.length} bet(s).`);

      const refundedSettlements: Array<{
        walletAddress: string;
        telegramId?: string;
        target: string;
        won: boolean;
        payoutGram: string;
        refunded: boolean;
      }> = [];

      for (const bet of this.spectatorBets) {
        const refundTotal = (bet.amountGram + (bet.feePaidGram || 0)).toFixed(2);
        refundedSettlements.push({
          walletAddress: bet.walletAddress,
          telegramId: bet.telegramId,
          target: bet.target,
          won: false,
          payoutGram: refundTotal,
          refunded: true,
        });

        dbService.refundUserBalance(
          bet.walletAddress,
          refundTotal,
          `Refund for spectator bet (one-sided pool) on match #${this.matchId}`,
          bet.telegramId
        ).catch((err) => {
          console.error(`[BaseGameRoom] Error refunding spectator ${bet.walletAddress}:`, err);
        });
      }

      this.broadcast({
        type: 'SPECTATOR_BETS_REFUNDED',
        reason: 'one_sided',
        message: 'Tutte le scommesse erano sullo stesso esito. Le puntate sono state rimborsate per intero.',
        spectatorSettlements: refundedSettlements,
      });

      this.spectatorBets = [];
      this.totalBetsA = 0n;
      this.totalBetsB = 0n;
      this.totalBetsX = 0n;

      this.broadcast({
        type: 'ODDS_UPDATE',
        totalBetsA: '0',
        totalBetsB: '0',
        totalBetsX: '0',
        oddsA: this.calculateOdds('A'),
        oddsB: this.calculateOdds('B'),
        oddsX: this.calculateOdds('X'),
      });
    }
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
    let signatureHex = '';
    let signatureCellBoc = '';
    try {
      const res = signerService.signResolution(
        this.matchId,
        winnerAddress,
        timestamp
      );
      signatureHex = res.signatureHex;
      signatureCellBoc = res.signatureCellBoc;
    } catch (err) {
      console.warn(`[BaseGameRoom] Resolution signing skipped/failed:`, err);
    }

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

    // Distribute affiliate commissions from creation + join fees (0.05 GRAM each, total 0.10 GRAM)
    // 30% of fees pool is allocated to affiliates:
    // If player has referrer AND match is in affiliated group: 15% to referrer, 15% to group.
    // If player has only group: 30% to group.
    // If player has only referrer: 30% to referrer.
    const { creationFeeGram, joinFeeGram } = feeConfig.getConfig();
    const feeA = creationFeeGram || 0.05;
    const feeB = joinFeeGram || 0.05;

    (async () => {
      try {
        const groupAffiliate = this.config.groupChatId ? await dbService.getGroupAffiliate(this.config.groupChatId) : null;
        const hasAffiliatedGroup = Boolean(groupAffiliate);

        // Fetch user accounts to check referrers
        const accA = await dbService.getUserAccount(this.playerA.walletAddress, this.playerA.telegramId);
        const accB = this.playerB ? await dbService.getUserAccount(this.playerB.walletAddress, this.playerB.telegramId) : null;

        let totalGroupCommission = 0;

        // Process Player A's fee
        const commissionPoolA = feeA * 0.30;
        if (hasAffiliatedGroup && accA?.referredBy) {
          const refShareA = commissionPoolA * 0.50; // 15% of fee
          const groupShareA = commissionPoolA * 0.50; // 15% of fee
          totalGroupCommission += groupShareA;
          await dbService.creditReferralEarnings(accA.referredBy, refShareA, this.matchId.toString());
        } else if (hasAffiliatedGroup) {
          totalGroupCommission += commissionPoolA; // 30% of fee
        } else if (accA?.referredBy) {
          await dbService.creditReferralEarnings(accA.referredBy, commissionPoolA, this.matchId.toString());
        }

        // Process Player B's fee
        if (accB) {
          const commissionPoolB = feeB * 0.30;
          if (hasAffiliatedGroup && accB?.referredBy) {
            const refShareB = commissionPoolB * 0.50; // 15% of fee
            const groupShareB = commissionPoolB * 0.50; // 15% of fee
            totalGroupCommission += groupShareB;
            await dbService.creditReferralEarnings(accB.referredBy, refShareB, this.matchId.toString());
          } else if (hasAffiliatedGroup) {
            totalGroupCommission += commissionPoolB; // 30% of fee
          } else if (accB?.referredBy) {
            await dbService.creditReferralEarnings(accB.referredBy, commissionPoolB, this.matchId.toString());
          }
        }

        // Record group match revenue & volume
        if (this.config.groupChatId) {
          await dbService.recordGroupMatchRevenue(this.config.groupChatId, wagerNum, totalGroupCommission);
        }
      } catch (err) {
        console.error(`[BaseGameRoom] Error distributing match affiliate commissions:`, err);
      }
    })();

    // Settle spectator bets
    const winningSide = this.isSameWallet(winnerAddress, this.playerA.walletAddress) ? 'A' : 'B';
    const totalPoolNano = this.totalBetsA + this.totalBetsB;
    const spectatorSettlements: Array<{
      walletAddress: string;
      telegramId?: string;
      target: string;
      won: boolean;
      payoutGram: string;
      refunded?: boolean;
    }> = [];

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
        for (const bet of this.spectatorBets) {
          if (bet.target === winningSide) {
            const share = bet.amountGram / winningBetsGram;
            const payoutGram = (distributablePoolGram * share).toFixed(2);
            spectatorSettlements.push({
              walletAddress: bet.walletAddress,
              telegramId: bet.telegramId,
              target: bet.target,
              won: true,
              payoutGram,
            });
            dbService.creditUserBalance(
              bet.walletAddress,
              payoutGram,
              'MATCH_WIN',
              `Won spectator bet on match #${this.matchId}`,
              bet.telegramId
            ).catch((err) => {
              console.error(`[BaseGameRoom] Error crediting spectator winner ${bet.walletAddress}:`, err);
            });
          } else {
            spectatorSettlements.push({
              walletAddress: bet.walletAddress,
              telegramId: bet.telegramId,
              target: bet.target,
              won: false,
              payoutGram: '0.00',
            });
          }
        }
      } else {
        // No winners on winning side: refund stakes to all spectators
        for (const bet of this.spectatorBets) {
          const refundAmount = bet.amountGram.toFixed(2);
          spectatorSettlements.push({
            walletAddress: bet.walletAddress,
            telegramId: bet.telegramId,
            target: bet.target,
            won: false,
            payoutGram: refundAmount,
            refunded: true,
          });
          dbService.refundUserBalance(
            bet.walletAddress,
            refundAmount,
            `Refund for spectator bet on match #${this.matchId}`,
            bet.telegramId
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
      payoutTon: winnerPayoutGram,
      payoutGram: winnerPayoutGram,
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
      winnerSide: winningSide,
      resolution: this.resolution,
      scoreA: this.playerA.score,
      scoreB: this.playerB?.score || 0,
      payoutTon: winnerPayoutGram,
      message: `🏆 ${winnerName} has won the duel!`,
      gameData: this.getGamePayload(),
      spectatorSettlements,
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
    this.state = 'CANCELLED';

    // Refund any spectator bets + spectator fee
    for (const bet of this.spectatorBets) {
      const refundTotal = (bet.amountGram + (bet.feePaidGram || 0)).toFixed(2);
      dbService.refundUserBalance(
        bet.walletAddress,
        refundTotal,
        `Refund for spectator bet on cancelled match #${this.matchId}`,
        bet.telegramId
      ).catch(console.error);
    }

    this.broadcast({
      type: 'ROOM_CANCELLED',
      state: 'CANCELLED',
      message: reason,
    });
  }

  public cleanupTimers() {
    this.cancelLobbyExpirationTimer();
    this.cancelPlayerBExpirationTimer();
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = undefined;
    }
    this.bettingCountdownSeconds = undefined;
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

  public startLobbyExpirationTimer() {
    this.cancelLobbyExpirationTimer();
    const remainingMs = Math.max(1000, this.expiresAt - Date.now());
    this.lobbyExpirationTimer = setTimeout(async () => {
      if (this.state === 'LOBBY' && !this.playerB) {
        console.log(`[BaseGameRoom] Room #${this.matchId} expired after inactivity.`);
        const wagerGram = Number(this.config.wagerAmountNano) / 1e9;
        const { creationFeeGram } = feeConfig.getConfig();
        const isRematch = (this as any).isRematch === true;
        const refundTotal = (isRematch ? wagerGram : (wagerGram + creationFeeGram)).toFixed(2);

        try {
          await dbService.refundUserBalance(
            this.playerA.walletAddress,
            refundTotal,
            `Refund for expired match #${this.matchId}`,
            this.playerA.telegramId
          );
        } catch (err) {
          console.error(`[BaseGameRoom] Failed to refund Player A on expiration:`, err);
        }

        if (this.playerA.telegramId) {
          try {
            const { getTelegramBot } = await import('../bot/index.js');
            const { renderCustomEmojis } = await import('../bot/emojis.js');
            const { GAMES_CONFIG } = await import('../config/gamesConfig.js');
            const bot = getTelegramBot();
            if (bot) {
              const gameConfig = (GAMES_CONFIG as any)[this.gameType];
              const gameTitle = gameConfig?.name || this.gameType.toUpperCase();
              const text =
                `⏱️ <b>SFIDA ARENA • STANZA SCADUTA</b>\n\n` +
                `Nessun avversario si è unito alla tua stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) entro il tempo limite di 10 minuti.\n\n` +
                `💰 La tua puntata di <b>${refundTotal} GRAM</b> (inclusa fee) è stata rimborsata per intero sul tuo saldo.`;
              await bot.api.sendMessage(Number(this.playerA.telegramId), renderCustomEmojis(text), { parse_mode: 'HTML' });
            }
          } catch (botErr) {
            console.warn('[BaseGameRoom] Could not send expired room notification to tg:', botErr);
          }
        }

        this.abortRoom(`Stanza #${this.matchId} scaduta per inattività.`);
        try {
          const { RoomManager } = await import('./RoomManager.js');
          RoomManager.getInstance().removeRoom(this.matchId.toString());
        } catch {}
      }
    }, remainingMs);
  }

  public cancelLobbyExpirationTimer() {
    if (this.lobbyExpirationTimer) {
      clearTimeout(this.lobbyExpirationTimer);
      this.lobbyExpirationTimer = undefined;
    }
  }

  public startPlayerBExpirationTimer() {
    this.cancelPlayerBExpirationTimer();
    const expireMinutes = feeConfig.getConfig().lobbyRoomExpirationMinutes || 10;
    this.playerBExpiresAt = Date.now() + expireMinutes * 60 * 1000;

    this.playerBExpirationTimer = setTimeout(async () => {
      await this.handlePlayerBTimeout();
    }, expireMinutes * 60 * 1000);
  }

  public cancelPlayerBExpirationTimer() {
    if (this.playerBExpirationTimer) {
      clearTimeout(this.playerBExpirationTimer);
      this.playerBExpirationTimer = undefined;
    }
    this.playerBExpiresAt = undefined;
  }

  public async handlePlayerBTimeout() {
    if (this.state !== 'LOBBY' || !this.playerB) return;
    if (this.playerA.ready && this.playerB.ready) return;

    console.log(`[BaseGameRoom] Room #${this.matchId} Player B expired waiting for Creator Player A.`);
    const bWallet = this.playerB.walletAddress;
    const bTgId = this.playerB.telegramId;
    const bName = this.playerB.username;
    const bWs = this.playerB.ws;
    const wagerGram = (Number(this.config.wagerAmountNano) / 1e9).toFixed(2);

    try {
      await dbService.refundUserBalance(
        bWallet,
        wagerGram,
        `Refund wager for match #${this.matchId} (opponent inactive timeout)`,
        bTgId
      );
    } catch (err) {
      console.error(`[BaseGameRoom] Error refunding Player B on timeout:`, err);
    }

    if (bTgId) {
      try {
        const { getTelegramBot } = await import('../bot/index.js');
        const { renderCustomEmojis } = await import('../bot/emojis.js');
        const { GAMES_CONFIG } = await import('../config/gamesConfig.js');
        const bot = getTelegramBot();
        if (bot) {
          const gameConfig = (GAMES_CONFIG as any)[this.gameType];
          const gameTitle = gameConfig?.name || this.gameType.toUpperCase();
          const text =
            `⏱️ <b>SFIDA ARENA • TEMPO SCADUTO</b>\n\n` +
            `Il creatore della stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) non ha avviato la partita entro il tempo limite.\n\n` +
            `💰 Sei stato rimosso dalla stanza e la tua puntata di <b>${wagerGram} GRAM</b> è stata riaccreditata sul tuo saldo.`;
          await bot.api.sendMessage(Number(bTgId), renderCustomEmojis(text), { parse_mode: 'HTML' });
        }
      } catch (botErr) {
        console.warn('[BaseGameRoom] Error sending player B timeout notification:', botErr);
      }
    }

    if (bWs && bWs.readyState === WebSocket.OPEN) {
      this.sendTo(bWs, {
        type: 'KICKED_INACTIVITY',
        message: 'Il creatore della stanza non ha avviato la partita entro 10 minuti. La tua puntata è stata rimborsata.',
        matchId: this.matchId.toString(),
      });
    }

    // Refund Player A as well and clean up the room completely
    const wagerNum = Number(this.config.wagerAmountNano) / 1e9;
    const { creationFeeGram } = feeConfig.getConfig();
    const isRematch = (this as any).isRematch === true;
    const refundPlayerATotal = (isRematch ? wagerNum : (wagerNum + creationFeeGram)).toFixed(2);
    try {
      await dbService.refundUserBalance(
        this.playerA.walletAddress,
        refundPlayerATotal,
        `Refund for expired match #${this.matchId} (creator inactivity timeout)`,
        this.playerA.telegramId
      );
    } catch (err) {
      console.error(`[BaseGameRoom] Error refunding Player A on timeout:`, err);
    }

    if (this.playerA.telegramId) {
      try {
        const { getTelegramBot } = await import('../bot/index.js');
        const { renderCustomEmojis } = await import('../bot/emojis.js');
        const { GAMES_CONFIG } = await import('../config/gamesConfig.js');
        const bot = getTelegramBot();
        if (bot) {
          const gameConfig = (GAMES_CONFIG as any)[this.gameType];
          const gameTitle = gameConfig?.name || this.gameType.toUpperCase();
          const text =
            `⏱️ <b>SFIDA ARENA • STANZA ANNULLATA</b>\n\n` +
            `La stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) è stata chiusa per inattività.\n\n` +
            `💰 La tua puntata di <b>${refundPlayerATotal} GRAM</b> è stata riaccreditata sul tuo saldo.`;
          await bot.api.sendMessage(Number(this.playerA.telegramId), renderCustomEmojis(text), { parse_mode: 'HTML' });
        }
      } catch (botErr) {
        console.warn('[BaseGameRoom] Error sending player A timeout notification:', botErr);
      }
    }

    this.playerB = undefined;
    this.config.playerBAddress = undefined;
    this.cleanupTimers();

    this.abortRoom(`Stanza #${this.matchId} scaduta per inattività.`);
    try {
      const { RoomManager } = await import('./RoomManager.js');
      RoomManager.getInstance().removeRoom(this.matchId.toString());
    } catch {}
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
      createdAt: this.createdAt,
      expiresAt: this.playerB ? (this.playerBExpiresAt || this.expiresAt) : this.expiresAt,
      playerBExpiresAt: this.playerBExpiresAt,
      isRematch: (this as any).isRematch || false,
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
    this.spectatorBets = [];
    this.totalBetsA = 0n;
    this.totalBetsB = 0n;
    this.totalBetsX = 0n;
    this.cleanupTimers();
    this.resetForRematch();
    this.startPlayerBExpirationTimer();

    this.broadcast({
      type: 'REMATCH_ACCEPTED',
      newWagerTon,
      isRematch: true,
      message: `Rematch accepted! Wager doubled to ${newWagerTon} GRAM. Both players ready up!`,
      oddsA: 2.0,
      oddsB: 2.0,
      oddsX: this.gameType === 'split' ? 2.8 : 2.0,
      totalBetsA: '0',
      totalBetsB: '0',
      totalBetsX: '0',
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

  protected sendError(wallet: string, message: string) {
    let ws: WebSocket | undefined;
    if (this.isSameWallet(wallet, this.playerA.walletAddress)) {
      ws = this.playerA.ws;
    } else if (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress)) {
      ws = this.playerB.ws;
    }
    if (ws) {
      this.sendTo(ws, { type: 'ERROR', message });
    }
  }

  // --- Abstract Game Hooks ---
  public resetForRematch(): void {}
  public abstract getGamePayload(): any;
  public abstract handleGameAction(wallet: string, data: any): void;
  public abstract onGameStart(): void;
  public abstract cleanupGameTimers(): void;
}

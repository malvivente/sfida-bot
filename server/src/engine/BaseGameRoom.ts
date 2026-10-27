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
  playerAName?: string;
  telegramUserId?: string;
  photoUrl?: string;
  recruiterA?: string;
  groupAdminAddress?: string;
  groupChatId?: string;
  escrowAddress?: string;
  bettingWindowSeconds?: number;
  isPrivate?: boolean;
  allowSpectators?: boolean;
  inviteCode?: string;
  targetOpponentUsername?: string;
  targetOpponentId?: string;
  maxPlayers?: number;
  createdAt?: number;
}

export type SpectatorTarget = 'A' | 'B' | 'C' | 'D' | 'X';

export interface SpectatorBet {
  walletAddress: string;
  telegramId?: string;
  target: SpectatorTarget;
  amountGram: number;
  amountNano: bigint;
  odds?: number;
  feePaidGram: number;
  timestamp: number;
}

export interface PlayerSession {
  walletAddress: string;
  telegramId: string;
  username: string;
  firstName?: string;
  displayName?: string;
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
  public totalBetsC: bigint = 0n;
  public totalBetsD: bigint = 0n;
  public totalBetsX: bigint = 0n;

  public winnerAddress?: string;
  public winnerName?: string;
  public resolution?: MatchResolutionPayload;
  public forfeitWinner?: string;

  public isPrivate: boolean = false;
  public allowSpectators: boolean = true;
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
    this.allowSpectators = this.isPrivate ? Boolean(config.allowSpectators ?? true) : true;
    this.inviteCode = config.inviteCode;

    this.createdAt = config.createdAt || Date.now();
    const expireMinutes = feeConfig.getConfig().lobbyRoomExpirationMinutes || 10;
    this.expiresAt = this.createdAt + expireMinutes * 60 * 1000;
    this.targetOpponentUsername = config.targetOpponentUsername;
    this.targetOpponentId = config.targetOpponentId;

    this.playerA = {
      walletAddress: config.playerAAddress,
      telegramId: config.telegramUserId ? String(config.telegramUserId) : '',
      username: config.playerAName || 'Player A',
      connected: false,
      ready: false,
      score: 0,
      photoUrl: (config as any).photoUrl,
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

  public isPlayerParticipant(wallet?: string, telegramId?: string): boolean {
    if (!wallet && !telegramId) return false;
    const matchA = (wallet && this.isSameWallet(wallet, this.playerA.walletAddress)) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId));
    if (matchA) return true;
    if (this.playerB) {
      const matchB = (wallet && this.isSameWallet(wallet, this.playerB.walletAddress)) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId));
      if (matchB) return true;
    }
    return false;
  }

  // Bind WebSocket to Player A or B
  public attachPlayer(wallet: string, telegramId: string, username: string, ws: WebSocket, firstName?: string, photoUrl?: string): boolean {
    if (
      this.isSameWallet(wallet, this.playerA.walletAddress) ||
      (telegramId && this.playerA.telegramId && String(this.playerA.telegramId) === String(telegramId))
    ) {
      this.handlePlayerConnect(this.playerA, telegramId, username, ws, 'A', firstName, photoUrl);
      return true;
    }

    if (
      this.playerB &&
      (this.isSameWallet(wallet, this.playerB.walletAddress) ||
        (telegramId && this.playerB.telegramId && String(this.playerB.telegramId) === String(telegramId)))
    ) {
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B', firstName, photoUrl);
      return true;
    }

    // Assign Player B if invited in config and not attached
    if (!this.playerB && this.config.playerBAddress && this.isSameWallet(wallet, this.config.playerBAddress)) {
      this.playerB = {
        walletAddress: wallet,
        telegramId,
        username: cleanPlayerName(username),
        firstName: firstName?.trim(),
        displayName: firstName?.trim() || cleanPlayerName(username),
        photoUrl,
        ws,
        connected: true,
        ready: false,
        score: 0,
      };
      this.handlePlayerConnect(this.playerB, telegramId, username, ws, 'B', firstName, photoUrl);
      return true;
    }

    return false;
  }

  protected handlePlayerConnect(
    player: PlayerSession,
    telegramId: string,
    username: string,
    ws: WebSocket,
    side: 'A' | 'B',
    firstName?: string,
    photoUrl?: string
  ) {
    player.ws = ws;
    if (telegramId) player.telegramId = telegramId;
    if (username) player.username = cleanPlayerName(username);
    if (firstName && !player.firstName) player.firstName = firstName.trim();
    if (photoUrl && !player.photoUrl) player.photoUrl = photoUrl;
    player.connected = true;
    if (side === 'B') {
      this.cancelLobbyExpirationTimer();
      if (!this.playerBExpirationTimer && this.state === 'LOBBY') {
        this.startPlayerBExpirationTimer();
      }
    }

    // Clear grace timer if reconnecting
    if (player.disconnectTimer) {
      clearInterval(player.disconnectTimer);
      clearTimeout(player.disconnectTimer as any);
      player.disconnectTimer = undefined;
      this.broadcast({
        type: 'PLAYER_RECONNECTED',
        side,
        message: `${player.username} si è riconnesso. Il duello riprende!`,
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
      oddsC: this.calculateOdds('C'),
      oddsD: this.calculateOdds('D'),
      oddsX: this.calculateOdds('X'),
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsC: this.totalBetsC.toString(),
      totalBetsD: this.totalBetsD.toString(),
      totalBetsX: this.totalBetsX.toString(),
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      winnerSide: this.winnerAddress
        ? (this.isSameWallet(this.winnerAddress, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(this.winnerAddress, this.playerB.walletAddress) ? 'B' : undefined))
        : undefined,
      resolution: this.resolution,
      gameData: this.getGamePayload(),
      secondsLeft: this.bettingCountdownSeconds,
      createdAt: this.createdAt,
      expiresAt: this.playerB ? (this.playerBExpiresAt || this.expiresAt) : this.expiresAt,
      playerBExpiresAt: this.playerBExpiresAt,
      isPrivate: this.isPrivate,
      allowSpectators: this.allowSpectators,
      isRematch: (this as any).isRematch || false,
    });

    this.broadcastRoomState();
  }

  // Spectator connection
  public attachSpectator(id: string, ws: WebSocket, wallet?: string, telegramId?: string) {
    if (!this.allowSpectators) {
      this.sendTo(ws, {
        type: 'ERROR',
        message: 'Questa stanza privata non ammette spettatori.',
      });
      try {
        ws.close();
      } catch {}
      return;
    }

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
      oddsC: this.calculateOdds('C'),
      oddsD: this.calculateOdds('D'),
      oddsX: this.calculateOdds('X'),
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsC: this.totalBetsC.toString(),
      totalBetsD: this.totalBetsD.toString(),
      totalBetsX: this.totalBetsX.toString(),
      winnerAddress: this.winnerAddress,
      winnerName: this.winnerName,
      resolution: this.resolution,
      gameData: this.getGamePayload(),
      secondsLeft: this.bettingCountdownSeconds,
      createdAt: this.createdAt,
      expiresAt: this.playerB ? (this.playerBExpiresAt || this.expiresAt) : this.expiresAt,
      playerBExpiresAt: this.playerBExpiresAt,
      isPrivate: this.isPrivate,
      allowSpectators: this.allowSpectators,
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
  public handleDisconnect(wallet: string, ws?: WebSocket, telegramId?: string) {
    let disconnectedPlayer: PlayerSession | undefined;
    let opponent: PlayerSession | undefined;
    let side: 'A' | 'B' | null = null;

    if (ws) {
      if (this.playerA?.ws === ws) side = 'A';
      else if (this.playerB?.ws === ws) side = 'B';
    }
    if (!side && telegramId) {
      if (this.playerA?.telegramId && String(this.playerA.telegramId) === String(telegramId)) side = 'A';
      else if (this.playerB?.telegramId && String(this.playerB.telegramId) === String(telegramId)) side = 'B';
    }
    if (!side && wallet) {
      if (this.isSameWallet(wallet, this.playerA.walletAddress)) side = 'A';
      else if (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress)) side = 'B';
      else if (this.playerA.telegramId && (this.isSameWallet(wallet, `tg_${this.playerA.telegramId}`) || wallet === String(this.playerA.telegramId))) side = 'A';
      else if (this.playerB?.telegramId && (this.isSameWallet(wallet, `tg_${this.playerB.telegramId}`) || wallet === String(this.playerB.telegramId))) side = 'B';
    }

    if (!side) return;

    if (side === 'A') {
      disconnectedPlayer = this.playerA;
      opponent = this.playerB;
    } else {
      disconnectedPlayer = this.playerB;
      opponent = this.playerA;
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
      let secondsRemaining = 15;
      this.broadcast({
        type: 'PLAYER_DISCONNECTED',
        side,
        gracePeriodSeconds: secondsRemaining,
        forfeiterName: disconnectedPlayer.username,
        message: `${disconnectedPlayer.username} disconnesso. Conto alla rovescia di 15 secondi per la vittoria a tavolino.`,
      });

      disconnectedPlayer.disconnectTimer = setInterval(() => {
        secondsRemaining -= 1;
        if (secondsRemaining > 0) {
          this.broadcast({
            type: 'PLAYER_DISCONNECTED_TICK',
            side,
            secondsLeft: secondsRemaining,
            forfeiterName: disconnectedPlayer!.username,
          });
        } else {
          if (disconnectedPlayer?.disconnectTimer) {
            clearInterval(disconnectedPlayer.disconnectTimer);
            disconnectedPlayer.disconnectTimer = undefined;
          }
          if (!disconnectedPlayer?.connected && opponent) {
            this.triggerForfeit(opponent.walletAddress, disconnectedPlayer!.username);
          }
        }
      }, 1000);
    } else {
      // In LOBBY or BETTING_WINDOW, no forfeit penalty
      this.broadcast({
        type: 'PLAYER_DISCONNECTED',
        side,
        message: `${disconnectedPlayer.username} si è allontanato dalla stanza.`,
      });
      this.broadcastRoomState();
    }
  }

  protected triggerForfeit(winnerWallet: string, forfeiterName: string) {
    if (this.playerA.disconnectTimer) {
      clearInterval(this.playerA.disconnectTimer);
      clearTimeout(this.playerA.disconnectTimer as any);
      this.playerA.disconnectTimer = undefined;
    }
    if (this.playerB?.disconnectTimer) {
      clearInterval(this.playerB.disconnectTimer);
      clearTimeout(this.playerB.disconnectTimer as any);
      this.playerB.disconnectTimer = undefined;
    }
    this.state = 'FORFEITED';
    this.forfeitWinner = winnerWallet;
    this.broadcast({
      type: 'MATCH_FORFEITED',
      forfeiterName,
      winnerAddress: winnerWallet,
      message: `${forfeiterName} non si è riconnesso in tempo. Vittoria a tavolino assegnata!`,
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
      const { botT, resolveLanguage } = await import('../bot/i18n.js');
      const { GAMES_CONFIG } = await import('../config/gamesConfig.js');
      const { dbService } = await import('../services/db.js');

      const bot = getTelegramBot();
      if (!bot) return;

      const recipientAccount = targetPlayer.telegramId
        ? dbService.findUser(targetPlayer.telegramId)
        : (targetPlayer.walletAddress ? dbService.findUser(targetPlayer.walletAddress) : null);
      const recipientLang = resolveLanguage(recipientAccount?.customLanguageCode || recipientAccount?.languageCode);

      const gameConfig = (GAMES_CONFIG as any)[this.gameType];
      const gameTitle = gameConfig?.name || this.gameType.toUpperCase();
      const wagerGram = (Number(this.config.wagerAmountNano) / 1e9).toFixed(2);

      // Helper to identify generic fallback names/placeholders
      const isPlaceholder = (name?: string): boolean => {
        if (!name) return true;
        const n = name.trim().toLowerCase();
        return (
          n === 'player a' ||
          n === 'player b' ||
          n === 'guerriero' ||
          n === 'warrior' ||
          n === 'spettatore' ||
          n === 'un giocatore' ||
          n === 'un duellante' ||
          n.startsWith('player_') ||
          n.startsWith('user #') ||
          n.startsWith('id:')
        );
      };

      let senderUsername = '';
      let senderFirstName = senderPlayer.firstName;

      try {
        const senderAccount = senderPlayer.telegramId
          ? dbService.findUser(senderPlayer.telegramId)
          : (senderPlayer.walletAddress ? dbService.findUser(senderPlayer.walletAddress) : null);

        if (senderAccount) {
          if (senderAccount.username && typeof senderAccount.username === 'string') {
            const cleanU = senderAccount.username.trim().replace(/^@/, '');
            if (cleanU && !isPlaceholder(cleanU)) {
              senderUsername = cleanU;
            }
          }
          if (!senderFirstName) {
            senderFirstName = senderAccount.firstName || (senderAccount.displayName ? senderAccount.displayName.trim().split(/\s+/)[0] : undefined);
          }
        }
      } catch (err) {
        console.warn('[BaseGameRoom] Could not lookup sender in dbService:', err);
      }

      if (!senderUsername && senderPlayer.username) {
        const cleanPlayerU = senderPlayer.username.trim();
        if (cleanPlayerU.startsWith('@')) {
          const stripped = cleanPlayerU.replace(/^@/, '').trim();
          if (stripped && !isPlaceholder(stripped)) {
            senderUsername = stripped;
          }
        } else if (!isPlaceholder(cleanPlayerU) && !cleanPlayerU.includes(' ')) {
          if (!senderFirstName) {
            senderFirstName = cleanPlayerU;
          }
        } else if (!senderFirstName && !isPlaceholder(cleanPlayerU)) {
          senderFirstName = cleanPlayerU.split(/\s+/)[0];
        }
      }

      const rawSenderName = senderUsername
        ? `@${senderUsername}`
        : (senderFirstName && !isPlaceholder(senderFirstName) ? senderFirstName : 'Un giocatore');

      const senderName = rawSenderName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const text = botT(recipientLang, action === 'ready' ? 'opponent_ready_msg' : 'opponent_joined_msg', {
        senderName,
        gameTitle,
        matchId: this.matchId.toString(),
        wager: wagerGram,
      });

      const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';
      const btnLabel = botT(recipientLang, 'btn_enter_duel');
      const keyboard = new InlineKeyboard().webApp(btnLabel, `${webAppUrl}?startapp=duel_${this.matchId}`);

      await bot.api.sendMessage(Number(targetPlayer.telegramId), text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      console.log(`[BaseGameRoom] Sent '${action}' notification to tg:${targetPlayer.telegramId} for match #${this.matchId} in lang:${recipientLang}`);
    } catch (err: any) {
      console.warn(`[BaseGameRoom] Could not send '${action}' notification to tg:${targetPlayer.telegramId}:`, err?.message || err);
    }
  }

  // Spectator Pari-Mutuel Window (20s for public/spectator-enabled rooms, immediate start if no spectators)
  public startBettingWindow() {
    this.cancelLobbyExpirationTimer();
    this.cancelPlayerBExpirationTimer();
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = undefined;
    }

    if (!this.allowSpectators) {
      // Spectators not allowed for this private match: start match immediately!
      this.state = 'GAME_ACTIVE';
      this.onGameStart();
      return;
    }

    this.state = 'BETTING_WINDOW';
    const dynamicConfig = feeConfig.getConfig();
    const duration = this.config.bettingWindowSeconds ?? dynamicConfig.bettingWindowSeconds ?? 20;
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
        oddsC: this.calculateOdds('C'),
        oddsD: this.calculateOdds('D'),
        oddsX: this.calculateOdds('X'),
        totalBetsA: this.totalBetsA.toString(),
        totalBetsB: this.totalBetsB.toString(),
        totalBetsC: this.totalBetsC.toString(),
        totalBetsD: this.totalBetsD.toString(),
        totalBetsX: this.totalBetsX.toString(),
      });

      if (countdown <= 0) {
        if (this.bettingTimer) {
          clearInterval(this.bettingTimer);
          this.bettingTimer = undefined;
        }
        this.bettingCountdownSeconds = undefined;
        // Check if only one side (or single bettor) placed a bet; if so, refund immediately
        this.checkAndRefundOneSidedSpectatorBets();
        this.onGameStart();
      }
    }, 1000);
  }

  public checkAndRefundOneSidedSpectatorBets() {
    if (this.spectatorBets.length === 0) return;

    const hasBetsA = this.totalBetsA > 0n;
    const hasBetsB = this.totalBetsB > 0n;
    const hasBetsC = this.totalBetsC > 0n;
    const hasBetsD = this.totalBetsD > 0n;
    const hasBetsX = this.totalBetsX > 0n;
    const distinctSides = (hasBetsA ? 1 : 0) + (hasBetsB ? 1 : 0) + (hasBetsC ? 1 : 0) + (hasBetsD ? 1 : 0) + (hasBetsX ? 1 : 0);

    // If all bets are placed on only 1 side (or only 1 bettor), there is no opposing pool to win against!
    // Immediately refund stakes and fees so users aren't locked in or losing fees.
    if (distinctSides <= 1) {
      console.log(`[BaseGameRoom] Match #${this.matchId}: Only ${distinctSides} side backed by spectators (${this.spectatorBets.length} bet(s)). Refunding all bets.`);

      const refundedSettlements: Array<{
        walletAddress: string;
        telegramId?: string;
        target: string;
        amountGram: number;
        won: boolean;
        payoutGram: string;
        refunded: boolean;
        refundReasonKey?: string;
      }> = [];

      for (const bet of this.spectatorBets) {
        const refundTotal = (bet.amountGram + (bet.feePaidGram || 0)).toFixed(2);
        refundedSettlements.push({
          walletAddress: bet.walletAddress,
          telegramId: bet.telegramId,
          target: bet.target,
          amountGram: bet.amountGram,
          won: false,
          payoutGram: refundTotal,
          refunded: true,
          refundReasonKey: 'spectator_refund_reason_one_sided',
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

      if (refundedSettlements.length > 0) {
        this.notifySpectatorRefunds(refundedSettlements, 'one_sided').catch((err) =>
          console.error('[BaseGameRoom] Error dispatching one-sided refund notifications:', err)
        );
      }

      this.spectatorBets = [];
      this.totalBetsA = 0n;
      this.totalBetsB = 0n;
      this.totalBetsC = 0n;
      this.totalBetsD = 0n;
      this.totalBetsX = 0n;

      this.broadcast({
        type: 'ODDS_UPDATE',
        totalBetsA: '0',
        totalBetsB: '0',
        totalBetsC: '0',
        totalBetsD: '0',
        totalBetsX: '0',
        oddsA: this.calculateOdds('A'),
        oddsB: this.calculateOdds('B'),
        oddsC: this.calculateOdds('C'),
        oddsD: this.calculateOdds('D'),
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
    const spectatorSettlements = this.settleSpectatorBets(winnerAddress);

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

  public settleSpectatorBets(winnerAddress: string): Array<any> {
    let winningSide: SpectatorTarget = 'A';
    if (this.isSameWallet(winnerAddress, this.playerA.walletAddress)) {
      winningSide = 'A';
    } else if (this.playerB && this.isSameWallet(winnerAddress, this.playerB.walletAddress)) {
      winningSide = 'B';
    } else if ((this as any).seats && Array.isArray((this as any).seats)) {
      const seatIdx = (this as any).seats.findIndex((s: any) => s.walletAddress && this.isSameWallet(s.walletAddress, winnerAddress));
      if (seatIdx === 0) winningSide = 'A';
      else if (seatIdx === 1) winningSide = 'B';
      else if (seatIdx === 2) winningSide = 'C';
      else if (seatIdx === 3) winningSide = 'D';
    } else if ((this as any).extraPlayers && Array.isArray((this as any).extraPlayers)) {
      const epIdx = (this as any).extraPlayers.findIndex((p: any) => p.walletAddress && this.isSameWallet(p.walletAddress, winnerAddress));
      if (epIdx === 0) winningSide = 'C';
      else if (epIdx === 1) winningSide = 'D';
    }

    const totalPoolNano = this.totalBetsA + this.totalBetsB + this.totalBetsC + this.totalBetsD + this.totalBetsX;
    const spectatorSettlements: Array<{
      walletAddress: string;
      telegramId?: string;
      target: string;
      won: boolean;
      payoutGram: string;
      refunded?: boolean;
      refundReasonKey?: string;
      amountGram?: number;
      odds?: number;
      feePaidGram?: number;
    }> = [];

    if (totalPoolNano > 0n && this.spectatorBets.length > 0) {
      // 1. Check if the pool is one-sided (or only 1 bettor in total): no opposing bets to contest!
      const hasBetsA = this.totalBetsA > 0n;
      const hasBetsB = this.totalBetsB > 0n;
      const hasBetsC = this.totalBetsC > 0n;
      const hasBetsD = this.totalBetsD > 0n;
      const hasBetsX = this.totalBetsX > 0n;
      const distinctSides = (hasBetsA ? 1 : 0) + (hasBetsB ? 1 : 0) + (hasBetsC ? 1 : 0) + (hasBetsD ? 1 : 0) + (hasBetsX ? 1 : 0);

      if (distinctSides <= 1) {
        console.log(`[BaseGameRoom] settleSpectatorBets for match #${this.matchId}: Only ${distinctSides} side backed (${this.spectatorBets.length} bet(s)). Refunding all spectator bets.`);
        for (const bet of this.spectatorBets) {
          const refundTotal = (bet.amountGram + (bet.feePaidGram || 0)).toFixed(2);
          spectatorSettlements.push({
            walletAddress: bet.walletAddress,
            telegramId: bet.telegramId,
            target: bet.target,
            amountGram: bet.amountGram,
            odds: bet.odds,
            feePaidGram: bet.feePaidGram,
            won: false,
            payoutGram: refundTotal,
            refunded: true,
            refundReasonKey: 'spectator_refund_reason_one_sided',
          });
          dbService.refundUserBalance(
            bet.walletAddress,
            refundTotal,
            `Refund for spectator bet on match #${this.matchId} (one-sided pool, no opposing bets)`,
            bet.telegramId
          ).catch((err) => {
            console.error(`[BaseGameRoom] Error refunding spectator ${bet.walletAddress}:`, err);
          });
        }
      } else {
        const { spectatorRakePercent } = feeConfig.getConfig();
        const winningBets = this.spectatorBets.filter((b) => b.target === winningSide);
        let totalWinningBetsNano = 0n;
        if (winningSide === 'A') totalWinningBetsNano = this.totalBetsA;
        else if (winningSide === 'B') totalWinningBetsNano = this.totalBetsB;
        else if (winningSide === 'C') totalWinningBetsNano = this.totalBetsC;
        else if (winningSide === 'D') totalWinningBetsNano = this.totalBetsD;
        else if (winningSide === 'X') totalWinningBetsNano = this.totalBetsX;

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
              const poolPayout = distributablePoolGram * share;
              // Parimutuel payout from the pool (with at least original stake return)
              const finalPayout = Math.max(poolPayout, bet.amountGram);
              const payoutGram = finalPayout.toFixed(2);

              spectatorSettlements.push({
                walletAddress: bet.walletAddress,
                telegramId: bet.telegramId,
                target: bet.target,
                amountGram: bet.amountGram,
                odds: bet.odds,
                feePaidGram: bet.feePaidGram,
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
                amountGram: bet.amountGram,
                odds: bet.odds,
                feePaidGram: bet.feePaidGram,
                won: false,
                payoutGram: '0.00',
              });
            }
          }
        } else {
          // No winners on winning side: all placed bets on other sides are lost
          for (const bet of this.spectatorBets) {
            spectatorSettlements.push({
              walletAddress: bet.walletAddress,
              telegramId: bet.telegramId,
              target: bet.target,
              amountGram: bet.amountGram,
              odds: bet.odds,
              feePaidGram: bet.feePaidGram,
              won: false,
              payoutGram: '0.00',
            });
          }
          if (distributablePoolGram > 0) {
            dbService.creditTreasury(distributablePoolGram.toFixed(2), 'SPECTATOR_RAKE', this.matchId.toString()).catch((err) => {
              console.error('[BaseGameRoom] Error crediting unclaimed spectator pool to treasury:', err);
            });
          }
        }
      }
    }

    // Direct notify to spectators still connected to websocket
    for (const spec of this.spectators.values()) {
      if (spec.wallet) {
        const mySettlement = spectatorSettlements.find((s) => this.isSameWallet(s.walletAddress, spec.wallet!));
        if (mySettlement) {
          try {
            spec.ws.send(JSON.stringify({
              type: 'SPECTATOR_OUTCOME',
              ...mySettlement,
            }));
          } catch {}
        }
      }
    }

    // Direct notify to spectators via private Telegram DM in their configured language
    if (spectatorSettlements.length > 0) {
      this.notifySpectatorSettlements(
        spectatorSettlements,
        winningSide,
        this.winnerName || ''
      ).catch((err) => console.error('[BaseGameRoom] Error dispatching spectator notifications:', err));
    }

    return spectatorSettlements;
  }

  /**
   * Sends private Telegram notifications to all spectators who placed a bet on this match,
   * rendered in each spectator's configured language.
   */
  public async notifySpectatorSettlements(
    settlements: Array<{
      walletAddress: string;
      telegramId?: string;
      target: string;
      won: boolean;
      payoutGram: string;
      refunded?: boolean;
      refundReasonKey?: string;
      amountGram?: number;
      odds?: number;
      feePaidGram?: number;
    }>,
    winningSide: string,
    winnerName: string,
    customOutcomeText?: string
  ) {
    if (!settlements || settlements.length === 0) return;

    try {
      const { getTelegramBot } = await import('../bot/index.js');
      const { SfidaInlineKeyboard: InlineKeyboard } = await import('../bot/keyboardUtils.js');
      const { botT, resolveLanguage } = await import('../bot/i18n.js');
      const { renderCustomEmojis } = await import('../bot/emojis.js');
      const { GAMES_CONFIG } = await import('../config/gamesConfig.js');
      const { dbService } = await import('../services/db.js');

      const bot = getTelegramBot();
      if (!bot) {
        console.warn(`[BaseGameRoom] Telegram bot instance unavailable, skipping spectator settlement notifications.`);
        return;
      }

      const escapeHtml = (str: any): string => {
        if (str === undefined || str === null) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };

      const rawWebUrl = process.env.WEBAPP_URL?.trim();
      const rawTgUrl = (process.env.TELEGRAM_WEBAPP_URL || '').trim();
      const botUsername = (process.env.BOT_USERNAME || 'sfidabot').replace(/^@/, '');
      const fallbackTgUrl = `https://t.me/${botUsername}`;

      const buildArenaKeyboard = (label: string) => {
        const keyboard = new InlineKeyboard();
        if (rawWebUrl && !rawWebUrl.includes('t.me') && rawWebUrl.startsWith('https://')) {
          keyboard.webApp(label, rawWebUrl);
        } else if (rawTgUrl && !rawTgUrl.includes('t.me') && rawTgUrl.startsWith('https://')) {
          keyboard.webApp(label, rawTgUrl);
        } else if (rawTgUrl) {
          keyboard.url(label, rawTgUrl);
        } else {
          keyboard.url(label, fallbackTgUrl);
        }
        return keyboard;
      };

      const gameConfig = (GAMES_CONFIG as any)[this.gameType];
      const gameTitle = gameConfig?.name || this.gameType.toUpperCase();

      const nameA = this.playerA.username || 'Player A';
      const nameB = this.playerB?.username || 'Player B';
      const duelistOpponents = (this as any).seats && (this as any).seats.length > 2
        ? (this as any).seats.slice(1).map((s: any) => s.username || 'Player').join(' vs ')
        : nameB;

      console.log(`[BaseGameRoom] Dispatching spectator settlement DMs for match #${this.matchId} to ${settlements.length} settlement(s)...`);

      // Track already notified Telegram IDs to prevent duplicate DMs for the exact same settlement
      const notifiedTgIds = new Set<string>();

      for (const settlement of settlements) {
        try {
          // Comprehensive Telegram ID resolution
          let candidateTg: string | undefined = settlement.telegramId ? String(settlement.telegramId) : undefined;

          // 1. If prefixed with tg_, strip it
          if (candidateTg && candidateTg.startsWith('tg_')) {
            candidateTg = candidateTg.replace(/^tg_/, '');
          }

          // 2. Fallback to matching bet from room spectatorBets
          if (!candidateTg) {
            const matchingBet = this.spectatorBets.find((b) => {
              if (b.walletAddress && settlement.walletAddress && this.isSameWallet(b.walletAddress, settlement.walletAddress)) return true;
              return false;
            });
            if (matchingBet?.telegramId) {
              candidateTg = String(matchingBet.telegramId).replace(/^tg_/, '');
            }
          }

          // 3. Fallback to walletAddress starting with tg_
          if (!candidateTg && settlement.walletAddress?.startsWith('tg_')) {
            candidateTg = settlement.walletAddress.replace(/^tg_/, '');
          }

          // 4. Query dbService findUser by walletAddress
          if (!candidateTg && settlement.walletAddress) {
            const userObj = dbService.findUser(settlement.walletAddress);
            if (userObj?.telegramId) {
              candidateTg = String(userObj.telegramId).replace(/^tg_/, '');
            }
          }

          // 5. Query dbService getUserAccount by walletAddress (skip placeholder addresses)
          if (!candidateTg && settlement.walletAddress && !settlement.walletAddress.startsWith('spectator_')) {
            const userAcc = await dbService.getUserAccount(settlement.walletAddress);
            if (userAcc?.telegramId) {
              candidateTg = String(userAcc.telegramId).replace(/^tg_/, '');
            }
          }

          const cleanTgId = candidateTg ? candidateTg.trim() : '';
          const numericTgId = Number(cleanTgId);

          if (!cleanTgId || isNaN(numericTgId) || numericTgId <= 0) {
            console.warn(`[BaseGameRoom] Could not resolve valid numeric telegramId for spectator settlement (wallet=${settlement.walletAddress}, rawTg=${settlement.telegramId})`);
            continue;
          }

          // Prevent sending identical duplicate DM if spectator had multiple duplicates in the settlements array
          const dedupeKey = `${cleanTgId}_${settlement.target}_${settlement.won}`;
          if (notifiedTgIds.has(dedupeKey)) {
            console.log(`[BaseGameRoom] Skipping duplicate settlement DM for tg:${cleanTgId} (${dedupeKey})`);
            continue;
          }
          notifiedTgIds.add(dedupeKey);

          const userLang = await dbService.getUserLanguage(cleanTgId);
          const lang = resolveLanguage(userLang);

          const bet = this.spectatorBets.find(
            (b) =>
              (b.walletAddress && settlement.walletAddress && this.isSameWallet(b.walletAddress, settlement.walletAddress)) ||
              (b.telegramId && String(b.telegramId).replace(/^tg_/, '') === cleanTgId)
          );

          const stakeGram = (settlement.amountGram !== undefined && settlement.amountGram > 0)
            ? settlement.amountGram.toFixed(2)
            : (bet ? bet.amountGram.toFixed(2) : '0.00');

          const targetSide = settlement.target || bet?.target || 'A';
          let targetLabel = '';
          if (targetSide === 'A') {
            targetLabel = nameA;
          } else if (targetSide === 'B') {
            targetLabel = nameB;
          } else if (targetSide === 'C') {
            targetLabel = (this as any).seats?.[2]?.username || (this as any).extraPlayers?.[0]?.username || 'Player C';
          } else if (targetSide === 'D') {
            targetLabel = (this as any).seats?.[3]?.username || (this as any).extraPlayers?.[1]?.username || 'Player D';
          } else if (targetSide === 'X') {
            targetLabel = this.gameType === 'split' ? 'Peace (Split & Split)' : 'Pareggio / Draw';
          } else {
            targetLabel = targetSide;
          }

          const outcomeDesc = customOutcomeText || (winnerName ? `🏆 ${winnerName}` : 'Finished');

          let rawMsgText = '';
          if (settlement.won) {
            const payout = settlement.payoutGram;
            const profit = Math.max(0, parseFloat(payout) - parseFloat(stakeGram)).toFixed(2);
            rawMsgText = botT(lang, 'spectator_notification_won', {
              game: escapeHtml(gameTitle),
              matchId: this.matchId.toString(),
              playerA: escapeHtml(nameA),
              playerB: escapeHtml(duelistOpponents),
              target: escapeHtml(targetLabel),
              stake: stakeGram,
              outcome: escapeHtml(outcomeDesc),
              payout,
              profit,
            });
          } else if (settlement.refunded) {
            const reasonKey = settlement.refundReasonKey || 'spectator_refund_reason_one_sided';
            const refundReason = botT(lang, reasonKey);
            rawMsgText = botT(lang, 'spectator_notification_refund', {
              game: escapeHtml(gameTitle),
              matchId: this.matchId.toString(),
              playerA: escapeHtml(nameA),
              playerB: escapeHtml(duelistOpponents),
              payout: settlement.payoutGram,
              reason: escapeHtml(refundReason),
            });
          } else {
            rawMsgText = botT(lang, 'spectator_notification_lost', {
              game: escapeHtml(gameTitle),
              matchId: this.matchId.toString(),
              playerA: escapeHtml(nameA),
              playerB: escapeHtml(duelistOpponents),
              target: escapeHtml(targetLabel),
              stake: stakeGram,
              winner: escapeHtml(winnerName || nameA),
            });
          }

          const formattedMsg = renderCustomEmojis(rawMsgText);
          const keyboard = buildArenaKeyboard(botT(lang, 'btn_open_arena') || '⚡ Open Arena');

          await bot.api.sendMessage(numericTgId, formattedMsg, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
          console.log(`[BaseGameRoom] Spectator settlement DM successfully delivered to tg:${numericTgId} for match #${this.matchId} (won: ${settlement.won}, payout: ${settlement.payoutGram})`);

          // Rate-limiting delay between sends to prevent Telegram flood limits
          await new Promise((r) => setTimeout(r, 80));
        } catch (itemErr: any) {
          console.warn(`[BaseGameRoom] Failed to send spectator settlement DM to spectator (${settlement.walletAddress}, tg:${settlement.telegramId}):`, itemErr?.message || itemErr);
        }
      }
    } catch (err) {
      console.error(`[BaseGameRoom] Error notifying spectators:`, err);
    }
  }

  /**
   * Sends private Telegram notifications for refunded spectator bets (e.g. one-sided pool, match cancelled).
   */
  public async notifySpectatorRefunds(
    settlements: Array<{
      walletAddress: string;
      telegramId?: string;
      payoutGram: string;
      amountGram?: number;
      target?: string;
    }>,
    reasonType: 'one_sided' | 'cancelled',
    customReason?: string
  ) {
    if (!settlements || settlements.length === 0) return;

    try {
      const { getTelegramBot } = await import('../bot/index.js');
      const { SfidaInlineKeyboard: InlineKeyboard } = await import('../bot/keyboardUtils.js');
      const { botT, resolveLanguage } = await import('../bot/i18n.js');
      const { renderCustomEmojis } = await import('../bot/emojis.js');
      const { GAMES_CONFIG } = await import('../config/gamesConfig.js');
      const { dbService } = await import('../services/db.js');

      const bot = getTelegramBot();
      if (!bot) return;

      const escapeHtml = (str: any): string => {
        if (str === undefined || str === null) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };

      const rawWebUrl = process.env.WEBAPP_URL?.trim();
      const rawTgUrl = (process.env.TELEGRAM_WEBAPP_URL || '').trim();
      const botUsername = (process.env.BOT_USERNAME || 'sfidabot').replace(/^@/, '');
      const fallbackTgUrl = `https://t.me/${botUsername}`;

      const buildArenaKeyboard = (label: string) => {
        const keyboard = new InlineKeyboard();
        if (rawWebUrl && !rawWebUrl.includes('t.me') && rawWebUrl.startsWith('https://')) {
          keyboard.webApp(label, rawWebUrl);
        } else if (rawTgUrl && !rawTgUrl.includes('t.me') && rawTgUrl.startsWith('https://')) {
          keyboard.webApp(label, rawTgUrl);
        } else if (rawTgUrl) {
          keyboard.url(label, rawTgUrl);
        } else {
          keyboard.url(label, fallbackTgUrl);
        }
        return keyboard;
      };

      const gameConfig = (GAMES_CONFIG as any)[this.gameType];
      const gameTitle = gameConfig?.name || this.gameType.toUpperCase();

      const nameA = this.playerA.username || 'Player A';
      const nameB = this.playerB?.username || 'Player B';
      const duelistOpponents = (this as any).seats && (this as any).seats.length > 2
        ? (this as any).seats.slice(1).map((s: any) => s.username || 'Player').join(' vs ')
        : nameB;

      const notifiedTgIds = new Set<string>();

      for (const settlement of settlements) {
        try {
          let candidateTg: string | undefined = settlement.telegramId ? String(settlement.telegramId) : undefined;
          if (candidateTg && candidateTg.startsWith('tg_')) {
            candidateTg = candidateTg.replace(/^tg_/, '');
          }
          if (!candidateTg) {
            const matchingBet = this.spectatorBets.find(
              (b) => b.walletAddress && this.isSameWallet(b.walletAddress, settlement.walletAddress)
            );
            if (matchingBet?.telegramId) {
              candidateTg = String(matchingBet.telegramId).replace(/^tg_/, '');
            }
          }
          if (!candidateTg && settlement.walletAddress?.startsWith('tg_')) {
            candidateTg = settlement.walletAddress.replace(/^tg_/, '');
          }
          if (!candidateTg && settlement.walletAddress) {
            const userObj = dbService.findUser(settlement.walletAddress);
            if (userObj?.telegramId) {
              candidateTg = String(userObj.telegramId).replace(/^tg_/, '');
            }
          }
          if (!candidateTg && settlement.walletAddress && !settlement.walletAddress.startsWith('spectator_')) {
            const userAcc = await dbService.getUserAccount(settlement.walletAddress);
            if (userAcc?.telegramId) {
              candidateTg = String(userAcc.telegramId).replace(/^tg_/, '');
            }
          }

          const cleanTgId = candidateTg ? candidateTg.trim() : '';
          const numericTgId = Number(cleanTgId);
          if (!cleanTgId || isNaN(numericTgId) || numericTgId <= 0) {
            console.warn(`[BaseGameRoom] Skipping spectator refund DM: invalid numeric tgId '${candidateTg}' for wallet ${settlement.walletAddress}`);
            continue;
          }

          if (notifiedTgIds.has(cleanTgId)) {
            continue;
          }
          notifiedTgIds.add(cleanTgId);

          const userLang = await dbService.getUserLanguage(cleanTgId);
          const lang = resolveLanguage(userLang);

          const reasonText = customReason || (
            reasonType === 'one_sided'
              ? botT(lang, 'spectator_refund_reason_one_sided')
              : botT(lang, 'spectator_refund_reason_cancelled')
          );

          const rawMsgText = botT(lang, 'spectator_notification_refund', {
            game: escapeHtml(gameTitle),
            matchId: this.matchId.toString(),
            playerA: escapeHtml(nameA),
            playerB: escapeHtml(duelistOpponents),
            payout: settlement.payoutGram,
            reason: escapeHtml(reasonText),
          });

          const formattedMsg = renderCustomEmojis(rawMsgText);
          const keyboard = buildArenaKeyboard(botT(lang, 'btn_open_arena') || '⚡ Open Arena');

          await bot.api.sendMessage(numericTgId, formattedMsg, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
          console.log(`[BaseGameRoom] Spectator refund DM successfully delivered to tg:${numericTgId} for match #${this.matchId}`);

          await new Promise((r) => setTimeout(r, 80));
        } catch (sendErr: any) {
          console.warn(`[BaseGameRoom] Failed to send refund DM to spectator (wallet=${settlement.walletAddress}, tg=${settlement.telegramId}):`, sendErr?.message || sendErr);
        }
      }
    } catch (err) {
      console.error(`[BaseGameRoom] Error notifying spectator refunds:`, err);
    }
  }

  // Spectator Pari-Mutuel Bet
  public registerSpectatorBet(
    target: SpectatorTarget,
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
        (this.playerB && this.isSameWallet(bettorWallet, this.playerB.walletAddress)) ||
        ((this as any).isPlayerParticipant && (this as any).isPlayerParticipant(bettorWallet, telegramId)))
    ) {
      console.warn(`[BaseGameRoom] Duelist ${bettorWallet} attempted spectator bet. Denied.`);
      return;
    }

    const amountGram = Number(amountNano) / 1e9;
    const currentOdds = this.calculateOdds(target);

    if (target === 'A') {
      this.totalBetsA += amountNano;
    } else if (target === 'B') {
      this.totalBetsB += amountNano;
    } else if (target === 'C') {
      this.totalBetsC += amountNano;
    } else if (target === 'D') {
      this.totalBetsD += amountNano;
    } else {
      this.totalBetsX += amountNano;
    }

    const cleanTg = telegramId ? String(telegramId).replace(/^tg_/, '').trim() : undefined;
    const effectiveWallet = bettorWallet || (cleanTg ? `tg_${cleanTg}` : `spectator_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

    this.spectatorBets.push({
      walletAddress: effectiveWallet,
      telegramId: cleanTg,
      target,
      amountGram,
      amountNano,
      odds: currentOdds,
      feePaidGram,
      timestamp: Date.now(),
    });

    console.log(`[BaseGameRoom] Match #${this.matchId}: registered spectator bet on ${target} for ${effectiveWallet} (tg: ${cleanTg || 'none'}), amount: ${amountGram.toFixed(2)} GRAM. Total bets in room: ${this.spectatorBets.length}`);

    this.broadcast({
      type: 'ODDS_UPDATE',
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsC: this.totalBetsC.toString(),
      totalBetsD: this.totalBetsD.toString(),
      totalBetsX: this.totalBetsX.toString(),
      oddsA: this.calculateOdds('A'),
      oddsB: this.calculateOdds('B'),
      oddsC: this.calculateOdds('C'),
      oddsD: this.calculateOdds('D'),
      oddsX: this.calculateOdds('X'),
    });
  }

  public calculateOdds(side: SpectatorTarget): number {
    const totalPool = Number(this.totalBetsA + this.totalBetsB + this.totalBetsC + this.totalBetsD + this.totalBetsX);
    let defaultOdds = 2.0;
    if (this.gameType === 'split' || side === 'X') {
      defaultOdds = 2.8;
    } else if (this.gameType === 'poker') {
      const numContenders = (this as any).maxPlayers || ((this as any).seats?.length) || 2;
      defaultOdds = numContenders === 4 ? 3.8 : (numContenders === 3 ? 2.85 : 1.95);
    }

    if (totalPool === 0) return defaultOdds;

    const { spectatorRakePercent } = feeConfig.getConfig();
    const distributablePool = totalPool * (1 - (spectatorRakePercent || 0) / 100);
    let sideBets = 0;
    if (side === 'A') sideBets = Number(this.totalBetsA);
    else if (side === 'B') sideBets = Number(this.totalBetsB);
    else if (side === 'C') sideBets = Number(this.totalBetsC);
    else if (side === 'D') sideBets = Number(this.totalBetsD);
    else if (side === 'X') sideBets = Number(this.totalBetsX);

    if (sideBets === 0) return defaultOdds;
    return Math.max(1.10, parseFloat((distributablePool / sideBets).toFixed(2)));
  }

  public abortRoom(reason: string = 'Match was cancelled.') {
    this.cleanupTimers();
    this.state = 'CANCELLED';

    // Refund any spectator bets + spectator fee
    if (this.spectatorBets.length > 0) {
      const abortRefunds: Array<{
        walletAddress: string;
        telegramId?: string;
        payoutGram: string;
        amountGram?: number;
        target?: string;
      }> = [];

      for (const bet of this.spectatorBets) {
        const refundTotal = (bet.amountGram + (bet.feePaidGram || 0)).toFixed(2);
        abortRefunds.push({
          walletAddress: bet.walletAddress,
          telegramId: bet.telegramId,
          target: bet.target,
          amountGram: bet.amountGram,
          payoutGram: refundTotal,
        });
        dbService.refundUserBalance(
          bet.walletAddress,
          refundTotal,
          `Refund for spectator bet on cancelled match #${this.matchId}`,
          bet.telegramId
        ).catch(console.error);
      }

      this.notifySpectatorRefunds(abortRefunds, 'cancelled', reason).catch((err) =>
        console.error('[BaseGameRoom] Error dispatching abort refund notifications:', err)
      );
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
                `{{emoji.clock}} <b>SFIDA ARENA • STANZA SCADUTA</b>\n\n` +
                `Nessun avversario si è unito alla tua stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) entro il tempo limite di 10 minuti.\n\n` +
                `{{emoji.moneyBag}} La tua puntata di <b>${refundTotal} GRAM</b> (inclusa fee) è stata rimborsata per intero sul tuo saldo.`;
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
            `{{emoji.clock}} <b>SFIDA ARENA • TEMPO SCADUTO</b>\n\n` +
            `Il creatore della stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) non ha avviato la partita entro il tempo limite.\n\n` +
            `{{emoji.moneyBag}} Sei stato rimosso dalla stanza e la tua puntata di <b>${wagerGram} GRAM</b> è stata riaccreditata sul tuo saldo.`;
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
            `{{emoji.clock}} <b>SFIDA ARENA • STANZA ANNULLATA</b>\n\n` +
            `La stanza di <b>${gameTitle}</b> (Stanza #${this.matchId}) è stata chiusa per inattività.\n\n` +
            `{{emoji.moneyBag}} La tua puntata di <b>${refundPlayerATotal} GRAM</b> è stata riaccreditata sul tuo saldo.`;
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
    if (data && typeof data === 'object' && data.serverTime === undefined) {
      data.serverTime = Date.now();
    }
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
      winnerSide: this.winnerAddress
        ? (this.isSameWallet(this.winnerAddress, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(this.winnerAddress, this.playerB.walletAddress) ? 'B' : undefined))
        : undefined,
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
      oddsC: this.calculateOdds('C'),
      oddsD: this.calculateOdds('D'),
      oddsX: this.calculateOdds('X'),
      totalBetsA: this.totalBetsA.toString(),
      totalBetsB: this.totalBetsB.toString(),
      totalBetsC: this.totalBetsC.toString(),
      totalBetsD: this.totalBetsD.toString(),
      totalBetsX: this.totalBetsX.toString(),
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

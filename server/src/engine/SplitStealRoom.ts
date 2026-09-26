import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { SplitStealState, SplitStealChoice, SplitStealOutcome } from '../types/gameTypes.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';
import { signerService } from '../services/signer.js';

export class SplitStealRoom extends BaseGameRoom {
  public phase: 'COUNTDOWN' | 'REVEALED' = 'COUNTDOWN';
  public choicesRevealed: boolean = false;
  public choiceA?: SplitStealChoice;
  public choiceB?: SplitStealChoice;
  public hasChosenA: boolean = false;
  public hasChosenB: boolean = false;
  public outcome?: SplitStealOutcome;
  public jackpotGram: number = 5.0;
  public jackpotStatus: 'ACTIVE' | 'CHARGING' = 'ACTIVE';
  public bonusAwardedGram?: number;
  public bonusPerPlayerGram?: number;
  public message?: string;

  private countdownTimer?: NodeJS.Timeout;
  private secondsLeft: number = 30;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'split', onSettled);
    this.jackpotGram = dbService.getTrustJackpotSync();
    this.jackpotStatus = dbService.isTrustJackpotActiveSync() ? 'ACTIVE' : 'CHARGING';
  }

  public getGamePayload(): SplitStealState {
    const liveJackpot = dbService.getTrustJackpotSync();
    const liveStatus = dbService.isTrustJackpotActiveSync() ? 'ACTIVE' : 'CHARGING';
    this.jackpotGram = liveJackpot;
    this.jackpotStatus = liveStatus;

    return {
      phase: this.phase,
      secondsLeft: this.secondsLeft,
      durationSeconds: 30,
      choicesRevealed: this.choicesRevealed,
      choiceA: this.choicesRevealed ? this.choiceA : undefined,
      choiceB: this.choicesRevealed ? this.choiceB : undefined,
      hasChosenA: this.hasChosenA,
      hasChosenB: this.hasChosenB,
      outcome: this.outcome,
      jackpotGram: liveJackpot,
      jackpotStatus: liveStatus,
      bonusAwardedGram: this.bonusAwardedGram,
      bonusPerPlayerGram: this.bonusPerPlayerGram,
      message: this.message,
      oddsX: this.calculateOdds('X'),
      totalBetsX: this.totalBetsX.toString(),
    };
  }

  public async onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.phase = 'COUNTDOWN';
    this.choicesRevealed = false;
    this.choiceA = undefined;
    this.choiceB = undefined;
    this.hasChosenA = false;
    this.hasChosenB = false;
    this.outcome = undefined;
    this.bonusAwardedGram = undefined;
    this.bonusPerPlayerGram = undefined;
    this.secondsLeft = 30;

    // Fetch live Trust Jackpot
    this.jackpotGram = await dbService.getTrustJackpot();
    this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';

    this.message = 'Decisione in segreto! Scegli SPLIT (coopera) o STEAL (tradisci) entro 30 secondi!';
    this.broadcast({
      type: 'SPLIT_STEAL_START',
      durationSeconds: 30,
      secondsLeft: 30,
      message: this.message,
      gameData: this.getGamePayload(),
    });

    this.broadcastRoomState();
    this.startChoiceCountdown();
  }

  private startChoiceCountdown() {
    this.cleanupGameTimers();

    this.countdownTimer = setInterval(() => {
      this.secondsLeft -= 1;

      this.broadcast({
        type: 'SPLIT_STEAL_TICK',
        secondsLeft: this.secondsLeft,
        hasChosenA: this.hasChosenA,
        hasChosenB: this.hasChosenB,
        gameData: this.getGamePayload(),
      });

      if (this.secondsLeft <= 0) {
        this.cleanupGameTimers();

        // Default unchosen players to SPLIT
        if (!this.hasChosenA) {
          this.choiceA = 'SPLIT';
          this.hasChosenA = true;
        }
        if (!this.hasChosenB) {
          this.choiceB = 'SPLIT';
          this.hasChosenB = true;
        }

        this.revealAndSettle();
      }
    }, 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    if (data.type === 'SPLIT_STEAL_CHOICE' && data.choice) {
      this.handlePlayerChoice(wallet, data.choice);
    }
  }

  public handlePlayerChoice(wallet: string, choice: 'SPLIT' | 'STEAL') {
    if (this.state !== 'GAME_ACTIVE' || this.phase !== 'COUNTDOWN') return;

    const side = this.isSameWallet(wallet, this.playerA.walletAddress)
      ? 'A'
      : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);

    if (!side) return;

    if (side === 'A') {
      if (this.hasChosenA) return;
      this.choiceA = choice === 'STEAL' ? 'STEAL' : 'SPLIT';
      this.hasChosenA = true;
    } else {
      if (this.hasChosenB) return;
      this.choiceB = choice === 'STEAL' ? 'STEAL' : 'SPLIT';
      this.hasChosenB = true;
    }

    const playerWs = side === 'A' ? this.playerA.ws : this.playerB?.ws;
    if (playerWs) {
      this.sendTo(playerWs, {
        type: 'CHOICE_CONFIRMED',
        choice,
        side,
        message: `Decisione registrata: ${choice}. Attendi lo showdown!`,
      });
    }

    this.broadcast({
      type: 'SPLIT_STEAL_CHOICE_LOCKED',
      side,
      hasChosenA: this.hasChosenA,
      hasChosenB: this.hasChosenB,
      message: `${side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B')} ha preso la sua decisione!`,
      gameData: this.getGamePayload(),
    });

    if (this.hasChosenA && this.hasChosenB) {
      this.cleanupGameTimers();
      setTimeout(() => {
        this.revealAndSettle();
      }, 700);
    }
  }

  private async revealAndSettle() {
    this.cleanupGameTimers();
    this.phase = 'REVEALED';
    this.choicesRevealed = true;

    // Safety checks
    if (!this.choiceA) this.choiceA = 'SPLIT';
    if (!this.choiceB) this.choiceB = 'SPLIT';

    const pA = this.choiceA;
    const pB = this.choiceB;
    const wagerNum = Number(this.config.wagerAmountNano) / 1e9;
    const totalPot = wagerNum * 2;
    // Steal vs Split: Betrayer wins 100% of the entire pot (2.00 GRAM on 1.00 wager), zero house rake!
    const duelPayoutGram = totalPot.toFixed(2);
    const duelRakeGram = '0.00';

    this.jackpotGram = await dbService.getTrustJackpot();
    const isJackpotActive = this.jackpotGram >= 5.0;
    this.jackpotStatus = isJackpotActive ? 'ACTIVE' : 'CHARGING';

    let winnerAddress: string = '';
    let winnerName: string = '';
    let outcomeMessage: string = '';
    let winningSpectatorSide: 'A' | 'B' | 'X' | 'NONE' = 'NONE';

    if (pA === 'STEAL' && pB === 'SPLIT') {
      // 1. Player 1 Steals, Player 2 Splits -> Player 1 wins entire pot
      this.outcome = 'P1_STEAL';
      winnerAddress = this.playerA.walletAddress;
      winnerName = this.playerA.username;
      winningSpectatorSide = 'A';
      outcomeMessage = `🗡️ TRADIMENTO! ${winnerName} sceglie STEAL e incassa l'intero piatto (${duelPayoutGram} GRAM)!`;

      // Credit winner
      await dbService.creditUserBalance(
        winnerAddress,
        duelPayoutGram,
        'MATCH_WIN',
        `Won Split or Steal duel #${this.matchId} (Steal vs Split)`
      );
      if (parseFloat(duelRakeGram) > 0) {
        await dbService.creditTreasury(duelRakeGram, 'DUEL_RAKE', this.matchId.toString());
      }
    } else if (pB === 'STEAL' && pA === 'SPLIT') {
      // 2. Player 2 Steals, Player 1 Splits -> Player 2 wins entire pot
      this.outcome = 'P2_STEAL';
      winnerAddress = this.playerB?.walletAddress || '';
      winnerName = this.playerB?.username || 'Player B';
      winningSpectatorSide = 'B';
      outcomeMessage = `🗡️ TRADIMENTO! ${winnerName} sceglie STEAL e incassa l'intero piatto (${duelPayoutGram} GRAM)!`;

      // Credit winner
      await dbService.creditUserBalance(
        winnerAddress,
        duelPayoutGram,
        'MATCH_WIN',
        `Won Split or Steal duel #${this.matchId} (Steal vs Split)`
      );
      if (parseFloat(duelRakeGram) > 0) {
        await dbService.creditTreasury(duelRakeGram, 'DUEL_RAKE', this.matchId.toString());
      }
    } else if (pA === 'SPLIT' && pB === 'SPLIT') {
      // 3. Peace: Both Split -> Refund original wagers + 20% Trust Jackpot bonus if active!
      this.outcome = 'PEACE';
      winningSpectatorSide = 'X';
      winnerAddress = ''; // Draw / Peace
      winnerName = 'Pace (Entrambi Split)';

      // Refund both players original wager
      await dbService.refundUserBalance(
        this.playerA.walletAddress,
        wagerNum.toFixed(2),
        `Wager refund for Peace in Split or Steal match #${this.matchId}`
      );
      if (this.playerB) {
        await dbService.refundUserBalance(
          this.playerB.walletAddress,
          wagerNum.toFixed(2),
          `Wager refund for Peace in Split or Steal match #${this.matchId}`
        );
      }

      // Check Trust Jackpot bonus
      if (isJackpotActive) {
        const totalBonus = Number((this.jackpotGram * 0.20).toFixed(2));
        const bonusEach = Number((totalBonus / 2).toFixed(2));
        this.bonusAwardedGram = totalBonus;
        this.bonusPerPlayerGram = bonusEach;

        await dbService.creditUserBalance(
          this.playerA.walletAddress,
          bonusEach.toFixed(2),
          'MATCH_WIN',
          `20% Trust Jackpot Bonus in match #${this.matchId}`
        );
        if (this.playerB) {
          await dbService.creditUserBalance(
            this.playerB.walletAddress,
            bonusEach.toFixed(2),
            'MATCH_WIN',
            `20% Trust Jackpot Bonus in match #${this.matchId}`
          );
        }

        await dbService.deductTrustJackpot(totalBonus);
        this.jackpotGram = await dbService.getTrustJackpot();
        this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';

        outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntata rimborsata + BONUS JACKPOT del 20% (+${bonusEach.toFixed(2)} GRAM a testa)!`;
      } else {
        outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate (Jackpot in carica < 5.0 GRAM, nessun bonus erogato).`;
      }
    } else {
      // 4. Double Betrayal: Both Steal -> Both lose 100%!
      // 50% to Platform Profit, 50% feeds the Trust Jackpot!
      this.outcome = 'DOUBLE_STEAL';
      winningSpectatorSide = 'NONE';
      winnerAddress = '';
      winnerName = 'Doppio Tradimento (Nessun Vincitore)';

      const halfPot = Number((totalPot / 2).toFixed(2));

      // 50% to platform treasury
      await dbService.creditTreasury(halfPot.toFixed(2), 'DOUBLE_STEAL_HOUSE_SHARE', this.matchId.toString());

      // 50% to Trust Jackpot
      await dbService.addTrustJackpot(halfPot);
      this.jackpotGram = await dbService.getTrustJackpot();
      this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';

      outcomeMessage = `💀 DOPPIO TRADIMENTO! Entrambi hanno scelto STEAL! 100% del piatto bruciato: 50% alla piattaforma (+${halfPot.toFixed(2)} GRAM) e 50% al Jackpot della Fiducia (+${halfPot.toFixed(2)} GRAM)!`;
    }

    this.message = outcomeMessage;

    // --- Settle Spectator Bets ---
    const totalSpecPoolNano = this.totalBetsA + this.totalBetsB + this.totalBetsX;
    const totalSpecPoolGram = Number(totalSpecPoolNano) / 1e9;

    if (totalSpecPoolGram > 0 && this.spectatorBets.length > 0) {
      if (winningSpectatorSide === 'NONE') {
        // Double Steal: ALL spectators lose!
        // 50% to Platform, 50% to Trust Jackpot!
        const specHalf = Number((totalSpecPoolGram / 2).toFixed(2));
        await dbService.creditTreasury(specHalf.toFixed(2), 'SPECTATOR_DOUBLE_STEAL_SHARE', this.matchId.toString());
        await dbService.addTrustJackpot(specHalf);
        this.jackpotGram = await dbService.getTrustJackpot();
        this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';
        console.log(`[SplitSteal] Double Steal: Spectator pool of ${totalSpecPoolGram} GRAM divided: ${specHalf} to treasury, ${specHalf} to Jackpot.`);
      } else {
        // Winning side is 'A', 'B', or 'X'
        const { spectatorRakePercent } = feeConfig.getConfig();
        const specRakeRate = (spectatorRakePercent || 0) / 100;
        const specRakeGram = totalSpecPoolGram * specRakeRate;
        const distributableSpecGram = totalSpecPoolGram - specRakeGram;

        if (specRakeGram > 0) {
          await dbService.creditTreasury(specRakeGram.toFixed(2), 'SPECTATOR_RAKE', this.matchId.toString());
        }

        const winningBets = this.spectatorBets.filter((b) => b.target === winningSpectatorSide);
        const winningBetsTotalNano =
          winningSpectatorSide === 'A'
            ? this.totalBetsA
            : winningSpectatorSide === 'B'
            ? this.totalBetsB
            : this.totalBetsX;
        const winningBetsGram = Number(winningBetsTotalNano) / 1e9;

        if (winningBets.length > 0 && winningBetsGram > 0) {
          for (const bet of winningBets) {
            const share = bet.amountGram / winningBetsGram;
            const payoutGram = (distributableSpecGram * share).toFixed(2);
            await dbService.creditUserBalance(
              bet.walletAddress,
              payoutGram,
              'MATCH_WIN',
              `Won 1-X-2 spectator bet (${winningSpectatorSide}) on Split or Steal #${this.matchId}`
            );
          }
        } else {
          // No winners on winning side: refund all spectators
          for (const bet of this.spectatorBets) {
            await dbService.refundUserBalance(
              bet.walletAddress,
              bet.amountGram.toFixed(2),
              `Refund for spectator bet on Split or Steal match #${this.matchId} (no winners on side ${winningSpectatorSide})`
            );
          }
        }
      }
    }

    // Set state
    this.state = 'MATCH_SETTLED';
    this.winnerAddress = winnerAddress;
    this.winnerName = winnerName;

    // Generate resolution signature (if winner exists or fallback to player A for draw)
    const timestamp = Math.floor(Date.now() / 1000);
    const signTargetAddress = winnerAddress || this.playerA.walletAddress;
    try {
      const { signatureHex, signatureCellBoc } = signerService.signResolution(
        this.matchId,
        signTargetAddress,
        timestamp
      );
      this.resolution = {
        matchId: this.matchId.toString(),
        winnerAddress: signTargetAddress,
        timestamp,
        signatureHex,
        signatureCellBoc,
      };
    } catch {}

    // Save match to database
    await dbService.saveMatch({
      matchId: this.matchId.toString(),
      escrowAddress: this.escrowAddress,
      wagerAmountNano: this.config.wagerAmountNano.toString(),
      wagerTon: wagerNum.toFixed(2),
      wagerGram: wagerNum.toFixed(2),
      payoutTon: duelPayoutGram,
      payoutGram: duelPayoutGram,
      playerAAddress: this.playerA.walletAddress,
      playerAName: this.playerA.username,
      playerATelegramId: this.playerA.telegramId,
      playerBAddress: this.playerB?.walletAddress,
      playerBName: this.playerB?.username,
      playerBTelegramId: this.playerB?.telegramId,
      winnerAddress,
      winnerName,
      winnerTelegramId: winnerAddress === this.playerA.walletAddress ? this.playerA.telegramId : this.playerB?.telegramId,
      scoreA: pA === 'STEAL' ? 1 : 0,
      scoreB: pB === 'STEAL' ? 1 : 0,
      gameType: 'split',
      settledAt: Date.now(),
      createdAt: Number(this.matchId) || Date.now(),
    });

    // Broadcast reveal & settled events
    this.broadcast({
      type: 'SPLIT_STEAL_REVEAL',
      choiceA: this.choiceA,
      choiceB: this.choiceB,
      outcome: this.outcome,
      jackpotGram: this.jackpotGram,
      jackpotStatus: this.jackpotStatus,
      bonusAwardedGram: this.bonusAwardedGram,
      bonusPerPlayerGram: this.bonusPerPlayerGram,
      message: this.message,
      gameData: this.getGamePayload(),
    });

    this.broadcast({
      type: 'MATCH_SETTLED',
      winnerAddress,
      winnerName,
      resolution: this.resolution,
      scoreA: pA === 'STEAL' ? 1 : 0,
      scoreB: pB === 'STEAL' ? 1 : 0,
      payoutTon: duelPayoutGram,
      message: this.message,
      gameData: this.getGamePayload(),
    });

    this.broadcastRoomState();

    // Auto cleanup after 90s
    if (this.settleCleanupTimer) clearTimeout(this.settleCleanupTimer);
    this.settleCleanupTimer = setTimeout(async () => {
      try {
        const { RoomManager } = await import('./RoomManager.js');
        RoomManager.getInstance().removeRoom(this.matchId.toString());
      } catch {}
    }, 90_000);
  }

  public cleanupGameTimers() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}

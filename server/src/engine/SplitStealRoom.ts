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
      // 3. Peace: Both Split -> Refund original wagers + Trust Jackpot bonus if qualified
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

      const {
        splitJackpotBonusPercent = 25,
        splitJackpotProbabilityPercent = 30,
      } = feeConfig.getConfig();

      // Check Trust Jackpot qualifications
      const isPublicMatch = !this.isPrivate && !this.config.groupChatId;

      if (!isPublicMatch) {
        outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%. (Il Bonus Trust Jackpot è attivo solo nelle partite pubbliche del Lobby).`;
      } else if (!isJackpotActive) {
        outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%. (Jackpot in carica < 5.0 GRAM, nessun bonus erogato).`;
      } else {
        // Roll for Lucky Drop (e.g. 30% probability)
        const luckyDrop = Math.random() < (splitJackpotProbabilityPercent / 100);

        if (!luckyDrop) {
          outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%. (Jackpot Lucky Drop ${splitJackpotProbabilityPercent}% non estratto questa volta).`;
        } else {
          // Check anti-collusion eligibility (48h pair cooldown & referral lock)
          const pairEligibility = await dbService.canPairReceiveJackpot(
            this.playerA.walletAddress,
            this.playerB?.walletAddress || '',
            this.playerA.telegramId,
            this.playerB?.telegramId
          );

          if (!pairEligibility.eligible) {
            if (pairEligibility.reason === 'COOLDOWN_48H') {
              outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%. (Bonus Jackpot in cooldown: max 1 bonus ogni 48 ore tra gli stessi giocatori).`;
            } else if (pairEligibility.reason === 'REFERRAL_CONNECTED') {
              outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%. (Bonus Jackpot non applicabile: giocatori collegati da referral).`;
            } else {
              outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%.`;
            }
          } else {
            // Qualified! Bonus: 25% of wager per player, capped at half of 25% of the total jackpot
            const maxBonusFromJackpot = Number((this.jackpotGram * (splitJackpotBonusPercent / 100)).toFixed(2));
            const bonusPerPlayer = Math.min(
              Number((wagerNum * (splitJackpotBonusPercent / 100)).toFixed(2)),
              Number((maxBonusFromJackpot / 2).toFixed(2))
            );
            const totalBonus = Number((bonusPerPlayer * 2).toFixed(2));

            if (bonusPerPlayer > 0) {
              this.bonusAwardedGram = totalBonus;
              this.bonusPerPlayerGram = bonusPerPlayer;

              await dbService.creditUserBalance(
                this.playerA.walletAddress,
                bonusPerPlayer.toFixed(2),
                'MATCH_WIN',
                `Trust Jackpot Bonus (${splitJackpotBonusPercent}%) in match #${this.matchId}`
              );
              if (this.playerB) {
                await dbService.creditUserBalance(
                  this.playerB.walletAddress,
                  bonusPerPlayer.toFixed(2),
                  'MATCH_WIN',
                  `Trust Jackpot Bonus (${splitJackpotBonusPercent}%) in match #${this.matchId}`
                );
              }

              await dbService.deductTrustJackpot(totalBonus);
              await dbService.recordJackpotAward(
                this.playerA.walletAddress,
                this.playerB?.walletAddress || '',
                totalBonus,
                this.matchId.toString(),
                this.playerA.telegramId,
                this.playerB?.telegramId
              );

              this.jackpotGram = await dbService.getTrustJackpot();
              this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';

              outcomeMessage = `🎉 TRUST JACKPOT ATTIVATO (DROP ${splitJackpotProbabilityPercent}%)! Entrambi hanno scelto SPLIT! Puntata rimborsata + BONUS JACKPOT (+${bonusPerPlayer.toFixed(2)} GRAM a testa)!`;
            } else {
              outcomeMessage = `🤝 PACE ASSOLUTA! Entrambi i duellanti hanno scelto SPLIT! Puntate rimborsate al 100%.`;
            }
          }
        }
      }
    } else {
      // 4. Double Betrayal: Both Steal -> Both lose 100%!
      // 50% feeds the Trust Jackpot
      // 10% Affiliate Bounty: 5% to Group Affiliate + 5% to Referrers (2.5% Ref A, 2.5% Ref B)
      // Remaining 40% (plus unallocated shares) to Platform Treasury
      this.outcome = 'DOUBLE_STEAL';
      winningSpectatorSide = 'NONE';
      winnerAddress = '';
      winnerName = 'Doppio Tradimento (Nessun Vincitore)';

      const jackpotShare = Number((totalPot * 0.50).toFixed(4));
      await dbService.addTrustJackpot(jackpotShare);
      this.jackpotGram = await dbService.getTrustJackpot();
      this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';

      // 10% Affiliate Bounty Pool
      const groupShare = Number((totalPot * 0.05).toFixed(4));
      const refShareEach = Number((totalPot * 0.025).toFixed(4));
      let treasuryShare = Number((totalPot * 0.40).toFixed(4));

      // Fetch accounts to check affiliates/referrers
      const accA = await dbService.getUserAccount(this.playerA.walletAddress, this.playerA.telegramId);
      const accB = this.playerB ? await dbService.getUserAccount(this.playerB.walletAddress, this.playerB.telegramId) : null;
      const groupAffiliate = this.config.groupChatId ? await dbService.getGroupAffiliate(this.config.groupChatId) : null;

      // Group share (5%)
      if (groupAffiliate && this.config.groupChatId) {
        await dbService.recordGroupMatchRevenue(this.config.groupChatId, wagerNum, groupShare);
      } else {
        treasuryShare += groupShare;
      }

      // Player A referrer share (2.5%)
      if (accA?.referredBy) {
        await dbService.creditReferralEarnings(accA.referredBy, refShareEach, this.matchId.toString());
      } else {
        treasuryShare += refShareEach;
      }

      // Player B referrer share (2.5%)
      if (accB?.referredBy) {
        await dbService.creditReferralEarnings(accB.referredBy, refShareEach, this.matchId.toString());
      } else {
        treasuryShare += refShareEach;
      }

      // Credit remaining net share to Treasury
      await dbService.creditTreasury(treasuryShare.toFixed(2), 'DOUBLE_STEAL_HOUSE_SHARE', this.matchId.toString());

      outcomeMessage = `💀 DOPPIO TRADIMENTO! Entrambi hanno scelto STEAL! 100% del piatto bruciato: 50% al Jackpot della Fiducia (+${jackpotShare.toFixed(2)} GRAM), 10% Taglia Affiliati & Ref, e il resto alla Treasury!`;
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

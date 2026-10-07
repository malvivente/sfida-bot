import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { SplitStealState, SplitStealChoice, SplitStealOutcome } from '../types/gameTypes.js';
import { dbService } from '../services/db.js';
import { feeConfig } from '../config/feeConfig.js';
import { signerService } from '../services/signer.js';

export class SplitStealRoom extends BaseGameRoom {
  public phase: 'COUNTDOWN' | 'REVEALED' | 'ROUND_TRANSITION' = 'COUNTDOWN';
  public currentRound: number = 1;
  public maxRounds: number = 3;
  public roundHistory: Array<{
    round: number;
    choiceA: SplitStealChoice;
    choiceB: SplitStealChoice;
    outcome: string;
  }> = [];
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
  private secondsLeft: number = 15;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'split', onSettled);
    this.jackpotGram = dbService.getTrustJackpotSync();
    this.jackpotStatus = dbService.isTrustJackpotActiveSync() ? 'ACTIVE' : 'CHARGING';
    this.secondsLeft = feeConfig.getConfig().splitTurnDurationSeconds || 15;
  }

  public getRoundConfig(round: number) {
    const cfg = feeConfig.getConfig();
    if (round === 1) {
      return {
        peaceBonusPercent: cfg.splitRound1PeaceBonusPercent ?? 15,
        stealBonusPercent: cfg.splitRound1StealBonusPercent ?? 10,
        probabilityPercent: cfg.splitRound1ProbabilityPercent ?? 20,
      };
    } else if (round === 2) {
      return {
        peaceBonusPercent: cfg.splitRound2PeaceBonusPercent ?? 30,
        stealBonusPercent: cfg.splitRound2StealBonusPercent ?? 25,
        probabilityPercent: cfg.splitRound2ProbabilityPercent ?? 40,
      };
    } else {
      return {
        peaceBonusPercent: cfg.splitRound3PeaceBonusPercent ?? 50,
        stealBonusPercent: cfg.splitRound3StealBonusPercent ?? 40,
        probabilityPercent: cfg.splitRound3ProbabilityPercent ?? 70,
      };
    }
  }

  public getGamePayload(): SplitStealState {
    const liveJackpot = dbService.getTrustJackpotSync();
    const liveStatus = dbService.isTrustJackpotActiveSync() ? 'ACTIVE' : 'CHARGING';
    this.jackpotGram = liveJackpot;
    this.jackpotStatus = liveStatus;
    const roundCfg = this.getRoundConfig(this.currentRound);
    const duration = feeConfig.getConfig().splitTurnDurationSeconds || 15;

    return {
      phase: this.phase,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      roundHistory: this.roundHistory,
      roundProbabilities: roundCfg,
      secondsLeft: this.secondsLeft,
      durationSeconds: duration,
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
    this.currentRound = 1;
    this.maxRounds = 3;
    this.roundHistory = [];
    this.choicesRevealed = false;
    this.choiceA = undefined;
    this.choiceB = undefined;
    this.hasChosenA = false;
    this.hasChosenB = false;
    this.outcome = undefined;
    this.bonusAwardedGram = undefined;
    this.bonusPerPlayerGram = undefined;
    this.secondsLeft = feeConfig.getConfig().splitTurnDurationSeconds || 15;

    // Fetch live Trust Jackpot
    this.jackpotGram = await dbService.getTrustJackpot();
    this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';

    this.message = `⚔️ ROUND 1 / 3: Scegli SPLIT (coopera) o STEAL (tradisci) entro ${this.secondsLeft} secondi!`;
    this.broadcast({
      type: 'SPLIT_STEAL_START',
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      durationSeconds: this.secondsLeft,
      secondsLeft: this.secondsLeft,
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
        currentRound: this.currentRound,
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

        this.evaluateRound();
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
        currentRound: this.currentRound,
        message: `Decisione Round ${this.currentRound} registrata: ${choice}. Attendi lo showdown!`,
      });
    }

    this.broadcast({
      type: 'SPLIT_STEAL_CHOICE_LOCKED',
      side,
      currentRound: this.currentRound,
      hasChosenA: this.hasChosenA,
      hasChosenB: this.hasChosenB,
      message: `${side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B')} ha preso la sua decisione per il Round ${this.currentRound}!`,
      gameData: this.getGamePayload(),
    });

    if (this.hasChosenA && this.hasChosenB) {
      this.cleanupGameTimers();
      this.broadcast({
        type: 'SPLIT_STEAL_REVEALING',
        currentRound: this.currentRound,
        message: `Entrambi i giocatori hanno confermato la scelta per il Round ${this.currentRound}! Rivelazione in corso...`,
      });
      setTimeout(() => {
        this.evaluateRound();
      }, 1500);
    }
  }

  private async evaluateRound() {
    this.cleanupGameTimers();
    this.choicesRevealed = true;

    // Safety checks
    if (!this.choiceA) this.choiceA = 'SPLIT';
    if (!this.choiceB) this.choiceB = 'SPLIT';

    const pA = this.choiceA;
    const pB = this.choiceB;

    // Both chose SPLIT: check if we advance or settle
    if (pA === 'SPLIT' && pB === 'SPLIT') {
      if (this.currentRound < this.maxRounds) {
        // COOPERATION! Advance to next round!
        this.roundHistory.push({
          round: this.currentRound,
          choiceA: 'SPLIT',
          choiceB: 'SPLIT',
          outcome: 'COOPERATION',
        });
        this.phase = 'ROUND_TRANSITION';
        const nextRound = this.currentRound + 1;
        const nextCfg = this.getRoundConfig(nextRound);
        this.message = `🤝 PATTO MANTENUTO AL ROUND ${this.currentRound}! La fiducia regge. La posta sale: passaggio al Round ${nextRound}...`;

        this.broadcast({
          type: 'SPLIT_STEAL_ROUND_COOPERATION',
          currentRound: this.currentRound,
          nextRound,
          nextProbabilities: nextCfg,
          message: this.message,
          gameData: this.getGamePayload(),
        });
        this.broadcastRoomState();

        setTimeout(() => {
          this.currentRound = nextRound;
          this.phase = 'COUNTDOWN';
          this.choicesRevealed = false;
          this.choiceA = undefined;
          this.choiceB = undefined;
          this.hasChosenA = false;
          this.hasChosenB = false;
          this.secondsLeft = feeConfig.getConfig().splitTurnDurationSeconds || 15;
          this.message = `⚔️ ROUND ${this.currentRound} / ${this.maxRounds}: Scegli SPLIT o STEAL entro ${this.secondsLeft} secondi!`;

          this.broadcast({
            type: 'SPLIT_STEAL_ROUND_START',
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            secondsLeft: this.secondsLeft,
            message: this.message,
            gameData: this.getGamePayload(),
          });
          this.broadcastRoomState();
          this.startChoiceCountdown();
        }, 3000);
        return;
      }
    }

    // Either betrayal, double betrayal, or Round 3 Peace -> Settle the match!
    await this.revealAndSettle();
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

    const roundCfg = this.getRoundConfig(this.currentRound);
    const splitStealBonusPercent = roundCfg.stealBonusPercent;
    const splitPeaceBonusPercent = roundCfg.peaceBonusPercent;
    const splitJackpotProbabilityPercent = roundCfg.probabilityPercent;

    const isPublicMatch = !this.isPrivate && !this.config.groupChatId;

    if (pA === 'STEAL' && pB === 'SPLIT') {
      // 1. Player 1 Steals, Player 2 Splits -> Player 1 wins entire pot + chance of 20% Steal Temptation Jackpot Bounty!
      this.outcome = 'P1_STEAL';
      winnerAddress = this.playerA.walletAddress;
      winnerName = this.playerA.username;
      winningSpectatorSide = 'A';

      // Credit winner with full pot
      await dbService.creditUserBalance(
        winnerAddress,
        duelPayoutGram,
        'MATCH_WIN',
        `Won Split or Steal duel #${this.matchId} (Steal vs Split)`
      );
      if (parseFloat(duelRakeGram) > 0) {
        await dbService.creditTreasury(duelRakeGram, 'DUEL_RAKE', this.matchId.toString());
      }

      // Check Steal Temptation Bounty (20% of winner's wager from Trust Jackpot)
      if (isPublicMatch && isJackpotActive) {
        const luckyDrop = Math.random() < (splitJackpotProbabilityPercent / 100);
        if (luckyDrop) {
          const pairEligibility = await dbService.canPairReceiveJackpot(
            this.playerA.walletAddress,
            this.playerB?.walletAddress || '',
            this.playerA.telegramId,
            this.playerB?.telegramId
          );
          if (pairEligibility.eligible) {
            const maxBonusFromJackpot = Number((this.jackpotGram * 0.25).toFixed(2));
            const stealBonus = Math.min(
              Number((wagerNum * (splitStealBonusPercent / 100)).toFixed(2)),
              maxBonusFromJackpot
            );
            if (stealBonus > 0) {
              this.bonusAwardedGram = stealBonus;
              this.bonusPerPlayerGram = stealBonus;

              await dbService.creditUserBalance(
                winnerAddress,
                stealBonus.toFixed(2),
                'MATCH_WIN',
                `Steal Temptation Jackpot Bounty (${splitStealBonusPercent}%) in match #${this.matchId}`
              );
              await dbService.deductTrustJackpot(stealBonus);
              await dbService.recordJackpotAward(
                this.playerA.walletAddress,
                this.playerB?.walletAddress || '',
                stealBonus,
                this.matchId.toString(),
                this.playerA.telegramId,
                this.playerB?.telegramId
              );
              this.jackpotGram = await dbService.getTrustJackpot();
              this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';
            }
          }
        }
      }

      if (this.bonusAwardedGram && this.bonusAwardedGram > 0) {
        outcomeMessage = `🗡️ TRADIMENTO AL ROUND ${this.currentRound}! ${winnerName} sceglie STEAL e incassa l'intero piatto (${duelPayoutGram} GRAM) + BONUS TENTAZIONE JACKPOT ${splitStealBonusPercent}% (+${this.bonusAwardedGram.toFixed(2)} GRAM)!`;
      } else {
        outcomeMessage = `🗡️ TRADIMENTO AL ROUND ${this.currentRound}! ${winnerName} sceglie STEAL e incassa l'intero piatto (${duelPayoutGram} GRAM)!`;
      }
    } else if (pB === 'STEAL' && pA === 'SPLIT') {
      // 2. Player 2 Steals, Player 1 Splits -> Player 2 wins entire pot + chance of Steal Temptation Jackpot Bounty!
      this.outcome = 'P2_STEAL';
      winnerAddress = this.playerB?.walletAddress || '';
      winnerName = this.playerB?.username || 'Player B';
      winningSpectatorSide = 'B';

      // Credit winner with full pot
      await dbService.creditUserBalance(
        winnerAddress,
        duelPayoutGram,
        'MATCH_WIN',
        `Won Split or Steal duel #${this.matchId} (Steal vs Split)`
      );
      if (parseFloat(duelRakeGram) > 0) {
        await dbService.creditTreasury(duelRakeGram, 'DUEL_RAKE', this.matchId.toString());
      }

      // Check Steal Temptation Bounty from Trust Jackpot
      if (isPublicMatch && isJackpotActive) {
        const luckyDrop = Math.random() < (splitJackpotProbabilityPercent / 100);
        if (luckyDrop) {
          const pairEligibility = await dbService.canPairReceiveJackpot(
            this.playerA.walletAddress,
            this.playerB?.walletAddress || '',
            this.playerA.telegramId,
            this.playerB?.telegramId
          );
          if (pairEligibility.eligible) {
            const maxBonusFromJackpot = Number((this.jackpotGram * 0.25).toFixed(2));
            const stealBonus = Math.min(
              Number((wagerNum * (splitStealBonusPercent / 100)).toFixed(2)),
              maxBonusFromJackpot
            );
            if (stealBonus > 0) {
              this.bonusAwardedGram = stealBonus;
              this.bonusPerPlayerGram = stealBonus;

              await dbService.creditUserBalance(
                winnerAddress,
                stealBonus.toFixed(2),
                'MATCH_WIN',
                `Steal Temptation Jackpot Bounty (${splitStealBonusPercent}%) in match #${this.matchId}`
              );
              await dbService.deductTrustJackpot(stealBonus);
              await dbService.recordJackpotAward(
                this.playerA.walletAddress,
                this.playerB?.walletAddress || '',
                stealBonus,
                this.matchId.toString(),
                this.playerA.telegramId,
                this.playerB?.telegramId
              );
              this.jackpotGram = await dbService.getTrustJackpot();
              this.jackpotStatus = this.jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING';
            }
          }
        }
      }

      if (this.bonusAwardedGram && this.bonusAwardedGram > 0) {
        outcomeMessage = `🗡️ TRADIMENTO AL ROUND ${this.currentRound}! ${winnerName} sceglie STEAL e incassa l'intero piatto (${duelPayoutGram} GRAM) + BONUS TENTAZIONE JACKPOT ${splitStealBonusPercent}% (+${this.bonusAwardedGram.toFixed(2)} GRAM)!`;
      } else {
        outcomeMessage = `🗡️ TRADIMENTO AL ROUND ${this.currentRound}! ${winnerName} sceglie STEAL e incassa l'intero piatto (${duelPayoutGram} GRAM)!`;
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
            // Qualified! Bonus: 25% total pool divided equally (12.5% each)
            const maxBonusFromJackpot = Number((this.jackpotGram * (splitPeaceBonusPercent / 100)).toFixed(2));
            const totalBonusFromWager = Number((wagerNum * (splitPeaceBonusPercent / 100)).toFixed(2));
            const totalBonus = Math.min(totalBonusFromWager, maxBonusFromJackpot);
            const bonusPerPlayer = Number((totalBonus / 2).toFixed(2));
            const eachPercent = (splitPeaceBonusPercent / 2).toFixed(1);

            if (bonusPerPlayer > 0) {
              this.bonusAwardedGram = totalBonus;
              this.bonusPerPlayerGram = bonusPerPlayer;

              await dbService.creditUserBalance(
                this.playerA.walletAddress,
                bonusPerPlayer.toFixed(2),
                'MATCH_WIN',
                `Trust Jackpot Bonus (${eachPercent}%) in match #${this.matchId}`
              );
              if (this.playerB) {
                await dbService.creditUserBalance(
                  this.playerB.walletAddress,
                  bonusPerPlayer.toFixed(2),
                  'MATCH_WIN',
                  `Trust Jackpot Bonus (${eachPercent}%) in match #${this.matchId}`
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

              outcomeMessage = `🎉 PATTO DEI CAMPIONI (ROUND 3/3)! Entrambi hanno scelto SPLIT fino alla fine! Puntata rimborsata + BONUS JACKPOT ${eachPercent}% (+${bonusPerPlayer.toFixed(2)} GRAM a testa, DROP ${splitJackpotProbabilityPercent}%)!`;
            } else {
              outcomeMessage = `🤝 PACE ASSOLUTA AL ROUND 3! Entrambi i duellanti hanno scelto SPLIT per tutti i round! Puntate rimborsate al 100%.`;
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

      outcomeMessage = `💀 DOPPIO TRADIMENTO AL ROUND ${this.currentRound}! Entrambi hanno scelto STEAL! 100% del piatto bruciato: 50% al Jackpot della Fiducia (+${jackpotShare.toFixed(2)} GRAM), 10% Taglia Affiliati & Ref, e il resto alla Treasury!`;
    }

    this.roundHistory.push({
      round: this.currentRound,
      choiceA: pA,
      choiceB: pB,
      outcome: this.outcome || 'SETTLED',
    });

    this.message = outcomeMessage;

    // Distribute creation and join fee commissions (30% to affiliate pool) for standard matches
    if (this.outcome !== 'DOUBLE_STEAL') {
      const { creationFeeGram, joinFeeGram } = feeConfig.getConfig();
      const feeA = creationFeeGram || 0.05;
      const feeB = joinFeeGram || 0.05;

      (async () => {
        try {
          const groupAffiliate = this.config.groupChatId ? await dbService.getGroupAffiliate(this.config.groupChatId) : null;
          const hasAffiliatedGroup = Boolean(groupAffiliate);

          const accA = await dbService.getUserAccount(this.playerA.walletAddress, this.playerA.telegramId);
          const accB = this.playerB ? await dbService.getUserAccount(this.playerB.walletAddress, this.playerB.telegramId) : null;

          let totalGroupCommission = 0;

          // Process Player A's fee
          const commissionPoolA = feeA * 0.30;
          if (hasAffiliatedGroup && accA?.referredBy) {
            const refShareA = commissionPoolA * 0.50;
            const groupShareA = commissionPoolA * 0.50;
            totalGroupCommission += groupShareA;
            await dbService.creditReferralEarnings(accA.referredBy, refShareA, this.matchId.toString());
          } else if (hasAffiliatedGroup) {
            totalGroupCommission += commissionPoolA;
          } else if (accA?.referredBy) {
            await dbService.creditReferralEarnings(accA.referredBy, commissionPoolA, this.matchId.toString());
          }

          // Process Player B's fee
          if (accB) {
            const commissionPoolB = feeB * 0.30;
            if (hasAffiliatedGroup && accB?.referredBy) {
              const refShareB = commissionPoolB * 0.50;
              const groupShareB = commissionPoolB * 0.50;
              totalGroupCommission += groupShareB;
              await dbService.creditReferralEarnings(accB.referredBy, refShareB, this.matchId.toString());
            } else if (hasAffiliatedGroup) {
              totalGroupCommission += commissionPoolB;
            } else if (accB?.referredBy) {
              await dbService.creditReferralEarnings(accB.referredBy, commissionPoolB, this.matchId.toString());
            }
          }

          // Record group match revenue & volume
          if (this.config.groupChatId) {
            await dbService.recordGroupMatchRevenue(this.config.groupChatId, wagerNum, totalGroupCommission);
          }
        } catch (err) {
          console.error(`[SplitStealRoom] Error distributing match affiliate commissions:`, err);
        }
      })();
    }

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

    if (this.onMatchSettledCallback && winnerAddress) {
      this.onMatchSettledCallback(this, winnerAddress);
    }

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

  public override resetForRematch() {
    this.phase = 'COUNTDOWN';
    this.currentRound = 1;
    this.maxRounds = 3;
    this.roundHistory = [];
    this.choicesRevealed = false;
    this.choiceA = undefined;
    this.choiceB = undefined;
    this.hasChosenA = false;
    this.hasChosenB = false;
    this.outcome = undefined;
    this.bonusAwardedGram = undefined;
    this.bonusPerPlayerGram = undefined;
    this.message = undefined;
    this.secondsLeft = feeConfig.getConfig().splitTurnDurationSeconds || 15;
    this.cleanupGameTimers();
  }
}

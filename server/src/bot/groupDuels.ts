import { Context } from 'grammy';
import { SfidaInlineKeyboard as InlineKeyboard } from './keyboardUtils.js';
import { dbService } from '../services/db.js';
import { RoomManager } from '../engine/RoomManager.js';
import { GameType } from '../types/gameTypes.js';
import { botT, resolveLanguage, BotLanguage } from './i18n.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';
import { tonSettlementService } from '../services/tonSettlement.js';

interface PendingGroupDuel {
  id: string;
  creatorId: number;
  creatorUsername: string;
  creatorName: string;
  chatId: string;
  groupTitle?: string;
  gameType: GameType;
  gameTitle: string;
  wager: number;
  wagerNano: bigint;
  creationFee: number;
  totalDeduct: number;
  expiresAt: number;
  timer?: NodeJS.Timeout;
}

const pendingGroupDuels = new Map<string, PendingGroupDuel>();

/**
 * Maps raw game type string (e.g. "roulette", "blackjack", "bridge", "chrono", "split")
 * to supported GameType and friendly localized/icon title.
 */
export function parseGameType(raw?: string): { type: GameType; title: string } {
  const clean = (raw || '').toLowerCase().trim();
  if (clean.includes('black') || clean === 'bj' || clean === '21') {
    return { type: 'blackjack', title: 'Blackjack 21 🃏' };
  }
  if (clean.includes('bridge') || clean.includes('glass') || clean.includes('vetro')) {
    return { type: 'bridge', title: 'Glass Bridge 🌉' };
  }
  if (clean.includes('chrono') || clean.includes('blind') || clean.includes('reflex') || clean.includes('tempo')) {
    return { type: 'chrono', title: 'Chrono Blind ⏱️' };
  }
  if (clean.includes('split') || clean.includes('steal') || clean.includes('dilemma')) {
    return { type: 'split', title: 'Split or Steal 🤝' };
  }
  return { type: 'roulette', title: 'Russian Roulette 🔫' };
}

/**
 * Handles /duel, /sfida, or /challenge commands sent in Telegram groups.
 */
export async function handleGroupDuelCommand(ctx: Context): Promise<void> {
  const user = ctx.from;
  if (!user) return;

  const chat = ctx.chat;
  if (!chat) return;

  // Resolve language
  const customLang = await dbService.getUserLanguage(user.id);
  const lang: BotLanguage = resolveLanguage(customLang || user.language_code);

  const botInfo = await ctx.api.getMe().catch(() => ({ username: 'sfida_bot' }));
  const botUsername = botInfo.username || 'sfida_bot';

  // If used in private chat, instruct user that group duel is for communities
  if (chat.type === 'private') {
    const enterKeyboard = new InlineKeyboard().url(
      botT(lang, 'btn_enter_arena'),
      `https://t.me/${botUsername}?startapp=create`
    );
    await ctx.reply(botT(lang, 'group_duel_private_hint'), {
      parse_mode: 'HTML',
      reply_markup: enterKeyboard,
    });
    return;
  }

  // Register user profile
  await dbService.registerBotUser({
    telegramId: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
  });

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);

  let wager = 1;
  let gameRaw: string | undefined = undefined;

  if (parts.length > 0) {
    if (!isNaN(parseFloat(parts[0]))) {
      wager = parseFloat(parts[0]);
      gameRaw = parts[1];
    } else {
      gameRaw = parts[0];
      if (parts[1] && !isNaN(parseFloat(parts[1]))) {
        wager = parseFloat(parts[1]);
      }
    }
  }

  const { type: gameType, title: gameTitle } = parseGameType(gameRaw);
  const minWagerForGame = gameType === 'split' ? 5.0 : 0.1;

  // Validate wager range
  if (isNaN(wager) || wager < minWagerForGame || wager > 100) {
    if (gameType === 'split' && wager < minWagerForGame) {
      await ctx.reply(`⚠️ <b>Puntata non valida:</b> La puntata minima per <b>Split or Steal</b> è di <b>5.00 GRAM</b>.`, {
        parse_mode: 'HTML',
      });
      return;
    }
    await ctx.reply(botT(lang, 'group_duel_invalid_wager'), { parse_mode: 'HTML' });
    return;
  }
  const creationFee = 0.05;
  const totalRequired = wager + creationFee;

  // Check creator's internal balance
  const userAccount = await dbService.getUserAccount(undefined, user.id.toString(), user.username);
  const currentBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

  if (currentBal < totalRequired) {
    const missing = (totalRequired - currentBal).toFixed(2);
    const depositKeyboard = new InlineKeyboard().url(
      botT(lang, 'group_duel_deposit_btn'),
      `https://t.me/${botUsername}?startapp=deposit`
    );

    await ctx.reply(
      botT(lang, 'group_duel_insufficient', {
        username: user.username || user.first_name,
        wager: wager.toFixed(2),
        total: totalRequired.toFixed(2),
        balance: currentBal.toFixed(2),
        missing,
      }),
      {
        parse_mode: 'HTML',
        reply_markup: depositKeyboard,
      }
    );
    return;
  }

  // Creator has sufficient balance -> Prepare confirmation prompt
  const pendingId = `gd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const pending: PendingGroupDuel = {
    id: pendingId,
    creatorId: user.id,
    creatorUsername: user.username || user.first_name,
    creatorName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.first_name,
    chatId: chat.id.toString(),
    groupTitle: ('title' in chat && chat.title) || undefined,
    gameType,
    gameTitle,
    wager,
    wagerNano: BigInt(Math.round(wager * 1e9)),
    creationFee,
    totalDeduct: totalRequired,
    expiresAt: Date.now() + 120_000,
  };

  pending.timer = setTimeout(() => {
    pendingGroupDuels.delete(pendingId);
  }, 120_000);

  pendingGroupDuels.set(pendingId, pending);

  const confirmKeyboard = new InlineKeyboard()
    .text(botT(lang, 'group_duel_confirm_btn'), `confirm_gduel_${pendingId}`)
    .text(botT(lang, 'group_duel_cancel_btn'), `cancel_gduel_${pendingId}`);

  const confirmMsg =
    `${botT(lang, 'group_duel_confirm_title')}\n\n` +
    botT(lang, 'group_duel_confirm_desc', {
      creator: user.username || user.first_name,
      gameTitle,
      wager: wager.toFixed(2),
      total: totalRequired.toFixed(2),
    });

  await ctx.reply(confirmMsg, {
    parse_mode: 'HTML',
    reply_markup: confirmKeyboard,
  });
}

/**
 * Handles confirmation callback for in-group duel creation.
 */
export async function handleConfirmGroupDuelCallback(ctx: Context, pendingId: string): Promise<void> {
  const fromUser = ctx.callbackQuery?.from;
  if (!fromUser) return;

  const pending = pendingGroupDuels.get(pendingId);
  const customLang = await dbService.getUserLanguage(fromUser.id);
  const lang: BotLanguage = resolveLanguage(customLang || fromUser.language_code);

  if (!pending || Date.now() > pending.expiresAt) {
    await ctx.answerCallbackQuery({
      text: botT(lang, 'group_duel_expired'),
      show_alert: true,
    });
    return;
  }

  // Security Check: Only the original creator can confirm
  if (fromUser.id !== pending.creatorId) {
    await ctx.answerCallbackQuery({
      text: botT(lang, 'group_duel_not_author_alert', { creator: pending.creatorUsername }),
      show_alert: true,
    });
    return;
  }

  // Clean pending state
  if (pending.timer) clearTimeout(pending.timer);
  pendingGroupDuels.delete(pendingId);

  // Re-verify balance
  const userAccount = await dbService.getUserAccount(undefined, pending.creatorId.toString());
  const currentBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');
  if (currentBal < pending.totalDeduct) {
    await ctx.answerCallbackQuery({
      text: 'Insufficient balance!',
      show_alert: true,
    });
    await ctx.editMessageText(
      botT(lang, 'group_duel_insufficient', {
        username: pending.creatorUsername,
        wager: pending.wager.toFixed(2),
        total: pending.totalDeduct.toFixed(2),
        balance: currentBal.toFixed(2),
        missing: (pending.totalDeduct - currentBal).toFixed(2),
      }),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Debit balance: wager + creation fee
  const playerAAddress = userAccount.walletAddress || `tg_${pending.creatorId}`;
  const matchId = BigInt(Date.now() % 1000000000);

  await dbService.debitUserBalance(
    playerAAddress,
    pending.wager.toFixed(2),
    'MATCH_BET',
    `In-chat group duel #${matchId}`,
    pending.creatorId.toString()
  );
  await dbService.debitUserBalance(
    playerAAddress,
    pending.creationFee.toFixed(2),
    'CREATION_FEE',
    `Creation fee for in-chat group duel #${matchId}`,
    pending.creatorId.toString()
  );
  await dbService.creditTreasury(pending.creationFee.toFixed(2), 'CREATION_FEE', matchId.toString());

  // Check group affiliation
  const groupAffiliate = await dbService.getGroupAffiliate(pending.chatId);
  const groupAdminAddress = groupAffiliate?.walletAddress;

  const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';
  let escrowAddress = '';
  if (clashMasterAddr && playerAAddress) {
    escrowAddress = computeEscrowAddress(
      clashMasterAddr,
      matchId,
      playerAAddress,
      pending.wagerNano,
      signerService.getPublicKeyBigInt()
    );
  }

  // Create room in RoomManager
  const roomManager = RoomManager.getInstance();
  const room = roomManager.createRoom(
    {
      matchId,
      gameType: pending.gameType,
      wagerAmountNano: pending.wagerNano,
      playerAAddress,
      groupAdminAddress,
      groupChatId: pending.chatId,
      escrowAddress,
      isPrivate: false,
    },
    async (settledRoom, winner) => {
      console.log(`[Group Duel] Match #${settledRoom.matchId} settled with winner: ${winner}`);
      let targetEscrow = settledRoom.escrowAddress;
      if (!targetEscrow && clashMasterAddr) {
        targetEscrow = computeEscrowAddress(
          clashMasterAddr,
          settledRoom.matchId,
          settledRoom.config.playerAAddress,
          settledRoom.config.wagerAmountNano,
          signerService.getPublicKeyBigInt()
        );
      }
      if (targetEscrow) {
        await tonSettlementService.settleMatch(targetEscrow, settledRoom.matchId, winner);
      }
    }
  );

  room.state = 'LOBBY';
  room.playerA.telegramId = pending.creatorId.toString();
  room.playerA.username = pending.creatorUsername;
  room.playerA.photoUrl = userAccount.photoUrl || '';

  // Compose the active public challenge card
  const botInfo = await ctx.api.getMe().catch(() => ({ username: 'sfida_bot' }));
  const botUsername = botInfo.username || 'sfida_bot';

  const duelPayload = `duel_${matchId}_${pending.chatId}`;
  const spectatePayload = `spectate_${matchId}`;

  const duelUrl = `https://t.me/${botUsername}?startapp=${duelPayload}`;
  const spectateUrl = `https://t.me/${botUsername}?startapp=${spectatePayload}`;

  const publicKeyboard = new InlineKeyboard()
    .url(botT(lang, 'group_duel_accept_btn', { wager: pending.wager.toFixed(2) }), duelUrl)
    .row()
    .url(botT(lang, 'group_duel_spectate_btn'), spectateUrl);

  const payout = (pending.wager * 2).toFixed(2);
  const cardText =
    `${botT(lang, 'group_duel_card_title')}\n\n` +
    botT(lang, 'group_duel_card_desc', {
      creator: pending.creatorUsername,
      gameTitle: pending.gameTitle,
      wager: pending.wager.toFixed(2),
      payout,
    });

  await ctx.editMessageText(cardText, {
    parse_mode: 'HTML',
    reply_markup: publicKeyboard,
  });

  await ctx.answerCallbackQuery({ text: '⚔️ Duel created successfully!' });
}

/**
 * Handles cancellation callback for in-group duel creation.
 */
export async function handleCancelGroupDuelCallback(ctx: Context, pendingId: string): Promise<void> {
  const fromUser = ctx.callbackQuery?.from;
  if (!fromUser) return;

  const pending = pendingGroupDuels.get(pendingId);
  const customLang = await dbService.getUserLanguage(fromUser.id);
  const lang: BotLanguage = resolveLanguage(customLang || fromUser.language_code);

  if (!pending || Date.now() > pending.expiresAt) {
    await ctx.answerCallbackQuery({
      text: botT(lang, 'group_duel_expired'),
      show_alert: true,
    });
    return;
  }

  // Security Check: Only the original creator can cancel
  if (fromUser.id !== pending.creatorId) {
    await ctx.answerCallbackQuery({
      text: botT(lang, 'group_duel_not_author_alert', { creator: pending.creatorUsername }),
      show_alert: true,
    });
    return;
  }

  if (pending.timer) clearTimeout(pending.timer);
  pendingGroupDuels.delete(pendingId);

  await ctx.editMessageText(botT(lang, 'group_duel_cancelled', { creator: pending.creatorUsername }), {
    parse_mode: 'HTML',
  });

  await ctx.answerCallbackQuery();
}

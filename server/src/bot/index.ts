import { Bot } from 'grammy';
import { SfidaInlineKeyboard as InlineKeyboard } from './keyboardUtils.js';
import { dbService } from '../services/db.js';
import { botT, resolveLanguage, SUPPORTED_LANGUAGES, BotLanguage } from './i18n.js';
import { renderCustomEmojis } from './emojis.js';
import { GameType } from '../types/gameTypes.js';
import { handleBroadcastCommand } from './broadcast.js';
import {
  handleSetGroupCommand,
  handleGetGroupCommand,
  handleListGroupsCommand,
  handleDelGroupCommand,
} from './adminGroups.js';
import {
  handleGroupDuelCommand,
  handleConfirmGroupDuelCallback,
  handleCancelGroupDuelCallback,
  parseGameType,
} from './groupDuels.js';
import { RoomManager } from '../engine/RoomManager.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { signerService } from '../services/signer.js';
import { tonSettlementService } from '../services/tonSettlement.js';

export interface DeepLinkPayload {
  mode: 'duel' | 'spectate' | 'ref';
  matchId?: string;
  recruiterWallet?: string;
  chatId?: string;
}

// Parses startapp / start query string
// Format: "duel_<matchId>_<recruiterWallet>_<chatId>" or "spectate_<matchId>"
export function parseDeepLink(payload: string): DeepLinkPayload {
  if (!payload) {
    return { mode: 'duel' };
  }

  const parts = payload.split('_');
  const action = parts[0];

  if (action === 'duel' && parts[1]) {
    return {
      mode: 'duel',
      matchId: parts[1],
      recruiterWallet: parts[2] || undefined,
      chatId: parts[3] || undefined,
    };
  }

  if (action === 'spectate' && parts[1]) {
    return {
      mode: 'spectate',
      matchId: parts[1],
    };
  }

  if (action === 'ref' && parts[1]) {
    return {
      mode: 'ref',
      recruiterWallet: parts[1],
    };
  }

  return { mode: 'duel' };
}

let activeBotInstance: Bot | null = null;

export function getTelegramBot(): Bot | null {
  return activeBotInstance;
}

/**
 * Checks whether a given Telegram user ID is an active member or admin of a Telegram group/chat.
 */
export async function isTelegramChatMember(
  chatId: string | number,
  telegramUserId: string | number
): Promise<boolean> {
  const bot = getTelegramBot();
  if (!bot) {
    // If bot not running (mock / local dev), allow pass
    return true;
  }
  try {
    const member = await bot.api.getChatMember(chatId, Number(telegramUserId));
    if (!member) return false;
    // Valid active statuses: 'creator', 'administrator', 'member'
    if (['creator', 'administrator', 'member'].includes(member.status)) {
      return true;
    }
    // Restricted members that are still in the group
    if (member.status === 'restricted' && (member as any).is_member) {
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn(`[Bot GroupCheck] Could not verify membership of user ${telegramUserId} in chat ${chatId}:`, err?.message || err);
    return false;
  }
}

export function createTelegramBot(token?: string): Bot {
  const botToken = token || process.env.TELEGRAM_BOT_TOKEN || 'MOCK_TELEGRAM_BOT_TOKEN';
  const bot = new Bot(botToken);
  activeBotInstance = bot;
  const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';

  // Resilient API Transformer: If Telegram API rejects custom emoji with BUTTON_TYPE_INVALID,
  // automatically strip icon_custom_emoji_id from the buttons and retry seamlessly
  bot.api.config.use(async (prev, method, payload, signal) => {
    // Popup alerts (answerCallbackQuery) do NOT support HTML or <tg-emoji> tags. Strip them automatically.
    if (method === 'answerCallbackQuery' && payload && typeof (payload as any).text === 'string') {
      const p: any = payload;
      p.text = p.text
        .replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gi, '$1')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    try {
      return await prev(method, payload, signal);
    } catch (err: any) {
      const errMsg = err?.description || err?.message || '';
      if (errMsg.includes('BUTTON_TYPE_INVALID') && payload && typeof payload === 'object') {
        const p: any = payload;
        if (p.reply_markup?.inline_keyboard) {
          const cloned = JSON.parse(JSON.stringify(payload));
          for (const row of cloned.reply_markup.inline_keyboard) {
            for (const btn of row) {
              delete btn.icon_custom_emoji_id;
            }
          }
          return await prev(method, cloned, signal);
        }
        if (Array.isArray(p.results)) {
          const cloned = JSON.parse(JSON.stringify(payload));
          for (const res of cloned.results) {
            if (res.reply_markup?.inline_keyboard) {
              for (const row of res.reply_markup.inline_keyboard) {
                for (const btn of row) {
                  delete btn.icon_custom_emoji_id;
                }
              }
            }
          }
          return await prev(method, cloned, signal);
        }
      }
      throw err;
    }
  });

  // Global Error Handler to ensure the bot process NEVER halts/stops on unhandled errors
  bot.catch((err) => {
    console.error(`[Grammy Error] Error in update ${err.ctx?.update?.update_id}:`, err.error || err);
  });

  // Dynamic Bot Username Helper to ensure startapp links ALWAYS point to the real bot username
  let cachedBotUsername: string | null = null;
  const getBotUsername = async (): Promise<string> => {
    if (cachedBotUsername) return cachedBotUsername;
    try {
      const me = await bot.api.getMe();
      if (me?.username) {
        cachedBotUsername = me.username;
        return cachedBotUsername;
      }
    } catch {}
    return process.env.TELEGRAM_BOT_USERNAME || 'sfida_bot';
  };

  // Helper to resolve user's active language
  const getUserLang = async (user?: { id?: number; language_code?: string }): Promise<BotLanguage> => {
    if (!user) return 'en';
    const customLang = await dbService.getUserLanguage(user.id);
    return resolveLanguage(customLang || user.language_code);
  };

  // /start command with deep linking and multi-language support
  bot.command('start', async (ctx) => {
    const user = ctx.from;
    const payload = (ctx.match || '').trim();
    const parsed = parseDeepLink(payload);

    // Register / update user in database with their client language
    if (user) {
      await dbService.registerBotUser({
        telegramId: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        languageCode: user.language_code,
        referredBy: parsed.recruiterWallet,
      });
    }

    const lang = await getUserLang(user);

    let welcomeText = `${botT(lang, 'welcome_header')}\n\n${botT(lang, 'welcome_body')}\n\n`;

    if (parsed.matchId) {
      welcomeText = lang === 'it'
        ? `⚔️ <b>SFIDA ARENA • INVITO DUELLO</b>\n\nSei stato invitato a un duello nella stanza <b>#${parsed.matchId}</b>!\n\nPremi il pulsante qui sotto per scendere nell'arena:`
        : `⚔️ <b>SFIDA ARENA • DUEL INVITE</b>\n\nYou have been invited to a duel in room <b>#${parsed.matchId}</b>!\n\nTap below to enter the arena and battle:`;
    } else if (parsed.recruiterWallet) {
      const truncatedRecruiter = `${parsed.recruiterWallet.slice(0, 8)}...${parsed.recruiterWallet.slice(-6)}`;
      welcomeText += botT(lang, 'welcome_recruited', { recruiter: truncatedRecruiter });
    }

    const buttonLabel = parsed.matchId
      ? (lang === 'it' ? '{{emoji.swords}} ENTRA NEL DUELLO' : '{{emoji.swords}} ENTER DUEL')
      : botT(lang, 'btn_enter_arena');

    const isPrivateChat = ctx.chat?.type === 'private';
    const botUsername = await getBotUsername();

    const keyboard = new InlineKeyboard();
    if (isPrivateChat) {
      keyboard.webApp(buttonLabel, `${webAppUrl}?startapp=${payload || 'lobby'}`);
    } else {
      // In groups/supergroups/channels, web_app buttons fail with 400 BUTTON_TYPE_INVALID
      // Telegram requires a deep link URL to open the Web App
      keyboard.url(buttonLabel, `https://t.me/${botUsername}?startapp=${payload || 'lobby'}`);
    }
    keyboard
      .row()
      .url(botT(lang, 'btn_official_channel'), 'https://t.me/sfida');

    await ctx.reply(renderCustomEmojis(welcomeText), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  });

  // /help command
  bot.command('help', async (ctx) => {
    const lang = await getUserLang(ctx.from);
    const botUsername = await getBotUsername();

    await ctx.reply(renderCustomEmojis(botT(lang, 'help_text', { botUsername })), {
      parse_mode: 'HTML',
    });
  });

  // /lang or /language command to manually switch interface language
  bot.command(['lang', 'language'], async (ctx) => {
    const lang = await getUserLang(ctx.from);
    const keyboard = new InlineKeyboard();

    SUPPORTED_LANGUAGES.forEach((l, index) => {
      keyboard.text(`${l.flag} ${l.label}`, `setlang_${l.code}`);
      if (index % 2 === 1) keyboard.row();
    });

    await ctx.reply(botT(lang, 'lang_select_title'), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  });

  // Callback query for language selection
  bot.callbackQuery(/^setlang_(.+)$/, async (ctx) => {
    const targetCode = ctx.match[1] as BotLanguage;
    const fromId = ctx.from.id;

    await dbService.updateUserLanguage(fromId, targetCode);
    await ctx.answerCallbackQuery();

    const selected = SUPPORTED_LANGUAGES.find((l) => l.code === targetCode);
    const label = selected ? `${selected.flag} ${selected.label}` : targetCode;

    await ctx.editMessageText(botT(targetCode, 'lang_changed', { language: label }), {
      parse_mode: 'HTML',
    });
  });

  // /broadcast command (Administrator only, by replying to any message)
  bot.command('broadcast', async (ctx) => {
    await handleBroadcastCommand(ctx);
  });

  // Admin Group Affiliation Commands (Superadmin only)
  bot.command('setgroup', async (ctx) => {
    await handleSetGroupCommand(ctx);
  });
  bot.command('getgroup', async (ctx) => {
    await handleGetGroupCommand(ctx);
  });
  bot.command('listgroups', async (ctx) => {
    await handleListGroupsCommand(ctx);
  });
  bot.command('delgroup', async (ctx) => {
    await handleDelGroupCommand(ctx);
  });

  // In-Chat Group Duel Commands (/duel, /sfida, /challenge)
  bot.command(['duel', 'sfida', 'challenge'], async (ctx) => {
    await handleGroupDuelCommand(ctx);
  });

  // Callback queries for confirming/cancelling in-chat group duels
  bot.callbackQuery(/^confirm_gduel_(.+)$/, async (ctx) => {
    await handleConfirmGroupDuelCallback(ctx, ctx.match[1]);
  });
  bot.callbackQuery(/^cancel_gduel_(.+)$/, async (ctx) => {
    await handleCancelGroupDuelCallback(ctx, ctx.match[1]);
  });

  // Configure Telegram Menu Button to launch Mini App
  bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: '⚔️ Sfida Arena',
      web_app: { url: `${webAppUrl}?startapp=menu` },
    },
  }).catch((err) => {
    console.warn('[Bot] Note on setChatMenuButton:', err?.message || err);
  });

  // Inline query handler: @sfida_bot <game> <amount> with complete guide & game cards
  bot.on('inline_query', async (ctx) => {
    const rawQuery = ctx.inlineQuery.query.trim().toLowerCase();
    const lang = await getUserLang(ctx.from);
    const botUser = await getBotUsername();
    const challenger = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Warrior');

    // Parse any wager amount from query (e.g. "@sfida_bot roulette 2" or "@sfida_bot 5")
    const numMatch = rawQuery.match(/([0-9]+(\.[0-9]+)?)/);
    const customWager = numMatch ? parseFloat(numMatch[1]) : 1;

    interface GameInlineDef {
      id: GameType;
      title: string;
      icon: string;
      descIt: string;
      descEn: string;
      minWager: number;
    }

    const GAMES: GameInlineDef[] = [
      {
        id: 'roulette',
        title: 'Russian Roulette',
        icon: '🎯',
        descIt: '8 Colpi tattici, 1 proiettile letale',
        descEn: '8 Tactical shots, 1 live round',
        minWager: 0.1,
      },
      {
        id: 'blackjack',
        title: 'Face-Up Blackjack',
        icon: '🃏',
        descIt: 'Carte scoperte da un mazzo comune visibile a tutti',
        descEn: 'Face-up common deck 21 duel',
        minWager: 0.1,
      },
      {
        id: 'bridge',
        title: 'Glass Bridge',
        icon: '🌉',
        descIt: 'Passi infiniti su lastre di vetro (2 vite)',
        descEn: 'Endless stepping glass bridge (2 lives)',
        minWager: 0.1,
      },
      {
        id: 'chrono',
        title: 'Chrono Blind',
        icon: '⏱️',
        descIt: 'Timer al buio, ferma più vicino a 0.000s',
        descEn: 'Millisecond countdown blind stop',
        minWager: 0.1,
      },
      {
        id: 'split',
        title: 'Split or Steal',
        icon: '🤝',
        descIt: 'Coopera (+12.5%) o Tradisci (+20%) + Trust Jackpot',
        descEn: 'Prisoner\'s Dilemma + Shared Trust Jackpot',
        minWager: 5.0,
      },
    ];

    const results: any[] = [];

    // 1. Result: Interactive How-To Guide Article
    const guideTitle = lang === 'it' ? '💡 Guida: Come creare un duello inline' : '💡 Guide: How to create an inline duel';
    const guideDesc = lang === 'it'
      ? `Scrivi @${botUser} <gioco> <importo> (es: @${botUser} roulette 2)`
      : `Type @${botUser} <game> <wager> (e.g. @${botUser} roulette 2)`;

    const rawGuideText = lang === 'it'
      ? `{{emoji.swords}} <b>SFIDA ARENA • GUIDA DUELLI INLINE</b> {{emoji.swords}}\n\n` +
        `Puoi sfidare direttamente chiunque in questa chat digitando:\n` +
        `<code>@${botUser} &lt;gioco&gt; &lt;importo&gt;</code>\n\n` +
        `<b>Discipline disponibili:</b>\n` +
        `• <code>@${botUser} roulette 1</code> — Russian Roulette (1 GRAM)\n` +
        `• <code>@${botUser} blackjack 2</code> — Face-Up Blackjack (2 GRAM)\n` +
        `• <code>@${botUser} bridge 1</code> — Glass Bridge (1 GRAM)\n` +
        `• <code>@${botUser} chrono 1.5</code> — Chrono Blind (1.5 GRAM)\n` +
        `• <code>@${botUser} split 5</code> — Split or Steal (min. 5 GRAM)\n\n` +
        `<i>Tocca il pulsante in basso per entrare subito nell'Arena Sfida:</i>`
      : `{{emoji.swords}} <b>SFIDA ARENA • INLINE DUEL GUIDE</b> {{emoji.swords}}\n\n` +
        `Challenge anyone directly in this chat by typing:\n` +
        `<code>@${botUser} &lt;game&gt; &lt;wager&gt;</code>\n\n` +
        `<b>Available disciplines:</b>\n` +
        `• <code>@${botUser} roulette 1</code> — Russian Roulette (1 GRAM)\n` +
        `• <code>@${botUser} blackjack 2</code> — Face-Up Blackjack (2 GRAM)\n` +
        `• <code>@${botUser} bridge 1</code> — Glass Bridge (1 GRAM)\n` +
        `• <code>@${botUser} chrono 1.5</code> — Chrono Blind (1.5 GRAM)\n` +
        `• <code>@${botUser} split 5</code> — Split or Steal (min. 5 GRAM)\n\n` +
        `<i>Tap below to open Sfida Arena:</i>`;

    const guideKeyboard = new InlineKeyboard().url(
      botT(lang, 'btn_enter_arena'),
      `https://t.me/${botUser}?startapp=duels`
    );

    results.push({
      type: 'article',
      id: 'guide_inline',
      title: guideTitle,
      description: guideDesc,
      input_message_content: {
        message_text: renderCustomEmojis(rawGuideText),
        parse_mode: 'HTML',
      },
      reply_markup: guideKeyboard,
    });

    // 2. Results: Game Cards (Filtered if user specified game name, or all 5 games)
    const filteredGames = GAMES.filter((g) => {
      if (!rawQuery || rawQuery === 'duel' || numMatch?.[0] === rawQuery) return true;
      return rawQuery.includes(g.id) || (g.id === 'split' && rawQuery.includes('steal')) || (g.id === 'roulette' && rawQuery.includes('rr'));
    });

    const gamesToShow = filteredGames.length > 0 ? filteredGames : GAMES;

    for (const g of gamesToShow) {
      const wager = Math.max(g.minWager, isNaN(customWager) ? 1 : customWager).toFixed(2);
      const cleanWagerParam = wager.replace('.', '-');
      const payout = (parseFloat(wager) * 2).toFixed(2);

      const cardTitle = `${g.title} • ${wager} GRAM`;
      const cardDesc = lang === 'it'
        ? `${g.descIt} | Vincita: ${payout} GRAM`
        : `${g.descEn} | Payout: ${payout} GRAM`;

      const rawCardMsg = lang === 'it'
        ? `{{emoji.swords}} <b>SFIDA DUELLO 1v1 • ${g.title.toUpperCase()}</b> {{emoji.swords}}\n\n` +
          `{{emoji.user}} <b>Sfidante</b>: ${challenger}\n` +
          `{{emoji.controller}} <b>Disciplina</b>: <b>${g.title}</b>\n` +
          `{{emoji.moneyBag}} <b>Puntata</b>: <b>${wager} GRAM</b> ciascuno\n` +
          `{{emoji.trophy}} <b>Montepremi Vincitore</b>: <b>${payout} GRAM</b> (100% no rake)\n` +
          `{{emoji.eye}} <b>Spettatori</b>: Finestra totalizzatore Pari-Mutuel aperta\n\n` +
          `<i>Chi osa raccogliere la sfida? Tocca sotto per entrare nell'Arena!</i>`
        : `{{emoji.swords}} <b>1v1 DUEL CHALLENGE • ${g.title.toUpperCase()}</b> {{emoji.swords}}\n\n` +
          `{{emoji.user}} <b>Challenger</b>: ${challenger}\n` +
          `{{emoji.controller}} <b>Discipline</b>: <b>${g.title}</b>\n` +
          `{{emoji.moneyBag}} <b>Wager</b>: <b>${wager} GRAM</b> each\n` +
          `{{emoji.trophy}} <b>Winner Payout</b>: <b>${payout} GRAM</b> (100% no rake)\n` +
          `{{emoji.eye}} <b>Spectators</b>: Pari-Mutuel betting window open\n\n` +
          `<i>Who dares to accept? Tap below to enter the Arena!</i>`;

      const cardKeyboard = new InlineKeyboard()
        .url(
          botT(lang, 'group_duel_accept_btn', { wager }),
          `https://t.me/${botUser}?startapp=inline_${g.id}_${cleanWagerParam}`
        )
        .row()
        .url(
          botT(lang, 'group_duel_spectate_btn'),
          `https://t.me/${botUser}?startapp=duels`
        );

      results.push({
        type: 'article',
        id: `duel_${g.id}_${cleanWagerParam}_${Date.now()}`,
        title: cardTitle,
        description: cardDesc,
        input_message_content: {
          message_text: renderCustomEmojis(rawCardMsg),
          parse_mode: 'HTML',
        },
        reply_markup: cardKeyboard,
      });
    }

    await ctx.answerInlineQuery(results, { cache_time: 10 });
  });

  // Chosen inline result handler: automatically creates room and updates buttons upon sending
  bot.on('chosen_inline_result', async (ctx) => {
    const chosen = ctx.chosenInlineResult;
    if (!chosen) return;

    const resultId = chosen.result_id;
    if (!resultId.startsWith('duel_')) return;

    const parts = resultId.split('_');
    const rawGame = parts[1] || 'roulette';
    const wagerStr = (parts[2] || '1').replace('-', '.');
    const wager = parseFloat(wagerStr) || 1;
    const wagerNano = BigInt(Math.round(wager * 1e9));
    const creationFee = 0.05;
    const totalDeduct = wager + creationFee;

    const { type: gameType, title: gameTitle } = parseGameType(rawGame);

    const creator = chosen.from;
    const customLang = await dbService.getUserLanguage(creator.id);
    const lang: BotLanguage = resolveLanguage(customLang || creator.language_code);
    const botUser = await getBotUsername();

    // Register creator in database
    await dbService.registerBotUser({
      telegramId: creator.id,
      username: creator.username,
      firstName: creator.first_name,
      lastName: creator.last_name,
      languageCode: creator.language_code,
    });

    const userAccount = await dbService.getUserAccount(undefined, creator.id.toString(), creator.username);
    const currentBal = parseFloat(userAccount.balanceGram || userAccount.balanceTon || '0');

    // Balance check
    if (currentBal < totalDeduct) {
      if (chosen.inline_message_id) {
        const depositKeyboard = new InlineKeyboard().url(
          botT(lang, 'group_duel_deposit_btn'),
          `https://t.me/${botUser}?startapp=deposit`
        );
        await ctx.api.editMessageTextInline(
          chosen.inline_message_id,
          renderCustomEmojis(
            botT(lang, 'group_duel_insufficient', {
              username: creator.username || creator.first_name,
              wager: wager.toFixed(2),
              total: totalDeduct.toFixed(2),
              balance: currentBal.toFixed(2),
              missing: (totalDeduct - currentBal).toFixed(2),
            })
          ),
          { parse_mode: 'HTML', reply_markup: depositKeyboard }
        ).catch((err) => console.warn('[ChosenInline] editMessageTextInline error:', err?.message || err));
      }
      return;
    }

    // Debit funds implicitly: wager + 0.05 creation fee
    const playerAAddress = userAccount.walletAddress || `tg_${creator.id}`;
    const matchId = BigInt(Date.now() % 1000000000);

    await dbService.debitUserBalance(
      playerAAddress,
      wager.toFixed(2),
      'MATCH_BET',
      `Inline duel #${matchId}`,
      creator.id.toString()
    );
    await dbService.debitUserBalance(
      playerAAddress,
      creationFee.toFixed(2),
      'CREATION_FEE',
      `Creation fee for inline duel #${matchId}`,
      creator.id.toString()
    );
    await dbService.creditTreasury(creationFee.toFixed(2), 'CREATION_FEE', matchId.toString());

    const clashMasterAddr = process.env.CLASH_MASTER_ADDRESS || '';
    let escrowAddress = '';
    if (clashMasterAddr && playerAAddress) {
      escrowAddress = computeEscrowAddress(
        clashMasterAddr,
        matchId,
        playerAAddress,
        wagerNano,
        signerService.getPublicKeyBigInt()
      );
    }

    // Create room in RoomManager
    const roomManager = RoomManager.getInstance();
    const room = roomManager.createRoom(
      {
        matchId,
        gameType,
        wagerAmountNano: wagerNano,
        playerAAddress,
        escrowAddress,
        isPrivate: false,
      },
      async (settledRoom, winner) => {
        console.log(`[Inline Duel] Match #${settledRoom.matchId} settled with winner: ${winner}`);
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
    room.playerA.telegramId = creator.id.toString();
    room.playerA.username = creator.username || creator.first_name;
    room.playerA.photoUrl = userAccount.photoUrl || '';

    // Update sent message with active match link
    if (chosen.inline_message_id) {
      const inlineMsgId = chosen.inline_message_id;
      const duelUrl = `https://t.me/${botUser}?startapp=duel_${matchId}`;
      const spectateUrl = `https://t.me/${botUser}?startapp=spectate_${matchId}`;

      const activeKeyboard = new InlineKeyboard()
        .url(botT(lang, 'group_duel_accept_btn', { wager: wager.toFixed(2) }), duelUrl)
        .row()
        .url(botT(lang, 'group_duel_spectate_btn'), spectateUrl);

      const payout = (wager * 2).toFixed(2);
      const cardText =
        `${botT(lang, 'group_duel_card_title')}\n\n` +
        botT(lang, 'group_duel_card_desc', {
          creator: creator.username || creator.first_name,
          gameTitle,
          wager: wager.toFixed(2),
          payout,
        });

      await ctx.api.editMessageTextInline(
        inlineMsgId,
        renderCustomEmojis(cardText),
        { parse_mode: 'HTML', reply_markup: activeKeyboard }
      ).catch(async () => {
        await ctx.api.editMessageReplyMarkupInline(
          inlineMsgId,
          { reply_markup: activeKeyboard }
        ).catch((err) => console.warn('[ChosenInline] editMessageReplyMarkupInline error:', err?.message || err));
      });
    }
  });

  return bot;
}

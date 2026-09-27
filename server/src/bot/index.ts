import { Bot, InlineKeyboard } from 'grammy';
import { dbService } from '../services/db.js';
import { botT, resolveLanguage, SUPPORTED_LANGUAGES, BotLanguage } from './i18n.js';
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
} from './groupDuels.js';

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

  // Helper to resolve user's active language
  const getUserLang = async (user?: { id?: number; language_code?: string }): Promise<BotLanguage> => {
    if (!user) return 'en';
    const customLang = await dbService.getUserLanguage(user.id);
    return resolveLanguage(customLang || user.language_code);
  };

  // /start command with deep linking and multi-language support
  bot.command('start', async (ctx) => {
    const user = ctx.from;
    const payload = ctx.match;
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

    if (parsed.recruiterWallet) {
      const truncatedRecruiter = `${parsed.recruiterWallet.slice(0, 8)}...${parsed.recruiterWallet.slice(-6)}`;
      welcomeText += botT(lang, 'welcome_recruited', { recruiter: truncatedRecruiter });
    }

    const keyboard = new InlineKeyboard()
      .webApp(botT(lang, 'btn_enter_arena'), `${webAppUrl}?startapp=${payload || 'lobby'}`)
      .row()
      .url(botT(lang, 'btn_official_channel'), 'https://t.me/toncoin');

    await ctx.reply(welcomeText, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  });

  // /help command
  bot.command('help', async (ctx) => {
    const lang = await getUserLang(ctx.from);
    const botInfo = await bot.api.getMe().catch(() => ({ username: 'sfida_bot' }));
    const botUsername = botInfo.username || 'sfida_bot';

    await ctx.reply(botT(lang, 'help_text', { botUsername }), {
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

  // Inline query handler: @yourbot duel <amount>
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    const lang = await getUserLang(ctx.from);
    let wager = '1';

    const match = query.match(/^duel\s*([0-9]+(\.[0-9]+)?)/i);
    if (match && match[1]) {
      wager = match[1];
    }

    const parsedWager = parseFloat(wager) || 1;
    const netWinnerPayout = (parsedWager * 2).toFixed(2); // 100% of pot (2x wager)

    const matchId = (Date.now() % 1000000).toString();
    const userWallet = `user_${ctx.from.id}`;
    const chatId = ctx.inlineQuery.chat_type || 'inline';

    const duelPayload = `duel_${matchId}_${userWallet}_${chatId}`;
    const spectatePayload = `spectate_${matchId}`;

    const duelUrl = `${webAppUrl}?startapp=${duelPayload}`;
    const spectateUrl = `${webAppUrl}?startapp=${spectatePayload}`;

    const keyboard = new InlineKeyboard()
      .webApp(botT(lang, 'inline_accept_btn', { wager }), duelUrl)
      .row()
      .webApp(botT(lang, 'inline_watch_btn'), spectateUrl);

    const title = botT(lang, 'inline_challenge_title', { wager });
    const description = botT(lang, 'inline_challenge_desc', { payout: netWinnerPayout });
    const messageText = botT(lang, 'inline_challenge_msg', {
      challenger: ctx.from.username || ctx.from.first_name,
      wager,
      payout: netWinnerPayout,
    });

    await ctx.answerInlineQuery([
      {
        type: 'article',
        id: `duel_${matchId}`,
        title,
        description,
        input_message_content: {
          message_text: messageText,
          parse_mode: 'HTML',
        },
        reply_markup: keyboard,
      },
    ]);
  });

  return bot;
}

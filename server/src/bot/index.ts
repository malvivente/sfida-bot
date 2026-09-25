import { Bot, InlineKeyboard } from 'grammy';

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

export function createTelegramBot(token?: string): Bot {
  const botToken = token || process.env.TELEGRAM_BOT_TOKEN || 'MOCK_TELEGRAM_BOT_TOKEN';
  const bot = new Bot(botToken);
  const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';

  // /start command with deep linking
  bot.command('start', async (ctx) => {
    const payload = ctx.match;
    const parsed = parseDeepLink(payload);

    let welcomeText = `⚡️ *WELCOME TO SFIDA CYBER QUICKDRAW ARENA* ⚡️\n\n` +
      `🔥 *1v1 High-Stakes PvP Reflex Arena on TON*\n` +
      `👁 *Live Spectator Pari-Mutuel Betting Totalizer*\n` +
      `🛡 *Anti-Cheat Authoritative Server & Tact Smart Contracts*\n\n`;

    if (parsed.recruiterWallet) {
      welcomeText += `🤝 Recruited by: \`${parsed.recruiterWallet.slice(0, 8)}...${parsed.recruiterWallet.slice(-6)}\`\n\n`;
    }

    const keyboard = new InlineKeyboard()
      .webApp('⚔️ Enter Arena', `${webAppUrl}?startapp=${payload || 'lobby'}&fullscreen=true`)
      .row()
      .url('📢 Official Telegram Channel', 'https://t.me/toncoin');

    await ctx.reply(welcomeText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // Configure Telegram Menu Button with fullscreen webapp
  bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: '⚔️ Sfida Arena',
      web_app: { url: `${webAppUrl}?startapp=menu&fullscreen=true` },
    },
  }).catch((err) => {
    console.warn('[Bot] Note on setChatMenuButton:', err?.message || err);
  });

  // Inline query handler: @yourbot duel <amount>
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    let wager = '1';

    const match = query.match(/^duel\s*([0-9]+(\.[0-9]+)?)/i);
    if (match && match[1]) {
      wager = match[1];
    }

    const matchId = (Date.now() % 1000000).toString();
    const userWallet = `user_${ctx.from.id}`;
    const chatId = ctx.inlineQuery.chat_type || 'inline';

    const duelPayload = `duel_${matchId}_${userWallet}_${chatId}`;
    const spectatePayload = `spectate_${matchId}`;

    const duelUrl = `${webAppUrl}?startapp=${duelPayload}&fullscreen=true`;
    const spectateUrl = `${webAppUrl}?startapp=${spectatePayload}&fullscreen=true`;

    const keyboard = new InlineKeyboard()
      .webApp(`⚔️ Accept Challenge (${wager} TON)`, duelUrl)
      .row()
      .webApp(`👁️ Watch & Bet (Totalizer)`, spectateUrl);

    const title = `⚔️ Cyber Quickdraw Duel - ${wager} TON Stake`;
    const description = `1v1 Reaction Duel. Best of 3 rounds. Winner takes ${(parseFloat(wager) * 1.92).toFixed(2)} TON (96%)!`;
    const messageText =
      `⚔️ *CYBER QUICKDRAW DUEL INITIATED* ⚔️\n\n` +
      `👤 *Challenger*: @${ctx.from.username || ctx.from.first_name}\n` +
      `💰 *Wager*: *${wager} TON*\n` +
      `🏆 *Winner Payout*: *${(parseFloat(wager) * 1.92).toFixed(2)} TON* (96% Pot)\n` +
      `👁 *Live Spectators*: Pari-Mutuel Betting Window Open (6% Rake)\n\n` +
      `_Tap faster than your opponent across 3 rounds. Watch out for decoy HOLD signals!_`;

    await ctx.answerInlineQuery([
      {
        type: 'article',
        id: `duel_${matchId}`,
        title,
        description,
        input_message_content: {
          message_text: messageText,
          parse_mode: 'Markdown',
        },
        reply_markup: keyboard,
      },
    ]);
  });

  return bot;
}

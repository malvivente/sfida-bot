import { Context } from 'grammy';
import { dbService } from '../services/db.js';
import { SfidaInlineKeyboard as InlineKeyboard } from './keyboardUtils.js';
import { renderCustomEmojis } from './emojis.js';
import { botT, resolveLanguage, BotLanguage } from './i18n.js';

/**
 * Handles /bal and /balance commands.
 * Displays the caller's available GRAM balance and quick-action buttons.
 */
export async function handleBalanceCommand(ctx: Context): Promise<void> {
  const user = ctx.from;
  if (!user) return;

  const customLang = await dbService.getUserLanguage(user.id);
  const lang: BotLanguage = resolveLanguage(customLang || user.language_code);
  const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';
  const botUsername = ctx.me?.username || process.env.TELEGRAM_BOT_USERNAME || 'sfida_bot';
  const isPrivateChat = ctx.chat?.type === 'private';

  // Ensure user is registered/synced in DB
  await dbService.registerBotUser({
    telegramId: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
  });

  const account = await dbService.getUserAccount(undefined, user.id.toString(), user.username);
  const balance = account.balanceGram || account.balanceTon || '0.00';
  const displayName = account.displayName || (account.username ? `@${account.username}` : user.first_name || 'Duelist');

  const text =
    `{{emoji.coin}} <b>SFIDA ARENA • ${lang === 'it' ? 'IL TUO SALDO' : 'YOUR BALANCE'}</b> {{emoji.coin}}\n\n` +
    `{{emoji.user}} <b>${lang === 'it' ? 'Utente' : 'User'}:</b> ${displayName}\n` +
    `{{emoji.moneyBag}} <b>${lang === 'it' ? 'Saldo disponibile' : 'Available Balance'}:</b> <b>${balance} GRAM</b>\n\n` +
    `<i>${lang === 'it' ? 'Usa il tuo saldo per sfidare altri giocatori o scommettere live!' : 'Use your balance to duel other players or bet live on arena matches!'}</i>`;

  const keyboard = new InlineKeyboard();
  if (isPrivateChat) {
    keyboard.webApp(
      lang === 'it' ? '{{emoji.swords}} ENTRA NELL\'ARENA' : '{{emoji.swords}} ENTER ARENA',
      webAppUrl
    );
    keyboard.webApp(
      lang === 'it' ? '{{emoji.gem}} DEPOSITA GRAM' : '{{emoji.gem}} DEPOSIT GRAM',
      `${webAppUrl}?startapp=deposit`
    );
  } else {
    keyboard.url(
      lang === 'it' ? '{{emoji.swords}} ENTRA NELL\'ARENA' : '{{emoji.swords}} ENTER ARENA',
      `https://t.me/${botUsername}?startapp=duels`
    );
    keyboard.url(
      lang === 'it' ? '{{emoji.gem}} DEPOSITA GRAM' : '{{emoji.gem}} DEPOSIT GRAM',
      `https://t.me/${botUsername}?startapp=deposit`
    );
  }

  await ctx.reply(renderCustomEmojis(text), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

/**
 * Handles /tip command.
 * Allows sending instant, zero-fee GRAM tips directly in chat.
 * Supported syntaxes:
 * 1. By Reply: `/tip <amount> [optional note]` (e.g. replying to another user's message)
 * 2. By Identifier: `/tip <@username|ID> <amount> [optional note]`
 */
export async function handleTipCommand(ctx: Context): Promise<void> {
  const sender = ctx.from;
  if (!sender) return;

  const customLang = await dbService.getUserLanguage(sender.id);
  const lang: BotLanguage = resolveLanguage(customLang || sender.language_code);
  const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';
  const botUsername = ctx.me?.username || process.env.TELEGRAM_BOT_USERNAME || 'sfida_bot';
  const isPrivateChat = ctx.chat?.type === 'private';

  // Ensure sender is registered
  await dbService.registerBotUser({
    telegramId: sender.id,
    username: sender.username,
    firstName: sender.first_name,
    lastName: sender.last_name,
    languageCode: sender.language_code,
  });

  const fullText = ctx.message?.text?.trim() || '';
  // Remove the command token (e.g. /tip or /tip@sfida_bot)
  const tokens = fullText.split(/\s+/).slice(1);
  const replyUser = ctx.message?.reply_to_message?.from;

  let recipientIdentifier: string | undefined = undefined;
  let amountStr: string | undefined = undefined;
  let noteParts: string[] = [];

  if (replyUser) {
    // Cannot tip bots
    if (replyUser.is_bot) {
      await ctx.reply(
        renderCustomEmojis(
          `{{emoji.cross}} <b>${lang === 'it' ? 'Destinatario non valido' : 'Invalid Recipient'}:</b> ` +
          `${lang === 'it' ? 'Non puoi inviare un tip a un bot!' : 'You cannot send a tip to a bot!'}`
        ),
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Auto-register recipient if needed
    await dbService.registerBotUser({
      telegramId: replyUser.id,
      username: replyUser.username,
      firstName: replyUser.first_name,
      lastName: replyUser.last_name,
      languageCode: replyUser.language_code,
    });

    recipientIdentifier = replyUser.id.toString();
    if (tokens.length >= 1) {
      amountStr = tokens[0];
      noteParts = tokens.slice(1);
    }
  } else {
    if (tokens.length >= 2) {
      recipientIdentifier = tokens[0];
      amountStr = tokens[1];
      noteParts = tokens.slice(2);
    }
  }

  // Show command guide if syntax is missing or invalid
  if (!recipientIdentifier || !amountStr) {
    const guideMsg =
      lang === 'it'
        ? `{{emoji.moneyBag}} <b>SFIDA ARENA • INVIA UN TIP (MANCIA)</b>\n\n` +
          `Puoi inviare GRAM istantaneamente a qualsiasi utente direttamente in chat:\n\n` +
          `<b>1. In risposta a un messaggio:</b>\n` +
          `• <code>/tip &lt;importo&gt; [nota opzionale]</code>\n` +
          `<i>Es: rispondi a un utente con <code>/tip 2</code> oppure <code>/tip 5 bella giocata!</code></i>\n\n` +
          `<b>2. Con username o ID Telegram:</b>\n` +
          `• <code>/tip &lt;@username|ID&gt; &lt;importo&gt; [nota opzionale]</code>\n` +
          `<i>Es: <code>/tip @mario 2.50</code> o <code>/tip 123456789 1 grazie</code></i>\n\n` +
          `{{emoji.sparkles}} <i>Importo minimo: 0.10 GRAM. Nessuna commissione di trasferimento.</i>`
        : `{{emoji.moneyBag}} <b>SFIDA ARENA • SEND A TIP</b>\n\n` +
          `Send GRAM instantly to any player directly from chat:\n\n` +
          `<b>1. By replying to a message:</b>\n` +
          `• <code>/tip &lt;amount&gt; [optional note]</code>\n` +
          `<i>Example: reply to someone with <code>/tip 2</code> or <code>/tip 5 great match!</code></i>\n\n` +
          `<b>2. By username or Telegram ID:</b>\n` +
          `• <code>/tip &lt;@username|ID&gt; &lt;amount&gt; [optional note]</code>\n` +
          `<i>Example: <code>/tip @mario 2.50</code> or <code>/tip 123456789 1 thanks</code></i>\n\n` +
          `{{emoji.sparkles}} <i>Minimum tip: 0.10 GRAM. Zero transfer fees.</i>`;

    await ctx.reply(renderCustomEmojis(guideMsg), { parse_mode: 'HTML' });
    return;
  }

  const cleanAmountNum = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(cleanAmountNum) || cleanAmountNum < 0.1) {
    await ctx.reply(
      renderCustomEmojis(
        `{{emoji.cross}} <b>${lang === 'it' ? 'Importo non valido' : 'Invalid Amount'}:</b> <code>${amountStr}</code>\n` +
        `${lang === 'it' ? 'L\'importo minimo per un tip è di <b>0.10 GRAM</b>.' : 'Minimum tip amount is <b>0.10 GRAM</b>.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Sender balance check
  const senderAccount = await dbService.getUserAccount(undefined, sender.id.toString(), sender.username);
  const senderBal = parseFloat(senderAccount.balanceGram || senderAccount.balanceTon || '0');
  if (senderBal < cleanAmountNum) {
    const depositKeyboard = new InlineKeyboard();
    if (isPrivateChat) {
      keyboardOrUrl(depositKeyboard, lang === 'it' ? '{{emoji.gem}} DEPOSITA GRAM' : '{{emoji.gem}} DEPOSIT GRAM', `${webAppUrl}?startapp=deposit`, true);
    } else {
      keyboardOrUrl(depositKeyboard, lang === 'it' ? '{{emoji.gem}} DEPOSITA GRAM' : '{{emoji.gem}} DEPOSIT GRAM', `https://t.me/${botUsername}?startapp=deposit`, false);
    }

    const missing = (cleanAmountNum - senderBal).toFixed(2);
    await ctx.reply(
      renderCustomEmojis(
        `{{emoji.warning}} <b>${lang === 'it' ? 'SALDO INSUFFICIENTE' : 'INSUFFICIENT BALANCE'}</b>\n\n` +
        (lang === 'it'
          ? `Per inviare questo tip di <b>${cleanAmountNum.toFixed(2)} GRAM</b> ti servono più fondi.\n\n` +
            `• Saldo attuale: <b>${senderBal.toFixed(2)} GRAM</b>\n` +
            `• Mancanti: <b>${missing} GRAM</b>`
          : `You need more funds to send this <b>${cleanAmountNum.toFixed(2)} GRAM</b> tip.\n\n` +
            `• Current balance: <b>${senderBal.toFixed(2)} GRAM</b>\n` +
            `• Missing: <b>${missing} GRAM</b>`)
      ),
      { parse_mode: 'HTML', reply_markup: depositKeyboard }
    );
    return;
  }

  const note = noteParts.length > 0 ? noteParts.join(' ').trim() : undefined;
  const transferRes = await dbService.transferBalance(
    sender.id.toString(),
    recipientIdentifier,
    cleanAmountNum.toFixed(2),
    note
  );

  if (!transferRes.success) {
    await ctx.reply(
      renderCustomEmojis(
        `{{emoji.cross}} <b>${lang === 'it' ? 'Operazione non riuscita' : 'Tip Failed'}:</b>\n` +
        `${transferRes.error || (lang === 'it' ? 'Destinatario non trovato nel database del bot.' : 'Recipient not found in bot database.')}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  const recipientAcc = transferRes.recipientAccount!;
  const senderAcc = transferRes.senderAccount!;

  const senderName = sender.username ? `@${sender.username}` : (sender.first_name || 'Warrior');
  const recipientName = recipientAcc.username
    ? `@${recipientAcc.username.replace(/^@/, '')}`
    : (recipientAcc.displayName || recipientIdentifier);

  const successText =
    `{{emoji.moneyBag}} <b>${lang === 'it' ? 'TIP INVIATO CON SUCCESSO!' : 'TIP SENT SUCCESSFULLY!'}</b>\n\n` +
    `• <b>${lang === 'it' ? 'Da' : 'From'}:</b> ${senderName}\n` +
    `• <b>${lang === 'it' ? 'A' : 'To'}:</b> ${recipientName}\n` +
    `• <b>${lang === 'it' ? 'Importo' : 'Amount'}:</b> <b>${cleanAmountNum.toFixed(2)} GRAM</b>\n` +
    (note ? `• <b>${lang === 'it' ? 'Messaggio' : 'Note'}:</b> <i>"${note}"</i>\n` : '') +
    `\n{{emoji.coin}} <b>${lang === 'it' ? 'Il tuo nuovo saldo' : 'Your new balance'}:</b> <b>${senderAcc.balanceGram} GRAM</b>`;

  await ctx.reply(renderCustomEmojis(successText), { parse_mode: 'HTML' });

  // Direct Telegram Notification to recipient (if private chat exists)
  if (recipientAcc.telegramId && recipientAcc.telegramId !== sender.id.toString()) {
    try {
      const recipientLang = resolveLanguage(recipientAcc.languageCode);
      const dmText =
        `{{emoji.moneyBag}} <b>SFIDA ARENA • ${recipientLang === 'it' ? 'HAI RICEVUTO UN TIP!' : 'YOU RECEIVED A TIP!'}</b>\n\n` +
        `<b>${senderName}</b> ${recipientLang === 'it' ? 'ti ha inviato' : 'sent you'} <b>${cleanAmountNum.toFixed(2)} GRAM</b>!\n` +
        (note ? `💬 <i>"${note}"</i>\n` : '') +
        `\n{{emoji.coin}} <b>${recipientLang === 'it' ? 'Nuovo saldo' : 'New balance'}:</b> <b>${recipientAcc.balanceGram} GRAM</b>`;

      const dmKeyboard = new InlineKeyboard().url(
        recipientLang === 'it' ? 'ENTRA NELL\'ARENA' : 'ENTER ARENA',
        `https://t.me/${botUsername}?startapp=menu`
      );

      await ctx.api.sendMessage(Number(recipientAcc.telegramId), renderCustomEmojis(dmText), {
        parse_mode: 'HTML',
        reply_markup: dmKeyboard,
      });
    } catch {
      // Ignored if user hasn't started bot in PM or blocked bot
    }
  }
}

function keyboardOrUrl(keyboard: InlineKeyboard, text: string, url: string, isWebApp: boolean) {
  if (isWebApp) {
    keyboard.webApp(text, url);
  } else {
    keyboard.url(text, url);
  }
}

/**
 * Handles /promo and /riscatta commands.
 * Allows redeeming promotional codes directly in chat.
 * Syntax: `/promo <CODE>` or `/riscatta <CODE>`
 */
export async function handlePromoCommand(ctx: Context): Promise<void> {
  const user = ctx.from;
  if (!user) return;

  const customLang = await dbService.getUserLanguage(user.id);
  const lang: BotLanguage = resolveLanguage(customLang || user.language_code);
  const webAppUrl = process.env.WEBAPP_URL || 'https://sfida-arena.vercel.app';
  const isPrivateChat = ctx.chat?.type === 'private';
  const botUsername = ctx.me?.username || process.env.TELEGRAM_BOT_USERNAME || 'sfida_bot';

  // Ensure user is registered
  await dbService.registerBotUser({
    telegramId: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
  });

  const fullText = ctx.message?.text?.trim() || '';
  const tokens = fullText.split(/\s+/).slice(1);
  const code = tokens[0]?.trim().toUpperCase();

  if (!code) {
    const usage =
      `🎁 <b>SFIDA ARENA • ${lang === 'it' ? 'RISCATTO CODICE PROMO' : 'REDEEM PROMO CODE'}</b>\n\n` +
      `<i>${lang === 'it' ? 'Inserisci il codice promo che desideri riscattare:' : 'Enter the promo code you wish to redeem:'}</i>\n` +
      `<code>/promo SFIDA-XXXX-XXXX</code>`;

    await ctx.reply(renderCustomEmojis(usage), { parse_mode: 'HTML' });
    return;
  }

  const promo = await dbService.getPromoCode(code);
  if (!promo) {
    await ctx.reply(
      renderCustomEmojis(
        `❌ <b>${lang === 'it' ? 'Codice Non Valido' : 'Invalid Code'}</b>\n\n` +
        `${lang === 'it' ? 'Il codice promo inserito non esiste o è errato.' : 'The entered promo code does not exist or is incorrect.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (promo.status === 'EXPIRED') {
    await ctx.reply(
      renderCustomEmojis(
        `⏳ <b>${lang === 'it' ? 'Codice Scaduto' : 'Expired Code'}</b>\n\n` +
        `${lang === 'it' ? 'Questo codice promozionale è scaduto e non è più valido.' : 'This promo code has expired and is no longer valid.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (promo.status === 'EXHAUSTED' || promo.claimedCount >= promo.maxClaims) {
    await ctx.reply(
      renderCustomEmojis(
        `⚪ <b>${lang === 'it' ? 'Codice Esaurito' : 'Exhausted Code'}</b>\n\n` +
        `${lang === 'it' ? 'Questo codice promozionale ha raggiunto il numero massimo di utilizzi.' : 'This promo code has reached its maximum number of redemptions.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Self claim prevention
  if (promo.creatorTelegramId && String(promo.creatorTelegramId) === String(user.id)) {
    await ctx.reply(
      renderCustomEmojis(
        `⚠️ <b>${lang === 'it' ? 'Azione Non Consentita' : 'Action Not Allowed'}</b>\n\n` +
        `${lang === 'it' ? 'Non puoi riscattare un codice promo creato da te.' : 'You cannot redeem a promo code created by yourself.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Already claimed
  if (dbService.hasUserRedeemedPromo(promo.id, user.id)) {
    await ctx.reply(
      renderCustomEmojis(
        `⚠️ <b>${lang === 'it' ? 'Già Riscattato' : 'Already Redeemed'}</b>\n\n` +
        `${lang === 'it' ? 'Hai già riscattato questo codice promozionale.' : 'You have already redeemed this promo code.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Telegram Premium requirement
  if (promo.requiresPremium && !user.is_premium) {
    await ctx.reply(
      renderCustomEmojis(
        `⭐ <b>${lang === 'it' ? 'Telegram Premium Richiesto' : 'Telegram Premium Required'}</b>\n\n` +
        `${lang === 'it' ? 'Questo codice promozionale è riservato agli utenti Telegram Premium.' : 'This promo code is exclusively reserved for Telegram Premium subscribers.'}`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Group requirement
  if (promo.requiredChatId) {
    const { isTelegramChatMember } = await import('./index.js');
    const inGroup = await isTelegramChatMember(promo.requiredChatId, user.id);
    if (!inGroup) {
      const gLabel = promo.requiredChatTitle || (promo.requiredChatUsername ? `@${promo.requiredChatUsername}` : 'nel gruppo designato');
      await ctx.reply(
        renderCustomEmojis(
          `👥 <b>${lang === 'it' ? 'Membro del Gruppo Richiesto' : 'Group Member Required'}</b>\n\n` +
          `${lang === 'it' ? `Devi essere iscritto al gruppo <b>${gLabel}</b> per riscattare questo codice.` : `You must be a member of <b>${gLabel}</b> to redeem this code.`}`
        ),
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Record redemption
  const res = await dbService.recordPromoRedemption({
    promoCode: promo,
    userTelegramId: user.id,
    username: user.username,
    displayName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Duelist',
  });

  if (!res.success) {
    await ctx.reply(`❌ ${res.error}`);
    return;
  }

  const updatedAccount = await dbService.getUserAccount(undefined, String(user.id));
  const newBal = updatedAccount.balanceGram || updatedAccount.balanceTon || '0.00';

  const successText =
    `🎉 <b>SFIDA ARENA • ${lang === 'it' ? 'CODICE RISCATTATO!' : 'PROMO CODE REDEEMED!'}</b>\n\n` +
    `{{emoji.coin}} <b>${lang === 'it' ? 'Hai ricevuto' : 'You received'}:</b> <b>+${res.gramAwarded} GRAM</b>\n` +
    `{{emoji.moneyBag}} <b>${lang === 'it' ? 'Nuovo saldo disponibile' : 'New available balance'}:</b> <b>${newBal} GRAM</b>\n\n` +
    `<i>${lang === 'it' ? 'Usa il tuo saldo per sfidare altri giocatori o scommettere live!' : 'Use your balance to duel other players or bet live on matches!'}</i>`;

  const keyboard = new InlineKeyboard();
  if (isPrivateChat) {
    keyboard.webApp(
      lang === 'it' ? '{{emoji.swords}} ENTRA NELL\'ARENA' : '{{emoji.swords}} ENTER ARENA',
      webAppUrl
    );
  } else {
    keyboard.url(
      lang === 'it' ? '{{emoji.swords}} ENTRA NELL\'ARENA' : '{{emoji.swords}} ENTER ARENA',
      `https://t.me/${botUsername}?startapp=duels`
    );
  }

  await ctx.reply(renderCustomEmojis(successText), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

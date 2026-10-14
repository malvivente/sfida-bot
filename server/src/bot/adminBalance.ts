import { Context } from 'grammy';
import { dbService } from '../services/db.js';
import { isBotAdmin } from './broadcast.js';
import { renderCustomEmojis } from './emojis.js';

/**
 * Superadmin command to set/override a user's balance.
 * Strictly limited to Telegram ID 1052287650 (or process.env.ADMIN_TELEGRAM_ID).
 * If executed by any non-admin user, it silently ignores the message (no response).
 *
 * Supported syntaxes:
 * 1. Direct: `/setbalance <telegramId|@username|wallet> <amount>`
 *    e.g. `/setbalance 1052287650 10`
 *    e.g. `/setbalance @fasol 5.5`
 * 2. By reply: `/setbalance <amount>` (replying to a user's message)
 */
export async function handleSetBalanceCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;

  // Silent ignore: absolutely no response if not the authorized admin
  if (!isBotAdmin(fromId)) {
    return;
  }

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);
  const replyUser = ctx.message?.reply_to_message?.from;

  let identifier: string | undefined = undefined;
  let amountStr: string | undefined = undefined;

  if (parts.length >= 2) {
    identifier = parts[0];
    amountStr = parts[1];
  } else if (parts.length === 1) {
    if (replyUser) {
      identifier = replyUser.id.toString();
      amountStr = parts[0];
    } else {
      identifier = parts[0];
    }
  }

  if (!identifier || amountStr === undefined) {
    const helpMsg =
      `{{emoji.gear}} <b>COMANDO ADMIN: IMPOSTA SALDO</b>\n\n` +
      `<b>Sintassi del comando:</b>\n` +
      `• <code>/setbalance &lt;ID|@username|wallet&gt; &lt;importo&gt;</code>\n\n` +
      `<i>Oppure rispondi direttamente a un messaggio dell'utente:</i>\n` +
      `• <code>/setbalance &lt;importo&gt;</code>\n\n` +
      `<b>Esempi:</b>\n` +
      `• <code>/setbalance 1052287650 10</code>\n` +
      `• <code>/setbalance @fasol 5.5</code>\n` +
      `• <code>/setbalance 1052287650 0</code>`;

    await ctx.reply(renderCustomEmojis(helpMsg), { parse_mode: 'HTML' });
    return;
  }

  const numAmount = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(numAmount) || numAmount < 0) {
    await ctx.reply(
      renderCustomEmojis(
        `{{emoji.cross}} <b>Importo non valido:</b> <code>${amountStr}</code>\n` +
        `Inserisci un numero valido maggiore o uguale a 0 (es. <code>10</code> o <code>2.50</code>).`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Check previous balance if user exists
  const cleanUname = identifier.replace('@', '');
  const prevUser = await dbService.getUserAccount(undefined, identifier, cleanUname);
  const oldBalance = prevUser ? (prevUser.balanceGram || prevUser.balanceTon || '0.00') : null;

  const account = await dbService.setUserBalanceDirect(identifier, numAmount.toFixed(2));
  if (!account) {
    await ctx.reply(
      renderCustomEmojis(
        `{{emoji.cross}} <b>Utente non trovato</b> per identificatore: <code>${identifier}</code>.\n\n` +
        `Assicurati che l'utente abbia avviato il bot almeno una volta o che l'ID / username / wallet sia corretto.`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  const successMsg =
    `{{emoji.check}} <b>SALDO AGGIORNATO CON SUCCESSO!</b>\n\n` +
    `• <b>Utente:</b> ${account.displayName || account.username || 'N/A'}\n` +
    `• <b>Username:</b> ${account.username ? `@${account.username}` : '<i>Nessuno</i>'}\n` +
    `• <b>ID Telegram:</b> <code>${account.telegramId || identifier}</code>\n` +
    `• <b>Wallet:</b> <code>${account.walletAddress}</code>\n` +
    `• <b>Vecchio Saldo:</b> <code>${oldBalance ?? '0.00'} GRAM</code>\n` +
    `• <b>Nuovo Saldo:</b> <b>${account.balanceGram} GRAM</b> (${account.balanceTon} TON)`;

  await ctx.reply(renderCustomEmojis(successMsg), { parse_mode: 'HTML' });
}

/**
 * Superadmin command to inspect a user's current balance and account info.
 * Strictly limited to Telegram ID 1052287650 (or process.env.ADMIN_TELEGRAM_ID).
 * If executed by any non-admin user, it silently ignores the message (no response).
 */
export async function handleGetBalanceCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;

  // Silent ignore
  if (!isBotAdmin(fromId)) {
    return;
  }

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);
  const replyUser = ctx.message?.reply_to_message?.from;

  let identifier = parts[0];
  if (!identifier && replyUser) {
    identifier = replyUser.id.toString();
  }

  if (!identifier) {
    await ctx.reply(
      renderCustomEmojis(
        `{{emoji.gear}} <b>Uso:</b> <code>/getbalance &lt;ID|@username|wallet&gt;</code> (oppure rispondi a un messaggio dell'utente con <code>/getbalance</code>)`
      ),
      { parse_mode: 'HTML' }
    );
    return;
  }

  const cleanUname = identifier.replace('@', '');
  const account = await dbService.getUserAccount(undefined, identifier, cleanUname);
  if (!account) {
    await ctx.reply(
      renderCustomEmojis(`{{emoji.cross}} <b>Utente non trovato:</b> <code>${identifier}</code>`),
      { parse_mode: 'HTML' }
    );
    return;
  }

  const infoMsg =
    `{{emoji.user}} <b>DETTAGLI UTENTE:</b>\n\n` +
    `• <b>Nome:</b> ${account.displayName || account.username || 'N/A'}\n` +
    `• <b>Username:</b> ${account.username ? `@${account.username}` : '<i>N/A</i>'}\n` +
    `• <b>ID Telegram:</b> <code>${account.telegramId || 'N/A'}</code>\n` +
    `• <b>Saldo Attuale:</b> <b>${account.balanceGram || account.balanceTon || '0.00'} GRAM</b>\n` +
    `• <b>Wallet:</b> <code>${account.walletAddress}</code>\n` +
    `• <b>Ultimo Gioco:</b> <code>${account.lastPlayedGame || 'Nessuno'}</code>`;

  await ctx.reply(renderCustomEmojis(infoMsg), { parse_mode: 'HTML' });
}

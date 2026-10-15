import { Context } from 'grammy';
import { dbService } from '../services/db.js';
import { isBotAdmin, ADMIN_TELEGRAM_ID } from './broadcast.js';
import { renderCustomEmojis } from './emojis.js';

/**
 * Handles /maintenance and /manteinance commands to toggle or set platform maintenance mode.
 * Admin only; silently ignored for non-admins.
 *
 * Syntax:
 * - `/maintenance` -> toggles current state (ON <-> OFF)
 * - `/maintenance on [custom message]` -> explicitly activates maintenance
 * - `/maintenance off` -> explicitly deactivates maintenance
 */
export async function handleMaintenanceCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) {
    return; // Silent ignore for non-admins
  }

  const text = (ctx.message?.text || '').trim();
  const parts = text.split(/\s+/).slice(1);
  const action = parts[0]?.toLowerCase();
  const customMessage = parts.slice(1).join(' ').trim();

  let targetState: boolean;
  const currentState = dbService.isMaintenanceMode();

  if (action === 'on' || action === 'attiva' || action === '1' || action === 'enable') {
    targetState = true;
  } else if (action === 'off' || action === 'disattiva' || action === '0' || action === 'disable') {
    targetState = false;
  } else {
    // Toggle
    targetState = !currentState;
  }

  dbService.setMaintenanceMode(targetState, customMessage || undefined);

  if (targetState) {
    const msg =
      `{{emoji.gear}} <b>MODALITÀ MANUTENZIONE: ATTIVATA</b> {{emoji.lock}}\n\n` +
      `<i>La Mini App è ora bloccata per tutti gli utenti standard.</i>\n\n` +
      `• Verrà mostrata la schermata di manutenzione a schermo intero.\n` +
      `• <b>Solo gli amministratori autorizzati</b> possono accedere e testare.\n` +
      (customMessage ? `• <b>Avviso personalizzato</b>: <i>${customMessage}</i>\n` : '') +
      `\n<i>Per disattivare: digita <code>/maintenance off</code> o <code>/maintenance</code></i>`;

    await ctx.reply(renderCustomEmojis(msg), { parse_mode: 'HTML' });
  } else {
    const msg =
      `{{emoji.trophy}} <b>MODALITÀ MANUTENZIONE: DISATTIVATA</b> {{emoji.swords}}\n\n` +
      `<b>La piattaforma Sfida Arena è di nuovo online al 100%!</b>\n\n` +
      `Tutti i giocatori possono ora accedere regolarmente, partecipare ai duelli e scommettere.`;

    await ctx.reply(renderCustomEmojis(msg), { parse_mode: 'HTML' });
  }
}

/**
 * Handles /addadmin <telegramId> command.
 * Adds an authorized administrator by Telegram ID.
 */
export async function handleAddAdminCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) {
    return; // Silent ignore
  }

  const text = (ctx.message?.text || '').trim();
  const parts = text.split(/\s+/).slice(1);
  const replyUser = ctx.message?.reply_to_message?.from;

  let targetIdStr: string | undefined = undefined;

  if (parts.length > 0) {
    targetIdStr = parts[0].replace(/[^\d]/g, '');
  } else if (replyUser) {
    targetIdStr = String(replyUser.id);
  }

  if (!targetIdStr || !/^\d+$/.test(targetIdStr)) {
    const helpMsg =
      `{{emoji.gear}} <b>COMANDO ADMIN: AGGIUNGI AMMINISTRATORE</b>\n\n` +
      `<b>Sintassi del comando:</b>\n` +
      `• <code>/addadmin &lt;Telegram ID&gt;</code>\n\n` +
      `<i>Oppure rispondi direttamente a un messaggio dell'utente da autorizzare:</i>\n` +
      `• <code>/addadmin</code>\n\n` +
      `<b>Esempio:</b>\n` +
      `• <code>/addadmin 1052287650</code>`;

    await ctx.reply(renderCustomEmojis(helpMsg), { parse_mode: 'HTML' });
    return;
  }

  dbService.addAdmin(targetIdStr);

  const confirmMsg =
    `✅ <b>NUOVO AMMINISTRATORE AGGIUNTO</b>\n\n` +
    `• <b>ID Telegram</b>: <code>${targetIdStr}</code>\n` +
    `• <b>Privilegi</b>: Accesso autorizzato durante la modalità manutenzione & comandi bot.\n\n` +
    `<i>Usa <code>/listadmins</code> per visualizzare tutti gli amministratori attivi.</i>`;

  await ctx.reply(renderCustomEmojis(confirmMsg), { parse_mode: 'HTML' });
}

/**
 * Handles /deladmin <telegramId> command.
 * Revokes administrator privileges for a given Telegram ID.
 */
export async function handleDelAdminCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) {
    return; // Silent ignore
  }

  const text = (ctx.message?.text || '').trim();
  const parts = text.split(/\s+/).slice(1);
  const replyUser = ctx.message?.reply_to_message?.from;

  let targetIdStr: string | undefined = undefined;

  if (parts.length > 0) {
    targetIdStr = parts[0].replace(/[^\d]/g, '');
  } else if (replyUser) {
    targetIdStr = String(replyUser.id);
  }

  if (!targetIdStr) {
    const helpMsg =
      `{{emoji.gear}} <b>COMANDO ADMIN: RIMUOVI AMMINISTRATORE</b>\n\n` +
      `<b>Sintassi del comando:</b>\n` +
      `• <code>/deladmin &lt;Telegram ID&gt;</code>\n\n` +
      `<i>Oppure rispondi direttamente a un messaggio dell'utente da rimuovere:</i>\n` +
      `• <code>/deladmin</code>`;

    await ctx.reply(renderCustomEmojis(helpMsg), { parse_mode: 'HTML' });
    return;
  }

  const defaultAdmin = String(ADMIN_TELEGRAM_ID).trim();
  if (targetIdStr === defaultAdmin) {
    await ctx.reply(
      `⚠️ <b>Operazione non consentita</b>: Impossibile rimuovere il Superadmin principale (<code>${defaultAdmin}</code>).`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const removed = dbService.removeAdmin(targetIdStr);

  if (removed) {
    const okMsg =
      `🗑️ <b>AMMINISTRATORE RIMOSSO</b>\n\n` +
      `• <b>ID Telegram</b>: <code>${targetIdStr}</code>\n` +
      `• I privilegi di amministrazione sono stati revocati con successo.`;
    await ctx.reply(okMsg, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(
      `ℹ️ Nessun amministratore trovato con ID <code>${targetIdStr}</code> (o già rimosso).`,
      { parse_mode: 'HTML' }
    );
  }
}

/**
 * Handles /listadmins command to view all configured administrators.
 */
export async function handleListAdminsCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) {
    return; // Silent ignore
  }

  const admins = dbService.getAdmins();
  const isMaintenance = dbService.isMaintenanceMode();
  const defaultAdmin = String(ADMIN_TELEGRAM_ID).trim();

  let text =
    `{{emoji.gear}} <b>GESTIONE AMMINISTRATORI & SISTEMA</b> {{emoji.gear}}\n\n` +
    `• <b>Modalità Manutenzione</b>: ${isMaintenance ? '🔴 <b>ATTIVA</b> (Accesso solo Admin)' : '🟢 <b>DISATTIVATA</b> (Online per tutti)'}\n` +
    `• <b>Totale Amministratori</b>: <b>${admins.length}</b>\n\n` +
    `<b>Elenco Amministratori Autorizzati:</b>\n`;

  admins.forEach((id, idx) => {
    const isRoot = id === defaultAdmin;
    text += `${idx + 1}. <code>${id}</code> ${isRoot ? '⭐ <i>(Superadmin Root)</i>' : '🛡️ <i>(Admin)</i>'}\n`;
  });

  text +=
    `\n<b>Comandi rapidi:</b>\n` +
    `• <code>/maintenance [on|off]</code> - Attiva/Disattiva manutenzione\n` +
    `• <code>/addadmin &lt;id&gt;</code> - Aggiungi nuovo admin\n` +
    `• <code>/deladmin &lt;id&gt;</code> - Rimuovi un admin`;

  await ctx.reply(renderCustomEmojis(text), { parse_mode: 'HTML' });
}

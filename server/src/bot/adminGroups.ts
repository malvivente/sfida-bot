import { Context } from 'grammy';
import { dbService } from '../services/db.js';
import { isBotAdmin } from './broadcast.js';
import { botT } from './i18n.js';
import { renderCustomEmojis } from './emojis.js';

/**
 * Handles superadmin manual commands to configure group affiliates.
 * Only accessible by user ID 1052287650 (or process.env.ADMIN_TELEGRAM_ID).
 */

export async function handleSetGroupCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  const lang = ctx.from?.language_code || 'it';

  if (!isBotAdmin(fromId)) {
    await ctx.reply(renderCustomEmojis(botT(lang, 'broadcast_unauthorized')), { parse_mode: 'HTML' });
    return;
  }

  const text = ctx.message?.text?.trim() || '';
  // Expected format: /setgroup <chatId> <walletAddress> [managerTelegramId]
  const parts = text.split(/\s+/).slice(1);

  if (parts.length < 2) {
    const helpMsg =
      `{{emoji.gear}} <b>CONFIGURAZIONE MANUALE AFFILIAZIONE GRUPPO</b>\n\n` +
      `<b>Sintassi del comando:</b>\n` +
      `<code>/setgroup &lt;CHAT_ID&gt; &lt;WALLET_TON&gt; [TELEGRAM_ID_MANAGER]</code>\n\n` +
      `<b>Parametri:</b>\n` +
      `• <code>CHAT_ID</code>: ID del gruppo Telegram (es. <code>-1001234567890</code>)\n` +
      `• <code>WALLET_TON</code>: Indirizzo wallet per ricevere le commissioni (es. <code>UQA...</code>)\n` +
      `• <code>TELEGRAM_ID_MANAGER</code> (opzionale): ID Telegram dell'admin del gruppo per fargli vedere le statistiche nella Mini App\n\n` +
      `<b>Pool di Affiliazione:</b>\n` +
      `• <b>30% del Rake</b> (accreditato al gruppo, oppure diviso 15%/15% se il giocatore ha anche un referrer personale)\n\n` +
      `<b>Esempio pratico:</b>\n` +
      `<code>/setgroup -1002345678901 UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx 123456789</code>`;

    await ctx.reply(renderCustomEmojis(helpMsg), { parse_mode: 'HTML' });
    return;
  }

  const [chatId, walletAddress, managerIdStr] = parts;
  const managerTelegramId = managerIdStr ? managerIdStr.trim() : undefined;

  let groupTitle = `Gruppo ${chatId}`;
  try {
    const chatInfo = await ctx.api.getChat(chatId);
    if ('title' in chatInfo && chatInfo.title) {
      groupTitle = chatInfo.title;
    }
  } catch (err: any) {
    console.warn(`[AdminGroups] Could not fetch group title for ${chatId}:`, err?.message || err);
  }

  let managerUsername: string | undefined;
  if (managerTelegramId) {
    const mgrUser = await dbService.getUserAccount(undefined, managerTelegramId);
    managerUsername = mgrUser?.username;
  }

  const record = await dbService.setGroupAffiliate({
    chatId,
    title: groupTitle,
    walletAddress,
    commissionRatePercent: 30,
    managerTelegramId,
    managerUsername,
    configuredByAdminId: fromId!,
  });

  const replyText =
    `{{emoji.check}} <b>AFFILIAZIONE GRUPPO CONFIGURATA CON SUCCESSO!</b>\n\n` +
    `• <b>Gruppo</b>: <b>${record.title}</b>\n` +
    `• <b>Chat ID</b>: <code>${record.chatId}</code>\n` +
    `• <b>Wallet Beneficiario</b>: <code>${record.walletAddress}</code>\n` +
    `• <b>Pool Affiliazione</b>: <b>30% (15% con split o 30% diretto)</b>\n` +
    (record.managerTelegramId ? `• <b>Manager Telegram ID</b>: <code>${record.managerTelegramId}</code> (@${record.managerUsername || 'N/A'})\n` : '') +
    `\n<i>Le partite create in questo gruppo accrediteranno automaticamente le commissioni a questo wallet!</i>`;

  await ctx.reply(renderCustomEmojis(replyText), { parse_mode: 'HTML' });
}

export async function handleGetGroupCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  const lang = ctx.from?.language_code || 'it';

  if (!isBotAdmin(fromId)) {
    await ctx.reply(botT(lang, 'broadcast_unauthorized'), { parse_mode: 'HTML' });
    return;
  }

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);
  const chatId = parts[0];

  if (!chatId) {
    await ctx.reply(`⚠️ Uso: <code>/getgroup &lt;CHAT_ID&gt;</code>`, { parse_mode: 'HTML' });
    return;
  }

  const group = await dbService.getGroupAffiliate(chatId);
  if (!group) {
    await ctx.reply(`❌ Nessun gruppo affiliato trovato con ID <code>${chatId}</code>.`, { parse_mode: 'HTML' });
    return;
  }

  const infoText =
    `🏛 <b>DATI AFFILIAZIONE GRUPPO</b>\n\n` +
    `• <b>Nome</b>: <b>${group.title}</b>\n` +
    `• <b>Chat ID</b>: <code>${group.chatId}</code>\n` +
    `• <b>Wallet</b>: <code>${group.walletAddress}</code>\n` +
    `• <b>Commissione</b>: <code>30% Pool (15% split / 30% diretto)</code>\n` +
    `• <b>Manager ID</b>: <code>${group.managerTelegramId || 'Non impostato'}</code>\n` +
    `• <b>Partite Ospitate</b>: <code>${group.totalMatchesHosted}</code>\n` +
    `• <b>Volume Totale</b>: <code>${group.totalVolumeGram} GRAM</code>\n` +
    `• <b>Guadagni Totali</b>: <code>${group.totalEarningsGram} GRAM</code>\n` +
    `• <b>Data Creazione</b>: <code>${new Date(group.createdAt).toLocaleDateString()}</code>`;

  await ctx.reply(infoText, { parse_mode: 'HTML' });
}

export async function handleListGroupsCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  const lang = ctx.from?.language_code || 'it';

  if (!isBotAdmin(fromId)) {
    await ctx.reply(botT(lang, 'broadcast_unauthorized'), { parse_mode: 'HTML' });
    return;
  }

  const list = await dbService.getAllGroupAffiliates();
  if (list.length === 0) {
    await ctx.reply(`ℹ️ Nessun gruppo affiliato configurato al momento. Usa <code>/setgroup</code> per aggiungerne uno.`, { parse_mode: 'HTML' });
    return;
  }

  let msg = `🏛 <b>GRUPPI AFFILIATI CONFIGURATI (${list.length})</b>\n\n`;
  list.forEach((g, idx) => {
    msg += `${idx + 1}. <b>${g.title}</b> (<code>${g.chatId}</code>)\n`;
    msg += `   • Wallet: <code>${g.walletAddress.slice(0, 6)}...${g.walletAddress.slice(-4)}</code> | Pool: 30%\n`;
    msg += `   • Match: <b>${g.totalMatchesHosted}</b> | Volume: <b>${g.totalVolumeGram} GRAM</b> | Guadagni: <b>${g.totalEarningsGram} GRAM</b>\n\n`;
  });

  await ctx.reply(msg, { parse_mode: 'HTML' });
}

export async function handleDelGroupCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  const lang = ctx.from?.language_code || 'it';

  if (!isBotAdmin(fromId)) {
    await ctx.reply(botT(lang, 'broadcast_unauthorized'), { parse_mode: 'HTML' });
    return;
  }

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);
  const chatId = parts[0];

  if (!chatId) {
    await ctx.reply(`⚠️ Uso: <code>/delgroup &lt;CHAT_ID&gt;</code>`, { parse_mode: 'HTML' });
    return;
  }

  const deleted = await dbService.removeGroupAffiliate(chatId);
  if (deleted) {
    await ctx.reply(`✅ Affiliazione per il gruppo <code>${chatId}</code> rimossa con successo.`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ Nessun gruppo trovato con ID <code>${chatId}</code>.`, { parse_mode: 'HTML' });
  }
}

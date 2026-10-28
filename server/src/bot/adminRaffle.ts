import { Context } from 'grammy';
import { dbService } from '../services/db.js';
import { isBotAdmin } from './broadcast.js';

/**
 * /create_raffle <prize> <ticket_price> <duration_hours> <title> [featured 0|1]
 * E.g.:
 * /create_raffle 500 1 48 SFIDA MEGA RAFFLE 1
 * /create_raffle 50 0 24 FREE COMMUNITY RAFFLE 0
 */
export async function handleCreateRaffleCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) return;

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);

  if (parts.length < 4) {
    await ctx.reply(
      `🎟️ <b>COMANDO ADMIN: CREA RAFFLE</b>\n\n` +
      `<b>Sintassi:</b>\n` +
      `<code>/create_raffle &lt;montepremi&gt; &lt;prezzo_ticket&gt; &lt;durata_ore&gt; &lt;titolo...&gt; [featured: 0|1]</code>\n\n` +
      `<b>Esempi:</b>\n` +
      `• <code>/create_raffle 1000 0.5 48 SFIDA MEGA RAFFLE 1</code>\n` +
      `• <code>/create_raffle 100 0 24 RAFFLE GRATUITA COMMUNITY 0</code>\n\n` +
      `<i>Nota: imposta prezzo_ticket a 0 per creare una raffle 100% gratuita. Inserisci 1 alla fine per metterla in evidenza (Hero Card).</i>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const prizeGram = parseFloat(parts[0]);
  const ticketPriceGram = parseFloat(parts[1]);
  const durationHours = parseFloat(parts[2]);

  if (isNaN(prizeGram) || prizeGram <= 0) {
    await ctx.reply(`❌ Montepremi non valido. Inserisci un numero positivo in GRAM.`);
    return;
  }

  if (isNaN(ticketPriceGram) || ticketPriceGram < 0) {
    await ctx.reply(`❌ Prezzo ticket non valido. Inserisci 0 (gratis) o un importo in GRAM.`);
    return;
  }

  if (isNaN(durationHours) || durationHours <= 0) {
    await ctx.reply(`❌ Durata non valida. Inserisci la durata in ore (es. 24, 48).`);
    return;
  }

  // Check if last argument is featured flag (0 or 1)
  let isFeatured = false;
  let titleParts = parts.slice(3);
  const lastPart = titleParts[titleParts.length - 1];

  if (lastPart === '1' || lastPart.toLowerCase() === 'true') {
    isFeatured = true;
    titleParts = titleParts.slice(0, -1);
  } else if (lastPart === '0' || lastPart.toLowerCase() === 'false') {
    isFeatured = false;
    titleParts = titleParts.slice(0, -1);
  }

  const title = titleParts.join(' ').trim();
  if (!title) {
    await ctx.reply(`❌ Devi specificare un titolo per la raffle.`);
    return;
  }

  const raffle = dbService.createRaffle({
    title,
    prizeGram,
    ticketPriceGram,
    durationHours,
    isFeatured,
  });

  const endDate = new Date(raffle.endsAtEpoch).toLocaleString('it-IT');

  await ctx.reply(
    `✅ <b>RAFFLE CREATA CON SUCCESSO!</b>\n\n` +
    `🆔 <b>ID:</b> <code>${raffle.id}</code>\n` +
    `🏷️ <b>Titolo:</b> ${raffle.title}\n` +
    `🏆 <b>Montepremi:</b> ${raffle.prizeGram} GRAM\n` +
    `🎟️ <b>Prezzo Ticket:</b> ${raffle.ticketPriceGram === 0 ? 'GRATUITO (0 G)' : `${raffle.ticketPriceGram} GRAM`}\n` +
    `⏳ <b>Scadenza:</b> ${endDate} (${durationHours}h)\n` +
    `⭐ <b>In Evidenza:</b> ${raffle.isFeatured ? 'SÌ (HERO CARD)' : 'NO'}\n\n` +
    `<i>La raffle è ora visibile a tutti i giocatori nella sezione RAFFLE della Mini App.</i>`,
    { parse_mode: 'HTML' }
  );
}

/**
 * /set_featured_raffle <raffle_id>
 */
export async function handleSetFeaturedRaffleCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) return;

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);

  if (parts.length < 1) {
    await ctx.reply(
      `⭐ <b>IMPOSTA RAFFLE IN EVIDENZA</b>\n\n` +
      `<b>Sintassi:</b> <code>/set_featured_raffle &lt;raffle_id&gt;</code>\n\n` +
      `<i>Usa <code>/list_raffles</code> per visualizzare gli ID delle raffle attive.</i>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const raffleId = parts[0];
  const ok = dbService.setFeaturedRaffle(raffleId);

  if (!ok) {
    await ctx.reply(`❌ Nessuna raffle trovata con ID <code>${raffleId}</code>.`, { parse_mode: 'HTML' });
    return;
  }

  const raffle = dbService.getRaffleById(raffleId);
  await ctx.reply(
    `🌟 <b>RAFFLE IN EVIDENZA AGGIORNATA!</b>\n\n` +
    `La raffle <b>${raffle?.title}</b> (ID: <code>${raffleId}</code>) è ora impostata come principale (Hero Card) nella Mini App!`,
    { parse_mode: 'HTML' }
  );
}

/**
 * /end_raffle <raffle_id>
 * Ends a raffle, draws a random winning ticket, and credits the prize to the winner.
 */
export async function handleEndRaffleCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) return;

  const text = ctx.message?.text?.trim() || '';
  const parts = text.split(/\s+/).slice(1);

  if (parts.length < 1) {
    await ctx.reply(
      `🏁 <b>TERMINA ED ESTRAI VINCITORE RAFFLE</b>\n\n` +
      `<b>Sintassi:</b> <code>/end_raffle &lt;raffle_id&gt;</code>\n\n` +
      `<i>Estrae casualmente un biglietto tra tutti quelli acquistati e accredita istantaneamente il montepremi in GRAM sul saldo del vincitore!</i>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const raffleId = parts[0];
  const raffle = dbService.getRaffleById(raffleId);

  if (!raffle) {
    await ctx.reply(`❌ Raffle <code>${raffleId}</code> non trovata.`, { parse_mode: 'HTML' });
    return;
  }

  const result = await dbService.endRaffle(raffleId);

  if (!result.success) {
    await ctx.reply(`❌ Impossibile terminare la raffle: ${result.error || 'Errore sconosciuto'}`);
    return;
  }

  if (result.winner) {
    await ctx.reply(
      `🎉 <b>ESTRAZIONE COMPLETATA! ABBIAMO UN VINCITORE!</b> 🎉\n\n` +
      `🏷️ <b>Raffle:</b> ${raffle.title}\n` +
      `🏆 <b>Montepremi:</b> +${result.winner.prizeGram} GRAM\n` +
      `👤 <b>Vincitore (Telegram ID):</b> <code>${result.winner.userId}</code>\n` +
      `👤 <b>Username:</b> ${result.winner.username ? `@${result.winner.username}` : 'Nessuno'}\n` +
      `🎟️ <b>Biglietto Vincente:</b> #${result.winner.ticketNumber}\n` +
      `📊 <b>Biglietti Totali Venduti:</b> ${raffle.totalTickets}\n\n` +
      `💰 <i>Il premio di ${result.winner.prizeGram} GRAM è stato accreditato istantaneamente sul saldo interno del vincitore!</i>`,
      { parse_mode: 'HTML' }
    );
  } else {
    await ctx.reply(
      `🏁 <b>RAFFLE CHIUSA SENZA VINCITORE</b>\n\n` +
      `La raffle <b>${raffle.title}</b> è stata chiusa ma non era stato acquistato alcun biglietto (0 partecipanti).`,
      { parse_mode: 'HTML' }
    );
  }
}

/**
 * /list_raffles
 */
export async function handleListRafflesCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!isBotAdmin(fromId)) return;

  const raffles = dbService.getRaffles();

  if (raffles.length === 0) {
    await ctx.reply(
      `📋 <b>LISTA RAFFLE</b>\n\nNessuna raffle presente a sistema. Usa <code>/create_raffle</code> per crearne una!`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  let msg = `📋 <b>LISTA RAFFLE (${raffles.length} TOTALI):</b>\n\n`;

  for (const r of raffles) {
    const isEnded = r.status === 'ENDED';
    const statusIcon = isEnded ? '🏁 CONCLUSA' : '🟢 ATTIVA';
    const featuredTag = r.isFeatured ? '⭐ [IN EVIDENZA]' : '';
    const dateStr = new Date(r.endsAtEpoch).toLocaleDateString('it-IT');

    msg += `• <b>${r.title}</b> ${featuredTag}\n`;
    msg += `  🆔 <code>${r.id}</code> | ${statusIcon}\n`;
    msg += `  🏆 Premio: ${r.prizeGram} G | Prezzo: ${r.ticketPriceGram === 0 ? '0 G (Gratis)' : `${r.ticketPriceGram} G`}\n`;
    msg += `  🎟️ Biglietti venduti: <b>${r.totalTickets}</b> | Scadenza: ${dateStr}\n`;
    if (r.winnerUserId) {
      msg += `  👑 Vincitore: ID <code>${r.winnerUserId}</code> (Ticket #${r.winnerTicketNumber})\n`;
    }
    msg += `\n`;
  }

  await ctx.reply(msg, { parse_mode: 'HTML' });
}

import { Context } from 'grammy';
import { dbService } from '../services/db.js';
import { botT } from './i18n.js';

export const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '1052287650';

let isBroadcasting = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isBotAdmin(userId?: number | string): boolean {
  if (!userId) return false;
  return String(userId) === String(ADMIN_TELEGRAM_ID);
}

/**
 * Handles the /broadcast command executed by the bot administrator.
 * 
 * Usage:
 * 1. Admin sends the message to broadcast to the bot.
 * 2. Admin replies to that message with `/broadcast` (to copy without forward tag)
 *    or `/broadcast forward` (to forward preserving source).
 * 
 * Rate limits according to https://limits.tginfo.me:
 * - Telegram allows up to 30 messages per second globally for bots.
 * - We enforce a safe rate of ~25 messages/second (40ms interval).
 * - Automatic retry on HTTP 429 (FloodWait).
 * - Automatic blocking detection (HTTP 403 / 400).
 */
export async function handleBroadcastCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  const lang = ctx.from?.language_code || 'it';

  // 1. Authorization check
  if (!isBotAdmin(fromId)) {
    await ctx.reply(botT(lang, 'broadcast_unauthorized'), { parse_mode: 'HTML' });
    return;
  }

  // 2. Check reply to message
  const replyMsg = ctx.message?.reply_to_message;
  if (!replyMsg) {
    await ctx.reply(botT(lang, 'broadcast_no_reply'), { parse_mode: 'HTML' });
    return;
  }

  // 3. Concurrency check
  if (isBroadcasting) {
    await ctx.reply(botT(lang, 'broadcast_already_running'), { parse_mode: 'HTML' });
    return;
  }

  // 4. Parse options
  const cmdText = (ctx.message?.text || '').toLowerCase();
  const isForward = cmdText.includes('forward') || cmdText.includes('-f');
  const modeName = isForward ? 'Inoltro (Forward)' : 'Copia Esatta (Copy - senza inoltro)';

  // 5. Fetch recipients from database
  const recipients = await dbService.getAllBotTelegramIds();
  if (recipients.length === 0) {
    await ctx.reply(botT(lang, 'broadcast_no_recipients'), { parse_mode: 'HTML' });
    return;
  }

  const sourceChatId = ctx.chat?.id;
  if (!sourceChatId) return;
  const sourceMessageId = replyMsg.message_id;

  isBroadcasting = true;

  // 6. Send initial status message
  const statusMsg = await ctx.reply(
    botT(lang, 'broadcast_started', {
      total: recipients.length,
      mode: modeName,
    }),
    { parse_mode: 'HTML' }
  );

  const startTime = Date.now();
  let deliveredCount = 0;
  let failedCount = 0;
  let lastStatusUpdate = Date.now();
  const RATE_PER_SECOND = 25; // 25 msg/sec safe ceiling below Telegram's 30 msg/sec limit
  const TARGET_DELAY_MS = Math.floor(1000 / RATE_PER_SECOND); // ~40ms

  try {
    for (let i = 0; i < recipients.length; i++) {
      const targetChatId = recipients[i];
      const iterStart = Date.now();

      let success = false;
      let retries = 0;

      while (!success && retries < 3) {
        try {
          if (isForward) {
            await ctx.api.forwardMessage(targetChatId, sourceChatId, sourceMessageId);
          } else {
            // copyMessage copies all content, media, captions, formatting entities, and custom emojis!
            await ctx.api.copyMessage(targetChatId, sourceChatId, sourceMessageId);
          }
          success = true;
          deliveredCount++;
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const errCode = err?.error_code || err?.response?.error_code;
          const retryAfter = err?.parameters?.retry_after || err?.response?.parameters?.retry_after;

          // 429 Flood Control: respect Telegram retry_after parameter
          if (errCode === 429 && retryAfter) {
            const waitMs = (Number(retryAfter) + 0.5) * 1000;
            console.warn(`[Broadcast] Telegram rate limit 429 hit. Waiting ${waitMs}ms before retry...`);
            await sleep(waitMs);
            retries++;
            continue;
          }

          // 403 (User blocked bot) or 400 (Chat not found / User deactivated)
          if (errCode === 403 || (errCode === 400 && errMsg.includes('chat not found'))) {
            failedCount++;
            await dbService.setBotUserBlocked(targetChatId, true);
            break;
          }

          // Other unexpected dispatch error
          failedCount++;
          console.warn(`[Broadcast] Could not send to ${targetChatId}:`, errMsg);
          break;
        }
      }

      // Live progress update to admin (every 3 seconds or on final user)
      const now = Date.now();
      if (now - lastStatusUpdate > 3000 || i === recipients.length - 1) {
        lastStatusUpdate = now;
        const percent = Math.round(((i + 1) / recipients.length) * 100);
        const elapsed = ((now - startTime) / 1000).toFixed(1);
        try {
          await ctx.api.editMessageText(
            sourceChatId,
            statusMsg.message_id,
            botT(lang, 'broadcast_progress', {
              current: i + 1,
              total: recipients.length,
              percent,
              delivered: deliveredCount,
              failed: failedCount,
              elapsed,
            }),
            { parse_mode: 'HTML' }
          );
        } catch {
          // Ignore transient message edit rate limits
        }
      }

      // Enforce pacing to stay comfortably below 30 msg/s
      const iterElapsed = Date.now() - iterStart;
      if (iterElapsed < TARGET_DELAY_MS) {
        await sleep(TARGET_DELAY_MS - iterElapsed);
      }
    }

    // Final summary report
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const speed = (deliveredCount / Math.max(1, Number(totalDuration))).toFixed(1);
    const successRate = Math.round((deliveredCount / Math.max(1, recipients.length)) * 100);

    await ctx.api.editMessageText(
      sourceChatId,
      statusMsg.message_id,
      botT(lang, 'broadcast_finished', {
        total: recipients.length,
        delivered: deliveredCount,
        failed: failedCount,
        duration: totalDuration,
        speed,
        successRate,
      }),
      { parse_mode: 'HTML' }
    );
  } catch (fatalErr: any) {
    console.error('[Broadcast] Fatal error in broadcast loop:', fatalErr);
    try {
      await ctx.reply(`❌ Broadcast interrotto per errore: ${fatalErr?.message || fatalErr}`);
    } catch {}
  } finally {
    isBroadcasting = false;
  }
}

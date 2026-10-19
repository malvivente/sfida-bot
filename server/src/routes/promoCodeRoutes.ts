import { FastifyInstance } from 'fastify';
import { dbService } from '../services/db.js';
import { getTelegramBot, isTelegramChatMember } from '../bot/index.js';

export async function promoCodeRoutes(fastify: FastifyInstance) {
  /**
   * Validate if the bot is present in a specific Telegram group or channel
   */
  fastify.get('/api/promocodes/validate-group', async (req, reply) => {
    const query = req.query as { target?: string };
    const rawTarget = String(query.target || '').trim();

    if (!rawTarget) {
      return reply.status(400).send({ inGroup: false, error: 'TARGET_REQUIRED' });
    }

    // Clean target: handle t.me links, usernames, and numeric chat IDs
    let cleanTarget: string | number = rawTarget;
    if (cleanTarget.includes('t.me/')) {
      const parts = cleanTarget.split('t.me/');
      cleanTarget = parts[parts.length - 1].replace(/\/.*$/, '').replace(/^joinchat\//, '').trim();
    }

    if (/^-?\d+$/.test(String(cleanTarget))) {
      cleanTarget = Number(cleanTarget);
    } else if (typeof cleanTarget === 'string') {
      cleanTarget = cleanTarget.startsWith('@') ? cleanTarget : `@${cleanTarget}`;
    }

    const bot = getTelegramBot();
    if (!bot) {
      // Mock / Dev fallback
      const isNum = typeof cleanTarget === 'number' || /^-?\d+$/.test(String(cleanTarget));
      return reply.send({
        inGroup: true,
        chatId: String(cleanTarget),
        chatTitle: isNum ? `Gruppo ${cleanTarget}` : String(cleanTarget).replace(/^@/, ''),
        chatUsername: isNum ? undefined : String(cleanTarget).replace(/^@/, ''),
      });
    }

    try {
      const chat = await bot.api.getChat(cleanTarget as any);
      const botInfo = bot.botInfo || (await bot.api.getMe());
      const botMember = await bot.api.getChatMember(chat.id, botInfo.id);

      const isMember =
        ['creator', 'administrator', 'member'].includes(botMember.status) ||
        (botMember.status === 'restricted' && (botMember as any).is_member);

      if (isMember) {
        return reply.send({
          inGroup: true,
          chatId: String(chat.id),
          chatTitle: (chat as any).title || (chat as any).username || String(chat.id),
          chatUsername: (chat as any).username || undefined,
        });
      } else {
        return reply.send({
          inGroup: false,
          chatId: String(chat.id),
          chatTitle: (chat as any).title || String(chat.id),
          chatUsername: (chat as any).username || undefined,
          error: 'BOT_NOT_MEMBER',
          message: 'Il bot non è presente nel gruppo specificato. Aggiungi il bot al gruppo per convalidare il riscatto.',
        });
      }
    } catch (err: any) {
      return reply.send({
        inGroup: false,
        error: 'CHAT_NOT_FOUND',
        message: 'Gruppo o canale non trovato, oppure il bot non è presente.',
      });
    }
  });

  /**
   * Create a new Promo Code funded from creator's GRAM balance
   */
  fastify.post('/api/promocodes/create', async (req, reply) => {
    const body = req.body as {
      creatorTelegramId?: string | number;
      creatorWallet?: string;
      creatorUsername?: string;
      creatorDisplayName?: string;
      gramPerClaim: string | number;
      maxClaims: number;
      expiryHours?: number;
      requiresPremium?: boolean;
      requiredChatId?: string;
      requiredChatUsername?: string;
      requiredChatTitle?: string;
    };

    if (!body || !body.gramPerClaim || !body.maxClaims) {
      return reply.status(400).send({ success: false, error: 'MISSING_PARAMETERS', message: 'Parametri mancanti per la creazione del codice promo.' });
    }

    try {
      const result = await dbService.createPromoCode({
        creatorTelegramId: body.creatorTelegramId,
        creatorWallet: body.creatorWallet,
        creatorUsername: body.creatorUsername,
        creatorDisplayName: body.creatorDisplayName,
        gramPerClaim: body.gramPerClaim,
        maxClaims: body.maxClaims,
        expiryHours: body.expiryHours,
        requiresPremium: body.requiresPremium,
        requiredChatId: body.requiredChatId,
        requiredChatUsername: body.requiredChatUsername,
        requiredChatTitle: body.requiredChatTitle,
      });

      if (!result.success) {
        if (result.error === 'INSUFFICIENT_BALANCE') {
          return reply.status(400).send({
            success: false,
            error: 'INSUFFICIENT_BALANCE',
            message: 'Saldo insufficiente per finanziare il codice promozionale.',
          });
        }
        return reply.status(400).send({ success: false, error: result.error, message: 'Impossibile creare il codice promozionale.' });
      }

      // Fetch creator's updated balance
      const creatorAccount = await dbService.getUserAccount(
        body.creatorWallet,
        body.creatorTelegramId ? String(body.creatorTelegramId) : undefined
      );

      return reply.send({
        success: true,
        promoCode: result.promoCode,
        newBalance: creatorAccount.balanceGram || creatorAccount.balanceTon || '0.00',
      });
    } catch (err: any) {
      console.error('[PromoCodes] Error creating promo code:', err);
      return reply.status(500).send({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Errore interno' });
    }
  });

  /**
   * Get all promo codes created by the requesting user
   */
  fastify.get('/api/promocodes/my', async (req, reply) => {
    const query = req.query as {
      telegramId?: string;
      walletAddress?: string;
    };

    const telegramId = query.telegramId ? String(query.telegramId).trim() : undefined;
    const walletAddress = query.walletAddress ? String(query.walletAddress).trim() : undefined;

    if (!telegramId && !walletAddress) {
      return reply.status(400).send({ error: 'USER_IDENTIFIER_REQUIRED', promoCodes: [] });
    }

    try {
      const promoCodes = await dbService.getPromoCodesByCreator(telegramId, walletAddress);
      return reply.send({ promoCodes });
    } catch (err: any) {
      console.error('[PromoCodes] Error fetching my promo codes:', err);
      return reply.status(500).send({ error: 'INTERNAL_ERROR', promoCodes: [] });
    }
  });

  /**
   * Redeem a Promo Code
   */
  fastify.post('/api/promocodes/redeem', async (req, reply) => {
    const body = req.body as {
      code: string;
      telegramId?: string | number;
      walletAddress?: string;
      username?: string;
      displayName?: string;
      isPremium?: boolean;
    };

    if (!body || !body.code) {
      return reply.status(400).send({ success: false, error: 'CODE_REQUIRED', message: 'Inserisci un codice promo valido.' });
    }

    const cleanCode = body.code.trim().toUpperCase();
    const cleanTg = body.telegramId ? String(body.telegramId).trim() : undefined;
    const cleanWallet = body.walletAddress ? String(body.walletAddress).trim() : undefined;

    if (!cleanTg && !cleanWallet) {
      return reply.status(400).send({ success: false, error: 'USER_IDENTIFIER_REQUIRED', message: 'Identificatore utente non presente.' });
    }

    try {
      const promo = await dbService.getPromoCode(cleanCode);
      if (!promo) {
        return reply.status(404).send({ success: false, error: 'NOT_FOUND', message: 'Codice promo non valido o inesistente.' });
      }

      if (promo.status === 'EXPIRED') {
        return reply.status(400).send({ success: false, error: 'EXPIRED', message: 'Questo codice promozionale è scaduto.' });
      }

      if (promo.status === 'EXHAUSTED' || promo.claimedCount >= promo.maxClaims) {
        return reply.status(400).send({ success: false, error: 'EXHAUSTED', message: 'Questo codice promozionale ha raggiunto il limite massimo di utilizzi.' });
      }

      // Prevent creator from self-claiming
      if (
        (cleanTg && promo.creatorTelegramId && String(promo.creatorTelegramId) === cleanTg) ||
        (cleanWallet && promo.creatorWallet && dbService.isSameWallet(promo.creatorWallet, cleanWallet))
      ) {
        return reply.status(400).send({ success: false, error: 'SELF_REDEEM', message: 'Non puoi riscattare un codice promo creato da te.' });
      }

      // Check if already redeemed
      if (dbService.hasUserRedeemedPromo(promo.id, cleanTg, cleanWallet)) {
        return reply.status(400).send({ success: false, error: 'ALREADY_REDEEMED', message: 'Hai già riscattato questo codice promozionale.' });
      }

      // Check Telegram Premium requirement
      if (promo.requiresPremium && !body.isPremium) {
        return reply.status(400).send({
          success: false,
          error: 'PREMIUM_REQUIRED',
          message: 'Questo codice promozionale è riservato esclusivamente agli utenti Telegram Premium.',
        });
      }

      // Check Telegram Group membership requirement
      if (promo.requiredChatId) {
        if (!cleanTg) {
          return reply.status(400).send({
            success: false,
            error: 'TELEGRAM_REQUIRED',
            message: 'Per riscattare questo codice è necessario accedere tramite Telegram.',
          });
        }
        const inGroup = await isTelegramChatMember(promo.requiredChatId, cleanTg);
        if (!inGroup) {
          const groupLabel = promo.requiredChatTitle || (promo.requiredChatUsername ? `@${promo.requiredChatUsername}` : 'nel gruppo designato');
          return reply.status(400).send({
            success: false,
            error: 'NOT_IN_GROUP',
            message: `Devi essere membro di ${groupLabel} per poter riscattare questo codice.`,
          });
        }
      }

      // Execute redemption
      const result = await dbService.recordPromoRedemption({
        promoCode: promo,
        userTelegramId: cleanTg,
        userWallet: cleanWallet,
        username: body.username,
        displayName: body.displayName,
      });

      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error, message: 'Impossibile riscattare il codice.' });
      }

      const userAccount = await dbService.getUserAccount(cleanWallet, cleanTg);
      return reply.send({
        success: true,
        gramAwarded: result.gramAwarded,
        promoCode: result.promoCode,
        newBalance: userAccount.balanceGram || userAccount.balanceTon || '0.00',
        message: `🎉 Complimenti! Hai riscattato con successo ${result.gramAwarded} GRAM!`,
      });
    } catch (err: any) {
      console.error('[PromoCodes] Error redeeming promo code:', err);
      return reply.status(500).send({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Errore interno' });
    }
  });
}

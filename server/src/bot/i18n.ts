import { renderCustomEmojis } from './emojis.js';

export type BotLanguage = 'en' | 'it' | 'ru' | 'zh' | 'ar';

export const SUPPORTED_LANGUAGES: { code: BotLanguage; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

/**
 * Resolves Telegram's language_code (e.g. 'it', 'it-IT', 'ru', 'zh-hans') to our supported BotLanguage.
 * Defaults to 'en' if not recognized.
 */
export function resolveLanguage(langCode?: string | null): BotLanguage {
  if (!langCode) return 'en';
  const clean = langCode.toLowerCase().trim();
  if (clean.startsWith('it')) return 'it';
  if (clean.startsWith('ru')) return 'ru';
  if (clean.startsWith('zh')) return 'zh';
  if (clean.startsWith('ar')) return 'ar';
  if (clean.startsWith('en')) return 'en';
  return 'en';
}

export const BOT_TRANSLATIONS: Record<BotLanguage, Record<string, string>> = {
  // -------------------------------------------------------------
  // ENGLISH (Default Fallback)
  // -------------------------------------------------------------
  en: {
    welcome_header: `{{emoji.lightning}} <b>WELCOME TO SFIDA CYBER ARENA</b> {{emoji.lightning}}`,
    welcome_body:
      `{{emoji.fire}} <b>1v1 High-Stakes PvP Reflex Arena on TON & GRAM</b>\n` +
      `{{emoji.eye}} <b>Live Spectator Pari-Mutuel Betting Totalizer</b>\n` +
      `{{emoji.shield}} <b>Verified Smart Contracts & Anti-Cheat Authority</b>\n\n` +
      `<i>Select your game mode, challenge rivals in real time, or climb the global leaderboard!</i>`,
    welcome_recruited: `{{emoji.handshake}} Recruited by: <code>{recruiter}</code>\n\n`,
    btn_enter_arena: `{{emoji.swords}} Enter Arena`,
    btn_official_channel: `{{emoji.megaphone}} Official Channel`,
    btn_how_to_play: `{{emoji.controller}} How to Play`,

    inline_challenge_title: `{{emoji.swords}} Cyber Duel Challenge - {wager} GRAM`,
    inline_challenge_desc: `1v1 Duel. Winner takes {payout} GRAM (100% of pot)!`,
    inline_challenge_msg:
      `{{emoji.swords}} <b>CYBER DUEL CHALLENGE INITIATED</b> {{emoji.swords}}\n\n` +
      `{{emoji.user}} <b>Challenger</b>: @{challenger}\n` +
      `{{emoji.coin}} <b>Wager</b>: <b>{wager} GRAM</b>\n` +
      `{{emoji.trophy}} <b>Winner Payout</b>: <b>{payout} GRAM</b>\n` +
      `{{emoji.eye}} <b>Spectators</b>: Pari-Mutuel Betting Window Open\n\n` +
      `<i>Tap the button below to accept the challenge or spectate live!</i>`,
    inline_accept_btn: `{{emoji.swords}} Accept Challenge ({wager} GRAM)`,
    inline_watch_btn: `{{emoji.eye}} Watch & Bet (Totalizer)`,

    help_text:
      `{{emoji.bot}} <b>SFIDA ARENA BOT HELP</b> {{emoji.bot}}\n\n` +
      `<b>Available Commands:</b>\n` +
      `• /start - Launch the bot and open Arena\n` +
      `• /lang - Change interface language\n` +
      `• /help - Show this guide\n\n` +
      `<b>Inline Duels:</b>\n` +
      `In any chat, type <code>@{botUsername} duel &lt;amount&gt;</code> to create an instant duel invitation widget!\n\n` +
      `<b>Game Modes Available:</b>\n` +
      `• Russian Roulette (Tactical cylinder chamber)\n` +
      `• Blackjack (Cyber 21 duel)\n` +
      `• Glass Bridge (Memory & stepping stones)\n` +
      `• Chrono Blind (Millisecond reflex timing)\n` +
      `• Split or Steal (Casino Prisoner's Dilemma + Shared Jackpot)`,

    lang_select_title: `{{emoji.gear}} <b>Select your preferred language:</b>`,
    lang_changed: `{{emoji.check}} Language updated to <b>{language}</b>!`,

    // Admin Broadcast Messages
    broadcast_unauthorized: `{{emoji.cross}} <b>Access Denied</b>: This command is reserved for the bot administrator.`,
    broadcast_no_reply:
      `{{emoji.warning}} <b>HOW TO BROADCAST:</b>\n\n` +
      `1. Send the message you want to broadcast to this chat (text, photo, video, document, etc. with all custom emojis and formatting).\n` +
      `2. <b>Reply</b> to that message with <code>/broadcast</code> (to copy without forward header) or <code>/broadcast forward</code> (to forward).\n\n` +
      `<i>The bot will dispatch it to all registered users according to Telegram rate limits (~25 msg/s).</i>`,
    broadcast_no_recipients: `{{emoji.warning}} No registered recipients found in the database.`,
    broadcast_already_running: `{{emoji.warning}} A broadcast is already in progress! Please wait until it completes.`,
    broadcast_started:
      `{{emoji.rocket}} <b>BROADCAST STARTED</b>\n\n` +
      `• <b>Recipients</b>: <code>{total}</code> users\n` +
      `• <b>Mode</b>: <code>{mode}</code>\n` +
      `• <b>Rate</b>: <code>~25 msg/sec</code> (safe Telegram rate limit)\n\n` +
      `{{emoji.hourglass}} <i>Dispatching in progress...</i>`,
    broadcast_progress:
      `{{emoji.hourglass}} <b>BROADCAST IN PROGRESS...</b>\n\n` +
      `• <b>Progress</b>: <code>{current} / {total}</code> ({percent}%)\n` +
      `• {{emoji.check}} <b>Delivered</b>: <code>{delivered}</code>\n` +
      `• {{emoji.cross}} <b>Blocked/Failed</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>Elapsed</b>: <code>{elapsed}s</code>`,
    broadcast_finished:
      `{{emoji.check}} <b>BROADCAST COMPLETED!</b>\n\n` +
      `• <b>Total Recipients</b>: <code>{total}</code>\n` +
      `• {{emoji.cross}} <b>Blocked/Deactivated</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>Time Taken</b>: <code>{duration}s</code>\n` +
      `• {{emoji.chart}} <b>Average Speed</b>: <code>{speed} msg/s</code>`,

    // Group In-Chat Duel Messages
    group_duel_private_hint: `{{emoji.swords}} <b>CREATE DUEL</b>\n\nYou can use <code>/duel &lt;amount&gt; [game]</code> directly in any Telegram group to challenge members! Or tap below to enter the Arena:`,
    group_duel_invalid_wager: `{{emoji.warning}} <b>Invalid Wager</b>: Stake must be between 0.1 and 100 GRAM. Example: <code>/duel 2</code>`,
    group_duel_insufficient: `{{emoji.warning}} <b>INSUFFICIENT BALANCE</b>\n\nHey @{username}, to create this <b>{wager} GRAM</b> duel you need <b>{total} GRAM</b> (including 0.05 GRAM creation fee).\n\n💳 Your balance: <b>{balance} GRAM</b> (need {missing} GRAM more).`,
    group_duel_deposit_btn: `{{emoji.gem}} Deposit GRAM`,
    group_duel_confirm_title: `{{emoji.swords}} <b>CONFIRM DUEL CREATION</b>`,
    group_duel_confirm_desc:
      `👤 <b>Challenger</b>: @{creator}\n` +
      `🎮 <b>Discipline</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>Wager Stake</b>: <b>{wager} GRAM</b>\n` +
      `🏷️ <b>Creation Fee</b>: <b>0.05 GRAM</b>\n` +
      `💳 <b>Total to Deduct</b>: <b>{total} GRAM</b>\n\n` +
      `<i>Tap Confirm below to deduct funds and publish the open duel challenge to the group!</i>`,
    group_duel_confirm_btn: `{{emoji.check}} Confirm & Create`,
    group_duel_cancel_btn: `{{emoji.cross}} Cancel`,
    group_duel_cancelled: `{{emoji.cross}} Duel creation cancelled by @{creator}.`,
    group_duel_not_author_alert: `⛔️ Only the creator of this duel (@{creator}) can confirm or cancel!`,
    group_duel_expired: `{{emoji.warning}} This duel creation request has expired. Type /duel again.`,
    group_duel_card_title: `{{emoji.swords}} <b>NEW CYBER DUEL ACTIVE IN GROUP!</b> {{emoji.swords}}`,
    group_duel_card_desc:
      `👤 <b>Challenger</b>: @{creator}\n` +
      `🎮 <b>Discipline</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>Wager</b>: <b>{wager} GRAM</b> each\n` +
      `🏆 <b>Winner Pot</b>: <b>{payout} GRAM</b> (100%)\n` +
      `👁️ <b>Spectators</b>: Pari-Mutuel totalizer window open\n\n` +
      `<i>Who dares to challenge @{creator}? Tap below to fight!</i>`,
    group_duel_accept_btn: `{{emoji.swords}} Accept Challenge ({wager} GRAM)`,
    group_duel_spectate_btn: `{{emoji.eye}} Watch & Bet`,
  },

  // -------------------------------------------------------------
  // ITALIAN (Italiano)
  // -------------------------------------------------------------
  it: {
    welcome_header: `{{emoji.lightning}} <b>BENVENUTO SU SFIDA CYBER ARENA</b> {{emoji.lightning}}`,
    welcome_body:
      `{{emoji.fire}} <b>Duelli PvP 1v1 ad Alta Posta su TON & GRAM</b>\n` +
      `{{emoji.eye}} <b>Totalizzatore Scommesse Pari-Mutuel per Spettatori</b>\n` +
      `{{emoji.shield}} <b>Smart Contract Verificati & Server Autorevole Anti-Cheat</b>\n\n` +
      `<i>Scegli la tua disciplina di gioco, sfida guerrieri in tempo reale o scala la classifica globale!</i>`,
    welcome_recruited: `{{emoji.handshake}} Reclutato da: <code>{recruiter}</code>\n\n`,
    btn_enter_arena: `{{emoji.swords}} Entra nell'Arena`,
    btn_official_channel: `{{emoji.megaphone}} Canale Ufficiale`,
    btn_how_to_play: `{{emoji.controller}} Come Giocare`,

    inline_challenge_title: `{{emoji.swords}} Sfida Duello Cyber - {wager} GRAM`,
    inline_challenge_desc: `Duello 1v1. Il vincitore si aggiudica {payout} GRAM (100% montepremi)!`,
    inline_challenge_msg:
      `{{emoji.swords}} <b>SFIDA DUELLO INIZIATA</b> {{emoji.swords}}\n\n` +
      `{{emoji.user}} <b>Sfidante</b>: @{challenger}\n` +
      `{{emoji.coin}} <b>Puntata</b>: <b>{wager} GRAM</b>\n` +
      `{{emoji.trophy}} <b>Vincita Netta</b>: <b>{payout} GRAM</b>\n` +
      `{{emoji.eye}} <b>Spettatori</b>: Finestra Scommesse Pari-Mutuel Aperta\n\n` +
      `<i>Tocca il pulsante in basso per accettare la sfida o guardare in diretta!</i>`,
    inline_accept_btn: `{{emoji.swords}} Accetta Sfida ({wager} GRAM)`,
    inline_watch_btn: `{{emoji.eye}} Guarda & Scommetti (Totalizzatore)`,

    help_text:
      `{{emoji.bot}} <b>GUIDA SFIDA ARENA BOT</b> {{emoji.bot}}\n\n` +
      `<b>Comandi Disponibili:</b>\n` +
      `• /start - Avvia il bot e apri l'Arena\n` +
      `• /lang - Cambia la lingua dell'interfaccia\n` +
      `• /help - Mostra questa guida\n\n` +
      `<b>Duelli nei Gruppi (Inline):</b>\n` +
      `In qualsiasi chat o gruppo, digita <code>@{botUsername} duel &lt;importo&gt;</code> per generare il widget di sfida immediato!\n\n` +
      `<b>Discipline di Gioco Disponibili:</b>\n` +
      `• Russian Roulette (Tamburo tattico a revolver)\n` +
      `• Blackjack (Duello 21 cyber)\n` +
      `• Glass Bridge (Memoria e passi su vetro)\n` +
      `• Chrono Blind (Riflesso e tempismo al millisecondo)\n` +
      `• Split or Steal (Dilemma del Prigioniero + Jackpot Condiviso)`,

    lang_select_title: `{{emoji.gear}} <b>Seleziona la tua lingua preferita:</b>`,
    lang_changed: `{{emoji.check}} Lingua aggiornata in <b>{language}</b>!`,

    // Admin Broadcast Messages
    broadcast_unauthorized: `{{emoji.cross}} <b>Accesso Negato</b>: Questo comando è riservato all'amministratore del bot.`,
    broadcast_no_reply:
      `{{emoji.warning}} <b>COME UTILIZZARE IL BROADCAST:</b>\n\n` +
      `1. Invia a questa chat il messaggio che vuoi trasmettere (testo, foto, video, album, audio, ecc. con tutte le entità e custom emoji).\n` +
      `2. <b>Rispondi</b> a quel messaggio con <code>/broadcast</code> (per copiarlo senza intestazione di inoltro) oppure <code>/broadcast forward</code> (per inoltrarlo).\n\n` +
      `<i>Il bot invierà il messaggio a tutti gli utenti registrati rispettando i rate limit di Telegram (~25 msg/s).</i>`,
    broadcast_no_recipients: `{{emoji.warning}} Nessun utente registrato trovato nel database.`,
    broadcast_already_running: `{{emoji.warning}} Un broadcast è già in corso! Attendi il termine prima di avviarne un altro.`,
    broadcast_started:
      `{{emoji.rocket}} <b>BROADCAST AVVIATO</b>\n\n` +
      `• <b>Destinatari</b>: <code>{total}</code> utenti\n` +
      `• <b>Modalità</b>: <code>{mode}</code>\n` +
      `• <b>Frequenza</b>: <code>~25 msg/s</code> (limite di sicurezza Telegram)\n\n` +
      `{{emoji.hourglass}} <i>Invio in corso...</i>`,
    broadcast_progress:
      `{{emoji.hourglass}} <b>BROADCAST IN CORSO...</b>\n\n` +
      `• <b>Avanzamento</b>: <code>{current} / {total}</code> ({percent}%)\n` +
      `• {{emoji.check}} <b>Consegnati</b>: <code>{delivered}</code>\n` +
      `• {{emoji.cross}} <b>Bloccati/Falliti</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>Tempo Trascorso</b>: <code>{elapsed}s</code>`,
    broadcast_finished:
      `{{emoji.check}} <b>BROADCAST COMPLETATO!</b>\n\n` +
      `• <b>Totale Destinatari</b>: <code>{total}</code>\n` +
      `• {{emoji.check}} <b>Consegnati</b>: <code>{delivered}</code> ({successRate}%)\n` +
      `• {{emoji.cross}} <b>Bloccati/Inattivi</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>Tempo Impiegato</b>: <code>{duration}s</code>\n` +
      `• {{emoji.chart}} <b>Velocità Media</b>: <code>{speed} msg/s</code>`,

    // Group In-Chat Duel Messages
    group_duel_private_hint: `{{emoji.swords}} <b>CREA DUELLO</b>\n\nPuoi usare <code>/duel &lt;importo&gt; [gioco]</code> direttamente in qualsiasi gruppo Telegram per sfidare i membri! Oppure tocca in basso per entrare nell'Arena:`,
    group_duel_invalid_wager: `{{emoji.warning}} <b>Puntata non valida</b>: La puntata deve essere compresa tra 0.1 e 100 GRAM. Esempio: <code>/duel 2</code>`,
    group_duel_insufficient: `{{emoji.warning}} <b>SALDO INSUFFICIENTE</b>\n\nEhi @{username}, per creare questo duello da <b>{wager} GRAM</b> hai bisogno di <b>{total} GRAM</b> (inclusa la commissione di creazione di 0.05 GRAM).\n\n💳 Il tuo saldo: <b>{balance} GRAM</b> (mancano {missing} GRAM).`,
    group_duel_deposit_btn: `{{emoji.gem}} Deposita GRAM`,
    group_duel_confirm_title: `{{emoji.swords}} <b>CONFERMA CREAZIONE DUELLO</b>`,
    group_duel_confirm_desc:
      `👤 <b>Sfidante</b>: @{creator}\n` +
      `🎮 <b>Disciplina</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>Puntata</b>: <b>{wager} GRAM</b>\n` +
      `🏷️ <b>Costo Creazione</b>: <b>0.05 GRAM</b>\n` +
      `💳 <b>Totale da Addebitare</b>: <b>{total} GRAM</b>\n\n` +
      `<i>Tocca Conferma in basso per scalare il saldo e pubblicare la sfida aperta nel gruppo!</i>`,
    group_duel_confirm_btn: `{{emoji.check}} Conferma & Crea`,
    group_duel_cancel_btn: `{{emoji.cross}} Annulla`,
    group_duel_cancelled: `{{emoji.cross}} Creazione duello annullata da @{creator}.`,
    group_duel_not_author_alert: `⛔️ Solo il creatore di questo duello (@{creator}) può confermare o annullare!`,
    group_duel_expired: `{{emoji.warning}} Questa richiesta di duello è scaduta. Digita nuovamente /duel.`,
    group_duel_card_title: `{{emoji.swords}} <b>NUOVO DUELLO ATTIVO NEL GRUPPO!</b> {{emoji.swords}}`,
    group_duel_card_desc:
      `👤 <b>Sfidante</b>: @{creator}\n` +
      `🎮 <b>Disciplina</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>Puntata</b>: <b>{wager} GRAM</b> ciascuno\n` +
      `🏆 <b>Montepremi Vincitore</b>: <b>{payout} GRAM</b> (100%)\n` +
      `👁️ <b>Spettatori</b>: Finestra totalizzatore Pari-Mutuel aperta\n\n` +
      `<i>Chi ha il coraggio di sfidare @{creator}? Tocca sotto per combattere!</i>`,
    group_duel_accept_btn: `{{emoji.swords}} Accetta Sfida ({wager} GRAM)`,
    group_duel_spectate_btn: `{{emoji.eye}} Guarda & Scommetti`,
  },

  // -------------------------------------------------------------
  // RUSSIAN (Русский)
  // -------------------------------------------------------------
  ru: {
    welcome_header: `{{emoji.lightning}} <b>ДОБРО ПОЖАЛОВАТЬ В SFIDA CYBER ARENA</b> {{emoji.lightning}}`,
    welcome_body:
      `{{emoji.fire}} <b>PvP-дуэли 1 на 1 на высоких ставках в сети TON & GRAM</b>\n` +
      `{{emoji.eye}} <b>Пари-мютюэль тотализатор для зрителей в реальном времени</b>\n` +
      `{{emoji.shield}} <b>Проверенные смарт-контракты и античит-сервер</b>\n\n` +
      `<i>Выбирай игровую дисциплину, вызывай соперников на дуэль и покоряй глобальный рейтинг!</i>`,
    welcome_recruited: `{{emoji.handshake}} Приглашен: <code>{recruiter}</code>\n\n`,
    btn_enter_arena: `{{emoji.swords}} Войти на Арену`,
    btn_official_channel: `{{emoji.megaphone}} Официальный канал`,
    btn_how_to_play: `{{emoji.controller}} Как играть`,

    inline_challenge_title: `{{emoji.swords}} Дуэль-вызов Cyber - {wager} GRAM`,
    inline_challenge_desc: `1 на 1. Победитель забирает {payout} GRAM (100% банка)!`,
    inline_challenge_msg:
      `{{emoji.swords}} <b>ВЫЗОВ НА ДУЭЛЬ ОТКРЫТ</b> {{emoji.swords}}\n\n` +
      `{{emoji.user}} <b>Инициатор</b>: @{challenger}\n` +
      `{{emoji.coin}} <b>Ставка</b>: <b>{wager} GRAM</b>\n` +
      `{{emoji.trophy}} <b>Выигрыш</b>: <b>{payout} GRAM</b>\n` +
      `{{emoji.eye}} <b>Зрители</b>: Окно ставок пари-мютюэль открыто\n\n` +
      `<i>Нажми кнопку ниже, чтобы принять вызов или смотреть дуэль в прямом эфире!</i>`,
    inline_accept_btn: `{{emoji.swords}} Принять вызов ({wager} GRAM)`,
    inline_watch_btn: `{{emoji.eye}} Смотреть и ставить`,

    help_text:
      `{{emoji.bot}} <b>ПОМОЩЬ SFIDA ARENA BOT</b> {{emoji.bot}}\n\n` +
      `<b>Команды:</b>\n` +
      `• /start - Запустить бота и открыть Арену\n` +
      `• /lang - Изменить язык интерфейса\n` +
      `• /help - Справка\n\n` +
      `<b>Дуэли в чатах (Inline):</b>\n` +
      `В любом чате введите <code>@{botUsername} duel &lt;сумма&gt;</code>, чтобы мгновенно вызвать оппонента!`,

    lang_select_title: `{{emoji.gear}} <b>Выберите желаемый язык интерфейса:</b>`,
    lang_changed: `{{emoji.check}} Язык успешно изменен на <b>{language}</b>!`,

    broadcast_unauthorized: `{{emoji.cross}} <b>Доступ запрещен</b>: Эта команда доступна только администратору.`,
    broadcast_no_reply:
      `{{emoji.warning}} <b>КАК ИСПОЛЬЗОВАТЬ РАССЫЛКУ (/broadcast):</b>\n\n` +
      `1. Отправьте боту сообщение (текст, фото, видео, альбом и т.д. со всеми стилями и custom emoji).\n` +
      `2. <b>Ответьте</b> на это сообщение командой <code>/broadcast</code> (копирование без авторства) или <code>/broadcast forward</code> (пересылка).`,
    broadcast_no_recipients: `{{emoji.warning}} В базе данных нет зарегистрированных пользователей.`,
    broadcast_already_running: `{{emoji.warning}} Рассылка уже выполняется! Пожалуйста, дождитесь окончания.`,
    broadcast_started:
      `{{emoji.rocket}} <b>РАССЫЛКА ЗАПУЩЕНА</b>\n\n` +
      `• <b>Получатели</b>: <code>{total}</code> пользователей\n` +
      `• <b>Режим</b>: <code>{mode}</code>\n` +
      `• <b>Скорость</b>: <code>~25 сообщ./сек</code> (безопасный лимит Telegram)\n\n` +
      `{{emoji.hourglass}} <i>Отправка сообщений...</i>`,
    broadcast_progress:
      `{{emoji.hourglass}} <b>ОТПРАВКА РАССЫЛКИ...</b>\n\n` +
      `• <b>Прогресс</b>: <code>{current} / {total}</code> ({percent}%)\n` +
      `• {{emoji.check}} <b>Доставлено</b>: <code>{delivered}</code>\n` +
      `• {{emoji.cross}} <b>Ошибок/Блокировок</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>Прошло времени</b>: <code>{elapsed}s</code>`,
    broadcast_finished:
      `{{emoji.check}} <b>РАССЫЛКА УСПЕШНО ЗАВЕРШЕНА!</b>\n\n` +
      `• <b>Всего получателей</b>: <code>{total}</code>\n` +
      `• {{emoji.check}} <b>Доставлено</b>: <code>{delivered}</code> ({successRate}%)\n` +
      `• {{emoji.cross}} <b>Заблокировали/Неактивны</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>Время выполнения</b>: <code>{duration}s</code>\n` +
      `• {{emoji.chart}} <b>Средняя скорость</b>: <code>{speed} сообщ./сек</code>`,

    // Group In-Chat Duel Messages
    group_duel_private_hint: `{{emoji.swords}} <b>СОЗДАТЬ ДУЭЛЬ</b>\n\nВы можете использовать <code>/duel &lt;сумма&gt; [игра]</code> прямо в любой группе Telegram для вызова участников! Или нажмите кнопку ниже для входа на Арену:`,
    group_duel_invalid_wager: `{{emoji.warning}} <b>Неверная ставка</b>: Ставка должна быть от 0.1 до 100 GRAM. Пример: <code>/duel 2</code>`,
    group_duel_insufficient: `{{emoji.warning}} <b>НЕДОСТАТОЧНО СРЕДСТВ</b>\n\nПривет, @{username}! Чтобы создать эту дуэль на <b>{wager} GRAM</b>, вам необходимо <b>{total} GRAM</b> (включая комиссию за создание 0.05 GRAM).\n\n💳 Ваш баланс: <b>{balance} GRAM</b> (не хватает {missing} GRAM).`,
    group_duel_deposit_btn: `{{emoji.gem}} Пополнить GRAM`,
    group_duel_confirm_title: `{{emoji.swords}} <b>ПОДТВЕРЖДЕНИЕ СОЗДАНИЯ ДУЭЛИ</b>`,
    group_duel_confirm_desc:
      `👤 <b>Инициатор</b>: @{creator}\n` +
      `🎮 <b>Дисциплина</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>Ставка</b>: <b>{wager} GRAM</b>\n` +
      `🏷️ <b>Комиссия создания</b>: <b>0.05 GRAM</b>\n` +
      `💳 <b>Сумма списания</b>: <b>{total} GRAM</b>\n\n` +
      `<i>Нажмите «Подтвердить» ниже, чтобы списать средства и опубликовать открытый вызов в группе!</i>`,
    group_duel_confirm_btn: `{{emoji.check}} Подтвердить и создать`,
    group_duel_cancel_btn: `{{emoji.cross}} Отмена`,
    group_duel_cancelled: `{{emoji.cross}} Создание дуэли отменено пользователем @{creator}.`,
    group_duel_not_author_alert: `⛔️ Только создатель дуэли (@{creator}) может подтвердить или отменить её!`,
    group_duel_expired: `{{emoji.warning}} Срок действия заявки на дуэль истек. Введите /duel снова.`,
    group_duel_card_title: `{{emoji.swords}} <b>НОВАЯ ДУЭЛЬ В ГРУППЕ!</b> {{emoji.swords}}`,
    group_duel_card_desc:
      `👤 <b>Инициатор</b>: @{creator}\n` +
      `🎮 <b>Дисциплина</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>Ставка</b>: <b>{wager} GRAM</b> с каждого\n` +
      `🏆 <b>Банк победителя</b>: <b>{payout} GRAM</b> (100%)\n` +
      `👁️ <b>Зрители</b>: Окно ставок пари-мютюэль открыто\n\n` +
      `<i>Кто осмелится бросить вызов @{creator}? Нажмите ниже для битвы!</i>`,
    group_duel_accept_btn: `{{emoji.swords}} Принять вызов ({wager} GRAM)`,
    group_duel_spectate_btn: `{{emoji.eye}} Смотреть и ставить`,
  },

  // -------------------------------------------------------------
  // CHINESE (中文)
  // -------------------------------------------------------------
  zh: {
    welcome_header: `{{emoji.lightning}} <b>欢迎来到 SFIDA 赛博对决竞技场</b> {{emoji.lightning}}`,
    welcome_body:
      `{{emoji.fire}} <b>基于 TON & GRAM 的 1v1 高额赛博 PvP 竞技场</b>\n` +
      `{{emoji.eye}} <b>观众实时彩池分红博彩系统 (Pari-Mutuel)</b>\n` +
      `{{emoji.shield}} <b>经审计的智能合约与权威防作弊系统</b>\n\n` +
      `<i>选择竞技项目，实时向对手发起对决，登顶全球排行榜！</i>`,
    welcome_recruited: `{{emoji.handshake}} 邀请人: <code>{recruiter}</code>\n\n`,
    btn_enter_arena: `{{emoji.swords}} 进入竞技场`,
    btn_official_channel: `{{emoji.megaphone}} 官方频道`,
    btn_how_to_play: `{{emoji.controller}} 玩法说明`,

    inline_challenge_title: `{{emoji.swords}} 赛博对决挑战 - {wager} GRAM`,
    inline_challenge_desc: `1v1 对决。赢家独揽全部奖池 {payout} GRAM (100%)！`,
    inline_challenge_msg:
      `{{emoji.swords}} <b>对决挑战已发起</b> {{emoji.swords}}\n\n` +
      `{{emoji.user}} <b>挑战者</b>: @{challenger}\n` +
      `{{emoji.coin}} <b>赌注</b>: <b>{wager} GRAM</b>\n` +
      `{{emoji.trophy}} <b>胜者奖励</b>: <b>{payout} GRAM</b>\n` +
      `{{emoji.eye}} <b>观战模式</b>: 彩池博彩通道已开启\n\n` +
      `<i>点击下方按钮接受挑战或实时观战！</i>`,
    inline_accept_btn: `{{emoji.swords}} 接受挑战 ({wager} GRAM)`,
    inline_watch_btn: `{{emoji.eye}} 观战并下注`,

    help_text:
      `{{emoji.bot}} <b>SFIDA ARENA 帮助指南</b> {{emoji.bot}}\n\n` +
      `<b>可用命令:</b>\n` +
      `• /start - 启动机器人并进入竞技场\n` +
      `• /lang - 更改界面语言\n` +
      `• /help - 查看本指南\n\n` +
      `<b>群组内快速对决 (Inline):</b>\n` +
      `在任意聊天中输入 <code>@{botUsername} duel &lt;金额&gt;</code> 即可快速发起对决卡片！`,

    lang_select_title: `{{emoji.gear}} <b>请选择您的首选语言:</b>`,
    lang_changed: `{{emoji.check}} 语言已更新为 <b>{language}</b>！`,

    broadcast_unauthorized: `{{emoji.cross}} <b>权限不足</b>: 该命令仅限机器人管理员使用。`,
    broadcast_no_reply:
      `{{emoji.warning}} <b>群发广播说明 (/broadcast):</b>\n\n` +
      `1. 先向此对话发送要广播的消息（支持文字、照片、视频、图文和自定义表情）。\n` +
      `2. <b>回复</b>该消息并输入 <code>/broadcast</code>（无转发来源直接复制）或 <code>/broadcast forward</code>（带转发来源）。\n\n` +
      `<i>系统将遵循 Telegram 官方限制（约 25 条/秒）平稳分发。</i>`,
    broadcast_no_recipients: `{{emoji.warning}} 数据库中未找到已注册的用户。`,
    broadcast_already_running: `{{emoji.warning}} 当前已有广播任务正在执行中，请稍候。`,
    broadcast_started:
      `{{emoji.rocket}} <b>广播任务已启动</b>\n\n` +
      `• <b>目标用户</b>: <code>{total}</code> 人\n` +
      `• <b>发送模式</b>: <code>{mode}</code>\n` +
      `• <b>发送速率</b>: <code>~25 条/秒</code>（Telegram 安全限额）\n\n` +
      `{{emoji.hourglass}} <i>正在投递中...</i>`,
    broadcast_progress:
      `{{emoji.hourglass}} <b>广播投递中...</b>\n\n` +
      `• <b>进度</b>: <code>{current} / {total}</code> ({percent}%)\n` +
      `• {{emoji.check}} <b>已成功送达</b>: <code>{delivered}</code>\n` +
      `• {{emoji.cross}} <b>屏蔽/失败</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>已用时间</b>: <code>{elapsed}s</code>`,
    broadcast_finished:
      `{{emoji.check}} <b>广播全部完成！</b>\n\n` +
      `• <b>用户总数</b>: <code>{total}</code>\n` +
      `• {{emoji.check}} <b>成功送达</b>: <code>{delivered}</code> ({successRate}%)\n` +
      `• {{emoji.cross}} <b>已封锁/失效</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>总耗时</b>: <code>{duration}s</code>\n` +
      `• {{emoji.chart}} <b>平均速度</b>: <code>{speed} 条/秒</code>`,

    // Group In-Chat Duel Messages
    group_duel_private_hint: `{{emoji.swords}} <b>发起对决</b>\n\n您可以在任何 Telegram 群组中使用 <code>/duel &lt;金额&gt; [游戏]</code> 直接向群友发起挑战！或者点击下方进入竞技场：`,
    group_duel_invalid_wager: `{{emoji.warning}} <b>赌注金额无效</b>: 赌注必须在 0.1 到 100 GRAM 之间。示例: <code>/duel 2</code>`,
    group_duel_insufficient: `{{emoji.warning}} <b>余额不足</b>\n\n你好 @{username}，创建这场 <b>{wager} GRAM</b> 的对决需要 <b>{total} GRAM</b>（包含 0.05 GRAM 创建费）。\n\n💳 您的当前余额: <b>{balance} GRAM</b>（还差 {missing} GRAM）。`,
    group_duel_deposit_btn: `{{emoji.gem}} 充值 GRAM`,
    group_duel_confirm_title: `{{emoji.swords}} <b>确认创建对决</b>`,
    group_duel_confirm_desc:
      `👤 <b>挑战者</b>: @{creator}\n` +
      `🎮 <b>竞技项目</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>对决赌注</b>: <b>{wager} GRAM</b>\n` +
      `🏷️ <b>创建费用</b>: <b>0.05 GRAM</b>\n` +
      `💳 <b>扣除总额</b>: <b>{total} GRAM</b>\n\n` +
      `<i>点击下方确认扣除余额并在群组中发布公开挑战！</i>`,
    group_duel_confirm_btn: `{{emoji.check}} 确认并创建`,
    group_duel_cancel_btn: `{{emoji.cross}} 取消`,
    group_duel_cancelled: `{{emoji.cross}} @{creator} 已取消对决创建。`,
    group_duel_not_author_alert: `⛔️ 仅限对决发起人 (@{creator}) 进行确认或取消！`,
    group_duel_expired: `{{emoji.warning}} 该对决创建请求已过期。请重新输入 /duel。`,
    group_duel_card_title: `{{emoji.swords}} <b>群内新对决已开启！</b> {{emoji.swords}}`,
    group_duel_card_desc:
      `👤 <b>挑战者</b>: @{creator}\n` +
      `🎮 <b>竞技项目</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>每人赌注</b>: <b>{wager} GRAM</b>\n` +
      `🏆 <b>胜者奖池</b>: <b>{payout} GRAM</b> (100%)\n` +
      `👁️ <b>观众模式</b>: 彩池博彩通道已开启\n\n` +
      `<i>谁敢应战 @{creator}？点击下方迎战！</i>`,
    group_duel_accept_btn: `{{emoji.swords}} 接受挑战 ({wager} GRAM)`,
    group_duel_spectate_btn: `{{emoji.eye}} 观战并下注`,
  },

  // -------------------------------------------------------------
  // ARABIC (العربية)
  // -------------------------------------------------------------
  ar: {
    welcome_header: `{{emoji.lightning}} <b>مرحبًا بك في ساحة SFIDA CYBER ARENA</b> {{emoji.lightning}}`,
    welcome_body:
      `{{emoji.fire}} <b>مبارزات PvP 1v1 بحصص عالية على شبكة TON & GRAM</b>\n` +
      `{{emoji.eye}} <b>نظام مراهنات Pari-Mutuel المباشر للمشاهدين</b>\n` +
      `{{emoji.shield}} <b>عقود ذكية موثوقة ونظام محكم لمكافحة الغش</b>\n\n` +
      `<i>اختر وضع لعبتك، وتحدَّ الخصوم مباشرة، وتصدر قائمة المتصدرين العالمية!</i>`,
    welcome_recruited: `{{emoji.handshake}} تمت دعوتك بواسطة: <code>{recruiter}</code>\n\n`,
    btn_enter_arena: `{{emoji.swords}} دخول الساحة`,
    btn_official_channel: `{{emoji.megaphone}} القناة الرسمية`,
    btn_how_to_play: `{{emoji.controller}} طريقة اللعب`,

    inline_challenge_title: `{{emoji.swords}} تحدي المبارزة - {wager} GRAM`,
    inline_challenge_desc: `مبارزة 1 ضد 1. الفائز يحصل على {payout} GRAM (100% من الجائزة)!`,
    inline_challenge_msg:
      `{{emoji.swords}} <b>تم إطلاق تحدي المبارزة</b> {{emoji.swords}}\n\n` +
      `{{emoji.user}} <b>المتحدي</b>: @{challenger}\n` +
      `{{emoji.coin}} <b>الرهان</b>: <b>{wager} GRAM</b>\n` +
      `{{emoji.trophy}} <b>مكافأة الفائز</b>: <b>{payout} GRAM</b>\n` +
      `{{emoji.eye}} <b>المشاهدون</b>: نافذة المراهنات مفتوحة الآن\n\n` +
      `<i>اضغط على الزر أدناه لقبول التحدي أو المشاهدة مباشرة!</i>`,
    inline_accept_btn: `{{emoji.swords}} قبول التحدي ({wager} GRAM)`,
    inline_watch_btn: `{{emoji.eye}} مشاهدة ومراهنة`,

    help_text:
      `{{emoji.bot}} <b>دليل بوت SFIDA ARENA</b> {{emoji.bot}}\n\n` +
      `<b>الأوامر المتاحة:</b>\n` +
      `• /start - بدء البوت ودخول الساحة\n` +
      `• /lang - تغيير لغة الواجهة\n` +
      `• /help - عرض هذا الدليل\n\n` +
      `<b>المبارزة في المجموعات (Inline):</b>\n` +
      `في أي محادثة أو مجموعة، اكتب <code>@{botUsername} duel &lt;المبلغ&gt;</code> لإنشاء بطاقة التحدي فورًا!`,

    lang_select_title: `{{emoji.gear}} <b>اختر لغتك المفضلة:</b>`,
    lang_changed: `{{emoji.check}} تم تغيير اللغة إلى <b>{language}</b> بنجاح!`,

    broadcast_unauthorized: `{{emoji.cross}} <b>تم رفض الوصول</b>: هذا الأمر مخصص لمدير البوت فقط.`,
    broadcast_no_reply:
      `{{emoji.warning}} <b>طريقة استخدام البث الجماعي (/broadcast):</b>\n\n` +
      `1. أرسل الرسالة التي تريد بثها هنا (نص، صورة، فيديو، ملف، إلخ مع الرموز التعبيرية والتنسيق الكامل).\n` +
      `2. قم <b>بالرد</b> على تلك الرسالة بـ <code>/broadcast</code> (للنسخ دون تحويل) أو <code>/broadcast forward</code> (للتحويل).\n\n` +
      `<i>سيقوم البوت بإرسالها للمستخدمين وفقًا لحدود تيليجرام الرسمية (~25 رسالة/ثانية).</i>`,
    broadcast_no_recipients: `{{emoji.warning}} لم يتم العثور على مستخدمين مسجلين في قاعدة البيانات.`,
    broadcast_already_running: `{{emoji.warning}} هناك عملية بث قيد التنفيذ حاليًا! يرجى الانتظار حتى تنتهي.`,
    broadcast_started:
      `{{emoji.rocket}} <b>بدأ البث الجماعي</b>\n\n` +
      `• <b>المستلمون</b>: <code>{total}</code> مستخدم\n` +
      `• <b>الوضع</b>: <code>{mode}</code>\n` +
      `• <b>المعدل</b>: <code>~25 رسالة/ثانية</code> (الحد الآمن لتيليجرام)\n\n` +
      `{{emoji.hourglass}} <i>جاري الإرسال...</i>`,
    broadcast_progress:
      `{{emoji.hourglass}} <b>البث قيد التنفيذ...</b>\n\n` +
      `• <b>التقدم</b>: <code>{current} / {total}</code> ({percent}%)\n` +
      `• {{emoji.check}} <b>تم التسليم</b>: <code>{delivered}</code>\n` +
      `• {{emoji.cross}} <b>محظور/فشل</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>الوقت المنقضي</b>: <code>{elapsed}s</code>`,
    broadcast_finished:
      `{{emoji.check}} <b>اكتمل البث الجماعي بنجاح!</b>\n\n` +
      `• <b>إجمالي المستلمين</b>: <code>{total}</code>\n` +
      `• {{emoji.check}} <b>تم التسليم</b>: <code>{delivered}</code> ({successRate}%)\n` +
      `• {{emoji.cross}} <b>محظور/غير نشط</b>: <code>{failed}</code>\n` +
      `• {{emoji.clock}} <b>الوقت الإجمالي</b>: <code>{duration}s</code>\n` +
      `• {{emoji.chart}} <b>متوسط السرعة</b>: <code>{speed} رسالة/ثانية</code>`,

    // Group In-Chat Duel Messages
    group_duel_private_hint: `{{emoji.swords}} <b>إنشاء مبارزة</b>\n\nيمكنك استخدام <code>/duel &lt;المبلغ&gt; [اللعبة]</code> مباشرة في أي مجموعة تيليجرام لتحدي الأعضاء! أو اضغط بالأسفل لدخول الساحة:`,
    group_duel_invalid_wager: `{{emoji.warning}} <b>رهان غير صالح</b>: يجب أن يكون الرهان بين 0.1 و 100 GRAM. مثال: <code>/duel 2</code>`,
    group_duel_insufficient: `{{emoji.warning}} <b>الرصيد غير كافٍ</b>\n\nمرحبًا @{username}، لإنشاء مبارزة بقيمة <b>{wager} GRAM</b> تحتاج إلى <b>{total} GRAM</b> (شاملة رسوم الإنشاء 0.05 GRAM).\n\n💳 رصيدك الحالي: <b>{balance} GRAM</b> (ينقصك {missing} GRAM).`,
    group_duel_deposit_btn: `{{emoji.gem}} إيداع GRAM`,
    group_duel_confirm_title: `{{emoji.swords}} <b>تأكيد إنشاء المبارزة</b>`,
    group_duel_confirm_desc:
      `👤 <b>المتحدي</b>: @{creator}\n` +
      `🎮 <b>اللعبة</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>الرهان</b>: <b>{wager} GRAM</b>\n` +
      `🏷️ <b>رسوم الإنشاء</b>: <b>0.05 GRAM</b>\n` +
      `💳 <b>الإجمالي المخصوم</b>: <b>{total} GRAM</b>\n\n` +
      `<i>اضغط تأكيد أدناه لخصم الرصيد ونشر بطاقة التحدي في المجموعة!</i>`,
    group_duel_confirm_btn: `{{emoji.check}} تأكيد وإنشاء`,
    group_duel_cancel_btn: `{{emoji.cross}} إلغاء`,
    group_duel_cancelled: `{{emoji.cross}} تم إلغاء إنشاء المبارزة بواسطة @{creator}.`,
    group_duel_not_author_alert: `⛔️ فقط منشئ هذا التحدي (@{creator}) يمكنه التأكيد أو الإلغاء!`,
    group_duel_expired: `{{emoji.warning}} انتهت صلاحية طلب إنشاء التحدي. يرجى كتابة /duel مجددًا.`,
    group_duel_card_title: `{{emoji.swords}} <b>تحدي مبارزة جديد في المجموعة!</b> {{emoji.swords}}`,
    group_duel_card_desc:
      `👤 <b>المتحدي</b>: @{creator}\n` +
      `🎮 <b>اللعبة</b>: <b>{gameTitle}</b>\n` +
      `💰 <b>الرهان</b>: <b>{wager} GRAM</b> لكل طرف\n` +
      `🏆 <b>جائزة الفائز</b>: <b>{payout} GRAM</b> (100%)\n` +
      `👁️ <b>المشاهدون</b>: نافذة المراهنات مفتوحة الآن\n\n` +
      `<i>من يجرؤ على تحدي @{creator}؟ اضغط بالأسفل للنزال!</i>`,
    group_duel_accept_btn: `{{emoji.swords}} قبول التحدي ({wager} GRAM)`,
    group_duel_spectate_btn: `{{emoji.eye}} مشاهدة ومراهنة`,
  },
};

/**
 * Returns translated string for the given language and key, replacing {param} variables
 * and processing {{emoji.<key>}} custom emojis.
 */
export function botT(
  lang: string | undefined | null,
  key: string,
  params: Record<string, string | number> = {}
): string {
  const resolvedLang = resolveLanguage(lang);
  let template = BOT_TRANSLATIONS[resolvedLang]?.[key] || BOT_TRANSLATIONS.en[key] || key;

  // Substitute {param}
  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }

  // Substitute custom emojis
  return renderCustomEmojis(template);
}

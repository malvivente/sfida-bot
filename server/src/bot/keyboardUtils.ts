import { InlineKeyboard } from 'grammy';
import { BOT_EMOJIS } from './emojis.js';

export interface ParsedButtonEmoji {
  text: string;
  icon_custom_emoji_id?: string;
}

/**
 * Strips HTML tags and extracts custom emoji id if present in <tg-emoji> or {{emoji.<name>}}
 */
export function parseButtonEmoji(text: string, overrideEmojiId?: string): ParsedButtonEmoji {
  if (!text) return { text: '' };

  let icon_custom_emoji_id: string | undefined = overrideEmojiId;
  let cleanText = text;

  // 1. Replace <tg-emoji emoji-id="...">FALLBACK</tg-emoji> with custom emoji ID, stripping fallback from text
  cleanText = cleanText.replace(/<tg-emoji emoji-id="([^"]+)">([^<]*)<\/tg-emoji>/gi, (_match, id, _fallback) => {
    if (!icon_custom_emoji_id && id) {
      icon_custom_emoji_id = id.trim();
    }
    return '';
  });

  // 2. Replace {{emoji.<name>}} with extracting custom emoji id from BOT_EMOJIS, stripping token from text
  cleanText = cleanText.replace(/\{\{emoji\.([a-zA-Z0-9_]+)\}\}/gi, (_match, key) => {
    const emojiConfig = BOT_EMOJIS[key];
    if (emojiConfig?.id && !icon_custom_emoji_id) {
      icon_custom_emoji_id = emojiConfig.id.trim();
    }
    // Only return fallback if custom emoji id is NOT available
    return emojiConfig?.id ? '' : (emojiConfig?.fallback || '');
  });

  // 3. If icon_custom_emoji_id is NOT set yet, scan BOT_EMOJIS to see if any known emoji fallback is in cleanText
  if (!icon_custom_emoji_id) {
    for (const [_, config] of Object.entries(BOT_EMOJIS)) {
      if (config.id && config.fallback && cleanText.includes(config.fallback)) {
        icon_custom_emoji_id = config.id.trim();
        cleanText = cleanText.split(config.fallback).join('');
        break;
      }
    }
  }

  // 4. If icon_custom_emoji_id IS set, strip all known fallback unicode emojis from cleanText so only the custom emoji appears
  if (icon_custom_emoji_id) {
    for (const [_, config] of Object.entries(BOT_EMOJIS)) {
      if (config.fallback && cleanText.includes(config.fallback)) {
        cleanText = cleanText.split(config.fallback).join('');
      }
    }
  }

  // 5. Remove any remaining HTML tags (Telegram buttons do NOT parse HTML) and clean spaces
  cleanText = cleanText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  // Custom emoji buttons are enabled by default if icon_custom_emoji_id is available
  const enableCustomEmoji = process.env.ENABLE_CUSTOM_EMOJI_BUTTONS !== 'false';

  return {
    text: cleanText,
    icon_custom_emoji_id: enableCustomEmoji && icon_custom_emoji_id ? icon_custom_emoji_id : undefined,
  };
}

/**
 * Enhanced InlineKeyboard that automatically:
 * 1. Parses custom Telegram emojis and attaches `icon_custom_emoji_id`
 * 2. Cleans text so raw `<tg-emoji>` HTML tags are NEVER displayed on buttons
 */
export class SfidaInlineKeyboard extends InlineKeyboard {
  override url(text: string, url: string, customEmojiId?: string): this {
    const parsed = parseButtonEmoji(text, customEmojiId);
    const btn: any = { text: parsed.text, url };
    if (parsed.icon_custom_emoji_id) {
      btn.icon_custom_emoji_id = parsed.icon_custom_emoji_id;
    }
    return this.add(btn);
  }

  override text(text: string, data?: string, customEmojiId?: string): this {
    const parsed = parseButtonEmoji(text, customEmojiId);
    const callback_data = data !== undefined ? data : parsed.text;
    const btn: any = { text: parsed.text, callback_data };
    if (parsed.icon_custom_emoji_id) {
      btn.icon_custom_emoji_id = parsed.icon_custom_emoji_id;
    }
    return this.add(btn);
  }

  override webApp(text: string, url: string, customEmojiId?: string): this {
    const parsed = parseButtonEmoji(text, customEmojiId);
    const btn: any = { text: parsed.text, web_app: { url } };
    if (parsed.icon_custom_emoji_id) {
      btn.icon_custom_emoji_id = parsed.icon_custom_emoji_id;
    }
    return this.add(btn);
  }

  /**
   * Add a custom button object directly
   */
  public customButton(opts: {
    text: string;
    url?: string;
    callback_data?: string;
    web_app?: { url: string };
    icon_custom_emoji_id?: string;
    emojiName?: string;
  }): this {
    const overrideId = opts.icon_custom_emoji_id || (opts.emojiName ? BOT_EMOJIS[opts.emojiName]?.id : undefined);
    const parsed = parseButtonEmoji(opts.text, overrideId);
    const btn: any = { text: parsed.text };
    if (opts.url) btn.url = opts.url;
    if (opts.callback_data) btn.callback_data = opts.callback_data;
    if (opts.web_app) btn.web_app = opts.web_app;
    if (parsed.icon_custom_emoji_id) {
      btn.icon_custom_emoji_id = parsed.icon_custom_emoji_id;
    }
    return this.add(btn);
  }
}

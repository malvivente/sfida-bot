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

  // 1. Check for <tg-emoji emoji-id="...">...</tg-emoji> tag
  const tagMatch = cleanText.match(/<tg-emoji emoji-id="([^"]+)">([^<]*)<\/tg-emoji>\s*(.*)/s);
  if (tagMatch) {
    if (!icon_custom_emoji_id) {
      icon_custom_emoji_id = tagMatch[1]?.trim();
    }
    const rest = tagMatch[3]?.trim();
    const fallback = tagMatch[2]?.trim();
    // If there's text after the emoji, use the clean text without the emoji symbol (Telegram will show the custom emoji icon)
    // If there's no rest text, use fallback
    cleanText = rest || fallback || '';
  }

  // 2. Check for {{emoji.<name>}} placeholder
  const placeholderMatch = cleanText.match(/\{\{emoji\.([a-zA-Z0-9_]+)\}\}\s*(.*)/s);
  if (placeholderMatch) {
    const key = placeholderMatch[1];
    const rest = placeholderMatch[2]?.trim();
    const emojiConfig = BOT_EMOJIS[key];

    if (emojiConfig?.id && emojiConfig.id.trim()) {
      if (!icon_custom_emoji_id) {
        icon_custom_emoji_id = emojiConfig.id.trim();
      }
      cleanText = rest || emojiConfig.fallback;
    } else if (emojiConfig?.fallback) {
      cleanText = `${emojiConfig.fallback} ${rest}`.trim();
    }
  }

  // 3. Remove any other remaining HTML tags
  cleanText = cleanText.replace(/<[^>]*>/g, '').trim();

  return {
    text: cleanText,
    icon_custom_emoji_id: icon_custom_emoji_id && icon_custom_emoji_id.trim() ? icon_custom_emoji_id.trim() : undefined,
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

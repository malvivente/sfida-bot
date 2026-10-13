export function cleanPlayerName(name?: string | null): string {
  if (!name) return 'Warrior';
  let cleaned = name.replace(/\s*\(@?[a-zA-Z0-9_]+\)/g, '').trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1).trim();
  }
  return cleaned || 'Warrior';
}

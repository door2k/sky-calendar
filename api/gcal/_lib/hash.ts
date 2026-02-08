import { createHash } from 'crypto';

export function computeHash(data: Record<string, unknown>): string {
  const sorted = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

/**
 * Converts 101weiqi `number` field to human-readable Go rank.
 * 1 = 15k, 6 = 10k, 15 = 1k, 16 = 1d, 22 = 7d
 */
export function rankNumberToLabel(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return 'Unknown';
  if (num <= 0) return `${num}`;
  if (num <= 15) {
    const kyu = 16 - num;
    return `${kyu}k`;
  }
  const dan = num - 15;
  return `${dan}d`;
}

/**
 * Returns a sort order / rank weight for sorting ranks ascending or descending.
 */
export function rankWeight(num: number): number {
  return num;
}

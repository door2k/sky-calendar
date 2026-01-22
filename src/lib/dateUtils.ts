import { lastDayOfMonth, isFriday, getDay, subDays } from 'date-fns';

/**
 * Check if a date is the last Friday of its month.
 * The last Friday of each month is treated like a holiday (no Gan).
 */
export function isLastFridayOfMonth(date: Date): boolean {
  // Check if it's a Friday
  if (!isFriday(date)) return false;

  // Get the last day of the month
  const lastDay = lastDayOfMonth(date);

  // Find the last Friday of the month
  // Start from last day and go backwards until we find a Friday
  let lastFriday = lastDay;
  while (getDay(lastFriday) !== 5) {
    // 5 = Friday
    lastFriday = subDays(lastFriday, 1);
  }

  // Check if the given date matches the last Friday
  return (
    date.getFullYear() === lastFriday.getFullYear() &&
    date.getMonth() === lastFriday.getMonth() &&
    date.getDate() === lastFriday.getDate()
  );
}

/**
 * Check if a date should be treated like Saturday (special day).
 * This includes actual Saturdays and the last Friday of each month.
 */
export function isSaturdayLike(date: Date): boolean {
  return getDay(date) === 6 || isLastFridayOfMonth(date);
}

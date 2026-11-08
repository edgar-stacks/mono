import { formatDistanceStrict } from 'date-fns';

export function formatRelativeTime(date: Date, now: Date): string {
  return formatDistanceStrict(date, now, { addSuffix: true });
}

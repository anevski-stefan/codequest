import { formatDistanceToNow } from 'date-fns';
export const formatRelativeDate = (value: string | number | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, {
    addSuffix: true
  });
};
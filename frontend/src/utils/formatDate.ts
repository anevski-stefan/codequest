import { formatDistanceToNow } from 'date-fns';
export const formatRelativeDate = (value: string | number | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, {
    addSuffix: true
  });
};
export const formatStandardDate = (value: string | number | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
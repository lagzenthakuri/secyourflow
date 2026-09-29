import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const handleError = (error: unknown): void => {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error);

  toast.error(message);
  void import('@repo/observability/error')
    .then(({ parseError }) => parseError(error))
    .catch(() => console.error('Unable to report application error:', error));
};

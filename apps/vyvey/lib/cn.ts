import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes met conditionele logica, conflict-vrij. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

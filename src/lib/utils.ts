import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Firestore rejects `undefined` field values; shallow-strip before writes. */
export function stripUndefined<T extends object>(obj: T): T {
  const o = { ...obj } as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (o[k] === undefined) delete o[k];
  }
  return o as T;
}

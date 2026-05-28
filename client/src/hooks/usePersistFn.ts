import { useRef } from 'react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

export function usePersistFn<T extends AnyFn>(fn: T): T {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;
  const persistRef = useRef<T | null>(null);
  if (!persistRef.current) {
    persistRef.current = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
      return fnRef.current.apply(this, args);
    } as T;
  }
  return persistRef.current as T;
}

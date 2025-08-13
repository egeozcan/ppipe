import isFunction from './isFunction';

export default function isPromise<T = unknown>(val: unknown): val is Promise<T> {
  return !!(val && isFunction((val as Promise<T>).then));
}

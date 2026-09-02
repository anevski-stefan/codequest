import {
  lazy,
  type ComponentType
} from 'react';
const MAX_BACKOFF_MS = 20000;
const retry = <T extends ComponentType>(
  fn: () => Promise<{
    default: T;
  }>,
  retriesLeft = 3,
  baseInterval = 1500
): Promise<{
  default: T;
}> => {
  return new Promise((resolve, reject) => {
    fn().then(resolve).catch((error: unknown) => {
      console.warn('Lazy chunk load failed, retrying...', error);
      if (retriesLeft <= 0) {
        reject(error);
        return;
      }
      const backoffMs = Math.min(baseInterval * 2 ** (3 - retriesLeft), MAX_BACKOFF_MS);
      setTimeout(() => {
        retry(fn, retriesLeft - 1, baseInterval).then(resolve, reject);
      }, backoffMs);
    });
  });
};
const lazyWithRetry = <T extends ComponentType>(loader: () => Promise<{
  default: T;
}>) => lazy(() => retry(loader));
export default lazyWithRetry;
import {
  lazy,
  type ComponentType
} from 'react';
const retry = <T extends ComponentType>(
  fn: () => Promise<{
    default: T;
  }>,
  retriesLeft = 3,
  interval = 1500
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
      setTimeout(() => {
        retry(fn, retriesLeft - 1, interval).then(resolve, reject);
      }, interval);
    });
  });
};
const lazyWithRetry = <T extends ComponentType>(loader: () => Promise<{
  default: T;
}>) => lazy(() => retry(loader));
export default lazyWithRetry;

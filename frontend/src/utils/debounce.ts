type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export default function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const debounced = (...args: Args) => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = cancel;
  return debounced;
}
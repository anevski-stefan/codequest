import type { Transition, Variants } from 'framer-motion';

// Shared motion tokens — every animated surface pulls from here so the
// product moves with one rhythm.
export const spring: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.8 };
export const softSpring: Transition = { type: 'spring', stiffness: 120, damping: 20 };
export const easeOut = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

export const stagger = (step = 0.04, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

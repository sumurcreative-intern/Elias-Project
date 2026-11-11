type Run = <R>(fn: () => R) => R;

/**
 * Runs `fn` outside the current request, for work other requests share. Work
 * started inside a page render never settled once the visitor who started it
 * left (11 Nov 2026: the daily cycle hung for every visitor after a reload).
 * Uses the context instrumentation.ts captured at startup; until it exists,
 * `fn` runs in place.
 */
export function detached<R>(fn: () => R): R {
  const run = (globalThis as { eliasDetached?: Run }).eliasDetached;
  return run ? run(fn) : fn();
}

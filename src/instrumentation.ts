/** Runs once when the server starts, before any request. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { AsyncLocalStorage } = await import('node:async_hooks');
  // Taken outside every request, so work run through it belongs to none (lib/detached)
  (globalThis as { eliasDetached?: unknown }).eliasDetached = AsyncLocalStorage.snapshot();
}

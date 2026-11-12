/**
 * Whether the page-turn blob is covering the screen. Entrances started while
 * it is wait in `afterPageReveal`, so a new page's content rises as the blob
 * lifts instead of animating unseen underneath it.
 */
let covered = false;
/** Screens laid over the page, like Beranda's cycle loading, holding its entrance back too */
let holds = 0;
/** Marks such a screen, so text inside it animates while it holds the page */
export const OVER_HOLD = 'data-over-hold';
const waiting = new Set<() => void>();
const waitingForBlob = new Set<() => void>();

function flush() {
  if (covered) return;
  const queued = [...waitingForBlob, ...(holds ? [] : waiting)];
  waitingForBlob.clear();
  if (!holds) waiting.clear();
  queued.forEach((play) => play());
}

export function setPageCovered(value: boolean) {
  covered = value;
  flush();
}

/** Holds back the page's entrances until the returned release is called. */
export function holdPageReveal(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    flush();
  };
}

/**
 * Runs `play` now, or once the blob starts lifting and nothing holds the page.
 * `overHold` is for the screen doing the holding, which only waits for the blob.
 * Returns the cleanup.
 */
export function afterPageReveal(play: () => void, { overHold = false } = {}): () => void {
  if (!covered && (overHold || !holds)) {
    play();
    return () => {};
  }
  const queue = overHold ? waitingForBlob : waiting;
  queue.add(play);
  return () => queue.delete(play);
}

type PageTurn = (href: string, options?: { refresh?: boolean }) => boolean;
let turner: PageTurn | null = null;

/** Registered by PageTransition, so code can navigate behind the blob like a link click. */
export function setPageTurner(turn: PageTurn): () => void {
  turner = turn;
  return () => {
    if (turner === turn) turner = null;
  };
}

/**
 * Navigates to `href` behind the page-turn blob; `refresh` also drops cached
 * pages once it is covered. False when no blob can play (reduced motion, or
 * not mounted), for the caller to navigate itself.
 */
export function turnPageTo(href: string, options?: { refresh?: boolean }): boolean {
  return turner?.(href, options) ?? false;
}

type PageWipe = (swap: () => void) => boolean;
let wiper: PageWipe | null = null;

/** Registered by PageTransition, so a screen can leave behind the blob. */
export function setPageWiper(wipe: PageWipe): () => void {
  wiper = wipe;
  return () => {
    if (wiper === wipe) wiper = null;
  };
}

/**
 * Covers the screen with the page-turn blob, runs `swap` underneath, then
 * lifts it. False when no blob can play, for the caller to swap at once.
 */
export function wipePage(swap: () => void): boolean {
  return wiper?.(swap) ?? false;
}

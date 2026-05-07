/**
 * Client-only shortlist persisted in localStorage.
 *
 * Schema is namespaced + versioned so we can change shape later without
 * blowing up users who already saved a list. Reads are paranoid — anything
 * malformed is dropped silently.
 */

const STORAGE_KEY = 'couchy:shortlist:v1';
const CHANGE_EVENT = 'couchy:shortlist:change';

export interface ShortlistItem {
  appid: number;
  name: string;
  capsuleImage: string | null;
  /** Unix ms — used to sort newest-first. */
  addedAt: number;
}

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function isValidItem(v: unknown): v is ShortlistItem {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.appid === 'number' &&
    Number.isFinite(o.appid) &&
    typeof o.name === 'string' &&
    (o.capsuleImage === null || typeof o.capsuleImage === 'string') &&
    typeof o.addedAt === 'number'
  );
}

function readFromStorage(): ShortlistItem[] {
  if (!isClient()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidItem);
  } catch {
    return [];
  }
}

/**
 * useSyncExternalStore requires a referentially-stable snapshot when the
 * underlying data hasn't changed. We cache the parsed array and only
 * invalidate when we know it's stale.
 */
let cachedSnapshot: ShortlistItem[] | null = null;

function snapshot(): ShortlistItem[] {
  cachedSnapshot ??= readFromStorage();
  return cachedSnapshot;
}

function refresh(): void {
  cachedSnapshot = readFromStorage();
}

function writeToStorage(items: ShortlistItem[]): void {
  if (!isClient()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  refresh();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getShortlistSnapshot(): ShortlistItem[] {
  return snapshot();
}

/** Empty array constant — required by useSyncExternalStore for SSR snapshots. */
export const EMPTY_SHORTLIST: ShortlistItem[] = [];

export function addToShortlist(item: Omit<ShortlistItem, 'addedAt'>): void {
  const current = snapshot();
  if (current.some((i) => i.appid === item.appid)) return;
  writeToStorage([{ ...item, addedAt: Date.now() }, ...current]);
}

export function removeFromShortlist(appid: number): void {
  const current = snapshot();
  const next = current.filter((i) => i.appid !== appid);
  if (next.length !== current.length) {
    writeToStorage(next);
  }
}

export function toggleShortlist(item: Omit<ShortlistItem, 'addedAt'>): void {
  if (snapshot().some((i) => i.appid === item.appid)) {
    removeFromShortlist(item.appid);
  } else {
    addToShortlist(item);
  }
}

/**
 * Subscribe to shortlist changes. Returns an unsubscribe function.
 * Listens for our custom event (same-tab) and `storage` (cross-tab).
 */
export function subscribeShortlist(callback: () => void): () => void {
  if (!isClient()) return () => undefined;
  const handler = (e: Event) => {
    // For cross-tab sync via the storage event, ignore unrelated keys.
    if (e instanceof StorageEvent && e.key !== null && e.key !== STORAGE_KEY) {
      return;
    }
    refresh();
    callback();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

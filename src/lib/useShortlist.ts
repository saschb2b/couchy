import { useSyncExternalStore } from 'react';
import {
  EMPTY_SHORTLIST,
  getShortlistSnapshot,
  subscribeShortlist,
  type ShortlistItem,
} from './shortlist';

/** Returns the current shortlist; updates when items are added/removed (same tab or cross-tab). */
export function useShortlist(): ShortlistItem[] {
  return useSyncExternalStore(
    subscribeShortlist,
    getShortlistSnapshot,
    () => EMPTY_SHORTLIST,
  );
}

export function useIsInShortlist(appid: number): boolean {
  const items = useShortlist();
  return items.some((i) => i.appid === appid);
}

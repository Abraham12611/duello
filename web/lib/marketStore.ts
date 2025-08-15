import { useSyncExternalStore, useEffect } from "react";

export type Tag =
  | "MLB"
  | "NBA"
  | "NHL"
  | "PREMIER LEAGUE"
  | "LA LIGA"
  | "UEFA CHAMPIONS LEAGUE";

export type TeamInfo = {
  name: string;
  logoDataUrl?: string; // data: URL persisted locally
};

export type MarketMeta = {
  address: `0x${string}`;
  token: `0x${string}`;
  startIso: string;
  tag: Tag;
  teamA: TeamInfo;
  teamB: TeamInfo;
};

// ---- Internal state persisted to localStorage ----
type State = {
  markets: Record<string, MarketMeta>; // key: lowercase address
};

const STORAGE_KEY = "duello.markets.v1";

function readStorage(): State {
  if (typeof window === "undefined") return { markets: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { markets: {} };
    const parsed = JSON.parse(raw) as State;
    // basic shape check
    if (!parsed || typeof parsed !== "object" || !parsed.markets) return { markets: {} };
    return parsed;
  } catch {
    return { markets: {} };
  }
}

function writeStorage(state: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let state: State = { markets: {} };
let initialized = false;
const subscribers = new Set<() => void>();

function initIfNeeded() {
  if (!initialized && typeof window !== "undefined") {
    state = readStorage();
    initialized = true;
  }
}

function emit() {
  writeStorage(state);
  subscribers.forEach((cb) => {
    try { cb(); } catch {}
  });
}

export const marketStore = {
  subscribe(cb: () => void) {
    initIfNeeded();
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },
  getSnapshot(): State {
    initIfNeeded();
    return state;
  },
  add(meta: MarketMeta) {
    initIfNeeded();
    state = {
      ...state,
      markets: { ...state.markets, [meta.address.toLowerCase()]: meta },
    };
    emit();
  },
  remove(address: string) {
    initIfNeeded();
    const key = address.toLowerCase();
    if (!state.markets[key]) return;
    const copy = { ...state.markets };
    delete copy[key];
    state = { ...state, markets: copy };
    emit();
  },
  update(address: string, patch: Partial<MarketMeta>) {
    initIfNeeded();
    const key = address.toLowerCase();
    const cur = state.markets[key];
    if (!cur) return;
    state = {
      ...state,
      markets: { ...state.markets, [key]: { ...cur, ...patch } },
    };
    emit();
  },
};

export function useMarkets() {
  const snap = useSyncExternalStore(marketStore.subscribe, marketStore.getSnapshot, marketStore.getSnapshot);
  const markets = Object.values(snap.markets).sort((a, b) => a.startIso.localeCompare(b.startIso));
  return markets;
}

export function useMarket(address?: string) {
  const snap = useSyncExternalStore(marketStore.subscribe, marketStore.getSnapshot, marketStore.getSnapshot);
  if (!address) return undefined;
  return snap.markets[address.toLowerCase()];
}

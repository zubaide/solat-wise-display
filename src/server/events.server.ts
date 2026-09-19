type Listener = (topic: string) => void;

const globalStore = globalThis as unknown as { sseListeners?: Set<Listener> };
const listeners = globalStore.sseListeners ?? new Set<Listener>();
globalStore.sseListeners = listeners;

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcast(topic: string) {
  for (const listener of listeners) {
    listener(topic);
  }
}

// Tiny in-process event bus for SSE invalidations.
type Listener = (event: string) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(event: string): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      /* ignore */
    }
  }
}
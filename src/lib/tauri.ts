/**
 * Thin wrapper around @tauri-apps/api with browser fallback.
 * When running in a regular browser (dev without Tauri shell),
 * all calls gracefully no-op or return defaults.
 */

let _isTauri: boolean | null = null;

export function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }
  return _isTauri;
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauri()) return null;
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, args);
}

type UnlistenFn = () => void;

export async function listen<T>(
  event: string,
  callback: (payload: T) => void
): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  const { listen: tauriListen } = await import("@tauri-apps/api/event");
  return tauriListen<T>(event, (e) => callback(e.payload));
}

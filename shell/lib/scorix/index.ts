"use client";

export type ScorixStatus = "connected" | "connecting" | "disconnected";

// Branch/translate on `code`, never on `message`. Framework codes: internal ·
// not_found · denied · canceled · overloaded · unavailable · timeout.
export interface ScorixError extends Error {
  code?: string;
  details?: unknown;
}

export function isScorixError(e: unknown): e is ScorixError {
  return e instanceof Error && (e.name === "ScorixError" || "code" in e);
}

// A server-stream call: async-iterable of typed messages, cancelable. The loop
// ends on the server's `done` frame and throws on `error`.
export interface ServerStream<T> extends AsyncIterable<T> {
  cancel(): void;
}

// A bidirectional call: async-iterable of server messages (Out), plus send(In)
// to push a client message, end() to half-close, and cancel() to abort.
export interface Duplex<In, Out> extends AsyncIterable<Out> {
  send(data: In): void;
  end(): void;
  cancel(): void;
}

// Rejects with code "unavailable" in web mode. For titlebars prefer the
// declarative data-scorix-drag / data-scorix-no-drag attributes.
export interface ScorixScreen {
  x: number;
  y: number;
  w: number;
  h: number;
  primary: boolean;
  scale: number;
}

export interface ScorixMenuItem {
  id?: string;
  label?: string;
  role?: string;
  accelerator?: string;
  accelHint?: boolean; // show the accelerator, but leave the keystroke to the page
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  submenu?: ScorixMenuItem[];
}

export interface ScorixWindow {
  minimize(): Promise<void>;
  screens(): Promise<ScorixScreen[]>;
  toggleMaximize(): Promise<{ maximized: boolean }>;
  isMaximized(): Promise<boolean>;
  close(): Promise<void>;
  hide(): Promise<void>;
  show(): Promise<void>;
  focus(): Promise<void>;
  setTitle(title: string): Promise<void>;
  fullscreen(on: boolean): Promise<void>;
  startDrag(): Promise<void>;
  setMenu(items: ScorixMenuItem[]): Promise<void>;
  popupMenu(items: ScorixMenuItem[], x?: number, y?: number): Promise<void>; // clicks arrive as the sys:menu event {id, label}
}

// Matches the window.scorix bridge the Go app injects; apps must not ship their own.
export interface ScorixAPI {
  mode?: "app" | "web";
  win?: ScorixWindow;
  invoke<T = any>(
    method: string,
    params?: any,
    options?: { timeout?: number; onChunk?: (chunk: any) => void },
  ): Promise<T>;
  serverStream?<T = any>(method: string, params?: any): ServerStream<T>;
  duplex?<In = any, Out = any>(method: string): Duplex<In, Out>;
  emit(topic: string, data?: any): void | Promise<void>;
  on(topic: string, callback: (data: any, error?: string) => void): () => void;
  resolve(name: string, handler: (data: any) => any): void;
  init(options?: any): Promise<void>;
  status?(): ScorixStatus;
  cancel?(id: string): void;
}

declare global {
  interface Window {
    scorix?: ScorixAPI;
    // Dev override: point the web-mode bridge at a separately running Go server.
    __scorix_ws_url?: string;
  }
}

// The exported wrapper is always async (it awaits bridge readiness), so its
// emit is a Promise even though the raw injected bridge returns void.
export interface ScorixClient extends Omit<ScorixAPI, "emit" | "serverStream" | "duplex"> {
  emit(topic: string, data?: any): Promise<void>;
  serverStream<T = any>(method: string, params?: any): ServerStream<T>;
  duplex<In = any, Out = any>(method: string): Duplex<In, Out>;
}

let _cachedApi: ScorixAPI | null = null;
let _initPromise: Promise<ScorixAPI> | null = null;

/**
 * Gets the Scorix API instance, waiting for it to be initialized if necessary.
 */
async function getScorix(): Promise<ScorixAPI> {
  if (typeof window === "undefined") {
    throw new Error("Scorix is only available in the browser environment");
  }

  if (window.scorix) return window.scorix;
  if (_cachedApi) return _cachedApi;

  if (!_initPromise) {
    _initPromise = new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (window.scorix) {
          clearInterval(interval);
          _cachedApi = window.scorix;
          resolve(window.scorix);
        } else if (Date.now() - start > 5000) {
          clearInterval(interval);
          reject(new Error("Scorix bridge initialization timed out. window.scorix is injected by the Go app — run the shell through the app (scorix dev), not standalone."));
        }
      }, 50); // Faster check
    });
  }

  return _initPromise;
}

/**
 * The primary Scorix API singleton. 
 * All methods wait for the bridge to be ready before executing.
 */
const scorix: ScorixClient = {
  async invoke<T = any>(method: string, params?: any, options?: any): Promise<T> {
    const api = await getScorix();
    return api.invoke(method, params, options);
  },

  // serverStream is synchronous (returns the iterable immediately); the first
  // iteration awaits bridge readiness, then delegates to the bridge stream.
  serverStream<T = any>(method: string, params?: any): ServerStream<T> {
    let inner: ServerStream<T> | null = null;
    let cancelled = false;
    async function* gen(): AsyncGenerator<T> {
      const api = await getScorix();
      if (!api.serverStream) throw new Error("scorix: bridge does not support serverStream");
      inner = api.serverStream<T>(method, params);
      if (cancelled) { inner.cancel(); return; }
      yield* inner;
    }
    const it = gen();
    return {
      [Symbol.asyncIterator]: () => it,
      cancel: () => {
        cancelled = true;
        if (inner) inner.cancel();
        else if (it.return) it.return(undefined as any);
      },
    };
  },

  // duplex opens a bidirectional call. Sends issued before the bridge is ready
  // (or before iteration starts) are buffered and flushed when it opens.
  duplex<In = any, Out = any>(method: string): Duplex<In, Out> {
    let inner: Duplex<In, Out> | null = null;
    let cancelled = false;
    let ended = false;
    const pending: In[] = [];
    async function* gen(): AsyncGenerator<Out> {
      const api = await getScorix();
      if (!api.duplex) throw new Error("scorix: bridge does not support duplex");
      inner = api.duplex<In, Out>(method);
      if (cancelled) { inner.cancel(); return; }
      for (const d of pending) inner.send(d);
      pending.length = 0;
      if (ended) inner.end();
      yield* inner;
    }
    const it = gen();
    return {
      [Symbol.asyncIterator]: () => it,
      send: (data: In) => { if (inner) inner.send(data); else pending.push(data); },
      end: () => { if (inner) inner.end(); else ended = true; },
      cancel: () => {
        cancelled = true;
        if (inner) inner.cancel();
        else if (it.return) it.return(undefined as any);
      },
    };
  },

  async emit(topic: string, data?: any): Promise<void> {
    const api = await getScorix();
    await api.emit(topic, data);
  },
  
  on(topic: string, callback: (data: any, error?: string) => void): () => void {
    if (typeof window === "undefined") return () => {};

    // window.scorix.on returns Promise<unsubscribe> (orchestrator _call is async) — normalize to sync cleanup.
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    Promise.resolve(window.scorix ? window.scorix.on(topic, callback) : getScorix().then(api => api.on(topic, callback)))
      .then(result => {
        if (cancelled) {
          if (typeof result === "function") result();
          return;
        }
        cleanup = typeof result === "function" ? result : null;
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  },
  
  resolve(name: string, handler: (data: any) => any): void {
    getScorix().then(api => api.resolve(name, handler)).catch(console.error);
  },
  
  async init(options?: any): Promise<void> {
    const api = await getScorix();
    return api.init(options);
  },
};

export default scorix;

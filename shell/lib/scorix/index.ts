"use client";

export type ScorixStatus = "connected" | "connecting" | "disconnected";

export interface ServerStream<T> extends AsyncIterable<T> {
  cancel(): void;
}

export interface Duplex<In, Out> extends AsyncIterable<Out> {
  send(data: In): void;
  end(): void;
  cancel(): void;
}

export interface ScorixError extends Error {
  code?: string;
  details?: unknown;
}

export function isScorixError(e: unknown): e is ScorixError {
  return e instanceof Error && (e.name === "ScorixError" || "code" in e);
}

export interface ScorixScreen {
  x: number;
  y: number;
  w: number;
  h: number;
  primary: boolean;
  scale: number;
}

export interface ScorixWindow {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<{ maximized: boolean }>;
  isMaximized(): Promise<boolean>;
  close(): Promise<void>;
  hide(): Promise<void>;
  show(): Promise<void>;
  focus(): Promise<void>;
  setTitle(title: string): Promise<void>;
  fullscreen(on: boolean): Promise<void>;
  startDrag(): Promise<void>;
  screens(): Promise<ScorixScreen[]>;
}

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
    __scorix_ws_url?: string;
  }
}

export interface ScorixClient extends Omit<ScorixAPI, "emit" | "serverStream" | "duplex"> {
  emit(topic: string, data?: any): Promise<void>;
  serverStream<T = any>(method: string, params?: any): ServerStream<T>;
  duplex<In = any, Out = any>(method: string): Duplex<In, Out>;
}

let _cachedApi: ScorixAPI | null = null;
let _initPromise: Promise<ScorixAPI> | null = null;

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
          reject(new Error("Scorix bridge initialization timed out. window.scorix is injected by the Go app — run the shell through the app, not standalone."));
        }
      }, 50);
    });
  }

  return _initPromise;
}

const scorix: ScorixClient = {
  async invoke<T = any>(method: string, params?: any, options?: any): Promise<T> {
    const api = await getScorix();
    return api.invoke(method, params, options);
  },

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
    if (typeof window === "undefined") return () => { };

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

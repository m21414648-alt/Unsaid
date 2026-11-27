type Clip = { url: string; private?: boolean };
type CachedClip = { objectUrl: string; bytes: number };

const MAX_BYTES = 24 * 1024 * 1024;
const MAX_CLIP_BYTES = 5 * 1024 * 1024;
const CONCURRENCY = 4;

/** Session-memory only: private bytes are never written to persistent browser storage. */
export class AudioPreloader {
  private ready = new Map<string, CachedClip>();
  private pending = new Map<string, AbortController>();
  private wanted = new Set<string>();
  private queue: Clip[] = [];
  private bytes = 0;
  private active = 0;
  private generation = 0;

  preload(clips: Clip[]) {
    this.wanted = new Set(clips.map((clip) => clip.url));
    for (const url of this.ready.keys()) {
      if (!this.wanted.has(url)) this.forget(url);
    }
    // Rebuild in priority order, coalescing in-flight downloads.
    this.queue = [...new Map(clips.map((clip) => [clip.url, clip])).values()]
      .filter(({ url }) => !this.ready.has(url) && !this.pending.has(url));
    this.drain();
  }

  getUrl(url: string) {
    const cached = this.ready.get(url);
    if (!cached) return url;
    // Most recently played entries survive memory-limit eviction.
    this.ready.delete(url);
    this.ready.set(url, cached);
    return cached.objectUrl;
  }

  seed(url: string, blob: Blob) {
    if (!blob.size || blob.size > MAX_CLIP_BYTES) return;
    this.wanted.add(url);
    this.forget(url);
    while (this.bytes + blob.size > MAX_BYTES && this.ready.size) {
      this.forget(this.ready.keys().next().value!);
    }
    this.ready.set(url, { objectUrl: URL.createObjectURL(blob), bytes: blob.size });
    this.bytes += blob.size;
  }

  forget(url: string) {
    const cached = this.ready.get(url);
    if (!cached) return;
    URL.revokeObjectURL(cached.objectUrl);
    this.bytes -= cached.bytes;
    this.ready.delete(url);
  }

  clear() {
    this.generation++;
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear();
    for (const url of this.ready.keys()) this.forget(url);
    this.wanted.clear();
    this.queue = [];
    this.active = 0;
  }

  private drain() {
    while (this.active < CONCURRENCY && this.queue.length) {
      const clip = this.queue.shift()!;
      if (!this.wanted.has(clip.url) || this.pending.has(clip.url)) continue;
      this.download(clip);
    }
  }

  private download(clip: Clip) {
    const generation = this.generation;
    const controller = new AbortController();
    this.pending.set(clip.url, controller);
    this.active++;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    void fetch(clip.url, {
      signal: controller.signal,
      credentials: clip.private ? 'same-origin' : 'omit',
    }).then(async (response) => {
      if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) return;
      if (Number(response.headers.get('content-length')) > MAX_CLIP_BYTES) return;
      const blob = await response.blob();
      if (!blob.size || blob.size > MAX_CLIP_BYTES || controller.signal.aborted ||
          generation !== this.generation || !this.wanted.has(clip.url) || this.ready.has(clip.url)) return;
      this.seed(clip.url, blob);
    }).catch(() => {
      // Background warmup is optional; a tap still tries the actual media URL
      // and the player reports any playback error to the user.
    }).finally(() => {
      clearTimeout(timeout);
      if (generation !== this.generation) return;
      this.pending.delete(clip.url);
      this.active--;
      this.drain();
    });
  }
}
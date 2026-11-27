import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioPreloader } from './audio-preloader';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const audioResponse = () => new Response('audio', { headers: { 'content-type': 'audio/mpeg' } });

test('preloads once and reuses memory URLs without a fetch on playback', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return audioResponse(); });
  const cache = new AudioPreloader();
  cache.preload([{ url: '/voice/base' }, { url: '/voice/base' }]);
  await tick();
  const first = cache.getUrl('/voice/base');
  assert.match(first, /^blob:/);
  assert.equal(cache.getUrl('/voice/base'), first);
  cache.preload([{ url: '/voice/base' }]);
  await tick();
  assert.equal(calls, 1);
  cache.clear();
});

test('account change aborts warmup and rejects late private results', async (t) => {
  let finish!: (value: Response) => void;
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', (_url: string, options: RequestInit) => {
    signal = options.signal ?? undefined;
    assert.equal(options.credentials, 'same-origin');
    return new Promise<Response>((resolve) => { finish = resolve; });
  });
  const cache = new AudioPreloader();
  cache.preload([{ url: '/voice/private', private: true }]);
  cache.clear();
  assert.equal(signal?.aborted, true);
  finish(audioResponse());
  await tick();
  assert.equal(cache.getUrl('/voice/private'), '/voice/private');
});

test('saved bytes are ready immediately and deleted or replaced versions are revoked', (t) => {
  const revoked: string[] = [];
  t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));
  const cache = new AudioPreloader();
  cache.seed('/voice/private?v=1', new Blob(['first'], { type: 'audio/webm' }));
  const first = cache.getUrl('/voice/private?v=1');
  cache.seed('/voice/private?v=2', new Blob(['second'], { type: 'audio/webm' }));
  const second = cache.getUrl('/voice/private?v=2');
  cache.preload([{ url: '/voice/private?v=2', private: true }]);
  assert.ok(revoked.includes(first));
  assert.equal(cache.getUrl('/voice/private?v=1'), '/voice/private?v=1');
  cache.clear();
  assert.ok(revoked.includes(second));
});

test('warmup rejects non-audio responses and leaves real playback available', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('sign in', { headers: { 'content-type': 'text/html' } }));
  const cache = new AudioPreloader();
  cache.preload([{ url: '/voice/missing' }]);
  await tick();
  assert.equal(cache.getUrl('/voice/missing'), '/voice/missing');
  cache.clear();
});
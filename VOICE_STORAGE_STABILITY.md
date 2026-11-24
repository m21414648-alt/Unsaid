# Voice storage stability

## Diagnosis

On 2026-10-03, a direct read of an existing public MP3 reproduced two
`MaxListenersExceededWarning` warnings. The trace pointed to
`teeny-request`'s response pipeline, not to credential refresh.

`@google-cloud/storage` used the raw fetch response body as the source of its
validation/decompression pipeline. `teeny-request` was already piping that same
body into the authenticated retry transport. This attached two independent
pipeline lifecycle handlers to one body and duplicated its consumers.

A baseline of 30 sequential reads produced 60 warnings on 30 distinct response
bodies, with peaks of 12 error / 11 close listeners. Completed bodies had
8 error / 8 close listeners and were destroyed. Only one body remained
reachable after releasing measurement references and forcing GC. That supports
a per-request listener peak, not an accumulating cross-request memory leak.
This is a bounded diagnostic sample, not a guarantee of no possible memory leak.

## Fix

The version-pinned pnpm patch for the storage SDK reads through the existing
authenticated retry transport. The raw response remains the source of headers
for validation and decompression; CRC32C checking, ranges, generation pinning,
sidecar authentication and retries are preserved. Both SDK entry points (CJS and
ESM) are patched.

The retry regression fixture also exposed a transport race: a retry handler
can synchronously destroy a request during its response event, before
`teeny-request` starts its pipeline. Its pinned patch skips that pipeline
and destroys the discarded body; it also discards a response arriving after
transport cancellation.

Public buffering uses bounded async iteration so an oversized body, network
error or premature close rejects instead of leaving an unresolved cache load.
Failed cache entries can retry. Preload concurrency, clip identifiers,
revisions, cache limits and personal-recording access policy are unchanged.
Neither listener limits nor warning reporting have been changed.

## Verification

- Offline fixtures: exact chunked bytes, concurrent/repeated reads, retry after
  503, 404, truncated response, generation-pinned range, decompression,
  valid CRC32C and checksum mismatch.
- Bounded public reader: oversize destruction, premature-close rejection,
  failed-load retry and deduplicated warm reads.
- Live storage: 120 cold reads of all 24 existing public assets followed by
  12,000 warm cache reads. No listener warnings. Peak raw-response counts:
  9 error / 8 close. Zero response bodies retained after GC.
- Post-GC heap samples (bytes):
  21,407,072; 21,374,632; 21,059,128; 21,052,528; 21,182,616.
  Array-buffer samples:
  2,216,527; 2,473,190; 2,216,527; 2,216,527; 2,216,527.
  RSS settled near 140 MB. No monotonic retained-buffer growth in this sample.
- API: all 24 clips downloaded and decoded with FFmpeg, identical repeat
  bytes, HEAD and range responses correct, invalid clips/ranges rejected.
- Personal playback: guest and forged identity requests rejected with 401 and
  `private, no-store`. Owner-scoped database filtering, ACL checks and immutable
  generation validation remain in place; no private bytes were used by the
  public cache or live test.
- Existing API tests and API typecheck pass. App welcome page renders.

Run offline:

```sh
pnpm --filter @workspace/api-server run test:voice-storage
```

Run opt-in live verification (read-only public objects, requires configured
App Storage):

```sh
pnpm --filter @workspace/api-server run test:voice-storage:live
```

The live script runs the Node test API directly so `--expose-gc` remains in
the same process when using the TS loader; it intentionally does not spawn
`node --test` children. Repeat these checks when upgrading the pinned packages,
and remove patches only after equivalent upstream fixes pass the fixtures.
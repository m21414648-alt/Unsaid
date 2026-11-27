import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type IconRecorderStatus = "idle" | "requesting" | "recording" | "ready";

type UseIconRecorderResult = {
  status: IconRecorderStatus;
  blob: Blob | null;
  durationMs: number;
  elapsedMs: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
};

const MAX_DURATION_MS = 20_000;
const MAX_RECORDING_BYTES = 5 * 1024 * 1024;
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/webm",
];

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Keep stopping any remaining tracks if one track has already ended.
    }
  });
}

function getMicrophoneError(error: unknown): string {
  const name =
    error instanceof Error
      ? error.name
      : typeof error === "object" && error !== null && "name" in error
        ? String(error.name)
        : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "لم يتم السماح باستخدام الميكروفون. تحقّق من إذن الموقع وسياسة الإطار المضمّن، ثم حاول مجددًا.";
    case "SecurityError":
      return "تعذّر الوصول إلى الميكروفون بسبب قيود الأمان أو إعدادات الإطار. افتح الصفحة عبر HTTPS واسمح بالميكروفون.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "لم يتم العثور على ميكروفون متصل.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "الميكروفون مشغول أو يتعذر تشغيله. أغلق التطبيقات الأخرى التي تستخدمه ثم حاول مجددًا.";
    case "OverconstrainedError":
      return "الميكروفون غير متاح بالإعدادات المطلوبة.";
    default:
      return "تعذّر بدء تسجيل الصوت. تحقّق من الميكروفون وأذوناته ثم حاول مجددًا.";
  }
}

export default function useIconRecorder({
  resetKey,
}: {
  resetKey: string;
}): UseIconRecorderResult {
  const [status, setStatus] = useState<IconRecorderStatus>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<IconRecorderStatus>("idle");
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkBytesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const failureRef = useRef<string | null>(null);

  const updateStatus = useCallback((nextStatus: IconRecorderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const disposeActiveRecording = useCallback(() => {
    clearTimer();

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Tracks are still stopped below if the recorder has already ended.
        }
      }
    }

    const stream = streamRef.current;
    streamRef.current = null;
    stopTracks(stream);
    chunksRef.current = [];
    chunkBytesRef.current = 0;
    failureRef.current = null;
    startedAtRef.current = 0;
  }, [clearTimer]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    disposeActiveRecording();
    setBlob(null);
    setDurationMs(0);
    setElapsedMs(0);
    setError(null);
    updateStatus("idle");
  }, [disposeActiveRecording, updateStatus]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    try {
      recorder.stop();
    } catch {
      // A queued stop event may already have made the recorder inactive.
    }
  }, []);

  const start = useCallback(async () => {
    if (statusRef.current === "requesting" || statusRef.current === "recording") {
      return;
    }

    generationRef.current += 1;
    const token = generationRef.current;
    disposeActiveRecording();
    setBlob(null);
    setDurationMs(0);
    setElapsedMs(0);
    setError(null);
    updateStatus("requesting");

    const fail = (message: string) => {
      if (!mountedRef.current || generationRef.current !== token) return;
      generationRef.current += 1;
      disposeActiveRecording();
      setBlob(null);
      setDurationMs(0);
      setElapsedMs(0);
      setError(message);
      updateStatus("idle");
    };

    if (typeof window === "undefined" || !window.isSecureContext) {
      fail("يلزم استخدام اتصال آمن (HTTPS) لتسجيل الصوت.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      fail("متصفحك لا يدعم الوصول إلى الميكروفون.");
      return;
    }

    const MediaRecorderConstructor = window.MediaRecorder;
    if (typeof MediaRecorderConstructor !== "function") {
      fail("متصفحك لا يدعم تسجيل الصوت.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (requestError) {
      fail(getMicrophoneError(requestError));
      return;
    }

    if (!mountedRef.current || generationRef.current !== token) {
      stopTracks(stream);
      return;
    }

    streamRef.current = stream;

    let recorder: MediaRecorder | null = null;
    const supportsMimeType =
      typeof MediaRecorderConstructor.isTypeSupported === "function";

    for (const mimeType of MIME_CANDIDATES) {
      let supported = true;
      if (supportsMimeType) {
        try {
          supported = MediaRecorderConstructor.isTypeSupported(mimeType);
        } catch {
          supported = false;
        }
      }
      if (!supported) continue;

      try {
        recorder = new MediaRecorderConstructor(stream, { mimeType });
        break;
      } catch {
        // Try the next supported format, then the browser's actual default.
      }
    }

    if (!recorder) {
      try {
        recorder = new MediaRecorderConstructor(stream);
      } catch {
        fail("لا يوفر هذا المتصفح صيغة صوت مدعومة للتسجيل.");
        return;
      }
    }

    const actualMimeType = recorder.mimeType.trim();
    let actualMimeSupported = Boolean(actualMimeType);
    if (actualMimeSupported && supportsMimeType) {
      try {
        actualMimeSupported =
          MediaRecorderConstructor.isTypeSupported(actualMimeType);
      } catch {
        actualMimeSupported = false;
      }
    }
    if (!actualMimeSupported) {
      fail(
        "تعذّر تحديد صيغة صوت مدعومة من المتصفح؛ لم يتم إنشاء تسجيل غير صالح.",
      );
      return;
    }

    recorderRef.current = recorder;
    chunksRef.current = [];
    chunkBytesRef.current = 0;
    failureRef.current = null;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (
        !mountedRef.current ||
        generationRef.current !== token ||
        failureRef.current ||
        event.data.size === 0
      ) {
        return;
      }

      if (chunkBytesRef.current + event.data.size > MAX_RECORDING_BYTES) {
        failureRef.current =
          "تجاوز حجم التسجيل الحد الأقصى البالغ 5 ميغابايت؛ لم يتم حفظه.";
        try {
          if (recorder.state === "recording") recorder.stop();
        } catch {
          fail(failureRef.current);
        }
        return;
      }

      chunksRef.current.push(event.data);
      chunkBytesRef.current += event.data.size;
    };

    recorder.onerror = () => {
      fail("حدث خطأ أثناء تسجيل الصوت. حاول مجددًا.");
    };

    recorder.onstop = () => {
      const streamForThisRecording = stream;
      if (recorderRef.current === recorder) recorderRef.current = null;
      if (streamRef.current === streamForThisRecording) {
        streamRef.current = null;
      }
      stopTracks(streamForThisRecording);
      clearTimer();

      if (!mountedRef.current || generationRef.current !== token) return;

      const failedRecording = failureRef.current;
      failureRef.current = null;
      if (failedRecording) {
        fail(failedRecording);
        return;
      }

      const recordingDuration = Math.min(
        MAX_DURATION_MS,
        Math.max(1, Date.now() - startedAtRef.current),
      );
      const completedChunks = chunksRef.current;
      chunksRef.current = [];
      chunkBytesRef.current = 0;

      let completedBlob: Blob;
      try {
        completedBlob = new Blob(completedChunks, { type: recorder.mimeType });
      } catch {
        fail("تعذّر تجهيز التسجيل الصوتي بصيغته الصحيحة.");
        return;
      }

      if (!completedBlob.type.trim()) {
        fail("لم يحدد المتصفح صيغة التسجيل الصوتي؛ لم يتم حفظه.");
        return;
      }
      if (supportsMimeType) {
        let blobMimeSupported = false;
        try {
          blobMimeSupported =
            MediaRecorderConstructor.isTypeSupported(completedBlob.type);
        } catch {
          blobMimeSupported = false;
        }
        if (!blobMimeSupported) {
          fail("صيغة التسجيل التي أنشأها المتصفح غير مدعومة؛ لم يتم حفظه.");
          return;
        }
      }
      if (completedBlob.size === 0) {
        fail("التسجيل فارغ. تحدّث قليلًا ثم حاول التسجيل مجددًا.");
        return;
      }
      if (completedBlob.size > MAX_RECORDING_BYTES) {
        fail("تجاوز حجم التسجيل الحد الأقصى البالغ 5 ميغابايت؛ لم يتم حفظه.");
        return;
      }

      setBlob(completedBlob);
      setDurationMs(recordingDuration);
      setElapsedMs(recordingDuration);
      setError(null);
      updateStatus("ready");
    };

    try {
      startedAtRef.current = Date.now();
      recorder.start(250);
      updateStatus("recording");
      timerRef.current = setInterval(() => {
        if (!mountedRef.current || generationRef.current !== token) return;
        const elapsed = Math.min(
          MAX_DURATION_MS,
          Math.max(0, Date.now() - startedAtRef.current),
        );
        setElapsedMs(elapsed);
        if (elapsed >= MAX_DURATION_MS) stop();
      }, 250);
    } catch {
      fail("تعذّر بدء تسجيل الصوت. تحقّق من الميكروفون ثم حاول مجددًا.");
    }
  }, [clearTimer, disposeActiveRecording, stop, updateStatus]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    generationRef.current += 1;
    disposeActiveRecording();
    setBlob(null);
    setDurationMs(0);
    setElapsedMs(0);
    setError(null);
    updateStatus("idle");

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      disposeActiveRecording();
    };
  }, [resetKey, disposeActiveRecording, updateStatus]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (
        statusRef.current === "requesting" ||
        statusRef.current === "recording" ||
        statusRef.current === "ready"
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  return { status, blob, durationMs, elapsedMs, error, start, stop, cancel };
}
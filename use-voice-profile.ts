import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVoiceProfile, setVoiceProfile, requestVoiceUpload,
  commitVoiceRecording, deleteVoiceRecording, type VoiceProfile, type VoiceRecording,
} from '@workspace/api-client-react';

export type BaseVoice = 'female' | 'male';
const VOICE_KEY = 'unsaid-base-voice';
type RecordingContentType = Parameters<typeof requestVoiceUpload>[0]['contentType'];
function isRecordingContentType(value: string): value is RecordingContentType {
  return ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'].includes(value);
}

function readLocalVoice(): { voice: BaseVoice; warning: string | null } {
  try {
    const stored = localStorage.getItem(VOICE_KEY);
    return { voice: stored === 'male' ? 'male' : 'female', warning: null };
  } catch {
    return { voice: 'female', warning: 'تعذّر قراءة إعداد الصوت على هذا الجهاز.' };
  }
}

export default function useVoiceProfile() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [local] = useState(readLocalVoice);
  const [localVoice, setLocalVoice] = useState<BaseVoice>(local.voice);
  const [error, setError] = useState<string | null>(local.warning);
  const [isBusy, setIsBusy] = useState(false);
  const identity = useRef(userId);
  const active = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const profileKey = ['unsaid-voice-profile', userId];
  const profile = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => getVoiceProfile({ signal }),
    enabled: Boolean(isLoaded && isSignedIn),
    staleTime: 15_000,
    refetchInterval: isSignedIn ? 60_000 : false,
    retry: 1,
  });

  useLayoutEffect(() => {
    identity.current = userId;
    active.current?.abort();
    active.current = null;
    locked.current = false;
    setIsBusy(false);
    setError(userId ? null : local.warning);
  }, [userId]);
  useEffect(() => () => active.current?.abort(), []);

  function persistLocal(voice: BaseVoice) {
    setLocalVoice(voice);
    try {
      localStorage.setItem(VOICE_KEY, voice);
    } catch {
      setError('تم اختيار الصوت، لكن تعذّر حفظ الاختيار على هذا الجهاز.');
    }
  }

  async function mutate<T>(operation: (signal: AbortSignal, owner: string) => Promise<T>, fallback: string) {
    if (!userId || !isSignedIn || !isLoaded || locked.current) return false;
    const owner = userId;
    const controller = new AbortController();
    active.current = controller;
    locked.current = true;
    setIsBusy(true);
    setError(null);
    try {
      await operation(controller.signal, owner);
      if (controller.signal.aborted || identity.current !== owner) return false;
      await queryClient.invalidateQueries({ queryKey: profileKey });
      return !controller.signal.aborted && identity.current === owner;
    } catch (cause) {
      if (!controller.signal.aborted && identity.current === owner) {
        const status = cause && typeof cause === 'object' && 'status' in cause ? cause.status : null;
        setError(status === 401 ? 'انتهت الجلسة. سجّل الدخول مجددًا لحفظ تسجيلاتك.' : fallback);
      }
      return false;
    } finally {
      if (active.current === controller) {
        active.current = null;
        locked.current = false;
        setIsBusy(false);
      }
    }
  }

  async function setVoice(voice: BaseVoice) {
    setError(null);
    if (!isLoaded) return false;
    if (!isSignedIn) {
      persistLocal(voice);
      return true;
    }
    return mutate(async (signal) => {
      const updated = await setVoiceProfile({ voice }, { signal });
      if (!signal.aborted && identity.current === userId) {
        queryClient.setQueryData<VoiceProfile>(profileKey, updated);
        persistLocal(voice);
      }
    }, 'تعذّر حفظ اختيار الصوت في حسابك. حاول مرة أخرى.');
  }

  async function saveRecording(
    cardKey: string, cardLabel: string, blob: Blob, durationMs: number,
    onSaved?: (recording: VoiceRecording) => void,
  ) {
    if (!blob.size || blob.size > 5 * 1024 * 1024 || durationMs < 1 || durationMs > 20_000) {
      setError('التسجيل غير صالح. سجّل عبارة قصيرة لا تتجاوز ٢٠ ثانية.');
      return false;
    }
    const contentType = blob.type.split(';')[0].trim().toLowerCase();
    if (!isRecordingContentType(contentType)) {
      setError('صيغة التسجيل غير مدعومة. جرّب التسجيل من متصفح أحدث.');
      return false;
    }
    return mutate(async (signal, owner) => {
      const grant = await requestVoiceUpload({
        cardKey, cardLabel, contentType, size: blob.size, durationMs: Math.round(durationMs),
      }, { signal });
      if (identity.current !== owner || signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const uploaded = await fetch(grant.uploadURL, {
        method: 'PUT', body: blob, headers: { 'Content-Type': contentType },
        credentials: 'omit', signal,
      });
      if (!uploaded.ok) throw new Error('Upload failed');
      if (identity.current !== owner || signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const recording = await commitVoiceRecording({ uploadId: grant.uploadId }, { signal });
      if (!signal.aborted && identity.current === owner) {
        queryClient.setQueryData<VoiceProfile>(profileKey, (previous) => previous ? {
          ...previous,
          recordings: [...previous.recordings.filter((item) => item.cardKey !== recording.cardKey), recording],
        } : previous);
        onSaved?.(recording);
      }
    }, 'تعذّر حفظ التسجيل في حسابك. تسجيلك الجديد ما زال هنا؛ حاول الحفظ مرة أخرى.');
  }

  async function setRecordingsEnabled(recordingsEnabled: boolean) {
    return mutate(async (signal, owner) => {
      const updated = await setVoiceProfile({ recordingsEnabled }, { signal });
      if (!signal.aborted && identity.current === owner) {
        queryClient.setQueryData<VoiceProfile>(profileKey, updated);
      }
    }, 'تعذّر حفظ تفعيل تسجيلاتك. حاول مرة أخرى.');
  }

  async function deleteRecording(id: string) {
    return mutate(async (signal, owner) => {
      await deleteVoiceRecording(id, { signal });
      if (!signal.aborted && identity.current === owner) {
        queryClient.setQueryData<VoiceProfile>(profileKey, (previous) => previous ? {
          ...previous, recordings: previous.recordings.filter((item) => item.id !== id),
        } : previous);
      }
    }, 'تعذّر حذف التسجيل. لم يتم تغيير اختيارك؛ حاول مرة أخرى.');
  }

  return {
    userId,
    isSignedIn: Boolean(isSignedIn),
    isLoaded: Boolean(isLoaded && (!isSignedIn || profile.isSuccess)),
    isBusy,
    voice: (isSignedIn && profile.data ? profile.data.voice : localVoice) as BaseVoice,
    recordingsEnabled: Boolean(isSignedIn && profile.data?.recordingsEnabled),
    recordings: isSignedIn ? profile.data?.recordings ?? [] : [],
    error: error ?? (isSignedIn && profile.isError ? 'تعذّر تحميل أصوات حسابك. تحقق من اتصال الإنترنت ثم أعد التحميل.' : null),
    setVoice, setRecordingsEnabled, saveRecording, deleteRecording,
    clearError: () => setError(null),
    reloadProfile: () => { void profile.refetch(); },
  };
}
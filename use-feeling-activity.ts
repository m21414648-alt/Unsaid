import { useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetFeelingActivityQueryKey,
  getGetWeeklyFeelingActivityQueryKey,
  recordFeelingActivity,
  type FeelingCardKey,
} from '@workspace/api-client-react';

export default function useFeelingActivity() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const ownerRef = useRef(userId);
  const requests = useRef(new Set<AbortController>());

  useLayoutEffect(() => {
    ownerRef.current = userId;
    for (const request of requests.current) request.abort();
    requests.current.clear();
    setError(null);
  }, [userId]);

  function trackCard(cardKey: FeelingCardKey) {
    if (!isLoaded || !isSignedIn || !userId) return;
    const owner = userId;
    const controller = new AbortController();
    requests.current.add(controller);
    setError(null);
    // Keep the request alive during normal in-app navigation. Its response
    // must never update the next account's cache or status.
    void recordFeelingActivity(
      { cardKey },
      { signal: controller.signal, keepalive: true },
    ).then(async () => {
      if (controller.signal.aborted || ownerRef.current !== owner) return;
      const queryKey = [...getGetFeelingActivityQueryKey(), owner];
      const weeklyQueryKey = [...getGetWeeklyFeelingActivityQueryKey(), owner];
      // An initial read started before this write may still be in flight.
      // Cancel it so navigation cannot reuse an older pre-selection snapshot.
      await Promise.all([
        queryClient.cancelQueries({ queryKey, exact: true }),
        queryClient.cancelQueries({ queryKey: weeklyQueryKey, exact: true }),
      ]);
      if (controller.signal.aborted || ownerRef.current !== owner) return;
      await Promise.all([queryKey, weeklyQueryKey].map((key) =>
        queryClient.invalidateQueries({ queryKey: key, exact: true, refetchType: 'active' }),
      ));
    }).catch((cause: unknown) => {
      if (controller.signal.aborted || ownerRef.current !== owner) return;
      const status = cause && typeof cause === 'object' && 'status' in cause ? cause.status : null;
      setError(status === 401
        ? 'انتهت الجلسة. سجّل الدخول مجددًا لحفظ نشاط الطفل.'
        : 'تعذّر حفظ آخر اختيار في مشاعري. تحقق من اتصالك.');
    }).finally(() => {
      requests.current.delete(controller);
    });
  }

  return { trackCard, error };
}
import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAdminFeelingHistory, type FeelingCardKey } from '@workspace/api-client-react';
import { communicationCards } from '@/lib/communication-cards';
import { errorStatus } from '@/hooks/use-family';
import { formatCount, formatExactTime } from './format';

type Props = {
  userId: string | null | undefined;
  isSignedIn: boolean | undefined;
  childRef: string;
  childName: string;
  cardKey: FeelingCardKey | undefined;
  onFilter: (key: FeelingCardKey | undefined) => void;
  onClose: () => void;
  onAuthError: () => void;
};

export function OwnerActivityHistory({
  userId, isSignedIn, childRef, childName, cardKey, onFilter, onClose, onAuthError,
}: Props) {
  const query = useInfiniteQuery({
    queryKey: ['owner-feeling-history', userId, childRef, cardKey ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAdminFeelingHistory(
        {
          childRef,
          ...(cardKey ? { cardKey } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
        { signal },
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(isSignedIn && userId),
    gcTime: 0,
    retry: false,
    staleTime: 0,
  });

  const status = query.isError ? errorStatus(query.error) ?? 0 : 0;
  const denied = status === 401 || status === 403;
  const authRef = useRef(onAuthError);
  authRef.current = onAuthError;
  useEffect(() => {
    if (denied) authRef.current();
  }, [denied]);

  if (denied) return null;

  const events = query.data?.pages.flatMap((p) => p.events) ?? [];
  const label = (key: string) => communicationCards.find((c) => c.key === key);

  return (
    <section className="oa-history" aria-label={`سجل ${childName}`} data-testid="history-panel">
      <header className="oa-history__head">
        <h3>السجل الكامل — {childName}</h3>
        <button type="button" className="oa-btn" onClick={onClose} data-testid="button-close-history">
          إغلاق السجل
        </button>
      </header>
      <div className="oa-history__filters" role="group" aria-label="تصفية حسب الأيقونة">
        <button type="button" className="oa-chip" aria-pressed={!cardKey} onClick={() => onFilter(undefined)}>
          كل الأيقونات
        </button>
        {communicationCards.map((c) => (
          <button
            type="button"
            key={c.key}
            className="oa-chip"
            aria-pressed={cardKey === c.key}
            onClick={() => onFilter(c.key as FeelingCardKey)}
            data-testid={`filter-${c.key}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <p className="feelings-note">
        يعرض كل الاختيارات المحفوظة منذ أول تسجيل، من الأحدث إلى الأقدم. الاختيارات التي لم تُسجَّل سابقًا لا يمكن استرجاعها.
      </p>

      {query.isPending && <div className="feelings-skeleton" role="status" aria-label="جارٍ تحميل السجل" />}

      {query.isError && events.length === 0 && (
        <div role="alert">
          <p className="feelings-note">تعذّر تحميل السجل.</p>
          <button type="button" className="oa-btn" onClick={() => query.refetch()}>إعادة المحاولة</button>
        </div>
      )}

      {query.isSuccess && events.length === 0 && (
        <p className="feelings-note" data-testid="history-empty">لا توجد اختيارات مسجّلة لهذا الاختيار.</p>
      )}

      {events.length > 0 && (
        <ol className="oa-history__list">
          {events.map((e, i) => {
            const c = label(e.cardKey);
            return (
              <li key={`${e.usedAt}-${e.cardKey}-${i}`}>
                <span>{c ? `${c.icon} ${c.label}` : e.cardKey}</span>
                <time dateTime={e.usedAt}>{formatExactTime(e.usedAt)}</time>
              </li>
            );
          })}
        </ol>
      )}

      {events.length > 0 && (
        <footer className="oa-history__foot">
          <span className="feelings-note">{formatCount(events.length)} سجلًا معروضًا</span>
          {query.isError && (
            <p role="alert" className="feelings-note">تعذّر تحميل السجلات الأقدم.</p>
          )}
          {query.hasNextPage ? (
            <button
              type="button"
              className="oa-btn"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
              data-testid="button-load-older"
            >
              {query.isFetchingNextPage ? 'جارٍ التحميل…' : query.isError ? 'إعادة المحاولة' : 'تحميل سجلات أقدم'}
            </button>
          ) : (
            !query.isError && <span className="feelings-note" data-testid="history-end">وصلت إلى أول اختيار مسجّل.</span>
          )}
        </footer>
      )}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NotebookPen } from 'lucide-react';
import {
  getGetFeelingActivityQueryKey,
  getGetWeeklyFeelingActivityQueryKey,
  useGetWeeklyFeelingActivity,
  setFeelingNote,
  type FeelingActivityEvent,
  type FeelingActivitySummary,
  type FeelingCardActivity,
} from '@workspace/api-client-react';
import { communicationCards } from '@/lib/communication-cards';
import './feeling-notes-table.css';

const numberFormat = new Intl.NumberFormat('ar');
const dateFormat = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' });
type Card = (typeof communicationCards)[number];

function NoteRow({ ownerId, card, activity, weekEvents, weeklyState, maxCount, onDirtyChange }: {
  ownerId: string;
  card: Card;
  activity: FeelingCardActivity;
  weekEvents: FeelingActivityEvent[];
  weeklyState: 'loading' | 'error' | 'ready';
  maxCount: number;
  onDirtyChange: (key: string, dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ draft: activity.note, saved: activity.note });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const dirty = form.draft !== form.saved;
  const fieldId = `feeling-note-${card.key}`;
  const lastUsed = activity.lastUsedAt
    ? dateFormat.format(new Date(activity.lastUsedAt))
    : null;
  const usagePercent = maxCount > 0 ? Math.round((activity.count / maxCount) * 100) : 0;

  useEffect(() => {
    // Polling may update the saved value, but never replace an unsaved draft.
    setForm((previous) => ({
      draft: previous.draft === previous.saved ? activity.note : previous.draft,
      saved: activity.note,
    }));
  }, [activity.note, activity.noteUpdatedAt]);
  useEffect(() => { onDirtyChange(card.key, dirty); }, [card.key, dirty, onDirtyChange]);
  useEffect(() => () => active.current?.abort(), []);

  async function save() {
    if (active.current || !dirty) return;
    const controller = new AbortController();
    active.current = controller;
    const text = form.draft;
    const queryKey = [...getGetFeelingActivityQueryKey(), ownerId];
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await setFeelingNote(card.key, { note: text }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (controller.signal.aborted) return;
      queryClient.setQueryData<FeelingActivitySummary>(queryKey, (previous) => previous ? {
        ...previous,
        cards: previous.cards.map((item) => item.cardKey === card.key
          ? { ...item, note: saved.note, noteUpdatedAt: saved.updatedAt } : item),
      } : previous);
      setForm({ draft: saved.note, saved: saved.note });
      setStatus(saved.note ? 'تم حفظ الملاحظة.' : 'تم مسح الملاحظة.');
      void queryClient.invalidateQueries({ queryKey, exact: true });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const httpStatus = cause && typeof cause === 'object' && 'status' in cause ? cause.status : null;
      setError(httpStatus === 401
        ? 'انتهت الجلسة. سجّل الدخول مجددًا لحفظ الملاحظة.'
        : 'تعذّر الحفظ. الملاحظة ما زالت هنا؛ حاول مجددًا.');
    } finally {
      if (active.current === controller && !controller.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <details className="feelings-card" data-testid={`feelings-card-${card.key}`}>
      <summary className="feelings-card__summary">
        <span
          className="feelings-card__icon"
          style={{ background: card.color, color: card.textColor }}
          aria-hidden="true"
        >{card.icon}</span>
        <span className="feelings-card__summary-copy">
          <span className="feelings-card__name">{card.label}</span>
          <span className="feelings-card__quick">
            {lastUsed ? `آخر اختيار: ${lastUsed}` : 'لم تُستخدم بعد'}
          </span>
        </span>
        <span className="feelings-card__count" aria-label={`${numberFormat.format(activity.count)} اختيار`}>
          {numberFormat.format(activity.count)}
          <span>اختيار</span>
        </span>
        <span className="feelings-card__meter" aria-hidden="true">
          <span style={{ width: `${usagePercent}%` }} />
        </span>
      </summary>

      <div className="feelings-card__details">
        <section aria-labelledby={`${fieldId}-history-title`}>
          <div className="feeling-detail__heading">
            <h3 id={`${fieldId}-history-title`}>اختيارات آخر ٧ أيام</h3>
            <span>{numberFormat.format(weekEvents.length)} مرة</span>
          </div>
          {weeklyState === 'loading' ? <p className="feelings-note">جارٍ تحميل سجل الأسبوع...</p>
            : weeklyState === 'error' ? <p className="feeling-week-error" role="alert">تعذّر تحميل سجل الأسبوع.</p>
            : weekEvents.length === 0 ? <p className="feelings-note">لا توجد اختيارات خلال هذه الفترة.</p>
            : (
              <ul
                className="feeling-week-events"
                aria-label={`أوقات استخدام ${card.label} خلال آخر سبعة أيام`}
                tabIndex={weekEvents.length > 4 ? 0 : undefined}
                data-testid={`feeling-week-uses-${card.key}`}
              >
                {weekEvents.map((event) => (
                  <li key={event.id}>
                    <time dateTime={event.usedAt}>{dateFormat.format(new Date(event.usedAt))}</time>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section aria-labelledby={`${fieldId}-notes-title`}>
          <h3 id={`${fieldId}-notes-title`}>ملاحظاتي عن {card.label}</h3>
          <label className="sr-only" htmlFor={fieldId}>ملاحظاتي عن {card.label}</label>
          <textarea
            id={fieldId}
            className="feeling-notes-textarea"
            value={form.draft}
            maxLength={2000}
            rows={3}
            disabled={busy}
            data-testid={`feeling-note-input-${card.key}`}
            placeholder="اكتب التفاصيل أو الملاحظات هنا..."
            aria-describedby={`${fieldId}-status`}
            onChange={(event) => {
              const value = event.target.value;
              setForm((previous) => ({ ...previous, draft: value }));
              setStatus(null);
              setError(null);
            }}
          />
          <div className="feeling-notes-controls">
            <button
              type="button"
              className="feelings-action"
              disabled={busy || !dirty}
              onClick={() => void save()}
              data-testid={`feeling-note-save-${card.key}`}
              aria-label={`حفظ ملاحظة ${card.label}`}
            >{busy ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}</button>
            <span className="feeling-notes-limit">{numberFormat.format(form.draft.length)} / ٢٠٠٠</span>
          </div>
          <p id={`${fieldId}-status`} className="feeling-notes-status" role={error ? 'alert' : 'status'} aria-live="polite">
            {error ?? (dirty ? 'تغييرات غير محفوظة' : status ?? (activity.note ? 'الملاحظة محفوظة في حسابك' : 'لا توجد ملاحظات محفوظة'))}
          </p>
        </section>
      </div>
    </details>
  );
}

export default function FeelingNotesTable({ ownerId, cards, onDirtyChange }: {
  ownerId: string;
  cards: FeelingCardActivity[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const weekly = useGetWeeklyFeelingActivity({
    query: {
      queryKey: [...getGetWeeklyFeelingActivityQueryKey(), ownerId],
      staleTime: 0,
      retry: 1,
      refetchInterval: 300000,
    },
  });
  const activityByCard = useMemo(() => new Map(cards.map((item) => [item.cardKey, item])), [cards]);
  const rankedCards = useMemo(() => communicationCards
    .map((card) => ({ card, activity: activityByCard.get(card.key) }))
    .filter((entry): entry is { card: Card; activity: FeelingCardActivity } => Boolean(entry.activity))
    .sort((a, b) => b.activity.count - a.activity.count), [activityByCard]);
  const maxCount = Math.max(0, ...cards.map((item) => item.count));
  const weeklyByCard = useMemo(() => {
    const grouped = new Map<string, FeelingActivityEvent[]>();
    for (const event of weekly.data?.events ?? []) {
      const events = grouped.get(event.cardKey) ?? [];
      events.push(event);
      grouped.set(event.cardKey, events);
    }
    return grouped;
  }, [weekly.data]);
  const weeklyState = weekly.data ? 'ready' : weekly.isLoading ? 'loading' : 'error';
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const rowDirtyChange = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((previous) => {
      if (previous.has(key) === dirty) return previous;
      const next = new Set(previous);
      if (dirty) next.add(key); else next.delete(key);
      return next;
    });
  }, []);
  useEffect(() => { onDirtyChange(dirtyKeys.size > 0); }, [dirtyKeys, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  return (
    <>
      <section className="feelings-panel feelings-card-panel" aria-labelledby="feeling-notes-title">
        <h2 id="feeling-notes-title">كل شعور باختصار</h2>
        <p className="feelings-note feeling-notes-intro">اضغط على الشعور لعرض تفاصيل اختياراته وملاحظاته. الترتيب من الأكثر استخدامًا.</p>
        {weekly.isError && <div className="feeling-week-error" role="alert">
          <p>{weekly.data ? 'تعذّر تحديث سجل الأسبوع. آخر سجل محمّل ما زال ظاهرًا.' : 'تعذّر تحميل سجل الأسبوع.'}</p>
          <button type="button" className="feelings-action" onClick={() => void weekly.refetch()}>إعادة المحاولة</button>
        </div>}
        {rankedCards.length > 0 ? (
          <ul className="feelings-card-list" aria-label="ملخص المشاعر وتفاصيلها" data-testid="feeling-notes-table">
            {rankedCards.map(({ card, activity }) => (
              <li key={card.key}>
                <NoteRow
                  ownerId={ownerId}
                  card={card}
                  activity={activity}
                  weekEvents={weeklyByCard.get(card.key) ?? []}
                  weeklyState={weeklyState}
                  maxCount={maxCount}
                  onDirtyChange={rowDirtyChange}
                />
              </li>
            ))}
          </ul>
        ) : <p className="feelings-note">لا توجد مشاعر محفوظة بعد.</p>}
      </section>

      <section className="feelings-panel feeling-feedback" aria-labelledby="feeling-feedback-title">
        <div className="feelings-feedback__heading">
          <span className="feeling-feedback__icon" aria-hidden="true"><NotebookPen size={24} /></span>
          <h2 id="feeling-feedback-title">أخبرنا عن رأيك</h2>
        </div>
        <p className="feelings-note">زوّدونا بنصائحكم واقتراحاتكم لتطوير التطبيق. يُكتب الرأي هنا فقط، ولا يُرسل أو يُحفظ.</p>
        <label className="feeling-feedback__label" htmlFor="feeling-feedback-input">نصائحكم أو اقتراحاتكم</label>
        <textarea
          id="feeling-feedback-input"
          className="feeling-feedback__textarea"
          rows={6}
          maxLength={2000}
          placeholder="اكتبوا رأيكم أو اقتراحاتكم هنا..."
          data-testid="textarea-feeling-feedback"
        />
      </section>
    </>
  );
}
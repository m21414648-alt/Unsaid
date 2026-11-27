import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminFeelingProgressQueryKey,
  useSetAdminFeelingNote,
  type AdminFeelingProgress,
  type FeelingCardKey,
} from '@workspace/api-client-react';
import { errorStatus } from '@/hooks/use-family';
import { formatChange, formatCount, formatExactTime } from './format';

type Card = {
  key: string;
  icon: string;
  label: string;
  color: string;
  textColor: string;
};

type Stats = {
  totalUses: number;
  recent7dUses: number;
  previous7dUses: number;
  usageChangePercent: number | null;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
  creatorNote: string;
  creatorNoteUpdatedAt: string | null;
};

type Props = {
  userId: string | null | undefined;
  childRef: string;
  card: Card;
  stats: Stats;
  onOpenHistory: () => void;
  onAuthError: () => void;
};

const MAX = 2000;

export function OwnerCaseCard({ userId, childRef, card, stats, onOpenHistory, onAuthError }: Props) {
  const queryClient = useQueryClient();
  const mutation = useSetAdminFeelingNote();
  const mutateRef = useRef(mutation.mutateAsync);
  mutateRef.current = mutation.mutateAsync;
  const authRef = useRef(onAuthError);
  authRef.current = onAuthError;

  const [draft, setDraft] = useState(stats.creatorNote);
  const [saved, setSaved] = useState(stats.creatorNote);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = draft !== saved;

  // Adopt incoming server text only while the editor has no unsaved edits.
  useEffect(() => {
    if (draft === saved && stats.creatorNote !== saved) {
      setDraft(stats.creatorNote);
      setSaved(stats.creatorNote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.creatorNote]);

  const key = [...getGetAdminFeelingProgressQueryKey(), userId] as const;

  async function save() {
    const snapshot = draft;
    setPending(true);
    setFailed(false);
    setJustSaved(false);
    try {
      const res = await mutateRef.current({
        data: { childRef, cardKey: card.key as FeelingCardKey, note: snapshot },
      });
      setSaved(res.note ?? snapshot);
      setJustSaved(true);
      queryClient.setQueryData<AdminFeelingProgress>(key, (old) =>
        old
          ? {
              ...old,
              children: old.children.map((c) =>
                c.reference !== childRef
                  ? c
                  : {
                      ...c,
                      cards: c.cards.map((x) =>
                        x.cardKey === card.key
                          ? { ...x, creatorNote: res.note, creatorNoteUpdatedAt: res.updatedAt }
                          : x,
                      ),
                    },
              ),
            }
          : old,
      );
      // The response already updated this editor. Mark stale for the next poll/mount
      // without an extra full-dashboard request for every individual note save.
      void queryClient.invalidateQueries({ queryKey: key, refetchType: 'none' });
    } catch (e) {
      const s = errorStatus(e) ?? 0;
      if (s === 401 || s === 403) authRef.current();
      else setFailed(true);
    } finally {
      setPending(false);
    }
  }

  const fieldId = `case-note-${childRef}-${card.key}`;
  const state = pending
    ? { id: 'saving', text: 'جارٍ الحفظ…' }
    : failed
      ? { id: 'error', text: 'تعذّر الحفظ. نصّك ما زال هنا.' }
      : dirty
        ? { id: 'unsaved', text: 'تغييرات غير محفوظة' }
        : justSaved
          ? { id: 'saved', text: 'تم الحفظ' }
          : stats.creatorNoteUpdatedAt && saved
            ? { id: 'saved-at', text: `آخر حفظ: ${formatExactTime(stats.creatorNoteUpdatedAt)}` }
            : { id: 'idle', text: '' };

  return (
    <li
      className="oa-case"
      style={{ '--status-color': card.color, '--status-text': card.textColor } as React.CSSProperties}
      data-testid={`case-${childRef}-${card.key}`}
    >
      <div className="oa-case__line">
        <span className="oa-case__icon" aria-hidden="true">{card.icon}</span>
        <h4 className="oa-case__title">{card.label}</h4>
        <span className="oa-case__count">{formatCount(stats.totalUses)} مرة</span>
      </div>

      <details className="oa-case__details">
        <summary>تفاصيل الاستخدام</summary>
        <div className="oa-case__meta">
          <span>آخر ٧ أيام {formatCount(stats.recent7dUses)} · قبلها {formatCount(stats.previous7dUses)}</span>
          <span><bdi>{formatChange(stats.usageChangePercent, stats.recent7dUses)}</bdi></span>
          <span>أول مرة: {formatExactTime(stats.firstUsedAt)}</span>
          <span>آخر مرة: {formatExactTime(stats.lastUsedAt)}</span>
          <button
            type="button"
            className="oa-btn oa-btn--small"
            onClick={onOpenHistory}
            data-testid={`button-history-${childRef}-${card.key}`}
          >
            سجل هذه الأيقونة ({formatCount(stats.totalUses)})
          </button>
        </div>
      </details>

      <div className="oa-case__note">
        <label htmlFor={fieldId}>تفاصيلي عن حالة «{card.label}» (ملاحظة خاصة بي)</label>
        <textarea
          id={fieldId}
          value={draft}
          maxLength={MAX}
          rows={3}
          dir="rtl"
          placeholder="اكتب تفاصيل هذه الحالة هنا…"
          onChange={(e) => {
            setDraft(e.target.value);
            setJustSaved(false);
            setFailed(false);
          }}
          data-testid={`textarea-note-${childRef}-${card.key}`}
        />
        <div className="oa-case__actions">
          <button
            type="button"
            className="oa-btn"
            disabled={pending || !dirty}
            onClick={save}
            data-testid={`button-save-note-${childRef}-${card.key}`}
          >
            {failed ? 'إعادة المحاولة' : 'حفظ'}
          </button>
          <span
            className={`oa-case__state oa-case__state--${state.id}`}
            role={failed ? 'alert' : 'status'}
            aria-live="polite"
            data-testid={`status-note-${childRef}-${card.key}`}
            data-state={state.id}
          >
            {state.text}
          </span>
          <span className="oa-case__counter">{formatCount(draft.length)} / {formatCount(MAX)}</span>
        </div>
      </div>
    </li>
  );
}

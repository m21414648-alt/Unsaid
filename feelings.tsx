import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@clerk/react';
import { useGetFeelingActivity, getGetFeelingActivityQueryKey } from '@workspace/api-client-react';
import BottomNavigation from '@/components/bottom-navigation';
import FeelingNotesTable from '@/components/feeling-notes-table';
import { useFontSettings } from '@/context/font-settings';
import { communicationCards } from '@/lib/communication-cards';
import './feelings.css';

const fmt = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : fmt.format(d);
};
const nf = new Intl.NumberFormat('ar');

export default function Feelings() {
  const { fontSize } = useFontSettings();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const enabled = Boolean(isLoaded && isSignedIn && userId);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  function guardNavigation() {
    return !hasUnsavedNotes || window.confirm('لديك ملاحظات غير محفوظة. هل تريد المغادرة دون حفظها؟');
  }
  useEffect(() => { setHasUnsavedNotes(false); }, [userId]);
  useEffect(() => {
    if (!hasUnsavedNotes) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsavedNotes]);

  useEffect(() => {
    document.title = 'قاعدة بيانات مشاعري — Unsaid';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  const query = useGetFeelingActivity({
    query: {
      queryKey: [...getGetFeelingActivityQueryKey(), userId],
      enabled,
      retry: 1,
      staleTime: 0,
      refetchInterval: enabled ? 30000 : false,
    },
  });
  const data = query.data;

  const total = data?.cards.reduce((sum, card) => sum + card.count, 0) ?? 0;
  const cardByKey = new Map<string, (typeof communicationCards)[number]>(communicationCards.map((c) => [c.key, c]));

  let body;
  if (!isLoaded || (enabled && query.isLoading)) {
    body = (
      <div className="feelings-panel" role="status" aria-label="جارٍ التحميل" data-testid="feelings-loading">
        <div className="feelings-list">{Array.from({ length: 4 }, (_, i) => <div key={i} className="feelings-skeleton" />)}</div>
      </div>
    );
  } else if (!isSignedIn) {
    body = (
      <div className="feelings-panel" data-testid="feelings-signed-out">
        <h2>سجّل الدخول لحفظ نشاط الطفل</h2>
        <p className="feelings-note">اختياراتك بدون تسجيل الدخول لا تُحفظ، ولن تظهر هنا. سجّل الدخول لتُحفظ اختياراتك القادمة في حسابك.</p>
        <p><Link href="/sign-in?returnTo=feelings" className="feelings-action" data-testid="feelings-sign-in">تسجيل الدخول</Link></p>
      </div>
    );
  } else if (!data) {
    body = (
      <div className="feelings-panel" role="alert" data-testid="feelings-error">
        <h2>تعذّر تحميل النشاط</h2>
        <p className="feelings-note">حدثت مشكلة أثناء جلب البيانات. حاول مرة أخرى.</p>
        <button type="button" className="feelings-action" onClick={() => query.refetch()} data-testid="feelings-retry">إعادة المحاولة</button>
      </div>
    );
  } else {
    body = (
      <>
        {query.isError && <p className="feelings-note" role="alert">تعذّر تحديث الأرقام الآن. آخر بيانات محفوظة ما زالت ظاهرة، وملاحظاتك غير المحفوظة لم تتغيّر.</p>}
        <section className="feelings-panel" aria-labelledby="f-total">
          <h2 id="f-total">إجمالي الاختيارات</h2>
          <div className="feelings-total">
            <strong data-testid="feelings-total-count">{nf.format(total)}</strong>
            <span className="feelings-live" aria-live="polite"><i aria-hidden="true" />يتحدّث تلقائياً كل ٣٠ ثانية</span>
          </div>
          {total === 0 && <p className="feelings-note" data-testid="feelings-empty">لا توجد اختيارات محفوظة بعد. عند اختيار بطاقة من اللوحة ستظهر هنا.</p>}
        </section>

        {userId && <FeelingNotesTable key={userId} ownerId={userId} cards={data.cards} onDirtyChange={setHasUnsavedNotes} />}

        <details className="feelings-panel feelings-recent-panel">
          <summary className="feelings-recent__summary">
            <h2 id="f-recent">آخر الاختيارات</h2>
            <span>{nf.format(data.recent.length)} اختيار محفوظ</span>
          </summary>
          <div className="feelings-recent-panel__body" aria-labelledby="f-recent">
            {data.recent.length === 0 ? (
              <p className="feelings-note">لا يوجد سجل حديث.</p>
            ) : (
              <ul className="feelings-recent">
                {data.recent.map((e) => {
                  const c = cardByKey.get(e.cardKey);
                  return (
                    <li key={e.id} style={{ background: c?.color, color: c?.textColor }} data-testid={`feelings-recent-event-${e.id}`}>
                      <span>{c?.label ?? e.cardKey}</span>
                      <time dateTime={e.usedAt}>{formatDate(e.usedAt) ?? e.usedAt}</time>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </details>
      </>
    );
  }

  return (
    <main className="feelings-screen" dir="rtl" lang="ar" data-testid="feelings-page" style={{ '--communication-font-size': `${fontSize}px` } as CSSProperties}>
      <div className="feelings-shell">
        <header className="feelings-header">
          <Link href="/board" className="feelings-back" onClick={(event) => { if (!guardNavigation()) event.preventDefault(); }}>العودة للوحة</Link>
          <div className="feelings-eyebrow">سجل خاص محفوظ في حساب ولي الأمر</div>
          <h1>قاعدة بيانات مشاعري</h1>
          <p className="feelings-note">هذه مؤشرات لعدد مرات اختيار البطاقات فقط، وليست تشخيصاً ولا تدل على المدة التي قضاها الطفل في شعور معيّن.</p>
        </header>
        {body}
      </div>
      <BottomNavigation onBeforeNavigate={guardNavigation} />
    </main>
  );
}

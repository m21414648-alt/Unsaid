import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'wouter';
import { fmtDate, nf } from '@/components/family-bits';
import { errorStatus, useFamilyAccount, useLinkedActivity } from '@/hooks/use-family';
import { communicationCards } from '@/lib/communication-cards';
import './family.css';

const byKey = new Map<string, (typeof communicationCards)[number]>(communicationCards.map((c) => [c.key, c]));

export default function FamilyActivity() {
  const { id = '' } = useParams<{ id: string }>();
  const { isLoaded, isSignedIn } = useFamilyAccount();
  const q = useLinkedActivity(id);
  useEffect(() => { document.title = 'نشاط الطفل — Unsaid'; document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; }, []);
  const data = q.data;
  const rows = useMemo(() => {
    if (!data) return [];
    const m = new Map(data.cards.map((c) => [c.cardKey as string, c]));
    return communicationCards.map((card) => ({ card, count: m.get(card.key)?.count ?? 0, last: m.get(card.key)?.lastUsedAt ?? null })).sort((a, b) => b.count - a.count);
  }, [data]);
  const events = useMemo(() => (data ? [...data.events].sort((a, b) => b.usedAt.localeCompare(a.usedAt)) : []), [data]);
  const total = rows.reduce((s, r) => s + r.count, 0);

  let body;
  if (!isLoaded || (isSignedIn && q.isLoading)) body = <div className="family-panel" role="status" aria-label="جارٍ التحميل"><div className="family-skeleton" /><div className="family-skeleton" /></div>;
  else if (!isSignedIn) body = <div className="family-panel"><h2>اربط جهازك لعرض النشاط</h2><Link href="/family?role=parent" className="family-btn">إدخال أرقام الربط</Link></div>;
  else if (!data || errorStatus(q.error) === 404) {
    const gone = errorStatus(q.error) === 404;
    body = (
      <div className="family-panel" role="alert" data-testid="activity-error">
        <h2>{gone ? 'هذا الربط غير موجود' : 'تعذّر تحميل النشاط'}</h2>
        <p className="family-note">{gone ? 'ربما أُلغي الربط. عُد إلى صفحة العائلة لمراجعة الحسابات المرتبطة.' : 'حدثت مشكلة أثناء جلب البيانات.'}</p>
        {gone ? <Link href="/family" className="family-btn">صفحة العائلة</Link> : <button type="button" className="family-btn" onClick={() => q.refetch()} data-testid="button-activity-retry">إعادة المحاولة</button>}
      </div>
    );
  } else {
    body = (
      <>
        {q.isError && <p className="family-error" role="alert">تعذّر التحديث الآن، تظهر آخر بيانات محمّلة.</p>}
        <section className="family-panel" aria-labelledby="a-total">
          <h2 id="a-total">إجمالي الاختيارات المسجّلة</h2>
          <div className="family-total"><strong data-testid="activity-total">{nf.format(total)}</strong><span className="family-note">يتحدّث كل ١٥ ثانية. للقراءة فقط.</span></div>
          <ul className="family-bars">
            {rows.map(({ card, count, last }) => (
              <li key={card.key} style={{ background: card.color, color: card.textColor } as CSSProperties} data-testid={`activity-card-${card.key}`}>
                <div><span>{card.label}</span><b>{nf.format(count)}</b></div>
                <small>{last ? `آخر استخدام: ${fmtDate(last)}` : 'لم تُستخدم بعد'}</small>
              </li>
            ))}
          </ul>
        </section>
        <section className="family-panel" aria-labelledby="a-events">
          <h2 id="a-events">كل اختيارات آخر ٧ أيام مع وقتها</h2>
          {events.length === 0 ? <p className="family-empty" data-testid="activity-empty">لا توجد اختيارات خلال الأسبوع الماضي.</p> : (
            <ul className="family-events">
              {events.map((e) => {
                const c = byKey.get(e.cardKey);
                return <li key={e.id} style={{ background: c?.color, color: c?.textColor } as CSSProperties} data-testid={`activity-event-${e.id}`}><span>{c?.label ?? e.cardKey}</span><time dateTime={e.usedAt}>{fmtDate(e.usedAt)}</time></li>;
              })}
            </ul>
          )}
        </section>
      </>
    );
  }
  return (
    <main className="family-screen" dir="rtl" lang="ar" data-testid="family-activity-page">
      <div className="family-shell">
        <header>
          <Link href="/family" className="family-back">العودة إلى العائلة</Link>
          <div className="family-eyebrow">عرض للقراءة فقط</div>
          <h1>نشاط الطفل</h1>
          <p className="family-note">تظهر هنا أعداد البطاقات ووقت كل اختيار فقط. لا تظهر الرسومات ولا التسجيلات ولا الملاحظات.</p>
          <p className="family-note">هذه اختيارات للتواصل، وليست تشخيصًا أو قياسًا لمدة الشعور.</p>
        </header>
        {body}
      </div>
    </main>
  );
}

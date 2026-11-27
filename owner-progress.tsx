import { useEffect, useState } from 'react';
import type { FeelingCardKey } from '@workspace/api-client-react';
import { OwnerActivityHistory } from '@/components/owner-activity/history';
import { OwnerActivityPatterns } from '@/components/owner-activity/patterns';
import { OwnerCaseCard } from '@/components/owner-activity/case-card';
import { formatChange, formatExactTime } from '@/components/owner-activity/format';
import { useAuth } from '@clerk/react';
import { Link } from 'wouter';
import {
  getGetAdminFeelingProgressQueryKey,
  useGetAdminFeelingProgress,
} from '@workspace/api-client-react';
import { communicationCards } from '@/lib/communication-cards';
import { errorStatus } from '@/hooks/use-family';
import NotFound from './not-found';
import './feelings.css';
import './owner-progress.css';

const numberFormat = new Intl.NumberFormat('ar');
export default function OwnerProgress() {
  const { userId } = useAuth();
  return <OwnerProgressInner key={userId ?? 'anon'} />;
}

function OwnerProgressInner() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [open, setOpen] = useState<{ ref: string; cardKey?: FeelingCardKey } | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const query = useGetAdminFeelingProgress({
    query: {
      queryKey: [...getGetAdminFeelingProgressQueryKey(), userId],
      enabled: Boolean(isLoaded && isSignedIn && userId),
      retry: false,
      staleTime: 0,
      refetchInterval: isSignedIn ? 60_000 : false,
    },
  });

  useEffect(() => {
    document.title = 'ملخص حالات مشاعري — Unsaid';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  if (!isLoaded || (isSignedIn && query.isPending)) {
    return (
      <main className="feelings-screen owner-progress-screen" dir="rtl" lang="ar">
        <div className="feelings-shell">
          <div className="feelings-panel" role="status" aria-label="جارٍ التحميل">
            <div className="feelings-skeleton" />
          </div>
        </div>
      </main>
    );
  }

  if (authFailed || !isSignedIn || (query.isError && [401, 403].includes(errorStatus(query.error) ?? 0))) {
    return <NotFound />;
  }

  // A temporary background-read failure must not unmount editors and lose drafts.
  // Authorization failures are handled above, even when cached data exists.
  if (!query.data) {
    return (
      <main className="feelings-screen owner-progress-screen" dir="rtl" lang="ar">
        <div className="feelings-shell">
          <div className="feelings-panel" role="alert">
            <h1>تعذّر تحميل الملخص</h1>
            <p className="feelings-note">حاول مرة أخرى بعد قليل.</p>
            <button type="button" className="feelings-action" onClick={() => query.refetch()}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      </main>
    );
  }

  const children = [...query.data.children].sort(
    (a, b) => b.totalUses - a.totalUses || b.recent7dUses - a.recent7dUses,
  );
  const topChildren = (count: (child: (typeof children)[number]) => number) => {
    if (children.length === 0) return [];
    const highest = Math.max(...children.map(count));
    return highest > 0 ? children.filter((child) => count(child) === highest) : [];
  };
  const mostUsed = topChildren((child) => child.totalUses);
  const mostUsedThisWeek = topChildren((child) => child.recent7dUses);
  const lessUsed = children
    .filter((child) => child.previous7dUses > child.recent7dUses)
    .sort((a, b) =>
      (b.previous7dUses - b.recent7dUses) - (a.previous7dUses - a.recent7dUses),
    );
  const nameList = (rows: typeof children) =>
    rows.length ? rows.map((child) => child.name).join('، ') : 'لا يوجد نشاط مسجّل بعد';

  return (
    <main className="feelings-screen owner-progress-screen" dir="rtl" lang="ar">
      <div className="feelings-shell">
        <header className="feelings-header owner-progress-header">
          <Link href="/settings" className="feelings-back">العودة إلى الإعدادات</Link>
          <span className="feelings-eyebrow">لوحتي الخاصة لمتابعة حالات الأطفال</span>
          <h1>متابعة نشاط الأطفال</h1>
          <p className="feelings-note">
            هذه اللوحة تظهر لي أنا فقط وليس للمستخدمين. ملخص مستقل لكل طفل يوضح الأيقونات التي استخدمها وعدد مرات استخدامها. عند غياب الاسم من الحساب يظهر اسم بديل.
          </p>
        </header>

        {query.isError && (
          <div className="feelings-panel" role="alert">
            <p className="feelings-note">
              تعذّر تحديث اللوحة مؤقتًا. الأرقام المعروضة من آخر تحديث ناجح، والنصوص غير المحفوظة ما زالت هنا.
            </p>
            <button type="button" className="oa-btn" disabled={query.isFetching} onClick={() => query.refetch()}>
              إعادة التحديث
            </button>
          </div>
        )}
        <section className="owner-progress-totals" aria-label="الإجمالي">
          <article className="feelings-panel owner-progress-total">
            <span>حسابات الأطفال</span>
            <strong>{numberFormat.format(query.data.totalChildren)}</strong>
          </article>
          <article className="feelings-panel owner-progress-total">
            <span>الأكثر استخدامًا إجمالًا</span>
            <strong className="owner-progress-total__names">{nameList(mostUsed)}</strong>
          </article>
          <article className="feelings-panel owner-progress-total">
            <span>الأكثر استخدامًا آخر ٧ أيام</span>
            <strong className="owner-progress-total__names">{nameList(mostUsedThisWeek)}</strong>
          </article>
        </section>

        <section className="feelings-panel owner-progress-declines" aria-labelledby="owner-progress-declines-title">
          <h2 id="owner-progress-declines-title">أطفال قلّ استخدامهم هذا الأسبوع</h2>
          <p className="feelings-note">مقارنة بسبعة الأيام السابقة، بحسب عدد اختيارات البطاقات فقط.</p>
          {lessUsed.length
            ? <ul>{lessUsed.map((child) => (
              <li key={child.name}>
                <strong>{child.name}</strong>
                <span>أقل بـ {numberFormat.format(child.previous7dUses - child.recent7dUses)} اختيارًا</span>
              </li>
            ))}</ul>
            : <p className="feelings-note">لا يوجد انخفاض مسجّل في هذه المقارنة.</p>}
        </section>

        <section className="owner-progress-list" aria-label="ملخص كل طفل">
          {children.map((child) => {
            const usedCards = child.cards
              .filter((card) => card.totalUses > 0)
              .sort((a, b) => b.totalUses - a.totalUses);
            const difference = child.recent7dUses - child.previous7dUses;
            return (
              <article
                className="feelings-panel owner-progress-child"
                key={child.reference}
              >
                <header className="owner-progress-child__header">
                  <div>
                    <h2>{child.name}</h2>
                    <span>
                      {numberFormat.format(child.totalUses)} اختيارًا مسجلًا إجمالًا
                      {' · '}
                      استُخدم {numberFormat.format(usedCards.length)} من ١٠ حالات
                    </span>
                  </div>
                  <span className="owner-progress-child__weekly">
                    {difference < 0
                      ? `أقل بـ ${numberFormat.format(Math.abs(difference))} هذا الأسبوع`
                      : difference > 0
                        ? `أكثر بـ ${numberFormat.format(difference)} هذا الأسبوع`
                        : 'مثل الأسبوع السابق'}
                  </span>
                </header>
                <dl className="owner-progress-child__comparison">
                  <div><dt>آخر ٧ أيام</dt><dd>{numberFormat.format(child.recent7dUses)}</dd></div>
                  <div><dt>الأيام السبعة السابقة</dt><dd>{numberFormat.format(child.previous7dUses)}</dd></div>
                  <div className="oa-change" data-testid={`change-child-${child.reference}`}>
                    <dt>التغيّر في الاستخدام</dt>
                    <dd><bdi>{formatChange(child.usageChangePercent, child.recent7dUses)}</bdi></dd>
                  </div>
                  <div><dt>أول استخدام مسجّل</dt><dd className="oa-time">{formatExactTime(child.firstUsedAt)}</dd></div>
                </dl>
                <OwnerActivityPatterns patterns={child.recurringPatterns} />
                <button
                  type="button"
                  className="oa-btn"
                  onClick={() => setOpen({ ref: child.reference })}
                  data-testid={`button-history-${child.reference}`}
                >
                  عرض السجل الكامل
                </button>
                {open?.ref === child.reference && (
                  <OwnerActivityHistory
                    userId={userId}
                    isSignedIn={isSignedIn}
                    childRef={child.reference}
                    childName={child.name}
                    cardKey={open.cardKey}
                    onFilter={(k) => setOpen({ ref: child.reference, cardKey: k })}
                    onClose={() => setOpen(null)}
                    onAuthError={() => { setOpen(null); setAuthFailed(true); }}
                  />
                )}
                <h3>الحالات وتفاصيلي عنها</h3>
                <ul className="oa-cases">
                  {communicationCards.map((card) => {
                    const item = child.cards.find((c) => c.cardKey === card.key);
                    return (
                      <OwnerCaseCard
                        key={card.key}
                        userId={userId}
                        childRef={child.reference}
                        card={card}
                        stats={item ?? {
                          totalUses: 0, recent7dUses: 0, previous7dUses: 0, usageChangePercent: null,
                          firstUsedAt: null, lastUsedAt: null, creatorNote: '', creatorNoteUpdatedAt: null,
                        }}
                        onOpenHistory={() => setOpen({ ref: child.reference, cardKey: card.key })}
                        onAuthError={() => { setOpen(null); setAuthFailed(true); }}
                      />
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </section>
        <p className="feelings-note owner-progress-disclaimer">
          الأرقام تحصي اختيارات البطاقات المحفوظة فقط. قلة الاختيارات أو زيادتها لا تعني تحسن الحالة أو تشخيصًا طبيًا.
        </p>
      </div>
    </main>
  );
}
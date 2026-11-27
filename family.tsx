import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Redirect, useSearch } from 'wouter';
import { FamilyPush } from '@/components/family-push';
import { RevokeDialog, fmtDate, nf } from '@/components/family-bits';
import { errorStatus, useFamilyAccount, useFamilyActions, useFamilyProfile, useLinks } from '@/hooks/use-family';
import { FamilyParentEntry } from '@/components/family-parent-entry';
import { FamilyRequests } from '@/components/family-requests';
import './family.css';

type Actions = ReturnType<typeof useFamilyActions>;

function Skeleton() {
  return <div className="family-panel" role="status" aria-label="جارٍ التحميل" data-testid="family-loading"><div className="family-skeleton" /><div className="family-skeleton" /></div>;
}

function LinkList({ kind, actions, enabled }: { kind: 'parent' | 'child'; actions: Actions; enabled: boolean }) {
  const links = useLinks(enabled);
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const noun = kind === 'parent' ? 'حساب الطفل' : 'ولي الأمر';
  const cancel = useCallback(() => { setTarget(null); setErr(null); }, []);
  function confirm() {
    if (!target) return;
    actions.unlink.mutate({ id: target.id }, {
      onSuccess: cancel,
      onError: (e) => {
        if (errorStatus(e) === 404) { void links.refetch(); cancel(); } else setErr('تعذّر إلغاء الربط. حاول مرة أخرى.');
      },
    });
  }
  const data = links.data;
  return (
    <section className="family-panel" aria-labelledby="fam-links">
      <h2 id="fam-links">{kind === 'parent' ? 'الأطفال المرتبطون' : 'أولياء الأمور المرتبطون'}</h2>
      {links.isLoading && <div className="family-skeleton" role="status" aria-label="جارٍ التحميل" />}
      {!data && links.isError && (
        <div role="alert"><p className="family-error">تعذّر تحميل الحسابات المرتبطة.</p><button type="button" className="family-btn" onClick={() => links.refetch()} data-testid="button-links-retry">إعادة المحاولة</button></div>
      )}
      {data && links.isError && <p className="family-error" role="alert">تعذّر التحديث الآن، تظهر آخر قائمة محمّلة.</p>}
      {data && data.length === 0 && (
         <p className="family-empty" data-testid="links-empty">{kind === 'parent' ? 'لا يوجد طفل مرتبط بعد. أدخل أرقام الربط من إعدادات الطفل أعلاه.' : 'لا يوجد ولي أمر مرتبط بعد. أرقام الربط موجودة في الإعدادات.'}</p>
      )}
      {data && data.length > 0 && (
        <ul className="family-links">
          {data.map((l, i) => {
            const label = `${noun} ${nf.format(i + 1)}`;
            return (
              <li key={l.id} data-testid={`link-row-${l.id}`}>
                <div><strong>{label}</strong><span className="family-note">رُبط في {fmtDate(l.linkedAt)}</span></div>
                <div className="family-row">
                  {kind === 'parent' && <Link href={`/family/activity/${l.id}`} className="family-btn" data-testid={`link-activity-${l.id}`}>عرض النشاط</Link>}
                  <button type="button" className="family-btn family-btn--ghost" onClick={() => setTarget({ id: l.id, label })} data-testid={`button-revoke-${l.id}`}>إلغاء الربط</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {target && <RevokeDialog label={target.label} pending={actions.unlink.isPending} error={err} onCancel={cancel} onConfirm={confirm} />}
    </section>
  );
}

function ParentView({ initialized, childIntent, actions, userId }: { initialized: boolean; childIntent: boolean; actions: Actions; userId: string }) {
  return (
    <>
      {childIntent && initialized && <p className="family-status family-status--warn" data-testid="notice-parent-fixed">هذا الحساب حساب ولي أمر ولا يمكن تحويله إلى حساب طفل. للدخول كطفل استخدم حسابًا آخر.</p>}
      <FamilyParentEntry />
      {initialized && <LinkList kind="parent" actions={actions} enabled />}
      {initialized && <FamilyPush userId={userId} />}
    </>
  );
}

function ChildView({ actions }: { actions: Actions }) {
  return (
    <>
      <Link href="/settings" className="family-btn family-btn--ghost" data-testid="link-child-settings">الإعدادات</Link>
      <FamilyRequests />
      <LinkList kind="child" actions={actions} enabled />
    </>
  );
}

function Body() {
  const { isLoaded, isSignedIn, userId } = useFamilyAccount();
  const childIntent = new URLSearchParams(useSearch()).get('role') === 'child';
  const parentIntent = new URLSearchParams(useSearch()).get('role') === 'parent';
  const profile = useFamilyProfile();
  const actions = useFamilyActions();
  const [confirmErr, setConfirmErr] = useState<{ text: string; canRetry: boolean } | null>(null);
  const childInitUser = useRef<string | null>(null);

  const initializeChild = useCallback(() => {
    setConfirmErr(null);
    actions.initialize.mutate({ data: { role: 'child' } }, {
      onError: (e) => {
        const conflict = errorStatus(e) === 409;
        setConfirmErr({
          text: conflict ? 'هذا الحساب مسجّل بدور مختلف ولا يمكن تغييره.' : 'تعذّر إعداد حساب الطفل. حاول مرة أخرى.',
          canRetry: !conflict,
        });
      },
    });
  }, [actions.initialize.mutate]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !childIntent) {
      childInitUser.current = null;
      return;
    }
    if (profile.isLoading || !profile.data || profile.data.initialized || childInitUser.current === userId) return;
    childInitUser.current = userId;
    initializeChild();
  }, [isLoaded, isSignedIn, userId, childIntent, profile.isLoading, profile.data, initializeChild]);

  if (!isLoaded || (isSignedIn && profile.isLoading)) return <Skeleton />;
  if (!isSignedIn || !userId) {
    if (parentIntent) return <FamilyParentEntry />;
    return (
      <section className="family-panel" data-testid="family-signed-out">
        <h2>هل أنت وليّ أمر أم طفل؟</h2>
        <p className="family-note">الطفل ينشئ حسابًا مستقلًا. وليّ الأمر يدخل بأرقام الربط دون إنشاء حساب.</p>
        <div className="family-row">
          <Link href="/family?role=parent" className="family-btn" data-testid="link-family-parent">أنا وليّ أمر</Link>
          <Link href="/sign-in?returnTo=family&role=child" className="family-btn family-btn--ghost" data-testid="link-family-child">أنا طفل</Link>
        </div>
      </section>
    );
  }
  const p = profile.data;
  if (!p) {
    return <div className="family-panel" role="alert" data-testid="family-error"><h2>تعذّر تحميل الحساب</h2><p className="family-note">حدثت مشكلة أثناء الاتصال.</p><button type="button" className="family-btn" onClick={() => profile.refetch()} data-testid="button-profile-retry">إعادة المحاولة</button></div>;
  }
   if (p.initialized && p.role === 'child') return childIntent ? <Redirect to="/settings" /> : <ChildView key={userId} actions={actions} />;
  if (p.initialized) return <ParentView key={userId} initialized childIntent={childIntent} actions={actions} userId={userId} />;
  if (childIntent) {
    return (
      <section className="family-panel" aria-labelledby="fam-enroll" data-testid="family-enroll-child">
        <h2 id="fam-enroll">إعداد حساب الطفل</h2>
        <p className="family-note">سيُعدّ هذا الحساب الآن حساب طفل مستقلًا، ولا يمكن تغيير هذا الدور. ستنتقل إلى الإعدادات فور الانتهاء.</p>
        {actions.initialize.isPending && <p className="family-note" role="status">جارٍ إعداد حساب الطفل...</p>}
        {confirmErr && (
          <div role="alert">
            <p className="family-error">{confirmErr.text}</p>
            {confirmErr.canRetry && (
              <button type="button" className="family-btn" onClick={initializeChild} disabled={actions.initialize.isPending} data-testid="button-confirm-child-retry">إعادة المحاولة</button>
            )}
          </div>
        )}
      </section>
    );
  }
  return <ParentView key={userId} initialized={false} childIntent={false} actions={actions} userId={userId} />;
}

export default function Family() {
  useEffect(() => {
    document.title = 'العائلة — Unsaid';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);
  return (
    <main className="family-screen" dir="rtl" lang="ar" data-testid="family-page">
      <div className="family-shell">
        <header>
          <Link href="/settings" className="family-back">العودة إلى الإعدادات</Link>
          <div className="family-eyebrow">ربط خاص بين الطفل وولي الأمر</div>
          <h1>العائلة</h1>
        </header>
        <Body />
      </div>
    </main>
  );
}
